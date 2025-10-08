import IconButton from '@/components/base/button/IconButton'
import ChatHistory from './components/ChatHistory'
import NewChat from './components/NewChat'

interface Props {
  onClose: () => void
}

const AIChatHeader = ({ onClose }: Props) => {
  return (
    <div className='flex h-15 items-center justify-between gap-2 border-b border-gray-3 px-2'>
      <div className='flex items-center gap-1.5'>
        <NewChat />
        <h1 className='m-0 font-poppins text-base font-semibold text-gray-13'>
          AI Chat
        </h1>
      </div>

      <div className='flex items-center gap-1'>
        <ChatHistory />
        <IconButton
          color='gray'
          icon='tabler:x'
          variant='ghost'
          onClick={onClose}
        />
      </div>
    </div>
  )
}

AIChatHeader.displayName = 'AIChatHeader'
export default AIChatHeader
