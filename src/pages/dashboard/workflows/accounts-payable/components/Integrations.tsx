import { useViewportSize } from '@mantine/hooks'
import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '../../shared/components/Section'

const items = [
  {
    account: 'example@gmail.com',
    icon: 'lucide:mail',
    name: 'Email Integration',
    platform: 'Gmail',
    status: 'connected',
  },
  {
    account: 'example@gmail.com',
    icon: 'lucide:database',
    name: 'ERP System',
    platform: 'Quickbooks',
    status: 'connected',
  },
  {
    account: 'example@gmail.com',
    icon: 'lucide:cloud',
    name: 'Document Storage',
    platform: 'Google Drive',
    status: 'connected',
  },
]

const Integrations = () => {
  const { width } = useViewportSize()

  return (
    <Section title='Integrations'>
      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          width >= SCREEN_XL
            ? '@xl:grid-cols-2 @5xl:grid-cols-3'
            : 'md:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {items.map((item) => (
          <div className='rounded border border-gray-3 p-4' key={item.name}>
            <div className='mb-4 flex items-center gap-4 border-b border-gray-3 pb-4'>
              <div className='flex size-10 items-center justify-center rounded bg-gray-3'>
                <Icon className='size-5' name={item.icon} />
              </div>

              <div className='font-poppins text-15 font-semibold text-gray-13'>
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
                <div className='truncate font-medium text-gray-13'>
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
