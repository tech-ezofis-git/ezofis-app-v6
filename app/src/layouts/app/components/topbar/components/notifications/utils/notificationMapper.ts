import type { ApiNotification } from '@/api/notifications/notificationsApi'
import type { NotificationItem, NotificationSeverity } from '../types'

export function mapApiNotificationToUi(apiItem: ApiNotification): NotificationItem {
  const category = (apiItem.category || 'request.assigned') as any
  const severity: NotificationSeverity =
    apiItem.category === 'workflow'
      ? 'workflow'
      : (['info', 'success', 'warning', 'error', 'workflow'].includes(apiItem.severity)
          ? (apiItem.severity as NotificationSeverity)
          : 'info')

  const apiData: Record<string, any> = (apiItem.data || {}) as Record<string, any>

  const target = apiItem.target
    ? {
        route: (apiItem.target.route || 'requests') as any,
        search: apiItem.target.search || {},
        params: {},
      }
    : {
        route: 'requests' as const,
        search: {
          processId: apiData.processId || '',
          transactionId: apiData.transactionId || '',
          workflowId: apiData.workflowId || '',
        },
      }

  const actor = apiItem.actor
    ? {
        name: apiItem.actor.name,
        email: apiItem.actor.email,
      }
    : undefined

  const data = {
    processId: apiData.processId || '',
    transactionId: apiData.transactionId || '',
    workflowId: apiData.workflowId || '',
    workflowName: apiData.workflowName || '',
    ...apiData,
  }

  return {
    id: String(apiItem.id),
    title: apiItem.title,
    message: apiItem.message,
    severity,
    category: category.includes('.') ? category : 'request.assigned',
    createdAtUtc: apiItem.createdAtUtc,
    isRead: apiItem.isRead,
    actor,
    target,
    data: data as any,
    _rawCategory: apiItem.category,
  } as NotificationItem
}
