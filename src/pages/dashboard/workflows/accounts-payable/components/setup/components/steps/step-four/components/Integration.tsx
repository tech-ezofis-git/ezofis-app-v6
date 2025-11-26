import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'

interface Props {
  account: string
  icon: string
  name: string
  platform: string
  status: string
}

const Integration = ({ account, icon, name, platform, status }: Props) => {
  return (
    <div className='rounded border border-gray-3 p-4' key={name}>
      <div className='mb-3 flex flex-wrap items-center gap-4 border-b border-gray-3 pb-4'>
        <div className='flex size-10 items-center justify-center rounded bg-gray-3/75'>
          <Icon className='size-5' name={icon} />
        </div>

        <div className='text-15 font-semibold text-gray-13'>{name}</div>
        <div className='flex-1' />
        <Badge className='capitalize' color='green' label={status} />
      </div>

      <div className='flex h-8 items-center justify-between gap-3'>
        <div>Platform:</div>
        <div className='truncate font-medium text-gray-12 capitalize'>
          {platform}
        </div>
      </div>

      <div className='flex h-8 items-center justify-between gap-3'>
        <div>Account:</div>
        <div className='truncate font-medium text-gray-12'>{account}</div>
      </div>
    </div>
  )
}

Integration.displayName = 'Integration'
export default Integration
