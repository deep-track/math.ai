import React, { useState } from 'react';
import type { Solution } from '../types';

interface TutorModeProps {
  solution: Solution;
  userToken?: string;
}

const TutorMode: React.FC<TutorModeProps> = ({ solution }) => {
  const [revealedHints, setRevealedHints] = useState<boolean[]>(
    (solution.tutoringHints || []).map(() => false)
  );
  const [showSolution, setShowSolution] = useState(false);

  const toggleHint = (index: number) => {
    const newRevealed = [...revealedHints];
    newRevealed[index] = !newRevealed[index];
    setRevealedHints(newRevealed);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Header with confidence indicator */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-6 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.243a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM5.757 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zM5.757 4.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-900">
              Let's work through this together
            </h2>
            <p className="text-amber-700 mt-2">
              I'm not very confident about this solution. Here are some hints to guide your thinking.
            </p>
          </div>
        </div>
      </div>

      {/* Hints Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Hints</h3>
        
        {(solution.tutoringHints || []).length > 0 ? (
          <div className="space-y-2">
            {solution.tutoringHints?.map((hint, index) => (
              <button
                key={index}
                onClick={() => toggleHint(index)}
                className="w-full text-left p-4 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">
                      Hint {index + 1}
                    </p>
                    {revealedHints[index] && (
                      <p className="text-amber-700 mt-2 animate-in fade-in duration-300">
                        {hint}
                      </p>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-amber-600 group-hover:text-amber-800 transition-all duration-200 flex-shrink-0 ${
                      revealedHints[index] ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm">No specific hints available for this problem.</p>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">or</span>
        </div>
      </div>

      {/* Show Solution Button */}
      <button
        onClick={() => setShowSolution(!showSolution)}
        className={`w-full p-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
          showSolution
            ? 'bg-green-100 text-green-700 border-2 border-green-500'
            : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-2 border-transparent hover:shadow-lg'
        }`}
      >
        {showSolution ? 'Hide Full Solution' : 'Show Full Solution'}
      </button>

      {/* Solution Display */}
      {showSolution && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Steps */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Complete Solution Steps:</h4>
            {solution.steps.map((step, index) => (
              <div
                key={step.id}
                className="p-4 rounded-lg bg-gray-50 border border-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">{step.title}</h5>
                    <p className="text-gray-700 mt-1">{step.description}</p>
                    {step.formula && (
                      <div className="mt-2 font-mono bg-gray-100 px-3 py-2 rounded text-gray-800 text-sm overflow-x-auto">
                        {step.formula}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Final Answer */}
          <div className="p-6 rounded-lg border-2 border-green-500 bg-green-50">
            <p className="text-sm font-semibold text-green-700 uppercase tracking-wider">Final Answer</p>
            <p className="text-2xl font-bold text-gray-900 mt-2 break-words">
              {solution.finalAnswer}
            </p>
          </div>
        </div>
      )}

      {/* Encouragement Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">💡 Tip:</span> Try to solve this problem yourself using the hints first. This will help you learn better!
        </p>
      </div>
    </div>
  );
};

export default TutorMode;
