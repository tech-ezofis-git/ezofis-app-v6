import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import Indicator from '@/components/base/Indicator'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  isNotificationsOpened?: boolean
  unreadCount?: number
}

const NotificationsTrigger = ({ isNotificationsOpened = false, unreadCount = 0 }: Props) => {
  const { t } = useLingui()

  return (
    <Tooltip
      content={t`Notifications`}
      disabled={isNotificationsOpened}
      openDelay={500}
      position='bottom'
    >
      <Indicator disabled={unreadCount === 0} offset={9} animate>
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
