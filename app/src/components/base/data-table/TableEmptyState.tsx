import { type Table as TanstackTable } from '@tanstack/react-table'
import { useLayoutEffect, useRef, useState } from 'react'
import type { MenuPage } from '@/components/common/menuPageEmptyStates'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Tr from '@/components/base/table/Tr'
import ListEmptyState, {
  MENU_LIST_EMPTY_CONTAINER_CLASS,
  resolveEmptyVariant,
} from '@/components/common/ListEmptyState'
import PageEmptyState from '@/components/common/PageEmptyState'

interface Props<TData> {
  table: TanstackTable<TData>
  emptyDescription?: string
  emptyIcon?: string
  emptyTitle?: string
  page?: MenuPage
  onPrimaryAction?: () => void
}

const findHorizontalScroller = (element: HTMLElement) => {
  let parent = element.parentElement
  while (parent) {
    const overflowX = getComputedStyle(parent).overflowX
    if (overflowX === 'auto' || overflowX === 'scroll') return parent
    parent = parent.parentElement
  }
  return null
}

const TableEmptyState = <TData,>({
  emptyDescription,
  emptyIcon,
  emptyTitle,
  page,
  table,
  onPrimaryAction,
}: Props<TData>) => {
  const variant = resolveEmptyVariant(table as TanstackTable<any>)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState<number | null>(null)

  // The empty row spans every column, so with many columns it is wider than
  // the screen and its centre sits off to the right. Pin it to the visible
  // part of the table instead, so it stays centred while the table scrolls.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const scroller = anchor ? findHorizontalScroller(anchor) : null
    if (!scroller) return
    const update = () => setViewportWidth(scroller.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  return (
    <Tbody>
      <Tr>
        <Td colSpan={table.getVisibleLeafColumns().length}>
          <div
            ref={anchorRef}
            style={
              viewportWidth
                ? {
                    left: 0,
                    maxWidth: '100%',
                    position: 'sticky',
                    width: viewportWidth,
                  }
                : undefined
            }
          >
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
                icon={emptyIcon ?? 'lucide:folder-search'}
                variant={variant}
                description={
                  emptyDescription ??
                  (variant === 'filtered'
                    ? 'No rows match your current search or filters. Try different keywords or clear filters.'
                    : 'There is no data to display yet.')
                }
                title={
                  emptyTitle ??
                  (variant === 'filtered'
                    ? 'No matching results'
                    : 'No data yet')
                }
              />
            )}
          </div>
        </Td>
      </Tr>
    </Tbody>
  )
}

TableEmptyState.displayName = 'TableEmptyState'
export default TableEmptyState
