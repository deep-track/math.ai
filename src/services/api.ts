import type { Problem, Solution, Feedback, AnalyticsEvent, SubmitFeedbackResponse, AnalyticsResponse } from '../types';

// Get API base URL from environment, default to localhost
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Remove trailing slash to avoid double slashes in URLs
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

/**
 * Solve a math problem using streaming - shows text word-by-word
 * Returns stream of Solution chunks that can be rendered progressively
 */
export async function* solveProblemStream(problem: Problem, sessionToken?: string): AsyncGenerator<Solution, void, unknown> {
  try {
    console.log('📤 Sending problem to backend (STREAM):', problem.content);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/ask-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: problem.content,
        user_id: 'guest',
      }),
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
    let chargedRemaining: number | undefined = undefined;

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
              
            } else if (data.done) {
              // Stream finished
              console.log('✅ Stream done signal received');
              
              // Yield final solution
              const solution: Solution = {
                id: solutionId,
                steps: [],
                finalAnswer: fullContent,
                confidence: 95,
                confidenceLevel: 'high',
                status: 'ok',
                timestamp: Date.now(),
                content: fullContent,
                sources: sources,
                chargedRemaining: chargedRemaining,
              };
              
              yield solution;
              
            } else if (data.charged || data.remaining !== undefined) {
              // Server-side charge info
              chargedRemaining = data.remaining ?? chargedRemaining;
              console.log('💳 Server-side charged, remaining:', chargedRemaining);
              
            } else if (data.error) {
              if (data.error && data.error.toLowerCase().includes('no credits')) {
                throw new Error('No credits remaining');
              }
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

    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: problem.content,
        user_id: 'guest',
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
export async function getConversationHistory(conversationId: string) {
  try {
    return { messages: [], id: conversationId };
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return { messages: [], id: conversationId };
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations() {
  try {
    return [];
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return [];
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(title: string) {
  try {
    return {
      success: true,
      id: `conv-${Date.now()}`,
      title: title,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return {
      success: false,
      id: '',
      title: '',
      createdAt: '',
    };
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
export async function deleteConversation(conversationId: string) {
  try {
    console.log('[DELETE CONVERSATION]', conversationId);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    return { success: false, message };
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