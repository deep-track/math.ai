import type { Problem, Solution, Feedback, AnalyticsEvent } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface SolveProblemResponse {
  solution: Solution;
  error?: string;
}

interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
}

interface AnalyticsResponse {
  success: boolean;
}

/**
 * Solve a math problem using the backend AI agent
 */
export async function solveProblem(problem: Problem, userToken?: string): Promise<Solution> {
  try {
    const response = await fetch(`${API_BASE_URL}/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
      },
      body: JSON.stringify({
        problem: problem.content,
        language: problem.sourceLanguage || 'en',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data: SolveProblemResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.solution;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to solve problem';
    throw new Error(message);
  }
}

/**
 * Get conversation history for the current user
 */
export async function getConversationHistory(conversationId: string, userToken?: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      headers: {
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversation history';
    throw new Error(message);
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(userToken?: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      headers: {
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
    throw new Error(message);
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(title: string, userToken?: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    throw new Error(message);
  }
}

/**
 * Submit feedback for a solution
 */
export async function submitFeedback(feedback: Feedback, userToken?: string): Promise<SubmitFeedbackResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    throw new Error(message);
  }
}

/**
 * Track analytics event
 */
export async function trackAnalyticsEvent(event: AnalyticsEvent, userToken?: string): Promise<AnalyticsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      // Non-critical, don't throw
      console.warn(`Analytics tracking failed: ${response.status}`);
      return { success: false };
    }

    return await response.json();
  } catch (error) {
    // Non-critical, just log
    console.warn('Failed to track analytics event:', error);
    return { success: false };
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string, userToken?: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    throw new Error(message);
  }
}
