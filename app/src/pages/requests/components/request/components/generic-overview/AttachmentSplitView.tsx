import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import folderApi from '@/pages/folders/api/folderApi'
import { getFileExtension } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { useAttachmentPreviewUrl } from '@/pages/requests/hooks/useAttachmentPreviewUrl'
import {
  parseFieldOptionValues,
  type RepositoryFieldSchema,
} from '@/pages/requests/utils/repoFolderMetadata'
import type { DetailCard } from './DocumentFieldCards'
import DocumentFieldCards from './DocumentFieldCards'

interface Props {
  // Every folder-structure field of the repository, deepest last. Only used
  // for a not-yet-uploaded file, which has no repository item to read field
  // data back from yet — an already-uploaded attachment shows the same
  // sectioned cards the folders' document view does instead.
  folderFields: RepositoryFieldSchema[]
  title: string
  // An already-uploaded attachment (preview + field data are fetched from
  // the repository).
  attachment?: AttachmentItem | null
  // A locally-picked file awaiting upload (preview comes from an object
  // URL); mutually exclusive with `attachment`.
  file?: File | null
  isSubmitting?: boolean
  // Only used for the pending-upload fallback cards (attachment mode fetches
  // its own real field data — see the getDocumentDetail effect below).
  metadata?: Record<string, string>
  // Set only in the upload flow — the one field the uploader must fill in
  // before the file can be posted.
  promptField?: RepositoryFieldSchema | null
  repositoryId?: string | number
  onClose: () => void
  onConfirm?: (value: string) => void
}

const isPdf = (name: string, type?: string) =>
  type === 'application/pdf' || getFileExtension(name) === 'pdf'

const isImage = (name: string, type?: string) =>
  Boolean(type?.startsWith('image/')) ||
  ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(getFileExtension(name))

// Full-screen document workspace for a generic request's attachments: file
// preview on the left, repository fields on the right. For an
// already-uploaded file the right pane is the same workspace-driven field
// UI the folders' document view uses (folderApi.getDocumentDetail →
// infoCards → DocumentFieldCards), so a document reads identically whether
// it's opened from Folders or from a request. For a file still being
// uploaded there is no repository item to read yet, so the pane falls back
// to the folder-path values inherited from the instance plus the one field
// the uploader still has to supply.
const AttachmentSplitView = ({
  attachment,
  file,
  folderFields,
  isSubmitting,
  metadata,
  promptField,
  repositoryId,
  title,
  onClose,
  onConfirm,
}: Props) => {
  const { t } = useLingui()
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [cards, setCards] = useState<DetailCard[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)

  useEffect(() => {
    if (!file) {
      setLocalUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Same call the folders' document view makes for its field panel.
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
  const promptOptions = promptField ? parseFieldOptionValues(promptField) : []

  // Pre-upload fallback: the folder path this file is about to land under,
  // shaped like the workspace's own cards so both states render through the
  // same component.
  const pendingCards = useMemo((): DetailCard[] => {
    const rows = folderFields
      .filter((f) => f.id !== promptField?.id)
      .map((f) => ({
        label: f.name,
        value: metadata?.[f.sqlColumnName] || '-',
      }))
    if (rows.length === 0) return []
    return [
      { iconKey: 'fileText', id: 'folder-path', rows, title: t`Document Info` },
    ]
  }, [folderFields, metadata, promptField, t])

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-1'>
      <div className='flex shrink-0 items-center gap-2 border-b border-gray-3 bg-surface px-4 py-2.5'>
        <button
          className='group flex cursor-pointer items-center gap-1 text-xs font-semibold text-gray-11 transition-all hover:text-gray-13 active:scale-95'
          type='button'
          onClick={onClose}
        >
          <Icon
            className='size-4 transition-transform group-hover:-translate-x-0.5'
            name='tabler:arrow-left'
          />
          <span>{t`Back`}</span>
        </button>
        <div className='mx-1 h-4 w-px bg-gray-3' />
        <span
          className='min-w-0 flex-1 truncate text-13 font-semibold text-gray-13'
          title={displayName}
        >
          {displayName}
        </span>
      </div>

      <div className='flex min-h-0 flex-1 gap-5 overflow-hidden p-4'>
        <div className='min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-3 bg-surface'>
          <DocumentPreviewViewer
            fileName={displayName}
            fileUrl={previewUrl}
            isImage={isImage(displayName, previewType)}
            isLoading={Boolean(attachment) && isLoading}
            isPdf={isPdf(displayName, previewType)}
          />
        </div>

        <aside className='flex w-[400px] shrink-0 flex-col overflow-hidden'>
          <div className='min-h-0 flex-1 overflow-y-auto pr-0.5'>
            {isLoadingFields ? (
              <div className='flex items-center justify-center gap-2 py-10 text-13 text-gray-9'>
                <Icon
                  className='size-4 animate-spin text-primary-9'
                  name='tabler:loader-2'
                />
                <span>{t`Loading field data…`}</span>
              </div>
            ) : (
              <DocumentFieldCards cards={attachment ? cards : pendingCards} />
            )}

            {promptField && (
              <div className='mt-4 rounded-xl border border-primary-4 bg-primary-1/40 p-4'>
                <p className='mb-3 text-12 font-medium text-gray-11'>
                  {t`One more detail is needed before this file can be uploaded.`}
                </p>
                {promptOptions.length > 0 ? (
                  <InputSelect
                    label={promptField.name}
                    options={promptOptions.map((o) => ({ id: o, name: o }))}
                    required
                    value={
                      promptValue
                        ? { id: promptValue, name: promptValue }
                        : null
                    }
                    onChange={(opt) =>
                      setPromptValue(opt ? String(opt.id) : '')
                    }
                  />
                ) : (
                  <InputText
                    label={promptField.name}
                    value={promptValue}
                    required
                    onChange={setPromptValue}
                  />
                )}
              </div>
            )}
          </div>

          {promptField && (
            <div className='mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-gray-3 pt-3'>
              <Button
                disabled={isSubmitting}
                label={t`Cancel`}
                variant='outline'
                onClick={onClose}
              />
              <Button
                disabled={isSubmitting || !promptValue.trim()}
                label={t`Upload`}
                loading={isSubmitting}
                variant='solid'
                onClick={() => onConfirm?.(promptValue.trim())}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

AttachmentSplitView.displayName = 'AttachmentSplitView'
export default AttachmentSplitView
