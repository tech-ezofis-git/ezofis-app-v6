import type { Table as TanstackTable } from '@tanstack/react-table'
import PageEmptyState, {
  hasActiveTableSearch,
  resolveEmptyVariant,
} from '@/components/common/PageEmptyState'
import type { MenuPage, MenuPageEmptyVariant } from '@/components/common/menuPageEmptyStates'

/** Shared padding for menu list/table empty states (workflows, forms, requests). */
export const MENU_LIST_EMPTY_CONTAINER_CLASS = 'pt-12 pb-24'

interface Props {
  containerClassName?: string
  fill?: boolean
  page: MenuPage
  table?: TanstackTable<any>
  variant?: MenuPageEmptyVariant
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
}

/** Empty state for list/grid/table views — picks initial vs filtered from active search. */
const ListEmptyState = ({
  containerClassName,
  fill = false,
  page,
  table,
  variant,
  onPrimaryAction,
  onSecondaryAction,
}: Props) => {
  const resolvedVariant = resolveEmptyVariant(table, variant)

  return (
    <PageEmptyState
      containerClassName={containerClassName}
      fill={fill}
      page={page}
      variant={resolvedVariant}
      onPrimaryAction={onPrimaryAction}
      onSecondaryAction={onSecondaryAction}
    />
  )
}

interface MenuListEmptyPanelProps {
  page: MenuPage
  table?: TanstackTable<any>
  variant?: MenuPageEmptyVariant
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
}

/** Empty state panel matching the DataTable bordered card (grid views). */
export const MenuListEmptyPanel = ({
  page,
  table,
  variant,
  onPrimaryAction,
  onSecondaryAction,
}: MenuListEmptyPanelProps) => (
  <div className='flex min-h-0 w-full flex-1 rounded-xl border border-[var(--gray-3)] bg-white shadow-sm'>
    <ListEmptyState
      containerClassName={MENU_LIST_EMPTY_CONTAINER_CLASS}
      fill
      page={page}
      table={table}
      variant={variant}
      onPrimaryAction={onPrimaryAction}
      onSecondaryAction={onSecondaryAction}
    />
  </div>
)

ListEmptyState.displayName = 'ListEmptyState'
MenuListEmptyPanel.displayName = 'MenuListEmptyPanel'
export { hasActiveTableSearch, resolveEmptyVariant }
export default ListEmptyState
