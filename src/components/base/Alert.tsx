import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  text: string
  className?: string
  variant?: 'primary' | 'green' | 'red'
}

const variantClassNames = {
  green: 'bg-green-2 border-green-3 text-green-11',
  primary: 'bg-primary-2 border-primary-3 text-primary-11',
  red: 'bg-red-2 border-red-3 text-red-11',
} as const

const variantIconNames = {
  green: 'lucide:circle-check',
  primary: 'lucide:info',
  red: 'lucide:triangle-alert',
} as const

const Alert = ({ className, text, variant = 'primary' }: Props) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded border p-2',
        variantClassNames[variant],
        className,
      )}
    >
      <Icon name={variantIconNames[variant]} />
      <div className='text-13 font-medium'>{text}</div>
    </div>
  )
}

Alert.displayName = 'Alert'
export default Alert
