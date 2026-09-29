import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import React, { useMemo } from 'react'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import { useAttachmentPreviewUrl } from '@/pages/requests/hooks/useAttachmentPreviewUrl'
import QualifyAgentResultView from './QualifyAgentResultView'
import QuoteAgentResultView from './QuoteAgentResultView'
import type { AgentBlock } from './AgentSummaryBoxes'

interface AgentDetailPlaceholderProps {
  agentBlock: AgentBlock
  attachments?: AttachmentItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formModel?: Record<string, any>
  hideBack?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawWorkflowData?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestData: any
  repositoryId?: string | number
  viewOnly?: boolean
  onBack: () => void
  onFieldChange?: (fieldId: string, value: any) => void
}

const AgentDetailPlaceholder: React.FC<AgentDetailPlaceholderProps> = ({
  agentBlock,
  attachments = [],
  formModel,
  hideBack = false,
  onBack,
  onFieldChange,
  rawWorkflowData,
  repositoryId,
  requestData,
  viewOnly,
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

  const firstAttachment = attachments[0] || null
  const docPreviewAttachment = useMemo(() => {
    if (!isDocGen) return null
    if (firstAttachment) {
      return {
        ...firstAttachment,
        itemId:
          requestData?.itemId ||
          firstAttachment.itemId ||
          firstAttachment.id,
        repositoryId:
          requestData?.repositoryId ||
          repositoryId ||
          firstAttachment.repositoryId,
      }
    }
    if (requestData?.itemId || requestData?._localFileUrl) {
      return {
        itemId: requestData?.itemId,
        repositoryId: requestData?.repositoryId || repositoryId,
        fileName:
          requestData?.repositoryItem?.fileName || requestData?.name,
        name: requestData?.repositoryItem?.fileName || requestData?.name,
        fileExtension:
          requestData?.repositoryItem?.fileName?.split('.').pop() || 'pdf',
        _localFileUrl: requestData?._localFileUrl,
      }
    }
    return null
  }, [firstAttachment, isDocGen, repositoryId, requestData])

  const docRepoId =
    docPreviewAttachment?.repositoryId || repositoryId || requestData?.repositoryId
  const { isLoading: docLoading, mimeType, previewUrl } =
    useAttachmentPreviewUrl(
      isDocGen ? (docPreviewAttachment as any) : null,
      docRepoId,
    )

  let hasAgentResponse = false
  if (isQualify) {
    hasAgentResponse = !!requestData?.qualifyAgentResponse?.qualifier_result
  } else if (isQuote) {
    hasAgentResponse = !!requestData?.quoteAgentResponse
  } else if (isDocGen) {
    // Document agent always has a view once there is a first document.
    hasAgentResponse =
      !!requestData?.documentGenerateResponse || Boolean(docPreviewAttachment)
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

  const stage = String(
    requestData?.stage ||
      requestData?.currentStage ||
      requestData?.lastActionStageName ||
      '',
  )
  const stageMatchesLabel =
    Boolean(stage) &&
    (stage === label ||
      label.toLowerCase().includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(label.toLowerCase()))

  const isProcessing =
    !hasAgentResponse &&
    (Boolean(requestData?.isProcessing) || stageMatchesLabel)

  const isPdf = Boolean(mimeType?.includes('pdf'))
  const isImage = Boolean(mimeType?.startsWith('image/'))
  const docFileName =
    docPreviewAttachment?.fileName ||
    docPreviewAttachment?.name ||
    (docPreviewAttachment?.fileExtension
      ? `file.${docPreviewAttachment.fileExtension}`
      : undefined)

  return (
    <div className='flex flex-col gap-5 pb-5'>
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
