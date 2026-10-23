import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import {
  type RegenerateAgentResponse,
  workflowsApiV6,
} from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import {
  getFirstReceivedAttachment,
  getLatestAttachment,
} from '@/pages/requests/components/workflow-request/utils/gmailFormAttachment'
import { useAttachmentPreviewUrl } from '@/pages/requests/hooks/useAttachmentPreviewUrl'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  isApAgentJobCompleted,
  resolveApAgentJobMessage,
} from '@/pages/requests/utils/resolveApAgentJobMessage'
import cn from '@/utils/cn'
import {
  type AgentBlock,
  documentGenerateIsComplete,
  formatAgentDisplayLabel,
  isAgentStepBefore,
  isFailedAgentBlock,
} from './AgentSummaryBoxes'
import QualifyAgentResultView from './QualifyAgentResultView'
import QuoteAgentResultView from './QuoteAgentResultView'

interface AgentDetailPlaceholderProps {
  agentBlock: AgentBlock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestData: any
  attachments?: AttachmentItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formModel?: Record<string, any>
  hiddenFieldIds?: Set<string>
  hideBack?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawWorkflowData?: any
  readOnlyFieldIds?: Set<string>
  repositoryId?: string | number
  viewOnly?: boolean
  onBack: () => void
  onFieldChange?: (fieldId: string, value: any) => void
  onFieldsChange?: (patch: Record<string, any>) => void
  onQuoteTotalChange?: (total: number | null) => void
}

type AgentLoadingStep = {
  startedAt: number
  text: string
}

const attachmentIdOf = (file: AttachmentItem | null | undefined) =>
  String(file?.itemId || file?.fileId || file?.id || '')

const textOf = (value: unknown) => String(value || '').trim()

const parseJson = (value: unknown) => {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/** 4s, 1m 05s */
const formatElapsed = (ms: number) => {
  const total = Math.max(1, Math.round(ms / 1000))
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}m ${seconds}s`
}

const AgentDetailPlaceholder: React.FC<AgentDetailPlaceholderProps> = ({
  agentBlock,
  attachments = [],
  formModel,
  hiddenFieldIds,
  hideBack = false,
  rawWorkflowData,
  readOnlyFieldIds,
  repositoryId,
  requestData,
  viewOnly,
  onBack,
  onFieldChange,
  onFieldsChange,
  onQuoteTotalChange,
}) => {
  const { t } = useLingui()
  const jobStatuses = requestStore((state) => state.jobStatuses)
  const jobMappings = requestStore((state) => state.jobMappings)
  const processingProcesses = requestStore((state) => state.processingProcesses)
  const label = formatAgentDisplayLabel(agentBlock)
  const iconName = agentBlock.icon || 'lucide:cpu'
  const settings = agentBlock.settings || {}

  const isQualify =
    agentBlock.settings?.subtype === 'QUALIFY' ||
    label.includes('Qualify') ||
    label.includes('Qualifier')
  const isQuote =
    agentBlock.settings?.subtype === 'QUOTE' ||
    agentBlock.type === 'QUOTE_AGENT' ||
    label.includes('Quote') ||
    label.includes('Quote Estimator')
  const isDocGen =
    agentBlock.type === 'DOCUMENT_GENERATE_AGENT' ||
    agentBlock.settings?.subtype === 'DOCUMENT_GENERATE' ||
    label.includes('Document Generate') ||
    label.includes('Document Generator') ||
    label.includes('Document Agent')
  const isAPAgent =
    agentBlock.settings?.subtype === 'AP_AGENT' || label.includes('AP Agent')

  const docGenComplete = isDocGen
    ? documentGenerateIsComplete(requestData, agentBlock, rawWorkflowData)
    : false

  // Document Generate: only a distinct generated/recent file — never mirror
  // the same single inbound upload already shown on the left. Live preview
  // belongs on Quote Agent → Preview; do not fake completion here.
  const docPreviewAttachment = useMemo(() => {
    if (!isDocGen) return null

    const firstReceived = getFirstReceivedAttachment(attachments)
    const latest = getLatestAttachment(attachments)
    const firstId = attachmentIdOf(firstReceived)
    const latestId = attachmentIdOf(latest)
    const requestItemId = String(requestData?.itemId || '')

    if (latest && firstId && latestId && latestId !== firstId) {
      return {
        ...latest,
        itemId: latest.itemId || latest.id || latest.fileId,
        repositoryId:
          latest.repositoryId || repositoryId || requestData?.repositoryId,
      }
    }

    if (requestItemId && firstId && requestItemId !== firstId) {
      return {
        _localFileUrl: requestData?._localFileUrl,
        fileExtension:
          requestData?.repositoryItem?.fileName?.split('.').pop() || 'pdf',
        fileName: requestData?.repositoryItem?.fileName || requestData?.name,
        itemId: requestData.itemId,
        name: requestData?.repositoryItem?.fileName || requestData?.name,
        repositoryId:
          requestData.repositoryId ||
          repositoryId ||
          firstReceived?.repositoryId,
      }
    }

    // Only one inbound file — left pane owns that preview.
    return null
  }, [attachments, isDocGen, repositoryId, requestData])

  const docGenDescription = useMemo(() => {
    const subLabel = textOf(settings.subLabel)
    const configured =
      textOf(settings.description) ||
      textOf(settings.skillText) ||
      textOf(settings.instructions) ||
      (subLabel && subLabel.toLowerCase() !== 'click to configure'
        ? subLabel
        : '')
    if (configured && !/\bword\b/i.test(configured)) return configured
    return t`Generate PDF documents from the template set on this step.`
  }, [settings, t])

  const docRepoId =
    docPreviewAttachment?.repositoryId ||
    repositoryId ||
    requestData?.repositoryId
  const {
    isLoading: docLoading,
    mimeType,
    previewUrl,
  } = useAttachmentPreviewUrl(
    isDocGen ? (docPreviewAttachment as any) : null,
    docRepoId,
  )

  let hasAgentResponse = false
  if (isQualify) {
    hasAgentResponse = !!requestData?.qualifyAgentResponse?.qualifier_result
  } else if (isQuote) {
    hasAgentResponse = !!requestData?.quoteAgentResponse
  } else if (isDocGen) {
    hasAgentResponse =
      !!requestData?.documentGenerateResponse ||
      Boolean(docPreviewAttachment) ||
      docGenComplete
  } else if (isAPAgent) {
    hasAgentResponse =
      !!requestData?.agentResponse ||
      (requestData?._agentData && requestData._agentData.length > 0)
  } else {
    hasAgentResponse =
      !!requestData?.agentResponse ||
      (requestData?._agentData && requestData._agentData.length > 0)
  }

  const status = String(requestData?.status || '')
    .toLowerCase()
    .trim()
  const isDone = Boolean(
    requestData?.completedAtUtc ||
    requestData?.completedAt ||
    status === 'completed' ||
    status === 'complete' ||
    status === 'closed' ||
    status.includes('success') ||
    docGenComplete,
  )
  const thisAgentFailed = isFailedAgentBlock(
    agentBlock,
    requestData,
    rawWorkflowData,
  )
  const isProcessing = !hasAgentResponse && !isDone && !thisAgentFailed

  // --- Re-qualify / Re-quote (RFQ) ---------------------------------------
  // Offered on the agent's own step or the step right after it; the API is
  // given the agent step's id as activityId.
  const queryClient = useQueryClient()
  const regenerateKind: 'qualifier' | 'quote' | null = isDocGen
    ? null
    : isQualify
      ? 'qualifier'
      : isQuote
        ? 'quote'
        : null
  const currentActivityId = textOf(
    requestData?.activityId || requestData?.currentActivityId,
  )
  const currentStageType = textOf(requestData?.stageType).toUpperCase()
  const isOnThisAgentStep =
    isAgentStepBefore(
      rawWorkflowData,
      String(agentBlock.id || ''),
      currentActivityId,
    ) ||
    (regenerateKind === 'qualifier' && currentStageType === 'QUALIFY_AGENT') ||
    (regenerateKind === 'quote' && currentStageType === 'QUOTE_AGENT')
  const canRegenerate =
    Boolean(regenerateKind) && !viewOnly && isOnThisAgentStep
  const [regenerateState, setRegenerateState] = useState<
    'error' | 'idle' | 'running'
  >('idle')
  const [regenerateError, setRegenerateError] = useState('')
  const [regenerateStartedAt, setRegenerateStartedAt] = useState(0)
  const isRegenerating = regenerateState === 'running'

  /** Put the new agent result + form data on the open request. */
  const applyRegenerated = (data: RegenerateAgentResponse) => {
    const agentResponse = parseJson(data.agentResponseJson)
    const formData = parseJson(data.formDataJson)
    const responseKey =
      regenerateKind === 'qualifier'
        ? 'qualifyAgentResponse'
        : 'quoteAgentResponse'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch = (item: any) => {
      if (!item) return item
      const next = { ...item }
      if (agentResponse) next[responseKey] = agentResponse
      if (formData) {
        // Keep the shape the request already uses (JSON string or object).
        next.formData =
          typeof item.formData === 'string' ? data.formDataJson : formData
      }
      return next
    }
    const processId = String(requestData?.processId ?? '')
    queryClient.setQueriesData(
      {
        predicate: (query) =>
          query.queryKey[0] === 'request-detail' &&
          String(query.queryKey[2]) === processId,
      },
      patch,
    )
    const { selectedItem } = requestStore.getState()
    if (selectedItem && String(selectedItem.processId) === processId) {
      requestStore.setState({ selectedItem: patch(selectedItem) })
    }
  }

  const runRegenerate = async () => {
    if (!regenerateKind || isRegenerating) return
    const workflowId = requestData?.workflowId || rawWorkflowData?.id
    const instanceId =
      requestData?.workflowInstanceId || requestData?.processId
    const agentActivityId = String(agentBlock.id || '') || currentActivityId
    if (!workflowId || !instanceId || !agentActivityId) {
      setRegenerateState('error')
      setRegenerateError(t`This request is missing its workflow step details.`)
      return
    }
    setRegenerateState('running')
    setRegenerateError('')
    setRegenerateStartedAt(Date.now())
    const { data, error } = await workflowsApiV6.regenerateAgent(
      regenerateKind,
      workflowId,
      instanceId,
      { activityId: agentActivityId },
    )
    if (error || !data) {
      setRegenerateState('error')
      setRegenerateError(error || t`The agent did not return a result.`)
      return
    }
    applyRegenerated(data)
    setRegenerateState('idle')
    showToast({
      message:
        regenerateKind === 'qualifier'
          ? t`Qualification refreshed with the new agent result.`
          : t`Quote refreshed with the new agent result.`,
      variant: 'success',
    })
  }

  const regenerateLabel =
    regenerateKind === 'qualifier' ? t`Re-qualify` : t`Re-quote`

  const jobMessage = useMemo(
    () => resolveApAgentJobMessage(requestData),
    // Recompute when store job status updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestData, jobStatuses, jobMappings, processingProcesses],
  )
  const jobCompleted = useMemo(
    () => isApAgentJobCompleted(requestData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestData, jobStatuses, jobMappings, processingProcesses],
  )
  const processingTitle = jobMessage
    ? jobMessage
    : jobCompleted
      ? t`Preparing your request...`
      : t`Working on this request...`

  const historyScope = [
    agentBlock.id,
    requestData?.id,
    requestData?.processId,
    requestData?.apAgentJobId,
  ]
    .filter(
      (value) =>
        value !== null && value !== undefined && String(value).trim() !== '',
    )
    .join(':')
  const historyScopeRef = useRef(historyScope)
  const [messageHistory, setMessageHistory] = useState<AgentLoadingStep[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const scopeChanged = historyScopeRef.current !== historyScope
    historyScopeRef.current = historyScope

    if (!isProcessing) {
      setMessageHistory((prev) => (prev.length === 0 ? prev : []))
      return
    }

    const next = jobMessage.trim()
    if (scopeChanged) {
      setMessageHistory(next ? [{ startedAt: Date.now(), text: next }] : [])
      return
    }
    if (!next) return

    setMessageHistory((prev) =>
      prev[prev.length - 1]?.text === next
        ? prev
        : [...prev, { startedAt: Date.now(), text: next }],
    )
  }, [historyScope, isProcessing, jobMessage])

  useEffect(() => {
    if (!isRegenerating && (!isProcessing || messageHistory.length === 0)) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isProcessing, isRegenerating, messageHistory.length])

  const isPdf = Boolean(mimeType?.includes('pdf'))
  const isImage = Boolean(mimeType?.startsWith('image/'))
  const docFileName =
    docPreviewAttachment?.fileName ||
    docPreviewAttachment?.name ||
    (docPreviewAttachment?.fileExtension
      ? `file.${docPreviewAttachment.fileExtension}`
      : undefined)

  // Only show a real generated file here — not a live Quote preview.
  const showDocPreview = Boolean(isDocGen && docPreviewAttachment)

  return (
    <div className='flex flex-col gap-3'>
      {!hideBack && (
        <div className='flex items-center gap-3'>
          <button
            className='flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-2'
            onClick={onBack}
          >
            <ArrowLeft className='h-4 w-4 text-gray-11' />
          </button>
          <div className='flex items-center gap-2'>
            <Icon className='h-5 w-5 text-gray-9' icon={iconName} />
            <h2 className='text-lg font-semibold text-gray-12'>{label}</h2>
          </div>
        </div>
      )}

      {canRegenerate && regenerateState === 'error' ? (
        <div
          className='flex animate-in flex-wrap items-center gap-3 rounded-xl border border-red-5 bg-red-1 px-4 py-3 duration-300 fade-in slide-in-from-top-1'
          role='alert'
        >
          <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-red-3 text-red-11'>
            <Icon className='size-4' icon='lucide:alert-triangle' />
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-13 font-semibold text-gray-12'>
              {t`The agent could not finish this run.`}
            </p>
            <p className='mt-0.5 line-clamp-2 text-12 text-gray-11'>
              {regenerateError}
            </p>
          </div>
          <Button
            color='red'
            icon='lucide:rotate-ccw'
            label={t`Retry`}
            size='sm'
            type='button'
            variant='outline'
            onClick={() => void runRegenerate()}
          />
        </div>
      ) : canRegenerate &&
        hasAgentResponse &&
        !isRegenerating &&
        !thisAgentFailed ? (
        <div className='flex animate-in flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-3 bg-surface-primary px-4 py-2.5 duration-300 fade-in'>
          <p className='min-w-0 flex-1 text-12 text-gray-10'>
            {regenerateKind === 'qualifier'
              ? t`Something missed or extracted wrong? Run the Qualify Agent again on the same file.`
              : t`Need a fresh price? Run the Quote Agent again. Fields you filled in yourself are kept.`}
          </p>
          <Button
            color='gray'
            icon='lucide:refresh-cw'
            label={regenerateLabel}
            size='sm'
            type='button'
            variant='outline'
            onClick={() => void runRegenerate()}
          />
        </div>
      ) : null}

      <div
        className={
          showDocPreview
            ? 'flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface-primary shadow-sm'
            : 'rounded-xl border border-gray-3 bg-surface-primary p-4 shadow-sm'
        }
      >
        {isRegenerating ? (
          <div
            aria-busy='true'
            aria-live='polite'
            className='flex animate-in flex-col gap-4 duration-300 fade-in'
          >
            <div className='flex min-w-0 items-center gap-2'>
              <span className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-2)] text-[var(--primary-11)]'>
                <Icon className='size-4 animate-spin' icon='tabler:loader-2' />
              </span>
              <span className='min-w-0 truncate text-sm font-semibold text-gray-12'>
                {regenerateKind === 'qualifier'
                  ? t`Re-running the Qualify Agent`
                  : t`Re-running the Quote Agent`}
              </span>
              <span className='shrink-0 text-xs text-gray-9 tabular-nums'>
                · {formatElapsed(now - regenerateStartedAt)}
              </span>
            </div>
            <p className='text-12 text-gray-10'>
              {regenerateKind === 'qualifier'
                ? t`Reading the uploaded RFQ again. The new values replace the current ones when it finishes.`
                : t`Pricing the RFQ again. Line items, quotes and totals refresh when it finishes.`}
            </p>
            {/* Skeleton of the result while the agent works. */}
            <div className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
              {Array.from({ length: 6 }).map((_, index) => (
                <div className='flex items-center gap-2' key={index}>
                  <span className='h-3 w-24 animate-pulse rounded bg-gray-3' />
                  <span className='h-3 flex-1 animate-pulse rounded bg-gray-2' />
                </div>
              ))}
            </div>
            <div className='h-24 animate-pulse rounded-lg bg-gray-2' />
          </div>
        ) : showDocPreview ? (
          <div className='min-h-[420px] flex-1'>
            <DocumentPreviewViewer
              fileName={docFileName}
              fileUrl={previewUrl || null}
              isImage={isImage}
              isLoading={docLoading}
              isPdf={isPdf}
            />
          </div>
        ) : isDocGen ? (
          <div className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
            <Icon className='h-10 w-10 text-gray-7' icon='tabler:file-text' />
            <h3 className='text-base font-medium text-gray-12'>{label}</h3>
            <p className='max-w-md text-13 text-gray-9'>{docGenDescription}</p>
            <p className='max-w-md text-12 text-gray-8'>
              {t`No generated document yet. It will appear here when this stage completes.`}
            </p>
          </div>
        ) : thisAgentFailed ? (
          <div className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
            <div className='flex size-14 items-center justify-center rounded-full bg-red-2'>
              <Icon className='size-7 text-red-11' icon='tabler:alert-circle' />
            </div>
            <div className='max-w-md px-4 text-center'>
              <h3 className='text-base font-semibold text-gray-13'>
                {t`This step could not be completed.`}
              </h3>
              <p className='mt-1 text-13 text-gray-9'>
                {t`The agent stopped. Review the request and try again.`}
              </p>
            </div>
            {canRegenerate ? (
              <Button
                color='primary'
                icon='lucide:rotate-ccw'
                label={t`Retry`}
                size='sm'
                type='button'
                onClick={() => void runRegenerate()}
              />
            ) : null}
          </div>
        ) : isProcessing ? (
          <div
            aria-live='polite'
            className='animate-in fade-in flex flex-col gap-3 text-left duration-300'
          >
            {/* Header: which agent is working and for how long. */}
            <div className='flex min-w-0 items-center gap-2'>
              <span className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-2)] text-[var(--primary-11)]'>
                <Icon className='size-4' icon={iconName} />
              </span>
              <span className='min-w-0 truncate text-sm font-semibold text-gray-12'>
                {label}
              </span>
              <span className='shrink-0 text-sm text-gray-9'>
                {t`is working`}
              </span>
              {messageHistory.length > 0 ? (
                <span className='shrink-0 text-xs text-gray-9 tabular-nums'>
                  · {formatElapsed(now - messageHistory[0].startedAt)}
                </span>
              ) : null}
            </div>

            {/* Activity log: one line per step, newest last. */}
            <ol className='ml-3.5 flex flex-col border-l border-gray-4 py-0.5 pl-4'>
              {messageHistory.length > 0 ? (
                messageHistory.map((step, index) => {
                  const isCurrent = index === messageHistory.length - 1
                  const endedAt = isCurrent
                    ? now
                    : messageHistory[index + 1].startedAt
                  return (
                    <li
                      className='animate-in fade-in slide-in-from-bottom-1 relative flex min-w-0 items-start gap-2 py-1.5 duration-300'
                      key={`${index}-${step.text}`}
                    >
                      <span
                        className={cn(
                          'absolute top-1.5 -left-[25px] flex size-[18px] items-center justify-center rounded-full ring-4 ring-[var(--surface-primary)]',
                          isCurrent
                            ? 'bg-[var(--primary-3)] text-[var(--primary-11)]'
                            : 'bg-[var(--green-3)] text-[var(--green-11)]',
                        )}
                      >
                        <Icon
                          className={cn('size-3', isCurrent && 'animate-spin')}
                          icon={isCurrent ? 'tabler:loader-2' : 'tabler:check'}
                        />
                      </span>
                      <p className='min-w-0 text-[13px] leading-5'>
                        <span
                          className={cn(
                            'break-words',
                            isCurrent
                              ? 'text-shade-loading font-medium'
                              : 'text-gray-10',
                          )}
                        >
                          {step.text}
                          {isCurrent ? '…' : ''}
                        </span>
                        <span className='ml-2 text-xs text-gray-8 tabular-nums'>
                          {formatElapsed(endedAt - step.startedAt)}
                        </span>
                      </p>
                    </li>
                  )
                })
              ) : (
                <li className='relative flex min-w-0 items-start py-1.5'>
                  <span className='absolute top-1.5 -left-[25px] flex size-[18px] items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-11)] ring-4 ring-[var(--surface-primary)]'>
                    <Icon
                      className='size-3 animate-spin'
                      icon='tabler:loader-2'
                    />
                  </span>
                  <span className='text-shade-loading text-[13px] leading-5 font-medium'>
                    {processingTitle}
                  </span>
                </li>
              )}
            </ol>
          </div>
        ) : isQualify && requestData?.qualifyAgentResponse?.qualifier_result ? (
          <QualifyAgentResultView
            agentBlock={agentBlock}
            formModel={formModel}
            hiddenFieldIds={hiddenFieldIds}
            readOnly={Boolean(viewOnly) || !onFieldChange}
            readOnlyFieldIds={readOnlyFieldIds}
            result={requestData.qualifyAgentResponse.qualifier_result}
            workflow={rawWorkflowData}
            onFieldChange={onFieldChange}
          />
        ) : isQuote && requestData?.quoteAgentResponse?.quote_result ? (
          <QuoteAgentResultView
            agentBlock={agentBlock}
            formModel={formModel}
            hiddenFieldIds={hiddenFieldIds}
            readOnly={Boolean(viewOnly) || !onFieldChange}
            readOnlyFieldIds={readOnlyFieldIds}
            requestData={requestData}
            result={requestData.quoteAgentResponse.quote_result}
            workflow={rawWorkflowData}
            onFieldChange={onFieldChange}
            onFieldsChange={onFieldsChange}
            onQuoteTotalChange={onQuoteTotalChange}
          />
        ) : (
          <div className='flex flex-col items-center justify-center gap-3 py-10 text-center'>
            <Icon className='h-10 w-10 text-gray-7' icon='lucide:hammer' />
            <h3 className='text-base font-medium text-gray-12'>
              Details Not Available Yet
            </h3>
            <p className='max-w-md text-13 text-gray-9'>
              The API integration for {label} is currently pending. Once the API
              is updated, this view will show the full agent analysis and
              details.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentDetailPlaceholder
