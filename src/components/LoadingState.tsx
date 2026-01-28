import React from 'react';

interface LoadingStateProps {
  variant?: 'solving' | 'login' | 'general';
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ variant = 'general', message = 'Loading...' }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'solving':
        return 'from-indigo-50 via-purple-50 to-pink-50';
      case 'login':
        return 'from-blue-50 to-indigo-100';
      default:
        return 'from-gray-50 to-gray-100';
    }
  };

  const getAccentColor = () => {
    switch (variant) {
      case 'solving':
        return '#8b5cf6';
      case 'login':
        return '#006b42';
      default:
        return '#008751';
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen bg-gradient-to-br ${getVariantClasses()}`}>
      <style>{`
        @keyframes mathSpinner {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: rotate(180deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse-ring {
          0% {
            r: 30px;
            opacity: 1;
          }
          100% {
            r: 60px;
            opacity: 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .math-spinner {
          animation: mathSpinner 2s linear infinite;
        }

        .pulse-ring {
          animation: pulse-ring 1.5s ease-out infinite;
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .shimmer-text {
          background: linear-gradient(90deg, #ccc 25%, #e0e0e0 50%, #ccc 75%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="flex flex-col items-center gap-8">
        {/* Main spinner with math symbol */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Background ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r="30"
              className="pulse-ring"
              fill="none"
              stroke={getAccentColor()}
              strokeWidth="2"
              opacity="0.7"
            />
          </svg>

          {/* Animated spinner */}
          <div className="math-spinner text-5xl">
            ∑
          </div>
        </div>

        {/* Message text */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-semibold text-gray-700">{message}</p>
          
          {variant === 'solving' && (
            <div className="flex gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full float-animation" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 bg-purple-500 rounded-full float-animation" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-purple-500 rounded-full float-animation" style={{ animationDelay: '0.4s' }}></span>
            </div>
          )}

          {variant === 'login' && (
            <div className="flex gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full float-animation" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 bg-green-600 rounded-full float-animation" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-green-600 rounded-full float-animation" style={{ animationDelay: '0.4s' }}></span>
            </div>
          )}
        </div>

        {/* Sub-message for context */}
        {variant === 'solving' && (
          <p className="text-sm text-gray-500 text-center max-w-xs">
            AI is analyzing your problem and preparing a step-by-step explanation...
          </p>
        )}

        {variant === 'login' && (
          <p className="text-sm text-gray-500 text-center max-w-xs">
            Setting up your learning environment...
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingState;
