import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  icon: string
  className?: string
  color?: 'gray' | 'red'
  iconClass?: string
  ringClass?: string
  surfaceClass?: string
}

const IconIllustrated = ({
  className,
  color = 'gray',
  icon,
  iconClass,
  ringClass,
  surfaceClass,
}: Props) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'flex size-18 items-center justify-center rounded-full transition-colors',
          color === 'gray' ? 'bg-gray-3' : 'bg-red-3',
          ringClass,
        )}
      >
        <div
          className={cn(
            'bg-gray flex size-12 items-center justify-center rounded-full bg-surface shadow-xs transition-colors',
            surfaceClass,
          )}
        >
          <Icon
            name={icon}
            className={cn(
              'size-5.5 transition-colors',
              color === 'gray' ? 'text-gray-11' : 'text-red-11',
              iconClass,
            )}
          />
        </div>
      </div>
    </div>
  )
}

IconIllustrated.displayName = 'IconIllustrated'
export default IconIllustrated
