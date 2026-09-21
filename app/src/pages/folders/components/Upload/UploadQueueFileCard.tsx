import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import Alert from '@/components/base/Alert'
import Badge from '@/components/base/Badge'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import { AnimateFadeIn } from '@/components/common/animations'
import cn from '@/utils/cn'
import type { QueuedUploadFile } from './uploadQueueTypes'

interface UploadQueueFileCardProps {
  entry: QueuedUploadFile
  isOpen: boolean
  className?: string
  disabled?: boolean
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onRetryOcr: (id: string) => void
}

export default function UploadQueueFileCard({
  className,
  disabled = false,
  entry,
  isOpen,
  onOpen,
  onRemove,
  onRetryOcr,
}: UploadQueueFileCardProps) {
  const { t } = useLingui()

  const iconMeta = useMemo(
    () => getFileIconMeta(entry.file.name),
    [entry.file.name],
  )

  const canOpen = !disabled && entry.status !== 'indexing'
  const canRemove =
    !disabled && entry.status !== 'indexing' && entry.status !== 'indexed'

  return (
    <div
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      className={cn(
        'rounded-xl border border-gray-3 bg-surface p-3 shadow-xs transition-shadow duration-200',
        isOpen && 'border-[var(--primary-6)] ring-1 ring-[var(--primary-5)]',
        canOpen && 'cursor-pointer hover:shadow-sm',
        className,
      )}
      onClick={canOpen ? () => onOpen(entry.id) : undefined}
      onKeyDown={
        canOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen(entry.id)
              }
            }
          : undefined
      }
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex min-w-0 flex-1 items-center gap-2.5'>
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl border',
              iconMeta.bg,
            )}
          >
            <Icon className='size-4' name={iconMeta.icon} />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='flex items-baseline gap-2'>
              <p
                className='truncate text-12 font-semibold text-text-primary'
                title={entry.file.name}
              >
                {entry.file.name}
              </p>
              <span className='shrink-0 text-11 text-text-muted'>
                {formatBytes(entry.file.size)}
              </span>
            </div>
            <div className='mt-1'>{renderStatusBadge()}</div>
          </div>
        </div>

        {canRemove && (
          <Tooltip content={t`Remove file`}>
            <IconButton
              aria-label={t`Remove file`}
              color='gray'
              icon='lucide:trash-2'
              size='xs'
              variant='ghost'
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation()
                onRemove(entry.id)
              }}
            />
          </Tooltip>
        )}
      </div>

      {entry.status === 'analyzing' && (
        <div className='mt-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-secondary'>
          <div className='h-full w-2/5 animate-pulse rounded-full bg-accent-primary duration-700' />
        </div>
      )}

      {entry.status === 'error' && (
        <AnimateFadeIn className='mt-2.5 flex flex-col gap-2'>
          <Alert
            className='text-11'
            text={entry.errorMessage || t`Something went wrong for this file.`}
            variant='red'
          />
          <button
            className='self-start text-11 font-semibold text-[var(--primary-9)] hover:text-[var(--primary-10)]'
            type='button'
            onClick={(event) => {
              event.stopPropagation()
              onRetryOcr(entry.id)
            }}
          >
            {t`Retry`}
          </button>
        </AnimateFadeIn>
      )}
    </div>
  )

  function renderStatusBadge() {
    switch (entry.status) {
      case 'queued':
        return <Badge color='gray' label={t`Waiting`} />
      case 'analyzing':
        return (
          <span className='inline-flex items-center gap-1 text-11 font-medium text-accent-primary'>
            <Icon className='size-3 animate-spin' name='tabler:loader-2' />
            {t`Analyzing...`}
          </span>
        )
      case 'ready':
        return <Badge color='indigo' label={t`Ready for review`} />
      case 'indexing':
        return (
          <span className='inline-flex items-center gap-1 text-11 font-medium text-accent-primary'>
            <Icon className='size-3 animate-spin' name='tabler:loader-2' />
            {t`Indexing...`}
          </span>
        )
      case 'indexed':
        return (
          <span className='inline-flex items-center gap-1 text-11 font-medium text-success-main'>
            <Icon className='size-3.5' name='lucide:check-circle-2' />
            {t`Indexed`}
          </span>
        )
      case 'error':
        return <Badge color='red' label={t`Failed`} />
      default:
        return null
    }
  }
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getFileIconMeta(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') {
    return {
      bg: 'bg-red-2 text-red-9 border-red-3',
      icon: 'lucide:file-text',
    }
  }
  if (
    ['bmp', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp'].includes(ext)
  ) {
    return {
      bg: 'bg-blue-2 text-blue-9 border-blue-3',
      icon: 'lucide:image',
    }
  }
  if (['csv', 'xls', 'xlsx'].includes(ext)) {
    return {
      bg: 'bg-green-2 text-green-9 border-green-3',
      icon: 'lucide:sheet',
    }
  }
  return {
    bg: 'bg-gray-2 text-gray-9 border-gray-3',
    icon: 'lucide:file',
  }
}
