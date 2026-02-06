import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useTheme } from '../../theme/useTheme';
import DiscussionsIcon from '../../data/icons/Vector.png'
import SidePanelDrawer from '../../data/icons/wordpress_drawer-left.png'
import { getConversations, deleteConversation } from '../../services/api';
import { getTranslation } from '../../utils/translations';
import { useLanguage } from '../../hooks/useLanguage';
import SettingsModal from '../../components/SettingsModal';

interface SidebarProps {
  onNewChat?: () => void;
  onSelectConversation?: (id: string) => void;
  currentConversationId?: string;
}

const Sidebar = ({ onNewChat, onSelectConversation }: SidebarProps) => {
  const { user } = useUser();
  const clerk = useClerk();
  const { signOut } = clerk;
  const { theme } = useTheme();
  const language = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);

  const handleLogout = async () => {
    await signOut();
  };

  // Fetch conversations when component mounts or user changes
  useEffect(() => {
    // Only fetch if we have a user and are not in a render cycle
    if (!user?.id) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        let token: string | undefined;
        if (user?.id) {
          try {
            token = await (clerk as any).getToken?.();
          } catch (e) {
            token = undefined;
          }
        }

        const convs = (await getConversations(user?.id || 'guest', token)) || [];
        // ensure sorted newest -> oldest
        convs.sort((a: any, b: any) => (a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1);
        setConversations(convs);
      } catch (err) {
        // Silently fail - don't show error to user, just show empty state
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    // Use setTimeout to defer the API call until after render
    const timeoutId = setTimeout(fetchConversations, 0);
    const handler = () => fetchConversations();
    window.addEventListener('conversationUpdated', handler);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('conversationUpdated', handler);
    };
  }, [user]);

  const [showMore, setShowMore] = useState(false);

  const handleNewChat = () => {
    onNewChat?.();
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      let token: string | undefined;
      if (user?.id) {
        try {
          token = await (clerk as any).getToken?.();
        } catch (e) {
          token = undefined;
        }
      }

      await deleteConversation(id, user?.id || 'guest', token);
      // Refresh list
      const convs = await getConversations(user?.id || 'guest', token);
      setConversations(convs);
      window.dispatchEvent(new CustomEvent('conversationUpdated'));
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  return (
    <aside className={`flex bg-[#1f2228] text-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-20' : 'w-64'
    } px-4 py-5 border-r border-gray-700 h-full overflow-y-auto`}>
      
      <div className="mb-6 flex items-center justify-between">
        {!isCollapsed && <h1 className="text-lg font-semibold text-white">MathAI</h1>}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="hover:bg-slate-700/50 px-2 py-2 rounded-md transition-all duration-200"
            title={getTranslation('settings', language)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 2.25c.48 0 .87.39.87.87V4.5a7.5 7.5 0 016.06 6.06h.36c.48 0 .87.39.87.87v1.5c0 .48-.39.87-.87.87h-.36a7.5 7.5 0 01-6.06 6.06v.36c0 .48-.39.87-.87.87h-1.5a.87.87 0 01-.87-.87v-.36a7.5 7.5 0 01-6.06-6.06H4.5c-.48 0-.87-.39-.87-.87V11.25c0-.48.39-.87.87-.87h.36A7.5 7.5 0 0110.98 4.5V4.12c0-.48.39-.87.87-.87h-.6z" />
            </svg>
          </button>

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className='hover:bg-slate-700/50 px-2 py-2 rounded-md transition-all duration-200 transform hover:scale-110'
            title={isCollapsed ? getTranslation('expandSidebar', language) : getTranslation('collapseSidebar', language)}
          >
            <img src={SidePanelDrawer} alt="Toggle sidebar" className="h-5 w-5 opacity-80" />
          </button>
        </div>
      </div>

      {/* starting new chat */}
      <button 
        onClick={handleNewChat}
        className="mb-4 flex items-center gap-3 rounded-md px-2 py-2 text-sm text-white hover:bg-slate-700/50 transition-all duration-200 group w-full animate-in fade-in duration-300"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#008751] to-[#00b876] text-white text-lg font-bold group-hover:scale-110 transition-transform">
          +
        </span>
        {!isCollapsed && <span>{getTranslation('newConversation', language)}</span>}
      </button>

      {/* discussion panel */}
      {!isCollapsed && (
        <div className="mb-4">
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:bg-slate-700/50 rounded-md cursor-pointer transition-all duration-200 group animate-in fade-in duration-500">
            <img src={DiscussionsIcon} className="h-4 w-4 opacity-80 group-hover:scale-110 transition-transform" />
            {getTranslation('discussions', language)}
          </div>
        </div>
      )}

      {/* previous chats */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {!isCollapsed && (
          <>
            <p className="mb-2 text-xs uppercase text-gray-400 px-2 font-semibold">
              {getTranslation('recent', language)}
            </p>

            {loading && <div className="px-2 py-3 text-xs text-gray-400">{getTranslation('loading', language)}</div>}

            {!loading && conversations.length === 0 && (
              <div className="px-2 py-3 text-xs text-gray-400">{getTranslation('noConversations', language)}</div>
            )}

            <div className="space-y-1">
              {conversations.slice(0, 3).map((c) => (
                <div key={c.id}
                  onClick={() => onSelectConversation?.(c.id)}
                  className="px-2 py-2 rounded-md hover:bg-slate-700/50 cursor-pointer transition-colors flex items-center justify-between"
                  title={c.title}
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-100">{c.title || getTranslation('defaultChatTitle', language)}</span>
                    <span className="text-xs text-gray-400">{c.messages?.length || 0} {getTranslation('messagesLabel', language)} • {new Date(c.updatedAt || c.createdAt).toLocaleString()}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }} className="text-xs text-red-400 hover:text-red-200 ml-3 px-2 py-1 rounded">{getTranslation('deleteConversation', language)}</button>
                </div>
              ))}

              {conversations.length > 3 && (
                <div className="px-2 py-2">
                  <button onClick={() => setShowMore(!showMore)} className="w-full text-left px-2 py-2 rounded-md bg-slate-800 text-sm text-gray-200 hover:bg-slate-700/50">{showMore ? getTranslation('showLess', language) : getTranslation('showMore', language).replace('{count}', String(conversations.length - 3))}</button>
                  {showMore && (
                    <div className="mt-2 space-y-1">
                      {conversations.slice(3).map((c) => (
                        <div key={c.id}
                          onClick={() => onSelectConversation?.(c.id)}
                          className="px-2 py-2 rounded-md hover:bg-slate-700/50 cursor-pointer transition-colors flex items-center justify-between"
                          title={c.title}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-100">{c.title || getTranslation('defaultChatTitle', language)}</span>
                            <span className="text-xs text-gray-400">{c.messages?.length || 0} {getTranslation('messagesLabel', language)} • {new Date(c.updatedAt || c.createdAt).toLocaleString()}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }} className="text-xs text-red-400 hover:text-red-200 ml-3 px-2 py-1 rounded">{getTranslation('deleteConversation', language)}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* user profile and logout */}
      <div className={`mt-4 space-y-3 border-t border-gray-700 pt-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {!isCollapsed && (
          <div className="px-2 py-2">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{getTranslation('connected', language)}</p>
            <p className="text-sm text-gray-300 truncate">{user ? user.emailAddresses[0]?.emailAddress : localStorage.getItem('guest_name') || getTranslation('guestLabel', language)}</p>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className={`w-full text-sm text-gray-300 hover:text-white transition-colors py-2 rounded hover:bg-slate-700/50 ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
          title={getTranslation('logout', language)}
        >
          {isCollapsed ? '→' : getTranslation('logout', language)}
        </button>
        {!isCollapsed && (
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full text-xs text-gray-400 hover:text-gray-200 transition-colors py-1 rounded hover:bg-slate-700/50"
          >
            {getTranslation('settings', language)}
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