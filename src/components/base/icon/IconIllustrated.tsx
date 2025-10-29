import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  icon: string
  className?: string
}

const IconIllustrated = ({ className, icon }: Props) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className='flex size-18 items-center justify-center rounded-full bg-gray-3'>
        <div className='bg-gray flex size-12 items-center justify-center rounded-full bg-surface text-gray-11 shadow-xs'>
          <Icon className='size-6' name={icon} />
        </div>
      </div>
    </div>
  )
}

IconIllustrated.displayName = 'IconIllustrated'
export default IconIllustrated
