import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  getNotificationsQueryOptions,
  useDeleteNotificationMutation,
  useMarkNotificationAsReadMutation,
} from '@/api/notifications/queries'
import Menu from '@/components/base/menu/Menu'
import PageEmptyState from '@/components/common/PageEmptyState'
import requestStore from '@/pages/requests/stores/useRequestStore'
import Header from './components/header/Header'
import NotificationCard from './components/NotificationCard'
import NotificationsTrigger from './components/NotificationsTrigger'
import { mockNotifications } from './mockData'
import type { NotificationItem } from './types'
import { mapApiNotificationToUi } from './utils/notificationMapper'

const Notifications = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [isNotificationsOpened, setIsNotificationsOpened] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data: apiNotifications, isLoading, refetch } = useQuery(getNotificationsQueryOptions())
  const markAsReadMutation = useMarkNotificationAsReadMutation()
  const deleteMutation = useDeleteNotificationMutation()

  const handleMenuChange = (opened: boolean) => {
    setIsNotificationsOpened(opened)
    if (opened) {
      console.log('🔔 [Notifications Menu Opened] Refetching notifications list API...')
      void refetch()
    }
  }

  const notificationsList: NotificationItem[] = useMemo(() => {
    if (apiNotifications && Array.isArray(apiNotifications)) {
      return apiNotifications.map(mapApiNotificationToUi)
    }
    // Fall back to mock data if API is loading or not populated yet during dev
    return mockNotifications
  }, [apiNotifications])

  const unreadCount = notificationsList.filter((n) => !n.isRead).length

  const filteredNotifications = notificationsList.filter((item) => {
    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Unread' && !item.isRead) ||
      (activeTab === 'Read' && item.isRead)

    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllRead = () => {
    notificationsList
      .filter((item) => !item.isRead)
      .forEach((item) => markAsReadMutation.mutate(item.id))
  }

  const handleClearAll = () => {
    notificationsList.forEach((item) => deleteMutation.mutate(item.id))
  }

  const handleItemClick = (notification: NotificationItem) => {
    const rawCategory = (notification as any)._rawCategory || notification.category
    console.log('📌 [Step 1: Notification Clicked]', {
      category: notification.category,
      data: notification.data,
      id: notification.id,
      rawCategory,
      target: notification.target,
      title: notification.title,
    })

    if (!notification.isRead) {
      console.log('📌 [Step 2: Marking Notification Read]', notification.id)
      handleMarkAsRead(notification.id)
    }

    // THIS CUSTOM TICKET OPENING IS ONLY APPLICABLE FOR WORKFLOW CATEGORY
    const isWorkflowCategory =
      rawCategory === 'workflow' ||
      notification.severity === 'workflow' ||
      String(notification.category).startsWith('request.')

    if (isWorkflowCategory) {
      const data = (notification.data || {}) as Record<string, any>
      const search = (notification.target?.search || {}) as Record<string, any>

      const workflowId = search.workflowId || data.workflowId
      const processId = search.processId || data.processId || data.workflowInstanceId
      const transactionId = search.transactionId || data.transactionId

      console.log('📌 [Step 3: Workflow Category Detected]', {
        processId,
        targetRoute: notification.target?.route,
        transactionId,
        workflowId,
      })

      if (workflowId && processId) {
        const payload = {
          processId: String(processId),
          tab: search.tab ? String(search.tab) : 'Details',
          transactionId: transactionId ? String(transactionId) : undefined,
          workflowId: String(workflowId),
        }

        console.log(
          '📌 [Step 4: Setting pendingDeepLink in Zustand requestStore]',
          payload,
        )
        requestStore.getState().setPendingDeepLink(payload)

        console.log(
          '📌 [Step 5: Navigating to /requests cleanly without query params]',
        )
        void navigate({ to: '/requests' })
        setIsNotificationsOpened(false)
        return
      }
    }

    console.log(
      '📌 [Step 3 (Fallback): Other Category or General Route]',
      notification.target?.route,
    )
    if (notification.target?.route) {
      void navigate({ to: `/${notification.target.route}` as any })
      setIsNotificationsOpened(false)
    }
  }

  return (
    <Menu
      closeOnItemClick={false}
      position='bottom-end'
      target={
        <NotificationsTrigger
          isNotificationsOpened={isNotificationsOpened}
          unreadCount={unreadCount}
        />
      }
      width={380}
      onChange={handleMenuChange}
    >
      <Header
        activeTab={activeTab}
        searchQuery={searchQuery}
        unreadCount={unreadCount}
        onClearAll={handleClearAll}
        onMarkAllRead={handleMarkAllRead}
        onSearchChange={setSearchQuery}
        onTabChange={setActiveTab}
      />

      <div className='max-h-96 overflow-y-auto divide-y divide-gray-3 bg-surface-primary'>
        {isLoading ? (
          <div className='p-6 text-center text-13 text-gray-10'>{t`Loading notifications...`}</div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onItemClick={handleItemClick}
              onMarkAsRead={handleMarkAsRead}
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
