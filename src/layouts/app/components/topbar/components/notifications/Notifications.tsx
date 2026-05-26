import { useState } from 'react'
import Menu from '@/components/base/menu/Menu'
import PageEmptyState from '@/components/common/PageEmptyState'
import Header from './components/header/Header'
import NotificationsTrigger from './components/NotificationsTrigger'

const Notifications = () => {
  const [isNotificationsOpened, setIsNotificationsOpened] = useState(false)

  const handleOnChange = (isOpened: boolean) => {
    return setIsNotificationsOpened(isOpened)
  }

  return (
    <Menu
      closeOnItemClick={false}
      position='bottom-end'
      width={360}
      target={
        <NotificationsTrigger isNotificationsOpened={isNotificationsOpened} />
      }
      onChange={handleOnChange}
    >
      <Header />
      <PageEmptyState
        containerClassName='h-96 px-10'
        description="You're all caught up. New notifications will appear here."
        fill={false}
        icon='lucide:bell-off'
        title='No notifications'
      />
    </Menu>
  )
}

Notifications.displayName = 'Notifications'
export default Notifications
