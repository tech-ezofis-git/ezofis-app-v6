import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import type { NotificationItem, NotificationSeverity } from '../types'
import { formatRelativeTime } from '../utils/formatRelativeTime'

interface Props {
  notification: NotificationItem
  onItemClick?: (notification: NotificationItem) => void
  onMarkAsRead?: (id: string) => void
}

const severityStyles: Record<
  NotificationSeverity,
  { icon: string; style: string }
> = {
  error: {
    icon: 'lucide:alert-circle',
    style: 'text-red-11 bg-red-2 border border-red-4',
  },
  info: {
    icon: 'lucide:info',
    style: 'text-blue-11 bg-blue-2 border border-blue-4',
  },
  success: {
    icon: 'lucide:check-circle-2',
    style: 'text-green-11 bg-green-2 border border-green-4',
  },
  warning: {
    icon: 'lucide:alert-triangle',
    style: 'text-orange-11 bg-orange-2 border border-orange-4',
  },
  workflow: {
    icon: 'lucide:git-pull-request',
    style: 'text-purple-11 bg-purple-2 border border-purple-4',
  },
}

const categoryIconOverride: Partial<
  Record<NotificationItem['category'], string>
> = {
  'folder.commented': 'lucide:message-circle',
  'folder.item_shared': 'lucide:share-2',
  'folder.item_uploaded': 'lucide:upload',
  'folder.share_revoked': 'lucide:share-2',
  'request.commented': 'lucide:message-circle',
  'signrequest.awaiting_signature': 'lucide:pen-tool',
  'signrequest.cancelled': 'lucide:pen-tool',
  'signrequest.expiring_soon': 'lucide:pen-tool',
  'signrequest.signed': 'lucide:pen-tool',
}

const NotificationCard = ({
  notification,
  onItemClick,
  onMarkAsRead,
}: Props) => {
  const { t } = useLingui()
  const { icon: defaultIcon, style } =
    severityStyles[notification.severity] || severityStyles.info
  const icon = categoryIconOverride[notification.category] ?? defaultIcon

  return (
    <div
      className={`group relative flex cursor-pointer items-start gap-3 border-b border-gray-3 p-3.5 transition-all hover:bg-gray-2 ${
        !notification.isRead ? 'bg-primary-1/60' : 'bg-surface-primary'
      }`}
      onClick={() => onItemClick?.(notification)}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style}`}
      >
        <Icon className='h-4 w-4' name={icon} />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <p
            title={notification.title}
            className={`group-hover:truncate-none truncate text-13 font-semibold transition-all group-hover:overflow-visible group-hover:whitespace-normal ${
              !notification.isRead ? 'text-gray-12' : 'text-gray-11'
            }`}
          >
            {notification.title}
          </p>
          <span className='shrink-0 text-11 font-medium text-gray-9'>
            {formatRelativeTime(notification.createdAtUtc)}
          </span>
        </div>
        <p
          className='mt-1 line-clamp-2 text-12 leading-relaxed text-gray-10 transition-all group-hover:line-clamp-none group-hover:whitespace-normal'
          title={notification.message}
        >
          {notification.message}
        </p>
      </div>

      {!notification.isRead && (
        <button
          className='h-2 w-2 shrink-0 self-center rounded-full bg-primary-9 transition-transform hover:scale-125'
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
