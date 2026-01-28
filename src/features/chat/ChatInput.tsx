import historyIcon from '../../data/icons/hugeicons_clock-05.png';
import arrowIcon from '../../data/icons/fluent-mdl2_up.png';
import downArrow from '../../data/icons/mingcute_down-line.png';
import TextareaAutosize from 'react-textarea-autosize';
import { useTheme } from '../../theme/useTheme';

const ChatInput = () => {
  const { theme } = useTheme();
  return (
    <div 
      className={
        `m-5 rounded-2xl shadow-sm px-4 py-3 
        ${theme === 'dark'
         ?'bg-black'
         :'bg-white'} `}>
      <TextareaAutosize
        minRows={1}
        maxRows={6}
        placeholder="Comment puis-je vous aider aujourd'hui ?"
        className={`w-full resize-none bg-transparent text-sm outline-none ${theme === 'dark'? 'placeholder-[#FFFFFF80]':'placeholder-[#00000081]'}`}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="flex items-center rounded-md px-2 hover:bg-gray-100">
            <span className="text-2xl font-light text-[#008751]">+</span>
          </button>
          <button className='flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100'>
            <img
              src={historyIcon}
              alt="History"
              className="h-5 w-5"
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">
            <span>Model</span>
            <img src={downArrow} className="h-3 w-3" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md bg-[#008751] hover:bg-[#007a45b0]">
            <img src={arrowIcon} className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChatInput;