import { type Table as TanstackTable } from '@tanstack/react-table'
import { useCallback, useRef, useState } from 'react'
import type { RowSize } from '@/components/base/data-table/types'
import TableActionBar from '@/components/base/data-table/TableActionBar'

type UseSettingsTableToolbarProps<TData> = {
  hideGrouping?: boolean
  isReLoading: boolean
  table: TanstackTable<TData>
  onReload: () => void
}

export default function useSettingsTableToolbar<TData>({
  hideGrouping = true,
  isReLoading,
  table,
  onReload,
}: UseSettingsTableToolbarProps<TData>) {
  const [rowSize, setRowSize] = useState<RowSize>('default')
  const onReloadRef = useRef(onReload)
  onReloadRef.current = onReload

  const handleReload = useCallback(() => {
    onReloadRef.current()
  }, [])

  const toolbar = (
    <TableActionBar
      className='mb-0'
      hideGrouping={hideGrouping}
      isReloading={isReLoading}
      rowSize={rowSize}
      table={table}
      compact
      onReload={handleReload}
      onRowSizeChange={setRowSize}
    />
  )

  return {
    rowSize,
    toolbar,
    onRowSizeChange: setRowSize,
  }
}
