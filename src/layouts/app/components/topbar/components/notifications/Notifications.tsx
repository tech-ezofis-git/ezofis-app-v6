import { useState } from 'react'
import EmptyState from '@/components/base/EmptyState'
import Menu from '@/components/base/menu/Menu'
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
      <div className='flex h-96 items-center justify-center px-10'>
        <EmptyState
          description="We'll let you know when we've got something new for you."
          icon='lucide:bell'
          title='No Notifications Yet'
        />
      </div>
    </Menu>
  )
}

Notifications.displayName = 'Notifications'
export default Notifications
