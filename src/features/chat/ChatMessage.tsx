import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../../theme/useTheme';
import { useUser, useAuth } from '@clerk/clerk-react';
import ChatInput from './ChatInput';
import SolutionDisplay from '../../components/SolutionDisplay';
import InlineSpinner from '../../components/InlineSpinner';
import ErrorDisplay from '../../components/ErrorDisplay';
import GuestNamePrompt from '../../components/GuestNamePrompt';
import { getCredits as localGetCredits, spendCredit as localSpendCredit } from '../credits/creditsService';
import {
  solveProblemStream,
  trackAnalyticsEvent,
  createConversation,
  updateConversation,
  getConversationHistory,
  getCredits,
} from '../../services/api';
import { getTranslation } from '../../utils/translations';
import { useLanguage } from '../../hooks/useLanguage';
import type { ChatMessage as ChatMessageType, Problem } from '../../types';

const ChatMessage = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const language = useLanguage();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string>(() => localStorage.getItem('guest_name') || '');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const entryRef = useRef({ hasReceivedChunk: false });
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [followWhileStreaming, setFollowWhileStreaming] = useState(true);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Store image preview URLs to revoke on cleanup
  const imageUrlsRef = useRef<Map<string, string>>(new Map());

  const userName = user?.firstName || guestName || getTranslation('learnerLabel', language);
  const { getToken, isLoaded: isAuthLoaded } = useAuth();

  const getSessionToken = useCallback(async () => {
    if (!user?.id || !isAuthLoaded) return undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const token = await getToken();
        if (token) return token;
      } catch (e) {
        // ignore and retry
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
    return undefined;
  }, [user?.id, isAuthLoaded, getToken]);

  // Cleanup image preview URLs on unmount
  useEffect(() => {
    return () => {
      imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Listen for reset chat event
  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
      setError(null);
      setLoading(false);
      setConversationId(null);
    };

    window.addEventListener('resetChat', handleResetChat);

    const handleLoadConversation = async (e: Event) => {
      const ev = e as CustomEvent;
      const id = ev.detail?.id as string;
      if (!id) return;
      const token = await getSessionToken();
      const hist = await getConversationHistory(id, user?.id || 'guest', token);
      setConversationId(id);
      setMessages(hist.messages || []);
      setFollowWhileStreaming(false);
    };

    window.addEventListener('loadConversation', handleLoadConversation);

    const handleCreditsSpendFailed = (e: Event) => {
      const ev = e as CustomEvent;
      const err = ev.detail?.error || 'Failed to deduct credits. Please retry.';
      setError(String(err));
    };

    window.addEventListener('creditsSpendFailed', handleCreditsSpendFailed);

    return () => {
      window.removeEventListener('resetChat', handleResetChat);
      window.removeEventListener('loadConversation', handleLoadConversation);
      window.removeEventListener('creditsSpendFailed', handleCreditsSpendFailed);
    };
  }, [user, getSessionToken]);

  // Initialize credits on mount
  useEffect(() => {
    const init = async () => {
      try {
        if (user?.id) {
          const token = await getSessionToken();
          const credits = await getCredits(user.id, token);
          setCreditsRemaining(credits.remaining ?? null);
        } else {
          try {
            const local = localGetCredits();
            setCreditsRemaining(local.remaining ?? null);
          } catch (e) {
            setCreditsRemaining(null);
          }
        }
      } catch (err) {
        setCreditsRemaining(null);
      }
    };

    init();
  }, [user, getSessionToken]);

  // Attach scroll listeners to the chat messages container
  useEffect(() => {
    const container = scrollContainerRef.current || document.querySelector('.scrollbar-thin');
    if (!container) return;

    const onUserScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el.scrollHeight - el.scrollTop - el.clientHeight > 50) {
        setFollowWhileStreaming(false);
      } else {
        setFollowWhileStreaming(true);
      }
    };

    const onUserInteract = () => setFollowWhileStreaming(false);

    container.addEventListener('scroll', onUserScroll);
    container.addEventListener('wheel', onUserInteract, { passive: true });
    container.addEventListener('touchstart', onUserInteract, { passive: true });

    return () => {
      container.removeEventListener('scroll', onUserScroll);
      container.removeEventListener('wheel', onUserInteract as EventListener);
      container.removeEventListener('touchstart', onUserInteract as EventListener);
    };
  }, [messages.length]);

  const generateTitleFromQuestion = (text: string) => {
    if (!text || typeof text !== 'string') return getTranslation('defaultChatTitle', language);
    return text.length > 100 ? text.slice(0, 97).trim() + '...' : text;
  };

  const handleSubmitProblem = useCallback(
    async (
      problemText: string,
      image?: File,
      documentFile?: File,
      options?: { forceFresh?: boolean }
    ) => {
      setFollowWhileStreaming(true);

      // Allow image-only OR text-only OR both; block only if truly empty
      const hasText = problemText.trim().length > 0;
      const hasImage = !!image;
      const hasDocument = !!documentFile;
      if (!hasText && !hasImage && !hasDocument) return;

      cancelledRef.current = false;
      setError(null);
      setLoading(true);

      const userId = user?.id || 'guest';

      let token: string | undefined = await getSessionToken();
      if (user?.id && !token) {
        setError(getTranslation('authTokenMissing', language));
        setLoading(false);
        return;
      }

      if (creditsRemaining === 0) {
        setError(getTranslation('noCreditsInline', language));
        setLoading(false);
        return;
      }

      if (creditsRemaining === null) {
        try {
          const current = await getCredits(userId, token);
          if (typeof current.remaining === 'number') {
            setCreditsRemaining(current.remaining);
            if (current.remaining <= 0) {
              setError(getTranslation('noCreditsInline', language));
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // proceed
        }
      }

      const startTime = Date.now();
      let activeConversationId = conversationId;
      let assistantMessageId = '';

      try {
        if (!activeConversationId) {
          const conv = await createConversation(
            getTranslation('defaultChatTitle', language),
            userId,
            token
          );
          activeConversationId = conv.id;
          setConversationId(conv.id);
        }

        // Build the problem object — use the text as-is (ChatInput already sets default for image-only)
        const problem: Problem & { image?: File; document?: File } = {
          id: Date.now().toString(),
          content: problemText,
          submittedAt: Date.now(),
          image,
          document: documentFile,
        };

        // Create stable preview URLs for attachments
        if (image) {
          const previewUrl = URL.createObjectURL(image);
          imageUrlsRef.current.set(problem.id as string, previewUrl);
        }

        const userMessage: ChatMessageType = {
          id: `msg-${Date.now()}`,
          type: 'user',
          problem,
          timestamp: Date.now(),
        };

        assistantMessageId = `msg-${Date.now()}-solution`;
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

        setMessages((prev) => {
          const next = [...prev, userMessage, assistantMessage];

          if (activeConversationId) {
            const shouldSetTitle = prev.length === 0;
            const title = shouldSetTitle ? generateTitleFromQuestion(problemText) : undefined;
            updateConversation(activeConversationId, userId, next, title, token);
            window.dispatchEvent(new CustomEvent('conversationUpdated'));
          }

          if (followWhileStreaming) {
            setTimeout(() => {
              const sc = scrollContainerRef.current || document.querySelector('.scrollbar-thin');
              if (sc) (sc as HTMLElement).scrollTop = (sc as HTMLElement).scrollHeight;
            }, 0);
          }

          return next;
        });

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setIsStreaming(true);

        let lastResponseTime = startTime;
        entryRef.current.hasReceivedChunk = false;
        (entryRef as any).current.completed = false;
        (entryRef as any).current.serverCharged = false;
        (entryRef as any).current.serverRemaining = undefined;

        let streamEnded = false;
        try {
          for await (const solution of solveProblemStream(problem, controller.signal, token, userId, options)) {
            lastResponseTime = Date.now();

            if ((solution as any).chargedRemaining !== undefined) {
              (entryRef as any).current.serverCharged = true;
              (entryRef as any).current.serverRemaining = (solution as any).chargedRemaining;
              try {
                window.dispatchEvent(
                  new CustomEvent('creditsUpdated', {
                    detail: { userId, remaining: (solution as any).chargedRemaining },
                  })
                );
                setTimeout(() => setCreditsRemaining((solution as any).chargedRemaining), 0);
              } catch (e) {
                // ignore
              }
            }

            if (!entryRef.current.hasReceivedChunk) {
              entryRef.current.hasReceivedChunk = true;
              setLoading(false);
            }

            setMessages((prev) => {
              const next = prev.map((msg) => {
                if (msg.id === assistantMessageId) {
                  const newContent = solution.content || '';

                  if (newContent) {
                    console.log('[ChatMessage] Content state update:', {
                      length: newContent.length,
                      status: solution.status,
                      snippet: newContent.substring(0, 50),
                    });
                  }

                  return {
                    ...msg,
                    solution: {
                      ...msg.solution!,
                      content: newContent,
                      finalAnswer: solution.finalAnswer,
                      status: solution.status,
                      sources: solution.sources,
                    } as any,
                  };
                }
                return msg;
              });

              if ((solution.status as any) === 'ok' || (solution.status as any) === 'end') {
                (entryRef as any).current.completed = true;
                if (activeConversationId) {
                  updateConversation(activeConversationId, userId, next, undefined, token);
                  window.dispatchEvent(new CustomEvent('conversationUpdated'));
                }
              }

              return next;
            });

            if (followWhileStreaming) {
              const scrollContainer =
                scrollContainerRef.current || document.querySelector('.scrollbar-thin');
              if (scrollContainer) {
                (scrollContainer as HTMLElement).scrollTop = (
                  scrollContainer as HTMLElement
                ).scrollHeight;
              }
            }
          }
          streamEnded = true;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            cancelledRef.current = true;
            setError(getTranslation('generationStopped', language));

            setMessages((prev) => {
              const next = prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, solution: { ...msg.solution!, status: 'cancelled' } as any }
                  : msg
              );

              if (activeConversationId) {
                updateConversation(activeConversationId, userId, next, undefined, token);
                window.dispatchEvent(new CustomEvent('conversationUpdated'));
              }

              return next;
            });
          } else {
            throw err;
          }
        } finally {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }

        const responseTime = lastResponseTime - startTime;

        if (
          ((entryRef as any).current.completed || streamEnded) &&
          !cancelledRef.current
        ) {
          if (streamEnded && !(entryRef as any).current.completed) {
            (entryRef as any).current.completed = true;
          }
          if (user?.id) {
            try {
              const latestToken = await getSessionToken();
              const latestCredits = await getCredits(userId, latestToken);
              if (typeof latestCredits.remaining === 'number') {
                setCreditsRemaining(latestCredits.remaining);
                window.dispatchEvent(
                  new CustomEvent('creditsUpdated', {
                    detail: { userId, remaining: latestCredits.remaining },
                  })
                );
              }
            } catch (err) {
              console.warn('Failed to refresh credits after stream completion', err);
            }
          } else if (!(entryRef as any).current.serverCharged) {
            try {
              const local = localSpendCredit();
              if (local?.success) {
                setCreditsRemaining(local.remaining ?? null);
              }
            } catch (e) {
              console.error('Failed to spend local guest credit', e);
            }
          }
        }

        await trackAnalyticsEvent({
          eventType: 'problem_submitted',
          solutionId: `solution-${Date.now()}`,
          responseTime,
          timestamp: Date.now(),
          userId,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : getTranslation('unableToSolveTitle', language);
        setError(errorMessage);

        setMessages((prev) => {
          const next = prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, solution: { ...msg.solution!, status: 'error' } as any }
              : msg
          );

          if (activeConversationId) {
            updateConversation(activeConversationId, userId, next, undefined, token);
            window.dispatchEvent(new CustomEvent('conversationUpdated'));
          }

          return next;
        });
      } finally {
        setLoading(false);
      }
    },
    [conversationId, user, getSessionToken, followWhileStreaming, language, creditsRemaining]
  );

  const handleRefreshResponse = useCallback(
    async (assistantMessageId: string, problem: Problem & { image?: File; document?: File }) => {
      setFollowWhileStreaming(true);
      setError(null);
      setLoading(true);
      cancelledRef.current = false;

      const userId = user?.id || 'guest';
      let token: string | undefined = await getSessionToken();

      if (user?.id && !token) {
        setError(getTranslation('authTokenMissing', language));
        setLoading(false);
        return;
      }

      if (creditsRemaining === 0) {
        setError(getTranslation('noCreditsInline', language));
        setLoading(false);
        return;
      }

      if (creditsRemaining === null) {
        try {
          const current = await getCredits(userId, token);
          if (typeof current.remaining === 'number') {
            setCreditsRemaining(current.remaining);
            if (current.remaining <= 0) {
              setError(getTranslation('noCreditsInline', language));
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // proceed
        }
      }

      const startTime = Date.now();
      const activeConversationId = conversationId;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                solution: {
                  ...msg.solution!,
                  content: '',
                  finalAnswer: '',
                  status: 'streaming',
                  sources: [],
                  timestamp: Date.now(),
                } as any,
              }
            : msg
        )
      );

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);

      let lastResponseTime = startTime;
      entryRef.current.hasReceivedChunk = false;
      (entryRef as any).current.completed = false;
      (entryRef as any).current.serverCharged = false;
      (entryRef as any).current.serverRemaining = undefined;

      let streamEnded = false;

      try {
        for await (const solution of solveProblemStream(problem, controller.signal, token, userId, { forceFresh: true })) {
          lastResponseTime = Date.now();

          if ((solution as any).chargedRemaining !== undefined) {
            (entryRef as any).current.serverCharged = true;
            (entryRef as any).current.serverRemaining = (solution as any).chargedRemaining;
            try {
              window.dispatchEvent(
                new CustomEvent('creditsUpdated', {
                  detail: { userId, remaining: (solution as any).chargedRemaining },
                })
              );
              setTimeout(() => setCreditsRemaining((solution as any).chargedRemaining), 0);
            } catch (e) {
              // ignore
            }
          }

          if (!entryRef.current.hasReceivedChunk) {
            entryRef.current.hasReceivedChunk = true;
            setLoading(false);
          }

          setMessages((prev) => {
            const next = prev.map((msg) => {
              if (msg.id === assistantMessageId) {
                return {
                  ...msg,
                  solution: {
                    ...msg.solution!,
                    content: solution.content || '',
                    finalAnswer: solution.finalAnswer,
                    status: solution.status,
                    sources: solution.sources,
                  } as any,
                };
              }
              return msg;
            });

            if ((solution.status as any) === 'ok' || (solution.status as any) === 'end') {
              (entryRef as any).current.completed = true;
              if (activeConversationId) {
                updateConversation(activeConversationId, userId, next, undefined, token);
                window.dispatchEvent(new CustomEvent('conversationUpdated'));
              }
            }

            return next;
          });

          if (followWhileStreaming) {
            const scrollContainer = scrollContainerRef.current || document.querySelector('.scrollbar-thin');
            if (scrollContainer) {
              (scrollContainer as HTMLElement).scrollTop = (scrollContainer as HTMLElement).scrollHeight;
            }
          }
        }
        streamEnded = true;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          cancelledRef.current = true;
          setError(getTranslation('generationStopped', language));

          setMessages((prev) => {
            const next = prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, solution: { ...msg.solution!, status: 'cancelled' } as any }
                : msg
            );

            if (activeConversationId) {
              updateConversation(activeConversationId, userId, next, undefined, token);
              window.dispatchEvent(new CustomEvent('conversationUpdated'));
            }

            return next;
          });
        } else {
          const errorMessage = err instanceof Error ? err.message : getTranslation('unableToSolveTitle', language);
          setError(errorMessage);

          setMessages((prev) => {
            const next = prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, solution: { ...msg.solution!, status: 'error' } as any }
                : msg
            );

            if (activeConversationId) {
              updateConversation(activeConversationId, userId, next, undefined, token);
              window.dispatchEvent(new CustomEvent('conversationUpdated'));
            }

            return next;
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }

      const responseTime = lastResponseTime - startTime;

      if (((entryRef as any).current.completed || streamEnded) && !cancelledRef.current) {
        if (streamEnded && !(entryRef as any).current.completed) {
          (entryRef as any).current.completed = true;
        }
        if (user?.id) {
          try {
            const latestToken = await getSessionToken();
            const latestCredits = await getCredits(userId, latestToken);
            if (typeof latestCredits.remaining === 'number') {
              setCreditsRemaining(latestCredits.remaining);
              window.dispatchEvent(
                new CustomEvent('creditsUpdated', {
                  detail: { userId, remaining: latestCredits.remaining },
                })
              );
            }
          } catch (err) {
            console.warn('Failed to refresh credits after stream completion', err);
          }
        } else if (!(entryRef as any).current.serverCharged) {
          try {
            const local = localSpendCredit();
            if (local?.success) {
              setCreditsRemaining(local.remaining ?? null);
            }
          } catch (e) {
            console.error('Failed to spend local guest credit', e);
          }
        }
      }

      await trackAnalyticsEvent({
        eventType: 'problem_submitted',
        solutionId: `solution-${Date.now()}`,
        responseTime,
        timestamp: Date.now(),
        userId,
      });

      setLoading(false);
    },
    [conversationId, user, getSessionToken, followWhileStreaming, language, creditsRemaining]
  );

  const handleRetry = () => {
    setError(null);
    setMessages((prev) =>
      prev.filter(
        (m) =>
          !(
            m.type === 'assistant' &&
            ((m.solution?.status as any) === 'streaming' ||
              (m.solution?.status as any) === 'error')
          )
      )
    );
    const lastUser = [...messages].reverse().find((m) => m.type === 'user' && m.problem?.content);
    if (lastUser && lastUser.problem) {
      handleSubmitProblem(lastUser.problem.content, lastUser.problem.image);
    }
  };

  const handleFeedbackSubmitted = () => {};

  // Persist conversation when messages change (skip during streaming)
  useEffect(() => {
    if (!conversationId) return;
    if (isStreaming) return;

    const persist = async () => {
      const token = await getSessionToken();
      await updateConversation(conversationId, user?.id || 'guest', messages, undefined, token);
      window.dispatchEvent(new CustomEvent('conversationUpdated'));
    };

    persist();
  }, [messages, conversationId, user, isStreaming, getSessionToken]);

  // Helper: get a stable preview URL for a message's image
  const getImageUrl = (msg: ChatMessageType): string | null => {
    const img = msg.problem?.image;
    if (!img) return null;
    const id = msg.problem?.id as string;
    if (id && imageUrlsRef.current.has(id)) return imageUrlsRef.current.get(id)!;
    // Fallback: create on the fly (shouldn't normally happen)
    const url = URL.createObjectURL(img);
    if (id) imageUrlsRef.current.set(id, url);
    return url;
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
        <div
          ref={(el: HTMLDivElement | null) => {
            scrollContainerRef.current = el;
          }}
          className="flex-1 overflow-y-auto px-6 py-10 flex items-center justify-center scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
        >
          <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in duration-700">
            <div className="relative text-center">
              <h1
                className={`text-4xl md:text-5xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}
              >
                {getTranslation('welcome', language)}, {userName}! 👋
              </h1>
              <p
                className={`text-lg mt-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {getTranslation('description', language)}
              </p>

              {!user && (
                <div className="mt-3 flex justify-center">
                  <GuestNamePrompt onNameSet={(n) => setGuestName(n)} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: '📝', key: 'typeAnyProblem' },
                { icon: '⚡', key: 'getInstantExplanations' },
                { icon: '📷', key: 'uploadImageTip', fallback: 'Upload an image of your problem' },
              ].map(({ icon, key, fallback }) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    theme === 'dark'
                      ? 'bg-[#1a3d2b] border-green-600'
                      : 'bg-green-50 border-green-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{icon}</div>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {getTranslation(key as any, language) || fallback}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <p
                className={`text-sm font-semibold mb-3 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {getTranslation('tryAskingAbout', language)}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { key: 'derivatives', label: getTranslation('derivatives', language) },
                  { key: 'equations', label: getTranslation('equations', language) },
                  { key: 'geometry', label: getTranslation('geometry', language) },
                  { key: 'calculus', label: getTranslation('calculus', language) },
                  { key: 'algebra', label: getTranslation('algebra', language) },
                ].map((topic) => (
                  <button
                    key={topic.key}
                    onClick={() =>
                      handleSubmitProblem(
                        getTranslation('explainPrompt', language).replace('{topic}', topic.label)
                      )
                    }
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

        {loading && (
          <div className="px-6 pb-4">
            <div className="w-full animate-in fade-in duration-300">
              <div className="flex justify-start px-2">
                <div
                  className={`rounded-2xl p-4 ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border border-gray-800'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <InlineSpinner
                    message={getTranslation('solvingProblem', language)}
                    size="md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {creditsRemaining === 0 && (
          <div className="px-6 pb-4">
            <ErrorDisplay
              type="warning"
              title={getTranslation('noCreditsTitle', language)}
              message={getTranslation('noCreditsMessage', language)}
            />
          </div>
        )}

        <ChatInput
          onSubmit={handleSubmitProblem}
          disabled={loading || creditsRemaining === 0}
          isStreaming={isStreaming}
          onStop={() => abortControllerRef.current?.abort()}
        />
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
      <div
        ref={(el: HTMLDivElement | null) => {
          scrollContainerRef.current = el;
        }}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl w-full ${msg.type === 'user' ? 'px-4' : 'px-4'}`}>
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
                      {/* Image thumbnail in chat bubble */}
                      {msg.problem.image && (() => {
                        const url = getImageUrl(msg);
                        return url ? (
                          <div className="mb-2">
                            <img
                              src={url}
                              alt="Uploaded"
                              className="max-w-full h-auto rounded-md max-h-48 object-contain"
                            />
                          </div>
                        ) : null;
                      })()}
                      <p className="text-sm">{msg.problem.content}</p>
                    </div>
                  </div>
                )}

                {/* Assistant message */}
                {msg.type === 'assistant' && msg.solution && (
                  (() => {
                    const previousUserMessage = [...messages]
                      .slice(0, index)
                      .reverse()
                      .find((entry) => entry.type === 'user' && entry.problem?.content);

                    const handleRefreshSolution = previousUserMessage
                      ? () => {
                          void handleRefreshResponse(
                            msg.id,
                            previousUserMessage.problem as Problem & { image?: File; document?: File }
                          );
                        }
                      : undefined;

                    return (
                  <div
                    className={`rounded-2xl p-6 ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border border-gray-800'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <SolutionDisplay
                      solution={msg.solution}
                      response={undefined}
                      confidence={msg.solution.confidence}
                      confidenceLevel={msg.solution.confidenceLevel}
                      solutionId={msg.solution.id}
                      userToken={user?.id}
                      isLoading={loading}
                      onRefresh={handleRefreshSolution}
                      onFeedbackSubmitted={handleFeedbackSubmitted}
                    />
                  </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="w-full animate-in fade-in duration-300">
            <div className="flex justify-start px-4">
              <div
                className={`rounded-2xl p-4 ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border border-gray-800'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <InlineSpinner 
                  message={getTranslation('solvingProblem', language)}
                  size="md"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="w-full px-4 animate-in fade-in duration-300">
            <ErrorDisplay
              type="error"
              title={getTranslation('unableToSolveTitle', language)}
              message={error}
              onRetry={handleRetry}
            />
          </div>
        )}
      </div>

      <ChatInput
        onSubmit={handleSubmitProblem}
        disabled={loading || creditsRemaining === 0}
        isStreaming={isStreaming}
        onStop={() => abortControllerRef.current?.abort()}
      />
    </main>
  );
};

export default ChatMessage;