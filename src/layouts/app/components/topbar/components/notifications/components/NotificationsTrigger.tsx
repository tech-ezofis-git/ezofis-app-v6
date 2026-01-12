import IconButton from '@/components/base/button/IconButton'
import Indicator from '@/components/base/Indicator'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  isNotificationsOpened?: boolean
}

const NotificationsTrigger = ({ isNotificationsOpened = false }: Props) => {
  return (
    <Tooltip
      content='Notifications'
      disabled={isNotificationsOpened}
      openDelay={500}
      position='bottom'
    >
      <Indicator offset={9} animate>
        <IconButton
          ariaLabel='notifications'
          color='gray'
          icon='lucide:bell'
          variant='ghost'
        />
      </Indicator>
    </Tooltip>
  )
}

NotificationsTrigger.displayName = 'NotificationsTrigger'
export default NotificationsTrigger
