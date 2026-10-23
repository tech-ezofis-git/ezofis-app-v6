import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import showToast from '@/components/base/toast/showToast'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  extractApAgentJobId,
  registerApAgentJobProcessing,
} from '@/pages/requests/utils/registerApAgentJobProcessing'
import {
  computeWorkflowStages,
  extractBlocks,
  getStartStageHiddenFieldIds,
  listWorkflowStages,
} from '@/pages/requests/utils/workflow.utils'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import AgentDetailPlaceholder from '../request/components/generic-overview/AgentDetailPlaceholder'
import AgentSummaryBoxes, {
  formatAgentDisplayLabel,
  getAgentResponseTabs,
} from '../request/components/generic-overview/AgentSummaryBoxes'
import DocumentFormUpload from '../request/components/newrequest/DocumentFormUpload'
import Header from '../request/components/newrequest/Header'
import AttachmentsPanel from './components/AttachmentsPanel'
import CommentsPanel from './components/CommentsPanel'
import RepoFieldsPanel from './components/RepoFieldsPanel'
import UploadedFilePreview from './components/UploadedFilePreview'
import { useWorkflowForm } from './hooks/useWorkflowForm'
import WorkflowFormRenderer from './WorkflowFormRenderer'
import {
  WorkflowNameContext,
  WorkflowRepositoryIdContext,
  WorkflowTableUploadContext,
  type TableUploadRequest,
} from './WorkflowNameContext'
import { getWorkflowRepositoryId } from './utils/gmailFormAttachment'
import {
  buildRepoFieldDescriptors,
  getMissingMandatoryFieldIds,
  getRepoFieldValue,
  stringifyFieldValue,
  syntheticFieldId,
  withoutRequestNumberMandatory,
} from './utils/fieldRendering'
import WorkflowRequestSidebar from './WorkflowRequestSidebar'

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

  useEffect(() => {
    const site = window.location.origin
    const requestName = String(workflow?.name || '').trim()
    const confirmLeave = (event: BeforeUnloadEvent) => {
      const message = requestName
        ? t`Leave ${site}? Your ${requestName} request may not be saved.`
        : t`Leave ${site}? Your new request may not be saved.`
      event.preventDefault()
      event.returnValue = message
      return message
    }
    window.addEventListener('beforeunload', confirmLeave)
    return () => window.removeEventListener('beforeunload', confirmLeave)
  }, [t, workflow?.name])

  const workflowRefresh = requestStore((state) => state.workflowRefresh)
  const [activePanel, setActivePanel] = useState<SidePanel | null>(null)
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null)
  const workflowRepositoryId = getWorkflowRepositoryId(workflow)
  const [isConfirmingUpload, setIsConfirmingUpload] = useState(false)
  const [tableUploads, setTableUploads] = useState<TableUploadRequest[]>([])
  const [tableUploadValues, setTableUploadValues] = useState<
    Record<string, any>
  >({})
  const [isConfirmingTableUpload, setIsConfirmingTableUpload] = useState(false)
  // Clicking a repository field highlights its value in the file preview —
  // focusRequestId is bumped on every click (even re-clicking the same
  // field) so the viewer re-scrolls to it each time.
  const [activeHighlightTerm, setActiveHighlightTerm] = useState<string | null>(
    null,
  )
  const [focusRequestId, setFocusRequestId] = useState(0)

  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(
    null,
  )
  const [isStartingAgentWorkflow, setIsStartingAgentWorkflow] = useState(false)
  const [agentUploadedFile, setAgentUploadedFile] = useState<File | null>(null)

  const parsedWorkflowJson = useMemo(() => {
    if (!workflow) return null
    if (workflow.workflowJson && typeof workflow.workflowJson === 'string') {
      try {
        return JSON.parse(workflow.workflowJson)
      } catch {
        return null
      }
    }
    return workflow.workflowJson || null
  }, [workflow])

  const parsedFlowJson = useMemo(() => {
    if (!workflow) return null
    if (workflow.flowJson && typeof workflow.flowJson === 'string') {
      try {
        return JSON.parse(workflow.flowJson)
      } catch {
        return null
      }
    }
    return workflow.flowJson || null
  }, [workflow])

  const resolvedFormId = useMemo(
    () =>
      workflow?.formId ??
      workflow?.wFormId ??
      workflow?.settings?.general?.initiateUsing?.formId ??
      parsedWorkflowJson?.settings?.general?.initiateUsing?.formId ??
      parsedFlowJson?.settings?.general?.initiateUsing?.formId ??
      workflow?.form ??
      '',
    [workflow, parsedWorkflowJson, parsedFlowJson],
  )

  const { data: requestData } = useRequestDetail(
    workflow?.id,
    createdInstanceId,
    null,
    true,
    resolvedFormId || null,
  )

  const initiateType = String(
    workflow?.settings?.general?.initiateUsing?.type ||
      parsedWorkflowJson?.settings?.general?.initiateUsing?.type ||
      parsedFlowJson?.settings?.general?.initiateUsing?.type ||
      '',
  )
    .toUpperCase()
    .replace(/[-_\s]/g, '')
  const isDocumentForm = initiateType === 'DOCUMENTFORM'

  const isCompleted =
    Boolean(requestData?.isCompleted) ||
    Boolean(requestData?.completedAtUtc) ||
    Boolean(requestData?.completedAt) ||
    [
      'completed',
      'approved',
      'closed',
      'paid',
      'success',
      'succeeded',
    ].includes(
      String(requestData?.status || '')
        .toLowerCase()
        .trim(),
    )
  const currentActivityId = requestData?.activityId
    ? String(requestData.activityId)
    : undefined

  const workflowStages = useMemo(
    () =>
      computeWorkflowStages({
        workflow,
        history: requestData?._history || [],
        currentActivityId,
        isCompleted,
      }),
    [workflow, requestData?._history, currentActivityId, isCompleted],
  )

  const agentBlocks = useMemo(() => {
    const blocks = extractBlocks(workflow)
    return blocks.filter((b: any) => b.type && b.type.includes('AGENT'))
  }, [workflow])

  const agentResponseTabs = useMemo(
    () => getAgentResponseTabs(agentBlocks, requestData, workflow),
    [agentBlocks, requestData, workflow],
  )
  const agentResponseTabKey = agentResponseTabs.map((b) => b.id).join('|')
  const hasAgents = agentBlocks.length > 0
  const hasAgentResponseTabs = agentResponseTabs.length > 0

  const initialAgentId =
    agentResponseTabs[0]?.id ??
    agentBlocks.find(
      (b: any) =>
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
  const selectedAgentBlock = useMemo(() => {
    if (!selectedAgentBlockId) return null
    return agentBlocks.find((b) => b.id === selectedAgentBlockId) || null
  }, [selectedAgentBlockId, agentBlocks])

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

    const wFormId = resolvedFormId || ''
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
        const apAgentJobId = extractApAgentJobId(parsedData)

        if (processId || apAgentJobId) {
          const item = parsedData?.items?.[0]
          const resolvedProcessId =
            processId || (apAgentJobId ? `job-${apAgentJobId}` : null)
          if (apAgentJobId) {
            registerApAgentJobProcessing({
              apAgentJobId,
              name: file.name,
              processId: resolvedProcessId,
              stage: t`Initiating...`,
              transactionId:
                item?.transactionId || parsedData?.transactionId || null,
              workflowId: workflow?.id,
            })
          }
          const nextItem = {
            ...(item || lastStubItem),
            apAgentJobId: apAgentJobId || null,
            id: item?.id || resolvedProcessId,
            isProcessing: true,
            processId: item?.processId || resolvedProcessId,
            transactionId: item?.transactionId || parsedData?.transactionId,
            workflowInstanceId: item?.workflowInstanceId || processId,
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
    missingRepoMandatoryFieldIds,
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

  const stageHiddenFieldIds = useMemo(
    () =>
      getStartStageHiddenFieldIds(
        workflow,
        panels,
        String(authUserStore.getState().session?.id || ''),
      ),
    [workflow, panels],
  )

  const summaryHiddenFieldIds = useMemo(() => {
    const ids = new Set<string>(stageHiddenFieldIds)
    panels
      .flatMap((p: any) => p.fields || [])
      .forEach((field: any) => {
        if (field.type === 'DYNAMIC_TABLE' || field.type === 'TABLE') {
          ids.add(String(field.id))
        }
      })
    return ids
  }, [panels, stageHiddenFieldIds])

  const lineItemsHiddenFieldIds = useMemo(() => {
    const ids = new Set<string>(stageHiddenFieldIds)
    let hasLineItems = false
    panels
      .flatMap((p: any) => p.fields || [])
      .forEach((field: any) => {
        if (field.type === 'DYNAMIC_TABLE' || field.type === 'TABLE') {
          hasLineItems = true
        } else {
          ids.add(String(field.id))
        }
      })
    return { hasLineItems, ids }
  }, [panels, stageHiddenFieldIds])

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
      label: formatAgentDisplayLabel(block),
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
    if (result.commentError) {
      showToast({
        message: t`The request was created, but the comments could not be saved.`,
        variant: 'error',
      })
    }

    const responseData = (result as any)?.data
    const apAgentJobId = extractApAgentJobId(responseData)
    const processId =
      responseData?.instanceId ||
      responseData?.workflowInstanceId ||
      responseData?.processId ||
      responseData?.items?.[0]?.workflowInstanceId

    if (apAgentJobId) {
      registerApAgentJobProcessing({
        apAgentJobId,
        processId: processId || `job-${apAgentJobId}`,
        stage: t`Processing`,
        transactionId:
          responseData?.transactionId ||
          responseData?.items?.[0]?.transactionId ||
          null,
        workflowId: workflow?.id,
      })
    }

    workflowRefresh()
    onClose()
  }

  // Table file waiting on mandatory repository fields: queued by the table,
  // shown in the viewer with the repository fields beside it.
  const requestTableUpload = useCallback((request: TableUploadRequest) => {
    setTableUploads((prev) => [...prev, request])
  }, [])
  const activeTableUpload = tableUploads[0] ?? null

  useEffect(() => {
    if (!activeTableUpload) {
      setTableUploadValues({})
      return
    }
    const seeded: Record<string, any> = {}
    for (const [name, value] of Object.entries(
      activeTableUpload.initialValues,
    )) {
      if (value) seeded[syntheticFieldId(name)] = value
    }
    setTableUploadValues(seeded)
  }, [activeTableUpload])

  const tableUploadDescriptors = useMemo(
    () =>
      activeTableUpload
        ? withoutRequestNumberMandatory(
            buildRepoFieldDescriptors(activeTableUpload.repoFields, panels),
          )
        : [],
    [activeTableUpload, panels],
  )
  const tableUploadModel = useMemo(
    () => ({ ...formModel, ...tableUploadValues }),
    [formModel, tableUploadValues],
  )
  const missingTableUploadIds = useMemo(
    () =>
      getMissingMandatoryFieldIds(
        tableUploadDescriptors,
        panels,
        tableUploadModel,
        { hasUploadedFile: true, repoOnly: true },
      ),
    [tableUploadDescriptors, panels, tableUploadModel],
  )

  const finishTableUpload = () => setTableUploads((prev) => prev.slice(1))

  const handleCancelTableUpload = () => {
    activeTableUpload?.onCancel()
    finishTableUpload()
  }

  const handleConfirmTableUpload = async () => {
    if (!activeTableUpload || missingTableUploadIds.size > 0) return
    const values: Record<string, string> = {}
    for (const descriptor of tableUploadDescriptors) {
      values[descriptor.repoField.name!] = stringifyFieldValue(
        getRepoFieldValue(descriptor, tableUploadModel),
      )
    }
    setIsConfirmingTableUpload(true)
    try {
      await activeTableUpload.onConfirm(values)
      finishTableUpload()
    } catch {
      showToast({
        message: t`Failed to upload the file. Please try again.`,
        variant: 'error',
      })
    } finally {
      setIsConfirmingTableUpload(false)
    }
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
    <WorkflowNameContext.Provider value={String(workflow?.name || '')}>
      <WorkflowRepositoryIdContext.Provider value={workflowRepositoryId}>
      <WorkflowTableUploadContext.Provider value={requestTableUpload}>
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
        <Header
          activePanel={activePanel}
          attachmentCount={attachments.length}
          commentCount={comments.length}
          isSubmitDisabled={
            isLoadingForm || !!loadError || Boolean(activeTableUpload)
          }
          isSubmitting={isSubmitting}
          title={t`New Request`}
          onClose={onClose}
          onTogglePanel={(panel) =>
            setActivePanel((current) => (current === panel ? null : panel))
          }
          onSubmit={
            createdInstanceId || (isDocumentForm && hasAgents)
              ? undefined
              : handleSubmit
          }
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
            {activeTableUpload ? (
              <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
                <div className='flex shrink-0 items-center gap-2 border-b border-gray-3 bg-surface px-4 py-2.5'>
                  <button
                    className='group flex cursor-pointer items-center gap-1 text-xs font-semibold text-gray-11 transition-all hover:text-gray-13 active:scale-95'
                    type='button'
                    onClick={handleCancelTableUpload}
                  >
                    <Icon
                      className='size-4 transition-transform group-hover:-translate-x-0.5'
                      name='tabler:arrow-left'
                    />
                    <span>{t`Back`}</span>
                  </button>
                </div>
                <div className='flex min-h-0 min-w-0 flex-1 gap-4 overflow-hidden p-4'>
                  <div className='min-w-0 flex-1'>
                    <UploadedFilePreview
                      activeHighlightTerm={activeHighlightTerm}
                      activeKey={null}
                      focusRequestId={focusRequestId}
                      files={[
                        {
                          fileName: activeTableUpload.file.name,
                          key: 'table-file',
                          rawFile: activeTableUpload.file,
                        },
                      ]}
                      onSelectKey={() => {}}
                    />
                  </div>
                  <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
                    <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
                      <RepoFieldsPanel
                        descriptors={tableUploadDescriptors}
                        formModel={tableUploadModel}
                        hasAttemptedSubmit
                        missingMandatoryFieldIds={missingTableUploadIds}
                        repoFieldHints={repoFieldHints}
                        repositoryId={workflowRepositoryId}
                        onFieldChange={(fieldId, value) =>
                          setTableUploadValues((prev) => ({
                            ...prev,
                            [fieldId]: value,
                          }))
                        }
                        onFieldFocus={handleFieldFocus}
                      />
                    </div>
                    <div className='mt-3 flex items-center justify-end gap-2 border-t border-gray-3 pt-3'>
                      <Button
                        label={t`Cancel`}
                        variant='outline'
                        onClick={handleCancelTableUpload}
                      />
                      <Button
                        disabled={missingTableUploadIds.size > 0}
                        label={t`Upload`}
                        loading={isConfirmingTableUpload}
                        variant='solid'
                        onClick={handleConfirmTableUpload}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {/* Kept mounted (just hidden) while a table file is being indexed,
                so the form and its table keep their state. */}
            <div
              className={cn(
                'flex min-h-0 min-w-0 flex-1 overflow-hidden',
                activeTableUpload && 'hidden',
              )}
            >
            {isDocumentForm &&
            uploadedFiles.length === 0 &&
            !createdInstanceId &&
            !isStartingAgentWorkflow ? (
              <DocumentFormUpload
                workflow={workflow}
                isUploading={
                  isUploadingAttachment ||
                  isExtractingOcr ||
                  isStartingAgentWorkflow
                }
                onFilesSelected={(files) => {
                  if (agentBlocks.length > 0) {
                    startAgentWorkflow(files)
                  } else {
                    addAttachment(files)
                  }
                }}
              />
            ) : isDocumentForm &&
              (uploadedFiles.length > 0 ||
                createdInstanceId ||
                isStartingAgentWorkflow) ? (
              <div className='flex min-w-0 flex-1 gap-0 overflow-hidden bg-gray-1'>
                <div className='relative flex h-full w-[42%] max-w-[800px] min-w-[280px] shrink-0 flex-col overflow-hidden border-r border-gray-3 bg-gray-1 p-4'>
                  <UploadedFilePreview
                    activeHighlightTerm={activeHighlightTerm}
                    activeKey={activeFileKey}
                    focusRequestId={focusRequestId}
                    files={
                      agentUploadedFile
                        ? [
                            {
                              fileName: agentUploadedFile.name,
                              key: 'agent-file',
                              rawFile: agentUploadedFile,
                            },
                          ]
                        : uploadedFiles
                    }
                    onSelectKey={setActiveFileKey}
                  />
                </div>
                <div className='flex min-w-0 flex-1 flex-col overflow-hidden bg-gray-1'>
                  {agentBlocks.length > 0 && (
                    <div className='px-4 pt-4 pb-3'>
                      <AgentSummaryBoxes
                        agentBlocks={agentBlocks}
                        requestData={requestData || null}
                        workflow={workflow}
                      />
                    </div>
                  )}
                  <div className='no-scrollbar scrollbar-none sticky top-0 z-10 shrink-0 overflow-x-auto border-b border-gray-3 bg-surface px-4 pt-2'>
                    <div className='flex items-center justify-between gap-4'>
                      <div className='no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-6 md:gap-8'>
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            className={cn(
                              '-mb-[2px] flex shrink-0 items-center gap-1.5 border-b-2 pb-3.5 text-[11px] font-semibold whitespace-nowrap transition-all sm:gap-2',
                              activeTab === tab.id
                                ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                                : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
                            )}
                            onClick={() => selectTab(tab.id)}
                          >
                            <Icon
                              className='h-4 w-4 shrink-0'
                              name={tab.icon}
                            />
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
                      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
                        <AgentDetailPlaceholder
                          agentBlock={selectedAgentBlock}
                          formModel={formModel}
                          hideBack={hasAgentResponseTabs}
                          rawWorkflowData={workflow}
                          requestData={requestData || null}
                          onBack={() => {
                            setSelectedAgentBlockId(null)
                            setActiveTab(
                              hasAgentResponseTabs
                                ? `agent:${agentResponseTabs[0]?.id}`
                                : 'summary',
                            )
                          }}
                          onFieldChange={setFieldValue}
                        />
                      </div>
                    ) : activeTab === 'summary' ? (
                      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
                        <WorkflowFormRenderer
                          currentActivityId={currentActivityId}
                          formModel={formModel}
                          hasAttemptedSubmit={hasAttemptedSubmit}
                          hiddenFieldIds={summaryHiddenFieldIds}
                          stages={workflowStages}
                          hidePanels={agentBlocks.length > 0}
                          missingMandatoryFieldIds={missingMandatoryFieldIds}
                          panels={panels}
                          presentation='extracted'
                          repoFieldHints={repoFieldHints}
                          repositoryId={workflowRepositoryId}
                          onFieldChange={setFieldValue}
                          onAddAttachments={addAttachment}
                          onOcrFieldList={applyOcrFieldList}
                        />
                      </div>
                    ) : activeTab === 'line_items' &&
                      lineItemsHiddenFieldIds.hasLineItems ? (
                      <div className='flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-4'>
                        <WorkflowFormRenderer
                          currentActivityId={currentActivityId}
                          formModel={formModel}
                          hasAttemptedSubmit={hasAttemptedSubmit}
                          hiddenFieldIds={lineItemsHiddenFieldIds.ids}
                          stages={workflowStages}
                          hidePanels={agentBlocks.length > 0}
                          missingMandatoryFieldIds={missingMandatoryFieldIds}
                          panels={panels}
                          repoFieldHints={repoFieldHints}
                          repositoryId={workflowRepositoryId}
                          onFieldChange={setFieldValue}
                          onAddAttachments={addAttachment}
                          onOcrFieldList={applyOcrFieldList}
                        />
                      </div>
                    ) : activeTab === 'attachments' ? (
                      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4'>
                        <AttachmentsPanel
                          attachments={attachments}
                          isUploading={isUploadingAttachment}
                          onAdd={addAttachment}
                          onRemove={removeAttachment}
                        />
                      </div>
                    ) : activeTab === 'comments' ? (
                      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-0'>
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
                  currentActivityId={currentActivityId}
                  formModel={formModel}
                  hasAttemptedSubmit={hasAttemptedSubmit}
                  hiddenFieldIds={stageHiddenFieldIds}
                  missingMandatoryFieldIds={missingMandatoryFieldIds}
                  panels={panels}
                  stages={workflowStages}
                  repoFieldHints={repoFieldHints}
                  repositoryId={workflowRepositoryId}
                  onFieldChange={setFieldValue}
                  onAddAttachments={addAttachment}
                  onOcrFieldList={applyOcrFieldList}
                />
              </div>
            ) : (
              <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
                <div className='flex shrink-0 items-center gap-2 border-b border-gray-3 bg-surface px-4 py-2.5'>
                  <button
                    className='group flex cursor-pointer items-center gap-1 text-xs font-semibold text-gray-11 transition-all hover:text-gray-13 active:scale-95'
                    type='button'
                    onClick={cancelPendingUpload}
                  >
                    <Icon
                      className='size-4 transition-transform group-hover:-translate-x-0.5'
                      name='tabler:arrow-left'
                    />
                    <span>{t`Back`}</span>
                  </button>
                </div>
                <div className='flex min-h-0 min-w-0 flex-1 gap-4 overflow-hidden p-4'>
                  <div className='min-w-0 flex-1'>
                    <UploadedFilePreview
                      activeHighlightTerm={activeHighlightTerm}
                      activeKey={activeFileKey}
                      focusRequestId={focusRequestId}
                      files={
                        agentUploadedFile
                          ? [
                              {
                                fileName: agentUploadedFile.name,
                                key: 'agent-file',
                                rawFile: agentUploadedFile,
                              },
                            ]
                          : uploadedFiles
                      }
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
                        repositoryId={workflowRepositoryId}
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
                        disabled={missingRepoMandatoryFieldIds.size > 0}
                        label={t`Upload`}
                        loading={isConfirmingUpload}
                        variant='solid'
                        onClick={handleConfirmUpload}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
            {activePanel ? (
              <WorkflowRequestSidebar
                activePanel={activePanel}
                attachments={attachments}
                commentDraft={commentDraft}
                comments={comments}
                isUploadingAttachment={isUploadingAttachment}
                onAddAttachment={addAttachment}
                onClose={() => setActivePanel(null)}
                onCommentDraftChange={setCommentDraft}
                onRemoveAttachment={removeAttachment}
                onSendComment={addComment}
              />
            ) : null}
          </div>
        )}
      </div>
      </WorkflowTableUploadContext.Provider>
      </WorkflowRepositoryIdContext.Provider>
    </WorkflowNameContext.Provider>
  )
}

WorkflowRequest.displayName = 'WorkflowRequest'
export default WorkflowRequest
