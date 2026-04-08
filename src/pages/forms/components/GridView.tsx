import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '@/components/base/icon/Icon'
import Pagination from '@/components/base/pagination/Pagination'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import FormTypeBadge from '@/components/common/FormTypeBadge'
import { type Table as TanstackTable } from '@tanstack/react-table'
import TableActionBar from '@/components/base/data-table/TableActionBar'
import { useState } from 'react'
import type { RowSize } from '@/components/base/data-table/types'
import cn from '@/utils/cn'

interface GridViewProps {
  isLoading: boolean
  isRefetching: boolean
  page: number
  pageSize: number
  table: TanstackTable<any>
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onReload: () => void
}

const GridRowSkeleton = ({ index }: { index: number }) => (
  <motion.div
    animate={{ opacity: 1, y: 0 }}
    className='relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border border-gray-2 bg-white p-4'
    initial={{ opacity: 0, y: 6 }}
    transition={{ delay: index * 0.05 }}
  >
    <div className='flex min-w-0 items-center gap-4'>
      <div className='size-10 rounded-lg bg-gray-1 animate-pulse' />
      <div className='flex min-w-0 flex-col gap-2'>
        <div className='h-4 w-48 rounded bg-gray-1 animate-pulse' />
        <div className='h-3 w-32 rounded bg-gray-1 animate-pulse' />
      </div>
    </div>
    <div className='flex shrink-0 items-center gap-4'>
      <div className='h-6 w-20 rounded-full bg-gray-1 animate-pulse' />
      <div className='h-6 w-16 rounded-full bg-gray-1 animate-pulse' />
    </div>
  </motion.div>
)

const GridView = ({
  isLoading,
  isRefetching,
  page,
  pageSize,
  table,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onReload,
}: GridViewProps) => {
  const navigate = useNavigate()
  const [rowSize, setRowSize] = useState<RowSize>('default')
  
  const rows = table.getRowModel().rows

  const toggleGroup = (groupId: string) => {
    const row = table.getRow(groupId)
    if (row) {
      row.toggleExpanded()
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3 py-6'>
        {[1, 2, 3, 4, 5].map((i) => (
          <GridRowSkeleton index={i} key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className='flex flex-col py-6'>
      <TableActionBar 
        isReloading={isLoading || isRefetching}
        rowSize={rowSize}
        table={table}
        onReload={onReload}
        onRowSizeChange={setRowSize}
      />

      {rows.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <div className='mb-4 flex size-16 items-center justify-center rounded-full bg-gray-1 text-gray-4'>
            <Icon name='lucide:form-input' height={32} width={32} />
          </div>
          <h3 className='text-lg font-bold text-gray-13'>No forms yet</h3>
          <p className='text-sm text-gray-5'>Create your first form to get started.</p>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {rows.map((groupRow: any) => {
            const group = groupRow.original
            const subRows = group.subRows || []
            const groupValue = group.groupValue || 'Untitled Group'
            const isDefaultGroup = group.groupId === 'all'
            const isCollapsed = !groupRow.getIsExpanded()

            return (
              <div key={group.groupId || groupValue} className='flex flex-col'>
                {!isDefaultGroup && (
                  <motion.div
                    className='group/header sticky top-0 z-20 -mx-2 flex cursor-pointer items-center justify-between gap-4 border-b border-gray-2 bg-white px-3 py-3'
                    onClick={() => toggleGroup(groupRow.id)}
                  >
                    <div className='flex items-center gap-3'>
                      <div className='rounded-lg bg-accent-soft p-1.5'>
                        <Icon className='size-5 text-accent-primary' name='tabler:folder-open' />
                      </div>
                      <h2 className='text-sm font-bold text-gray-13 uppercase tracking-wider'>
                        {groupValue} <span className='ml-1 text-xs font-medium text-gray-5'>({group.groupCount})</span>
                      </h2>
                    </div>

                    <div className='flex items-center gap-4'>
                       <button className='rounded-full bg-transparent p-1.5 text-gray-4 transition-colors hover:bg-accent-soft hover:text-accent-primary'>
                        <Icon
                          name='tabler:chevron-down'
                          className={cn(
                            'size-5 transition-transform duration-300',
                            isCollapsed ? '-rotate-90' : 'rotate-0',
                          )}
                        />
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      animate={{ height: 'auto', opacity: 1 }}
                      className='overflow-hidden'
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className='flex flex-col gap-2 pt-3 pb-6'>
                        {subRows.map((form: any) => (
                          <motion.div
                            key={form.id}
                            whileHover={{ scale: 1.002, x: 4 }}
                            className='group relative flex w-full items-center justify-between gap-4 rounded-xl border border-gray-2 bg-white p-3 transition-all hover:border-accent-primary hover:shadow-md'
                            onClick={() => navigate({ 
                              to: '/form-builder/$formId',
                              params: { formId: form.uid || form.id }
                            })}
                          >
                            <div className='flex min-w-0 items-center gap-4'>
                              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent-soft bg-accent-soft/30 text-accent-primary transition-colors group-hover:bg-accent-primary group-hover:text-white'>
                                <Icon name='lucide:file-text' height={20} width={20} />
                              </div>
                              <div className='flex min-w-0 flex-col gap-0.5 text-left'>
                                <h3 className='truncate text-sm font-bold text-gray-13 group-hover:text-accent-primary transition-colors'>
                                  {form._json?.settings?.general?.name || form.name || 'Untitled Form'}
                                </h3>
                                <div className='flex items-center gap-2 text-[11px] text-gray-5'>
                                  <span className='line-clamp-1 max-w-[400px]'>
                                    {form._json?.settings?.general?.description || form.description || 'No description provided.'}
                                  </span>
                                  <span className='h-1 w-1 rounded-full bg-gray-3' />
                                  <div className='flex items-center gap-1 shrink-0'>
                                    <Icon name='lucide:calendar' height={10} width={10} />
                                    <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className='flex shrink-0 items-center gap-3'>
                              <FormTypeBadge type={form._json?.settings?.general?.type || form.type} />
                              <FormStatusBadge status={form._json?.settings?.publish?.publishOption || form.publishOption} />
                              <div className='pl-2 text-gray-3 transition-transform group-hover:translate-x-1 group-hover:text-accent-primary'>
                                <Icon name='tabler:chevron-right' className='size-5' />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        className='mt-4'
        itemLabel='Forms'
        page={page}
        pageSize={pageSize}
        showPageNumbers={false}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}

GridView.displayName = 'GridView'
export default GridView
