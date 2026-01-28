import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRenderProps {
  content: string;
  display?: boolean;
}

/**
 * Component for rendering mathematical expressions using KaTeX
 */
export const MathRender: React.FC<MathRenderProps> = ({ content, display = false }) => {
  try {
    const html = katex.renderToString(content, {
      displayMode: display,
      throwOnError: false,
      strict: false,
    });

    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        className={`inline-block ${display ? 'block my-2' : ''}`}
      />
    );
  } catch (error) {
    console.error('KaTeX rendering error:', error);
    return <code>{content}</code>;
  }
};

/**
 * Detect and replace LaTeX expressions in text
 */
export const detectAndRenderMath = (text: string): React.ReactElement[] => {
  // Pattern for inline math: $...$
  // Pattern for display math: $$...$$
  const parts: React.ReactElement[] = [];
  let lastIndex = 0;
  
  const displayRegex = /\$\$(.+?)\$\$/g;

  // First handle display math
  let match;
  while ((match = displayRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }
    parts.push(
      <div key={`math-${match.index}`} className="my-2">
        <MathRender content={match[1]} display={true} />
      </div>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : [<span key="text">{text}</span>];
};

/**
 * Escape special characters for LaTeX
 */
export const escapeLaTeX = (str: string): string => {
  const specialChars: { [key: string]: string } = {
    '\\': '\\textbackslash{}',
    '&': '\\&',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    '_': '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };

  return str.replace(/[\\&%$#_{}\~^]/g, (char) => specialChars[char] || char);
};

export default MathRender;
