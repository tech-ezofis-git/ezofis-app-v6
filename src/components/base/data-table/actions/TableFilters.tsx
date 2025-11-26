import { type Table as TanstackTable } from '@tanstack/react-table'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import Popover from '@/components/base/Popover'

interface Props<TData> {
  table: TanstackTable<TData>
}

const TableFilters = <TData,>({ table }: Props<TData>) => {
  const filtersState = table.getState().columnFilters

  const _rightSection = filtersState.length ? (
    <Badge color='gray' label={String(filtersState.length)} />
  ) : undefined

  return (
    <Popover
      position='bottom-start'
      width={filtersState.length > 0 ? 360 : 240}
      target={
        <Button
          color='gray'
          icon='tabler:filter'
          label='Filter'
          rightSection={_rightSection}
          variant='outline'
        />
      }
    >
      <div className='p-4'>
        <p className='mb-2 text-12 font-medium text-gray-9'>
          {filtersState.length > 0 ? 'Filter by' : 'No filters applied'}
        </p>

        <div className='flex items-center justify-between border-t border-gray-3 pt-2.5'>
          <Button
            color='gray'
            disabled={false}
            icon='tabler:plus'
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
