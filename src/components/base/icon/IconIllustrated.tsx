import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  icon: string
  className?: string
  color?: 'gray' | 'red'
}

const IconIllustrated = ({ className, color = 'gray', icon }: Props) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'flex size-18 items-center justify-center rounded-full',
          color === 'gray' ? 'bg-gray-3' : 'bg-red-3',
        )}
      >
        <div className='bg-gray flex size-12 items-center justify-center rounded-full bg-surface shadow-xs'>
          <Icon
            name={icon}
            className={cn(
              'size-6',
              color === 'gray' ? 'text-gray-11' : 'text-red-11',
            )}
          />
        </div>
      </div>
    </div>
  )
}

IconIllustrated.displayName = 'IconIllustrated'
export default IconIllustrated
