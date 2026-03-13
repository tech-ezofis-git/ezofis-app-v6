import { type CellContext, createColumnHelper } from '@tanstack/react-table'
import IconButton from '@/components/base/button/IconButton'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import type { Column, Row } from '../types'

const columnHelper = createColumnHelper<Row>()

const renderCell = (column: Column, info: CellContext<Row, unknown>) => {
  const value = info.getValue()
  const isGroupRow = info.row.original.type === 'group'

  if (isGroupRow) return ''

  if (!isGroupRow && column.renderCell) {
    return (column.renderCell as any)(info.row.original, info.row.index)
  }

  return String(value)
}

export default function transformColumns(
  columns: Column[],
  enableRowSelection?: boolean,
) {
  const transformedColumns = columns.map((column) => {
    const config = {
      enableGrouping: column.enableGrouping ?? false,
      enableHiding: column.enableHiding ?? true,
      enablePinning: column.enablePinning ?? true,
      enableResizing: column.enableResizing ?? true,
      enableSorting: column.enableSorting ?? true,
      header: column.hideHeader ? '' : column.label,
      id: column.id,
      meta: {
        className: column.className ?? '',
        label: column.label,
        showMenu: column.showMenu ?? true,
      },
      size: column.size,
      cell: (info: CellContext<Row, unknown>) => renderCell(column, info),
    }

    return column.isDisplayColumn
      ? columnHelper.display({
          ...config,
          enableGrouping: false,
          enableSorting: false,
        })
      : columnHelper.accessor(column.id, { ...config })
  })

  const groupColumn = columnHelper.display({
    enableGrouping: false,
    enableHiding: false,
    enablePinning: false,
    enableResizing: true,
    enableSorting: false,
    id: 'group',
    meta: {
      className: 'px-2',
      label: 'Group',
      showMenu: true,
    },
    size: 200,
    cell: ({ row }) => {
      const isGroupRow = row.original.type === 'group'

      if (isGroupRow) {
        return (
          <div
            className='flex items-center gap-1'
            style={{ paddingLeft: `${row.depth * 20}px` }}
          >
            <IconButton
              className='size-6'
              color='gray'
              disabled={!row.getCanExpand()}
              variant='ghost'
              icon={
                row.getIsExpanded()
                  ? 'lucide:chevron-down'
                  : 'lucide:chevron-right'
              }
              onClick={() => row.toggleExpanded()}
            />
            <span className='font-medium'>{row.original.group}</span>
          </div>
        )
      }

      return ''
    },
    header: () => <div className='flex-1 px-2.5'>Group</div>,
  })

  const selectColumn = columnHelper.display({
    enableGrouping: false,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    enableSorting: false,
    id: 'select',
    meta: {
      className: 'p-1',
      label: '',
      showMenu: false,
    },
    size: 40,
    cell: ({ row }) => {
      const type = row.original.type
      // const groupCount = row.original.groupCount

      const checked =
        type === 'group'
          ? row.getIsSomeSelected() || row.getIsAllSubRowsSelected()
          : row.getIsSelected()
      const indeterminate = type === 'group' ? row.getIsSomeSelected() : false

      return (
        <div className='flex items-center justify-center'>
          <InputCheckbox
            checked={checked}
            indeterminate={indeterminate}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      )
    },
    header: ({ table }) => (
      <div className='flex items-center justify-center'>
        <InputCheckbox
          indeterminate={table.getIsSomePageRowsSelected()}
          checked={
            table.getIsAllPageRowsSelected() ||
            table.getIsSomePageRowsSelected()
          }
          onChange={table.toggleAllPageRowsSelected}
        />
      </div>
    ),
  })

  if (enableRowSelection) {
    return [selectColumn, groupColumn, ...transformedColumns]
  }

  return [groupColumn, ...transformedColumns]
}
