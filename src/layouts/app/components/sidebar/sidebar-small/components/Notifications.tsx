import IconButton from '@/components/base/button/IconButton'
import Indicator from '@/components/base/Indicator'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'

const Notifications = () => {
  return (
    <Tooltip content='Notifications' openDelay={TOOLTIP_DELAY} position='right'>
      <Indicator offset={9} animate>
        <IconButton
          ariaLabel='notifications'
          color='gray'
          icon='tabler:bell'
          variant='ghost'
        />
      </Indicator>
    </Tooltip>
  )
}

export default Notifications
