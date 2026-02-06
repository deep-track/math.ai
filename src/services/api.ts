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
 * Returns an AcademicResponse with structured step-by-step solution
 */
export async function solveProblem(problem: Problem): Promise<Solution> {
  try {
    console.log('📤 Sending problem to backend:', problem.content);

    let response: Response;
    if (problem.image) {
      // Send as FormData for image uploads
      const formData = new FormData();
      formData.append('text', problem.content);
      formData.append('image', problem.image);

      response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        body: formData,
      });
    } else {
      // Send as JSON for text-only problems
      response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: problem.content,
          user_id: 'guest',
        }),
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    const data: any = await response.json();
    console.log('✅ Received response:', data);

    // Extract full content from backend response
    // Backend returns AcademicResponseModel with steps array containing the full explanation
    let fullContent = '';
    if (data.steps && data.steps.length > 0 && data.steps[0].explanation) {
      fullContent = data.steps[0].explanation;
    } else if (data.answer) {
      fullContent = data.answer;
    } else if (data.conclusion) {
      fullContent = data.conclusion;
    }

    console.log('[DEBUG] Full content length:', fullContent.length);
    console.log('[DEBUG] First 100 chars:', fullContent.substring(0, 100));
    console.log('[DEBUG] Last 100 chars:', fullContent.substring(Math.max(0, fullContent.length - 100)));

    // Convert backend response to Solution format
    const solution: Solution = {
      id: `solution-${Date.now()}`,
      steps: [],
      finalAnswer: fullContent || 'Solution completed',
      confidence: 0.95,
      confidenceLevel: 'high',
      status: 'ok',
      timestamp: Date.now(),
      // Store full response content for markdown rendering
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

/**
 * Get conversation history for the current user
 * Conversations are stored client-side in localStorage
 */
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

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.status}`);
      }

      const data = await response.json();
      return {
        messages: data.messages || [],
        id: conversationId,
        title: data.title,
      };
    }

    return localGetConversationHistory(conversationId, resolvedUserId);
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return localGetConversationHistory(conversationId, userId || 'guest');
  }
}

/**
 * Get all conversations for the current user
 * Conversations are stored client-side in localStorage
 */
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

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

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

/**
 * Create a new conversation
 * Conversations are stored client-side in localStorage
 */
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

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        id: data.id,
        title: data.title,
        createdAt: data.createdAt,
      };
    }

    return localCreateConversation(title, resolvedUserId);
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return localCreateConversation(title, userId || 'guest');
  }
}

/**
 * Submit feedback for a solution
 * Note: This is a stub - feedback is stored client-side for now
 */
export async function submitFeedback(feedback: Feedback): Promise<SubmitFeedbackResponse> {
  try {
    console.log('[FEEDBACK] Received:', feedback);
    return {
      success: true,
      message: 'Feedback received',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    return {
      success: false,
      message: message,
    };
  }
}

/**
 * Track analytics event
 * Note: This is a stub - analytics are logged client-side for now
 */
export async function trackAnalyticsEvent(event: AnalyticsEvent): Promise<AnalyticsResponse> {
  try {
    console.log('[ANALYTICS]', event);
    return { success: true };
  } catch (error) {
    console.warn('Failed to track analytics event:', error);
    return { success: false };
  }
}

/**
 * Delete a conversation
 * Conversations are stored client-side in localStorage
 */
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

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.status}`);
      }

      return { success: true };
    }

    return localDeleteConversation(conversationId, resolvedUserId);
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return localDeleteConversation(conversationId, userId || 'guest');
  }
}

/**
 * Get user credits from the backend
 */
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

    if (!response.ok) {
      throw new Error(`Failed to get credits: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get credits:', error);
    // Return default credits on error
    return { user_id: userId, remaining: 100, lastReset: new Date().toISOString().split('T')[0] };
  }
}

/**
 * Spend user credits on the backend
 */
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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to spend credits:', error);
    throw error;
  }
}

/**
 * Update a conversation with new messages
 * Conversations are stored client-side in localStorage
 */
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

      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.status}`);
      }

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
 * Stream a math problem solution from the backend
 * Returns an async generator that yields solution chunks
 */
export async function* solveProblemStream(problem: Problem, signal?: AbortSignal, token?: string, userId?: string) {
  try {
    let response: Response;
    
    if (problem.image) {
      // Send as FormData for image uploads
      const formData = new FormData();
      formData.append('text', problem.content);
      formData.append('image', problem.image);
      formData.append('user_id', userId || 'guest');

      console.log('📤 Sending image upload request:', {
        text: problem.content,
        imageName: problem.image.name,
        imageSize: problem.image.size,
        imageType: problem.image.type,
        userId: userId || 'guest'
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
      // Send as JSON for text-only problems
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

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
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';
    let finalAnswer = '';
    let status = 'streaming';
    let sources: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              // Handle credit charging event
              if (data.charged !== undefined) {
                yield { chargedRemaining: data.remaining };
                continue;
              }

              // Handle error events
              if (data.error) {
                throw new Error(data.error);
              }

              // Handle completion
              if (data.done) {
                status = 'ok';
                yield {
                  content: accumulatedContent,
                  finalAnswer: finalAnswer || accumulatedContent,
                  status,
                  sources,
                };
                continue;
              }

              // Handle conclusion
              if (data.conclusion !== undefined) {
                finalAnswer = data.conclusion;
                accumulatedContent += finalAnswer;
                yield {
                  content: accumulatedContent,
                  finalAnswer,
                  status: 'streaming',
                  sources,
                };
                continue;
              }

              // Handle metadata (start event)
              if (data.metadata) {
                // Extract sources from metadata
                if (data.metadata.sources) {
                  sources = data.metadata.sources;
                }
                continue;
              }

              // Handle text tokens
              if (data.token) {
                accumulatedContent += data.token;
                yield {
                  content: accumulatedContent,
                  finalAnswer: '',
                  status: 'streaming',
                  sources,
                };
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', trimmed, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Stream aborted');
      return;
    }
    console.error('Streaming error:', error);
    throw error;
  }
}
