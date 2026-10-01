import type { ApiNotification } from '@/api/notifications/notificationsApi'
import type { NotificationItem, NotificationSeverity } from '../types'

export function mapApiNotificationToUi(
  apiItem: ApiNotification,
): NotificationItem {
  const category = (apiItem.category || 'request.assigned') as any
  const severity: NotificationSeverity =
    apiItem.category === 'workflow'
      ? 'workflow'
      : ['info', 'success', 'warning', 'error', 'workflow'].includes(
            apiItem.severity,
          )
        ? (apiItem.severity as NotificationSeverity)
        : 'info'

  const apiData: Record<string, any> = (apiItem.data || {}) as Record<
    string,
    any
  >

  const target = apiItem.target
    ? {
        params: {},
        route: (apiItem.target.route || 'requests') as any,
        search: apiItem.target.search || {},
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
        email: apiItem.actor.email,
        name: apiItem.actor.name,
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
    _rawCategory: apiItem.category,
    actor,
    category: category.includes('.') ? category : 'request.assigned',
    createdAtUtc: apiItem.createdAtUtc,
    data: data as any,
    id: String(apiItem.id),
    isRead: apiItem.isRead,
    message: apiItem.message,
    severity,
    target,
    title: apiItem.title,
  } as NotificationItem
}
