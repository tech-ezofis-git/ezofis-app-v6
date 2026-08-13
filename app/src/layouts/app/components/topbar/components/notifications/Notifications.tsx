import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Menu from '@/components/base/menu/Menu'
import PageEmptyState from '@/components/common/PageEmptyState'
import type { NotificationItem } from './types'
import Header from './components/header/Header'
import NotificationCard from './components/NotificationCard'
import NotificationsTrigger from './components/NotificationsTrigger'
import { useNotifications } from './hooks/useNotifications'
import { navigateToNotificationTarget } from './utils/navigateToTarget'

const Notifications = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [isNotificationsOpened, setIsNotificationsOpened] = useState(false)

  const {
    activeTab,
    clearAll,
    data: filteredNotifications,
    markAllRead,
    markAsRead,
    searchQuery,
    unreadCount,
    setActiveTab,
    setSearchQuery,
  } = useNotifications()

  const handleItemClick = (notification: NotificationItem) => {
    markAsRead(notification.id)
    navigateToNotificationTarget(navigate, notification.target)
    setIsNotificationsOpened(false)
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
        searchQuery={searchQuery}
        unreadCount={unreadCount}
        onClearAll={clearAll}
        onMarkAllRead={markAllRead}
        onSearchChange={setSearchQuery}
        onTabChange={setActiveTab}
      />

      <div className='max-h-96 divide-y divide-gray-3 overflow-y-auto bg-surface-primary'>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onItemClick={handleItemClick}
              onMarkAsRead={markAsRead}
            />
          ))
        ) : (
          <PageEmptyState
            containerClassName='h-64 px-10'
            description="You're all caught up. New notifications will appear here."
            fill={true}
            icon='lucide:bell-off'
            title={t`No notifications`}
          />
        )}
      </div>
    </Menu>
  )
}

Notifications.displayName = 'Notifications'
export default Notifications
