import { axiosV6 } from '../axios'

export interface ApiActor {
  name: string
  email: string
}

export interface ApiNotificationTarget {
  route: string
  search?: Record<string, string>
}

export interface ApiNotificationData {
  processId?: string
  transactionId?: string
  workflowId?: string
  workflowName?: string
  [key: string]: any
}

export interface ApiNotification {
  id: string
  actor?: ApiActor
  category: string
  createdAtUtc: string
  data?: ApiNotificationData
  isRead: boolean
  message: string
  severity: 'info' | 'success' | 'warning' | 'error'
  target?: ApiNotificationTarget
  title: string
}

export const notificationsApi = {
  getNotifications: async (category?: string): Promise<ApiNotification[]> => {
    const params = category ? { category } : {}
    const { data } = await axiosV6.get<ApiNotification[]>('/notifications', { params })
    return data
  },

  markNotificationAsRead: async (id: string | number): Promise<{ id: string; isRead: boolean }> => {
    const { data } = await axiosV6.patch<{ id: string; isRead: boolean }>(`/notifications/${id}/read`)
    return data
  },

  deleteNotification: async (id: string | number): Promise<void> => {
    await axiosV6.delete(`/notifications/${id}`)
  },
}

export default notificationsApi
