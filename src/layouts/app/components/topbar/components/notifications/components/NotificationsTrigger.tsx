import IconButton from '@/components/base/button/IconButton'
import Indicator from '@/components/base/Indicator'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'

interface Props {
  isNotificationsOpened?: boolean
}

const NotificationsTrigger = ({ isNotificationsOpened = false }: Props) => {
  return (
    <Tooltip
      content='Notifications'
      disabled={isNotificationsOpened}
      openDelay={TOOLTIP_DELAY}
      position='bottom'
    >
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

NotificationsTrigger.displayName = 'NotificationsTrigger'
export default NotificationsTrigger
