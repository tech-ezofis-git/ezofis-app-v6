import { useLingui } from '@lingui/react/macro'
import { useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  AnimateFadeIn,
  AnimateSlideUp,
  AnimateStagger,
} from '@/components/common/animations'
import { DOCUMENT_ACCEPT, isSupportedDocument, MAX_SIZE } from './utils'
import showToast from '@/components/base/toast/showToast'

interface Props {
  workflow: any
  isUploading: boolean
  onFilesSelected: (files: FileList | null) => void
}

const DocumentFormUpload = ({ workflow, isUploading, onFilesSelected }: Props) => {
  const { t } = useLingui()
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const workflowName = workflow?.name || workflow?.settings?.general?.name || t`Workflow`
  const workflowDescription = workflow?.description || workflow?.settings?.general?.description || t`Upload a document to start this workflow.`

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    const valid = fileArray.every((f) => isSupportedDocument(f) && f.size <= MAX_SIZE)
    if (!valid) {
      showToast({ message: t`Invalid file type or size.`, variant: 'error' })
      return
    }
    onFilesSelected(files)
  }

  return (
    <AnimateFadeIn className='flex h-full w-full flex-1 flex-col items-center justify-center overflow-y-auto bg-surface-muted px-4 py-4 sm:px-6 lg:px-8'>
      <div className='flex w-full max-w-3xl flex-col items-center gap-6'>
        {/* Header Section */}
        <AnimateSlideUp className='space-y-1.5 text-center'>
          <h1 className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
            {workflowName}
          </h1>
          <p className='mx-auto max-w-xl text-sm font-medium text-[var(--gray-10)]'>
            {workflowDescription}
          </p>
        </AnimateSlideUp>

        {/* Upload Zone */}
        <AnimateSlideUp className='relative z-10 w-full' delay={0.1}>
          <div className='group relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-2 shadow-sm transition-all duration-500 hover:shadow-md'>
            <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
              <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-[var(--primary-2)]/20 to-transparent' />
            </div>

            <button
              aria-label={t`Upload document`}
              type='button'
              className={[
                'relative z-10 flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--primary-4)] px-8 py-6 text-center transition-all duration-500 ease-out sm:min-h-[128px]',
                isDragOver
                  ? 'scale-[0.99] border-[var(--primary-6)] bg-[var(--primary-1)]'
                  : 'bg-surface hover:border-[var(--primary-5)] hover:bg-[var(--primary-1)]/30',
                isUploading
                  ? 'pointer-events-none opacity-60'
                  : '',
              ].join(' ')}
              onClick={() => invoiceInputRef.current?.click()}
              onDragLeave={() => setIsDragOver(false)}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                handleFiles(e.dataTransfer.files)
              }}
            >
              {isUploading ? (
                <div className='flex flex-col items-center gap-3 py-2'>
                  <div className='flex size-14 items-center justify-center rounded-full bg-[var(--primary-1)]'>
                    <Icon
                      className='size-7 animate-spin text-[var(--primary-9)]'
                      name='tabler:loader-2'
                    />
                  </div>
                  <div className='text-center'>
                    <h2 className='text-base font-bold text-[var(--gray-13)]'>
                      {t`Uploading & Processing...`}
                    </h2>
                    <p className='mt-1 max-w-[280px] truncate text-xs font-semibold text-[var(--gray-10)]'>
                      {t`Please wait while we extract data...`}
                    </p>
                  </div>
                </div>
              ) : (
                <AnimateStagger className='flex flex-col items-center gap-3'>
                  <div className='flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-1)] shadow-sm transition-all duration-500 group-hover:scale-105'>
                    <Icon
                      className='size-7 text-[var(--primary-9)]'
                      name='tabler:cloud-upload'
                    />
                  </div>
                  <div className='text-center'>
                    <h2 className='text-base font-medium tracking-tight text-[var(--gray-13)]'>
                      {t`Drop your file here, or`}{' '}
                      <span className='text-[var(--primary-9)]'>{t`browse`}</span>
                    </h2>
                    <p className='text-xs font-medium text-[var(--gray-9)]'>
                      {t`Supports PDF, Word, Excel, PowerPoint, Images & Documents · Max 50 MB`}
                    </p>
                  </div>
                </AnimateStagger>
              )}

              <input
                accept={DOCUMENT_ACCEPT}
                className='hidden'
                ref={invoiceInputRef}
                type='file'
                onChange={(e) => handleFiles(e.target.files)}
              />
            </button>
          </div>
        </AnimateSlideUp>

      </div>
      <style>{`
        @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
        }
      `}</style>
    </AnimateFadeIn>
  )
}

export default DocumentFormUpload
