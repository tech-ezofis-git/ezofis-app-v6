import { useLingui } from '@lingui/react/macro'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import type { CommentItem } from '@/pages/requests/hooks/useComments'
import { getRepositoryById, uploadForOcr } from '@/api/v6/folder/folder'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import showToast from '@/components/base/toast/showToast'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import folderApi from '@/pages/folders/api/folderApi'
import { resolveDocumentPreviewKind } from '@/pages/folders/utils/documentDetailsUtils'
import { DynamicIcon } from '@/pages/folders/components/icons'
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
  getFormPanels,
  getLatestAttachment,
  getRecentDocumentAttachment,
  getWorkflowRepositoryId,
  hasStoredFileValue,
} from '@/pages/requests/components/workflow-request/utils/gmailFormAttachment'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import { useAttachmentPreviewUrl } from '@/pages/requests/hooks/useAttachmentPreviewUrl'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { setFieldForAttachment } from '@/pages/requests/utils/fieldAttachmentMap'
import {
  planRepositoryFolderMetadata,
  uploadInstanceAttachment,
} from '@/pages/requests/utils/instanceAttachmentUpload'
import {
  applyFilenamePreFill,
  getFolderStructureFields,
  type RepositoryFieldSchema,
  toUploadMetadata,
} from '@/pages/requests/utils/repoFolderMetadata'
import { listWorkflowStages } from '@/pages/requests/utils/workflow.utils'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import Attachments from '../sections/attachment/Attachments'
import Comments from '../sections/comment/Comments'
import History from '../sections/history/History'
import AgentDetailPlaceholder from './AgentDetailPlaceholder'
import AgentSummaryBoxes, {
  formatAgentDisplayLabel,
  type AgentBlock,
  getAgentResponseTabs,
} from './AgentSummaryBoxes'
import AttachmentPreviewPanel from './AttachmentPreviewPanel'
import AttachmentSplitView from './AttachmentSplitView'
import LeftViewerAttachmentStrip, {
  attachmentKeyOf,
} from './LeftViewerAttachmentStrip'
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

// Split layout tailored specifically for "Document Approval"
const DocumentApprovalSplitLayout = ({
  attachments,
  formModel,
  formNode,
  repositoryId,
  selectedItem,
  taskNode,
}: {
  attachments: AttachmentItem[]
  formModel?: Record<string, any>
  formNode: ReactNode
  repositoryId: string | number | undefined
  selectedItem: any
  taskNode: ReactNode
}) => {
  const { t } = useLingui()
  const firstAttachment =
    getFirstReceivedAttachment(attachments) || attachments[0]
  const [documentInfo, setDocumentInfo] = useState<any>(null)

  const [isApproversOpen, setIsApproversOpen] = useState(true)
  const [isDocDetailsOpen, setIsDocDetailsOpen] = useState(true)

  const targetRepoId =
    firstAttachment?.repositoryId || repositoryId || selectedItem?.repositoryId
  const targetItemId =
    firstAttachment?.itemId || firstAttachment?.id || selectedItem?.itemId

  const previewAttachment = firstAttachment
    ? {
        ...firstAttachment,
        itemId: targetItemId,
        repositoryId: targetRepoId,
      }
    : selectedItem?.itemId || selectedItem?._localFileUrl
      ? {
          _localFileUrl: selectedItem?._localFileUrl,
          fileExtension:
            selectedItem?.repositoryItem?.fileName?.split('.').pop() || 'pdf',
          fileName:
            selectedItem?.repositoryItem?.fileName || selectedItem?.name,
          itemId: selectedItem?.itemId,
          name: selectedItem?.repositoryItem?.fileName || selectedItem?.name,
          repositoryId: selectedItem?.repositoryId,
        }
      : null

  const {
    isLoading: previewLoading,
    mimeType,
    previewUrl,
  } = useAttachmentPreviewUrl(previewAttachment as any, targetRepoId)

  const previewFileName =
    previewAttachment?.fileName ||
    previewAttachment?.name ||
    (previewAttachment?.fileExtension
      ? `file.${previewAttachment.fileExtension}`
      : undefined)
  const previewKind = resolveDocumentPreviewKind(mimeType, previewFileName)
  useEffect(() => {
    if (!targetItemId || !targetRepoId) return
    let cancelled = false
    folderApi
      .getDocumentDetail(String(targetRepoId), String(targetItemId))
      .then((detail) => {
        if (!cancelled) setDocumentInfo(detail)
      })
      .catch((e) => console.error('Failed to fetch doc details', e))
    return () => {
      cancelled = true
    }
  }, [targetItemId, targetRepoId])

  return (
    <div className='flex h-full min-h-0 w-full flex-row overflow-hidden bg-[var(--gray-1)]'>
      <div className='relative flex h-full w-[50%] max-w-[800px] min-w-[280px] shrink-0 flex-col overflow-hidden border-r border-[var(--gray-3)] bg-surface'>
        {previewAttachment ? (
          <DocumentPreviewViewer
            fileName={previewFileName}
            fileUrl={previewUrl || null}
            isImage={previewKind === 'image' || previewKind === 'tiff'}
            isLoading={previewLoading}
            isPdf={previewKind === 'pdf'}
          />
        ) : (
          <div className='flex h-full items-center justify-center text-13 text-gray-9'>
            {t`No document attached`}
          </div>
        )}
      </div>

      <div className='flex min-w-0 flex-1 flex-col gap-5 overflow-hidden bg-[var(--gray-1)] p-4'>
        <ScrollArea className='flex-1 pr-3.5' height='100%' type='always'>
          <div className='space-y-4 pb-4'>
            <div className='rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
              <button
                className='flex w-full items-center justify-between border-b border-gray-3 px-4 py-2.5 transition-colors hover:bg-gray-2'
                onClick={() => setIsApproversOpen(!isApproversOpen)}
              >
                <h2 className='flex items-center gap-2 text-sm font-semibold text-gray-13'>
                  <DynamicIcon className='h-4 w-4 text-blue-11' name='users' />
                  {t`Configure Approvers`}
                </h2>
                <DynamicIcon
                  className={`h-4 w-4 text-gray-10 transition-transform ${isApproversOpen ? 'rotate-180' : ''}`}
                  name='chevronDown'
                />
              </button>
              {isApproversOpen && (
                <div className='flex flex-col space-y-4 p-4'>
                  {taskNode}
                  {formNode}
                </div>
              )}
            </div>

            <div className='rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
              <button
                className='flex w-full items-center justify-between border-b border-gray-3 px-4 py-2.5 transition-colors hover:bg-gray-2'
                onClick={() => setIsDocDetailsOpen(!isDocDetailsOpen)}
              >
                <h2 className='flex items-center gap-2 text-sm font-semibold text-gray-13'>
                  <DynamicIcon
                    className='h-4 w-4 text-blue-11'
                    name='fileText'
                  />
                  {t`Document Details`}
                </h2>
                <DynamicIcon
                  className={`h-4 w-4 text-gray-10 transition-transform ${isDocDetailsOpen ? 'rotate-180' : ''}`}
                  name='chevronDown'
                />
              </button>
              {isDocDetailsOpen && (
                <div className='flex flex-col'>
                  {documentInfo?.infoCards?.flatMap(
                    (card: any) => card.rows || [],
                  ).length > 0 ? (
                    documentInfo.infoCards
                      .flatMap((card: any) => card.rows || [])
                      .map((row: any, idx: number) => (
                        <div
                          className='flex items-center justify-between border-b border-gray-2 px-5 py-3 last:border-b-0'
                          key={idx}
                        >
                          <span className='flex items-center gap-2 text-[12px] text-gray-9'>
                            <DynamicIcon
                              className='h-3.5 w-3.5 text-gray-8'
                              name='maximize'
                            />
                            {row.label}
                          </span>
                          <span className='max-w-[200px] truncate text-[13px] font-medium text-gray-12'>
                            {row.value || '-'}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className='px-5 py-4 text-center text-xs text-gray-9'>
                      {t`No document details available.`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

const DocumentFormSplitLayout = ({
  attachments,
  attachmentsCount,
  attachmentsNode,
  commentsCount,
  commentsNode,
  formModel,
  formNode,
  hiddenFieldIds,
  historyNode,
  lineItemsNode,
  rawWorkflowData,
  readOnlyFieldIds,
  repositoryId,
  selectedItem,
  taskNode,
  viewOnly,
  onFieldChange,
}: {
  attachments: AttachmentItem[]
  attachmentsCount?: number
  attachmentsNode?: ReactNode
  commentsCount?: number
  commentsNode?: ReactNode
  formModel?: Record<string, any>
  formNode: ReactNode
  hiddenFieldIds?: Set<string>
  historyNode?: ReactNode
  lineItemsNode?: ReactNode
  rawWorkflowData: any
  readOnlyFieldIds?: Set<string>
  repositoryId: string | number | undefined
  selectedItem: any
  taskNode: ReactNode
  viewOnly?: boolean
  onFieldChange?: (fieldId: string, value: any) => void
}) => {
  const { t } = useLingui()
  // Default left-pane doc: newest real document (skip .eml/.msg so email UI is not shown).
  const recentDocument = useMemo(
    () =>
      getRecentDocumentAttachment(attachments) ||
      getLatestAttachment(attachments) ||
      attachments[0],
    [attachments],
  )

  const [viewerAttachmentKey, setViewerAttachmentKey] = useState(() =>
    attachmentKeyOf(recentDocument),
  )
  const knownAttachmentKeysRef = useRef<Set<string>>(new Set())
  const hasSeededAttachmentKeysRef = useRef(false)
  const [newAttachmentKeys, setNewAttachmentKeys] = useState<Set<string>>(
    () => new Set(),
  )

  const requestIdentity = String(
    selectedItem?.itemId ||
      selectedItem?.id ||
      selectedItem?.requestId ||
      selectedItem?.transactionId ||
      '',
  )

  // Reset baseline when navigating to a different request.
  useEffect(() => {
    hasSeededAttachmentKeysRef.current = false
    knownAttachmentKeysRef.current = new Set()
    setNewAttachmentKeys(new Set())
    setViewerAttachmentKey(attachmentKeyOf(recentDocument))
  }, [requestIdentity])

  // Seed existing docs on first load; only mark later arrivals as New.
  useEffect(() => {
    const keys = (attachments || [])
      .map(attachmentKeyOf)
      .filter(Boolean)

    if (!hasSeededAttachmentKeysRef.current) {
      // Wait until the initial attachment list arrives so open-time docs
      // are not falsely marked New.
      if (keys.length === 0) return
      knownAttachmentKeysRef.current = new Set(keys)
      hasSeededAttachmentKeysRef.current = true
      const stillExists = keys.includes(viewerAttachmentKey)
      if (!stillExists) {
        setViewerAttachmentKey(attachmentKeyOf(recentDocument))
      }
      return
    }

    const known = knownAttachmentKeysRef.current
    const added = keys.filter((key) => !known.has(key))
    // Keep previously known keys so removals/reordering do not re-flag New.
    for (const key of keys) known.add(key)

    if (added.length === 0) {
      const stillExists = keys.includes(viewerAttachmentKey)
      if (!stillExists) {
        setViewerAttachmentKey(attachmentKeyOf(recentDocument))
      }
      return
    }

    setNewAttachmentKeys((prev) => new Set([...prev, ...added]))
    const newestKey = attachmentKeyOf(recentDocument)
    if (newestKey) setViewerAttachmentKey(newestKey)
  }, [attachments, recentDocument, viewerAttachmentKey])

  const viewerAttachment = useMemo(() => {
    if (!attachments.length) return recentDocument
    return (
      attachments.find(
        (file) => attachmentKeyOf(file) === viewerAttachmentKey,
      ) ||
      recentDocument ||
      attachments[0]
    )
  }, [attachments, recentDocument, viewerAttachmentKey])

  const handleSelectViewerAttachment = useCallback((file: AttachmentItem) => {
    const key = attachmentKeyOf(file)
    setViewerAttachmentKey(key)
    if (!key) return
    setNewAttachmentKeys((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const agentBlocks: AgentBlock[] = useMemo(() => {
    const blocks = rawWorkflowData?.workflowJson?.blocks || []
    return blocks.filter((b: any) => b.type && b.type.includes('AGENT'))
  }, [rawWorkflowData])

  const agentResponseTabs = useMemo(
    () => getAgentResponseTabs(agentBlocks, selectedItem, rawWorkflowData),
    [agentBlocks, rawWorkflowData, selectedItem],
  )
  const agentResponseTabKey = agentResponseTabs.map((b) => b.id).join('|')
  const hasAgents = agentBlocks.length > 0
  const hasAgentResponseTabs = agentResponseTabs.length > 0

  const initialAgentId =
    agentResponseTabs[0]?.id ??
    agentBlocks.find(
      (b) =>
        String(b.type || '') !== 'DOCUMENT_GENERATE_AGENT' &&
        String(b.settings?.subtype || '').toUpperCase() !== 'DOCUMENT_GENERATE',
    )?.id ??
    null
  const [selectedAgentBlockId, setSelectedAgentBlockId] = useState<
    string | null
  >(initialAgentId)
  const [activeTab, setActiveTab] = useState(
    initialAgentId ? `agent:${initialAgentId}` : 'summary',
  )
  const prevAgentResponseTabKey = useRef('')

  // When a new agent response arrives (or on first load), open that tab first.
  // Do not re-open agent tabs when the user navigates to Attachments/Comments/History.
  useEffect(() => {
    if (!hasAgentResponseTabs) return
    const newestId = agentResponseTabs[0]?.id
    if (!newestId) return
    const prevKey = prevAgentResponseTabKey.current
    const isFirstLoad = prevKey === ''
    const isNewResponse = prevKey !== agentResponseTabKey
    prevAgentResponseTabKey.current = agentResponseTabKey
    if (isFirstLoad || isNewResponse) {
      setSelectedAgentBlockId(newestId)
      setActiveTab(`agent:${newestId}`)
    }
  }, [agentResponseTabKey, agentResponseTabs, hasAgentResponseTabs])

  useEffect(() => {
    if (!selectedAgentBlockId) return
    const stillVisible = agentResponseTabs.some(
      (block) => block.id === selectedAgentBlockId,
    )
    if (stillVisible) return
    const fallbackId = agentResponseTabs[0]?.id
    if (!fallbackId) {
      setSelectedAgentBlockId(null)
      setActiveTab('summary')
      return
    }
    setSelectedAgentBlockId(fallbackId)
    setActiveTab(`agent:${fallbackId}`)
  }, [agentResponseTabs, selectedAgentBlockId])

  useEffect(() => {
    if (selectedAgentBlockId || !hasAgents) return
    if (selectedItem?.isProcessing) {
      const activeStage = selectedItem?.stage || selectedItem?.currentStage
      if (activeStage) {
        const matchingBlock = agentResponseTabs.find(
          (b) => b.settings?.label === activeStage,
        )
        if (matchingBlock) {
          setSelectedAgentBlockId(matchingBlock.id)
          setActiveTab(`agent:${matchingBlock.id}`)
        }
      }
    }
  }, [
    selectedItem?.isProcessing,
    selectedItem?.stage,
    selectedItem?.currentStage,
    selectedAgentBlockId,
    agentResponseTabs,
    hasAgents,
  ])

  const selectedAgentBlock = useMemo(() => {
    if (!selectedAgentBlockId) return null
    return agentBlocks.find((b) => b.id === selectedAgentBlockId) || null
  }, [selectedAgentBlockId, agentBlocks])

  const standardTabs = useMemo(
    () =>
      [
        { icon: 'tabler:file-text', id: 'summary', label: t`Extracted Data` },
        lineItemsNode
          ? {
              icon: 'tabler:layers-linked',
              id: 'line_items',
              label: t`Line Items`,
            }
          : null,
        {
          count: attachmentsCount,
          icon: 'tabler:paperclip',
          id: 'attachments',
          label: t`Attachments`,
        },
        {
          count: commentsCount,
          icon: 'tabler:message-circle',
          id: 'comments',
          label: t`Comments`,
        },
        { icon: 'tabler:history', id: 'history', label: t`History` },
      ].filter(Boolean) as Array<{
        count?: number
        icon: string
        id: string
        label: string
      }>,
    [attachmentsCount, commentsCount, lineItemsNode, t],
  )

  const tabs = useMemo(() => {
    if (!hasAgents) return standardTabs
    if (!hasAgentResponseTabs) return standardTabs
    const agentTabs = agentResponseTabs.map((block) => ({
      icon: block.icon || 'lucide:cpu',
      id: `agent:${block.id}`,
      label: formatAgentDisplayLabel(block),
    }))
    return [
      ...agentTabs,
      {
        count: attachmentsCount,
        icon: 'tabler:paperclip',
        id: 'attachments',
        label: t`Attachments`,
      },
      {
        count: commentsCount,
        icon: 'tabler:message-circle',
        id: 'comments',
        label: t`Comments`,
      },
      { icon: 'tabler:history', id: 'history', label: t`History` },
    ]
  }, [
    agentResponseTabs,
    attachmentsCount,
    commentsCount,
    hasAgentResponseTabs,
    hasAgents,
    standardTabs,
    t,
  ])

  const selectTab = (tabId: string) => {
    setActiveTab(tabId)
    if (tabId.startsWith('agent:')) {
      setSelectedAgentBlockId(tabId.slice('agent:'.length))
    } else {
      setSelectedAgentBlockId(null)
    }
  }

  const targetRepoId =
    viewerAttachment?.repositoryId || repositoryId || selectedItem?.repositoryId
  const targetItemId =
    viewerAttachment?.itemId || viewerAttachment?.id || selectedItem?.itemId

  const previewAttachment = viewerAttachment
    ? {
        ...viewerAttachment,
        itemId: targetItemId,
        repositoryId: targetRepoId,
      }
    : selectedItem?.itemId || selectedItem?._localFileUrl
      ? {
          _localFileUrl: selectedItem?._localFileUrl,
          fileExtension:
            selectedItem?.repositoryItem?.fileName?.split('.').pop() || 'pdf',
          fileName:
            selectedItem?.repositoryItem?.fileName || selectedItem?.name,
          itemId: selectedItem?.itemId,
          name: selectedItem?.repositoryItem?.fileName || selectedItem?.name,
          repositoryId: selectedItem?.repositoryId,
        }
      : null

  const {
    isLoading: previewLoading,
    mimeType: previewMimeType,
    previewUrl,
  } = useAttachmentPreviewUrl(previewAttachment as any, targetRepoId)

  const viewerFileName =
    previewAttachment?.fileName ||
    previewAttachment?.name ||
    (previewAttachment?.fileExtension
      ? `file.${previewAttachment.fileExtension}`
      : undefined)
  const viewerKind = resolveDocumentPreviewKind(previewMimeType, viewerFileName)
  return (
    <div className='flex h-full min-h-0 w-full flex-row overflow-hidden bg-gray-1'>
      <div className='relative flex h-full w-[42%] max-w-[800px] min-w-[280px] shrink-0 flex-col overflow-hidden border-r border-gray-3 bg-gray-1'>
        <LeftViewerAttachmentStrip
          attachments={attachments}
          newAttachmentKeys={newAttachmentKeys}
          selectedKey={attachmentKeyOf(viewerAttachment)}
          onOpenAttachmentsTab={() => selectTab('attachments')}
          onSelect={handleSelectViewerAttachment}
        />
        <div className='min-h-0 flex-1 p-4'>
          <div className='relative h-full min-h-0 overflow-hidden rounded-xl border border-gray-3 bg-surface shadow-2xs'>
            {previewAttachment ? (
              <DocumentPreviewViewer
                fileName={viewerFileName}
                fileUrl={previewUrl || null}
                isImage={viewerKind === 'image' || viewerKind === 'tiff'}
                isLoading={previewLoading}
                isPdf={viewerKind === 'pdf'}
              />
            ) : (
              <div className='flex h-full items-center justify-center text-13 text-gray-9'>
                {t`No document attached`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--gray-1)]'>
        {agentBlocks.length > 0 && (
          <div className='px-4 pt-3 pb-2'>
            <AgentSummaryBoxes
              agentBlocks={agentBlocks}
              requestData={selectedItem}
              workflow={rawWorkflowData}
            />
          </div>
        )}
        <div className='no-scrollbar scrollbar-none sticky top-0 z-10 shrink-0 overflow-x-auto border-b border-[var(--gray-3)] bg-[var(--surface-primary)] px-4 pt-1.5'>
          <div className='flex items-center justify-between gap-4'>
            <div className='no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-6 md:gap-8'>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    '-mb-[2px] flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-[11px] font-semibold whitespace-nowrap transition-all sm:gap-2',
                    activeTab === tab.id
                      ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                      : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
                  )}
                  onClick={() => selectTab(tab.id)}
                >
                  <Icon className='h-4 w-4 shrink-0' name={tab.icon} />
                  <span>{tab.label}</span>
                  {'count' in tab && tab.count !== undefined && (
                    <span className='flex h-4 items-center justify-center rounded-full bg-gray-2 px-1.5 text-[10px] font-semibold text-gray-12'>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          {activeTab.startsWith('agent:') && selectedAgentBlock ? (
            <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-scroll p-3 [scrollbar-gutter:stable]'>
              <AgentDetailPlaceholder
                agentBlock={selectedAgentBlock}
                attachments={attachments}
                formModel={formModel}
                hideBack={hasAgentResponseTabs}
                hiddenFieldIds={hiddenFieldIds}
                rawWorkflowData={rawWorkflowData}
                readOnlyFieldIds={readOnlyFieldIds}
                repositoryId={repositoryId}
                requestData={selectedItem}
                viewOnly={viewOnly}
                onBack={() => {
                  setSelectedAgentBlockId(null)
                  setActiveTab(
                    hasAgentResponseTabs
                      ? `agent:${agentResponseTabs[0]?.id}`
                      : 'summary',
                  )
                }}
                onFieldChange={onFieldChange}
              />
            </div>
          ) : activeTab === 'summary' ||
            (!hasAgents && activeTab === 'summary') ? (
            <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
              {taskNode}
              {formNode}
            </div>
          ) : activeTab === 'attachments' && attachmentsNode ? (
            <div className='flex min-h-0 flex-1 flex-col px-4 pt-4'>
              {attachmentsNode}
            </div>
          ) : activeTab === 'comments' && commentsNode ? (
            <div className='flex min-h-0 flex-1 flex-col px-4 pt-4 pb-0'>
              {commentsNode}
            </div>
          ) : activeTab === 'history' && historyNode ? (
            <div className='flex min-h-0 flex-1 flex-col px-4 pt-4'>
              {historyNode}
            </div>
          ) : activeTab === 'line_items' && lineItemsNode ? (
            <div className='flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-4'>
              {lineItemsNode}
            </div>
          ) : (
            <div className='flex h-32 items-center justify-center text-sm text-[var(--gray-9)]'>
              {t`No data available yet.`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
  const kanbanMissingFieldIds = requestStore(
    (state) => state.kanbanMissingFieldIds,
  )
  const storeSelectedItem = requestStore((state) => state.selectedItem)
  const missingMandatoryFieldIds = useMemo(
    () => new Set(kanbanMissingFieldIds || []),
    [kanbanMissingFieldIds],
  )

  const panels = useMemo(
    () => getFormPanels(rawWorkflowData),
    [rawWorkflowData],
  )
  const workflowStages = useMemo(
    () => listWorkflowStages(rawWorkflowData),
    [rawWorkflowData],
  )
  const currentActivityId = selectedItem?.activityId
    ? String(selectedItem.activityId)
    : undefined

  const missingRequiredLabels = useMemo(() => {
    if (!kanbanMissingFieldIds?.length) return []
    const byId = new Map<string, string>()
    panels.forEach((panel: any) => {
      ;(panel.fields || []).forEach((field: any) => {
        byId.set(
          String(field.id),
          String(field.label || field.name || field.id),
        )
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

  const summaryHiddenFieldIds = useMemo(() => {
    const ids = new Set(hiddenFieldIds || [])
    allFieldIds.forEach((id) => {
      const field = panels
        .flatMap((p: any) => p.fields || [])
        .find((f: any) => String(f.id) === id)
      if (field && (field.type === 'DYNAMIC_TABLE' || field.type === 'TABLE')) {
        ids.add(id)
      }
    })
    return ids
  }, [hiddenFieldIds, allFieldIds, panels])

  const lineItemsHiddenFieldIds = useMemo(() => {
    const ids = new Set(hiddenFieldIds || [])
    let hasLineItems = false
    allFieldIds.forEach((id) => {
      const field = panels
        .flatMap((p: any) => p.fields || [])
        .find((f: any) => String(f.id) === id)
      if (field && (field.type === 'DYNAMIC_TABLE' || field.type === 'TABLE')) {
        hasLineItems = true
      } else {
        ids.add(id)
      }
    })
    return { hasLineItems, ids }
  }, [hiddenFieldIds, allFieldIds, panels])

  const workflowId = rawWorkflowData?.id
  const instanceId = selectedItem?.workflowInstanceId || selectedItem?.processId
  const processId = selectedItem?.processId
  const repositoryId = rawWorkflowData?.repositoryId

  const agentBlocks: AgentBlock[] = useMemo(() => {
    const blocks = rawWorkflowData?.workflowJson?.blocks || []
    return blocks.filter((b: any) => b.type && b.type.includes('AGENT'))
  }, [rawWorkflowData])

  const showAgentProcess = agentBlocks.some((block) => {
    const type = String(block.type || '')
    const subtype = String(block.settings?.subtype || '').toUpperCase()
    return type !== 'DOCUMENT_GENERATE_AGENT' && subtype !== 'DOCUMENT_GENERATE'
  })

  const [selectedAgentBlockId, setSelectedAgentBlockId] = useState<
    string | null
  >(null)
  const selectedAgentBlock = useMemo(() => {
    if (!selectedAgentBlockId) return null
    return agentBlocks.find((b) => b.id === selectedAgentBlockId) || null
  }, [selectedAgentBlockId, agentBlocks])

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
        {rawWorkflowData?.name === 'Document Approval' ? (
          <DocumentApprovalSplitLayout
            attachments={attachments}
            formModel={formModel}
            repositoryId={repositoryId}
            selectedItem={selectedItem || storeSelectedItem}
            formNode={
              <WorkflowFormRenderer
                attachments={attachments}
                currentActivityId={currentActivityId}
                disableOwnScroll={true}
                formModel={formModel}
                stages={workflowStages}
                hasAttemptedSubmit={missingMandatoryFieldIds.size > 0}
                hiddenFieldIds={hiddenFieldIds}
                hidePanels={true}
                instanceId={instanceId}
                panels={panels}
                preparePhase={preparePhase}
                preparingFieldId={preparingFieldId}
                readOnlyFieldIds={readOnlyFieldIds}
                repositoryId={repositoryId}
                viewOnly={viewOnly}
                missingMandatoryFieldIds={
                  missingMandatoryFieldIds.size > 0
                    ? missingMandatoryFieldIds
                    : undefined
                }
                onFieldChange={onFieldChange}
                onOpenAttachment={setOpenedAttachment}
                onRequestUpload={viewOnly ? undefined : handleRequestUpload}
              />
            }
            taskNode={
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
            }
          />
        ) : rawWorkflowData?.settings?.general?.initiateUsing?.type ===
            'DOCUMENT_FORM' ||
          rawWorkflowData?.workflowJson?.settings?.general?.initiateUsing
            ?.type === 'DOCUMENT_FORM' ? (
          <DocumentFormSplitLayout
            attachments={attachments}
            attachmentsCount={attachments.length}
            commentsCount={comments.length}
            formModel={formModel}
            hiddenFieldIds={hiddenFieldIds}
            rawWorkflowData={rawWorkflowData}
            readOnlyFieldIds={readOnlyFieldIds}
            repositoryId={repositoryId}
            selectedItem={selectedItem || storeSelectedItem}
            viewOnly={viewOnly}
            attachmentsNode={
              <Attachments
                canUpload={!viewOnly}
                initialData={attachments}
                instanceId={instanceId}
                processId={processId}
                repositoryId={repositoryId}
                workflowId={workflowId}
                enabled
                onAttachmentsChanged={onAttachmentsChanged}
                onSelect={setOpenedAttachment}
              />
            }
            commentsNode={
              <Comments
                comments={comments}
                instanceId={instanceId}
                processId={processId}
                refetch={onCommentsChanged}
                workflowId={workflowId}
                enabled
              />
            }
            formNode={
              <WorkflowFormRenderer
                attachments={attachments}
                currentActivityId={currentActivityId}
                disableOwnScroll={true}
                formModel={formModel}
                stages={workflowStages}
                hasAttemptedSubmit={missingMandatoryFieldIds.size > 0}
                hiddenFieldIds={summaryHiddenFieldIds}
                hidePanels={agentBlocks.length > 0}
                instanceId={instanceId}
                panels={panels}
                preparePhase={preparePhase}
                preparingFieldId={preparingFieldId}
                presentation='extracted'
                readOnlyFieldIds={readOnlyFieldIds}
                repositoryId={repositoryId}
                viewOnly={viewOnly}
                missingMandatoryFieldIds={
                  missingMandatoryFieldIds.size > 0
                    ? missingMandatoryFieldIds
                    : undefined
                }
                onFieldChange={onFieldChange}
                onOpenAttachment={setOpenedAttachment}
                onRequestUpload={viewOnly ? undefined : handleRequestUpload}
              />
            }
            historyNode={
              <History
                instanceId={instanceId}
                processId={processId}
                workflowId={workflowId}
                enabled
                isCompleted={
                  selectedItem?.isCompleted ||
                  Boolean(selectedItem?.completedAtUtc) ||
                  Boolean(selectedItem?.completedAt) ||
                  ['completed', 'approved', 'closed', 'paid'].includes(
                    String(selectedItem?.status || '')
                      .toLowerCase()
                      .trim(),
                  )
                }
              />
            }
            lineItemsNode={
              lineItemsHiddenFieldIds.hasLineItems ? (
                <WorkflowFormRenderer
                  attachments={attachments}
                  currentActivityId={currentActivityId}
                  disableOwnScroll={true}
                  formModel={formModel}
                  stages={workflowStages}
                  hasAttemptedSubmit={missingMandatoryFieldIds.size > 0}
                  hiddenFieldIds={lineItemsHiddenFieldIds.ids}
                  hidePanels={agentBlocks.length > 0}
                  instanceId={instanceId}
                  panels={panels}
                  preparePhase={preparePhase}
                  preparingFieldId={preparingFieldId}
                  readOnlyFieldIds={readOnlyFieldIds}
                  repositoryId={repositoryId}
                  viewOnly={viewOnly}
                  missingMandatoryFieldIds={
                    missingMandatoryFieldIds.size > 0
                      ? missingMandatoryFieldIds
                      : undefined
                  }
                  onFieldChange={onFieldChange}
                  onOpenAttachment={setOpenedAttachment}
                  onRequestUpload={viewOnly ? undefined : handleRequestUpload}
                />
              ) : undefined
            }
            taskNode={
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
            }
            onFieldChange={onFieldChange}
          />
        ) : (
          <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
            {showAgentProcess && (
              <div className='px-6 pt-5 pb-1'>
                <AgentSummaryBoxes
                  agentBlocks={agentBlocks}
                  requestData={selectedItem}
                  workflow={rawWorkflowData}
                />
              </div>
            )}

            <ScrollArea className='flex-1' height='100%'>
              {selectedAgentBlock ? (
                <div className='p-6 pt-2'>
                  <AgentDetailPlaceholder
                    agentBlock={selectedAgentBlock}
                    attachments={attachments}
                    formModel={formModel}
                    hiddenFieldIds={hiddenFieldIds}
                    rawWorkflowData={rawWorkflowData}
                    readOnlyFieldIds={readOnlyFieldIds}
                    repositoryId={repositoryId}
                    requestData={selectedItem}
                    viewOnly={viewOnly}
                    onBack={() => setSelectedAgentBlockId(null)}
                    onFieldChange={onFieldChange}
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'flex flex-col',
                    agentBlocks.length > 0 && 'px-6 pt-4 pb-6',
                  )}
                >
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
                    currentActivityId={currentActivityId}
                    disableOwnScroll={true}
                    formModel={formModel}
                    stages={workflowStages}
                    hasAttemptedSubmit={missingMandatoryFieldIds.size > 0}
                    hiddenFieldIds={summaryHiddenFieldIds}
                    hidePanels={agentBlocks.length > 0}
                    instanceId={instanceId}
                    panels={panels}
                    preparePhase={preparePhase}
                    preparingFieldId={preparingFieldId}
                    readOnlyFieldIds={readOnlyFieldIds}
                    repositoryId={repositoryId}
                    viewOnly={viewOnly}
                    missingMandatoryFieldIds={
                      missingMandatoryFieldIds.size > 0
                        ? missingMandatoryFieldIds
                        : undefined
                    }
                    onFieldChange={onFieldChange}
                    onOpenAttachment={setOpenedAttachment}
                    onRequestUpload={viewOnly ? undefined : handleRequestUpload}
                  />
                </div>
              )}
            </ScrollArea>
          </div>
        )}

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
                    isCompleted={
                      selectedItem?.isCompleted ||
                      Boolean(selectedItem?.completedAtUtc) ||
                      Boolean(selectedItem?.completedAt) ||
                      ['completed', 'approved', 'closed', 'paid'].includes(
                        String(selectedItem?.status || '')
                          .toLowerCase()
                          .trim(),
                      )
                    }
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
                  onAttachmentsChanged={onAttachmentsChanged}
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
