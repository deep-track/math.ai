import type { Problem, Solution, Feedback, AnalyticsEvent, SubmitFeedbackResponse, AnalyticsResponse } from '../types';

// Get API base URL from environment, default to localhost
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Remove trailing slash to avoid double slashes in URLs
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

/**
 * Solve a math problem using streaming - shows text word-by-word
 * Returns stream of Solution chunks that can be rendered progressively
 */
export async function* solveProblemStream(problem: Problem): AsyncGenerator<Solution, void, unknown> {
  try {
    console.log('📤 Sending problem to backend (STREAM):', problem.content);

    const response = await fetch(`${API_BASE_URL}/ask-stream`, {
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Process all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const chunk = JSON.parse(line);

          if (chunk.type === 'start') {
            // Initial metadata - ignore problem statement as it's in the problem object
            sources = chunk.sources || [];
            console.log('🟢 Stream started');
            
          } else if (chunk.type === 'chunk') {
            // Text chunk - accumulate and yield
            fullContent += chunk.text;
            
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
            
          } else if (chunk.type === 'end') {
            // Stream finished
            console.log('✅ Stream completed');
            
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
            };
            
            yield solution;
            
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error || 'Stream error');
          }
        } catch (parseError) {
          console.error('Error parsing stream chunk:', parseError, line);
        }
      }

      // Keep incomplete line in buffer
      buffer = lines[lines.length - 1];
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
 * Note: This is a stub - conversations are stored client-side for now
 */
export async function getConversationHistory(conversationId: string) {
  try {
    // For now, return empty messages array - handled client-side
    return { messages: [], id: conversationId };
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return { messages: [], id: conversationId };
  }
}

/**
 * Get all conversations for the current user
 * Note: This is a stub - conversations are stored client-side for now
 */
export async function getConversations() {
  try {
    // For now, return empty array - conversations handled client-side
    return [];
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return [];
  }
}

/**
 * Create a new conversation
 * Note: This is a stub - conversations are stored client-side for now
 */
export async function createConversation(title: string) {
  try {
    // For now, return a stub conversation object
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
 * Note: This is a stub - conversations are stored client-side for now
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
