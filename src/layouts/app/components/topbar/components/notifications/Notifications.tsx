import { useState } from 'react'
import Menu from '@/components/base/menu/Menu'
import PageEmptyState from '@/components/common/PageEmptyState'
import Header from './components/header/Header'
import NotificationCard from './components/NotificationCard'
import NotificationsTrigger from './components/NotificationsTrigger'
import { mockNotifications } from './mockData'
import type { NotificationItem } from './types'

const Notifications = () => {
  const [isNotificationsOpened, setIsNotificationsOpened] = useState(false)
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>(mockNotifications)
  const [activeTab, setActiveTab] = useState<string>('All')

  const unreadCount = notificationsList.filter((n) => !n.isRead).length

  const filteredNotifications = notificationsList.filter((item) => {
    if (activeTab === 'Unread') return !item.isRead
    if (activeTab === 'Read') return item.isRead
    return true
  })

  const handleMarkAsRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    )
  }

  const handleMarkAllRead = () => {
    setNotificationsList((prev) => prev.map((item) => ({ ...item, isRead: true })))
  }

  const handleClearAll = () => {
    setNotificationsList([])
  }

  return (
    <Menu
      closeOnItemClick={false}
      position='bottom-end'
      width={380}
      target={
        <NotificationsTrigger
          isNotificationsOpened={isNotificationsOpened}
          unreadCount={unreadCount}
        />
      }
      onChange={setIsNotificationsOpened}
    >
      <Header
        activeTab={activeTab}
        unreadCount={unreadCount}
        onClearAll={handleClearAll}
        onMarkAllRead={handleMarkAllRead}
        onTabChange={setActiveTab}
      />

      <div className='max-h-96 overflow-y-auto divide-y divide-gray-3 bg-surface-primary'>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))
        ) : (
          <PageEmptyState
            containerClassName='h-64 px-10'
            description="You're all caught up. New notifications will appear here."
            fill={true}
            icon='lucide:bell-off'
            title='No notifications'
          />
        )}
      </div>
    </Menu>
  )
}

Notifications.displayName = 'Notifications'
export default Notifications
