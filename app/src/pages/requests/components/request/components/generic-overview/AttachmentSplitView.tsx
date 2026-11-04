import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import folderApi from '@/pages/folders/api/folderApi'
import { getFileExtension } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { useAttachmentPreviewUrl } from '@/pages/requests/hooks/useAttachmentPreviewUrl'
import {
  applyDateFieldDefaults,
  applyFilenamePreFill,
  getMissingIndexingFields,
  type RepositoryFieldSchema,
} from '@/pages/requests/utils/repoFolderMetadata'
import cn from '@/utils/cn'
import type { DetailCard } from './DocumentFieldCards'
import DocumentFieldCards from './DocumentFieldCards'
import IndexingFieldsForm from './IndexingFieldsForm'

interface Props {
  // Every folder-structure field of the repository. Used as editable
  // indexing controls while a file is still being uploaded.
  folderFields: RepositoryFieldSchema[]
  title: string
  // An already-uploaded attachment (preview + field data are fetched from
  // the repository).
  attachment?: AttachmentItem | null
  // A locally-picked file awaiting upload (preview comes from an object
  // URL); mutually exclusive with `attachment`.
  file?: File | null
  isSubmitting?: boolean
  // Seeded values for the pending-upload form (inherited from an existing
  // attachment on this request, OCR, and matching form fields).
  metadata?: Record<string, string>
  repositoryId?: string | number
  onClose: () => void
  onConfirm?: (values: Record<string, string>) => void
}

const isPdf = (name: string, type?: string) =>
  type === 'application/pdf' || getFileExtension(name) === 'pdf'

const isImage = (name: string, type?: string) =>
  Boolean(type?.startsWith('image/')) ||
  ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(getFileExtension(name))

const seedIndexingValues = (
  folderFields: RepositoryFieldSchema[],
  metadata?: Record<string, string>,
  fileName?: string,
): Record<string, string> => {
  const next: Record<string, string> = {}
  for (const field of folderFields) {
    next[field.sqlColumnName] = String(
      metadata?.[field.sqlColumnName] || metadata?.[field.name] || '',
    ).trim()
  }
  return applyDateFieldDefaults(
    applyFilenamePreFill(next, folderFields, fileName),
    folderFields,
  )
}

// Full-screen document workspace for a generic request's attachments: file
// preview on the left, repository fields on the right. For an
// already-uploaded file the right pane is the same workspace-driven field
// UI the folders' document view uses (folderApi.getDocumentDetail →
// infoCards → DocumentFieldCards). For a file still being uploaded every
// repository field is an editable control, pre-filled with inherited / OCR
// values, so the uploader can change existing data and fill blanks before
// confirming.
const AttachmentSplitView = ({
  attachment,
  file,
  folderFields,
  isSubmitting,
  metadata,
  repositoryId,
  title,
  onClose,
  onConfirm,
}: Props) => {
  const { t } = useLingui()
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [cards, setCards] = useState<DetailCard[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  // Phones (768px and below) show one pane at a time; both stay mounted so
  // switching tabs never reloads the preview or refetches the fields.
  const [mobileTab, setMobileTab] = useState<'details' | 'preview'>('preview')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    seedIndexingValues(folderFields, metadata, file?.name),
  )

  useEffect(() => {
    setFieldValues(seedIndexingValues(folderFields, metadata, file?.name))
    setAttemptedSubmit(false)
  }, [file?.name, folderFields, metadata])

  // A newly opened attachment starts on its preview.
  useEffect(() => {
    setMobileTab('preview')
  }, [attachment?.id, attachment?.itemId, file])

  useEffect(() => {
    if (!file) {
      setLocalUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const attachmentItemId = attachment?.itemId || attachment?.id
  const attachmentRepoId = attachment?.repositoryId || repositoryId
  useEffect(() => {
    if (!attachmentItemId || !attachmentRepoId) {
      setCards([])
      return
    }
    let cancelled = false
    setIsLoadingFields(true)
    folderApi
      .getDocumentDetail(String(attachmentRepoId), String(attachmentItemId))
      .then((detail) => {
        if (!cancelled) setCards(detail?.infoCards || [])
      })
      .catch((e) => {
        console.error('Error loading attachment field data:', e)
        if (!cancelled) setCards([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFields(false)
      })
    return () => {
      cancelled = true
    }
  }, [attachmentItemId, attachmentRepoId])

  const {
    isLoading,
    mimeType,
    previewUrl: remoteUrl,
  } = useAttachmentPreviewUrl(attachment ?? null, repositoryId)

  const displayName =
    file?.name || attachment?.name || attachment?.fileName || title
  const previewUrl = file ? localUrl : remoteUrl
  const previewType = file ? file.type : mimeType || undefined
  const isPendingUpload = Boolean(file) && Boolean(onConfirm)
  const missingFields = useMemo(
    () => getMissingIndexingFields(folderFields, fieldValues),
    [folderFields, fieldValues],
  )

  const handleUpload = () => {
    setAttemptedSubmit(true)
    if (missingFields.length > 0) {
      // Required fields live on the details tab on phones.
      setMobileTab('details')
      return
    }
    onConfirm?.(fieldValues)
  }

  const mobileTabs: { id: 'details' | 'preview'; label: string }[] = [
    { id: 'preview', label: t`File Preview` },
    { id: 'details', label: t`Document Details` },
  ]
  const showMissingDot =
    isPendingUpload && attemptedSubmit && missingFields.length > 0

  let infoPane = <DocumentFieldCards cards={cards} />
  if (isLoadingFields) {
    infoPane = (
      <div className='flex items-center justify-center gap-2 py-10 text-13 text-gray-9'>
        <Icon
          className='size-4 animate-spin text-primary-9'
          name='tabler:loader-2'
        />
        <span>{t`Loading field data…`}</span>
      </div>
    )
  }
  if (isPendingUpload) {
    infoPane = (
      <IndexingFieldsForm
        attemptedSubmit={attemptedSubmit}
        folderFields={folderFields}
        repositoryId={repositoryId}
        values={fieldValues}
        onChange={(sqlColumnName, value) =>
          setFieldValues((prev) => ({
            ...prev,
            [sqlColumnName]: value,
          }))
        }
      />
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-1'>
      <div className='flex min-w-0 shrink-0 items-center gap-2 border-b border-gray-3 bg-surface px-3 py-2.5 sm:px-4'>
        <button
          className='group flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-gray-11 transition-all hover:text-gray-13 active:scale-95'
          type='button'
          onClick={onClose}
        >
          <Icon
            className='size-4 transition-transform group-hover:-translate-x-0.5'
            name='tabler:arrow-left'
          />
          <span>{t`Back`}</span>
        </button>
        <div className='mx-1 h-4 w-px shrink-0 bg-gray-3' />
        <span
          className='min-w-0 flex-1 truncate text-13 font-semibold text-gray-13'
          title={displayName}
        >
          {displayName}
        </span>
      </div>

      {/* Phones: switch between the file and its fields. */}
      <div
        aria-label={t`Attachment view`}
        className='flex shrink-0 gap-5 border-b border-gray-3 bg-surface px-3 min-[769px]:hidden'
        role='tablist'
      >
        {mobileTabs.map((tab) => (
          <button
            aria-selected={mobileTab === tab.id}
            key={tab.id}
            role='tab'
            type='button'
            className={cn(
              'relative -mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-13 font-medium whitespace-nowrap transition-colors active:scale-95',
              mobileTab === tab.id
                ? 'border-accent-primary text-gray-13'
                : 'border-transparent text-gray-10 hover:text-gray-12',
            )}
            onClick={() => setMobileTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'details' && showMissingDot ? (
              <span className='size-1.5 rounded-full bg-red-9' />
            ) : null}
          </button>
        ))}
      </div>

      <div className='flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden p-3 min-[769px]:gap-4 min-[769px]:p-4 lg:gap-5'>
        <div
          className={cn(
            'min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-3 bg-surface',
            mobileTab === 'details' && 'max-[768px]:hidden',
          )}
        >
          <DocumentPreviewViewer
            fileName={displayName}
            fileUrl={previewUrl}
            isImage={isImage(displayName, previewType)}
            isLoading={Boolean(attachment) && isLoading}
            isPdf={isPdf(displayName, previewType)}
          />
        </div>

        {/* Phones: full width. Tablets: scales with the screen. Desktop: 400px. */}
        <aside
          className={cn(
            'flex w-full min-w-0 flex-col overflow-hidden min-[769px]:w-[clamp(280px,40%,400px)] min-[769px]:shrink-0 lg:w-[400px]',
            mobileTab === 'preview' && 'max-[768px]:hidden',
          )}
        >
          <div className='min-h-0 flex-1 overflow-y-auto pr-0.5'>
            {infoPane}
          </div>

          {isPendingUpload && (
            <div className='mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-gray-3 pt-3 max-[768px]:hidden'>
              <Button
                disabled={isSubmitting}
                label={t`Cancel`}
                variant='outline'
                onClick={onClose}
              />
              <Button
                disabled={isSubmitting}
                label={t`Upload`}
                loading={isSubmitting}
                variant='solid'
                onClick={handleUpload}
              />
            </div>
          )}
        </aside>
      </div>

      {/* Phones: Cancel / Upload stay reachable from either tab. */}
      {isPendingUpload && (
        <div className='flex shrink-0 items-center justify-end gap-2 border-t border-gray-3 bg-surface px-3 py-2.5 min-[769px]:hidden'>
          <Button
            disabled={isSubmitting}
            label={t`Cancel`}
            variant='outline'
            onClick={onClose}
          />
          <Button
            disabled={isSubmitting}
            label={t`Upload`}
            loading={isSubmitting}
            variant='solid'
            onClick={handleUpload}
          />
        </div>
      )}
    </div>
  )
}

AttachmentSplitView.displayName = 'AttachmentSplitView'
export default AttachmentSplitView
