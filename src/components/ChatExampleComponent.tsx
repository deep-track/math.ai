/**
 * Example Chat Component using the Math.AI Backend
 * 
 * This demonstrates how to use the mathAiApi service
 * in your React components.
 */

import { useState, useEffect } from 'react';
import { 
  solveProblem,
  checkBackendHealth,
} from '../services/api';
import type { Problem } from '../types';

export function ChatExample() {
  // State management
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');

  // Check backend health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      const isReady = await checkBackendHealth();
      setBackendReady(isReady);
      
      if (isReady) {
        setBackendStatus('✅ Backend Connected');
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'system',
            content: '✅ Backend connected successfully! Ready to help with math problems.',
            timestamp: new Date().toISOString(),
          }
        ]);
      } else {
        setBackendStatus('⚠️ Backend Not Connected');
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'system',
            content: '⚠️ Backend is not running. Make sure to start the server with: uvicorn src.api.server:app --reload --port 8000',
            timestamp: new Date().toISOString(),
          }
        ]);
      }
    };

    checkHealth();
  }, []);

  // Handle sending a question
  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;
    if (!backendReady) {
      alert('⚠️ Backend is not connected. Please start the server first.');
      return;
    }

    // Add user message to chat
    const userMessageId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: inputValue,
        timestamp: new Date().toISOString(),
      }
    ]);

    // Clear input
    setInputValue('');
    setLoading(true);

    try {
      // Send to backend using current API (solveProblem)
      const question: Problem = {
        id: `prob-${Date.now()}`,
        content: inputValue,
        submittedAt: Date.now(),
      };

      console.log('Sending question:', question);

      const solution = await solveProblem(question);
      const answer = solution.content || solution.finalAnswer || 'No answer returned';

      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString(),
        }
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'system',
          content: `❌ Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        }
      ]);

      console.error('Failed to get answer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reconnect to backend
  const handleReconnect = async () => {
    setBackendStatus('Checking...');
    const isReady = await checkBackendHealth();

    if (isReady) {
      setBackendReady(true);
      setBackendStatus('✅ Backend Connected');
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: '✅ Successfully reconnected to backend!',
          timestamp: new Date().toISOString(),
        }
      ]);
    } else {
      setBackendReady(false);
      setBackendStatus('❌ Unable to Connect');
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: `❌ Failed to connect to backend.`,
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Math.AI Tutor</h1>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${
              backendReady ? 'text-green-600' : 'text-red-600'
            }`}>
              {backendStatus}
            </span>
            {!backendReady && (
              <button
                onClick={handleReconnect}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-lg">👋 Welcome to Math.AI!</p>
            <p className="text-sm mt-2">Ask a math question to get started.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xl px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.role === 'assistant'
                    ? 'bg-gray-200 text-gray-900'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-3 rounded-lg">
              <p className="text-sm">⏳ Thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-6">
        <form onSubmit={handleSendQuestion} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a math question..."
            disabled={loading || !backendReady}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !backendReady || !inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? '⏳' : '📤 Send'}
          </button>
        </form>

        {!backendReady && (
          <p className="text-sm text-red-600 mt-2">
            ⚠️ Backend not connected. Please start the server.
          </p>
        )}
      </div>
    </div>
  );
}
