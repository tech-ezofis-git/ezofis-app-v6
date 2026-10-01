import { useLingui } from '@lingui/react/macro'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import HoverExpandableText from '@/pages/requests/components/HoverExpandableText'
import cn from '@/utils/cn'
import { getFileIcon } from '../sections/attachment/Attachments'

const MAX_VISIBLE = 3

const attachmentKeyOf = (file: AttachmentItem | null | undefined) =>
  String(file?.itemId || file?.fileId || file?.id || '')

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
  selectedKey: string
  onOpenAttachmentsTab: () => void
  onSelect: (file: AttachmentItem) => void
}

const LeftViewerAttachmentStrip = ({
  attachments,
  selectedKey,
  onOpenAttachmentsTab,
  onSelect,
}: LeftViewerAttachmentStripProps) => {
  const { t } = useLingui()
  if (!attachments.length) return null

  // Keep the selected file among the 3 visible cards when it falls past the first three.
  let visible = attachments.slice(0, MAX_VISIBLE)
  if (attachments.length > MAX_VISIBLE && selectedKey) {
    const selectedIdx = attachments.findIndex(
      (file) => attachmentKeyOf(file) === selectedKey,
    )
    if (selectedIdx >= MAX_VISIBLE) {
      const selected = attachments[selectedIdx]
      const rest = attachments.filter((_, i) => i !== selectedIdx)
      visible = [selected, ...rest.slice(0, MAX_VISIBLE - 1)]
    }
  }
  const hasMore = attachments.length > MAX_VISIBLE
  const moreCount = attachments.length - MAX_VISIBLE

  return (
    <div className='flex shrink-0 items-center gap-2 border-b border-gray-3 bg-surface px-3 py-2'>
      <div className='no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto'>
        {visible.map((file) => {
          const key = attachmentKeyOf(file)
          const selected = key === selectedKey
          const label = fileLabelOf(file)
          const sizeLabel = formatBytes(file.fileSize)
          const icon = getFileIcon(label)

          return (
            <button
              key={key || label}
              type='button'
              className={cn(
                'flex min-h-11 w-[10.5rem] shrink-0 items-center gap-2 rounded-lg border bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-gray-2 active:scale-[0.99]',
                selected
                  ? 'border-primary-9 ring-1 ring-primary-9'
                  : 'border-gray-3',
              )}
              onClick={() => onSelect(file)}
            >
              <Icon className='h-5 w-5 shrink-0' name={icon} />
              <div className='min-w-0 flex-1'>
                <HoverExpandableText
                  text={label}
                  expandStyle='stack'
                  maxLines={1}
                  normalMaxWidthClass='max-w-full'
                  className='text-[11px] font-semibold text-gray-12'
                />
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
