import '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string
    headerAlign?: 'left' | 'center' | 'right'
    label?: string
    showMenu?: boolean
  }
}

export interface Column {
  id: string
  label: string
  className?: string
  enableGrouping?: boolean
  enableHiding?: boolean
  enablePinning?: boolean
  enableResizing?: boolean
  enableSorting?: boolean
  hideHeader?: boolean
  isDisplayColumn?: boolean
  showMenu?: boolean
  size?: number
  renderCell?: (row: any, index?: number) => React.ReactNode
}

export interface Row extends Record<string, unknown> {
  group: string
  id: string
  subRows: Row[]
  type: 'group' | 'item'
}

export type RowSize = 'default' | 'compact' | 'comfortable'

export interface SearchState {
  id: string
  value: string
}
