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
    <div className='flex w-full flex-col rounded-lg border border-gray-3 bg-surface p-5 shadow-sm transition-shadow hover:shadow-md'>
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
          <h4 className='truncate text-14/5 font-semibold text-gray-13'>
            {name}
          </h4>
        </div>
      </div>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <span className='shrink-0 text-13/5 font-medium text-gray-10'>
            Platform
          </span>
          <span className='truncate text-right text-13/5 font-semibold text-gray-13'>
            {platform}
          </span>
        </div>

        <div className='flex items-center justify-between gap-3'>
          <span className='shrink-0 text-13/5 font-medium text-gray-10'>
            Account
          </span>
          <span className='truncate text-right text-13/5 font-semibold text-gray-13'>
            {account}
          </span>
        </div>
      </div>
    </div>
  )
}

Integration.displayName = 'Integration'
export default Integration
