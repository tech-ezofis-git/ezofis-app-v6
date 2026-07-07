import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'

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
      endpoint:
        action?.endpoint ||
        'https://ezagentplayground.onrender.com/apikey.html?id=2',
      model: action?.model || 'gemini-2.0-flash-exp',
      provider: action?.provider || 'gemini',
    })
  }

  return (
    <Tooltip content='Playground API' position='top'>
      <button
        aria-label='Playground Api'
        className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary-9 text-white shadow-lg transition-all hover:scale-105 hover:bg-primary-10 focus:ring-2 focus:ring-primary-9 focus:ring-offset-2 focus:outline-none active:scale-95'
        type='button'
        onClick={handleClick}
      >
        <Icon className='h-5 w-5 text-white' name='tabler:plug-connected' />
      </button>
    </Tooltip>
  )
}

export default PaidActionApiTrigger
