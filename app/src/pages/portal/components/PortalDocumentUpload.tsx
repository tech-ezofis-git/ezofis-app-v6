import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  getFileIcon,
  getFileIconClasses,
} from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import CompactDropzone from '@/pages/requests/components/workflow-request/components/CompactDropzone'
import { getFileExtension } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import cn from '@/utils/cn'

type PortalDocumentUploadProps = {
  analyzed?: boolean
  analyzing?: boolean
  analyzingText?: string
  file?: File | null
  isInvoice?: boolean
  label: string
  stepCount: number
  onAnalyze: () => void
  onCancel: () => void
  onFiles: (files: FileList | null) => void
  onRemoveFile: () => void
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const PortalDocumentUpload = ({
  analyzed,
  analyzing,
  analyzingText,
  file,
  label,
  onAnalyze,
  onFiles,
  onRemoveFile,
}: PortalDocumentUploadProps) => {
  const { t } = useLingui()

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const handleFileChange = (filesList: FileList | null) => {
    onFiles(filesList)
    setTimeout(() => {
      onAnalyze()
    }, 50)
  }

  const openFileLink = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 duration-300'>
      <div className='min-w-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-0 shadow-2xs transition-shadow hover:shadow-sm'>
        <div className='flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-1'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-1)]'>
            <Icon className='size-4 text-[var(--primary-9)]' name='tabler:upload' />
          </div>
          <div className='min-w-0 flex-1 text-14 font-bold tracking-tight text-gray-13'>
            {label}
          </div>
        </div>

        <div className='min-w-0 overflow-hidden px-6 pt-2 pb-6'>
          {file ? (
            <div className='space-y-2.5'>
              <div className='flex items-center gap-3 rounded-xl border border-gray-3 bg-surface p-2.5 transition-all shadow-2xs hover:border-gray-4'>
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    getFileIconClasses(getFileExtension(file.name)).wrap,
                  )}
                >
                  <Icon className='size-5' name={getFileIcon(file.name)} />
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <a
                      className='cursor-pointer truncate text-13 font-semibold text-primary-9 hover:text-primary-11 hover:underline'
                      href={previewUrl || '#'}
                      title={file.name}
                      onClick={openFileLink}
                    >
                      {file.name}
                    </a>
                    <span className='shrink-0 text-11 text-gray-8'>
                      ({formatFileSize(file.size)})
                    </span>
                  </div>

                  {analyzing ? (
                    <div className='mt-1 flex items-center gap-2 text-12 font-medium text-primary-9'>
                      <Icon
                        className='size-3.5 animate-spin'
                        name='tabler:loader-2'
                      />
                      <span>
                        {analyzingText || t`Extracting data from document...`}
                      </span>
                    </div>
                  ) : (
                    <div className='mt-0.5 text-11 font-medium text-emerald-9'>
                      {analyzed ? t`Data extracted` : t`Document uploaded`}
                    </div>
                  )}
                </div>

                {!analyzing && (
                  <button
                    className='flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-8 transition hover:bg-red-2 hover:text-red-9 active:scale-95'
                    title={t`Remove file`}
                    type='button'
                    onClick={onRemoveFile}
                  >
                    <Icon className='size-4' name='lucide:x' />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <CompactDropzone
              accept='application/pdf,image/*'
              helperText={t`Supports PDF and images · Max 10 MB`}
              loadingText={t`Extracting data from document...`}
              onFiles={handleFileChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}

PortalDocumentUpload.displayName = 'PortalDocumentUpload'
export default PortalDocumentUpload
