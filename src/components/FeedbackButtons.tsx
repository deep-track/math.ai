import React, { useState } from 'react';
import { submitFeedback, trackAnalyticsEvent } from '../services/api';
import type { FeedbackType } from '../types';
import { useUser } from '@clerk/clerk-react';

interface FeedbackButtonsProps {
  solutionId: string;
  onFeedbackSubmitted?: (type: FeedbackType) => void;
  userToken?: string;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ 
  solutionId, 
  onFeedbackSubmitted
}) => {
  const { user } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFeedback = async (type: FeedbackType) => {
    if (submitted) return;

    setLoading(true);
    setError(null);

    try {
      // Submit feedback to backend
      await submitFeedback({
        solutionId,
        type,
        timestamp: Date.now(),
        userId: user?.id || 'guest',
      });

      // Track analytics event
      await trackAnalyticsEvent({
        eventType: 'feedback_submitted',
        solutionId,
        timestamp: Date.now(),
        userId: user?.id || 'guest',
      });

      setSubmitted(true);
      onFeedbackSubmitted?.(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 py-4 px-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in duration-300">
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium text-green-700">
          Merci pour votre retour
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">
       Cette solution vous a-t-elle été utile ?
      </p>
      
      <div className="flex gap-3">
        <button
          onClick={() => handleFeedback('helpful')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm group"
        >
          <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10.5a1.5 1.5 0 113 0v-6a1.5 1.5 0 01-3 0v6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
          Utile
        </button>

        <button
          onClick={() => handleFeedback('incorrect')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm group"
        >
          <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v5.43a2 2 0 01-1.105 1.79l-.05.025A4 4 0 0111.055 18H5.64a2 2 0 01-1.962-1.608l-1.2-6A2 2 0 014.44 8H8v-4a2 2 0 012-2 1 1 0 011 1v.667a4 4 0 01.8 2.4l1.867 4.933a4 4 0 01.8 2.4z" />
          </svg>
          Incorrect
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 animate-in shake">
          {error}
        </div>
      )}
    </div>
  );
};

export default FeedbackButtons;
