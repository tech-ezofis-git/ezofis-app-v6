export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'workflow'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: NotificationType
  timestamp: string
  isRead: boolean
  actionUrl?: string
}
