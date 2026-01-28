import { useTheme } from "../../theme/useTheme"
import ChatMessage from "./ChatMessage"

const ChatWindow = () => {
  const { theme } = useTheme();
  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
      <ChatMessage />
    </div>
  )
}

export default ChatWindow