import { type Table as TanstackTable } from '@tanstack/react-table'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Tr from '@/components/base/table/Tr'

interface Props<TData> {
  table: TanstackTable<TData>
}

const TableEmptyState = <TData,>({ table }: Props<TData>) => {
  return (
    <Tbody>
      <Tr>
        <Td colSpan={table.getVisibleLeafColumns().length}>
          <div className='flex flex-col items-center justify-center pt-12 pb-24'>
            <IconIllustrated className='mb-4' icon='tabler:file-search' />

            <div className='mb-1 text-15 font-semibold text-gray-13'>
              No results found
            </div>

            <div className='text-13 text-balance text-gray-11'>
              We couldn't find anything matching your search. Try changing
              filters or keywords.
            </div>

            <div className='mt-6 flex justify-center gap-3'>
              <Button color='gray' label='Clear filters' variant='outline' />
            </div>
          </div>
        </Td>
      </Tr>
    </Tbody>
  )
}

TableEmptyState.displayName = 'TableEmptyState'
export default TableEmptyState
