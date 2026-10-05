import { useLingui } from '@lingui/react/macro'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import { getFileIcon } from '../sections/attachment/Attachments'

const MAX_VISIBLE = 3

const attachmentKeyOf = (file: AttachmentItem | null | undefined) =>
  String(file?.itemId || file?.fileId || file?.id || '')

const attachmentTime = (file: AttachmentItem | null | undefined) => {
  const raw = String(
    file?.createdAtUtc || file?.createdAt || '',
  ).trim()
  if (!raw) return 0
  const time = Date.parse(raw)
  return Number.isFinite(time) ? time : 0
}

/** Newest documents first for the left viewer strip. */
export const sortAttachmentsNewestFirst = (files: AttachmentItem[]) =>
  [...(files || [])].sort((left, right) => {
    const timeDiff = attachmentTime(right) - attachmentTime(left)
    if (timeDiff !== 0) return timeDiff
    return attachmentKeyOf(right).localeCompare(attachmentKeyOf(left))
  })

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return ''
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

const fileLabelOf = (file: AttachmentItem) =>
  String(file.fileName || file.name || 'file').trim() || 'file'

interface LeftViewerAttachmentStripProps {
  attachments: AttachmentItem[]
  /** Keys for documents that arrived after this request was opened. */
  newAttachmentKeys?: Set<string>
  selectedKey: string
  onOpenAttachmentsTab: () => void
  onSelect: (file: AttachmentItem) => void
}

const LeftViewerAttachmentStrip = ({
  attachments,
  newAttachmentKeys,
  selectedKey,
  onOpenAttachmentsTab,
  onSelect,
}: LeftViewerAttachmentStripProps) => {
  const { t } = useLingui()
  const ordered = sortAttachmentsNewestFirst(attachments)
  // Only show the strip when there is more than one document.
  if (ordered.length <= 1) return null

  // Keep the selected file among the 3 visible cards when it falls past the first three.
  let visible = ordered.slice(0, MAX_VISIBLE)
  if (ordered.length > MAX_VISIBLE && selectedKey) {
    const selectedIdx = ordered.findIndex(
      (file) => attachmentKeyOf(file) === selectedKey,
    )
    if (selectedIdx >= MAX_VISIBLE) {
      const selected = ordered[selectedIdx]
      const rest = ordered.filter((_, i) => i !== selectedIdx)
      visible = [selected, ...rest.slice(0, MAX_VISIBLE - 1)]
    }
  }
  const hasMore = ordered.length > MAX_VISIBLE
  const moreCount = ordered.length - MAX_VISIBLE

  return (
    <div className='flex shrink-0 items-center gap-2 overflow-visible border-b border-gray-3 bg-surface px-3 pb-2.5 pt-3.5'>
      <div className='no-scrollbar  flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto overflow-y-visible py-1'>
        {visible.map((file) => {
          const key = attachmentKeyOf(file)
          const selected = key === selectedKey
          const label = fileLabelOf(file)
          const sizeLabel = formatBytes(file.fileSize)
          const icon = getFileIcon(label)
          const isNew = Boolean(key && newAttachmentKeys?.has(key))

          return (
            <button
              key={key || label}
              type='button'
              className={cn(
                'group relative ml-2 mt-3 flex min-h-11 w-[10.5rem] shrink-0 items-start gap-2 rounded-lg border bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-gray-2 active:scale-[0.99]',
                selected
                  ? 'border-primary-9 ring-1 ring-primary-9'
                  : 'border-gray-3',
              )}
              onClick={() => onSelect(file)}
            >
              {isNew ? (
                <span className='absolute -top-2.5 right-1.5 z-10 inline-flex items-center rounded-full border border-green-4 bg-green-2 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-green-11 shadow-xs'>
                  {t`New`}
                </span>
              ) : null}
              <Icon className='mt-0.5 h-5 w-5 shrink-0' name={icon} />
              <div className='min-w-0 flex-1'>
                <div className='truncate text-[11px] font-semibold text-gray-12 [overflow-wrap:anywhere] group-hover:overflow-visible group-hover:whitespace-normal group-hover:break-all'>
                  {label}
                </div>
                {sizeLabel ? (
                  <div className='truncate text-[10px] text-gray-9'>
                    {sizeLabel}
                  </div>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {hasMore ? (
        <Tooltip content={t`View all attachments (${moreCount} more)`}>
          <button
            type='button'
            className='flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-secondary-9 px-1.5 text-11 font-semibold text-white transition-colors hover:bg-secondary-10 active:scale-95'
            onClick={onOpenAttachmentsTab}
          >
            +{moreCount}
          </button>
        </Tooltip>
      ) : null}
    </div>
  )
}

export default LeftViewerAttachmentStrip
export { attachmentKeyOf }
