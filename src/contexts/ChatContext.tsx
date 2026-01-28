import { createContext, useContext, useState } from 'react';

interface ChatContextType {
  resetChat: () => void;
  isResetting: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isResetting, setIsResetting] = useState(false);

  const resetChat = () => {
    setIsResetting(true);
    setTimeout(() => setIsResetting(false), 100);
  };

  return (
    <ChatContext.Provider value={{ resetChat, isResetting }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
