import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useLingui } from '@lingui/react/macro'
import {
  flexRender,
  type Row,
  type Table as TanstackTable,
} from '@tanstack/react-table'
import { GripVertical } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import fitColumnsToWidth, {
  columnSizingEquals,
} from '@/components/base/data-table/helpers/fitColumnsToWidth'
import getColumnPinnedStyles from '@/components/base/data-table/helpers/getColumnPinnedStyles'
import TableHeaderCell from '@/components/base/data-table/TableHeaderCell'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import cn from '@/utils/cn'

type SettingsSortableDataTableProps<TData> = {
  dragColumnId?: string
  rowClassName?: string
  selectedRowId?: string | null
  table: TanstackTable<TData>
  getRowClassName?: (row: TData) => string | undefined
  onReorder: (nextRows: TData[]) => void
  onRowClick?: (rowId: string) => void
  onRowMouseEnter?: (rowId: string) => void
  onRowMouseLeave?: () => void
  onValidateReorder?: (
    activeIndex: number,
    newIndex: number,
    rows: TData[],
  ) => boolean
  disabled?: boolean | ((row: TData) => boolean)
  renderSubComponent?: (row: TData) => React.ReactNode
}

export default function SettingsSortableDataTable<TData>({
  dragColumnId = 'drag',
  rowClassName,
  selectedRowId,
  table,
  getRowClassName,
  onReorder,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  onValidateReorder,
  disabled,
  renderSubComponent,
}: SettingsSortableDataTableProps<TData>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const hasUserResizedRef = useRef(false)
  const [containerWidth, setContainerWidth] = useState(0)

  const rows = table.getRowModel().rows
  const rowIds = rows.map((row) => row.id)
  const visibleColumnKey = table
    .getVisibleLeafColumns()
    .map((column) => column.id)
    .join('|')
  const isResizingColumn = table.getState().columnSizingInfo.isResizingColumn

  useEffect(() => {
    if (isResizingColumn) {
      hasUserResizedRef.current = true
    }
  }, [isResizingColumn])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const updateWidth = () => {
      setContainerWidth(container.clientWidth)
    }

    updateWidth()

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setContainerWidth(entry.contentRect.width)
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (hasUserResizedRef.current || containerWidth <= 0) return

    const nextSizing = fitColumnsToWidth(table, containerWidth)
    if (!nextSizing) return

    if (columnSizingEquals(table.getState().columnSizing, nextSizing)) return

    table.setColumnSizing(nextSizing)
  }, [containerWidth, table, visibleColumnKey])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = rowIds.indexOf(String(active.id))
    const newIndex = rowIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const rowData = rows.map((row) => row.original)
    if (onValidateReorder && !onValidateReorder(oldIndex, newIndex, rowData)) {
      return
    }

    const reorderedRows = arrayMove(rowData, oldIndex, newIndex)
    onReorder(reorderedRows)
  }

  return (
    <div className='w-full overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm'>
      <div className='w-full overflow-x-auto' ref={scrollRef}>
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rowIds}
            strategy={verticalListSortingStrategy}
          >
            <Table
              className='table-fixed'
              style={{
                minWidth: '100%',
                width: Math.max(table.getTotalSize(), containerWidth || 0),
              }}
            >
              <Thead className='sticky top-0 z-10 bg-[var(--gray-2)] shadow-sm'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHeaderCell
                        className={header.column.columnDef.meta?.className}
                        header={header}
                        key={header.id}
                        table={table}
                      />
                    ))}
                  </Tr>
                ))}
              </Thead>

              <Tbody>
                {rows.map((row) => {
                  const isDragDisabled =
                    typeof disabled === 'function'
                      ? disabled(row.original)
                      : Boolean(disabled)

                  return (
                    <SortableDataRow
                      dragColumnId={dragColumnId}
                      key={row.id}
                      row={row}
                      rowClassName={rowClassName}
                      selectedRowId={selectedRowId}
                      table={table}
                      getRowClassName={getRowClassName}
                      onRowClick={onRowClick}
                      onRowMouseEnter={onRowMouseEnter}
                      onRowMouseLeave={onRowMouseLeave}
                      disabled={isDragDisabled}
                      renderSubComponent={renderSubComponent}
                    />
                  )
                })}
              </Tbody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

function SortableDataRow<TData>({
  dragColumnId,
  row,
  rowClassName,
  selectedRowId,
  table,
  getRowClassName,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  disabled,
  renderSubComponent,
}: {
  dragColumnId: string
  row: Row<TData>
  rowClassName?: string
  selectedRowId?: string | null
  table: TanstackTable<TData>
  getRowClassName?: (row: TData) => string | undefined
  onRowClick?: (rowId: string) => void
  onRowMouseEnter?: (rowId: string) => void
  onRowMouseLeave?: () => void
  disabled?: boolean
  renderSubComponent?: (row: TData) => React.ReactNode
}) {
  const { t } = useLingui()
  const {
    attributes,
    isDragging,
    listeners,
    transform,
    transition,
    setActivatorNodeRef,
    setNodeRef,
  } = useSortable({ id: row.id, disabled })

  return (
    <>
      <tr
        ref={setNodeRef}
      className={cn(
        'relative border-b border-[var(--gray-2)] transition-all [--pinned-bg:var(--surface)] focus-within:z-40 hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm hover:[--pinned-bg:var(--gray-1)]',
        rowClassName,
        getRowClassName?.(row.original),
        selectedRowId === row.id && 'bg-primary-1',
        isDragging && 'z-20 bg-[var(--gray-1)] opacity-90 shadow-md',
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => onRowClick?.(row.id)}
      onMouseEnter={() => onRowMouseEnter?.(row.id)}
      onMouseLeave={() => onRowMouseLeave?.()}
    >
      {row.getVisibleCells().map((cell) => (
        <Td
          className={cn(
            'max-w-0 overflow-visible py-1.5',
            cell.column.columnDef.meta?.className,
          )}
          key={cell.id}
          style={getColumnPinnedStyles(cell.column, table)}
        >
          {cell.column.id === dragColumnId ? (
            <div className='flex justify-center'>
              {!disabled ? (
                <button
                  aria-label={t`Drag to reorder`}
                  className='flex cursor-grab items-center text-gray-9 outline-none active:cursor-grabbing'
                  ref={setActivatorNodeRef}
                  type='button'
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical size={16} />
                </button>
              ) : (
                <GripVertical size={16} className='text-gray-4 opacity-40' />
              )}
            </div>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </Td>
      ))}
      </tr>
      {renderSubComponent?.(row.original)}
    </>
  )
}
