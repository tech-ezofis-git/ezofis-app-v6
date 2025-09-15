import { Dialog } from '@mantine/core'
import { useElementSize } from '@mantine/hooks'
import { type Table as TanstackTable } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Divider from '@/components/base/Divider'
import cn from '@/utils/cn'

interface Props<TData> {
  table: TanstackTable<TData>
  className?: string
}

const TableBulkActionBar = <TData,>({ className, table }: Props<TData>) => {
  const [open, setOpen] = useState(false)
  const { ref, width } = useElementSize()
  const selectionState = table.getState().rowSelection
  const selectedRows = Object.keys(selectionState).filter(
    (key) => !key.includes('group'),
  )
  const isSomeRowsSelected = selectedRows.length > 0

  useEffect(() => setOpen(isSomeRowsSelected), [isSomeRowsSelected])

  return (
    <Dialog
      opened={open}
      position={{ bottom: 24, left: `calc(50% - ${width / 2}px)` }}
      ref={ref}
      size='auto'
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-md border border-gray-3 bg-surface-raised !p-2 shadow-lg',
        className,
      )}
      onClose={() => setOpen(false)}
    >
      <Button
        className='text-sm disabled:opacity-100'
        label={`${selectedRows.length} selected`}
        disabled
      />

      <Divider className='mx-2 my-1.5' orientation='vertical' />

      <Button
        color='gray'
        icon='tabler:download'
        label='Export'
        variant='subtle'
      />
      <Button
        color='gray'
        icon='tabler:trash'
        iconClass='text-red-11'
        label='Delete'
        variant='subtle'
      />
      <IconButton color='gray' icon='tabler:dots' variant='subtle' />

      <Divider className='mx-2 my-1.5' orientation='vertical' />

      <IconButton
        color='gray'
        icon='tabler:x'
        variant='subtle'
        onClick={() => table.resetRowSelection()}
      />
    </Dialog>
  )
}

TableBulkActionBar.displayName = 'TableBulkActionBar'
export default TableBulkActionBar
