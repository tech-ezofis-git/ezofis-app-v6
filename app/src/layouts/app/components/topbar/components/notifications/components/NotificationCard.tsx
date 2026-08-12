import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import type { NotificationItem, NotificationType } from '../types'

interface Props {
  notification: NotificationItem
  onMarkAsRead?: (id: string) => void
  onItemClick?: (notification: NotificationItem) => void
}

const typeStyles: Record<NotificationType, { icon: string; style: string }> = {
  info: { icon: 'lucide:info', style: 'text-blue-11 bg-blue-2 border border-blue-4' },
  success: { icon: 'lucide:check-circle-2', style: 'text-green-11 bg-green-2 border border-green-4' },
  warning: { icon: 'lucide:alert-triangle', style: 'text-orange-11 bg-orange-2 border border-orange-4' },
  error: { icon: 'lucide:alert-circle', style: 'text-red-11 bg-red-2 border border-red-4' },
  workflow: { icon: 'lucide:git-pull-request', style: 'text-purple-11 bg-purple-2 border border-purple-4' },
}

const NotificationCard = ({ notification, onMarkAsRead, onItemClick }: Props) => {
  const { t } = useLingui()
  const { icon, style } = typeStyles[notification.type] || typeStyles.info

  return (
    <div
      className={`group relative flex items-start gap-3 border-b border-gray-3 p-3.5 transition-colors cursor-pointer hover:bg-gray-2 ${
        !notification.isRead ? 'bg-primary-1/60' : 'bg-surface-primary'
      }`}
      onClick={() => onItemClick?.(notification)}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style}`}>
        <Icon className='h-4 w-4' name={icon} />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center justify-between gap-2'>
          <p className={`text-13 font-semibold truncate ${!notification.isRead ? 'text-gray-12' : 'text-gray-11'}`}>
            {notification.title}
          </p>
          <span className='text-11 text-gray-9 shrink-0 font-medium'>{notification.timestamp}</span>
        </div>
        <p className='mt-1 text-12 text-gray-10 line-clamp-2 leading-relaxed'>
          {notification.message}
        </p>
      </div>

      {!notification.isRead && (
        <button
          className='h-2 w-2 rounded-full bg-primary-9 shrink-0 self-center hover:scale-125 transition-transform'
          title={t`Mark as read`}
          onClick={(e) => {
            e.stopPropagation()
            onMarkAsRead?.(notification.id)
          }}
        />
      )}
    </div>
  )
}

NotificationCard.displayName = 'NotificationCard'
export default NotificationCard
