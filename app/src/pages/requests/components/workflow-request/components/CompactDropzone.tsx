import { useLingui } from '@lingui/react/macro'
import { useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'

interface Props {
  accept?: string
  disabled?: boolean
  helperText?: string
  isLoading?: boolean
  loadingText?: string
  multiple?: boolean
  onFiles: (files: FileList | null) => void
}

// A small, single-purpose dropzone for embedding inline (sidebar panels,
// form field slots) — unlike the app's full-screen FileUpload component
// (sized for a dedicated upload page), this shows exactly one message and
// fits a compact card.
const CompactDropzone = ({
  accept = '*/*',
  disabled,
  helperText,
  isLoading,
  loadingText,
  multiple,
  onFiles,
}: Props) => {
  const { t } = useLingui()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const open = () => {
    if (disabled || isLoading) return
    inputRef.current?.click()
  }

  return (
    <div
      role='button'
      tabIndex={0}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      } ${
        isDragOver
          ? 'scale-[1.01] border-primary-7 bg-primary-1'
          : 'border-gray-4 bg-gray-1 hover:border-primary-6 hover:bg-primary-1/40'
      }`}
      onClick={open}
      onDragLeave={() => setIsDragOver(false)}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled && !isLoading) setIsDragOver(true)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        if (disabled || isLoading) return
        onFiles(e.dataTransfer.files)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <div className='flex size-8 items-center justify-center rounded-lg bg-primary-2 text-primary-9'>
        <Icon className='size-4' name='tabler:upload' />
      </div>
      <p className='text-12 font-medium text-gray-11'>
        {t`Drop files, or`}{' '}
        <span className='font-semibold text-primary-9'>{t`browse`}</span>
      </p>
      {helperText && <p className='text-11 text-gray-8'>{helperText}</p>}

      <input
        accept={accept}
        className='hidden'
        multiple={multiple}
        ref={inputRef}
        type='file'
        onChange={(e) => {
          onFiles(e.target.files)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />

      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center rounded-xl bg-gray-0/90 backdrop-blur-[1px]'>
          <div className='flex items-center gap-2'>
            <Icon
              className='size-4 animate-spin text-primary-9'
              name='tabler:loader-2'
            />
            <span className='text-12 font-medium text-primary-11'>
              {loadingText || t`Uploading…`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

CompactDropzone.displayName = 'CompactDropzone'
export default CompactDropzone
