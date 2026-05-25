import { type Table as TanstackTable } from '@tanstack/react-table'
import ListEmptyState, {
  MENU_LIST_EMPTY_CONTAINER_CLASS,
  resolveEmptyVariant,
} from '@/components/common/ListEmptyState'
import PageEmptyState from '@/components/common/PageEmptyState'
import type { MenuPage } from '@/components/common/menuPageEmptyStates'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Tr from '@/components/base/table/Tr'

interface Props<TData> {
  page?: MenuPage
  table: TanstackTable<TData>
  onPrimaryAction?: () => void
}

const TableEmptyState = <TData,>({
  page,
  table,
  onPrimaryAction,
}: Props<TData>) => {
  const variant = resolveEmptyVariant(table as TanstackTable<any>)

  return (
    <Tbody>
      <Tr>
        <Td colSpan={table.getVisibleLeafColumns().length}>
          {page ? (
            <ListEmptyState
              containerClassName={MENU_LIST_EMPTY_CONTAINER_CLASS}
              page={page}
              table={table}
              variant={variant}
              onPrimaryAction={onPrimaryAction}
            />
          ) : (
            <PageEmptyState
              containerClassName={MENU_LIST_EMPTY_CONTAINER_CLASS}
              fill={false}
              description={
                variant === 'filtered'
                  ? 'No rows match your current search or filters. Try different keywords or clear filters.'
                  : 'There is no data to display yet.'
              }
              icon='lucide:folder-search'
              title={
                variant === 'filtered'
                  ? 'No matching results'
                  : 'No data yet'
              }
              variant={variant}
            />
          )}
        </Td>
      </Tr>
    </Tbody>
  )
}

TableEmptyState.displayName = 'TableEmptyState'
export default TableEmptyState
