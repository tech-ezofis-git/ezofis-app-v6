// Removed unused imports
import IconButton from '@/components/base/button/IconButton'
import IconAI from '@/components/base/icon/IconAI'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Title from '@/components/base/Title'
import PromptInput from './components/PromptInput'
import Suggestions from './components/Suggestions'
import useAskAIStore from './stores/useAskAIStore'

const AskAI = () => {
  const isOpen = useAskAIStore((state) => state.isOpen)
  const open = useAskAIStore((state) => state.open)
  const close = useAskAIStore((state) => state.close)

  if (!isOpen) {
    return (
      <IconButton
        className='fixed right-6 bottom-6 size-10 rounded-full z-50 shadow-lg hover:scale-110 active:scale-95 transition-all bg-accent-primary text-white border-0'
        icon='mingcute:ai-fill'
        iconClass='size-5'
        onClick={open}
      />
    )
  }

  return (
    <div className='flex h-full flex-col bg-surface-primary'>
      <OverlayHeader className='pr-2' title='Ask AI' onClose={close} />
      <ScrollArea className='flex-1'>
        <div className='flex h-full flex-col justify-end min-h-[calc(100dvh-64px)]'>
          <div className='px-4'>
            <IconAI className='size-9' />
            <Title
              className='mt-6'
              description='Here are a few things I can do, or ask me anything!'
              level={1}
              title='How can I assist you?'
            />
          </div>
          <Suggestions />
          <div className='mt-auto'>
            <PromptInput />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

AskAI.displayName = 'AskAI'
export default AskAI
