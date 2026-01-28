import { useCallback, useState } from 'react';
import ChatWindow from "../features/chat/ChatWindow"
import Sidebar from "../features/sidebar/Sidebar"
import { ThemeProvider } from "../theme/ThemeProvider"
import { ChatProvider } from "../contexts/ChatContext"
import ErrorBoundary from "../components/ErrorBoundary"
import { useClerk } from "@clerk/clerk-react"

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useClerk();

  const handleNewChat = useCallback(() => {
    // This will trigger a chat reset event
    window.dispatchEvent(new CustomEvent('resetChat'));
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ChatProvider>
          <div className="flex h-screen w-screen overflow-hidden">
            {/* Mobile menu button and header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#1f2228] border-b border-gray-700 flex items-center px-4 z-50">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className='hover:bg-white/10 px-2 py-2 rounded-md transition-all duration-200'
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-white ml-3">MathAI</h1>
              <div className="ml-auto flex items-center gap-2">
                <button 
                  onClick={handleLogout}
                  className="hover:bg-white/10 px-2 py-2 rounded-md transition-all duration-200"
                  title="Déconnexion"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div 
                className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30 top-16"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar - desktop: always visible, mobile: toggle */}
            <div className={`${
              sidebarOpen 
                ? 'fixed left-0 top-16 h-[calc(100%-64px)] z-40 w-64' 
                : 'hidden md:relative md:flex'
            } md:relative md:flex md:top-0 md:h-screen md:z-10 md:w-auto`}>
              <Sidebar onNewChat={handleNewChat} />
            </div>

            {/* Chat Window with proper layout */}
            <div className="flex-1 flex flex-col md:pt-0 pt-16 overflow-hidden">
              <ChatWindow />
            </div>
          </div>
        </ChatProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default MainLayout