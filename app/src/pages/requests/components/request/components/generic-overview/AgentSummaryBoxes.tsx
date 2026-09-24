import React from 'react'
import { Icon } from '@iconify/react'
import cn from '@/utils/cn'

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

  return (
    <div
      className={cn(
        'grid gap-3 pb-4',
        agentBlocks.length <= 3 && 'grid-cols-1 sm:grid-cols-3',
        agentBlocks.length === 4 && 'grid-cols-2 md:grid-cols-2 xl:grid-cols-4',
        agentBlocks.length === 5 && 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        agentBlocks.length >= 6 && 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
      )}
    >
      {agentBlocks.map((block) => {
        const isSelected = selectedAgentBlockId === block.id
        const label = block.settings?.label || 'Agent'
        const iconName = block.icon || 'lucide:cpu'

        // Placeholder status parsing. This can be mapped to real API data later.
        // For now we will use generic logic based on the block type.
        let status = 'Pending'
        let statusColor = 'text-gray-9 bg-gray-2 border-gray-3'
        let value = '-'

        // Simple placeholder mapping
        if (block.type === 'QUALIFY_AGENT') {
          status = 'Qualifed'
          statusColor = 'text-green-10 bg-green-2 border-green-3'
          value = 'QUALIFY-1001'
        } else if (block.type === 'QUOTE_AGENT') {
          status = 'Matched'
          statusColor = 'text-green-10 bg-green-2 border-green-3'
          value = 'Quote-1001'
        } else if (block.type === 'DOCUMENT_GENERATE_AGENT') {
          status = 'Generated'
          statusColor = 'text-blue-10 bg-blue-2 border-blue-3'
          value = 'Doc-Ready'
        }

        return (
          <button
            key={block.id}
            className={cn(
              'relative flex min-w-0 flex-1 cursor-pointer flex-col gap-1.5 overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95',
              isSelected
                ? 'border-[var(--primary-9)] bg-[var(--primary-2)]/30 shadow-sm ring-1 ring-[var(--primary-9)]/20'
                : 'border-gray-3 bg-surface hover:bg-[var(--gray-1)]',
            )}
            onClick={() => onAgentClick(isSelected ? null : block.id)}
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
              <div className='mt-0.5 truncate text-[10px] font-normal leading-none text-[var(--gray-10)]'>
                via Workflow
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default AgentSummaryBoxes
