import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'

const ChatHistory = () => {
  return (
    <Tooltip content='Chat History' openDelay={TOOLTIP_DELAY}>
      <IconButton
        ariaLabel='Chat History'
        color='gray'
        icon='tabler:history'
        variant='ghost'
      />
    </Tooltip>
  )
}

ChatHistory.displayName = 'ChatHistory'
export default ChatHistory
