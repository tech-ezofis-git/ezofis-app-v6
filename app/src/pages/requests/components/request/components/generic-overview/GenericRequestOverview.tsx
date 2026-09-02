import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import type { CommentItem } from '@/pages/requests/hooks/useComments'
import { getRepositoryById, uploadForOcr } from '@/api/v6/folder/folder'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import IconButton from '@/components/base/button/IconButton'
import showToast from '@/components/base/toast/showToast'
import {
  buildMergedOcrFieldHints,
  buildRepoFieldHints,
  buildRepoMetadata,
  extractOcrText,
  mapOcrFieldsToModel,
  SYNTHETIC_FIELD_PREFIX,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import {
  attachmentToFormFileValue,
  getFirstFileUploadField,
  getFirstReceivedAttachment,
  getWorkflowRepositoryId,
  hasStoredFileValue,
} from '@/pages/requests/components/workflow-request/utils/gmailFormAttachment'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { setFieldForAttachment } from '@/pages/requests/utils/fieldAttachmentMap'
import {
  planRepositoryFolderMetadata,
  uploadInstanceAttachment,
} from '@/pages/requests/utils/instanceAttachmentUpload'
import {
  type RepositoryFieldSchema,
  applyFilenamePreFill,
  getFolderStructureFields,
  toUploadMetadata,
} from '@/pages/requests/utils/repoFolderMetadata'
import authUserStore from '@/stores/authUserStore'
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

// A file picked through a form field, waiting on the indexing page so the
// uploader can review inherited / OCR values, fill blanks, and change
// existing fields before the file is posted.
interface PendingFieldUpload {
  baseMetadata: Record<string, string>
  fieldId: string
  file: File
  isFirstFile: boolean
  ocrFieldList?: { name?: string; type?: string | null; value?: string }[]
  ocrHints?: string[]
  ocrJson?: string
}

const overlayIndexingMetadata = (
  folderFields: RepositoryFieldSchema[],
  inherited: Record<string, string>,
  fromForm: Record<string, string>,
): Record<string, string> => {
  const next: Record<string, string> = {}
  for (const field of folderFields) {
    const formVal = String(
      fromForm[field.sqlColumnName] || fromForm[field.name] || '',
    ).trim()
    const inheritedVal = String(
      inherited[field.sqlColumnName] || inherited[field.name] || '',
    ).trim()
    next[field.sqlColumnName] = formVal || inheritedVal
  }
  return next
}

const formAccessMode = (value: unknown): 'ALL' | 'NONE' | 'CUSTOM' => {
  const raw =
    typeof value === 'string' || typeof value === 'number' ? value : 'ALL'
  const access = String(raw).toUpperCase()
  if (access === 'NONE') return 'NONE'
  if (access === 'CUSTOM') return 'CUSTOM'
  // ALL, FULL (legacy dummy/imported workflows), and unknown values.
  return 'ALL'
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
  // Fetched once at the Request level, same reasoning as attachments above
  // — keeps the header's comment count and this panel in sync.
  comments?: CommentItem[]
  documentRequired?: boolean
  signatureConfirmed?: boolean
  userSignatureRequired?: boolean
  // Sent/Closed (or not assigned) — the form is display-only.
  viewOnly?: boolean
  setRightView: (
    view: 'overview' | 'history' | 'attachments' | 'comments',
  ) => void
  onAttachmentsChanged?: () => void
  onChecklistToggle?: (id: string, checked: boolean) => void
  onCommentsChanged?: () => Promise<void>
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
  checklistChecked = {},
  checklistItems = [],
  comments = [],
  documentRequired = false,
  formModel,
  rawWorkflowData,
  rightView,
  selectedItem,
  signatureConfirmed = false,
  userSignatureRequired = false,
  viewOnly = false,
  setRightView,
  onAttachmentsChanged,
  onChecklistToggle,
  onCommentsChanged,
  onFieldChange,
  onSignatureToggle,
}: Props) => {
  const { t } = useLingui()
  const kanbanMissingFieldIds = requestStore((state) => state.kanbanMissingFieldIds)
  const missingMandatoryFieldIds = useMemo(
    () => new Set(kanbanMissingFieldIds || []),
    [kanbanMissingFieldIds],
  )

  const panels = useMemo(
    () => rawWorkflowData?.formJson?.panels || [],
    [rawWorkflowData],
  )

  const missingRequiredLabels = useMemo(() => {
    if (!kanbanMissingFieldIds?.length) return []
    const byId = new Map<string, string>()
    panels.forEach((panel: any) => {
      ;(panel.fields || []).forEach((field: any) => {
        byId.set(String(field.id), String(field.label || field.name || field.id))
      })
    })
    const labels: string[] = []
    const seen = new Set<string>()
    kanbanMissingFieldIds.forEach((id) => {
      const label = byId.get(id) || id
      if (seen.has(id) || seen.has(label)) return
      seen.add(id)
      seen.add(label)
      labels.push(label)
    })
    return labels
  }, [kanbanMissingFieldIds, panels])

  useEffect(() => {
    if (!kanbanMissingFieldIds?.length) return
    const timer = window.setTimeout(() => {
      const target = kanbanMissingFieldIds
        .map((id) =>
          document.querySelector(`[data-field-id="${CSS.escape(id)}"]`),
        )
        .find((node) => node instanceof HTMLElement)
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 280)
    return () => window.clearTimeout(timer)
  }, [kanbanMissingFieldIds])

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

  // Fields whose values were used to compose the Request Number (a
  // formColumn token in the workflow's Request Number Format) stay locked
  // for the lifetime of the request, independent of per-stage edit access,
  // since editing them after generation would desync the request number.
  const requestNumberFieldIds = useMemo(() => {
    const raw = rawWorkflowData?.workflowJson?.settings?.general
      ?.processNumberPrefix as string | undefined
    if (!raw) return new Set<string>()
    try {
      const segments = JSON.parse(raw)
      if (!Array.isArray(segments)) return new Set<string>()
      const ids: string[] = []
      segments.forEach((segment: any) => {
        if (segment?.key !== 'formColumn') return
        String(segment.value || '')
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean)
          .forEach((id: string) => ids.push(id))
      })
      return new Set(ids)
    } catch {
      return new Set<string>()
    }
  }, [rawWorkflowData])

  const readOnlyFieldIds = useMemo(() => {
    const access = formAccessMode(blockSettings.formEditAccess)
    const base =
      access === 'NONE'
        ? new Set(allFieldIds)
        : access === 'CUSTOM'
          ? (() => {
              const rules = Array.isArray(blockSettings.formEditControls)
                ? blockSettings.formEditControls
                : []
              const rule = rules.find(
                (r: any) => String(r.userId) === currentUserId,
              )
              if (!rule) return undefined
              const editable = new Set((rule?.formFields || []).map(String))
              return new Set(allFieldIds.filter((id) => !editable.has(id)))
            })()
          : undefined

    if (requestNumberFieldIds.size === 0) return base
    return new Set([...(base || []), ...requestNumberFieldIds])
  }, [blockSettings, allFieldIds, currentUserId, requestNumberFieldIds])

  const hiddenFieldIds = useMemo(() => {
    const access = formAccessMode(blockSettings.formVisibilityAccess)
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

  const seededFileFieldRef = useRef('')

  useEffect(() => {
    const firstReceived = getFirstReceivedAttachment(attachments)
    const attachmentId =
      firstReceived?.itemId ?? firstReceived?.id ?? firstReceived?.fileId
    const seedKey =
      instanceId && attachmentId ? `${instanceId}:${attachmentId}` : ''
    if (!seedKey || seededFileFieldRef.current === seedKey) return

    const firstField = getFirstFileUploadField(panels)
    const fieldId = firstField?.id || firstField?.jsonId
    if (!fieldId) return

    const current = formModel[fieldId]
    if (hasStoredFileValue(current)) {
      const currentId = String(current.itemId || current.fileId || '')
      if (currentId === String(attachmentId) || current?.rawFile) {
        seededFileFieldRef.current = seedKey
        return
      }
    }

    const stored = attachmentToFormFileValue(
      firstReceived,
      getWorkflowRepositoryId(
        rawWorkflowData,
        repositoryId || selectedItem?.repositoryId,
      ),
    )
    if (!stored) return

    seededFileFieldRef.current = seedKey
    onFieldChange(fieldId, stored)
    setFieldForAttachment(instanceId, stored.itemId, fieldId)
  }, [
    attachments,
    formModel,
    instanceId,
    onFieldChange,
    panels,
    rawWorkflowData,
    repositoryId,
    selectedItem?.repositoryId,
  ])

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
  const [preparePhase, setPreparePhase] = useState<
    'extracting' | 'uploading' | null
  >(null)
  const [preparingFieldId, setPreparingFieldId] = useState<string | null>(null)
  const [folderFields, setFolderFields] = useState<RepositoryFieldSchema[]>([])
  const returnToFieldIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (pendingUpload?.fieldId) {
      returnToFieldIdRef.current = String(pendingUpload.fieldId)
      return
    }
    const fieldId = returnToFieldIdRef.current
    if (!fieldId) return
    const timeoutId = window.setTimeout(() => {
      const node = document.querySelector(
        `[data-field-id="${CSS.escape(fieldId)}"]`,
      )
      node?.scrollIntoView({ block: 'center', inline: 'nearest' })
      returnToFieldIdRef.current = null
    }, 80)
    return () => window.clearTimeout(timeoutId)
  }, [pendingUpload])

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
      setPreparePhase('extracting')
      setPreparingFieldId(fieldId)
      try {
        const isFirstFile = attachments.length === 0
        const uploadField = panels
          .flatMap((panel: any) => panel.fields || [])
          .find((f: any) => String(f.id) === String(fieldId))
        const ocrHints = buildMergedOcrFieldHints(
          buildRepoFieldHints(folderFields),
          panels,
          uploadField,
        )
        const { data: ocrData, error: ocrError } = await uploadForOcr(
          String(repositoryId),
          file,
          ocrHints,
        )
        if (ocrError) {
          console.warn('[uploadForOcr] OCR extraction warning:', ocrError)
        }

        setPreparePhase('uploading')

        const ocrPatch = mapOcrFieldsToModel(panels, ocrData?.ocrFieldList)
        for (const [id, value] of Object.entries(ocrPatch)) {
          if (id.startsWith(SYNTHETIC_FIELD_PREFIX)) continue
          if (String(id) === String(fieldId)) continue
          onFieldChange(id, value)
        }

        const existingItem = attachments.find((a) => a.itemId)
        const { baseMetadata } = await planRepositoryFolderMetadata(
          String(repositoryId),
          existingItem
            ? {
                itemId: existingItem.itemId,
                repositoryId: existingItem.repositoryId || repositoryId,
              }
            : undefined,
        )
        const formMeta = buildRepoMetadata(
          folderFields,
          panels,
          { ...formModel, ...ocrPatch },
          file.name,
        )
        const seeded = applyFilenamePreFill(
          overlayIndexingMetadata(folderFields, baseMetadata, formMeta),
          folderFields,
          file.name,
        )

        if (folderFields.length === 0) {
          if (isFirstFile) {
            const { data, error } = await uploadAndIndexApi.uploadWithOcr({
              fields: ocrHints,
              file,
              metadata: formMeta,
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

          const res = await uploadInstanceAttachment(
            workflowId,
            instanceId,
            repositoryId,
            file,
            seeded,
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

        setPendingUpload({
          baseMetadata: seeded,
          fieldId,
          file,
          isFirstFile,
          ocrFieldList: ocrData?.ocrFieldList,
          ocrHints,
          ocrJson: ocrData?.ocrJson,
        })
      } finally {
        setPreparePhase(null)
        setPreparingFieldId(null)
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

  const handleConfirmUpload = async (values: Record<string, string>) => {
    if (!pendingUpload || !workflowId || !instanceId || !repositoryId) return
    setIsUploading(true)
    try {
      const metadata = toUploadMetadata(folderFields, values)

      if (pendingUpload.isFirstFile) {
        const { data, error } = await uploadAndIndexApi.uploadWithOcr({
          fields: pendingUpload.ocrHints,
          file: pendingUpload.file,
          metadata,
          ocrFieldList: pendingUpload.ocrFieldList,
          ocrJson: pendingUpload.ocrJson,
          ocrText: extractOcrText(pendingUpload.ocrJson),
          repositoryId: String(repositoryId),
        })
        if (error || !data) {
          showToast({
            message: t`Failed to upload the file.`,
            variant: 'error',
          })
          return
        }
        onFieldChange(pendingUpload.fieldId, {
          fileId: data.fileId,
          fileName: pendingUpload.file.name,
          ocrChecked: true,
          repositoryId: data.repositoryId || repositoryId,
        })
        setPendingUpload(null)
        onAttachmentsChanged?.()
        return
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

  const showIndexing = Boolean(pendingUpload || openedAttachment)

  return (
    <div className='relative flex h-full min-h-0 flex-1 overflow-hidden'>
      <div
        aria-hidden={showIndexing}
        className={
          showIndexing
            ? 'pointer-events-none invisible absolute inset-0 flex h-full min-h-0 overflow-hidden'
            : 'flex h-full min-h-0 flex-1 overflow-hidden'
        }
      >
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
        {/* {missingRequiredLabels.length > 0 ? (
          <div className='mx-6 mt-3 rounded-lg border border-red-4 bg-red-1 px-3 py-2 text-12 font-medium text-red-11'>
            {t`Please fill required field(s): ${missingRequiredLabels.join(', ')}`}
          </div>
        ) : null} */}
        <WorkflowFormRenderer
          attachments={attachments}
          formModel={formModel}
          hasAttemptedSubmit={missingMandatoryFieldIds.size > 0}
          hiddenFieldIds={hiddenFieldIds}
          instanceId={instanceId}
          missingMandatoryFieldIds={
            missingMandatoryFieldIds.size > 0
              ? missingMandatoryFieldIds
              : undefined
          }
          panels={panels}
          preparePhase={preparePhase}
          preparingFieldId={preparingFieldId}
          readOnlyFieldIds={readOnlyFieldIds}
          repositoryId={repositoryId}
          viewOnly={viewOnly}
          onFieldChange={onFieldChange}
          onOpenAttachment={setOpenedAttachment}
          onRequestUpload={viewOnly ? undefined : handleRequestUpload}
        />
      </div>

      {showSidePanel && (
        <div className='flex h-full min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-l border-gray-3 bg-gray-1'>
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
              <Attachments
                canUpload={!viewOnly}
                initialData={attachments}
                instanceId={instanceId}
                processId={processId}
                repositoryId={repositoryId}
                workflowId={workflowId}
                enabled
                onClose={() => setRightView('overview')}
                onSelect={setOpenedAttachment}
              />
            ))}
          {rightView === 'comments' && (
            <Comments
              comments={comments}
              instanceId={instanceId}
              processId={processId}
              refetch={onCommentsChanged}
              workflowId={workflowId}
              enabled
              onClose={() => setRightView('overview')}
            />
          )}
        </div>
      )}
      </div>

      {pendingUpload ? (
        <div className='flex h-full min-h-0 min-w-0 flex-1 overflow-hidden'>
          <AttachmentSplitView
            file={pendingUpload.file}
            folderFields={folderFields}
            isSubmitting={isUploading}
            metadata={pendingUpload.baseMetadata}
            repositoryId={repositoryId}
            title={pendingUpload.file.name}
            onClose={() => setPendingUpload(null)}
            onConfirm={handleConfirmUpload}
          />
        </div>
      ) : null}

      {openedAttachment && !pendingUpload ? (
        <div className='flex h-full min-h-0 min-w-0 flex-1 overflow-hidden'>
          <AttachmentSplitView
            attachment={openedAttachment}
            folderFields={folderFields}
            repositoryId={repositoryId}
            title={openedAttachment.name || t`Attachment`}
            onClose={() => setOpenedAttachment(null)}
          />
        </div>
      ) : null}
    </div>
  )
}

GenericRequestOverview.displayName = 'GenericRequestOverview'
export default GenericRequestOverview
