import React from 'react';
import type { ConfidenceLevel } from '../types';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-100
  level: ConfidenceLevel;
  size?: 'sm' | 'md' | 'lg';
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ 
  confidence, 
  level, 
  size = 'md' 
}) => {
  const getColorClasses = () => {
    switch (level) {
      case 'high':
        return 'bg-green-500 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-500 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-red-500 text-red-700 border-red-200';
      default:
        return 'bg-gray-500 text-gray-700 border-gray-200';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const getLevelLabel = () => {
    switch (level) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border ${getColorClasses()} ${getSizeClasses()} font-medium transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-center gap-1">
        {/* Circular progress indicator */}
        <div className="relative w-5 h-5 flex items-center justify-center">
          <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 24 24">
            {/* Background circle */}
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.2"
            />
            {/* Progress circle */}
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(confidence / 100) * (2 * Math.PI * 10)} ${2 * Math.PI * 10}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute text-[8px] font-bold">{confidence}%</span>
        </div>
      </div>
      <span>{getLevelLabel()}</span>
    </div>
  );
};

export default ConfidenceIndicator;
