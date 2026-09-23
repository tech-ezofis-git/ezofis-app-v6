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
    <div className='flex items-center gap-3 overflow-x-auto pb-4'>
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
          status = 'Not Verified'
          statusColor = 'text-orange-10 bg-orange-2 border-orange-3'
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
              'group relative flex w-[220px] shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-surface-primary p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md',
              isSelected
                ? 'border-[var(--brand-primary)] shadow-md ring-1 ring-[var(--brand-primary)]'
                : 'border-gray-3 hover:border-gray-5',
            )}
            onClick={() => onAgentClick(isSelected ? null : block.id)}
          >
            <div className='mb-3 flex items-start justify-between'>
              <div
                className='flex h-8 w-8 items-center justify-center rounded-lg shadow-sm'
                style={{ backgroundColor: block.color || '#e5e7eb' }}
              >
                <Icon
                  icon={iconName}
                  className='h-4 w-4 text-white'
                />
              </div>
              <div
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide',
                  statusColor,
                )}
              >
                {status}
              </div>
            </div>
            
            <div className='flex flex-col gap-1'>
              <span className='truncate text-sm font-semibold text-gray-12'>
                {label}
              </span>
              <span className='truncate text-13 text-gray-11'>
                {value}
              </span>
            </div>
            
            <div className='mt-2 truncate text-xs text-gray-9'>
              via Workflow
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default AgentSummaryBoxes
