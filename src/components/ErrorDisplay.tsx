import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'info';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  type = 'error',
}) => {
  const getColors = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200 border-l-4 border-l-yellow-500',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          text: 'text-yellow-700',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200 border-l-4 border-l-blue-500',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          text: 'text-blue-700',
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200 border-l-4 border-l-red-500',
          icon: 'text-red-600',
          title: 'text-red-900',
          text: 'text-red-700',
        };
    }
  };

  const colors = getColors();

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`${colors.bg} ${colors.border} p-6 rounded-lg animate-in fade-in shake duration-300`}>
      <div className="flex gap-4">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${colors.title}`}>
            {title}
          </h3>
          <p className={`mt-2 text-sm ${colors.text}`}>
            {message}
          </p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                type === 'error'
                  ? 'bg-red-200 text-red-800 hover:bg-red-300'
                  : type === 'warning'
                  ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                  : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1119.414 5.414 1 1 0 11-1.414-1.414A5.002 5.002 0 104.659 5.101H7a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
