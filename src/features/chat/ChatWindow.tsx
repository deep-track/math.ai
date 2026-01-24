import { ThemeProvider } from "../../theme/ThemeProvider";
import { useTheme } from "../../theme/useTheme"
import ChatInput from "./ChatInput"
import ChatMessage from "./ChatMessage"

const ChatWindow = () => {
  const { theme } = useTheme();
  return (
    // <div className="bg-linear-to-t from-[#008751] to-[#FFFFFF]">
    //   <ChatInput />
    // </div>
    <main 
      className = {`
      flex flex-1 flex-col 
      ${theme === 'dark'
      ? 'bg-linear-to-b from-[#0A0A0A] via-[#063D2B] to-[#0A7A4A]'
      : 'bg-linear-to-b from-white via-[#e5f6ef] to-[#008751]'}
      `}>
      <ThemeProvider>
      <div className="flex-1 overflow-y-auto px-6 py-6 ">
        <ChatMessage />
      </div>
        <ChatInput />
      </ThemeProvider>
    </main>
  )
}

export default ChatWindow