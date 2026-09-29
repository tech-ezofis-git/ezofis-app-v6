import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import requestStore from '@/pages/requests/stores/useRequestStore'
import Header from '../request/components/newrequest/Header'
import RepoFieldsPanel from './components/RepoFieldsPanel'
import UploadedFilePreview from './components/UploadedFilePreview'
import { useWorkflowForm } from './hooks/useWorkflowForm'
import WorkflowFormRenderer from './WorkflowFormRenderer'
import AttachmentsPanel from './components/AttachmentsPanel'
import CommentsPanel from './components/CommentsPanel'
import DocumentFormUpload from '../request/components/newrequest/DocumentFormUpload'
import AgentSummaryBoxes, {
  getAgentResponseTabs,
} from '../request/components/generic-overview/AgentSummaryBoxes'
import AgentDetailPlaceholder from '../request/components/generic-overview/AgentDetailPlaceholder'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import { extractBlocks } from '@/pages/requests/utils/workflow.utils'
import workflowsApiV6 from '@/api/v6/workflows'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'

interface Props {
  workflow: any
  onClose: () => void
}

type SidePanel = 'attachments' | 'comments'

// Generic, form-driven "New Request" flow for any workflow that isn't
// Accounts Payable: resolves the workflow's form (via workflow.formId),
// renders it with the app's existing form-control components, and submits
// it to start a new workflow instance.
const WorkflowRequest = ({ workflow, onClose }: Props) => {
  const { t } = useLingui()
  const workflowRefresh = requestStore((state) => state.workflowRefresh)
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null)
  const [isConfirmingUpload, setIsConfirmingUpload] = useState(false)
  // Clicking a repository field highlights its value in the file preview —
  // focusRequestId is bumped on every click (even re-clicking the same
  // field) so the viewer re-scrolls to it each time.
  const [activeHighlightTerm, setActiveHighlightTerm] = useState<string | null>(
    null,
  )
  const [focusRequestId, setFocusRequestId] = useState(0)

  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null)
  const [isStartingAgentWorkflow, setIsStartingAgentWorkflow] = useState(false)
  const [agentUploadedFile, setAgentUploadedFile] = useState<File | null>(null)

  const { data: requestData } = useRequestDetail(
    workflow?.id,
    createdInstanceId,
    null,
    true,
    workflow?.formId ||
      workflow?.wFormId ||
      workflow?.settings?.general?.initiateUsing?.formId ||
      null,
  )

  const initiateType = String(
    workflow?.settings?.general?.initiateUsing?.type ||
      workflow?.workflowJson?.settings?.general?.initiateUsing?.type ||
      '',
  )
    .toUpperCase()
    .replace(/[-_\s]/g, '')
  const isDocumentForm = initiateType === 'DOCUMENTFORM'

  const agentBlocks = useMemo(() => {
    const blocks = extractBlocks(workflow)
    return blocks.filter((b: any) => b.type && b.type.includes('AGENT'))
  }, [workflow])

  const agentResponseTabs = useMemo(
    () => getAgentResponseTabs(agentBlocks, requestData),
    [agentBlocks, requestData],
  )
  const agentResponseTabKey = agentResponseTabs.map((b) => b.id).join('|')
  const hasAgents = agentBlocks.length > 0
  const hasAgentResponseTabs = agentResponseTabs.length > 0

  const [selectedAgentBlockId, setSelectedAgentBlockId] = useState<string | null>(
    null,
  )
  const selectedAgentBlock = useMemo(() => {
    if (!selectedAgentBlockId) return null
    return agentBlocks.find((b) => b.id === selectedAgentBlockId) || null
  }, [selectedAgentBlockId, agentBlocks])

  const [activeTab, setActiveTab] = useState('summary')
  const prevAgentResponseTabKey = useRef('')

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

  const selectTab = (tabId: string) => {
    setActiveTab(tabId)
    if (tabId.startsWith('agent:')) {
      setSelectedAgentBlockId(tabId.slice('agent:'.length))
    } else {
      setSelectedAgentBlockId(null)
    }
  }

  const handleFieldFocus = (value: any) => {
    const str = value == null ? '' : String(value).trim()
    if (!str) return
    setActiveHighlightTerm(str)
    setFocusRequestId((id) => id + 1)
  }

  const startAgentWorkflow = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setAgentUploadedFile(file)
    setIsStartingAgentWorkflow(true)

    // Instantly open the request page with a stub to match AP behavior
    const localUrl = URL.createObjectURL(file)
    const startTime = new Date().toISOString()
    const resolvedProcessId = `job-temp-${Date.now()}`

    const wFormId =
      workflow?.formId ??
      workflow?.wFormId ??
      workflow?.settings?.general?.initiateUsing?.formId ??
      ''
    const stubWorkflow = {
      ...workflow,
      flowJson:
        typeof workflow?.flowJson === 'string'
          ? workflow.flowJson
          : JSON.stringify(workflow?.flowJson || {}),
      formJson:
        typeof workflow?.formJson === 'string'
          ? workflow.formJson
          : JSON.stringify(workflow?.formJson || ''),
      wFormId: wFormId || '',
    }

    const lastStubItem = {
      _localFileUrl: localUrl,
      createdAt: startTime,
      documentNumber: t`Processing Document...`,
      id: resolvedProcessId,
      isProcessing: true,
      processId: resolvedProcessId,
      reqNo: t`New Request`,
      requestNo: t`New Request`,
      stage: t`Initiating...`,
      stageType: 'AGENT',
    }

    // Wait for the API response before opening the request

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', '')
      formData.append('envType', 'trial')

      const { data, error } = await workflowsApiV6.startWorkflow(
        workflow?.id,
        formData,
      )

      if (error) {
        throw new Error(String(error))
      }

      if (data) {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data
        const processId =
          parsedData?.instanceId || parsedData?.items?.[0]?.workflowInstanceId

        if (processId) {
          const item = parsedData?.items?.[0]
          const nextItem = item || {
            ...lastStubItem,
            id: processId,
            processId: processId,
            workflowInstanceId: processId,
            transactionId: parsedData?.transactionId
          }
          requestStore.getState().openRequest(nextItem, stubWorkflow, 'Inbox')
          requestStore.getState().workflowRefresh()
          onClose()
        } else {
          throw new Error('Instance ID not returned')
        }
      }
    } catch (e: any) {
      showToast({
        message: e?.message || t`Failed to start workflow`,
        variant: 'error',
      })
    } finally {
      if (typeof setIsStartingAgentWorkflow === 'function') {
        setIsStartingAgentWorkflow(false)
      }
    }
  }

  const {
    addAttachment,
    addComment,
    applyOcrFieldList,
    attachments,
    cancelPendingUpload,
    commentDraft,
    comments,
    confirmUpload,
    formModel,
    hasAttemptedSubmit,
    isExtractingOcr,
    isLoadingForm,
    isSubmitting,
    isUploadingAttachment,
    loadError,
    missingMandatoryFieldIds,
    needsManualUpload,
    panels,
    removeAttachment,
    repoFieldDescriptors,
    repoFieldHints,
    submit,
    submitError,
    uploadedFiles,
    setCommentDraft,
    setFieldValue,
  } = useWorkflowForm(workflow)

  const summaryHiddenFieldIds = useMemo(() => {
    const ids = new Set<string>()
    panels.flatMap((p: any) => p.fields || []).forEach((field: any) => {
      if (field.type === 'DYNAMIC_TABLE' || field.type === 'TABLE') {
        ids.add(String(field.id))
      }
    })
    return ids
  }, [panels])

  const lineItemsHiddenFieldIds = useMemo(() => {
    const ids = new Set<string>()
    let hasLineItems = false
    panels.flatMap((p: any) => p.fields || []).forEach((field: any) => {
      if (field.type === 'DYNAMIC_TABLE' || field.type === 'TABLE') {
        hasLineItems = true
      } else {
        ids.add(String(field.id))
      }
    })
    return { ids, hasLineItems }
  }, [panels])

  const standardTabs = useMemo(
    () =>
      [
        { icon: 'tabler:file-text', id: 'summary', label: t`Extracted Data` },
        lineItemsHiddenFieldIds.hasLineItems
          ? {
              icon: 'tabler:layers-linked',
              id: 'line_items',
              label: t`Line Items`,
            }
          : null,
        {
          count: attachments.length,
          icon: 'tabler:paperclip',
          id: 'attachments',
          label: t`Attachments`,
        },
        {
          count: comments.length,
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
    [
      attachments.length,
      comments.length,
      lineItemsHiddenFieldIds.hasLineItems,
      t,
    ],
  )

  const tabs = useMemo(() => {
    if (!hasAgents || !hasAgentResponseTabs) return standardTabs
    const agentTabs = agentResponseTabs.map((block) => ({
      icon: block.icon || 'lucide:cpu',
      id: `agent:${block.id}`,
      label: block.settings?.label || t`Agent`,
    }))
    return [
      ...agentTabs,
      {
        count: attachments.length,
        icon: 'tabler:paperclip',
        id: 'attachments',
        label: t`Attachments`,
      },
      {
        count: comments.length,
        icon: 'tabler:message-circle',
        id: 'comments',
        label: t`Comments`,
      },
      { icon: 'tabler:history', id: 'history', label: t`History` },
    ]
  }, [
    agentResponseTabs,
    attachments.length,
    comments.length,
    hasAgentResponseTabs,
    hasAgents,
    standardTabs,
    t,
  ])

  const handleSubmit = async () => {
    const result = await submit()
    if (!result.success) {
      // A missing-required-field(s) message is guidance, not a failure —
      // show it as info so it doesn't read like something broke.
      const isMissingFieldsMessage = missingMandatoryFieldIds.size > 0
      showToast({
        message:
          submitError || t`Failed to start the workflow. Please try again.`,
        variant: isMissingFieldsMessage ? 'info' : 'error',
      })
      const firstMissingId = missingMandatoryFieldIds.values().next().value
      if (firstMissingId) {
        const target = document.querySelector(
          `[data-field-id="${firstMissingId}"]`,
        )
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.querySelector<HTMLElement>('input, select, textarea')?.focus()
      }
      return
    }

    showToast({
      message: t`Request submitted successfully.`,
      variant: 'success',
    })
    workflowRefresh()
    onClose()
  }

  const handleConfirmUpload = async () => {
    setIsConfirmingUpload(true)
    const result = await confirmUpload()
    setIsConfirmingUpload(false)
    if (!result.success) {
      showToast({
        message: submitError || t`Failed to upload the file. Please try again.`,
        variant: 'error',
      })
    }
  }

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <Header
        attachmentCount={attachments.length}
        commentCount={comments.length}
        isSubmitDisabled={isLoadingForm || !!loadError}
        isSubmitting={isSubmitting}
        title={t`New Request`}
        onClose={onClose}
        onSubmit={createdInstanceId || agentBlocks.length > 0 ? undefined : handleSubmit}
      />

      {isLoadingForm ? (
        <AnimateFadeIn className='flex flex-1 flex-col items-center justify-center gap-3'>
          <div className='flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-1)] shadow-sm'>
            <Icon
              className='size-7 animate-spin text-[var(--primary-9)]'
              name='tabler:loader-2'
            />
          </div>
          <p className='text-14 font-medium text-gray-11'>{t`Loading form…`}</p>
        </AnimateFadeIn>
      ) : loadError ? (
        <AnimateFadeIn className='flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center'>
          <div className='flex size-14 items-center justify-center rounded-2xl bg-gray-2 shadow-sm'>
            <Icon className='size-7 text-gray-8' name='tabler:file-off' />
          </div>
          <p className='text-14 font-medium text-gray-12'>{loadError}</p>
        </AnimateFadeIn>
      ) : (
        <div className='flex min-h-0 min-w-0 flex-1 overflow-hidden'>
          {isDocumentForm && uploadedFiles.length === 0 && !createdInstanceId && !isStartingAgentWorkflow ? (
            <DocumentFormUpload
              isUploading={isUploadingAttachment || isExtractingOcr || isStartingAgentWorkflow}
              workflow={workflow}
              onFilesSelected={(files) => {
                if (agentBlocks.length > 0) {
                  startAgentWorkflow(files)
                } else {
                  addAttachment(files)
                }
              }}
            />
          ) : isDocumentForm && (uploadedFiles.length > 0 || createdInstanceId || isStartingAgentWorkflow) ? (
            <div className='flex min-w-0 flex-1 gap-0 overflow-hidden bg-[var(--gray-1)]'>
              <div className='relative flex h-full w-[42%] max-w-[800px] min-w-[280px] shrink-0 flex-col overflow-hidden border-r border-[var(--gray-3)] bg-surface'>
                <UploadedFilePreview
                  activeHighlightTerm={activeHighlightTerm}
                  activeKey={activeFileKey}
                  files={agentUploadedFile ? [{ key: 'agent-file', fileName: agentUploadedFile.name, rawFile: agentUploadedFile }] : uploadedFiles}
                  focusRequestId={focusRequestId}
                  onSelectKey={setActiveFileKey}
                />
              </div>
              <div className='flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--gray-1)]'>
                {agentBlocks.length > 0 && (
                  <div className='pb-5 mt-5 mr-5 ml-5'>
                    <AgentSummaryBoxes
                      agentBlocks={agentBlocks}
                      selectedAgentBlockId={selectedAgentBlockId}
                      onAgentClick={(blockId) => {
                        if (!blockId) {
                          setSelectedAgentBlockId(null)
                          setActiveTab(
                            hasAgentResponseTabs
                              ? `agent:${agentResponseTabs[0]?.id}`
                              : 'summary',
                          )
                          return
                        }
                        setSelectedAgentBlockId(blockId)
                        setActiveTab(`agent:${blockId}`)
                      }}
                      requestData={requestData || null}
                    />
                  </div>
                )}
                <div className='sticky top-0 z-10 shrink-0 border-b border-[var(--gray-3)] bg-surface px-2 pt-2 mb-4 overflow-x-auto no-scrollbar scrollbar-none'>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex items-center gap-2 sm:gap-6 md:gap-8 min-w-0 overflow-x-auto no-scrollbar'>
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          className={cn(
                            '-mb-[2px] flex shrink-0 whitespace-nowrap items-center gap-1.5 sm:gap-2 border-b-2 pb-3.5 text-[11px] font-semibold transition-all',
                            activeTab === tab.id
                              ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                              : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
                          )}
                          onClick={() => selectTab(tab.id)}
                        >
                          <Icon name={tab.icon} className='h-4 w-4 shrink-0' />
                          <span>{tab.label}</span>
                          {'count' in tab && tab.count !== undefined && (
                            <span className="flex h-4 items-center justify-center rounded-full bg-gray-2 px-1.5 text-[10px] font-semibold text-gray-12">
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
                    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto pr-3.5'>
                      <AgentDetailPlaceholder
                        agentBlock={selectedAgentBlock}
                        formModel={formModel}
                        hideBack={hasAgentResponseTabs}
                        onBack={() => {
                          setSelectedAgentBlockId(null)
                          setActiveTab(
                            hasAgentResponseTabs
                              ? `agent:${agentResponseTabs[0]?.id}`
                              : 'summary',
                          )
                        }}
                        onFieldChange={setFieldValue}
                        rawWorkflowData={workflow}
                        requestData={requestData || null}
                      />
                    </div>
                  ) : activeTab === 'summary' ? (
                    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-2'>
                      <WorkflowFormRenderer
                        formModel={formModel}
                        hasAttemptedSubmit={hasAttemptedSubmit}
                        hiddenFieldIds={summaryHiddenFieldIds}
                        hidePanels={agentBlocks.length > 0}
                        missingMandatoryFieldIds={missingMandatoryFieldIds}
                        panels={panels}
                        presentation='extracted'
                        repoFieldHints={repoFieldHints}
                        repositoryId={workflow?.repositoryId}
                        onFieldChange={setFieldValue}
                        onOcrFieldList={applyOcrFieldList}
                      />
                    </div>
                  ) : activeTab === 'line_items' && lineItemsHiddenFieldIds.hasLineItems ? (
                    <div className='flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-4'>
                      <WorkflowFormRenderer
                        formModel={formModel}
                        hasAttemptedSubmit={hasAttemptedSubmit}
                        hiddenFieldIds={lineItemsHiddenFieldIds.ids}
                        hidePanels={agentBlocks.length > 0}
                        missingMandatoryFieldIds={missingMandatoryFieldIds}
                        panels={panels}
                        repoFieldHints={repoFieldHints}
                        repositoryId={workflow?.repositoryId}
                        onFieldChange={setFieldValue}
                        onOcrFieldList={applyOcrFieldList}
                      />
                    </div>
                  ) : activeTab === 'attachments' ? (
                    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto pr-3.5 pt-4'>
                      <AttachmentsPanel
                        attachments={attachments}
                        isUploading={isUploadingAttachment}
                        onAdd={addAttachment}
                        onRemove={removeAttachment}
                      />
                    </div>
                  ) : activeTab === 'comments' ? (
                    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto pr-3.5 pt-4 pb-0'>
                      <CommentsPanel
                        comments={comments}
                        draft={commentDraft}
                        onDraftChange={setCommentDraft}
                        onSend={addComment}
                      />
                    </div>
                  ) : (
                    <div className='flex h-32 items-center justify-center text-sm text-[var(--gray-9)]'>
                      {t`No data available yet.`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : !needsManualUpload ? (
            // Plain form view — covers "no file yet", "still extracting"
            // (the dropzone/field itself shows its own loading state), and
            // "OCR filled everything, auto-staged" alike. The file-preview +
            // repository-fields screen is reserved solely for the case
            // below, where the user still has to supply missing data.
            <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
              <WorkflowFormRenderer
                formModel={formModel}
                hasAttemptedSubmit={hasAttemptedSubmit}
                missingMandatoryFieldIds={missingMandatoryFieldIds}
                panels={panels}
                repoFieldHints={repoFieldHints}
                repositoryId={workflow?.repositoryId}
                onFieldChange={setFieldValue}
                onOcrFieldList={applyOcrFieldList}
              />
            </div>
          ) : (
            <div className='flex min-w-0 flex-1 gap-4 overflow-hidden p-4'>
              <div className='min-w-0 flex-1'>
                <UploadedFilePreview
                  activeHighlightTerm={activeHighlightTerm}
                  activeKey={activeFileKey}
                  files={agentUploadedFile ? [{ key: 'agent-file', fileName: agentUploadedFile.name, rawFile: agentUploadedFile }] : uploadedFiles}
                  focusRequestId={focusRequestId}
                  onSelectKey={setActiveFileKey}
                />
              </div>
              <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
                <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
                  <RepoFieldsPanel
                    descriptors={repoFieldDescriptors}
                    formModel={formModel}
                    hasAttemptedSubmit={hasAttemptedSubmit}
                    missingMandatoryFieldIds={missingMandatoryFieldIds}
                    repoFieldHints={repoFieldHints}
                    repositoryId={workflow?.repositoryId}
                    onFieldChange={setFieldValue}
                    onFieldFocus={handleFieldFocus}
                    onOcrFieldList={applyOcrFieldList}
                  />
                </div>
                <div className='mt-3 flex items-center justify-end gap-2 border-t border-gray-3 pt-3'>
                  <Button
                    label={t`Cancel`}
                    variant='outline'
                    onClick={cancelPendingUpload}
                  />
                  <Button
                    disabled={missingMandatoryFieldIds.size > 0}
                    label={t`Upload`}
                    loading={isConfirmingUpload}
                    variant='solid'
                    onClick={handleConfirmUpload}
                  />
                </div>
              </div>
            </div>
          )}
          {/* The sidebar is no longer rendered here because it is integrated into the tabs */}
        </div>
      )}
    </div>
  )
}

WorkflowRequest.displayName = 'WorkflowRequest'
export default WorkflowRequest
