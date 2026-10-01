import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import Alert from '@/components/base/Alert'
import Badge from '@/components/base/Badge'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import Tooltip from '@/components/base/Tooltip'
import { AnimateFadeIn } from '@/components/common/animations'
import cn from '@/utils/cn'
import {
  formatUtcToLocalDate,
  formatUtcToLocalDateTime,
  parseUtcDate,
} from '@/utils/utcDate'
import { StagedFileExportButton } from '../StagedFileDeleteButton'
import type { QueuedUploadFile } from './uploadQueueTypes'

interface UploadQueueFileCardProps {
  entry: QueuedUploadFile
  isOpen: boolean
  className?: string
  disabled?: boolean
  missingMandatoryFields?: boolean
  onExport?: (id: string) => Promise<void>
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onRetryOcr: (id: string) => void
  onToggleSelect?: (id: string, checked: boolean) => void
  selected?: boolean
  showCheckbox?: boolean
  showExport?: boolean
}

export default function UploadQueueFileCard({
  className,
  disabled = false,
  entry,
  isOpen,
  missingMandatoryFields = false,
  onExport,
  onOpen,
  onRemove,
  onRetryOcr,
  onToggleSelect,
  selected = false,
  showCheckbox = false,
  showExport = false,
}: UploadQueueFileCardProps) {
  const { t } = useLingui()

  const iconMeta = useMemo(
    () => getFileIconMeta(entry.fileName),
    [entry.fileName],
  )

  const canOpen = !disabled && entry.status !== 'indexing'
  const createdLabel = formatCreatedAt(entry.createdAt)
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
        {showCheckbox ? (
          <div
            className='flex shrink-0 items-center self-center'
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <InputCheckbox
              aria-label={t`Select file`}
              checked={selected}
              disabled={!canRemove}
              onChange={(checked) => onToggleSelect?.(entry.id, checked)}
            />
          </div>
        ) : null}
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
                title={entry.fileName}
              >
                {entry.fileName}
              </p>
            </div>
            {createdLabel || entry.fileSize > 0 ? (
              <p className='mt-1 flex items-center gap-1.5 text-11 font-medium text-text-muted'>
                {createdLabel ? <span>{createdLabel}</span> : null}
                {createdLabel && entry.fileSize > 0 ? (
                  <span className='text-text-muted/60'>•</span>
                ) : null}
                {entry.fileSize > 0 ? (
                  <span>{formatBytes(entry.fileSize)}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className='flex shrink-0 items-center gap-2 self-center'
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {entry.status === 'ready' && missingMandatoryFields ? (
            <span className='inline-flex shrink-0 items-center gap-1 text-11 font-medium whitespace-nowrap text-[var(--orange-10)]'>
              <Icon className='size-3.5' name='lucide:alert-circle' />
              {t`Mandatory fields are missing`}
            </span>
          ) : null}
          {entry.status === 'ready' && !missingMandatoryFields ? (
            <span className='shrink-0 rounded-full border border-[var(--orange-7)] bg-[var(--orange-2)] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--orange-7)] uppercase'>
              {t`Ready to export`}
            </span>
          ) : null}
          {entry.status !== 'ready' ? renderStatusBadge() : null}

          {showExport && onExport ? (
            <StagedFileExportButton
              disabled={!canRemove}
              fileName={entry.fileName || t`this file`}
              onExport={() => onExport(entry.id)}
            />
          ) : null}

          {canRemove && (
            <Tooltip content={t`Remove file`}>
              <IconButton
                aria-label={t`Remove file`}
                color='red'
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
      case 'analyzing':
        return (
          <span className='inline-flex shrink-0 items-center gap-1 text-11 font-medium whitespace-nowrap text-accent-primary'>
            <Icon className='size-3 animate-spin' name='tabler:loader-2' />
            {t`Analyzing...`}
          </span>
        )
      case 'ready':
        return <Badge color='indigo' label={t`Ready to export`} />
      case 'indexing':
        return (
          <span className='inline-flex shrink-0 items-center gap-1 text-11 font-medium whitespace-nowrap text-accent-primary'>
            <Icon className='size-3 animate-spin' name='tabler:loader-2' />
            {t`Indexing...`}
          </span>
        )
      case 'indexed':
        return (
          <span className='inline-flex shrink-0 items-center gap-1 text-11 font-medium whitespace-nowrap text-success-main'>
            <Icon className='size-3.5' name='lucide:check-circle-2' />
            {t`Indexed`}
          </span>
        )
      case 'queued':
        return (
          <span className='inline-flex shrink-0 items-center gap-1 text-11 font-medium whitespace-nowrap text-[var(--gray-10)]'>
            <Icon className='size-3 animate-spin' name='tabler:loader-2' />
            {t`Waiting...`}
          </span>
        )
      case 'error':
        return <Badge color='red' label={t`Failed`} />
      default:
        return null
    }
  }
}

export function formatCreatedAt(value?: string) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  const hasTime = /(?:T|\s)\d{1,2}:\d{2}/.test(trimmed)
  if (parseUtcDate(trimmed)) {
    return hasTime
      ? formatUtcToLocalDateTime(trimmed, '')
      : formatUtcToLocalDate(trimmed, '')
  }

  const dayMonthYear = trimmed.match(
    /^(\d{2})-(\d{2})-(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  )
  if (!dayMonthYear) return ''

  const [, day, month, year, hour, minute, second] = dayMonthYear
  if (!hour || !minute) return `${day}-${month}-${year}`

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second || 0),
  )
  if (Number.isNaN(date.getTime())) return `${day}-${month}-${year}`
  return formatUtcToLocalDateTime(date, '')
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
