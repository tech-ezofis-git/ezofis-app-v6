import React from 'react'
import { Icon } from '@iconify/react'
import cn from '@/utils/cn'
import { summarizeQualifierResult, qualifyDecisionStyle } from './qualifierResultUtils'
import { summarizeQuoteResult } from './quoteResultUtils'

export interface AgentBlock {
  id: string
  type: string
  color?: string
  icon?: string
  settings?: {
    label?: string
    [key: string]: any
  }
}

/** True when this agent block already has a persisted response payload. */
export const agentHasResponse = (
  block: AgentBlock | null | undefined,
  requestData: any,
) => {
  if (!block) return false
  const type = String(block.type || '')
  const label = String(block.settings?.label || '')
  const subtype = String(block.settings?.subtype || '').toUpperCase()

  if (
    type === 'QUALIFY_AGENT' ||
    subtype === 'QUALIFY' ||
    label.includes('Qualify')
  ) {
    return Boolean(requestData?.qualifyAgentResponse)
  }
  if (
    type === 'QUOTE_AGENT' ||
    subtype === 'QUOTE' ||
    label.includes('Quote')
  ) {
    return Boolean(requestData?.quoteAgentResponse)
  }
  if (
    type === 'DOCUMENT_GENERATE_AGENT' ||
    subtype === 'DOCUMENT_GENERATE' ||
    label.includes('Document Generate')
  ) {
    return Boolean(requestData?.documentGenerateResponse)
  }
  if (
    type === 'AP_AGENT' ||
    subtype === 'AP_AGENT' ||
    label.includes('AP Agent')
  ) {
    return Boolean(
      requestData?.agentResponse ||
        (requestData?._agentData && requestData._agentData.length > 0),
    )
  }
  return Boolean(
    requestData?.agentResponse ||
      (requestData?._agentData && requestData._agentData.length > 0),
  )
}

/** True when the request is currently at this agent's stage (running). */
export const agentIsRunning = (
  block: AgentBlock | null | undefined,
  requestData: any,
) => {
  if (!block || !requestData) return false
  if (agentHasResponse(block, requestData)) return false
  const label = String(block.settings?.label || '').trim()
  if (!label) return false
  const stageCandidates = [
    requestData.stage,
    requestData.currentStage,
    requestData.lastActionStageName,
    requestData.activityName,
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
  if (stageCandidates.some((stage) => stage === label)) return true
  // Soft match: "Qualify Agent" vs stage "Qualify"
  return stageCandidates.some(
    (stage) =>
      label.toLowerCase().includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(label.toLowerCase()),
  )
}

/**
 * Agents that should appear as tabs: those with a response, plus the agent
 * currently running — newest-first (pipeline order reversed).
 */
export const getAgentResponseTabs = (
  agentBlocks: AgentBlock[],
  requestData: any,
) => {
  const visible = agentBlocks.filter(
    (block) =>
      agentHasResponse(block, requestData) ||
      agentIsRunning(block, requestData),
  )
  if (visible.length > 0) return [...visible].reverse()

  // Before a response exists, open the first agent directly so the process
  // is shown instead of Extracted Data.
  if (agentBlocks.length > 0) return [agentBlocks[0]]
  return []
}

interface AgentSummaryBoxesProps {
  agentBlocks: AgentBlock[]
  selectedAgentBlockId: string | null
  onAgentClick: (blockId: string | null) => void
  requestData: any
}

const AgentSummaryBoxes: React.FC<AgentSummaryBoxesProps> = ({
  agentBlocks,
  selectedAgentBlockId,
  onAgentClick,
  requestData,
}) => {
  if (!agentBlocks || agentBlocks.length === 0) return null

  const historyList = Array.isArray(requestData?._history) ? requestData._history : []
  const historyStages = new Set(historyList.map((h: any) => h.stage))
  const currentStage = requestData?.stage

  let maxReachedIndex = -1
  agentBlocks.forEach((block, index) => {
    const label = block.settings?.label || 'Agent'
    let hasResponse = false
    if (block.type === 'QUALIFY_AGENT' && requestData?.qualifyAgentResponse) hasResponse = true
    if (block.type === 'QUOTE_AGENT' && requestData?.quoteAgentResponse) hasResponse = true
    if (block.type === 'DOCUMENT_GENERATE_AGENT' && requestData?.documentGenerateResponse) hasResponse = true
    if (block.type === 'AP_AGENT' && (requestData?.agentResponse || requestData?._agentData?.length > 0)) hasResponse = true

    if (historyStages.has(label) || currentStage === label || hasResponse) {
      maxReachedIndex = Math.max(maxReachedIndex, index)
    }
  })

  // Allow clicking the first block by default if workflow hasn't reached any agent yet
  if (maxReachedIndex === -1) {
    maxReachedIndex = 0
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        agentBlocks.length <= 3 && 'grid-cols-1 sm:grid-cols-3',
        agentBlocks.length === 4 && 'grid-cols-2 md:grid-cols-2 xl:grid-cols-4',
        agentBlocks.length === 5 && 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        agentBlocks.length >= 6 && 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
      )}
    >
      {agentBlocks.map((block, index) => {
        const isSelected = selectedAgentBlockId === block.id
        const isClickable = index <= maxReachedIndex
        const label = block.settings?.label || 'Agent'
        const iconName = block.icon || 'lucide:cpu'

        // Placeholder status parsing. This can be mapped to real API data later.
        // For now we will use generic logic based on the block type.
        let status = 'Pending'
        let statusColor = 'text-gray-9 bg-gray-2 border-gray-3'
        let value = '-'

        if (block.type === 'QUALIFY_AGENT') {
          const qualifyResult = requestData?.qualifyAgentResponse?.qualifier_result
          if (qualifyResult) {
            const summary = summarizeQualifierResult(qualifyResult)
            const decision = qualifyDecisionStyle(summary.qualify)
            if (summary.qualify) {
              status = decision.label
              statusColor = decision.className
            }
            value = summary.title
          } else if (requestData?.stage === label && !requestData?.qualifyAgentResponse) {
            status = 'Processing'
            statusColor = 'text-orange-10 bg-orange-2 border-orange-3'
            value = 'Analyzing...'
          }
        } else if (block.type === 'QUOTE_AGENT') {
          status = 'Pending'
          statusColor = 'text-gray-10 bg-gray-2 border-gray-3'
          value = '-'
          if (requestData?.quoteAgentResponse?.quote_result) {
            status = 'Processed'
            statusColor = 'text-[var(--primary-10)] bg-[var(--primary-2)] border-[var(--primary-3)]'
            const summary = summarizeQuoteResult(
              requestData.quoteAgentResponse.quote_result,
            )
            value = summary.title
          } else if (requestData?.stage === label) {
            status = 'Processing'
            statusColor = 'text-orange-10 bg-orange-2 border-orange-3'
            value = 'Analyzing...'
          }
        } else if (block.type === 'DOCUMENT_GENERATE_AGENT') {
          status = 'Pending'
          statusColor = 'text-gray-10 bg-gray-2 border-gray-3'
          value = '-'
          if (requestData?.documentGenerateResponse) {
            status = 'Processed'
            statusColor = 'text-[var(--primary-10)] bg-[var(--primary-2)] border-[var(--primary-3)]'
            value = 'Completed'
          } else if (requestData?.stage === label) {
            status = 'Processing'
            statusColor = 'text-orange-10 bg-orange-2 border-orange-3'
            value = 'Generating...'
          }
        }

        return (
          <button
            key={block.id}
            type='button'
            disabled={!isClickable}
            className={cn(
              'relative flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-300 ease-in-out',
              isClickable ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-95' : 'cursor-not-allowed opacity-50 grayscale',
              isSelected
                ? 'border-[var(--primary-9)] bg-[var(--primary-2)]/30 shadow-sm ring-1 ring-[var(--primary-9)]/20'
                : 'border-gray-3 bg-surface',
              isClickable && !isSelected ? 'hover:bg-[var(--gray-1)]' : ''
            )}
            onClick={() => {
              if (isClickable) onAgentClick(isSelected ? null : block.id)
            }}
          >
            <div className='flex w-full items-center justify-between gap-1 flex-wrap'>
              <div
                className='shrink-0 rounded p-1.5 transition-colors flex items-center justify-center'
                style={{
                  backgroundColor: block.color ? `${block.color}15` : 'var(--gray-2)',
                  color: block.color || 'var(--gray-11)',
                }}
              >
                <Icon icon={iconName} className='h-4 w-4' />
              </div>
              <div
                className={cn(
                  'shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-semibold tracking-wide',
                  statusColor,
                )}
              >
                {status}
              </div>
            </div>

            <div className='mt-0.5 flex w-full min-w-0 flex-col gap-0.5'>
              <span className='truncate text-[11px] leading-none font-semibold tracking-tight text-[var(--gray-11)]'>
                {label}
              </span>
              <div className='truncate text-[13px] leading-tight font-semibold text-[var(--gray-13)]'>
                {value || '---'}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default AgentSummaryBoxes
