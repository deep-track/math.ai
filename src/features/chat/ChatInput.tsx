import { useState, useRef, useEffect } from 'react';
import historyIcon from '../../data/icons/hugeicons_clock-05.png';
import arrowIcon from '../../data/icons/fluent-mdl2_up.png';
import downArrow from '../../data/icons/mingcute_down-line.png';
import TextareaAutosize from 'react-textarea-autosize';
import { useTheme } from '../../theme/useTheme';
import { getTranslation } from '../../utils/translations';

const MAX_CHAR_LIMIT = 5000;

interface ChatInputProps {
  onSubmit?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = ({ 
  onSubmit, 
  disabled = false,
  placeholder
}: ChatInputProps) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCharCount(message.length);
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHAR_LIMIT) {
      setMessage(newValue);
    }
  };

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSubmit?.(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
      e.preventDefault();
    }
  };

  const isNearLimit = charCount > MAX_CHAR_LIMIT * 0.9;
  const isEmpty = message.trim() === '';

  return (
    <div 
      className={`mx-4 mb-4 md:mx-5 md:mb-5 rounded-2xl shadow-lg px-4 py-3 transition-all duration-200 flex-shrink-0 ${
        theme === 'dark'
          ? 'bg-black border border-gray-800'
          : 'bg-white border border-gray-200'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <TextareaAutosize
        ref={textareaRef}
        minRows={1}
        maxRows={6}
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || getTranslation('askQuestion')}
        disabled={disabled}
        className={`w-full resize-none bg-transparent text-sm outline-none transition-colors ${
          theme === 'dark'
            ? 'placeholder-[#FFFFFF80] text-white'
            : 'placeholder-[#00000081] text-gray-900'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      />

      {/* Character count */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMessage('')}
            className={`flex items-center rounded-md px-2 py-1 transition-all duration-200 ${
              theme === 'dark'
                ? 'hover:bg-gray-900'
                : 'hover:bg-gray-100'
            } ${isEmpty ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Clear message"
            disabled={isEmpty || disabled}
          >
            <span className="text-lg font-light text-[#008751]">⌫</span>
          </button>
          <button 
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${
              theme === 'dark'
                ? 'hover:bg-gray-900'
                : 'hover:bg-gray-100'
            }`}
            title="View history"
            disabled={disabled}
          >
            <img
              src={historyIcon}
              alt="History"
              className="h-5 w-5"
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium transition-colors ${
            isNearLimit ? 'text-red-500' : 'text-gray-400'
          }`}>
            {charCount}/{MAX_CHAR_LIMIT}
          </span>
          
          <button 
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-all duration-200 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                : 'text-gray-600 hover:bg-gray-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
            title="Model selector"
          >
            <span>Model</span>
            <img src={downArrow} className="h-3 w-3" />
          </button>

          <button 
            onClick={handleSubmit}
            disabled={isEmpty || disabled}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              isEmpty || disabled
                ? theme === 'dark'
                  ? 'bg-gray-700 cursor-not-allowed opacity-50'
                  : 'bg-gray-300 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-[#008751] to-[#00b876] hover:shadow-lg'
            }`}
            title="Send message (Ctrl+Enter)"
          >
            <img 
              src={arrowIcon} 
              className={`h-4 w-4 transition-all ${
                isEmpty || disabled ? 'opacity-60' : 'brightness-0 invert'
              }`} 
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;