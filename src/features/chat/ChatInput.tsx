import { useState, useRef, useEffect } from 'react';
import historyIcon from '../../data/icons/hugeicons_clock-05.png';
import arrowIcon from '../../data/icons/fluent-mdl2_up.png';
import downArrow from '../../data/icons/mingcute_down-line.png';
import TextareaAutosize from 'react-textarea-autosize';
import { useTheme } from '../../theme/useTheme';

const MAX_CHAR_LIMIT = 5000;

interface ChatInputProps {
  onSubmit?: (message: string, image?: File) => void;
  disabled?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onStop?: () => void;
}

const ChatInput = ({ 
  onSubmit, 
  disabled = false,
  placeholder,
  isStreaming = false,
  onStop
}: ChatInputProps) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if ((message.trim() || selectedImage) && !disabled) {
      onSubmit?.(message.trim(), selectedImage || undefined);
      setMessage('');
      setSelectedImage(null);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('Image file is too large. Please select an image under 10MB.');
        return;
      }
      
      setSelectedImage(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        placeholder={placeholder || "Posez une question sur une image ou un problème de mathématiques..."}
        disabled={disabled}
        className={`w-full resize-none bg-transparent text-sm outline-none transition-colors ${
          theme === 'dark'
            ? 'placeholder-[#FFFFFF80] text-white'
            : 'placeholder-[#00000081] text-gray-900'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Selected image preview */}
      {selectedImage && (
        <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Selected"
            className="h-8 w-8 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-700 truncate block">{selectedImage.name}</span>
            <span className="text-xs text-gray-500">
              {(selectedImage.size / 1024 / 1024).toFixed(2)}MB • Will be analyzed with your question
            </span>
          </div>
          <button
            onClick={removeImage}
            className="text-red-500 hover:text-red-700 text-sm ml-2"
            title="Remove image"
          >
            ✕
          </button>
        </div>
      )}

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
          
          {/* Image Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all duration-200 ${
              theme === 'dark'
                ? 'hover:bg-gray-900 text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Upload image"
            disabled={disabled}
          >
            <span className="text-lg">📷</span>
            <span className="text-xs hidden sm:inline">Image</span>
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
            onClick={isStreaming ? onStop : handleSubmit}
            disabled={isStreaming ? false : ((isEmpty && !selectedImage) || disabled)}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              isStreaming
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg'
                : (isEmpty && !selectedImage) || disabled
                ? theme === 'dark'
                  ? 'bg-gray-700 cursor-not-allowed opacity-50'
                  : 'bg-gray-300 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-[#008751] to-[#00b876] hover:shadow-lg'
            }`}
            title={isStreaming ? "Stop generation" : "Send message (Ctrl+Enter)"}
          >
            {isStreaming ? (
              <span className="text-white text-lg">⏹️</span>
            ) : (
              <img 
                src={arrowIcon} 
                className={`h-4 w-4 transition-all ${
                  isEmpty || disabled ? 'opacity-60' : 'brightness-0 invert'
                }`} 
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;