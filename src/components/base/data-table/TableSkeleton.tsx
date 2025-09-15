import { type Table as TanstackTable } from '@tanstack/react-table'
import Skeleton from '@/components/base/Skeleton'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Tr from '@/components/base/table/Tr'

interface Props<TData> {
  table: TanstackTable<TData>
  pageSize?: number
  rowSizeClassNames?: string
}

const TableSkeleton = <TData,>({
  pageSize = 10,
  rowSizeClassNames,
  table,
}: Props<TData>) => {
  return (
    <Tbody>
      {Array(pageSize)
        .fill('')
        .map((_, index) => (
          <Tr key={index}>
            {table.getVisibleLeafColumns().map((column) => (
              <Td className={rowSizeClassNames} key={column.id}>
                <Skeleton />
              </Td>
            ))}
          </Tr>
        ))}
    </Tbody>
  )
}

TableSkeleton.displayName = 'TableSkeleton'
export default TableSkeleton
