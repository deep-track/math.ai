import type { Problem, Solution, Feedback, AnalyticsEvent, SubmitFeedbackResponse, AnalyticsResponse } from '../types';

// Get API base URL from environment, default to localhost
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Remove trailing slash to avoid double slashes in URLs
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

/**
 * Solve a math problem using streaming - shows text word-by-word
 * Returns stream of Solution chunks that can be rendered progressively
 */
export async function* solveProblemStream(problem: Problem & any, signal?: AbortSignal, sessionToken?: string): AsyncGenerator<Solution, void, unknown> {
  try {
    console.log('📤 Sending problem to backend (STREAM):', problem.content);

    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

    const response = await fetch(`${API_BASE_URL}/api/ask-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: problem.content,
        user_id: (problem as any).userId || 'guest',
        session_id: sessionToken || ''
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    // Read the response as a stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let sources: any[] = [];
    let solutionId = `solution-${Date.now()}`;
    let serverChargedRemaining: number | undefined = undefined;

    console.log('🟢 Stream started - reading chunks');

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('✅ Stream completed - received chunks');
        break;
      }

      // Add new data to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by newlines
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      // Process complete lines
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and keepalive comments
        if (!trimmed || trimmed.startsWith(':')) {
          if (trimmed.startsWith(':')) {
            console.log('💓 Keepalive ping received');
          }
          continue;
        }

        // Parse SSE data lines
        if (trimmed.startsWith('data: ')) {
          try {
            const jsonStr = trimmed.slice(6); // Remove "data: " prefix
            const data = JSON.parse(jsonStr);

            // Handle different message types
            if (data.token) {
              // Text chunk - accumulate and yield
              fullContent += data.token;
              
              // Yield solution with accumulated content
              const solution: Solution = {
                id: solutionId,
                steps: [],
                finalAnswer: fullContent,
                confidence: 95,
                confidenceLevel: 'high',
                status: 'streaming',
                timestamp: Date.now(),
                content: fullContent,
                sources: sources,
              };
              
              yield solution;
              
            } else if (data.metadata) {
              // Initial metadata
              sources = data.metadata.sources || [];
              console.log('📋 Received metadata');
              
            } else if (data.conclusion) {
              // Conclusion received
              console.log('🏁 Received conclusion');
              
            } else if (data.charged) {
              // Server-side charge happened; capture remaining credits
              console.log('💶 Server-side charge detected, remaining:', data.remaining);
              serverChargedRemaining = data.remaining;

            } else if (data.done) {
              // Stream finished
              console.log('✅ Stream done signal received');
              
              // Yield final solution
              const solution: Solution & any = {
                id: solutionId,
                steps: [],
                finalAnswer: fullContent,
                confidence: 95,
                confidenceLevel: 'high',
                status: 'ok',
                timestamp: Date.now(),
                content: fullContent,
                sources: sources,
              };
              if (typeof serverChargedRemaining === 'number') (solution as any).chargedRemaining = serverChargedRemaining;

              yield solution;
              
            } else if (data.error) {
              throw new Error(data.error || 'Stream error');
            }
          } catch (parseError) {
            // Don't throw - just warn and continue
            console.warn('⚠️ Parse error (skipping):', trimmed.substring(0, 50));
          }
        }
      }
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to solve problem';
    console.error('❌ Error solving problem (stream):', message);
    throw new Error(message);
  }
}

/**
 * Solve a math problem using the backend AI agent (original non-streaming version)
 * Returns an AcademicResponse with structured step-by-step solution
 */
export async function solveProblem(problem: Problem): Promise<Solution> {
  try {
    console.log('📤 Sending problem to backend:', problem.content);

    const response = await fetch(`${API_BASE_URL}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: problem.content,
        user_id: (problem as any).userId || 'guest',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    const data: any = await response.json();
    console.log('✅ Received response:', data);

    // Extract full content from backend response
    let fullContent = '';
    if (data.steps && data.steps.length > 0 && data.steps[0].explanation) {
      fullContent = data.steps[0].explanation;
    } else if (data.answer) {
      fullContent = data.answer;
    } else if (data.conclusion) {
      fullContent = data.conclusion;
    }

    // Convert backend response to Solution format
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

/**
 * Get conversation history for the current user
 */
export async function getConversationHistory(conversationId: string, userId: string = 'guest') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${userId}/${conversationId}`);
    if (!res.ok) return { messages: [], id: conversationId };
    const conv = await res.json();
    return { messages: conv.messages || [], id: conversationId };
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return { messages: [], id: conversationId };
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(userId: string = 'guest') {
  try {
    // Try backend first
    const res = await fetch(`${API_BASE_URL}/api/conversations/${userId}`);
    if (res.ok) {
      const conversations = await res.json();
      return conversations.sort((a: any, b: any) => (a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1);
    }
  } catch (error) {
    console.warn('Failed to fetch conversations from backend:', error);
  }
  
  // Fallback to localStorage
  try {
    const key = `conversations_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const conversations = JSON.parse(raw) as any[];
    return conversations.sort((a, b) => (a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return [];
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(title: string = 'Chat', userId: string = 'guest') {
  try {
    // Try backend first
    const res = await fetch(`${API_BASE_URL}/api/conversations/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.warn('Failed to create conversation on backend:', error);
  }

  // Fallback: create locally
  const conv = {
    success: true,
    id: `conv-${Date.now()}`,
    title: title,
    createdAt: new Date().toISOString(),
    messages: [],
  };
  
  // Save to localStorage as backup
  try {
    const key = `conversations_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    const conversations = raw ? JSON.parse(raw) : [];
    conversations.push(conv);
    localStorage.setItem(key, JSON.stringify(conversations));
  } catch (e) {
    console.warn('Failed to save conversation to localStorage:', e);
  }
  
  return conv;
}

/**
 * Update an existing conversation with new messages
 */
export async function updateConversation(conversationId: string, userId: string = 'guest', messages: any[] = [], title?: string) {
  try {
    // Try backend first - send messages and/or title (API accepts optional title)
    const payload: any = {};
    if (messages !== undefined) payload.messages = messages;
    if (title !== undefined) payload.title = title;

    const res = await fetch(`${API_BASE_URL}/api/conversations/${userId}/${conversationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return { success: true };
    }
  } catch (error) {
    console.warn('Failed to update conversation on backend:', error);
  }

  // Fallback: save to localStorage
  try {
    const key = `conversations_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    const conversations = raw ? JSON.parse(raw) : [];

    const index = conversations.findIndex((c: any) => c.id === conversationId);
    if (index >= 0) {
      if (messages !== undefined) conversations[index].messages = messages;
      if (title !== undefined) conversations[index].title = title;
      conversations[index].updatedAt = new Date().toISOString();
    }
    
    localStorage.setItem(key, JSON.stringify(conversations));
    return { success: true };
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return { success: false };
  }
}

/**
 * Submit feedback for a solution
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
 */
export async function deleteConversation(conversationId: string, userId: string = 'guest') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${userId}/${conversationId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    return { success: false, message };
  }
}

/**
 * Credits endpoints (backend)
 */
export async function getCredits(userId: string = 'guest', sessionToken?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    const res = await fetch(`${API_BASE_URL}/api/credits/${userId}`, { headers });
    if (!res.ok) return { remaining: null };
    return await res.json();
  } catch (error) {
    console.error('Failed to get credits', error);
    // Return null to indicate the backend couldn't be reached or verified
    return { remaining: null };
  }
} 

export async function spendCredits(userId: string = 'guest', sessionToken?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
    const res = await fetch(`${API_BASE_URL}/api/credits/${userId}/spend`, { method: 'POST', headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to spend credit');
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to spend credit', error);
    throw error;
  }
}

/**
 * Check if the backend server is running and healthy
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}