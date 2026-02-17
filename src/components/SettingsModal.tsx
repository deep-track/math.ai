import { useState, useEffect } from 'react';
import { getLanguage, getTranslation } from '../utils/translations';
import { useLanguage, type AppLanguage } from '../hooks/useLanguage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const SettingsModal = ({ isOpen, onClose, theme }: SettingsModalProps) => {
  const appLanguage = useLanguage();
  const [language, setLanguage] = useState<AppLanguage>(getLanguage());
  const [fontSize, setFontSize] = useState('medium');

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLanguage = (localStorage.getItem('app-language') as AppLanguage) || 'fr';
    const savedFontSize = localStorage.getItem('app-font-size') || 'medium';
    
    setLanguage(savedLanguage);
    setFontSize(savedFontSize);
    
    // Apply font size immediately
    applyFontSize(savedFontSize);
  }, []);

  useEffect(() => {
    if (appLanguage && appLanguage !== language) {
      setLanguage(appLanguage);
    }
  }, [appLanguage, language]);

  const applyFontSize = (size: string) => {
    const fontSizes = {
      small: '12px',
      medium: '14px',
      large: '16px'
    };
    
    const rootFontSize = fontSizes[size as keyof typeof fontSizes] || '14px';
    document.documentElement.style.fontSize = rootFontSize;
  };

  const handleLanguageChange = (newLanguage: AppLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('app-language', newLanguage);
    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: newLanguage }));
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('app-font-size', size);
    applyFontSize(size);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        <div
          className={`rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-300 ${
            theme === 'dark'
              ? 'bg-[#1a1a1a] border border-gray-800 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{getTranslation('settingsTitle', appLanguage)}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          {/* Settings Content */}
          <div className="space-y-6">
            {/* Theme Setting - Display Only */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">{getTranslation('themeLabel', appLanguage)}</label>
              <div
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-800'
                    : 'bg-gray-100'
                }`}
              >
                <span className="text-sm">
                  {theme === 'dark' ? getTranslation('modeDark', appLanguage) : getTranslation('modeLight', appLanguage)}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-[#008751] to-[#00b876] text-white">
                  {getTranslation('activeLabel', appLanguage)}
                </span>
              </div>
            </div>

            {/* Language Setting */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">{getTranslation('languageLabel', appLanguage)}</label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as AppLanguage)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:border-green-500`}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {getTranslation('selectedLabel', appLanguage)}: {language.toUpperCase()}
              </p>
            </div>

            {/* Font Size Setting */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">{getTranslation('fontSizeLabel', appLanguage)}</label>
              <div className="flex gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFontSizeChange(size)}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                      fontSize === size
                        ? 'bg-gradient-to-r from-[#008751] to-[#00b876] text-white shadow-lg scale-105'
                        : theme === 'dark'
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {size === 'small' ? 'A' : size === 'medium' ? 'A' : 'A'}
                    <span className="ml-1 text-xs">
                      {size === 'small'
                        ? getTranslation('fontSizeSmall', appLanguage)
                        : size === 'medium'
                        ? getTranslation('fontSizeMedium', appLanguage)
                        : getTranslation('fontSizeLarge', appLanguage)}
                    </span>
                  </button>
                ))}
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {getTranslation('selectedLabel', appLanguage)}: {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
              </p>
            </div>

            {/* About Section */}
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <h3 className="font-semibold mb-2 text-sm">{getTranslation('aboutTitle', appLanguage)}</h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {getTranslation('versionLabel', appLanguage)}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {getTranslation('appTagline', appLanguage)}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              {getTranslation('closeLabel', appLanguage)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsModal;
