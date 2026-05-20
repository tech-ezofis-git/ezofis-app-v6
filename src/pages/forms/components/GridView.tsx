import { useNavigate } from '@tanstack/react-router'
import { type Table as TanstackTable } from '@tanstack/react-table'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { RowSize } from '@/components/base/data-table/types'
import TableActionBar from '@/components/base/data-table/TableActionBar'
import Icon from '@/components/base/icon/Icon'
import Pagination from '@/components/base/pagination/Pagination'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import FormTypeBadge from '@/components/common/FormTypeBadge'
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
    className='relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] p-4'
    initial={{ opacity: 0, y: 10 }}
    transition={{ delay: index * 0.05 }}
  >
    {/* shimmer */}
    <motion.div
      animate={{ x: ['-60%', '160%'] }}
      className='pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)]'
      style={{ mixBlendMode: 'overlay' }}
      transition={{
        delay: index * 0.1,
        duration: 1.2,
        ease: [0, 0, 1, 1],
        repeat: Infinity,
      }}
    />

    <div className='flex min-w-0 items-center gap-4'>
      <div className='size-12 rounded-lg bg-[var(--gray-3)]/80' />
      <div className='flex min-w-0 flex-col gap-2'>
        <div className='h-4 w-44 rounded bg-[var(--gray-3)]/80' />
        <div className='h-3 w-32 rounded bg-[var(--gray-3)]/60' />
      </div>
    </div>

    <div className='hidden shrink-0 items-center gap-3 md:flex'>
      <div className='h-7 w-20 rounded-full bg-[var(--gray-3)]/70' />
      <div className='h-7 w-24 rounded-full bg-[var(--gray-3)]/70' />
      <div className='w-5' />
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

  return (
    <div className='flex h-full flex-col px-2 py-1'>
      <div className='min-h-0 flex-1 overflow-hidden'>
        <TableActionBar
          isReloading={isLoading || isRefetching}
          rowSize={rowSize}
          table={table}
          onReload={onReload}
          onRowSizeChange={setRowSize}
        />

        {isLoading ? (
          <div className='flex flex-col gap-3 pt-3 pb-6'>
            {[1, 2, 3, 4, 5].map((i) => (
              <GridRowSkeleton index={i} key={i} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='mb-4 flex size-16 items-center justify-center rounded-full bg-gray-1 text-gray-4'>
              <Icon height={32} name='lucide:form-input' width={32} />
            </div>
            <h3 className='text-lg font-bold text-gray-13'>No forms yet</h3>
            <p className='text-sm text-gray-5'>
              Create your first form to get started.
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {rows.map((groupRow: any) => {
              if (groupRow.depth > 0) return null
              const group = groupRow.original
              const subRows = group.subRows || []
              const groupValue = group.groupValue || 'Untitled Group'
              const isDefaultGroup = group.groupId === 'all'
              const isCollapsed = !groupRow.getIsExpanded()

              return (
                <div
                  className='flex flex-col'
                  key={group.groupId || groupValue}
                >
                  {!isDefaultGroup && (
                    <motion.div
                      className='group/header sticky top-0 z-20 -mx-2 flex cursor-pointer items-center justify-between gap-4 border-b border-gray-2 bg-white px-3 py-3'
                      onClick={() => toggleGroup(groupRow.id)}
                    >
                      <div className='flex items-center gap-3'>
                        <div className='rounded-lg bg-accent-soft p-1.5'>
                          <Icon
                            className='size-5 text-accent-primary'
                            name='tabler:stack-2'
                          />
                        </div>
                        <h2 className='text-sm font-bold tracking-wider text-gray-13 uppercase'>
                          {groupValue}{' '}
                          <span className='ml-1 text-xs font-medium text-gray-5'>
                            ({group.groupCount})
                          </span>
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
                              className='group relative flex w-full items-center justify-between gap-4 rounded-xl border border-gray-2 bg-white p-3 transition-all hover:border-accent-primary hover:shadow-md'
                              key={form.id}
                              whileHover={{ scale: 1.002, x: 4 }}
                              onClick={() =>
                                navigate({
                                  params: { formId: form.uid || form.id },
                                  to: '/form-builder/$formId',
                                })
                              }
                            >
                              <div className='flex min-w-0 items-center gap-4'>
                                <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent-soft bg-accent-soft/30 text-accent-primary transition-colors group-hover:bg-accent-primary group-hover:text-white'>
                                  <Icon
                                    height={20}
                                    name='lucide:file-text'
                                    width={20}
                                  />
                                </div>
                                <div className='flex min-w-0 flex-col gap-0.5 text-left'>
                                  <h3 className='truncate text-sm font-bold text-gray-13 transition-colors group-hover:text-accent-primary'>
                                    {form._json?.settings?.general?.name ||
                                      form.name ||
                                      'Untitled Form'}
                                  </h3>
                                  <div className='flex items-center gap-2 text-[11px] text-gray-5'>
                                    <span className='line-clamp-1 max-w-[400px]'>
                                      {form._json?.settings?.general
                                        ?.description ||
                                        form.description ||
                                        'No description provided.'}
                                    </span>
                                    <span className='h-1 w-1 rounded-full bg-gray-3' />
                                    <div className='flex shrink-0 items-center gap-1'>
                                      <Icon
                                        height={10}
                                        name='lucide:calendar'
                                        width={10}
                                      />
                                      <span>
                                        {new Date(
                                          form.createdAt,
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className='flex shrink-0 items-center gap-3'>
                                <FormTypeBadge
                                  type={
                                    form._json?.settings?.general?.type ||
                                    form.type
                                  }
                                />
                                <FormStatusBadge
                                  status={
                                    form._json?.settings?.publish
                                      ?.publishOption || form.publishOption
                                  }
                                />
                                <div className='pl-2 text-gray-3 transition-transform group-hover:translate-x-1 group-hover:text-accent-primary'>
                                  <Icon
                                    className='size-5'
                                    name='tabler:chevron-right'
                                  />
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
      </div>

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
