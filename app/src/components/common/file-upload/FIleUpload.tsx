import { motion } from 'motion/react'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Alert from '@/components/base/Alert'
import Icon from '@/components/base/icon/Icon'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateScale,
  AnimateStagger,
} from '@/components/common/animations'

export type DropzoneUploadCardHandle = {
  open: () => void
  reset: () => void
}

type FileIcon = {
  bg: string
  color: string
  icon: string
}

type Props = {
  accept: string
  /** Optional: disable interactions */
  disabled?: boolean
  fileTypeIcons?: FileIcon[]
  heightClassName?: string
  helperText?: string

  /** controlled loading state from parent */
  isLoading?: boolean
  /** controlled loading message from parent */
  loadingText?: string

  multiple?: boolean

  primaryIcon?: { bg: string; color: string; icon: string }

  selectedFileName?: string | null
  subtitle: string

  title: string

  /** Parent handles upload/parse; we just provide FileList */
  onFiles: (files: FileList | null) => void
}

const FileUpload = forwardRef<DropzoneUploadCardHandle, Props>(
  function DropzoneUploadCard(
    {
      accept,
      disabled = false,
      fileTypeIcons = [],
      heightClassName = 'h-[180px]',
      helperText,
      isLoading = false,
      loadingText = 'Processing…',
      multiple = false,
      primaryIcon = {
        bg: 'bg-[var(--primary-3)]',
        color: 'text-[var(--primary-9)]',
        icon: 'tabler:upload',
      },
      selectedFileName,
      subtitle,
      title,
      onFiles,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)

    const open = () => {
      if (disabled || isLoading) return
      inputRef.current?.click()
    }

    const reset = () => {
      if (inputRef.current) inputRef.current.value = ''
    }

    useImperativeHandle(ref, () => ({ open, reset }), [disabled, isLoading])

    return (
      <div className='rounded-2xl border border-[var(--gray-4)] bg-[var(--gray-0)] p-4 shadow-sm'>
        <AnimateEntrancePop>
          <h3 className='text-center text-15 font-semibold text-[var(--gray-13)]'>
            {title}
          </h3>
          <p className='mx-auto mb-2.5 max-w-[600px] text-center text-12 leading-relaxed text-[var(--gray-11)]'>
            {subtitle}
          </p>
        </AnimateEntrancePop>

        <AnimateScale>
          <div
            className={[
              'group relative w-full rounded-2xl border-2 border-dashed transition-all duration-300',
              'flex flex-col items-center justify-center gap-3 p-4 sm:p-5',
              disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
              heightClassName,
              isDragOver
                ? 'scale-[1.01] border-[var(--primary-9)] bg-[var(--primary-2)]'
                : 'border-[var(--violet-4)] bg-[var(--gray-0)] hover:border-[var(--primary-7)] hover:bg-[var(--primary-1)]',
            ].join(' ')}
            onClick={open}
            onDragLeave={() => setIsDragOver(false)}
            onDragOver={(e) => {
              e.preventDefault()
              if (disabled || isLoading) return
              setIsDragOver(true)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (disabled || isLoading) return
              setIsDragOver(false)
              onFiles(e.dataTransfer.files)
              reset() // reset so selecting same file again still triggers change
            }}
          >
            <AnimateStagger className='flex items-center gap-3'>
              <div
                className={[
                  'flex size-11 items-center justify-center rounded-lg shadow-xs',
                  primaryIcon.bg,
                  primaryIcon.color,
                ].join(' ')}
              >
                <Icon className='size-5' name={primaryIcon.icon} />
              </div>
            </AnimateStagger>

            <div className='text-center'>
              <div className='text-15 font-medium text-[var(--gray-12)]'>
                Drop your file here, or{' '}
                <span className='text-[var(--primary-9)]'>browse</span>
              </div>
              {helperText ? (
                <div className='mt-1 text-12 text-[var(--gray-10)]'>
                  {helperText}
                </div>
              ) : null}
            </div>

            {fileTypeIcons?.length ? (
              <AnimateStagger className='flex items-center gap-2'>
                {fileTypeIcons.map((it) => (
                  <div
                    key={it.icon}
                    className={[
                      'flex size-7 items-center justify-center rounded-md border shadow-2xs',
                      it.bg,
                      it.color,
                    ].join(' ')}
                  >
                    <Icon className='size-3.5' name={it.icon} />
                  </div>
                ))}
              </AnimateStagger>
            ) : null}

            <input
              accept={accept}
              className='hidden'
              multiple={multiple}
              ref={inputRef}
              type='file'
              onChange={(e) => {
                onFiles(e.target.files)
                reset() // important: allow re-select same file
              }}
            />

            {isLoading ? (
              <AnimateFadeIn className='bg-opacity-80 absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-[var(--gray-0)] backdrop-blur-sm'>
                <div className='flex flex-col items-center gap-3'>
                  <span className='size-10 animate-spin rounded-full border-4 border-[var(--primary-9)] border-t-transparent' />
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    className='text-14 font-medium text-[var(--primary-11)]'
                    initial={{ opacity: 0.5 }}
                    transition={{
                      duration: 1.5,
                      ease: 'linear',
                      repeat: Infinity,
                    }}
                  >
                    {loadingText}
                  </motion.span>
                </div>
              </AnimateFadeIn>
            ) : null}
          </div>
        </AnimateScale>

        {selectedFileName ? (
          <AnimateEntrancePop className='mt-8'>
            <Alert
              text={`Selected File: ${selectedFileName}`}
              variant='green'
            />
          </AnimateEntrancePop>
        ) : null}
      </div>
    )
  },
)

export default FileUpload
