import { Icon } from '@iconify/react'
import React from 'react'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { resolveApAgentJobMessage } from '@/pages/requests/utils/resolveApAgentJobMessage'
import cn from '@/utils/cn'
import {
  qualifyDecisionStyle,
  summarizeQualifierResult,
} from './qualifierResultUtils'
import { summarizeQuoteResult } from './quoteResultUtils'

export interface AgentBlock {
  id: string
  type: string
  color?: string
  icon?: string
  settings?: {
    [key: string]: any
    label?: string
  }
}

type WorkflowLike = {
  workflowJson?: {
    blocks?: any[]
    rules?: any[]
  }
  blocks?: any[]
  rules?: any[]
} | null

const isDocGenBlock = (block: AgentBlock | null | undefined) => {
  if (!block) return false
  const type = String(block.type || '')
  const label = String(block.settings?.label || '')
  const subtype = String(block.settings?.subtype || '').toUpperCase()
  return (
    type === 'DOCUMENT_GENERATE_AGENT' ||
    subtype === 'DOCUMENT_GENERATE' ||
    label.includes('Document Generate') ||
    label.includes('Document Agent')
  )
}

const isDocGenStageName = (value: string, label: string) => {
  const stage = String(value || '')
    .toLowerCase()
    .trim()
  const want = String(label || '')
    .toLowerCase()
    .trim()
  if (!stage) return false
  if (
    want &&
    (stage === want || stage.includes(want) || want.includes(stage))
  ) {
    return true
  }
  return (
    stage.includes('document generate') ||
    stage.includes('document_generate') ||
    stage === 'document agent'
  )
}

const getWorkflowGraph = (workflow?: WorkflowLike) => {
  const json = workflow?.workflowJson || workflow || {}
  const blocks = Array.isArray((json as any).blocks) ? (json as any).blocks : []
  const rules = Array.isArray((json as any).rules) ? (json as any).rules : []
  return { blocks: blocks as any[], rules: rules as any[] }
}

/** Block ids reachable AFTER `fromBlockId` via workflow rules (not including self). */
const getDescendantBlockIds = (fromBlockId: string, rules: any[]) => {
  const descendants = new Set<string>()
  if (!fromBlockId || !Array.isArray(rules) || rules.length === 0) {
    return descendants
  }
  const queue = [fromBlockId]
  const seen = new Set<string>([fromBlockId])
  while (queue.length > 0) {
    const id = queue.shift() as string
    for (const rule of rules) {
      if (String(rule?.fromBlockId || '') !== id) continue
      const toId = String(rule?.toBlockId || '')
      if (!toId || seen.has(toId)) continue
      seen.add(toId)
      descendants.add(toId)
      queue.push(toId)
    }
  }
  return descendants
}

const stageMatchesBlock = (stage: string, block: any) => {
  const label = String(block?.settings?.label || '').trim()
  const stageName = String(stage || '').trim()
  if (!stageName || !label) return false
  if (stageName === label) return true
  const a = stageName.toLowerCase()
  const b = label.toLowerCase()
  return a.includes(b) || b.includes(a)
}

const findBlockForStage = (blocks: any[], stage: string) => {
  const stageName = String(stage || '').trim()
  if (!stageName || !blocks.length) return null
  return (
    blocks.find((block) => stageMatchesBlock(stageName, block)) ||
    blocks.find((block) => String(block?.id || '') === stageName) ||
    null
  )
}

const collectRequestStageNames = (requestData: any) => {
  const names = [
    requestData?.stage,
    requestData?.currentStage,
    requestData?.lastActionStageName,
    requestData?.activityName,
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean)

  const history = Array.isArray(requestData?._history)
    ? requestData._history
    : []
  for (const row of history) {
    const stage = String(
      row?.stage || row?.stageName || row?.activityName || row?.name || '',
    ).trim()
    if (stage) names.push(stage)
  }
  return names
}

/**
 * Per RFQ rules: Quote → Manual User → Generate PDF → Document Generate →
 * Generated → Quotation Approver. Unlock/complete using that graph — not Quote
 * alone.
 */
const documentGenerateFlowState = (
  requestData: any,
  block?: AgentBlock | null,
  workflow?: WorkflowLike,
): 'pending' | 'running' | 'complete' => {
  if (requestData?.documentGenerateResponse) return 'complete'

  const label = String(block?.settings?.label || 'Document Generate')
  const { blocks, rules } = getWorkflowGraph(workflow)
  const docGenBlock =
    (block?.id && blocks.find((b) => String(b?.id) === String(block.id))) ||
    blocks.find((b) => isDocGenBlock(b as AgentBlock)) ||
    block ||
    null
  const docGenId = String(docGenBlock?.id || '')
  const descendants = docGenId
    ? getDescendantBlockIds(docGenId, rules)
    : new Set<string>()

  const currentStage = String(
    requestData?.stage || requestData?.currentStage || '',
  ).trim()
  const activityId = String(
    requestData?.activityId ||
      requestData?.currentActivityId ||
      requestData?.stageId ||
      '',
  ).trim()

  if (docGenId && activityId === docGenId) return 'running'
  if (docGenId && activityId && descendants.has(activityId)) return 'complete'

  if (isDocGenStageName(currentStage, label)) return 'running'
  if (docGenId) {
    const currentBlock = findBlockForStage(blocks, currentStage)
    if (currentBlock && String(currentBlock.id) === docGenId) return 'running'
    if (currentBlock && descendants.has(String(currentBlock.id))) {
      return 'complete'
    }
  }

  const stageNames = collectRequestStageNames(requestData)
  let visitedDocGen = false
  for (const stageName of stageNames) {
    if (isDocGenStageName(stageName, label)) {
      visitedDocGen = true
      continue
    }
    if (!docGenId) continue
    const matched = findBlockForStage(blocks, stageName)
    if (matched && descendants.has(String(matched.id))) return 'complete'
  }
  if (visitedDocGen && !isDocGenStageName(currentStage, label)) {
    return 'complete'
  }

  return 'pending'
}

const docGenVisitedInHistory = (requestData: any, label: string) => {
  const history = Array.isArray(requestData?._history)
    ? requestData._history
    : []
  return history.some((row: any) => {
    const stage = String(
      row?.stage || row?.stageName || row?.activityName || row?.name || '',
    )
    const stageType = String(
      row?.stageType || row?.agentType || row?.type || '',
    ).toLowerCase()
    return (
      isDocGenStageName(stage, label) ||
      stageType.includes('document_generate') ||
      stageType === 'document_generate_agent'
    )
  })
}

/**
 * Document Generate completes when rules say the flow already left that stage
 * (e.g. Quotation Approver), or history/response proves it ran.
 * Quote finishing alone must NOT unlock it.
 */
export const documentGenerateIsComplete = (
  requestData: any,
  block?: AgentBlock | null,
  workflow?: WorkflowLike,
) => {
  if (documentGenerateFlowState(requestData, block, workflow) === 'complete') {
    return true
  }

  if (!workflow) {
    const label = String(block?.settings?.label || 'Document Generate')
    const stage = String(
      requestData?.stage || requestData?.currentStage || '',
    ).trim()
    if (isDocGenStageName(stage, label)) return false
    if (docGenVisitedInHistory(requestData, label)) return true
  }
  return false
}

export const agentHasResponse = (
  block: AgentBlock | null | undefined,
  requestData: any,
  workflow?: WorkflowLike,
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
  if (isDocGenBlock(block)) {
    return documentGenerateIsComplete(requestData, block, workflow)
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

export const agentIsRunning = (
  block: AgentBlock | null | undefined,
  requestData: any,
  workflow?: WorkflowLike,
) => {
  if (!block || !requestData) return false
  if (agentHasResponse(block, requestData, workflow)) return false
  if (isDocGenBlock(block)) {
    return documentGenerateFlowState(requestData, block, workflow) === 'running'
  }
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
  return stageCandidates.some(
    (stage) =>
      label.toLowerCase().includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(label.toLowerCase()),
  )
}

/**
 * Agents that should appear as tabs: those with a response, plus the agent
 * currently running — newest-first (pipeline order reversed).
 *
 * Document Generate is status-only (cards); it is never listed as a tab.
 * PDF for that stage is shown in the agent detail / left recent document.
 */
export const getAgentResponseTabs = (
  agentBlocks: AgentBlock[],
  requestData: any,
  workflow?: WorkflowLike,
) => {
  const visible = agentBlocks.filter((block) => {
    if (isDocGenBlock(block)) return false
    return (
      agentHasResponse(block, requestData, workflow) ||
      agentIsRunning(block, requestData, workflow)
    )
  })
  if (visible.length > 0) return [...visible].reverse()

  const fallback = agentBlocks.find((block) => !isDocGenBlock(block))
  if (fallback) return [fallback]
  return []
}

interface AgentSummaryBoxesProps {
  agentBlocks: AgentBlock[]
  requestData: any
  selectedAgentBlockId?: string | null
  workflow?: WorkflowLike
  /** Kept for callers; cards are display-only and do not navigate. */
  onAgentClick?: (blockId: string | null) => void
}

const AgentSummaryBoxes: React.FC<AgentSummaryBoxesProps> = ({
  agentBlocks,
  requestData,
  workflow,
}) => {
  const jobStatuses = requestStore((state) => state.jobStatuses)
  const jobMappings = requestStore((state) => state.jobMappings)
  const jobMessage = resolveApAgentJobMessage(requestData)
  // Keep subscription so cards re-render when jobStatuses update.
  void jobStatuses
  void jobMappings

  if (!agentBlocks || agentBlocks.length === 0) return null

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
      {agentBlocks.map((block) => {
        const label = block.settings?.label || 'Agent'
        const iconName = block.icon || 'lucide:cpu'

        let status = 'Pending'
        let statusColor = 'text-gray-9 bg-gray-2 border-gray-3'
        let value = '-'

        if (block.type === 'QUALIFY_AGENT') {
          const qualifyResult =
            requestData?.qualifyAgentResponse?.qualifier_result
          if (qualifyResult) {
            const summary = summarizeQualifierResult(qualifyResult)
            const decision = qualifyDecisionStyle(summary.qualify)
            if (summary.qualify) {
              status = decision.label
              statusColor = decision.className
            }
            value = summary.title
          } else if (
            agentIsRunning(block, requestData, workflow) ||
            (requestData?.stage === label &&
              !requestData?.qualifyAgentResponse)
          ) {
            status = 'Processing'
            statusColor = 'text-orange-10 bg-orange-2 border-orange-3'
            value = jobMessage || '—'
          }
        } else if (block.type === 'QUOTE_AGENT') {
          status = 'Pending'
          statusColor = 'text-gray-10 bg-gray-2 border-gray-3'
          value = '-'
          if (requestData?.quoteAgentResponse?.quote_result) {
            status = 'Processed'
            statusColor =
              'text-[var(--primary-10)] bg-[var(--primary-2)] border-[var(--primary-3)]'
            const summary = summarizeQuoteResult(
              requestData.quoteAgentResponse.quote_result,
            )
            value = summary.title
          } else if (
            agentIsRunning(block, requestData, workflow) ||
            requestData?.stage === label
          ) {
            status = 'Processing'
            statusColor = 'text-orange-10 bg-orange-2 border-orange-3'
            value = jobMessage || '—'
          }
        } else if (isDocGenBlock(block)) {
          status = 'Pending'
          statusColor = 'text-gray-10 bg-gray-2 border-gray-3'
          value = '-'
          const flowState = documentGenerateFlowState(
            requestData,
            block,
            workflow,
          )
          if (flowState === 'complete') {
            status = 'Completed'
            statusColor =
              'text-[var(--primary-10)] bg-[var(--primary-2)] border-[var(--primary-3)]'
            value = 'Document ready'
          } else if (flowState === 'running') {
            status = 'Processing'
            statusColor = 'text-orange-10 bg-orange-2 border-orange-3'
            value = jobMessage || '—'
          }
        }

        return (
          <div
            key={block.id}
            className='relative flex min-w-0 flex-1 cursor-default flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-3 bg-surface p-2.5 text-left select-none'
          >
            <div className='flex w-full flex-wrap items-center justify-between gap-1'>
              <div
                className='flex shrink-0 items-center justify-center rounded p-1.5'
                style={{
                  backgroundColor: block.color
                    ? `${block.color}15`
                    : 'var(--gray-2)',
                  color: block.color || 'var(--gray-11)',
                }}
              >
                <Icon className='h-4 w-4' icon={iconName} />
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
          </div>
        )
      })}
    </div>
  )
}

export default AgentSummaryBoxes
