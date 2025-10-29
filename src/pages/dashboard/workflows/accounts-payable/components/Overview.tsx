import { useViewportSize } from '@mantine/hooks'
import Icon from '@/components/base/icon/Icon'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '../../shared/components/Section'

const items = [
  {
    change: '+23%',
    icon: 'tabler:file-description',
    name: 'Invoices Processed',
    value: '240',
  },
  {
    change: '-67%',
    icon: 'tabler:clock',
    name: 'Average Processing Time',
    value: '3.6 Minutes',
  },
  {
    change: '+156%',
    icon: 'tabler:currency-dollar',
    name: 'Cost Savings',
    value: '$24.5K',
  },
  {
    change: '+0.5%',
    icon: 'tabler:focus-2',
    name: 'Accuracy Rate',
    value: '99.9%',
  },
]

const Overview = () => {
  const { width } = useViewportSize()

  return (
    <Section title='Overview'>
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          width >= SCREEN_XL
            ? '@xl:grid-cols-2 @5xl:grid-cols-4'
            : 'md:grid-cols-2 xl:grid-cols-4',
        )}
      >
        {items.map((item) => (
          <div
            className='rounded border border-gray-3 bg-surface p-4'
            key={item.name}
          >
            <div className='mb-4 flex items-center justify-between gap-2'>
              <div>
                <div className='mb-1 font-medium'>{item.name}</div>
                <div className='text-xl font-semibold text-gray-13'>
                  {item.value}
                </div>
              </div>

              <div className='flex size-10 items-center justify-center rounded bg-gray-3'>
                <Icon className='size-5' name={item.icon} />
              </div>
            </div>

            <div className='flex items-center justify-between gap-1 border-t border-gray-3 pt-4'>
              <div className='flex items-center gap-1'>
                <div
                  className={cn('font-medium text-green-11', {
                    'text-red-11': item.change.startsWith('-'),
                  })}
                >
                  {item.change}
                </div>
                <div className='text-gray-10'>vs yesterday</div>
              </div>

              <div className='flex w-13 items-center justify-center'>
                <Icon
                  className={cn('size-5 text-green-11', {
                    'text-red-11': item.change.startsWith('-'),
                  })}
                  name={
                    item.change.startsWith('+')
                      ? 'tabler:trending-up'
                      : 'tabler:trending-down'
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

Overview.displayName = 'Overview'
export default Overview
