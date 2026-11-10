import { useLingui } from '@lingui/react/macro'
import type { LargeUploadProgress } from '@/lib/largeUpload/LargeFileUploader'
import { formatBytes, formatDuration } from '@/lib/largeUpload/constants'
import cn from '@/utils/cn'

interface LargeUploadProgressBarProps {
  progress: LargeUploadProgress
  className?: string
  /** Compact: one line for queue cards. */
  compact?: boolean
}

/** Determinate progress for a chunked large-file upload: percent, bytes, speed and time left. */
export default function LargeUploadProgressBar({
  className,
  compact = false,
  progress,
}: LargeUploadProgressBarProps) {
  const { t } = useLingui()
  const percent =
    progress.total > 0
      ? Math.min(100, Math.floor((progress.loaded / progress.total) * 100))
      : 0
  const loaded = formatBytes(progress.loaded)
  const total = formatBytes(progress.total)
  const speed =
    progress.bytesPerSecond > 0
      ? `${formatBytes(progress.bytesPerSecond)}/s`
      : ''
  const eta = formatDuration(progress.etaSeconds)

  const label =
    progress.phase === 'preparing'
      ? t`Preparing upload...`
      : progress.phase === 'finishing'
        ? t`Finishing upload...`
        : t`Uploading ${percent}%`

  const detail = [
    progress.phase === 'uploading' ? t`${loaded} of ${total}` : total,
    speed,
    progress.phase === 'uploading' && eta ? t`${eta} left` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div
        className={cn(
          'flex items-center justify-between gap-2 font-medium',
          compact ? 'text-11' : 'text-xs',
        )}
      >
        <span className='text-accent-primary'>{label}</span>
        <span className='truncate text-[var(--gray-10)]'>{detail}</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className='h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary'
        role='progressbar'
      >
        <div
          className={cn(
            'h-full rounded-full bg-accent-primary transition-[width] duration-300 ease-out',
            progress.phase !== 'uploading' && 'animate-pulse',
          )}
          style={{
            width: `${progress.phase === 'preparing' ? 4 : Math.max(percent, 2)}%`,
          }}
        />
      </div>
    </div>
  )
}
