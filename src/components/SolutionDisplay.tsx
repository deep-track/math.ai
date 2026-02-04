import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ConfidenceIndicator from './ConfidenceIndicator';
import FeedbackButtons from './FeedbackButtons';
import type { Solution } from '../types';

interface SolutionDisplayProps {
  solution?: Solution;
  response?: any;
  confidence?: number;
  confidenceLevel?: 'high' | 'medium' | 'low';
  isLoading?: boolean;
  userToken?: string;
  onFeedbackSubmitted?: () => void;
  solutionId?: string;
}

const SolutionDisplay: React.FC<SolutionDisplayProps> = ({
  solution,
  response,
  confidence = 0.9,
  confidenceLevel = 'high',
  isLoading = false,
  userToken,
  onFeedbackSubmitted,
  solutionId = 'default-solution',
}) => {
  // Get the content from either solution or response
  const content = useMemo(() => {
    if (solution?.content) {
      console.log('[SolutionDisplay] Using solution.content, length:', solution.content.length);
      return solution.content;
    }
    if (solution?.finalAnswer) {
      console.log('[SolutionDisplay] Using solution.finalAnswer, length:', solution.finalAnswer.length);
      return solution.finalAnswer;
    }
    if (response?.answer) {
      console.log('[SolutionDisplay] Using response.answer, length:', response.answer.length);
      return response.answer;
    }
    console.log('[SolutionDisplay] No content found!');
    return '';
  }, [solution, response]);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading solution...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    // Intentionally render nothing when no content is available
    return null;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Confidence Badge */}
      <div className="flex justify-start">
        <ConfidenceIndicator
          confidence={confidence}
          level={confidenceLevel}
          size="md"
        />
      </div>

      {/* Beautiful Markdown Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 prose prose-lg max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({node, ...props}) => (
              <h1 className="text-4xl font-bold text-gray-900 mt-8 mb-4 pb-3 border-b-2 border-green-500" {...props} />
            ),
            h2: ({node, ...props}) => (
              <h2 className="text-3xl font-bold text-gray-900 mt-6 mb-3" {...props} />
            ),
            h3: ({node, ...props}) => (
              <h3 className="text-2xl font-semibold text-gray-800 mt-4 mb-2" {...props} />
            ),
            h4: ({node, ...props}) => (
              <h4 className="text-xl font-semibold text-gray-800 mt-3 mb-1" {...props} />
            ),
            p: ({node, ...props}) => (
              <p className="text-gray-700 leading-relaxed mb-4" {...props} />
            ),
            strong: ({node, ...props}) => (
              <strong className="font-bold text-gray-900" {...props} />
            ),
            em: ({node, ...props}) => (
              <em className="italic text-gray-700" {...props} />
            ),
            ul: ({node, ...props}) => (
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props} />
            ),
            ol: ({node, ...props}) => (
              <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />
            ),
            li: ({node, ...props}) => (
              <li className="text-gray-700" {...props} />
            ),
            blockquote: ({node, ...props}) => (
              <blockquote className="border-l-4 border-green-500 bg-green-50 pl-4 py-2 my-4 italic text-gray-700" {...props} />
            ),
            code: ({node, inline, ...props}: any) => 
              inline ? (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-red-600" {...props} />
              ) : (
                <code className="block bg-gray-900 text-gray-100 p-4 rounded my-4 overflow-x-auto text-sm font-mono" {...props} />
              ),
            hr: ({node, ...props}) => (
              <hr className="my-6 border-t-2 border-gray-300" {...props} />
            ),
            a: ({node, ...props}) => (
              <a className="text-green-600 hover:text-green-700 underline" target="_blank" rel="noopener noreferrer" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Feedback Section */}
      <div className="animate-in fade-in slide-in-from-bottom duration-500">
        <FeedbackButtons
          solutionId={solutionId}
          userToken={userToken}
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      </div>
    </div>
  );
};

export default SolutionDisplay;
