import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'

const NewChat = () => {
  return (
    <Tooltip content='New Chat' openDelay={TOOLTIP_DELAY}>
      <IconButton
        ariaLabel='New Chat'
        color='gray'
        icon='tabler:plus'
        iconClass='size-5 mb-0.5'
        variant='ghost'
      />
    </Tooltip>
  )
}

NewChat.displayName = 'NewChat'
export default NewChat
