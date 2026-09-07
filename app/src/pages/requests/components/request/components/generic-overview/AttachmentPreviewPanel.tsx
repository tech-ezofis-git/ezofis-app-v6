import { useLingui } from '@lingui/react/macro'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import Icon from '@/components/base/icon/Icon'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import { useAttachmentPreviewUrl } from '@/pages/requests/hooks/useAttachmentPreviewUrl'

interface Props {
  file: AttachmentItem
  repositoryId?: string | number
  onBack: () => void
}

const AttachmentPreviewPanel = ({ file, repositoryId, onBack }: Props) => {
  const { t } = useLingui()
  const { isLoading, mimeType, previewUrl } = useAttachmentPreviewUrl(
    file,
    repositoryId,
  )

  const isPdf = Boolean(mimeType?.includes('pdf'))
  const isImage = Boolean(mimeType?.startsWith('image/'))
  const displayName = file.name || file.fileName || 'Untitled'

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex shrink-0 items-center gap-2 border-b border-gray-3 px-3 py-2.5'>
        <button
          className='group flex items-center gap-1 text-xs font-semibold text-[var(--gray-11)] transition-all hover:text-[var(--gray-13)] active:scale-95'
          type='button'
          onClick={onBack}
        >
          <Icon
            className='h-4 w-4 transition-transform group-hover:-translate-x-0.5'
            name='tabler:arrow-left'
          />
          <span>{t`Back`}</span>
        </button>
        <div className='mx-1 h-4 w-[1px] bg-gray-3' />
        <span
          className='min-w-0 flex-1 truncate text-xs font-semibold text-gray-12'
          title={displayName}
        >
          {displayName}
        </span>
      </div>
      <div className='min-h-0 flex-1'>
        <DocumentPreviewViewer
          fileName={displayName}
          fileUrl={previewUrl}
          isImage={isImage}
          isLoading={isLoading}
          isPdf={isPdf}
        />
      </div>
    </div>
  )
}

AttachmentPreviewPanel.displayName = 'AttachmentPreviewPanel'
export default AttachmentPreviewPanel
