import { useMemo, useState } from 'react'
import type { NotificationItem } from '../types'
import { mockNotifications } from '../mockData'

export function useNotifications() {
  const [notificationsList, setNotificationsList] =
    useState<NotificationItem[]>(mockNotifications)
  const [activeTab, setActiveTab] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const unreadCount = notificationsList.filter((n) => !n.isRead).length

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return notificationsList.filter((item) => {
      if (activeTab === 'Unread' && item.isRead) return false
      if (activeTab === 'Read' && !item.isRead) return false

      if (!query) return true
      return (
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query)
      )
    })
  }, [notificationsList, activeTab, searchQuery])

  const markAsRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    )
  }

  const markAllRead = () => {
    setNotificationsList((prev) =>
      prev.map((item) => ({ ...item, isRead: true })),
    )
  }

  const clearAll = () => {
    setNotificationsList([])
  }

  return {
    activeTab,
    clearAll,
    data: filteredNotifications,
    markAllRead,
    markAsRead,
    searchQuery,
    unreadCount,
    setActiveTab,
    setSearchQuery,
  }
}
