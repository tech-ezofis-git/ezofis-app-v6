import { useViewportSize } from '@mantine/hooks'
import Drawer from '@/components/base/Drawer'
import AIChat from '@/components/common/ai-chat/AIChat'
import { SCREEN_XL } from '@/constants'
import aiChatStore from '../store/aiChatBarStore'

const AIChatBar = () => {
  const { width } = useViewportSize()
  const isAIChatOpen = aiChatStore((state) => state.isAIChatOpen)
  const closeAIChat = aiChatStore((state) => state.closeAIChat)

  if (width >= SCREEN_XL && isAIChatOpen) {
    return (
      <div className='h-svh w-96 border-l border-gray-3'>
        <AIChat onClose={closeAIChat} />
      </div>
    )
  }

  return (
    <Drawer opened={isAIChatOpen} onClose={closeAIChat}>
      <AIChat onClose={closeAIChat} />
    </Drawer>
  )
}

AIChatBar.displayName = 'AIChatBar'
export default AIChatBar
