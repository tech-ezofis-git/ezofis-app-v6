import Tooltip from '@/components/base/Tooltip'
import Icon from '@/components/base/icon/Icon'

interface PaidActionApiTriggerProps {
  action: any
  onTrigger: (context: any) => void
}

export const PaidActionApiTrigger = ({
  action,
  onTrigger,
}: PaidActionApiTriggerProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onTrigger({
      actionName: action?.label || 'Paid',
      endpoint: action?.endpoint || 'https://ezagentplayground.onrender.com/apikey.html?id=2',
      model: action?.model || 'gemini-2.0-flash-exp',
      provider: action?.provider || 'gemini',
    })
  }

  return (
    <Tooltip content='Playground API' position='top'>
      <button
        aria-label='Playground Api'
        className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--gray-3)] bg-surface text-[var(--gray-11)] transition-all hover:bg-[var(--gray-2)] hover:text-[var(--primary-9)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--primary-9)]'
        type='button'
        onClick={handleClick}
      >
        <Icon className='h-4 w-4 animate-pulse text-[var(--primary-9)]' name='tabler:plug' />
      </button>
    </Tooltip>
  )
}

export default PaidActionApiTrigger
