import { useTheme } from '../theme/useTheme';

interface InlineSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const InlineSpinner: React.FC<InlineSpinnerProps> = ({ message = 'Solving...', size = 'md' }) => {
  const { theme } = useTheme();

  const sizeMap = {
    sm: { spinner: 'w-4 h-4', container: 'gap-2' },
    md: { spinner: 'w-6 h-6', container: 'gap-3' },
    lg: { spinner: 'w-8 h-8', container: 'gap-4' },
  };

  const { spinner, container } = sizeMap[size];

  return (
    <div className={`flex items-center ${container}`}>
      {/* Animated spinner */}
      <div className={`${spinner} relative`}>
        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          .inline-spinner {
            animation: spin 1s linear infinite;
          }
        `}</style>
        <svg
          className="inline-spinner"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.25"
          />
          <path
            fill="currentColor"
            d="M12 2c5.523 0 10 4.477 10 10h-2c0-4.418-3.582-8-8-8V2z"
            className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}
          />
        </svg>
      </div>
      {message && (
        <span
          className={`text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
};

export default InlineSpinner;
