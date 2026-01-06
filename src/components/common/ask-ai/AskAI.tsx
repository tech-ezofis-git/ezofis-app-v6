import { AnimatePresence, motion } from 'motion/react'
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

  return (
    <>
      <IconButton
        className='fixed right-6 bottom-6 size-10 rounded-full'
        icon='mingcute:ai-fill'
        iconClass='size-5'
        onClick={open}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className='fixed right-2 bottom-2 z-200 w-96 origin-bottom-right rounded border border-gray-3 bg-surface shadow-md'
            exit={{ opacity: 0, scale: 0 }}
            initial={{ opacity: 0, scale: 0 }}
            transition={{ bounce: 0, duration: 0.2 }}
          >
            <OverlayHeader className='pr-2' title='Ask AI' onClose={close} />
            <ScrollArea height='calc(100dvh - 120px)'>
              <div className='flex h-full flex-col justify-end'>
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
                <PromptInput />
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

AskAI.displayName = 'AskAI'
export default AskAI
