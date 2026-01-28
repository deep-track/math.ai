import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownDisplayProps {
  content: string;
  className?: string;
}

const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ 
  content, 
  className = '' 
}) => {
  return (
    <div className={`markdown-prose ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h3: ({node, ...props}) => (
            <h3 className="text-lg font-bold text-blue-700 mt-6 mb-3 pb-2 border-b border-gray-200" {...props} />
          ),
          h2: ({node, ...props}) => (
            <h2 className="text-xl font-bold text-blue-800 mt-8 mb-4" {...props} />
          ),
          p: ({node, ...props}) => (
            <p className="text-gray-700 mb-3 leading-relaxed" {...props} />
          ),
          strong: ({node, ...props}) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
          ul: ({node, ...props}) => (
            <ul className="list-disc list-inside mb-3 space-y-2 text-gray-700" {...props} />
          ),
          ol: ({node, ...props}) => (
            <ol className="list-decimal list-inside mb-3 space-y-2 text-gray-700" {...props} />
          ),
          li: ({node, ...props}) => (
            <li className="ml-2 text-gray-700" {...props} />
          ),
          hr: ({node, ...props}) => (
            <hr className="my-6 border-t-2 border-gray-300" {...props} />
          ),
          code: ({node, inline, ...props}: any) => 
            inline ? (
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800" {...props} />
            ) : (
              <code className="block bg-gray-100 p-3 rounded mb-3 text-sm font-mono text-gray-800 overflow-x-auto" {...props} />
            ),
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 text-gray-700 italic" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownDisplay;
