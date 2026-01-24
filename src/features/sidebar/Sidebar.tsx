import DiscussionsIcon from '../../data/icons/Vector.png'
import SidePanelDrawer from '../../data/icons/wordpress_drawer-left.png'
import ProfileIcon from '../../data/icons/Group 27.png'

const Sidebar = () => {
  return (
    <aside className="w-64 bg-[#1f2228] text-gray-200 flex flex-col px-4 py-5">
      
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">MathAI</h1>
        <button className='hover:bg-white/10 px-2 py-2 rounded-md'>
          <img src={SidePanelDrawer} alt="Toggle sidebar" className="h-5 w-5 opacity-80" />
        </button>
      </div>

      {/* starting new chat */}
      <button className="mb-4 flex items-center gap-3 rounded-md px-2 py-2 text-sm text-white hover:bg-white/10">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#008751] text-black text-lg">
          +
        </span>
        Nouvelle conversations
      </button>

      {/* discussion panel */}
      <div className="mb-4">
        <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md cursor-pointer">
          <img src={DiscussionsIcon} className="h-4 w-4 opacity-80" />
          Discussions
        </div>
      </div>

      {/* previous chats */}
      <div className="flex-1 overflow-y-auto">
        <p className="mb-2  text-xs uppercase text-gray-400">
          Récent
        </p>

        <div className="rounded-md px-2 py-2 text-sm hover:bg-white/10 cursor-pointer">
          Équation quadratique
        </div>
      </div>

      {/* user profile */}
      <div className="mt-4 flex items-center gap-3 p-3 rounded-md hover:bg-white/10 cursor-pointer">
        <div className="flex items-center justify-center rounded-full">
          <img src={ProfileIcon} alt="Profile" className="h-8 w-8" />
        </div>
        <span className="text-xl text-gray-300">John Doe</span>
      </div>
    </aside>
  )
}

export default Sidebar
