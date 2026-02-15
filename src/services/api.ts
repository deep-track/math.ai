import type { Problem, Solution, Feedback, AnalyticsEvent, SubmitFeedbackResponse, AnalyticsResponse } from '../types';

// Get API base URL from environment, default to localhost
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Remove trailing slash to avoid double slashes in URLs
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

// Add /api prefix for backend endpoints only if not already present
if (!API_BASE_URL.endsWith('/api')) {
  API_BASE_URL = `${API_BASE_URL}/api`;
}

type LocalConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  messages: any[];
};

function localConversationsKey(userId?: string) {
  return `conversations_${userId || 'guest'}`;
}

function localReadConversations(userId?: string): LocalConversation[] {
  const key = localConversationsKey(userId);
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored) || [];
  } catch (e) {
    return [];
  }
}

function localWriteConversations(userId: string | undefined, conversations: LocalConversation[]) {
  const key = localConversationsKey(userId);
  localStorage.setItem(key, JSON.stringify(conversations));
}

function localGetConversationHistory(conversationId: string, userId?: string) {
  const conversations = localReadConversations(userId);
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return { messages: [], id: conversationId };
  return {
    messages: conversation.messages || [],
    id: conversationId,
    title: conversation.title,
  };
}

function localGetConversations(userId?: string) {
  const conversations = localReadConversations(userId);
  return conversations
    .map((conv) => ({
      ...conv,
      updatedAt: conv.updatedAt || conv.createdAt,
      createdAt: conv.createdAt || new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

function localCreateConversation(title: string, userId?: string) {
  const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const conversation: LocalConversation = {
    id: conversationId,
    title: title || 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  const conversations = localReadConversations(userId);
  conversations.push(conversation);
  localWriteConversations(userId, conversations);

  return {
    success: true,
    id: conversationId,
    title: conversation.title,
    createdAt: conversation.createdAt,
  };
}

function localUpdateConversation(conversationId: string, userId: string | undefined, messages: any[], title?: string) {
  const conversations = localReadConversations(userId);

  let conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) {
    conversation = {
      id: conversationId,
      title: title || 'New Chat',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    conversations.push(conversation);
  }

  conversation.messages = messages;
  conversation.updatedAt = new Date().toISOString();
  if (title) {
    conversation.title = title;
  }

  localWriteConversations(userId, conversations);
  return { success: true };
}

function localDeleteConversation(conversationId: string, userId?: string) {
  const conversations = localReadConversations(userId);
  const filtered = conversations.filter((c) => c.id !== conversationId);
  localWriteConversations(userId, filtered);
  return { success: true };
}

/**
 * Check backend health status
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Health check failed:', error);
    return { status: 'error', service: 'backend', timestamp: new Date().toISOString() };
  }
}

/**
 * Solve a math problem using the backend AI agent
 */
export async function solveProblem(problem: Problem): Promise<Solution> {
  try {
    console.log('📤 Sending problem to backend:', problem.content);

    let response: Response;
    if ((problem as any).image) {
      const formData = new FormData();
      formData.append('text', problem.content);
      formData.append('image', (problem as any).image);

      response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        body: formData,
      });
    } else {
      response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: problem.content, user_id: 'guest' }),
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    const data: any = await response.json();

    let fullContent = '';
    if (data.steps && data.steps.length > 0 && data.steps[0].explanation) {
      fullContent = data.steps[0].explanation;
    } else if (data.answer) {
      fullContent = data.answer;
    } else if (data.conclusion) {
      fullContent = data.conclusion;
    }

    const solution: Solution = {
      id: `solution-${Date.now()}`,
      steps: [],
      finalAnswer: fullContent || 'Solution completed',
      confidence: 0.95,
      confidenceLevel: 'high',
      status: 'ok',
      timestamp: Date.now(),
      content: fullContent,
      sources: data.sources || [],
    };

    return solution;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to solve problem';
    console.error('❌ Error solving problem:', message);
    throw new Error(message);
  }
}

export async function getConversationHistory(conversationId: string, userId?: string, token?: string) {
  try {
    const resolvedUserId = userId || 'guest';
    if (resolvedUserId !== 'guest') {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Session-Id'] = token;
      }

      const response = await fetch(`${API_BASE_URL}/conversations/${resolvedUserId}/${conversationId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) throw new Error(`Failed to fetch conversation: ${response.status}`);

      const data = await response.json();
      return { messages: data.messages || [], id: conversationId, title: data.title };
    }

    return localGetConversationHistory(conversationId, resolvedUserId);
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return localGetConversationHistory(conversationId, userId || 'guest');
  }
}

export async function getConversations(userId?: string, token?: string) {
  try {
    const resolvedUserId = userId || 'guest';
    if (resolvedUserId !== 'guest') {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Session-Id'] = token;
      }

      const response = await fetch(`${API_BASE_URL}/conversations/${resolvedUserId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.status}`);

      const data = await response.json();
      return (data || [])
        .map((conv: any) => ({
          ...conv,
          updatedAt: conv.updatedAt || conv.createdAt,
          createdAt: conv.createdAt || new Date().toISOString(),
        }))
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return localGetConversations(resolvedUserId);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return localGetConversations(userId || 'guest');
  }
}

export async function createConversation(title: string, userId?: string, token?: string) {
  try {
    const resolvedUserId = userId || 'guest';
    if (resolvedUserId !== 'guest') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Session-Id'] = token;
      }

      const response = await fetch(`${API_BASE_URL}/conversations/${resolvedUserId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title || 'Chat' }),
      });

      if (!response.ok) throw new Error(`Failed to create conversation: ${response.status}`);

      const data = await response.json();
      return { success: true, id: data.id, title: data.title, createdAt: data.createdAt };
    }

    return localCreateConversation(title, resolvedUserId);
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return localCreateConversation(title, userId || 'guest');
  }
}

export async function submitFeedback(feedback: Feedback): Promise<SubmitFeedbackResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to submit feedback: ${response.status}`);
    }

    const data = await response.json().catch(() => ({ success: true, message: 'Feedback received' }));
    return { success: !!data.success, message: data.message || 'Feedback received' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    return { success: false, message };
  }
}

export async function trackAnalyticsEvent(event: AnalyticsEvent): Promise<AnalyticsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to track analytics event: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.warn('Failed to track analytics event:', error);
    return { success: false };
  }
}

export async function getAdminMetrics(email: string, days = 30, token?: string) {
  const query = new URLSearchParams({ email, days: String(days) });
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Session-Id'] = token;
  }

  const response = await fetch(`${API_BASE_URL}/admin/metrics?${query.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to fetch admin metrics: ${response.status}`);
  }

  return await response.json();
}

export async function deleteConversation(conversationId: string, userId?: string, token?: string) {
  try {
    const resolvedUserId = userId || 'guest';
    if (resolvedUserId !== 'guest') {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Session-Id'] = token;
      }

      const response = await fetch(`${API_BASE_URL}/conversations/${resolvedUserId}/${conversationId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error(`Failed to delete conversation: ${response.status}`);
      return { success: true };
    }

    return localDeleteConversation(conversationId, resolvedUserId);
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return localDeleteConversation(conversationId, userId || 'guest');
  }
}

export async function getCredits(userId: string, token?: string) {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Id'] = token;
    }

    const response = await fetch(`${API_BASE_URL}/credits/${userId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) throw new Error(`Failed to get credits: ${response.status}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get credits:', error);
    return { user_id: userId, remaining: 100, lastReset: new Date().toISOString().split('T')[0] };
  }
}

export async function spendCredits(userId: string, token?: string) {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Id'] = token;
    }

    const response = await fetch(`${API_BASE_URL}/credits/${userId}/spend`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to spend credits: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to spend credits:', error);
    throw error;
  }
}

export async function updateConversation(conversationId: string, userId: string, messages: any[], title?: string, token?: string) {
  try {
    const resolvedUserId = userId || 'guest';
    if (resolvedUserId !== 'guest') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Session-Id'] = token;
      }

      const response = await fetch(`${API_BASE_URL}/conversations/${resolvedUserId}/${conversationId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ messages, title }),
      });

      if (!response.ok) throw new Error(`Failed to update conversation: ${response.status}`);

      await response.json();
      return { success: true };
    }

    return localUpdateConversation(conversationId, resolvedUserId, messages, title);
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return localUpdateConversation(conversationId, userId || 'guest', messages, title);
  }
}

/**
 * Stream a math problem solution from the backend.
 *
 * Handles BOTH orchestrator output formats:
 *   NEW:  { token: "..." }  { metadata: {...} }  { done: true }
 *   OLD:  { type:"chunk", text:"..." }  { type:"start", ... }  { type:"end", ... }
 *
 * Also handles SSE wrapper: lines starting with "data: "
 */
export async function* solveProblemStream(
  problem: Problem,
  signal?: AbortSignal,
  token?: string,
  userId?: string
) {
  let response: Response;

  if ((problem as any).image) {
    const formData = new FormData();
    formData.append('text', problem.content);
    formData.append('image', (problem as any).image);
    formData.append('user_id', userId || 'guest');

    console.log('📤 Sending image upload request:', {
      text: problem.content,
      imageName: (problem as any).image.name,
      imageSize: (problem as any).image.size,
      imageType: (problem as any).image.type,
      userId: userId || 'guest',
    });

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Id'] = token;
    }

    response = await fetch(`${API_BASE_URL}/ask-stream`, {
      method: 'POST',
      headers,
      body: formData,
      signal,
    });
  } else {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Id'] = token;
    }

    const requestBody = {
      text: problem.content,
      user_id: userId || 'guest',
      context: '',
      session_id: '',
    };

    console.log('📤 Sending text-only request:', requestBody);

    response = await fetch(`${API_BASE_URL}/ask-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal,
    });
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Streaming request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body reader available');

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedContent = '';
  let finalAnswer = '';
  let status = 'streaming';
  let sources: any[] = [];

  /**
   * Parse a single JSON object from the stream and yield solution updates.
   * Handles both the NEW format (token/metadata/done keys)
   * and the OLD format (type:"chunk"/"start"/"end").
   */
  function* parseChunk(data: any): Generator<any> {
    // ── Credit charging (both formats) ──────────────────────────────────────
    if (data.charged !== undefined) {
      yield { chargedRemaining: data.remaining };
      return;
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (data.error) throw new Error(data.error);

    // ════════════════════════════════════════════════════════════════════════
    // NEW orchestrator format
    // ════════════════════════════════════════════════════════════════════════

    // Metadata / start
    if (data.metadata) {
      if (data.metadata.sources) sources = data.metadata.sources;
      return;
    }

    // Text token
    if (data.token !== undefined) {
      accumulatedContent += data.token;
      yield { content: accumulatedContent, finalAnswer: '', status: 'streaming', sources };
      return;
    }

    // Completion
    if (data.done) {
      status = 'ok';
      if (data.conclusion) finalAnswer = data.conclusion;
      if (data.sources) sources = data.sources;
      yield { content: accumulatedContent, finalAnswer: finalAnswer || accumulatedContent, status, sources };
      return;
    }

    // Conclusion event (separate from done in some versions)
    if (data.conclusion !== undefined && !data.done) {
      finalAnswer = data.conclusion;
      accumulatedContent += finalAnswer;
      yield { content: accumulatedContent, finalAnswer, status: 'streaming', sources };
      return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // OLD orchestrator format  { type: "chunk"|"start"|"end", text/... }
    // ════════════════════════════════════════════════════════════════════════

    if (data.type === 'chunk' || data.type === 'delta') {
      // text token
      const text = data.text ?? data.content ?? data.token ?? '';
      if (text) {
        accumulatedContent += text;
        yield { content: accumulatedContent, finalAnswer: '', status: 'streaming', sources };
      }
      return;
    }

    if (data.type === 'start') {
      // metadata
      if (data.sources) sources = data.sources;
      return;
    }

    if (data.type === 'end') {
      status = 'ok';
      if (data.conclusion) finalAnswer = data.conclusion;
      if (data.sources) sources = data.sources;
      yield { content: accumulatedContent, finalAnswer: finalAnswer || accumulatedContent, status, sources };
      return;
    }

    if (data.type === 'error') {
      throw new Error(data.error || 'Stream error from backend');
    }

    // Fallback: if there's any text-like field we haven't caught yet, accumulate it
    const fallbackText = data.text ?? data.content ?? data.message ?? null;
    if (fallbackText && typeof fallbackText === 'string') {
      console.warn('[SSE] Unrecognised chunk format, using fallback text extraction:', data);
      accumulatedContent += fallbackText;
      yield { content: accumulatedContent, finalAnswer: '', status: 'streaming', sources };
    }
  }

  // Helper: process all complete lines in a text chunk
  const processLines = function* (text: string): Generator<any> {
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      const jsonStr = trimmed.startsWith('data: ')
        ? trimmed.slice(6).trim()
        : trimmed;

      if (!jsonStr) continue;

      try {
        const data = JSON.parse(jsonStr);
        console.log('[SSE] parsed chunk:', JSON.stringify(data).substring(0, 120));
        yield* parseChunk(data);
      } catch (parseError) {
        console.warn('[SSE] Failed to parse line:', jsonStr, parseError);
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        const text = decoder.decode(value, { stream: !done });
        console.log('[SSE] raw bytes len:', text.length, 'preview:', JSON.stringify(text.substring(0, 100)));
        buffer += text;
      }

      if (done) {
        // Flush whatever remains in the buffer
        if (buffer.trim()) {
          console.log('[SSE] flushing final buffer:', buffer.substring(0, 120));
          yield* processLines(buffer);
          buffer = '';
        }
        break;
      }

      // Process all complete lines; keep last incomplete fragment in buffer
      const lastNewline = buffer.lastIndexOf('\n');
      if (lastNewline !== -1) {
        const completeLines = buffer.substring(0, lastNewline + 1);
        buffer = buffer.substring(lastNewline + 1);
        yield* processLines(completeLines);
      }
    }

    // Auto-complete if stream ended without an explicit done/end event
    if (accumulatedContent && status !== 'ok') {
      console.log('[SSE] auto-completing stream');
      yield { content: accumulatedContent, finalAnswer: accumulatedContent, status: 'ok', sources };
    }
  } finally {
    reader.releaseLock();
  }
}