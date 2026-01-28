import React, { useState } from 'react';
import type { Solution } from '../types';
import ConfidenceIndicator from './ConfidenceIndicator';
import FeedbackButtons from './FeedbackButtons';
import TutorMode from './TutorMode';

interface SolutionDisplayProps {
  solution: Solution;
  isLoading?: boolean;
  userToken?: string;
  onFeedbackSubmitted?: () => void;
}

const SolutionDisplay: React.FC<SolutionDisplayProps> = ({
  solution,
  isLoading = false,
  userToken,
  onFeedbackSubmitted,
}) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Show tutor mode for low confidence
  if (solution.status === 'tutor') {
    return (
      <div className="w-full animate-in fade-in duration-500">
        <TutorMode 
          solution={solution} 
          userToken={userToken}
        />
      </div>
    );
  }

  // Show refusal
  if (solution.status === 'refusal') {
    return (
      <div className="w-full animate-in fade-in duration-500">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                Could not solve this problem
              </h3>
              <p className="text-yellow-700 mt-2">
                {solution.refusalReason || 'This problem cannot be solved with the current parameters. Please try rephrasing your question or providing additional context.'}
              </p>
              <div className="mt-4">
                <button className="text-sm font-medium text-yellow-600 hover:text-yellow-700 underline">
                  Try a different problem
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show regular solution
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Confidence Badge */}
      <div className="flex justify-start">
        <ConfidenceIndicator
          confidence={solution.confidence}
          level={solution.confidenceLevel}
          size="md"
        />
      </div>

      {/* Steps Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">Solution Steps</h2>
        
        <div className="space-y-2">
          {solution.steps.map((step, index) => (
            <div
              key={step.id}
              className={`animate-in fade-in slide-in-from-bottom-2 duration-300 transition-all`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  {/* Step number */}
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-sm group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {step.description}
                    </p>
                    {step.formula && (
                      <div className="mt-2 text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 inline-block">
                        {step.formula}
                      </div>
                    )}
                  </div>

                  {/* Expand icon */}
                  <svg
                    className={`w-5 h-5 text-gray-400 group-hover:text-green-600 transition-all duration-200 flex-shrink-0 ${
                      expandedStep === step.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                {/* Expanded content */}
                {expandedStep === step.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-gray-700 text-sm animate-in fade-in duration-200">
                    {step.description}
                    {step.formula && (
                      <div className="mt-3 font-mono bg-gray-100 p-3 rounded overflow-x-auto">
                        {step.formula}
                      </div>
                    )}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Final Answer Section */}
      <div className={`p-6 rounded-lg border-2 border-green-500 bg-green-50 animate-in fade-in slide-in-from-bottom duration-500`} style={{ animationDelay: `${solution.steps.length * 100}ms` }}>
        <p className="text-sm font-semibold text-green-700 uppercase tracking-wider">Final Answer</p>
        <p className="text-2xl font-bold text-gray-900 mt-2 break-words">
          {solution.finalAnswer}
        </p>
      </div>

      {/* Feedback Section */}
      <div className={`animate-in fade-in slide-in-from-bottom duration-500`} style={{ animationDelay: `${(solution.steps.length + 1) * 100}ms` }}>
        <FeedbackButtons
          solutionId={solution.id}
          userToken={userToken}
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      </div>
    </div>
  );
};

export default SolutionDisplay;
