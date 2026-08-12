import { type Table as TanstackTable } from '@tanstack/react-table'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Popover from '@/components/base/Popover'
import Tooltip from '@/components/base/Tooltip'

interface Props<TData> {
  table: TanstackTable<TData>
  iconOnly?: boolean
}

const TableFilters = <TData,>({ iconOnly = true, table }: Props<TData>) => {
  const filtersState = table.getState().columnFilters

  const _rightSection = filtersState.length ? (
    <Badge color='gray' label={String(filtersState.length)} />
  ) : undefined

  const trigger = iconOnly ? (
    <Tooltip content='Filter' position='top'>
      <div className='relative inline-block'>
        <IconButton color='gray' icon='lucide:filter' variant='outline' />
        {filtersState.length > 0 && (
          <span className='absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--gray-9)] px-1 text-[9px] font-bold text-white shadow-sm'>
            {filtersState.length}
          </span>
        )}
      </div>
    </Tooltip>
  ) : (
    <Button
      color='gray'
      icon='lucide:filter'
      label='Filter'
      rightSection={_rightSection}
      variant='outline'
    />
  )

  return (
    <Popover
      position='bottom-start'
      target={trigger}
      width={filtersState.length > 0 ? 360 : 240}
    >
      <div className='p-4'>
        <p className='mb-2 text-xs font-medium text-gray-9'>
          {filtersState.length > 0 ? 'Filter by' : 'No filters applied'}
        </p>

        <div className='flex items-center justify-between border-t border-gray-3 pt-2.5'>
          <Button
            color='gray'
            disabled={false}
            icon='lucide:plus'
            label='Add'
            variant='subtle'
          />

          {filtersState.length > 0 && (
            <Button color='gray' label='Clear' variant='outline' />
          )}
        </div>
      </div>
    </Popover>
  )
}

TableFilters.displayName = 'TableFilters'
export default TableFilters
