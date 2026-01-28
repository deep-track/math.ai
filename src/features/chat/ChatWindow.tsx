import ChatMessage from "./ChatMessage"

const ChatWindow = () => {
  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
      <ChatMessage />
    </div>
  )
}

export default ChatWindow