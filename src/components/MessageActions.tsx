import { useTheme } from '../theme/useTheme';
import { getTranslation } from '../utils/translations';
import { useLanguage } from '../hooks/useLanguage';
import { useState } from 'react';

interface MessageActionsProps {
  solutionId: string;
  content: string;
  onRefresh?: () => void;
  onFeedback?: (helpful: boolean) => void;
  isLoading?: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  solutionId,
  content,
  onRefresh,
  onFeedback,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const language = useLanguage();
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<'up' | 'down' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackSent(helpful ? 'up' : 'down');
    onFeedback?.(helpful);
  };

  return (
    <div className={`flex gap-2 flex-wrap items-center justify-start pt-2 border-t ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
    }`}>
      {/* Copy button - enlarged */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
          copied
            ? theme === 'dark'
              ? 'bg-green-600/20 text-green-400'
              : 'bg-green-100 text-green-700'
            : theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        }`}
        title="Copy solution"
      >
        <span className="text-base">{copied ? '✓' : '📋'}</span>
        <span>{copied ? getTranslation('copied', language) : getTranslation('copyToClipboard', language)}</span>
      </button>

      {/* Refresh button - enlarged */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
            isLoading
              ? 'opacity-50 cursor-not-allowed'
              : theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
          title="Regenerate answer"
        >
          <span className="text-base">🔄</span>
          <span>{getTranslation('refreshAnswer', language)}</span>
        </button>
      )}

      {/* Feedback buttons - inline, compact */}
      <button
        onClick={() => handleFeedback(true)}
        disabled={feedbackSent !== null}
        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
          feedbackSent === 'up'
            ? theme === 'dark'
              ? 'bg-green-600 text-white'
              : 'bg-green-500 text-white'
            : theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        } ${feedbackSent !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={getTranslation('thumbsUp', language)}
      >
        <span>{getTranslation('thumbsUp', language)}</span>
      </button>
      <button
        onClick={() => handleFeedback(false)}
        disabled={feedbackSent !== null}
        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
          feedbackSent === 'down'
            ? theme === 'dark'
              ? 'bg-red-600 text-white'
              : 'bg-red-500 text-white'
            : theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        } ${feedbackSent !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={getTranslation('thumbsDown', language)}
      >
        <span>Incorrect</span>
      </button>
    </div>
  );
};

export default MessageActions;
