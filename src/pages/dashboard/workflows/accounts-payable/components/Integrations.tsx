import { useViewportSize } from '@mantine/hooks'
import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '../../shared/components/Section'

const items = [
  {
    account: 'example@gmail.com',
    icon: 'tabler:mail',
    name: 'Email Integration',
    platform: 'Gmail',
    status: 'connected',
  },
  {
    account: 'example@gmail.com',
    icon: 'tabler:database',
    name: 'ERP System',
    platform: 'Quickbooks',
    status: 'connected',
  },
  {
    account: 'example@gmail.com',
    icon: 'tabler:cloud',
    name: 'Document Storage',
    platform: 'Google Drive',
    status: 'connected',
  },
]

const Integrations = () => {
  const { width } = useViewportSize()

  return (
    <Section icon='tabler:adjustments-horizontal' title='Integrations'>
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          width >= SCREEN_XL
            ? '@xl:grid-cols-2 @5xl:grid-cols-3'
            : 'md:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {items.map((item) => (
          <div className='rounded-md border border-gray-3 p-5' key={item.name}>
            <div className='mb-5 flex items-center gap-4 border-b border-gray-3 pb-5'>
              <div className='flex size-11 items-center justify-center rounded-md border border-gray-3 bg-gray-2'>
                <Icon className='size-6' name={item.icon} />
              </div>

              <div className='text-base font-semibold text-gray-13'>
                {item.name}
              </div>
            </div>

            <div>
              <div className='flex h-9 items-center justify-between gap-3'>
                <div>Status:</div>
                <Badge
                  className='capitalize'
                  color='green'
                  label={item.status}
                />
              </div>

              <div className='flex h-9 items-center justify-between gap-3'>
                <div>Platform:</div>
                <div className='truncate font-medium text-gray-12 capitalize'>
                  {item.platform}
                </div>
              </div>

              <div className='flex h-9 items-center justify-between gap-3'>
                <div>Account:</div>
                <div className='truncate font-medium text-gray-12'>
                  {item.account}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

Integrations.displayName = 'Integrations'
export default Integrations
