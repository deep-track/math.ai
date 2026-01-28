/**
 * Math.AI Backend API Client
 * 
 * This service handles all communication between the React frontend
 * and the FastAPI backend. It provides a clean interface for:
 * - Sending math questions
 * - Receiving solutions
 * - Handling errors gracefully
 * - Managing loading states
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Request/Response Types
export interface MathQuestion {
  text: string;
  userId?: string;
  context?: string;
  sessionId?: string;
}

export interface MathAIResponse {
  success: boolean;
  answer: string;
  user_id?: string;
  timestamp?: string;
  session_id?: string;
  error?: string;
}

export interface HealthCheck {
  status: string;
  service: string;
  timestamp?: string;
}

/**
 * Send a math question to the backend and get the solution
 * @param question - The math problem to solve
 * @returns The AI's solution/explanation
 * @throws Error if the request fails
 */
export async function testBackend(): Promise<boolean> {
  try {
    console.log('🧪 Testing backend connection...');
    
    const response = await fetch(`${API_BASE_URL}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Test response status:', response.status);
    const data = await response.json();
    console.log('✅ Test successful:', data);
    
    return response.ok;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

export async function askMathAI(question: MathQuestion): Promise<string> {
  try {
    console.log('📤 Sending question to Math.AI backend:', question.text);
    
    // Prepare the request
    const requestBody = {
      text: question.text,
      user_id: question.userId || 'guest',
      context: question.context || '',
      session_id: question.sessionId || '',
    };

    console.log('📋 Request body:', requestBody);

    // Make the request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📥 Backend responded with status:', response.status);
    console.log('📥 Response headers:', {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorDetail = `API error: ${response.status}`;
      try {
        const text = await response.text();
        console.error('Error response text:', text);
        if (text) {
          const error = JSON.parse(text);
          errorDetail = error.detail || errorDetail;
        }
      } catch (parseError) {
        console.warn('Could not parse error response:', parseError);
      }
      throw new Error(errorDetail);
    }

    // Check if response has content
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    
    console.log('📋 Response details:', { contentLength, contentType });

    // Get response text first to debug
    const text = await response.text();
    console.log('📥 Raw response text:', text.substring(0, 200));

    if (!text || text.trim() === '') {
      throw new Error('Backend returned empty response');
    }

    // Parse JSON
    let data: MathAIResponse;
    try {
      data = JSON.parse(text);
      console.log('✅ JSON parsed successfully');
    } catch (jsonError) {
      console.error('❌ JSON parse error:', jsonError);
      console.error('Response was:', text);
      throw new Error(`Invalid JSON from backend: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
    
    // Check for business logic errors
    if (!data.success) {
      throw new Error(data.error || 'Backend returned an error');
    }

    console.log('📥 Received answer from backend');
    console.log('⏱️ Response timestamp:', data.timestamp);
    
    return data.answer;
    
  } catch (error) {
    const message = error instanceof Error 
      ? error.message 
      : 'Failed to get answer from Math.AI backend';
    
    console.error('❌ API Error:', message);
    throw new Error(message);
  }
}

/**
 * Check if the backend server is running and healthy
 * @returns true if backend is healthy, false otherwise
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    console.log('🔍 Checking backend health...');
    
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      console.warn('⚠️ Backend health check failed:', response.status);
      return false;
    }

    const data: HealthCheck = await response.json();
    console.log('✅ Backend is healthy:', data);
    
    return true;
    
  } catch (error) {
    console.warn('⚠️ Backend is not reachable:', error);
    return false;
  }
}

/**
 * Get the backend API status with timeout
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Backend status or error message
 */
export async function getBackendStatus(timeout: number = 5000): Promise<{
  isHealthy: boolean;
  message: string;
  timestamp?: string;
}> {
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error('Backend health check timed out')), timeout)
    );

    // Race between the health check and timeout
    const isHealthy = await Promise.race([
      checkBackendHealth(),
      timeoutPromise,
    ]);

    return {
      isHealthy,
      message: isHealthy ? 'Backend is running' : 'Backend is not responding',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      isHealthy: false,
      message: error instanceof Error ? error.message : 'Failed to check backend status',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test the backend connection with a simple question
 * @returns The response from the backend
 */
export async function testBackendConnection(): Promise<{
  success: boolean;
  message: string;
  response?: MathAIResponse;
}> {
  try {
    console.log('🧪 Testing backend connection...');
    
    const testQuestion: MathQuestion = {
      text: 'What is 2 plus 2?',
      userId: 'test-connection',
      sessionId: `test-${Date.now()}`,
    };

    const answer = await askMathAI(testQuestion);

    return {
      success: true,
      message: 'Backend connection successful',
      response: {
        success: true,
        answer,
        user_id: testQuestion.userId,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection test failed';
    
    return {
      success: false,
      message: `Backend connection failed: ${message}`,
    };
  }
}

/**
 * Get the configured API base URL
 * @returns The API base URL
 */
export function getAPIBaseURL(): string {
  return API_BASE_URL;
}

/**
 * Check if we're using the local development backend
 * @returns true if using localhost/127.0.0.1
 */
export function isLocalBackend(): boolean {
  return (
    API_BASE_URL.includes('localhost') || 
    API_BASE_URL.includes('127.0.0.1')
  );
}
