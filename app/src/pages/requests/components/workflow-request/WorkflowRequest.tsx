import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import showToast from '@/components/base/toast/showToast'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import {
  applySubWorkflowPrefill,
  buildSubWorkflowPrefill,
  flattenFormFields,
  isSubWorkflowEnabled,
  toLinkedProcessSummary,
  useLinkSubProcess,
} from '@/features/sub-workflow'
import useSubWorkflowInitiator from '@/features/sub-workflow/hooks/useSubWorkflowInitiator'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  extractApAgentJobId,
  registerApAgentJobProcessing,
} from '@/pages/requests/utils/registerApAgentJobProcessing'
import {
  computeWorkflowStages,
  extractBlocks,
  getStageTrail,
  getStartStageHiddenFieldIds,
  listWorkflowStages,
} from '@/pages/requests/utils/workflow.utils'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { useHeaderBudget } from '../../hooks/useMasterFormValue'
import AgentDetailPlaceholder from '../request/components/generic-overview/AgentDetailPlaceholder'
import AgentSummaryBoxes, {
  formatAgentDisplayLabel,
  getAgentResponseTabs,
  isShownInRequestPage,
} from '../request/components/generic-overview/AgentSummaryBoxes'
import DocumentFormUpload from '../request/components/newrequest/DocumentFormUpload'
import Header from '../request/components/newrequest/Header'
import InitiateSubWorkflowButton from '../sub-workflow/InitiateSubWorkflowButton'
import SubWorkflowRequest from '../sub-workflow/SubWorkflowRequest'
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
import { getSharedObjectUrl } from '@/pages/requests/utils/sharedObjectUrl'
import WorkflowRequestSidebar from './WorkflowRequestSidebar'

export interface WorkflowRequestSubmitted {
  data: any
  processId: string | null
  requestNo: string | null
}

interface PendingSubProcess {
  processId: string
  requestNo: string | null
  subWorkflowId: number | string
  subWorkflowName: string
}

interface Props {
  workflow: any
  /** Start a request in another workflow from here (Workflow Initiator). */
  allowSubWorkflow?: boolean
  /** Parent form + values; same-label fields are copied in once on load. */
  prefill?: { fields: any[]; model: Record<string, unknown> }
  title?: string
  onClose: () => void
  /** Runs after a successful submit, before the form closes. */
  onSubmitted?: (result: WorkflowRequestSubmitted) => Promise<void> | void
}

type SidePanel = 'attachments' | 'comments'

// Generic, form-driven "New Request" flow for any workflow that isn't
// Accounts Payable: resolves the workflow's form (via workflow.formId),
// renders it with the app's existing form-control components, and submits
// it to start a new workflow instance.
// Missing mandatory fields grouped by the form section (panel) they sit in, in
// form order. Fields that belong to no section (repository fields) go last.
const groupMissingByPanel = (
  panels: any[],
  missing: { id: string; label: string }[],
): { labels: string[]; title: string }[] => {
  const labelById = new Map(missing.map((m) => [String(m.id), m.label]))
  const used = new Set<string>()
  const groups: { labels: string[]; title: string }[] = []
  ;(panels || []).forEach((panel, index) => {
    const labels = new Set<string>()
    for (const field of panel?.fields || []) {
      const key = [field?.id, field?.jsonId]
        .map((value) => String(value ?? ''))
        .find((value) => labelById.has(value))
      if (!key || used.has(key)) continue
      used.add(key)
      labels.add(labelById.get(key) as string)
    }
    if (labels.size > 0) {
      groups.push({
        labels: [...labels],
        title: panel?.settings?.title || `Section ${index + 1}`,
      })
    }
  })
  // A repository field and the form field it maps to share one label and
  // are the same field to the user: list it once, under its section.
  const listed = new Set(
    groups.flatMap((group) =>
      group.labels.map((label) => label.trim().toLowerCase()),
    ),
  )
  const rest = new Set(
    missing
      .filter(
        (m) =>
          !used.has(String(m.id)) &&
          !listed.has(String(m.label).trim().toLowerCase()),
      )
      .map((m) => m.label),
  )
  if (rest.size > 0) groups.push({ labels: [...rest], title: '' })
  return groups
}

const WorkflowRequest = ({
  allowSubWorkflow = true,
  prefill,
  title,
  workflow,
  onClose,
  onSubmitted,
}: Props) => {
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
  // Attachments / Comments header shortcuts: only for form-initiated workflows
  const isFormInitiated = initiateType === 'FORM'

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

  // Previous / current / next step for the header (replaces the stepper card).
  const stageTrail = useMemo(
    () => getStageTrail(workflowStages, workflow),
    [workflow, workflowStages],
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
  // Status cards at the top only for agents with "Show agent on request
  // page" — same rule as the request page after it is created.
  const summaryAgentBlocks = useMemo(
    () => agentBlocks.filter(isShownInRequestPage),
    [agentBlocks],
  )
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
    // Same URL the New Request screen's preview uses, so the request page
    // that opens next shows the already-parsed email.
    const localUrl = getSharedObjectUrl(file)
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
      _localFileName: file.name,
      _localFileType: file.type,
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
    formLayout,
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
    submitAttempt,
    submitError,
    uploadedFiles,
    setCommentDraft,
    setFieldValue,
  } = useWorkflowForm(workflow)

  // Sub-workflow pre-fill: once the form has loaded, copy parent values into
  // fields with the same label, leaving anything already filled alone.
  const prefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!prefill || prefillAppliedRef.current) return
    if (isLoadingForm || loadError || panels.length === 0) return
    prefillAppliedRef.current = true
    const copies = buildSubWorkflowPrefill(
      flattenFormFields(prefill.fields),
      prefill.model,
      flattenFormFields(panels),
    )
    const next = applySubWorkflowPrefill(formModel, copies)
    for (const { targetId } of copies) {
      if (next[targetId] !== formModel[targetId])
        setFieldValue(targetId, next[targetId])
    }
  }, [prefill, isLoadingForm, loadError, panels, formModel, setFieldValue])

  // New request whose START step has a Workflow Initiator: children are
  // created first and linked once this request is submitted (V5
  // AddNewRequest behaviour).
  const subWorkflow = useSubWorkflowInitiator(workflow, null, {
    // Sub-workflow UI is localhost-only until its API is ready.
    enabled: allowSubWorkflow && isSubWorkflowEnabled(),
  })
  const linkSubProcess = useLinkSubProcess()
  const [isInitiatingSubWorkflow, setIsInitiatingSubWorkflow] = useState(false)
  const [pendingSubProcesses, setPendingSubProcesses] = useState<
    PendingSubProcess[]
  >([])

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
    if (isUploadingAttachment) {
      showToast({
        message: t`A file is still uploading. Please wait for it to finish.`,
        variant: 'error',
      })
      return
    }

    const result = await submit()
    if (!result.success) {
      const missingLabels =
        ('missingFieldLabels' in result && result.missingFieldLabels) || []
      const missingIds =
        ('missingFieldIds' in result && result.missingFieldIds) || []
      if (missingLabels.length > 0) {
        const missingFields =
          ('missingFields' in result && result.missingFields) || []
        const groups = groupMissingByPanel(panels, missingFields)
        // Missing mandatory fields block the submit: error toast, listing
        // each section with its missing fields.
        showToast({
          autoClose: 8000,
          id: 'mandatory-validation',
          message: (
            <div className='flex flex-col gap-1'>
              <span>{t`Please fill these mandatory fields to submit:`}</span>
              <ul className='m-0 list-none space-y-0.5 p-0'>
                {groups.map((group) => (
                  <li key={group.title || 'other'}>
                    {group.title ? <strong>{group.title}: </strong> : null}
                    {group.labels.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          ),
          variant: 'error',
        })
        // Scroll to and focus the first missing field that is on screen
        // (a repo field may not be rendered in every layout).
        const focusFirstMissing = () => {
          const target = missingIds
            .map((id) => document.querySelector(`[data-field-id="${id}"]`))
            .find(Boolean)
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          target
            ?.querySelector<HTMLElement>(
              'input:not([type="hidden"]), select, textarea, [tabindex]',
            )
            ?.focus({ preventScroll: true })
        }
        // A field in a closed section is reopened by the form renderer —
        // wait for the section to expand before scrolling to it.
        const firstTarget = missingIds
          .map((id) => document.querySelector(`[data-field-id="${id}"]`))
          .find(Boolean)
        if (firstTarget && firstTarget.getClientRects().length > 0) {
          focusFirstMissing()
        } else {
          setTimeout(focusFirstMissing, 300)
        }
        return
      }
      showToast({
        message:
          ('error' in result && result.error) ||
          submitError ||
          t`Failed to start the workflow. Please try again.`,
        variant: 'error',
      })
      return
    }

    const responseData = (result as any)?.data
    const requestNo =
      responseData?.requestNo ||
      responseData?.items?.[0]?.requestNo ||
      responseData?.data?.requestNo
    showToast({
      message: requestNo
        ? t`Request ${requestNo} submitted successfully.`
        : t`Request submitted successfully.`,
      variant: 'success',
    })
    if (result.commentError) {
      showToast({
        message: t`The request was created, but the comments could not be saved.`,
        variant: 'error',
      })
    }

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

    const createdProcessId = processId ? String(processId) : null
    if (createdProcessId && pendingSubProcesses.length > 0) {
      try {
        await Promise.all(
          pendingSubProcesses.map((child) =>
            linkSubProcess.mutateAsync([
              {
                mainProcessId: createdProcessId,
                mainWorkflowId: workflow?.id,
                subProcessId: child.processId,
                subWorkflowId: child.subWorkflowId,
              },
              {
                child: toLinkedProcessSummary({
                  processId: child.processId,
                  requestNo: child.requestNo,
                  workflowId: child.subWorkflowId,
                  workflowName: child.subWorkflowName,
                }),
                parent: toLinkedProcessSummary({
                  processId: createdProcessId,
                  requestNo,
                  workflowId: workflow?.id,
                  workflowName: workflow?.name,
                }),
              },
            ]),
          ),
        )
      } catch {
        showToast({
          message: t`The request was created, but its sub-process could not be linked.`,
          variant: 'error',
        })
      }
    }

    try {
      await onSubmitted?.({
        data: responseData,
        processId: createdProcessId,
        requestNo: requestNo || null,
      })
    } catch (e) {
      console.error(e)
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
  // Header "Budget": master form "Remaining Budget" for the current lookups.
  const headerBudget = useHeaderBudget(panels, tableUploadModel)
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

  if (isInitiatingSubWorkflow && subWorkflow.childWorkflow) {
    return (
      <SubWorkflowRequest
        childWorkflow={subWorkflow.childWorkflow}
        parent={{
          fields: panels,
          model: formModel,
          workflowName: String(workflow?.name || ''),
        }}
        onClose={() => setIsInitiatingSubWorkflow(false)}
        onCreated={({ processId, requestNo }) => {
          if (!processId) return
          setPendingSubProcesses((prev) => [
            ...prev,
            {
              processId,
              requestNo,
              subWorkflowId: subWorkflow.subWorkflowId,
              subWorkflowName: subWorkflow.childName,
            },
          ])
        }}
      />
    )
  }

  const subWorkflowActions =
    subWorkflow.canInitiate || pendingSubProcesses.length > 0 ? (
      <div className='flex items-center gap-1.5'>
        {pendingSubProcesses.map((child) => (
          <span
            className='animate-in fade-in zoom-in-95 inline-flex h-7 items-center gap-1 rounded-full bg-primary-2 px-2.5 text-12 font-semibold text-primary-11 duration-200'
            key={child.processId}
            title={t`Will be linked as a sub-process when you submit`}
          >
            <Icon className='size-3.5' name='lucide:link-2' />
            {child.requestNo || child.subWorkflowName}
          </span>
        ))}
        {subWorkflow.canInitiate && (
          <InitiateSubWorkflowButton
            childName={subWorkflow.childName}
            disabled={isLoadingForm || !!loadError || isSubmitting}
            onClick={() => setIsInitiatingSubWorkflow(true)}
          />
        )}
      </div>
    ) : null

  return (
    <WorkflowNameContext.Provider value={String(workflow?.name || '')}>
      <WorkflowRepositoryIdContext.Provider value={workflowRepositoryId}>
      <WorkflowTableUploadContext.Provider value={requestTableUpload}>
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
        <Header
          activePanel={activePanel}
          attachmentCount={attachments.length}
          budget={headerBudget}
          commentCount={comments.length}
          extraActions={subWorkflowActions}
          isSubmitDisabled={
            isLoadingForm ||
            !!loadError ||
            Boolean(activeTableUpload) ||
            isUploadingAttachment
          }
          isSubmitting={isSubmitting}
          stageTrail={stageTrail}
          title={title ?? t`New Submission`}
          onClose={onClose}
          onTogglePanel={
            isFormInitiated
              ? (panel) =>
                  setActivePanel((current) => (current === panel ? null : panel))
              : undefined
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
                  {summaryAgentBlocks.length > 0 && (
                    <div className='px-4 pt-4 pb-3'>
                      <AgentSummaryBoxes
                        agentBlocks={summaryAgentBlocks}
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
                          hidePanels={agentBlocks.length > 0}
                          missingMandatoryFieldIds={missingMandatoryFieldIds}
                          panels={panels}
                          presentation='extracted'
                          repoFieldHints={repoFieldHints}
                          repositoryId={workflowRepositoryId}
                          submitAttempt={submitAttempt}
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
                          hidePanels={agentBlocks.length > 0}
                          missingMandatoryFieldIds={missingMandatoryFieldIds}
                          panels={panels}
                          repoFieldHints={repoFieldHints}
                          repositoryId={workflowRepositoryId}
                          submitAttempt={submitAttempt}
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
                  layout={formLayout}
                  missingMandatoryFieldIds={missingMandatoryFieldIds}
                  panels={panels}
                  repoFieldHints={repoFieldHints}
                  repositoryId={workflowRepositoryId}
                  submitAttempt={submitAttempt}
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
