import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../theme/useTheme';
import { useUser } from '@clerk/clerk-react';
import ChatInput from './ChatInput';
import SolutionDisplay from '../../components/SolutionDisplay';
import LoadingState from '../../components/LoadingState';
import ErrorDisplay from '../../components/ErrorDisplay';
import { solveProblemStream, trackAnalyticsEvent } from '../../services/api';
import { getTranslation } from '../../utils/translations';
import type { ChatMessage as ChatMessageType, Problem } from '../../types';

const ChatMessage = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.firstName || 'Learner';

  // Listen for reset chat event
  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
      setError(null);
      setLoading(false);
    };

    window.addEventListener('resetChat', handleResetChat);
    return () => window.removeEventListener('resetChat', handleResetChat);
  }, []);

  const handleSubmitProblem = useCallback(
    async (problemText: string) => {
      console.debug('[ChatMessage] handleSubmitProblem called', { problemText });
      if (!problemText.trim()) return;

      setError(null);
      setLoading(true);

      const startTime = Date.now();

      try {
        // Create problem object
        const problem: Problem = {
          id: Date.now().toString(),
          content: problemText,
          submittedAt: Date.now(),
        };

        // Add user message to chat
        const userMessage: ChatMessageType = {
          id: `msg-${Date.now()}`,
          type: 'user',
          problem,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);

        // Create placeholder for assistant message
        const assistantMessageId = `msg-${Date.now()}-solution`;
        const assistantMessage: ChatMessageType = {
          id: assistantMessageId,
          type: 'assistant',
          solution: {
            id: `solution-${Date.now()}`,
            steps: [],
            finalAnswer: '',
            confidence: 95,
            confidenceLevel: 'high',
            status: 'streaming',
            timestamp: Date.now(),
            content: '',
            sources: [],
          },
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Stream the response
        let lastResponseTime = startTime;

        // Try to obtain a session token if user is logged in
        let sessionToken: string | undefined = undefined;
        try {
          if (user && (user as any).getToken) {
            sessionToken = await (user as any).getToken();
          }
        } catch (tokErr) {
          console.debug('[ChatMessage] Failed to get session token - proceeding as guest', tokErr);
        }

        for await (const solution of solveProblemStream(problem, sessionToken)) {
          lastResponseTime = Date.now();

          // Update the assistant message with streaming content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    solution: {
                      ...msg.solution!,
                      content: solution.content,
                      finalAnswer: solution.finalAnswer,
                      status: solution.status,
                      sources: solution.sources,
                    } as any,
                  }
                : msg
            )
          );

          // If server-side charged info is present, notify other components
          if ((solution as any).chargedRemaining !== undefined) {
            const remaining = (solution as any).chargedRemaining as number;
            console.debug('[ChatMessage] Server-side charged remaining:', remaining);
            window.dispatchEvent(new CustomEvent('creditsUpdated', { detail: { remaining } }));
          }

          // Scroll to bottom on each chunk
          setTimeout(() => {
            const scrollContainer = document.querySelector('.scrollbar-thin');
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
          }, 0);
        }

        const responseTime = lastResponseTime - startTime;

        // Track analytics
        await trackAnalyticsEvent({
          eventType: 'problem_submitted',
          solutionId: `solution-${Date.now()}`,
          responseTime,
          timestamp: Date.now(),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to solve problem. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleRetry = () => {
    setError(null);
  };

  const handleFeedbackSubmitted = () => {
    // Optional: Could add a success message or other feedback here
  };

  // Landing page when no messages
  if (messages.length === 0) {
    return (
      <main
        className={`flex flex-1 flex-col h-full w-full overflow-hidden ${
          theme === 'dark'
            ? 'bg-linear-to-b from-[#0A0A0A] via-[#063D2B] to-[#0A7A4A]'
            : 'bg-linear-to-b from-white via-[#e5f6ef] to-[#008751]'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-6 py-10 flex items-center justify-center scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in duration-700">
            {/* Welcome header */}
            <div>
              <h1
                className={`text-4xl md:text-5xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}
              >
                {getTranslation('welcome')}, {userName}! 👋
              </h1>
              <p
                className={`text-lg mt-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {getTranslation('description')}
              </p>
            </div>

            {/* Quick tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-[#1a3d2b] border-green-600'
                    : 'bg-green-50 border-green-300'
                }`}
              >
                <div className="text-2xl mb-2">📝</div>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {getTranslation('typeAnyProblem')}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-[#1a3d2b] border-green-600'
                    : 'bg-green-50 border-green-300'
                }`}
              >
                <div className="text-2xl mb-2">⚡</div>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {getTranslation('getInstantExplanations')}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-[#1a3d2b] border-green-600'
                    : 'bg-green-50 border-green-300'
                }`}
              >
                <div className="text-2xl mb-2">🎓</div>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {getTranslation('learnStepByStep')}
                </p>
              </div>
            </div>

            {/* Example problems */}
            <div>
              <p className={`text-sm font-semibold mb-3 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {getTranslation('tryAskingAbout')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { key: 'derivatives', label: getTranslation('derivatives') },
                  { key: 'equations', label: getTranslation('equations') },
                  { key: 'geometry', label: getTranslation('geometry') },
                  { key: 'calculus', label: getTranslation('calculus') },
                  { key: 'algebra', label: getTranslation('algebra') },
                ].map((topic) => (
                  <button
                    key={topic.key}
                    onClick={() => handleSubmitProblem(`Explain ${topic.label}`)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                      theme === 'dark'
                        ? 'bg-green-900 text-green-100 hover:bg-green-800'
                        : 'bg-green-200 text-green-800 hover:bg-green-300'
                    }`}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ChatInput onSubmit={handleSubmitProblem} disabled={loading} />
      </main>
    );
  }

  // Chat messages view
  return (
    <main
      className={`flex flex-1 flex-col h-full w-full overflow-hidden ${
        theme === 'dark'
          ? 'bg-linear-to-b from-[#0A0A0A] via-[#063D2B] to-[#0A7A4A]'
          : 'bg-linear-to-b from-white via-[#e5f6ef] to-[#008751]'
      }`}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className={`flex ${
                msg.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-3xl w-full ${
                  msg.type === 'user' ? 'px-4' : 'px-4'
                }`}
              >
                {/* User message */}
                {msg.type === 'user' && msg.problem && (
                  <div className="flex justify-end">
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-lg break-words ${
                        theme === 'dark'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-400 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.problem.content}</p>
                    </div>
                  </div>
                )}

                {/* Assistant message with solution */}
                {msg.type === 'assistant' && msg.solution && (
                  <div
                    className={`rounded-2xl p-6 ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border border-gray-800'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <SolutionDisplay
                      solution={msg.solution}
                      confidence={msg.solution.confidence}
                      confidenceLevel={msg.solution.confidenceLevel}
                      solutionId={msg.solution.id}
                      userToken={user?.id}
                      onFeedbackSubmitted={handleFeedbackSubmitted}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading state */}
        {loading && (
          <div className="w-full animate-in fade-in duration-300">
            <div className="flex justify-start px-4">
              <div
                className={`rounded-2xl p-8 ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border border-gray-800'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <LoadingState variant="solving" message="Solving your problem..." />
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="w-full px-4 animate-in fade-in duration-300">
            <ErrorDisplay
              type="error"
              title="Unable to Solve"
              message={error}
              onRetry={handleRetry}
            />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSubmit={handleSubmitProblem} disabled={loading} />
    </main>
  );
};

export default ChatMessage;