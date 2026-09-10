import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { AnimateFadeIn, AnimateStagger } from '@/components/common/animations'
import FileUpload, {
  type DropzoneUploadCardHandle,
} from '@/components/common/file-upload/FIleUpload'
import {
  DOCUMENT_ACCEPT,
  isSupportedDocument,
  MAX_SIZE,
} from '@/pages/requests/components/request/components/newrequest/utils'
import type { CandidateRepository, ClassifiedFile } from './types'
import { classifyDocument } from './classifyDocument'
import IntelligentUploadFileCard from './IntelligentUploadFileCard'

interface IntelligentUploadViewProps {
  candidateRepositories: CandidateRepository[]
  repositoryId?: string | null
  onBack: () => void
  onDone: () => Promise<void> | void
}

const FILE_TYPE_ICONS = [
  {
    bg: 'bg-red-2 text-red-9 border-red-3',
    color: 'text-red-9',
    icon: 'lucide:file-text',
  },
  {
    bg: 'bg-blue-2 text-blue-9 border-blue-3',
    color: 'text-blue-9',
    icon: 'lucide:image',
  },
  {
    bg: 'bg-green-2 text-green-9 border-green-3',
    color: 'text-green-9',
    icon: 'lucide:sheet',
  },
]

export default function IntelligentUploadView({
  candidateRepositories,
  repositoryId,
  onBack,
  onDone,
}: IntelligentUploadViewProps) {
  const { t } = useLingui()
  const dropzoneRef = useRef<DropzoneUploadCardHandle | null>(null)
  const [files, setFiles] = useState<ClassifiedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadIndex, setUploadIndex] = useState(0)

  // Track processing concurrency
  const activeProcessingCount = useRef(0)

  const handleFilesAdded = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      const newItems: ClassifiedFile[] = []
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        if (!file) continue

        const fileName = file.name

        if (!isSupportedDocument(file)) {
          showToast({
            message: t`Skipped unsupported file: ${fileName}`,
            variant: 'warning',
          })
          continue
        }

        if (file.size > MAX_SIZE) {
          showToast({
            message: t`File exceeds 50MB limit: ${fileName}`,
            variant: 'warning',
          })
          continue
        }

        newItems.push({
          file,
          id: `classified-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: 'pending',
        })
      }

      if (newItems.length > 0) {
        setFiles((prev) => [...prev, ...newItems])
      }
    },
    [t],
  )

  // Start processing pending files with max concurrency of 2
  useEffect(() => {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0 || activeProcessingCount.current >= 2) return

    const availableSlots = 2 - activeProcessingCount.current
    const toProcess = pendingFiles.slice(0, availableSlots)

    toProcess.forEach((item) => {
      activeProcessingCount.current += 1
      const startTime = Date.now()

      // Update state to processing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                currentStage: t`Reading document content...`,
                elapsedSeconds: 0,
                status: 'processing',
              }
            : f,
        ),
      )

      // Elapsed seconds ticker
      const timer = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id && f.status === 'processing'
              ? {
                  ...f,
                  elapsedSeconds: Number(
                    ((Date.now() - startTime) / 1000).toFixed(1),
                  ),
                }
              : f,
          ),
        )
      }, 300)

      classifyDocument(item.file, candidateRepositories, (stage) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, currentStage: stage } : f,
          ),
        )
      })
        .then((result) => {
          clearInterval(timer)
          activeProcessingCount.current = Math.max(
            0,
            activeProcessingCount.current - 1,
          )

          // Auto-select highest confidence suggestion or fallback to current repo
          const topRepoId =
            result.suggestions[0]?.repositoryId ||
            repositoryId ||
            candidateRepositories[0]?.id

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    documentType: result.documentType,
                    elapsedSeconds: Number(
                      ((Date.now() - startTime) / 1000).toFixed(1),
                    ),
                    keywords: result.keywords,
                    selectedRepositoryId: topRepoId,
                    status: 'done',
                    suggestions: result.suggestions,
                  }
                : f,
            ),
          )
        })
        .catch((error: unknown) => {
          clearInterval(timer)
          activeProcessingCount.current = Math.max(
            0,
            activeProcessingCount.current - 1,
          )

          const errorMessage =
            error instanceof Error
              ? error.message
              : t`Failed to classify document`

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    error: errorMessage,
                    status: 'error',
                  }
                : f,
            ),
          )
        })
    })
  }, [candidateRepositories, files, repositoryId, t])

  const handleSelectRepository = useCallback(
    (fileId: string, repoId: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, selectedRepositoryId: repoId } : f,
        ),
      )
    },
    [],
  )

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const handleRetry = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, error: undefined, status: 'pending' } : f,
      ),
    )
  }, [])

  const handleClearAll = useCallback(() => {
    if (isUploading || files.length === 0) return
    const backup = [...files]
    const clearedCount = backup.length
    setFiles([])
    showToast({
      message: (
        <div className='flex items-center justify-between gap-3'>
          <span>
            {clearedCount === 1
              ? t`Cleared 1 document from queue.`
              : t`Cleared ${clearedCount} documents from queue.`}
          </span>
          <button
            className='cursor-pointer font-semibold text-primary-9 underline hover:text-primary-10'
            type='button'
            onClick={() => setFiles(backup)}
          >
            {t`Undo`}
          </button>
        </div>
      ),
      variant: 'default',
    })
  }, [files, isUploading, t])

  // Proceed to Indexing: Front-end UI only simulation (no upload-archive API call)
  const handleProceedToIndexing = async () => {
    if (files.length === 0 || isUploading) return

    const unassigned = files.some((f) => !f.selectedRepositoryId)
    if (unassigned) {
      showToast({
        message: t`Please assign a repository for all files before proceeding.`,
        variant: 'error',
      })
      return
    }

    setIsUploading(true)
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))

    for (let i = 0; i < files.length; i++) {
      const item = files[i]
      if (!item) continue

      setUploadIndex(i + 1)
      await sleep(350)

      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'uploaded' } : f)),
      )
    }

    setIsUploading(false)

    const count = files.length
    showToast({
      message:
        count === 1
          ? t`Document successfully ingested and indexed.`
          : t`All ${count} documents successfully ingested and indexed.`,
      variant: 'success',
    })

    await onDone()
  }

  // Derived metrics
  const filesCount = files.length
  const doneCount = files.filter(
    (f) => f.status === 'done' || f.status === 'uploaded',
  ).length
  const processingCount = files.filter(
    (f) => f.status === 'processing' || f.status === 'pending',
  ).length
  const canProceed =
    filesCount > 0 &&
    !isUploading &&
    processingCount === 0 &&
    files.every((f) => Boolean(f.selectedRepositoryId) && f.status !== 'error')

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-sm text-text-primary'>
      {/* Header Bar */}
      <header className='flex shrink-0 items-center justify-between border-b border-border-default bg-surface-primary px-6 py-4'>
        <div className='flex items-center gap-4'>
          <Tooltip content={t`Back to folder explorer`} position='bottom'>
            <IconButton
              aria-label={t`Back`}
              color='gray'
              disabled={isUploading}
              icon='lucide:arrow-left'
              variant='outline'
              onClick={onBack}
            />
          </Tooltip>

          <div>
            <div className='flex items-center gap-2.5'>
              <h1 className='text-base font-semibold text-text-primary'>
                {t`Intelligent Upload & Classify`}
              </h1>
              <div className='inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-11 font-medium text-accent-primary'>
                <AiBrandIcon className='size-3.5' variant='outline-purple' />
                <span>{t`AI Powered`}</span>
              </div>
            </div>
            <p className='mt-0.5 text-12 text-text-secondary'>
              {t`Drop multiple files to automatically classify document types and route to target repositories.`}
            </p>
          </div>
        </div>

        {/* Action button if queue has items */}
        {files.length > 0 && (
          <div className='flex items-center gap-2'>
            <Button
              color='gray'
              disabled={isUploading}
              icon='lucide:plus'
              label={t`Add more files`}
              size='sm'
              variant='outline'
              onClick={() => dropzoneRef.current?.open()}
            />
            <Button
              color='gray'
              disabled={isUploading}
              icon='lucide:trash-2'
              label={t`Clear queue`}
              size='sm'
              variant='ghost'
              onClick={handleClearAll}
            />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto p-6'>
        <div className='mx-auto max-w-4xl space-y-6'>
          {/* Empty State: Dropzone */}
          {files.length === 0 ? (
            <AnimateFadeIn className='space-y-4'>
              <FileUpload
                accept={DOCUMENT_ACCEPT}
                fileTypeIcons={FILE_TYPE_ICONS}
                heightClassName='h-[280px]'
                helperText={t`Support for PDF, PNG, TIFF, JPG up to 50MB.`}
                ref={dropzoneRef}
                subtitle={t`Drag and drop documents here, or click to browse. Ezofis AI will classify and route them automatically.`}
                title={t`Upload Documents for AI Classification`}
                multiple
                onFiles={handleFilesAdded}
              />

              <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3'>
                <div className='flex items-start gap-3 rounded-xl border border-border-default bg-surface-primary p-4 shadow-xs'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-primary'>
                    <AiBrandIcon className='size-4' variant='outline-purple' />
                  </div>
                  <div>
                    <h3 className='text-13 font-semibold text-text-primary'>
                      {t`Semantic Classification`}
                    </h3>
                    <p className='mt-1 text-11 leading-relaxed text-text-secondary'>
                      {t`AI analyzes document content and structures to identify types and metadata.`}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-xl border border-border-default bg-surface-primary p-4 shadow-xs'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success-main'>
                    <span className='text-14 font-bold'>%</span>
                  </div>
                  <div>
                    <h3 className='text-13 font-semibold text-text-primary'>
                      {t`Confidence Scoring`}
                    </h3>
                    <p className='mt-1 text-11 leading-relaxed text-text-secondary'>
                      {t`Receive transparent confidence rankings for top candidate repository matches.`}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-xl border border-border-default bg-surface-primary p-4 shadow-xs'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-2 text-blue-9'>
                    <span className='text-14 font-bold'>⇄</span>
                  </div>
                  <div>
                    <h3 className='text-13 font-semibold text-text-primary'>
                      {t`Full User Control`}
                    </h3>
                    <p className='mt-1 text-11 leading-relaxed text-text-secondary'>
                      {t`Review, confirm recommendations, or manually override target folders anytime.`}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateFadeIn>
          ) : (
            /* Queue State */
            <div className='space-y-4'>
              {/* Queue Status summary bar */}
              <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-primary px-4 py-3 shadow-xs'>
                <div className='flex items-center gap-3'>
                  <span className='text-13 font-semibold text-text-primary'>
                    {filesCount === 1
                      ? t`1 document in queue`
                      : t`${filesCount} documents in queue`}
                  </span>
                  <span className='text-12 text-text-secondary'>•</span>
                  <span className='text-12 font-medium text-success-main'>
                    {t`${doneCount} ready`}
                  </span>
                  {processingCount > 0 && (
                    <>
                      <span className='text-12 text-text-secondary'>•</span>
                      <span className='inline-flex items-center gap-1.5 text-12 font-medium text-accent-primary'>
                        <span className='size-2 animate-ping rounded-full bg-accent-primary' />
                        {t`${processingCount} analyzing...`}
                      </span>
                    </>
                  )}
                </div>

                {isUploading && (
                  <div className='text-12 font-medium text-accent-primary'>
                    {t`Uploading file ${uploadIndex} of ${filesCount}...`}
                  </div>
                )}
              </div>

              {/* Hidden dropzone to support "+ Add more files" */}
              <div className='hidden'>
                <FileUpload
                  accept={DOCUMENT_ACCEPT}
                  ref={dropzoneRef}
                  subtitle=''
                  title=''
                  multiple
                  onFiles={handleFilesAdded}
                />
              </div>

              {/* File Cards List */}
              <AnimateStagger className='space-y-3'>
                {files.map((fileItem) => (
                  <IntelligentUploadFileCard
                    candidateRepositories={candidateRepositories}
                    fileItem={fileItem}
                    key={fileItem.id}
                    onRemove={handleRemoveFile}
                    onRetry={handleRetry}
                    onSelectRepository={handleSelectRepository}
                  />
                ))}
              </AnimateStagger>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Footer */}
      {files.length > 0 && (
        <footer className='flex shrink-0 items-center justify-between border-t border-border-default bg-surface-primary px-6 py-3.5'>
          <div className='flex items-center gap-2'>
            {canProceed ? (
              <div className='flex items-center gap-2 rounded-lg bg-success-subtle/80 px-3 py-1.5 text-12 font-medium text-success-main'>
                <Icon
                  className='size-4 shrink-0 text-success-main'
                  name='lucide:check-circle-2'
                />
                <span>{t`All files ready for ingestion and indexing.`}</span>
              </div>
            ) : processingCount > 0 ? (
              <div className='flex items-center gap-2 text-12 text-accent-primary'>
                <Icon
                  className='size-4 shrink-0 animate-spin'
                  name='tabler:loader-2'
                />
                <span>{t`Wait for AI classification to finish before indexing.`}</span>
              </div>
            ) : (
              <div className='flex items-center gap-2 text-12 text-text-secondary'>
                <Icon
                  className='size-4 shrink-0 text-text-muted'
                  name='lucide:info'
                />
                <span>{t`Ensure all files have target repositories assigned.`}</span>
              </div>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <Button
              color='gray'
              disabled={isUploading}
              label={t`Cancel`}
              variant='outline'
              onClick={onBack}
            />
            <Button
              color='primary'
              disabled={!canProceed}
              icon={isUploading ? 'tabler:loader-2' : 'lucide:upload-cloud'}
              iconClass={isUploading ? 'animate-spin' : undefined}
              variant='solid'
              label={
                isUploading
                  ? t`Uploading (${uploadIndex}/${filesCount})...`
                  : t`Proceed to Indexing`
              }
              onClick={handleProceedToIndexing}
            />
          </div>
        </footer>
      )}
    </div>
  )
}
