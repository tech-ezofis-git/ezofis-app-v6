import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'
import aiChatStore from '@/layouts/app/store/aiChatBarStore'

const AskAI = () => {
  const toggleAIChat = aiChatStore((state) => state.toggleAIChat)

  return (
    <Tooltip content='Ask AI' openDelay={TOOLTIP_DELAY}>
      <IconButton
        ariaLabel='Ask AI'
        className='transition-none'
        color='gray'
        icon='tabler:flare'
        iconClass='size-[18.75px]'
        variant='ghost'
        onClick={toggleAIChat}
      />
    </Tooltip>
  )
}

AskAI.displayName = 'AskAI'
export default AskAI
