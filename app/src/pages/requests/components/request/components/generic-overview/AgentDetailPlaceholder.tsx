import React from 'react'
import { useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { AgentBlock } from './AgentSummaryBoxes'

interface AgentDetailPlaceholderProps {
  agentBlock: AgentBlock
  onBack: () => void
  requestData: any
}

const AgentDetailPlaceholder: React.FC<AgentDetailPlaceholderProps> = ({
  agentBlock,
  onBack,
  requestData,
}) => {
  const { t } = useLingui()
  const label = agentBlock.settings?.label || 'Agent Details'
  const iconName = agentBlock.icon || 'lucide:cpu'

  return (
    <div className='flex flex-col gap-5 pb-5'>
      <div className='flex items-center gap-3'>
        <button
          onClick={onBack}
          className='flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-2 transition-colors'
        >
          <ArrowLeft className='h-4 w-4 text-gray-11' />
        </button>
        <div className='flex items-center gap-2'>
          <Icon icon={iconName} className='h-5 w-5 text-gray-9' />
          <h2 className='text-lg font-semibold text-gray-12'>{label}</h2>
        </div>
      </div>

      <div className='rounded-xl border border-gray-3 bg-surface-primary shadow-sm p-6'>
        <div className='flex flex-col items-center justify-center gap-3 py-10 text-center'>
          <Icon icon='lucide:hammer' className='h-10 w-10 text-gray-7' />
          <h3 className='text-base font-medium text-gray-12'>Details Not Available Yet</h3>
          <p className='text-13 text-gray-9 max-w-md'>
            The API integration for {label} is currently pending. Once the API is updated, this view will show the full agent analysis and details.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AgentDetailPlaceholder
