import { useTheme } from "../../theme/useTheme";

type ChatMessageType = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const fakeChatMessages: ChatMessageType[] = [
  {
    id: 1,
    role: "user",
    content: "Can you explain what a derivative is?"
  },
  {
    id: 2,
    role: "assistant",
    content:
      "A derivative measures how a function changes as its input changes.\n\nMore formally, the derivative of a function f(x) at a point x represents the rate of change of f with respect to x. It can be interpreted as the slope of the tangent line to the curve at that point.\n\nFor example, if f(x) = x², its derivative is f'(x) = 2x. This means that when x = 3, the function is increasing at a rate of 6."
  },
  {
    id: 3,
    role: "user",
    content: "What does it mean geometrically?"
  },
  {
    id: 4,
    role: "assistant",
    content:
      "Geometrically, a derivative represents the slope of the tangent line to a curve at a given point.\n\nImagine zooming in on a curve at a specific point. As you zoom further, the curve begins to look like a straight line. The slope of that line is the derivative at that point.\n\nThis is why derivatives are so useful in physics and engineering — they describe velocity, acceleration, and many other rates of change."
  },
  {
    id: 5,
    role: "user",
    content: "Can you give a real-world example?"
  },
  {
    id: 6,
    role: "assistant",
    content:
      "A classic real-world example is speed.\n\nIf you know your position over time, the derivative of position with respect to time gives you velocity. If your position is measured in meters and time in seconds, the derivative tells you how fast you're moving at any instant.\n\nSimilarly, the derivative of velocity gives acceleration."
  }
];


const ChatMessage = () => {
  const userName: string = "John"; //placeholder username
  // const userChatInput: string = "User message"; //placeholder for user message
  // const AI_response: string = "AI Response"; //placeholder for AI response
  const isUSerChatting: boolean = false;
  const {theme} = useTheme();
  return (
    <>
    {isUSerChatting ?
      // user UI after loading chats or when chatting
      <div className="flex-1 overflow-y-auto">
        {fakeChatMessages.map((message) => (
          <div key={message.id} className="w-full py-6">
            <div
              className={`mx-auto flex max-w-6xl px-6 ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`text-sm leading-6 ${
                  message.role === "user"
                    ? "max-w-[50%] rounded-2xl bg-green-400 px-4 py-3 text-gray-900"
                    : "min-w-[70%] max-w-full rounded-2xl p-3 bg-gray-200 text-black"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      :
      // user landing page without chats
      <div className="relative h-full flex-1 overflow-y-auto px-6 py-10">
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-xl text-center">
          <h1 className={`text-3xl font-semibold ${theme === 'dark' ? 'text-[#FFFFFF]':'text-gray-800'}`}>
            Bienvenue, {userName}
          </h1>        
        </div>    
      </div>
    }
    </>
  )
}

export default ChatMessage