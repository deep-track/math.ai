import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useTheme } from '../../theme/useTheme';
import DiscussionsIcon from '../../data/icons/Vector.png'
import SidePanelDrawer from '../../data/icons/wordpress_drawer-left.png'
import { getConversations } from '../../services/api';
import { getTranslation } from '../../utils/translations';
import SettingsModal from '../../components/SettingsModal';

interface SidebarProps {
  onNewChat?: () => void;
  onSelectConversation?: (id: string) => void;
  currentConversationId?: string;
}

const Sidebar = ({ onNewChat }: SidebarProps) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  // Fetch conversations when component mounts or user changes
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        await getConversations();
        // Handle response (for now just a stub)
      } catch (err) {
        // Silently fail - don't show error to user, just show empty state
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleNewChat = () => {
    onNewChat?.();
  };

  return (
    <aside className={`flex bg-[#1f2228] text-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-20' : 'w-64'
    } px-4 py-5 border-r border-gray-700 h-full overflow-y-auto`}>
      
      <div className="mb-6 flex items-center justify-between">
        {!isCollapsed && <h1 className="text-lg font-semibold text-white">MathAI</h1>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className='hover:bg-white/10 px-2 py-2 rounded-md transition-all duration-200 transform hover:scale-110'
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <img src={SidePanelDrawer} alt="Toggle sidebar" className="h-5 w-5 opacity-80" />
        </button>
      </div>

      {/* starting new chat */}
      <button 
        onClick={handleNewChat}
        className="mb-4 flex items-center gap-3 rounded-md px-2 py-2 text-sm text-white hover:bg-white/10 transition-all duration-200 group w-full animate-in fade-in duration-300"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#008751] to-[#00b876] text-white text-lg font-bold group-hover:scale-110 transition-transform">
          +
        </span>
        {!isCollapsed && <span>{getTranslation('newConversation')}</span>}
      </button>

      {/* discussion panel */}
      {!isCollapsed && (
        <div className="mb-4">
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md cursor-pointer transition-all duration-200 group animate-in fade-in duration-500">
            <img src={DiscussionsIcon} className="h-4 w-4 opacity-80 group-hover:scale-110 transition-transform" />
            {getTranslation('discussions')}
          </div>
        </div>
      )}

      {/* previous chats */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {!isCollapsed && (
          <>
            <p className="mb-2 text-xs uppercase text-gray-400 px-2 font-semibold">
              {getTranslation('recent')}
            </p>

            {loading && (
              <div className="px-2 py-3 text-xs text-gray-400">
                {getTranslation('loading')}
              </div>
            )}

            {!loading && (
              <div className="px-2 py-3 text-xs text-gray-400">
                {getTranslation('noConversations')}
              </div>
            )}

            <div className="space-y-1">
              {/* Conversations would be mapped here if we had them */}
            </div>
          </>
        )}
      </div>

      {/* user profile and logout */}
      <div className={`mt-4 space-y-3 border-t border-gray-700 pt-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {!isCollapsed && user && (
          <div className="px-2 py-2">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{getTranslation('connected')}</p>
            <p className="text-sm text-gray-300 truncate">{user.emailAddresses[0]?.emailAddress}</p>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className={`w-full text-sm text-gray-300 hover:text-white transition-colors py-2 rounded hover:bg-white/10 ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
          title={getTranslation('logout')}
        >
          {isCollapsed ? '→' : getTranslation('logout')}
        </button>
        {!isCollapsed && (
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full text-xs text-gray-400 hover:text-gray-200 transition-colors py-1 rounded hover:bg-white/5"
          >
            {getTranslation('settings')}
          </button>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        theme={theme}
      />
    </aside>
  )
}

export default Sidebar;