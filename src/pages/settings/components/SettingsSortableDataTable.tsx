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
import { flexRender, type Row, type Table as TanstackTable } from '@tanstack/react-table'
import { GripVertical } from 'lucide-react'
import TableHeaderCell from '@/components/base/data-table/TableHeaderCell'
import getColumnPinnedStyles from '@/components/base/data-table/helpers/getColumnPinnedStyles'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import cn from '@/utils/cn'

type SettingsSortableDataTableProps<TData> = {
  dragColumnId?: string
  getRowClassName?: (row: TData) => string | undefined
  onRowClick?: (rowId: string) => void
  onRowMouseEnter?: (rowId: string) => void
  onRowMouseLeave?: () => void
  onValidateReorder?: (
    activeIndex: number,
    newIndex: number,
    rows: TData[],
  ) => boolean
  rowClassName?: string
  selectedRowId?: string | null
  table: TanstackTable<TData>
  onReorder: (nextRows: TData[]) => void
}

function SortableDataRow<TData>({
  dragColumnId,
  getRowClassName,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  row,
  rowClassName,
  selectedRowId,
  table,
}: {
  dragColumnId: string
  getRowClassName?: (row: TData) => string | undefined
  onRowClick?: (rowId: string) => void
  onRowMouseEnter?: (rowId: string) => void
  onRowMouseLeave?: () => void
  row: Row<TData>
  rowClassName?: string
  selectedRowId?: string | null
  table: TanstackTable<TData>
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: row.id })

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        'relative border-b border-[var(--gray-2)] transition-all [--pinned-bg:var(--surface)] hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm hover:[--pinned-bg:var(--gray-1)] focus-within:z-40',
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
          key={cell.id}
          style={getColumnPinnedStyles(cell.column, table)}
          className={cn('py-2.5', cell.column.columnDef.meta?.className)}
        >
          {cell.column.id === dragColumnId ? (
            <div className='flex justify-center'>
              <button
                ref={setActivatorNodeRef}
                aria-label='Drag to reorder'
                className='flex cursor-grab items-center text-gray-9 outline-none active:cursor-grabbing'
                type='button'
                {...attributes}
                {...listeners}
              >
                <GripVertical size={16} />
              </button>
            </div>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </Td>
      ))}
    </tr>
  )
}

export default function SettingsSortableDataTable<TData>({
  dragColumnId = 'drag',
  getRowClassName,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  onValidateReorder,
  rowClassName,
  selectedRowId,
  table,
  onReorder,
}: SettingsSortableDataTableProps<TData>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const rows = table.getRowModel().rows
  const rowIds = rows.map((row) => row.id)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = rowIds.indexOf(String(active.id))
    const newIndex = rowIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const rowData = rows.map((row) => row.original)
    if (
      onValidateReorder &&
      !onValidateReorder(oldIndex, newIndex, rowData)
    ) {
      return
    }

    const reorderedRows = arrayMove(rowData, oldIndex, newIndex)
    onReorder(reorderedRows)
  }

  return (
    <div className='w-full overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm'>
      <div className='w-full overflow-x-auto'>
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <Table
              className='table-fixed'
              style={{
                minWidth: '100%',
                width: table.getTotalSize(),
              }}
            >
              <Thead className='sticky top-0 z-10 bg-[var(--gray-2)] shadow-sm'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHeaderCell
                        header={header}
                        key={header.id}
                        table={table}
                      />
                    ))}
                  </Tr>
                ))}
              </Thead>

              <Tbody>
                {rows.map((row) => (
                  <SortableDataRow
                    dragColumnId={dragColumnId}
                    getRowClassName={getRowClassName}
                    key={row.id}
                    row={row}
                    rowClassName={rowClassName}
                    selectedRowId={selectedRowId}
                    table={table}
                    onRowClick={onRowClick}
                    onRowMouseEnter={onRowMouseEnter}
                    onRowMouseLeave={onRowMouseLeave}
                  />
                ))}
              </Tbody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
