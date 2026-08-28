import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import type { RepositoryFieldSchema } from '@/pages/requests/utils/repoFolderMetadata'
import { getRepositoryById, uploadForOcr } from '@/api/v6/folder/folder'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import IconButton from '@/components/base/button/IconButton'
import showToast from '@/components/base/toast/showToast'
import authUserStore from '@/stores/authUserStore'
import {
  buildRepoFieldHints,
  buildRepoMetadata,
  extractOcrText,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
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
import TaskRequirements from './TaskRequirements'

interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

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
  // Manual User (INTERNAL_ACTOR) task requirements for the current stage,
  // owned/gated by Request.tsx before it lets the action buttons submit.
  checklistChecked?: Record<string, boolean>
  checklistItems?: ChecklistItem[]
  documentRequired?: boolean
  signatureConfirmed?: boolean
  userSignatureRequired?: boolean
  setRightView: (
    view: 'overview' | 'history' | 'attachments' | 'comments',
  ) => void
  onAttachmentsChanged?: () => void
  onChecklistToggle?: (id: string, checked: boolean) => void
  onFieldChange: (fieldId: string, value: any) => void
  onSignatureToggle?: (confirmed: boolean) => void
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
  checklistChecked = {},
  checklistItems = [],
  documentRequired = false,
  signatureConfirmed = false,
  userSignatureRequired = false,
  setRightView,
  onAttachmentsChanged,
  onChecklistToggle,
  onFieldChange,
  onSignatureToggle,
}: Props) => {
  const { t } = useLingui()
  const panels = useMemo(
    () => rawWorkflowData?.formJson?.panels || [],
    [rawWorkflowData],
  )

  // The current activity's block carries the Manual User (INTERNAL_ACTOR)
  // Security & Form Access settings authored in the workflow builder -
  // which fields this acting user can edit/see at this stage.
  const currentBlock = useMemo(() => {
    const activityId = selectedItem?.activityId
    if (!activityId) return null
    return (
      (rawWorkflowData?.workflowJson?.blocks || []).find(
        (b: any) => b.id === activityId,
      ) || null
    )
  }, [rawWorkflowData, selectedItem?.activityId])
  const blockSettings: Record<string, any> = currentBlock?.settings || {}

  const allFieldIds = useMemo(() => {
    const ids: string[] = []
    panels.forEach((panel: any) =>
      (panel.fields || []).forEach((f: any) => ids.push(String(f.id))),
    )
    return ids
  }, [panels])

  const currentUserId = String(authUserStore.getState().session?.id || '')

  const readOnlyFieldIds = useMemo(() => {
    const access = blockSettings.formEditAccess || 'ALL'
    if (access === 'ALL') return undefined
    if (access === 'NONE') return new Set(allFieldIds)
    const rules = Array.isArray(blockSettings.formEditControls)
      ? blockSettings.formEditControls
      : []
    const rule = rules.find((r: any) => String(r.userId) === currentUserId)
    const editable = new Set((rule?.formFields || []).map(String))
    return new Set(allFieldIds.filter((id) => !editable.has(id)))
  }, [blockSettings, allFieldIds, currentUserId])

  const hiddenFieldIds = useMemo(() => {
    const access = blockSettings.formVisibilityAccess || 'ALL'
    if (access === 'ALL') return undefined
    if (access === 'NONE') return new Set(allFieldIds)
    const rules = Array.isArray(blockSettings.formSecureControls)
      ? blockSettings.formSecureControls
      : []
    const rule = rules.find((r: any) => String(r.userId) === currentUserId)
    // No rule for this user under a CUSTOM policy - default to visible
    // rather than surprising the user by hiding fields nobody configured.
    if (!rule) return undefined
    const visible = new Set((rule.formFields || []).map(String))
    return new Set(allFieldIds.filter((id) => !visible.has(id)))
  }, [blockSettings, allFieldIds, currentUserId])

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
        // Nothing on this instance yet to inherit a folder path from — this
        // is effectively the same situation as New Request's own first
        // upload, so follow the exact same two-phase flow (OCR peek, then
        // uploadWithOcr with metadata pulled from the form's own fields)
        // and land the result straight on the field's formData value,
        // instead of creating a standalone instance attachment.
        if (attachments.length === 0) {
          const repoFieldHints = buildRepoFieldHints(folderFields)
          const { data: ocrData, error: ocrError } = await uploadForOcr(
            String(repositoryId),
            file,
            repoFieldHints,
          )
          if (ocrError) {
            console.warn('[uploadForOcr] OCR extraction warning:', ocrError)
          }

          const { data, error } = await uploadAndIndexApi.uploadWithOcr({
            fields: repoFieldHints,
            file,
            metadata: buildRepoMetadata(
              folderFields,
              panels,
              formModel,
              file.name,
            ),
            ocrFieldList: ocrData?.ocrFieldList,
            ocrJson: ocrData?.ocrJson,
            ocrText: extractOcrText(ocrData?.ocrJson),
            repositoryId: String(repositoryId),
          })

          if (error || !data) {
            showToast({
              message: t`Failed to upload the file.`,
              variant: 'error',
            })
            return
          }

          onFieldChange(fieldId, {
            fileId: data.fileId,
            fileName: file.name,
            ocrChecked: true,
            repositoryId: data.repositoryId || repositoryId,
          })
          return
        }

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
      folderFields,
      formModel,
      instanceId,
      panels,
      repositoryId,
      workflowId,
      onAttachmentsChanged,
      onFieldChange,
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
        <TaskRequirements
          attachmentCount={attachments.length}
          checklistChecked={checklistChecked}
          checklistItems={checklistItems}
          documentRequired={documentRequired}
          signatureConfirmed={signatureConfirmed}
          userSignatureRequired={userSignatureRequired}
          onChecklistToggle={onChecklistToggle}
          onSignatureToggle={onSignatureToggle}
        />
        <WorkflowFormRenderer
          attachments={attachments}
          formModel={formModel}
          hiddenFieldIds={hiddenFieldIds}
          instanceId={instanceId}
          panels={panels}
          readOnlyFieldIds={readOnlyFieldIds}
          repositoryId={repositoryId}
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
