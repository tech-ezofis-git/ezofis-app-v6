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
  green: 'tabler:circle-check',
  primary: 'tabler:info-circle',
  red: 'tabler:alert-circle',
} as const

const Alert = ({ className, text, variant = 'primary' }: Props) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded border px-4 py-2.5',
        variantClassNames[variant],
        className,
      )}
    >
      <Icon className='size-5' name={variantIconNames[variant]} />
      <div className='font-medium'>{text}</div>
    </div>
  )
}

Alert.displayName = 'Alert'
export default Alert
