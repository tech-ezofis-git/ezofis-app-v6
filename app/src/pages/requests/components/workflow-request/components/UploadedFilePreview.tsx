import { useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import {
  getFileIcon,
  getFileIconClasses,
} from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import { getFileExtension } from '../utils/fieldRendering'

export interface PreviewableFile {
  fileName: string
  key: string
  rawFile?: File
}

interface Props {
  activeKey: string | null
  files: PreviewableFile[]
  // Set when a repository field is clicked — highlights and scrolls to that
  // value's text in the preview. focusRequestId is bumped on every click
  // (even re-clicking the same field) so the viewer re-scrolls each time.
  activeHighlightTerm?: string | null
  focusRequestId?: number
  onSelectKey: (key: string) => void
}

const isPdfFile = (file?: File, fileName?: string): boolean =>
  file?.type === 'application/pdf' || getFileExtension(fileName || '') === 'pdf'

const isImageFile = (file?: File, fileName?: string): boolean => {
  if (file?.type.startsWith('image/')) return true
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(
    getFileExtension(fileName || ''),
  )
}

// Left-pane preview for a locally-selected (not-yet-persisted) file, wired
// the same way src/pages/folders/components/Upload/Upload.tsx does for its
// own dropzone preview: an object URL built off the raw File, revoked on
// change/unmount. rawFile stays populated on attachments/field values even
// after staging (stagePendingFiles spreads the existing entry rather than
// clearing it), so this keeps working before and after upload completes.
const UploadedFilePreview = ({
  activeHighlightTerm,
  activeKey,
  files,
  focusRequestId,
  onSelectKey,
}: Props) => {
  const activeFile = files.find((f) => f.key === activeKey) ?? files[0]
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!activeFile?.rawFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(activeFile.rawFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [activeFile?.rawFile])

  return (
    <div className='flex h-full min-h-0 flex-col gap-3'>
      {files.length > 1 && (
        <div className='flex flex-wrap gap-2 px-1'>
          {files.map((file) => {
            const ext = getFileExtension(file.fileName)
            const icon = getFileIcon(ext)
            const styles = getFileIconClasses(ext)
            const isActive = file.key === (activeFile?.key ?? null)
            return (
              <button
                key={file.key}
                type='button'
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-11 font-medium transition-colors ${
                  isActive
                    ? 'border-primary-6 bg-primary-1 text-primary-9'
                    : 'border-gray-3 bg-surface text-gray-9 hover:border-gray-4'
                }`}
                onClick={() => onSelectKey(file.key)}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded ${styles.wrap}`}
                >
                  <Icon className='size-3' name={icon} />
                </span>
                <span className='max-w-[120px] truncate'>{file.fileName}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className='min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-3'>
        <DocumentPreviewViewer
          activeHighlightTerm={activeHighlightTerm}
          enableHighlight={Boolean(activeHighlightTerm)}
          fileName={activeFile?.fileName}
          fileUrl={previewUrl}
          focusRequestId={focusRequestId}
          highlightTerms={activeHighlightTerm ? [activeHighlightTerm] : []}
          isImage={isImageFile(activeFile?.rawFile, activeFile?.fileName)}
          isPdf={isPdfFile(activeFile?.rawFile, activeFile?.fileName)}
        />
      </div>
    </div>
  )
}

UploadedFilePreview.displayName = 'UploadedFilePreview'
export default UploadedFilePreview
