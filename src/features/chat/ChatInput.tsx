import { useState, useRef, useEffect, useCallback } from 'react';
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
  onStop,
}: ChatInputProps) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Global paste listener for image pasting from clipboard
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Only intercept if this component is "active" (textarea focused or no other input focused)
      const active = document.activeElement;
      const isInputFocused =
        active instanceof HTMLInputElement ||
        (active instanceof HTMLTextAreaElement && active !== textareaRef.current);
      if (isInputFocused) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) setImage(file);
          return;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const setImage = useCallback((file: File) => {
    const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    if (!ALLOWED.includes(file.type)) {
      alert('Only JPEG, PNG, GIF and WebP images are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB.');
      return;
    }
    // Revoke previous preview URL
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    // Focus textarea after image selection
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [imagePreviewUrl]);

  const removeImage = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [imagePreviewUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHAR_LIMIT) {
      setMessage(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = useCallback(() => {
    const hasText = message.trim().length > 0;
    const hasImage = selectedImage !== null;

    if (!hasText && !hasImage) return;
    if (disabled) return;

    // If image only (no text), pass a default prompt so backend always has text
    const textToSend = hasText
      ? message.trim()
      : 'Analyse et résous ce qui est montré dans cette image.';

    onSubmit?.(textToSend, selectedImage || undefined);
    setMessage('');
    setCharCount(0);
    removeImage();
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [message, selectedImage, disabled, onSubmit, removeImage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    // Plain Enter to submit (Shift+Enter = newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle paste inside the textarea (image paste)
  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) setImage(file);
        return;
      }
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) setImage(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(file);
  };

  const isEmpty = message.trim().length === 0 && !selectedImage;
  const canSubmit = !isEmpty && !disabled;

  return (
    <div
      className={`mx-4 mb-4 rounded-2xl border-2 px-4 pt-3 pb-2 transition-all duration-200 ${
        isDragging
          ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
          : theme === 'dark'
          ? 'border-gray-700 bg-[#1a1a1a]'
          : 'border-gray-200 bg-white shadow-sm'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay hint */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none z-10">
          <span className="text-green-600 font-semibold text-lg">📷 Drop image here</span>
        </div>
      )}

      {/* Image preview */}
      {selectedImage && imagePreviewUrl && (
        <div className="mb-2 flex items-start gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
          <img
            src={imagePreviewUrl}
            alt="Selected"
            className="h-16 w-16 object-cover rounded-lg flex-shrink-0 border border-blue-300"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {selectedImage.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {(selectedImage.size / 1024 / 1024).toFixed(2)} MB · Image will be analyzed
            </p>
            {message.trim() === '' && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 italic">
                ✓ Will solve image automatically — you can also add a specific question
              </p>
            )}
          </div>
          <button
            onClick={removeImage}
            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 text-lg leading-none"
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* Textarea */}
      <TextareaAutosize
        ref={textareaRef}
        autoFocus
        minRows={1}
        maxRows={6}
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handleTextareaPaste}
        placeholder={
          selectedImage
            ? 'Add a specific question about the image, or press Enter to solve it...'
            : placeholder || 'Ask a math or physics question... (paste or drop an image 📷)'
        }
        disabled={disabled}
        className={`w-full resize-none bg-transparent text-sm outline-none transition-colors ${
          theme === 'dark'
            ? 'text-white placeholder-gray-500'
            : 'text-gray-800 placeholder-gray-400'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Bottom toolbar */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Char count */}
          <span
            className={`text-xs transition-colors ${
              charCount > MAX_CHAR_LIMIT * 0.9
                ? 'text-red-500'
                : theme === 'dark'
                ? 'text-gray-500'
                : 'text-gray-400'
            }`}
          >
            {charCount}/{MAX_CHAR_LIMIT}
          </span>

          {/* Clear text */}
          {message.length > 0 && (
            <button
              onClick={() => { setMessage(''); setCharCount(0); }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all duration-200 ${
                theme === 'dark'
                  ? 'hover:bg-gray-800 text-gray-500 hover:text-gray-300'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
              title="Clear text"
            >
              <span>⌫</span>
            </button>
          )}

          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all duration-200 ${
              selectedImage
                ? 'text-green-600 dark:text-green-400 font-semibold'
                : theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-500 hover:text-gray-300'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            title="Upload image (or paste / drag & drop)"
          >
            <span>📷</span>
            <span className="hidden sm:inline">
              {selectedImage ? 'Image attached' : 'Image'}
            </span>
          </button>

          {/* Scroll hint button — keeps your existing down-arrow */}
          <button
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-500'
                : 'hover:bg-gray-100 text-gray-400'
            }`}
            title="Scroll to bottom"
            onClick={() => {
              const sc = document.querySelector('.scrollbar-thin');
              if (sc) (sc as HTMLElement).scrollTop = (sc as HTMLElement).scrollHeight;
            }}
          >
            <img src={downArrow} className="h-3 w-3" alt="scroll" />
          </button>
        </div>

        {/* Submit / Stop button */}
        <button
          onClick={isStreaming ? onStop : handleSubmit}
          disabled={isStreaming ? false : !canSubmit}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 ${
            isStreaming
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg'
              : !canSubmit
              ? theme === 'dark'
                ? 'bg-gray-700 cursor-not-allowed opacity-40'
                : 'bg-gray-200 cursor-not-allowed opacity-40'
              : 'bg-gradient-to-r from-[#008751] to-[#00b876] hover:shadow-lg'
          }`}
          title={isStreaming ? 'Stop generation' : 'Send (Enter)'}
        >
          {isStreaming ? (
            <span className="text-white text-sm">⏹</span>
          ) : (
            <img
              src={arrowIcon}
              className={`h-4 w-4 ${!canSubmit ? 'opacity-40' : 'brightness-0 invert'}`}
              alt="send"
            />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;