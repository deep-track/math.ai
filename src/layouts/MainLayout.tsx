import { useCallback, useState } from 'react';
import ChatWindow from "../features/chat/ChatWindow"
import Sidebar from "../features/sidebar/Sidebar"
import { ThemeProvider } from "../theme/ThemeProvider"
import { ChatProvider } from "../contexts/ChatContext"
import ErrorBoundary from "../components/ErrorBoundary"
import CreditsBadge from "../components/CreditsBadge"
import { useClerk, useUser } from "@clerk/clerk-react"

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleNewChat = useCallback(() => {
    // This will trigger a chat reset event
    window.dispatchEvent(new CustomEvent('resetChat'));
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent('loadConversation', { detail: { id } }));
  }, []);

  const _handleLogout = async () => {
    await signOut({ redirectUrl: '/' });
  };

  // Reference so TypeScript doesn't fail on unused local in builds
  // (exposed for debugging / e2e use)
  ;(window as any).__logout_fn = _handleLogout;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ChatProvider>
            {/* Credits indicator fixed top-right (no nav bar) */}
            <div className="fixed top-4 right-4 z-50">
              <CreditsBadge userId={user?.id} />
            </div>

            {/* Mobile menu toggle (small hamburger in top-left) */}
            <div className="fixed top-4 left-4 z-50 md:hidden">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className='hover:bg-slate-700/50 px-2 py-2 rounded-md transition-all duration-200 bg-slate-800 text-white'
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <div className="flex h-screen w-screen overflow-hidden bg-slate-50 pt-0 md:pt-0">
              {/* Sidebar - desktop: always visible, mobile: toggle */}
              <div className={`${
                sidebarOpen 
                  ? 'fixed left-0 top-4 h-[calc(100%-32px)] z-40 w-64' 
                  : 'hidden md:relative md:flex'
              } md:relative md:flex md:top-0 md:h-screen md:z-10 md:w-auto`}>
                <Sidebar onNewChat={handleNewChat} onSelectConversation={handleSelectConversation} />
              </div>

              {/* Main chat area */}
              <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
              <ChatWindow />
            </div>
          </div>
        </ChatProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default MainLayout