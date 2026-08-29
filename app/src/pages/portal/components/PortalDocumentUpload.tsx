import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
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
  isInvoice,
  label,
  stepCount,
  onAnalyze,
  onCancel,
  onFiles,
  onRemoveFile,
}: PortalDocumentUploadProps) => {
  const { t } = useLingui()
  const [started, setStarted] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const statusMessages = [
    t`Matching supplier records...`,
    t`Extracting invoice fields...`,
    t`Checking for duplicates...`,
  ]

  useEffect(() => {
    if (!analyzing) {
      setStatusIndex(0)
      return
    }
    const timer = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statusMessages.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [analyzing, statusMessages.length])

  const percent = analyzed ? 20 : file ? 10 : started ? 5 : 0
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

  const isImage = Boolean(file?.type.startsWith('image/'))
  const isPdf = Boolean(
    file &&
      (file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')),
  )

  const documentPreview = file && previewUrl && (
    <div className='relative h-72 overflow-hidden rounded-xl border-2 border-dashed border-gray-4 bg-gray-1'>
      {isImage ? (
        <img
          alt={file.name}
          className='size-full object-contain p-3'
          src={previewUrl}
        />
      ) : isPdf ? (
        <iframe
          className='size-full border-0 bg-surface'
          src={previewUrl}
          title={file.name}
        />
      ) : (
        <div className='flex size-full flex-col items-center justify-center gap-2'>
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-lg',
              getFileIconClasses(getFileExtension(file.name)).wrap,
            )}
          >
            <Icon className='size-6' name={getFileIcon(file.name)} />
          </div>
          <div className='max-w-full truncate px-4 text-13 font-semibold text-gray-13'>
            {file.name}
          </div>
        </div>
      )}
      {analyzing ? (
        <div className='pointer-events-none absolute inset-0'>
          <div className='absolute inset-0 bg-primary-9/10' />
          <div className='scanning-bar animate-scan absolute inset-x-0 z-10 h-1 bg-primary-9' />
          <div className='absolute inset-x-0 bottom-0 bg-surface/90 px-3 py-2 text-center'>
            <div className='text-13 font-semibold text-gray-13'>
              {t`Reading your document...`}
            </div>
            <div className='text-12 text-gray-10'>
              {analyzingText || statusMessages[statusIndex]}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 duration-300'>
      <div className='mb-3 flex items-end justify-between gap-3'>
        <div className='text-13 font-medium text-gray-10'>
          {t`Step 1 of ${stepCount}`}
        </div>
        <div className='text-13 font-semibold text-primary-11'>
          {percent}% {t`complete`}
        </div>
      </div>
      <div className='mb-4 h-px bg-gray-4' />

      <div className='overflow-hidden rounded-xl border border-gray-3 bg-gray-0 shadow-2xs'>
        <div className='flex items-center gap-3 px-4 py-2.5'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-1'>
            <Icon className='size-4 text-primary-9' name='tabler:upload' />
          </div>
          <div className='min-w-0 flex-1 text-14 font-bold tracking-tight text-gray-13'>
            {label}
          </div>
        </div>

        <div className='px-6 pt-2 pb-6'>
          {file && (analyzing || started) ? (
            <>
              {documentPreview}
              <div className='mt-3 flex items-center gap-2.5 rounded-lg border border-gray-4 bg-surface p-2.5'>
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    getFileIconClasses(getFileExtension(file.name)).wrap,
                  )}
                >
                  <Icon className='size-4' name={getFileIcon(file.name)} />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-12 font-semibold text-gray-13'>
                    {file.name}
                  </div>
                  <div className='text-11 text-gray-10'>
                    {formatFileSize(file.size)}
                  </div>
                </div>
                {!analyzing ? (
                  <button
                    className='flex size-7 items-center justify-center rounded-md text-gray-8 transition hover:bg-red-2 hover:text-red-9 active:scale-95'
                    type='button'
                    onClick={onRemoveFile}
                  >
                    <Icon className='size-3.5' name='lucide:x' />
                  </button>
                ) : null}
              </div>
              {!analyzing ? (
                <div className='mt-4 flex justify-end'>
                  <Button
                    className='rounded-lg'
                    disabled={analyzed}
                    label={t`Analyze Document`}
                    suffixIcon='lucide:arrow-right'
                    onClick={onAnalyze}
                  />
                </div>
              ) : null}
            </>
          ) : !started ? (
            <>
              <div className='mb-4 flex flex-wrap items-center gap-2'>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-cyan-2 px-2.5 py-1 text-12 font-semibold text-cyan-11'>
                  <Icon className='size-3.5' name='tabler:scan' />
                  {t`AI-Assisted`}
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-primary-2 px-2.5 py-1 text-12 font-semibold text-primary-11'>
                  <AiBrandIcon className='size-3.5' variant='outline-purple' />
                  {isInvoice
                    ? t`Let’s start your Invoice Submission.`
                    : t`Let’s start your submission.`}
                </span>
              </div>
              <p className='text-13 text-gray-12'>
                {t`Upload your document and our AI will read it, then walk you through confirming the details step by step.`}
              </p>
              <p className='mt-1 text-12 text-gray-10'>
                {t`Upload an invoice — our AI reads it and pre-fills the details for you to confirm.`}
              </p>
              <div className='mt-5 flex flex-wrap items-center gap-3'>
                <Button
                  className='rounded-lg'
                  label={t`Get Started`}
                  suffixIcon='lucide:arrow-right'
                  onClick={() => setStarted(true)}
                />
                <Button
                  color='gray'
                  label={t`Cancel`}
                  variant='ghost'
                  onClick={onCancel}
                />
              </div>
            </>
          ) : (
            <>
              <CompactDropzone
                accept='application/pdf,image/*'
                helperText={t`Supports PDF and images · Max 10 MB`}
                loadingText={t`Extracting data from the document…`}
                onFiles={onFiles}
              />
              <div className='mt-4 flex justify-end'>
                <Button
                  className='rounded-lg'
                  disabled
                  label={t`Analyze Document`}
                  suffixIcon='lucide:arrow-right'
                  onClick={onAnalyze}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

PortalDocumentUpload.displayName = 'PortalDocumentUpload'
export default PortalDocumentUpload
