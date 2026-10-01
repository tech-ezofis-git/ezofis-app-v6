import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getRepositoryById, uploadForOcr } from '@/api/v6/folder/folder'
import {
  bulkUpload,
  deleteStagedFiles,
  getBulkUploadJobStatus,
  indexStageFile,
  uploadWithOcr,
} from '@/api/v6/uploadAndIndex'
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

const repoFieldsCache = new Map<string, string[]>()

async function getOcrDescriptorsForRepository(repoId: string): Promise<string[]> {
  if (!repoId) return []
  if (repoFieldsCache.has(repoId)) {
    return repoFieldsCache.get(repoId)!
  }
  try {
    const { data } = await getRepositoryById(repoId)
    if (data?.fields && Array.isArray(data.fields)) {
      const descriptors = data.fields
        .map((f: { dataType?: string; name: string; sqlColumnName?: string }) => {
          const fieldName = f.sqlColumnName || f.name
          const fieldType = String(f.dataType || 'text').trim()
          return `${fieldName}, ${fieldType}`
        })
        .filter(Boolean)
      repoFieldsCache.set(repoId, descriptors)
      return descriptors
    }
  } catch (err) {
    console.warn('[IntelligentUpload] Failed to load repository fields for OCR:', err)
  }
  return []
}

interface IntelligentUploadViewProps {
  candidateRepositories: CandidateRepository[]
  repositoryId?: string | null
  onBack: () => void
  onDone: (targetRepositoryId?: string) => Promise<void> | void
  onOpenSingleFileIndexing?: (params: {
    file: File
    repositoryId: string
    stagedFileId?: string
  }) => void
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
  onOpenSingleFileIndexing,
}: IntelligentUploadViewProps) {
  const { t } = useLingui()
  const dropzoneRef = useRef<DropzoneUploadCardHandle | null>(null)
  const [files, setFiles] = useState<ClassifiedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadIndex, setUploadIndex] = useState(0)
  const [indexingFileId, setIndexingFileId] = useState<string | null>(null)
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false)

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

  // Start processing pending files sequentially (1 file at a time)
  useEffect(() => {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0 || activeProcessingCount.current >= 1) return

    const availableSlots = 1 - activeProcessingCount.current
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
                    ocrText: result.ocrText,
                    rationale: result.rationale,
                    selectedRepositoryId: topRepoId,
                    sourceReference: result.sourceReference,
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

          const rawMessage =
            error instanceof Error
              ? error.message
              : t`Failed to classify document`

          const isTechnicalJSError =
            typeof rawMessage === 'string' &&
            (rawMessage.includes('Cannot read properties') ||
              rawMessage.includes('toLowerCase') ||
              rawMessage.includes('TypeError') ||
              rawMessage.includes('is null') ||
              rawMessage.includes('is undefined') ||
              rawMessage.includes('is not a function'))

          const errorMessage = isTechnicalJSError
            ? t`Classification failed for this document. Please try again.`
            : rawMessage

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

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      const targetFile = files.find((f) => f.id === fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))

      if (targetFile?.stagedFileId && targetFile?.selectedRepositoryId) {
        void deleteStagedFiles({
          fileIds: [targetFile.stagedFileId],
          repositoryId: targetFile.selectedRepositoryId,
        })
      }
    },
    [files],
  )

  const handleRetry = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, error: undefined, status: 'pending' } : f,
      ),
    )
  }, [])

  // Single file staging & archiving handler
  const handleIndexSingleFile = async (fileId: string) => {
    if (isUploading || indexingFileId) return
    const targetFile = files.find((f) => f.id === fileId)
    if (!targetFile) return

    if (!targetFile.selectedRepositoryId) {
      showToast({
        message: t`Please select a target folder before indexing.`,
        variant: 'error',
      })
      return
    }

    setIndexingFileId(fileId)

    try {
      let stageId = targetFile.stagedFileId
      if (!stageId) {
        // Step 1: Call uploadForOcr with repository field descriptors
        const ocrDescriptors = await getOcrDescriptorsForRepository(
          targetFile.selectedRepositoryId,
        )
        const { data: ocrData, error: ocrError } = await uploadForOcr(
          targetFile.selectedRepositoryId,
          targetFile.file,
          ocrDescriptors,
        )

        const ocrFieldList = ocrData?.ocrFieldList
        const ocrJson =
          typeof ocrData?.ocrJson === 'string'
            ? ocrData.ocrJson
            : ocrData?.ocrJson
              ? JSON.stringify(ocrData.ocrJson)
              : undefined
        const ocrText = ocrData?.ocrText || targetFile.ocrText

        // Step 2: Call uploadWithOcr carrying forward the extracted OCR data
        const { data: stageData, error: stageError } = await uploadWithOcr({
          file: targetFile.file,
          ocrFieldList,
          ocrJson,
          ocrText,
          repositoryId: targetFile.selectedRepositoryId,
        })
        if (stageError || !stageData?.fileId) {
          throw new Error(
            stageError || ocrError || t`Failed to stage file for indexing`,
          )
        }
        stageId = stageData.fileId
      }

      if (onOpenSingleFileIndexing && targetFile.selectedRepositoryId) {
        onOpenSingleFileIndexing({
          file: targetFile.file,
          repositoryId: targetFile.selectedRepositoryId,
          stagedFileId: stageId,
        })
        return
      }

      const { error: indexError } = await indexStageFile(stageId, {
        fields: [],
        itemId: null,
        ocrResult: null,
        repositoryId: targetFile.selectedRepositoryId,
        status: 'Indexing',
      })

      const is400Error =
        indexError &&
        (indexError.includes('400') ||
          indexError.includes('mandatory metadata') ||
          indexError.includes('RepositoryFields'))

      if (indexError && !is400Error) throw new Error(indexError)

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, stagedFileId: stageId, status: 'uploaded' as const }
            : f,
        ),
      )

      const folderName =
        candidateRepositories.find(
          (r) => r.id === targetFile.selectedRepositoryId,
        )?.name ||
        targetFile.suggestions?.find(
          (s) => s.repositoryId === targetFile.selectedRepositoryId,
        )?.repositoryName ||
        t`target folder`

      const fileName = targetFile.file.name
      showToast({
        message: t`"${fileName}" successfully indexed to ${folderName}.`,
        variant: 'success',
      })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t`Failed to index document`
      showToast({ message: msg, variant: 'error' })
    } finally {
      setIndexingFileId(null)
    }
  }

  // Proceed to Indexing: Single vs Bulk Upload depending on selected repository counts
  const handleProceedToIndexing = async () => {
    const pendingUploadFiles = files.filter((f) => f.status !== 'uploaded')
    if (pendingUploadFiles.length === 0) {
      await onDone()
      return
    }
    if (isUploading || indexingFileId) return

    const unassigned = pendingUploadFiles.some((f) => !f.selectedRepositoryId)
    if (unassigned) {
      showToast({
        message: t`Please assign a folder for all files before proceeding.`,
        variant: 'error',
      })
      return
    }

    // If uploading only 1 file, navigate to the Document Indexing page directly
    if (pendingUploadFiles.length === 1 && onOpenSingleFileIndexing) {
      const singleFile = pendingUploadFiles[0]
      await handleIndexSingleFile(singleFile.id)
      return
    }

    setIsUploading(true)
    let processedCount = 0
    const successfullyIndexedRepoIds = new Set<string>()

    console.log(
      '[IntelligentUpload] Starting batch indexing for pending files:',
      pendingUploadFiles.map((f) => ({
        fileName: f.file.name,
        selectedRepositoryId: f.selectedRepositoryId,
      })),
    )

    try {
      const groupedByRepo = new Map<string, ClassifiedFile[]>()
      pendingUploadFiles.forEach((fileItem) => {
        const repoId = fileItem.selectedRepositoryId!
        const existing = groupedByRepo.get(repoId) || []
        groupedByRepo.set(repoId, [...existing, fileItem])
      })

      console.log(
        '[IntelligentUpload] Grouped repositories:',
        Array.from(groupedByRepo.entries()).map(([repoId, list]) => ({
          filesCount: list.length,
          repoId,
        })),
      )

      for (const [repoId, groupFiles] of groupedByRepo.entries()) {
        console.log(
          `[IntelligentUpload] Processing repository group repoId=${repoId}, count=${groupFiles.length}`,
        )
        if (groupFiles.length > 1) {
          // Repository group has > 1 file -> Call Bulk Upload API
          const filesToUpload = groupFiles.map((item) => item.file)
          const { data: bulkRes, error: bulkErr } = await bulkUpload({
            files: filesToUpload,
            repositoryId: repoId,
          })

          if (bulkErr || !bulkRes) {
            showToast({
              message: bulkErr || t`Bulk upload failed for target folder`,
              variant: 'error',
            })
            continue
          }

          if (bulkRes.jobId) {
            let isDone = false
            let pollAttempts = 0
            while (!isDone && pollAttempts < 30) {
              pollAttempts++
              await new Promise((res) => setTimeout(res, 2000))
              const { data: jobStatus } = await getBulkUploadJobStatus(
                bulkRes.jobId,
              )
              if (
                jobStatus &&
                jobStatus.isTerminal &&
                jobStatus.ocrPending === 0
              ) {
                isDone = true
              }
            }
          }

          const stagedList = bulkRes.files || []
          for (let i = 0; i < groupFiles.length; i++) {
            const item = groupFiles[i]
            if (!item) continue
            const stagedInfo = stagedList[i]
            const stageId = stagedInfo?.fileId || item.stagedFileId

            if (stageId) {
              const { error: indexErr } = await indexStageFile(stageId, {
                fields: [],
                itemId: null,
                ocrResult: null,
                repositoryId: repoId,
                status: 'Indexing',
              })

              const is400Err =
                indexErr &&
                (indexErr.includes('400') ||
                  indexErr.includes('mandatory metadata') ||
                  indexErr.includes('RepositoryFields'))

              if (indexErr && !is400Err) {
                const itemName = item.file.name
                showToast({
                  message: indexErr || t`Failed to index ${itemName}`,
                  variant: 'error',
                })
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === item.id
                      ? { ...f, error: indexErr, status: 'error' }
                      : f,
                  ),
                )
                continue
              }
            }

            processedCount++
            successfullyIndexedRepoIds.add(repoId)
            setUploadIndex(processedCount)
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, stagedFileId: stageId, status: 'uploaded' }
                  : f,
              ),
            )
          }
        } else {
          // Repository group has exactly 1 file -> Call uploadForOcr first, then uploadWithOcr
          const item = groupFiles[0]
          if (!item) continue

          let stageId = item.stagedFileId
          if (!stageId) {
            // Step 1: Call uploadForOcr carrying repository field descriptors
            const ocrDescriptors = await getOcrDescriptorsForRepository(repoId)
            const { data: ocrData, error: ocrError } = await uploadForOcr(
              repoId,
              item.file,
              ocrDescriptors,
            )

            const ocrFieldList = ocrData?.ocrFieldList
            const ocrJson =
              typeof ocrData?.ocrJson === 'string'
                ? ocrData.ocrJson
                : ocrData?.ocrJson
                  ? JSON.stringify(ocrData.ocrJson)
                  : undefined
            const ocrText = ocrData?.ocrText || item.ocrText

            // Step 2: Call uploadWithOcr carrying forward OCR data
            const { data: stageData, error: stageError } = await uploadWithOcr({
              file: item.file,
              ocrFieldList,
              ocrJson,
              ocrText,
              repositoryId: repoId,
            })

            if (stageError || !stageData?.fileId) {
              const itemName = item.file.name
              showToast({
                message:
                  stageError || ocrError || t`Upload failed for ${itemName}`,
                variant: 'error',
              })
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === item.id
                    ? {
                        ...f,
                        error:
                          stageError ||
                          ocrError ||
                          t`Upload failed for ${itemName}`,
                        status: 'error',
                      }
                    : f,
                ),
              )
              continue
            }
            stageId = stageData.fileId
          }

          const { error: indexErr } = await indexStageFile(stageId, {
            fields: [],
            itemId: null,
            ocrResult: null,
            repositoryId: repoId,
            status: 'Indexing',
          })

          const is400Err =
            indexErr &&
            (indexErr.includes('400') ||
              indexErr.includes('mandatory metadata') ||
              indexErr.includes('RepositoryFields'))

          if (indexErr && !is400Err) {
            const itemName = item.file.name
            showToast({
              message: indexErr || t`Failed to index ${itemName}`,
              variant: 'error',
            })
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, error: indexErr, status: 'error' }
                  : f,
              ),
            )
            continue
          }

          processedCount++
          successfullyIndexedRepoIds.add(repoId)
          setUploadIndex(processedCount)
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, stagedFileId: stageId, status: 'uploaded' }
                : f,
            ),
          )
        }
      }

      const totalPending = pendingUploadFiles.length
      console.log('[IntelligentUpload] Batch processing complete.', {
        processedCount,
        successfullyIndexedRepoIds: Array.from(successfullyIndexedRepoIds),
        totalPending,
        uniqueRepoCount: successfullyIndexedRepoIds.size,
      })

      if (processedCount > 0 && processedCount === totalPending) {
        if (successfullyIndexedRepoIds.size === 1) {
          const singleTargetRepoId = Array.from(successfullyIndexedRepoIds)[0]
          console.log(
            '[IntelligentUpload] Calling onDone with single targetRepoId:',
            singleTargetRepoId,
          )
          showToast({
            message:
              processedCount === 1
                ? t`Document successfully ingested and indexed.`
                : t`All ${processedCount} documents successfully ingested and indexed.`,
            variant: 'success',
          })
          await onDone(singleTargetRepoId)
        } else {
          console.log('[IntelligentUpload] Calling onDone for multiple folders')
          showToast({
            message: t`All ${processedCount} documents successfully ingested and indexed.`,
            variant: 'success',
          })
          await onDone()
        }
      } else if (processedCount > 0) {
        showToast({
          message: t`Indexed ${processedCount} of ${totalPending} document(s). Please review failed files.`,
          variant: 'warning',
        })
      }
    } catch (err: unknown) {
      console.error(err)
      showToast({
        message: t`An error occurred during indexing.`,
        variant: 'error',
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Derived metrics
  const filesCount = files.length
  const uploadedCount = files.filter((f) => f.status === 'uploaded').length
  const doneCount = files.filter(
    (f) => f.status === 'done' || f.status === 'uploaded',
  ).length
  const processingCount = files.filter(
    (f) => f.status === 'processing' || f.status === 'pending',
  ).length
  const pendingUploadFiles = files.filter((f) => f.status !== 'uploaded')
  const pendingUploadCount = pendingUploadFiles.length
  const allIndexed = filesCount > 0 && pendingUploadCount === 0

  const canProceed =
    filesCount > 0 &&
    !isUploading &&
    !indexingFileId &&
    processingCount === 0 &&
    (allIndexed ||
      pendingUploadFiles.every(
        (f) => Boolean(f.selectedRepositoryId) && f.status !== 'error',
      ))

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
              {t`Drop multiple files to automatically classify document types and route to target folders.`}
            </p>
          </div>
        </div>

        {/* Action button if queue has items */}
        {files.length > 0 && (
          <Button
            color='primary'
            disabled={isUploading}
            icon='lucide:plus'
            label={t`Add more files`}
            size='md'
            variant='solid'
            onClick={() => dropzoneRef.current?.open()}
          />
        )}
      </header>

      {/* Main Content Area */}
      <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'>
        <div className='mx-auto max-w-4xl space-y-4'>
          {/* Empty State: Dropzone */}
          {files.length === 0 ? (
            <AnimateFadeIn className='space-y-3.5'>
              <FileUpload
                accept={DOCUMENT_ACCEPT}
                fileTypeIcons={FILE_TYPE_ICONS}
                heightClassName='h-[180px]'
                helperText={t`Support for PDF, PNG, TIFF, JPG up to 50MB.`}
                ref={dropzoneRef}
                subtitle={t`Drag and drop documents here, or click to browse. Ezofis AI will classify and route them automatically.`}
                title={t`Upload Documents for AI Classification`}
                multiple
                onFiles={handleFilesAdded}
              />

              <div className='grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3'>
                <div className='flex items-start gap-3 rounded-xl border border-border-default bg-surface-primary p-3 shadow-xs'>
                  <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-primary'>
                    <AiBrandIcon
                      className='size-3.5'
                      variant='outline-purple'
                    />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3 className='text-12 font-semibold text-text-primary'>
                      {t`Semantic Classification`}
                    </h3>
                    <p className='mt-0.5 line-clamp-2 min-h-[2rem] text-11 leading-relaxed text-text-secondary'>
                      {t`AI analyzes document content and structures to identify types and metadata.`}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-xl border border-border-default bg-surface-primary p-3 shadow-xs'>
                  <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success-main'>
                    <span className='text-13 font-bold'>%</span>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3 className='text-12 font-semibold text-text-primary'>
                      {t`Confidence Scoring`}
                    </h3>
                    <p className='mt-0.5 line-clamp-2 min-h-[2rem] text-11 leading-relaxed text-text-secondary'>
                      {t`Receive transparent confidence rankings for top candidate folder matches.`}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-xl border border-border-default bg-surface-primary p-3 shadow-xs'>
                  <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-2 text-blue-9'>
                    <span className='text-13 font-bold'>⇄</span>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3 className='text-12 font-semibold text-text-primary'>
                      {t`Full User Control`}
                    </h3>
                    <p className='mt-0.5 line-clamp-2 min-h-[2rem] text-11 leading-relaxed text-text-secondary'>
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
                  {uploadedCount > 0 && (
                    <>
                      <span className='text-12 text-text-secondary'>•</span>
                      <span className='inline-flex items-center gap-1 text-12 font-medium text-success-main'>
                        <Icon
                          className='size-3.5'
                          name='lucide:check-circle-2'
                        />
                        {t`${uploadedCount} indexed`}
                      </span>
                    </>
                  )}
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
                  <div className='flex items-center gap-3'>
                    <div className='text-12 font-medium text-accent-primary'>
                      {t`Uploading file ${uploadIndex} of ${pendingUploadCount}...`}
                    </div>
                    <Button
                      color='gray'
                      size='xs'
                      variant='outline'
                      icon={
                        isQueueCollapsed
                          ? 'lucide:chevron-down'
                          : 'lucide:chevron-up'
                      }
                      label={
                        isQueueCollapsed ? t`Show details` : t`Hide details`
                      }
                      onClick={() => setIsQueueCollapsed(!isQueueCollapsed)}
                    />
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

              {/* File Cards List - Collapsible during batch upload */}
              {!isQueueCollapsed && (
                <AnimateStagger className='space-y-3'>
                  {files.map((fileItem) => (
                    <IntelligentUploadFileCard
                      candidateRepositories={candidateRepositories}
                      fileItem={fileItem}
                      key={fileItem.id}
                      isIndexing={
                        indexingFileId === fileItem.id ||
                        (isUploading &&
                          fileItem.status !== 'uploaded' &&
                          fileItem.status !== 'error')
                      }
                      onIndexSingleFile={handleIndexSingleFile}
                      onRemove={handleRemoveFile}
                      onRetry={handleRetry}
                      onSelectRepository={handleSelectRepository}
                    />
                  ))}
                </AnimateStagger>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Footer */}
      {files.length > 0 && (
        <footer className='flex shrink-0 items-center justify-between border-t border-border-default bg-surface-primary px-6 py-3.5'>
          <div className='flex items-center gap-2'>
            {allIndexed ? (
              <div className='flex items-center gap-2 rounded-lg bg-success-subtle/80 px-3 py-1.5 text-12 font-medium text-success-main'>
                <Icon
                  className='size-4 shrink-0 text-success-main'
                  name='lucide:check-circle-2'
                />
                <span>{t`All files successfully ingested and indexed.`}</span>
              </div>
            ) : canProceed ? (
              <div className='flex items-center gap-2 rounded-lg bg-success-subtle/80 px-3 py-1.5 text-12 font-medium text-success-main'>
                <Icon
                  className='size-4 shrink-0 text-success-main'
                  name='lucide:check-circle-2'
                />
                <span>
                  {uploadedCount > 0
                    ? t`Remaining files ready for indexing.`
                    : t`All files ready for ingestion and indexing.`}
                </span>
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
                <span>{t`Ensure all files have target folders assigned.`}</span>
              </div>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <Button
              color='gray'
              disabled={isUploading || Boolean(indexingFileId)}
              label={allIndexed ? t`Back to Explorer` : t`Cancel`}
              variant='outline'
              onClick={onBack}
            />
            {allIndexed ? (
              <Button
                color='primary'
                icon='lucide:check'
                label={t`Done`}
                variant='solid'
                onClick={async () => {
                  await onDone()
                }}
              />
            ) : (
              <Button
                color='primary'
                disabled={!canProceed}
                icon={isUploading ? 'tabler:loader-2' : 'lucide:upload-cloud'}
                iconClass={isUploading ? 'animate-spin' : undefined}
                variant='solid'
                label={
                  isUploading
                    ? t`Uploading (${uploadIndex}/${pendingUploadCount})...`
                    : uploadedCount > 0
                      ? t`Index Remaining (${pendingUploadCount})`
                      : t`Proceed to Indexing`
                }
                onClick={handleProceedToIndexing}
              />
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
