import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import React, { useMemo } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import {
  getFirstReceivedAttachment,
  getLatestAttachment,
} from '@/pages/requests/components/workflow-request/utils/gmailFormAttachment'
import { useAttachmentPreviewUrl } from '@/pages/requests/hooks/useAttachmentPreviewUrl'
import {
  type AgentBlock,
  documentGenerateIsComplete,
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
  hideBack?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawWorkflowData?: any
  repositoryId?: string | number
  viewOnly?: boolean
  onBack: () => void
  onFieldChange?: (fieldId: string, value: any) => void
}

const attachmentIdOf = (file: AttachmentItem | null | undefined) =>
  String(file?.itemId || file?.fileId || file?.id || '')

const AgentDetailPlaceholder: React.FC<AgentDetailPlaceholderProps> = ({
  agentBlock,
  attachments = [],
  formModel,
  hideBack = false,
  rawWorkflowData,
  repositoryId,
  requestData,
  viewOnly,
  onBack,
  onFieldChange,
}) => {
  const { t } = useLingui()
  const label = agentBlock.settings?.label || 'Agent Details'
  const iconName = agentBlock.icon || 'lucide:cpu'

  const isQualify =
    agentBlock.settings?.subtype === 'QUALIFY' || label.includes('Qualify')
  const isQuote =
    agentBlock.settings?.subtype === 'QUOTE' ||
    agentBlock.type === 'QUOTE_AGENT' ||
    label.includes('Quote')
  const isDocGen =
    agentBlock.type === 'DOCUMENT_GENERATE_AGENT' ||
    agentBlock.settings?.subtype === 'DOCUMENT_GENERATE' ||
    label.includes('Document Generate') ||
    label.includes('Document Agent')
  const isAPAgent =
    agentBlock.settings?.subtype === 'AP_AGENT' || label.includes('AP Agent')

  // Document Generate: only a distinct generated/recent file — never mirror
  // the same single inbound upload already shown on the left.
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
    // Document agent has no result payload — only a distinct generated file
    // or a real completed doc-gen stage counts as a response.
    hasAgentResponse =
      !!requestData?.documentGenerateResponse ||
      Boolean(docPreviewAttachment) ||
      documentGenerateIsComplete(requestData, agentBlock)
  } else if (isAPAgent) {
    hasAgentResponse =
      !!requestData?.agentResponse ||
      (requestData?._agentData && requestData._agentData.length > 0)
  } else {
    // Fallback for unknown agents
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
    (isDocGen && documentGenerateIsComplete(requestData, agentBlock)),
  )
  const isProcessing = !hasAgentResponse && !isDone

  const isPdf = Boolean(mimeType?.includes('pdf'))
  const isImage = Boolean(mimeType?.startsWith('image/'))
  const docFileName =
    docPreviewAttachment?.fileName ||
    docPreviewAttachment?.name ||
    (docPreviewAttachment?.fileExtension
      ? `file.${docPreviewAttachment.fileExtension}`
      : undefined)

  return (
    <div className='flex flex-col gap-4'>
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
          isDocGen && docPreviewAttachment
            ? 'flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface-primary shadow-sm'
            : 'rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-sm'
        }
      >
        {isDocGen && docPreviewAttachment ? (
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
            <Icon className='h-10 w-10 text-gray-7' icon='tabler:file-off' />
            <h3 className='text-base font-medium text-gray-12'>
              {t`No generated document yet`}
            </h3>
            <p className='max-w-md text-13 text-gray-9'>
              {t`The uploaded file is shown on the left. A generated document will appear here when it is available.`}
            </p>
          </div>
        ) : isProcessing ? (
          <div className='flex flex-col items-center justify-center gap-4 py-12 text-center'>
            <div className='flex size-14 items-center justify-center rounded-full bg-[var(--primary-1)]'>
              <Icon
                className='size-7 animate-spin text-[var(--primary-9)]'
                icon='tabler:loader-2'
              />
            </div>
            <div className='text-center'>
              <h3 className='text-base font-bold text-[var(--gray-13)]'>
                {label} {t`Processing...`}
              </h3>
            </div>
          </div>
        ) : isQualify && requestData?.qualifyAgentResponse?.qualifier_result ? (
          <QualifyAgentResultView
            agentBlock={agentBlock}
            formModel={formModel}
            readOnly={Boolean(viewOnly) || !onFieldChange}
            result={requestData.qualifyAgentResponse.qualifier_result}
            workflow={rawWorkflowData}
            onFieldChange={onFieldChange}
          />
        ) : isQuote && requestData?.quoteAgentResponse?.quote_result ? (
          <QuoteAgentResultView
            agentBlock={agentBlock}
            formModel={formModel}
            readOnly={Boolean(viewOnly) || !onFieldChange}
            result={requestData.quoteAgentResponse.quote_result}
            workflow={rawWorkflowData}
            onFieldChange={onFieldChange}
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
