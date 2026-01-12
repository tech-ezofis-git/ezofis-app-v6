import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  account: string
  icon: string
  name: string
  platform: string
  iconBgColor?: string
  iconColor?: string
}

const Integration = ({ account, icon, name, platform, iconBgColor = 'bg-gray-3/75', iconColor = 'text-primary-11' }: Props) => {
  const iconClass = cn('size-5', iconColor)
  return (
    <div className='flex flex-col rounded-lg border border-gray-4 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl max-w-full sm:max-w-xs lg:max-w-md w-full'> {/* Adjusted max-w and responsive width */}
      <div className='mb-4 flex items-center gap-3 border-b border-gray-3 pb-4'>
        <div className={cn('flex size-12 items-center justify-center rounded-lg shadow-sm', iconBgColor)}>
          <Icon className={iconClass} name={icon} />
        </div>
        <div className='flex flex-1 items-center'>
          <h4 className='text-16 font-semibold text-gray-13 overflow-hidden text-ellipsis whitespace-nowrap'>{name}</h4> {/* Prevent text overflow */}
        </div>
      </div>

      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <span className='text-13 font-medium text-gray-10 mr-2'>Platform:</span> {/* Added margin-right to add space */}
          <span className='text-right text-13 font-semibold text-gray-13 overflow-hidden text-ellipsis whitespace-nowrap'>{platform}</span>
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-13 font-medium text-gray-10 mr-2'>Account:</span> {/* Added margin-right to add space */}
          <span className='text-right text-13 font-semibold text-gray-13 overflow-hidden text-ellipsis whitespace-nowrap'>{account}</span>
        </div>
      </div>
    </div>
  )
}

Integration.displayName = 'Integration'
export default Integration