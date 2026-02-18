import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ConfidenceIndicator from './ConfidenceIndicator';
import FeedbackButtons from './FeedbackButtons';
import { getTranslation } from '../utils/translations';
import { useLanguage } from '../hooks/useLanguage';
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
  onRefresh?: () => void;
}

const SolutionDisplay = ({
  solution,
  response,
  confidence = 0.9,
  confidenceLevel = 'high',
  isLoading = false,
  userToken,
  onFeedbackSubmitted,
  solutionId = 'default-solution',
  onRefresh,
}: SolutionDisplayProps) => {
  const language = useLanguage();
  const [copied, setCopied] = useState(false);

  // Get the content from either solution or response
  const content = useMemo(() => {
    console.log('[SolutionDisplay] Props received:', {
      solution: solution ? {
        content: solution.content?.substring(0, 50),
        finalAnswer: solution.finalAnswer?.substring(0, 50),
        status: solution.status,
        hasContent: !!(solution.content || solution.finalAnswer)
      } : null,
      response: response ? {
        answer: response.answer?.substring(0, 50),
        hasAnswer: !!response.answer
      } : null,
      isLoading
    });
    
    if (solution?.content) {
      const len = solution.content.length;
      if (len > 0) {
        console.log('[SolutionDisplay] Using solution.content, length:', len, 'snippet:', solution.content.substring(0, 50));
        return solution.content;
      }
    }
    if (solution?.finalAnswer) {
      const len = solution.finalAnswer.length;
      if (len > 0) {
        console.log('[SolutionDisplay] Using solution.finalAnswer, length:', len);
        return solution.finalAnswer;
      }
    }
    if (response?.answer) {
      const len = response.answer.length;
      if (len > 0) {
        console.log('[SolutionDisplay] Using response.answer, length:', len);
        return response.answer;
      }
    }
    console.log('[SolutionDisplay] No content - solution:', JSON.stringify({content: solution?.content?.substring(0, 20), finalAnswer: solution?.finalAnswer?.substring(0, 20), status: solution?.status}), 'response:', response?.answer?.substring(0, 20));
    return '';
  }, [solution, response]);

  if (!content) {
    // Intentionally render nothing when no content is available
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy solution content');
    }
  };

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
        {(() => {
          try {
            return (
              <ReactMarkdown
                key={solution?.status || 'unknown'} // Force remount when status changes to avoid DOM reconciliation issues during streaming
                remarkPlugins={[remarkMath]}
                rehypePlugins={[[rehypeKatex, { 
                  throwOnError: false, 
                  strict: false,
                  trust: true,
                  displayMode: false 
                }]]}
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
            );
          } catch (error) {
            console.error('Markdown rendering error:', error);
            return <div className="text-red-600">Error rendering content. Please try again.</div>;
          }
        })()}
      </div>

      {/* Feedback Section */}
      <div className="animate-in fade-in slide-in-from-bottom duration-500">
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={getTranslation('copyToClipboard', language)}
          >
            {copied ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            <span>{copied ? getTranslation('copied', language) : getTranslation('copyToClipboard', language)}</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border ${
                isLoading
                  ? 'opacity-50 cursor-not-allowed text-slate-500 bg-slate-100 border-slate-200'
                  : 'text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={getTranslation('refreshAnswer', language)}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v6h-6" />
              </svg>
              <span>{getTranslation('refreshAnswer', language)}</span>
            </button>
          )}
        </div>

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
