import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import notificationsApi from './notificationsApi'

export const NOTIFICATIONS_QUERY_KEY = ['notifications']

export const getNotificationsQueryOptions = (category?: string) =>
  queryOptions({
    queryKey: category
      ? [...NOTIFICATIONS_QUERY_KEY, category]
      : NOTIFICATIONS_QUERY_KEY,
    refetchInterval: 60000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: () => notificationsApi.getNotifications(category),
  })

export const useMarkNotificationAsReadMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) =>
      notificationsApi.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })
}

export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) =>
      notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })
}
