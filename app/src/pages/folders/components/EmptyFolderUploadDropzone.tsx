import { useLingui } from '@lingui/react/macro'
import { useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import { AnimateStagger } from '@/components/common/animations'
import {
  IMAGE_ACCEPT,
  isImage,
  isPdf,
  MAX_SIZE,
  PDF_ACCEPT,
} from '@/pages/requests/components/request/components/newrequest/utils'

type EmptyFolderUploadDropzoneProps = {
  className?: string
  disabled?: boolean
  /** Opens the full upload flow when a valid file is chosen. */
  onFileSelected: (file: File) => void
  /** Opens the upload screen without a preselected file (click-only fallback). */
  onOpenUpload?: () => void
}

export function EmptyFolderUploadDropzone({
  className = '',
  disabled = false,
  onFileSelected,
  onOpenUpload,
}: EmptyFolderUploadDropzoneProps) {
  const { t } = useLingui()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const acceptFiles = (fileList: FileList | File[] | null) => {
    if (disabled) return

    const files = Array.from(fileList ?? [])
    if (!files.length) {
      onOpenUpload?.()
      return
    }

    const validFiles = files.filter(
      (file) => (isPdf(file) || isImage(file)) && file.size <= MAX_SIZE,
    )

    if (!validFiles.length) {
      const tooLarge = files.some((file) => file.size > MAX_SIZE)
      showToast({
        message: tooLarge
          ? t`File is too large. Max size is 4MB.`
          : t`Invalid file type. Please upload a PDF or Image.`,
        variant: 'error',
      })
      resetInput()
      return
    }

    onFileSelected(validFiles[0])
    resetInput()
  }

  return (
    <div
      className={[
        'group relative w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-2 shadow-sm transition-all duration-500 hover:shadow-md',
        className,
      ].join(' ')}
    >
      <div
        className={[
          'relative z-10 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--primary-4)] px-8 py-6 text-center transition-all duration-500 ease-out sm:min-h-[128px]',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : isDragOver
              ? 'scale-[0.99] border-[var(--primary-6)] bg-[var(--primary-1)]'
              : 'bg-surface hover:border-[var(--primary-5)] hover:bg-[var(--primary-1)]/30',
        ].join(' ')}
        onClick={() => {
          if (disabled) return
          inputRef.current?.click()
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(event) => {
          event.preventDefault()
          if (disabled) return
          setIsDragOver(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragOver(false)
          acceptFiles(event.dataTransfer.files)
        }}
      >
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
              {t`Supports PDF and Images · Max 4 MB`}
            </p>
          </div>
        </AnimateStagger>

        <input
          accept={`${PDF_ACCEPT},${IMAGE_ACCEPT}`}
          className='hidden'
          disabled={disabled}
          ref={inputRef}
          type='file'
          onChange={(event) => acceptFiles(event.target.files)}
        />
      </div>
    </div>
  )
}
