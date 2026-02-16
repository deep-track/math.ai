import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../features/sidebar/Sidebar';
import { ThemeProvider } from '../theme/ThemeProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import CreditsBadge from '../components/CreditsBadge';
import { useUser } from '@clerk/clerk-react';
import AdminDashboard from '../features/admin/AdminDashboard';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  const handleNewChat = useCallback(() => {
    navigate('/home');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('resetChat'));
    }, 0);
  }, [navigate]);

  const handleSelectConversation = useCallback((id: string) => {
    navigate('/home');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('loadConversation', { detail: { id } }));
    }, 0);
  }, [navigate]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="fixed top-4 right-4 z-50">
          <CreditsBadge userId={user?.id} />
        </div>

        <div className="fixed top-4 left-4 z-50 md:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-slate-700/50 px-2 py-2 rounded-md transition-all duration-200 bg-slate-800 text-white"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 pt-0 md:pt-0">
          <div
            className={`${
              sidebarOpen
                ? 'fixed left-0 top-4 h-[calc(100%-32px)] z-40 w-64'
                : 'hidden md:relative md:flex'
            } md:relative md:flex md:top-0 md:h-screen md:z-10 md:w-auto`}
          >
            <Sidebar onNewChat={handleNewChat} onSelectConversation={handleSelectConversation} />
          </div>

          <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
            <AdminDashboard />
          </div>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default AdminLayout;