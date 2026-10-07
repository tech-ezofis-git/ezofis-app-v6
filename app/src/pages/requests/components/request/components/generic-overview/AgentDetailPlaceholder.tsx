import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
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
  onQuoteTotalChange?: (total: number | null) => void
}

type AgentLoadingStep = {
  startedAt: number
  text: string
}

const attachmentIdOf = (file: AttachmentItem | null | undefined) =>
  String(file?.itemId || file?.fileId || file?.id || '')

const textOf = (value: unknown) => String(value || '').trim()

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
    if (!isProcessing || messageHistory.length === 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isProcessing, messageHistory.length])

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

      <div
        className={
          showDocPreview
            ? 'flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface-primary shadow-sm'
            : 'rounded-xl border border-gray-3 bg-surface-primary p-4 shadow-sm'
        }
      >
        {showDocPreview ? (
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
          </div>
        ) : isProcessing ? (
          messageHistory.length > 0 ? (
            <ol className='mx-auto flex w-full max-w-lg flex-col py-8'>
              {messageHistory.map((step, index) => {
                const isCurrent = index === messageHistory.length - 1
                const endedAt = isCurrent
                  ? now
                  : messageHistory[index + 1].startedAt
                const seconds = Math.max(
                  1,
                  Math.round((endedAt - step.startedAt) / 1000),
                )
                return (
                  <li
                    className='animate-in fade-in slide-in-from-bottom-2 flex gap-3 duration-300'
                    key={`${index}-${step.text}`}
                  >
                    <div className='flex w-6 shrink-0 flex-col items-center'>
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full',
                          isCurrent
                            ? 'bg-[var(--primary-3)] text-[var(--primary-11)]'
                            : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-3.5',
                            isCurrent && 'animate-spin',
                          )}
                          icon={isCurrent ? 'tabler:loader-2' : 'tabler:check'}
                        />
                      </span>
                      {!isCurrent && (
                        <span className='my-1 w-px flex-1 bg-[var(--gray-5)]' />
                      )}
                    </div>
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 items-start justify-between gap-4',
                        !isCurrent && 'pb-4',
                      )}
                    >
                      <span
                        className={cn(
                          'min-w-0 pt-0.5 text-sm leading-5',
                          isCurrent
                            ? 'text-shade-loading font-medium'
                            : 'text-[var(--gray-9)]',
                        )}
                      >
                        {step.text}
                      </span>
                      <span className='shrink-0 pt-1 text-xs text-[var(--gray-9)] tabular-nums'>
                        {seconds}s
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className='flex flex-col items-center justify-center gap-4 py-12 text-center'>
              <div className='flex size-14 items-center justify-center rounded-full bg-[var(--primary-1)]'>
                <Icon
                  className='size-7 animate-spin text-[var(--primary-9)]'
                  icon='tabler:loader-2'
                />
              </div>
              <div className='max-w-md px-4 text-center'>
                <h3 className='text-shade-loading text-base font-semibold'>
                  {processingTitle}
                </h3>
              </div>
            </div>
          )
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
