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

const Integration = ({
  account,
  icon,
  iconBgColor = 'bg-gray-3/75',
  iconColor = 'text-primary-11',
  name,
  platform,
}: Props) => {
  const iconClass = cn('size-5', iconColor)
  return (
    <div className='flex w-full max-w-full flex-col rounded-lg border border-gray-4 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl sm:max-w-xs lg:max-w-md'>
      {' '}
      {/* Adjusted max-w and responsive width */}
      <div className='mb-4 flex items-center gap-3 border-b border-gray-3 pb-4'>
        <div
          className={cn(
            'flex size-12 items-center justify-center rounded-lg shadow-sm',
            iconBgColor,
          )}
        >
          <Icon className={iconClass} name={icon} />
        </div>
        <div className='flex flex-1 items-center'>
          <h4 className='overflow-hidden text-16 font-semibold text-ellipsis whitespace-nowrap text-gray-13'>
            {name}
          </h4>{' '}
          {/* Prevent text overflow */}
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <span className='mr-2 text-13 font-medium text-gray-10'>
            Platform:
          </span>{' '}
          {/* Added margin-right to add space */}
          <span className='overflow-hidden text-right text-13 font-semibold text-ellipsis whitespace-nowrap text-gray-13'>
            {platform}
          </span>
        </div>

        <div className='flex items-center justify-between'>
          <span className='mr-2 text-13 font-medium text-gray-10'>
            Account:
          </span>{' '}
          {/* Added margin-right to add space */}
          <span className='overflow-hidden text-right text-13 font-semibold text-ellipsis whitespace-nowrap text-gray-13'>
            {account}
          </span>
        </div>
      </div>
    </div>
  )
}

Integration.displayName = 'Integration'
export default Integration
