import ChatWindow from "../features/chat/ChatWindow"
import Sidebar from "../features/sidebar/Sidebar"
import { ThemeProvider } from "../theme/ThemeProvider"

const MainLayout = () => {
  return (
     <div className="flex h-screen">
      <Sidebar />
      <ThemeProvider>
        <ChatWindow />
      </ThemeProvider>
    </div>
  )
}

export default MainLayout