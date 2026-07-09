import type { MouseEvent } from 'react'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import type { ApiPlaygroundContext } from './ApiPlayground'

interface PaidActionApiTriggerProps {
  action: any
  context?: ApiPlaygroundContext
  onTrigger: (context: ApiPlaygroundContext) => void
}

export const PaidActionApiTrigger = ({
  action,
  context,
  onTrigger,
}: PaidActionApiTriggerProps) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    onTrigger({
      ...context,
      actionName: action?.label || context?.actionName || 'Paid',
      endpoint:
        action?.endpoint ||
        context?.endpoint ||
        'https://ezagentplayground.onrender.com/apikey.html?id=2',
      // model: action?.model || context?.model || 'gemini-2.0-flash-exp',
      // provider: action?.provider || context?.provider || 'gemini',
    })
  }

  return (
    <Tooltip content='Playground API' position='top'>
      <button
        aria-label='Playground Api'
        className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-primary-9 text-white shadow-lg transition-all hover:scale-105 hover:bg-primary-10 focus:ring-2 focus:ring-primary-9 focus:ring-offset-2 focus:outline-none active:scale-95'
        type='button'
        onClick={handleClick}
      >
        <Icon className='h-5 w-5 text-white' name='tabler:plug-connected' />
      </button>
    </Tooltip>
  )
}

export default PaidActionApiTrigger
