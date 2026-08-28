import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import type { RepositoryFieldSchema } from '@/pages/requests/utils/repoFolderMetadata'
import { getRepositoryById } from '@/api/v6/folder/folder'
import IconButton from '@/components/base/button/IconButton'
import showToast from '@/components/base/toast/showToast'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import { setFieldForAttachment } from '@/pages/requests/utils/fieldAttachmentMap'
import {
  planRepositoryFolderMetadata,
  uploadInstanceAttachment,
} from '@/pages/requests/utils/instanceAttachmentUpload'
import { getFolderStructureFields } from '@/pages/requests/utils/repoFolderMetadata'
import Attachments from '../sections/attachment/Attachments'
import Comments from '../sections/comment/Comments'
import History from '../sections/history/History'
import AttachmentPreviewPanel from './AttachmentPreviewPanel'
import AttachmentSplitView from './AttachmentSplitView'

// A file picked through a form field, waiting on the one repository folder
// field that actually varies per document before it can be posted.
interface PendingFieldUpload {
  baseMetadata: Record<string, string>
  deepestField: RepositoryFieldSchema
  fieldId: string
  file: File
}

interface Props {
  // Fetched once at the Request level (so the header's attachment count and
  // this view's file-field display and Attachments panel all agree on the
  // same list instead of each fetching it separately).
  attachments: AttachmentItem[]
  formModel: Record<string, any>
  rawWorkflowData: any
  rightView: 'overview' | 'history' | 'attachments' | 'comments'
  selectedItem: any
  setRightView: (
    view: 'overview' | 'history' | 'attachments' | 'comments',
  ) => void
  onAttachmentsChanged?: () => void
  onFieldChange: (fieldId: string, value: any) => void
}

// Generic (non-Accounts-Payable) request detail: the submitted form
// rendered editable with the same component used to compose it in New
// Request, always visible on the left; History/Attachments/Comments open
// as a right-side panel driven by the header's icon buttons (rightView),
// using the existing workflow-agnostic components for those. Opening or
// uploading a file swaps the whole area for AttachmentSplitView, matching
// the New Request compose layout.
const GenericRequestOverview = ({
  attachments,
  formModel,
  rawWorkflowData,
  rightView,
  selectedItem,
  setRightView,
  onAttachmentsChanged,
  onFieldChange,
}: Props) => {
  const { t } = useLingui()
  const panels = useMemo(
    () => rawWorkflowData?.formJson?.panels || [],
    [rawWorkflowData],
  )

  const workflowId = rawWorkflowData?.id
  const instanceId = selectedItem?.workflowInstanceId || selectedItem?.processId
  const processId = selectedItem?.processId
  const repositoryId = rawWorkflowData?.repositoryId

  const showSidePanel = rightView !== 'overview'

  const [selectedAttachment, setSelectedAttachment] =
    useState<AttachmentItem | null>(null)
  // Full-screen file workspace (preview left, repository fields right) —
  // opened either by clicking an uploaded file or by picking a new one
  // through a form field.
  const [openedAttachment, setOpenedAttachment] =
    useState<AttachmentItem | null>(null)
  const [pendingUpload, setPendingUpload] = useState<PendingFieldUpload | null>(
    null,
  )
  const [isUploading, setIsUploading] = useState(false)
  const [folderFields, setFolderFields] = useState<RepositoryFieldSchema[]>([])

  useEffect(() => {
    setSelectedAttachment(null)
  }, [rightView, selectedItem])

  // The repository's folder-structure schema — both panes of the split
  // view read from it.
  useEffect(() => {
    if (!repositoryId) return
    let cancelled = false
    getRepositoryById(String(repositoryId)).then((res) => {
      if (cancelled) return
      setFolderFields(getFolderStructureFields(res?.data?.fields || []))
    })
    return () => {
      cancelled = true
    }
  }, [repositoryId])

  const handleRequestUpload = useCallback(
    async (fieldId: string, file: File) => {
      if (!workflowId || !instanceId || !repositoryId) return
      setIsUploading(true)
      try {
        const existingItem = attachments.find((a) => a.itemId)
        const { baseMetadata, deepestField } =
          await planRepositoryFolderMetadata(
            String(repositoryId),
            existingItem
              ? {
                  itemId: existingItem.itemId,
                  repositoryId: existingItem.repositoryId || repositoryId,
                }
              : undefined,
          )

        if (!deepestField) {
          const res = await uploadInstanceAttachment(
            workflowId,
            instanceId,
            repositoryId,
            file,
            baseMetadata,
          )
          if (res.error) {
            showToast({
              message: t`Failed to upload the file.`,
              variant: 'error',
            })
          } else {
            onAttachmentsChanged?.()
          }
          return
        }

        setPendingUpload({ baseMetadata, deepestField, fieldId, file })
      } finally {
        setIsUploading(false)
      }
    },
    [
      attachments,
      instanceId,
      repositoryId,
      workflowId,
      onAttachmentsChanged,
      t,
    ],
  )

  const handleConfirmUpload = async (value: string) => {
    if (!pendingUpload || !workflowId || !instanceId || !repositoryId) return
    setIsUploading(true)
    try {
      const metadata = {
        ...pendingUpload.baseMetadata,
        [pendingUpload.deepestField.sqlColumnName]: value,
      }
      const res = await uploadInstanceAttachment(
        workflowId,
        instanceId,
        repositoryId,
        pendingUpload.file,
        metadata,
      )
      if (res.error) {
        showToast({ message: t`Failed to upload the file.`, variant: 'error' })
        return
      }
      // Remember which field this file came from, so it renders under that
      // field (and not some other one) on the next load.
      const uploadedId = res.data?.itemId || res.data?.id || res.data?.fileId
      if (uploadedId) {
        setFieldForAttachment(instanceId, uploadedId, pendingUpload.fieldId)
      }
      setPendingUpload(null)
      onAttachmentsChanged?.()
    } finally {
      setIsUploading(false)
    }
  }

  if (pendingUpload) {
    return (
      <AttachmentSplitView
        file={pendingUpload.file}
        folderFields={folderFields}
        isSubmitting={isUploading}
        metadata={pendingUpload.baseMetadata}
        promptField={pendingUpload.deepestField}
        repositoryId={repositoryId}
        title={pendingUpload.file.name}
        onClose={() => setPendingUpload(null)}
        onConfirm={handleConfirmUpload}
      />
    )
  }

  if (openedAttachment) {
    return (
      <AttachmentSplitView
        attachment={openedAttachment}
        folderFields={folderFields}
        repositoryId={repositoryId}
        title={openedAttachment.name || t`Attachment`}
        onClose={() => setOpenedAttachment(null)}
      />
    )
  }

  return (
    <div className='flex min-h-0 flex-1 overflow-hidden'>
      <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
        <WorkflowFormRenderer
          attachments={attachments}
          formModel={formModel}
          instanceId={instanceId}
          panels={panels}
          onFieldChange={onFieldChange}
          onOpenAttachment={setOpenedAttachment}
          onRequestUpload={handleRequestUpload}
        />
      </div>

      {showSidePanel && (
        <div className='flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-gray-3 bg-gray-1'>
          {rightView === 'history' && (
            <div className='flex h-full min-h-0 flex-col'>
              <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
                <span className='text-xs font-semibold text-gray-12'>
                  {t`History`}
                </span>
                <IconButton
                  ariaLabel={t`Close`}
                  icon='tabler:x'
                  size='sm'
                  variant='ghost'
                  onClick={() => setRightView('overview')}
                />
              </div>
              <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
                <History
                  instanceId={instanceId}
                  processId={processId}
                  workflowId={workflowId}
                  enabled
                />
              </div>
            </div>
          )}
          {rightView === 'attachments' &&
            (selectedAttachment ? (
              <div className='flex h-full min-h-0 flex-col'>
                <AttachmentPreviewPanel
                  file={selectedAttachment}
                  repositoryId={repositoryId}
                  onBack={() => setSelectedAttachment(null)}
                />
              </div>
            ) : (
              <div className='flex h-full min-h-0 flex-col'>
                <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
                  <span className='text-xs font-semibold text-gray-12'>
                    {t`Attachments`}
                  </span>
                  <IconButton
                    ariaLabel={t`Close`}
                    icon='tabler:x'
                    size='sm'
                    variant='ghost'
                    onClick={() => setRightView('overview')}
                  />
                </div>
                <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
                  <Attachments
                    initialData={attachments}
                    instanceId={instanceId}
                    processId={processId}
                    repositoryId={repositoryId}
                    workflowId={workflowId}
                    enabled
                    onSelect={setOpenedAttachment}
                  />
                </div>
              </div>
            ))}
          {rightView === 'comments' && (
            <div className='flex h-full min-h-0 flex-col'>
              <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
                <span className='text-xs font-semibold text-gray-12'>
                  {t`Comments`}
                </span>
                <IconButton
                  ariaLabel={t`Close`}
                  icon='tabler:x'
                  size='sm'
                  variant='ghost'
                  onClick={() => setRightView('overview')}
                />
              </div>
              <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4'>
                <Comments
                  instanceId={instanceId}
                  processId={processId}
                  workflowId={workflowId}
                  enabled
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

GenericRequestOverview.displayName = 'GenericRequestOverview'
export default GenericRequestOverview
