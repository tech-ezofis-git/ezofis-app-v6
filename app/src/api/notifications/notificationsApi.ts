import { axiosV6 } from '../axios'

export interface ApiActor {
  email: string
  name: string
}

export interface ApiNotification {
  category: string
  createdAtUtc: string
  id: string
  isRead: boolean
  message: string
  severity: 'info' | 'success' | 'warning' | 'error'
  title: string
  actor?: ApiActor
  data?: ApiNotificationData
  target?: ApiNotificationTarget
}

export interface ApiNotificationData {
  [key: string]: any
  processId?: string
  transactionId?: string
  workflowId?: string
  workflowName?: string
}

export interface ApiNotificationTarget {
  route: string
  search?: Record<string, string>
}

export const notificationsApi = {
  deleteNotification: async (id: string | number): Promise<void> => {
    await axiosV6.delete(`/notifications/${id}`)
  },

  markNotificationAsRead: async (
    id: string | number,
  ): Promise<{ id: string; isRead: boolean }> => {
    const { data } = await axiosV6.patch<{ id: string; isRead: boolean }>(
      `/notifications/${id}/read`,
    )
    return data
  },

  getNotifications: async (category?: string): Promise<ApiNotification[]> => {
    const params = category ? { category } : {}
    const { data } = await axiosV6.get<ApiNotification[]>('/notifications', {
      params,
    })
    return data
  },
}

export default notificationsApi
