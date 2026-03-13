import { type Table as TanstackTable } from '@tanstack/react-table'
// ✅ Motion
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { RowSize } from '@/components/base/data-table/types'
import TableActionBar, {
  type TableActionButton,
} from '@/components/base/data-table/TableActionBar'
// import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
// import RequestSummary from './RequestSummary'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import { generateDummySummary } from '@/pages/requests/utils/dummyData'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import SummaryMetric from './SummaryMetric'

const GridRowSkeleton = ({ index }: { index: number }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      aria-busy='true'
      className='relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border border-[var(--gray-3)] bg-white p-4'
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* shimmer */}
      {!prefersReducedMotion && (
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
      )}

      {/* Left */}
      <div className='flex min-w-0 items-center gap-4'>
        {/* Icon */}
        <div className='size-12 rounded-lg bg-[var(--gray-3)]/80' />

        {/* Text */}
        <div className='flex min-w-0 flex-col gap-2'>
          <div className='h-4 w-44 rounded bg-[var(--gray-3)]/80' />
          <div className='h-3 w-32 rounded bg-[var(--gray-3)]/60' />
        </div>
      </div>

      {/* Right */}
      <div className='hidden shrink-0 items-center gap-8 md:flex'>
        {/* Status */}
        <div className='h-8 w-24 rounded-full bg-[var(--gray-3)]/70' />
      </div>
    </motion.div>
  )
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariantSet = () => ({
  exit: { opacity: 0, scale: 0.95 },
  hidden: { opacity: 0, y: 10 },
  rowHover: { backgroundColor: 'var(--gray-1)', scale: 1.005 },
  show: { opacity: 1, y: 0 },
})

interface GridViewProps<TData> {
  data: any[]
  isLoading: boolean
  table: TanstackTable<TData>
  actions?: TableActionButton[]
  hideGrouping?: boolean
  isReloading?: boolean
  rowSize?: RowSize
  onReload?: () => void
  onRowClick: (item: any, tab: string) => void
  onRowSizeChange?: (rowSize: RowSize) => void
}

const GridView = <TData,>({
  actions = [],
  data,
  hideGrouping = false,
  isLoading,
  isReloading = false,
  rowSize = 'default',
  table,
  onReload = () => {},
  onRowClick,
  onRowSizeChange = () => {},
}: GridViewProps<TData>) => {
  const prefersReducedMotion = useReducedMotion()
  const [selectedFile, setSelectedFile] = useState<any>(null)

  const toggleGroup = (groupId: string | number) => {
    const row = table.getRow(String(groupId))
    if (row) {
      row.toggleExpanded()
    }
  }

  // Pre-calculate all items across all groups for easy indexing if needed,
  // though we'll iterate by group for rendering.
  const allItems = useMemo(() => {
    const items: any[] = []
    data.forEach((group: any) => {
      if (Array.isArray(group.items)) {
        items.push(...group.items)
      }
    })
    return items
  }, [data])

  // Generate dummy summary data for all items
  const dummySummaryMap = useMemo(() => {
    const map = new Map()
    allItems.forEach((row: any, index: number) => {
      const rowId = row?.id || row?.processId || index
      map.set(rowId, generateDummySummary(rowId))
    })
    return map
  }, [allItems])

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3 p-2'>
        {[1, 2, 3].map((i) => (
          <GridRowSkeleton index={i} key={i} />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-3'>
        <div className='px-2 pt-1'>
          <TableActionBar
            actions={actions}
            className='!mb-1'
            hideGrouping={hideGrouping}
            hideTableActions={true}
            isReloading={isReloading}
            rowSize={rowSize}
            table={table}
            onReload={onReload}
            onRowSizeChange={onRowSizeChange}
          />
        </div>

        {allItems.length === 0 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className='flex flex-col items-center justify-center p-12'
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          >
            <div className='flex size-16 items-center justify-center rounded-full bg-[var(--gray-2)]'>
              <Icon
                className='size-8 text-[var(--gray-8)]'
                name='tabler:inbox'
              />
            </div>
            <p className='mt-4 font-medium text-[var(--gray-11)]'>
              No requests found
            </p>
          </motion.div>
        ) : (
          <div className='flex flex-col gap-2 px-2 pb-6'>
            {data.map((group: any, gIdx: number) => {
              const hasHeader = group.groupValue && group.groupId !== 'root'
              const groupItems = group.items || []
              const groupId = group.groupId || gIdx

              let row = null
              let isCollapsed = false
              let groupError = false

              if (groupId !== 'root') {
                try {
                  row = table.getRow(String(groupId))
                  isCollapsed = row ? !row.getIsExpanded() : false
                } catch (e) {
                  console.warn(
                    'GridView: failed to get row for group',
                    groupId,
                    e,
                  )
                  groupError = true
                }
              }

              if (groupItems.length === 0) return null

              if (groupError) {
                return (
                  <div className='flex flex-col gap-3 pb-6' key={groupId}>
                    {groupItems.map((row: any, index: number) => {
                      const rowId =
                        row?.id || row?.processId || `item-${gIdx}-${index}`
                      const requestNo = row?.requestNo || `REQ-${rowId}`
                      const raisedBy = row?.raisedBy || 'Unknown User'
                      const raisedAt =
                        row?.raisedAt || row?.transaction_createdAt
                      const dummySummary =
                        dummySummaryMap.get(rowId) ||
                        generateDummySummary(rowId)

                      return (
                        <div
                          className='group relative flex w-full flex-col rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] transition-all duration-200 hover:border-[var(--primary-3)]'
                          key={rowId}
                        >
                          <div
                            className='flex cursor-pointer items-center justify-between gap-4 p-3'
                            onClick={() => onRowClick(row, 'Overview')}
                          >
                            <div className='flex min-w-0 items-center gap-4'>
                              <div className='flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-3)] bg-[var(--primary-2)] text-[var(--primary-9)]'>
                                <Icon
                                  className='size-6'
                                  name='tabler:file-invoice'
                                />
                              </div>
                              <div className='flex min-w-0 flex-col gap-1'>
                                <div className='flex items-center gap-2'>
                                  <h3 className='truncate text-14 font-semibold text-[var(--gray-13)]'>
                                    {requestNo}
                                  </h3>
                                  {row?.isDuplicateInvoice && (
                                    <RequestStatusBadge status='Duplicated' />
                                  )}
                                </div>
                                <div className='flex items-center gap-2 truncate text-12 text-[var(--gray-10)]'>
                                  <span className='max-w-[200px] truncate'>
                                    {raisedBy}
                                  </span>
                                  <span className='h-1 w-1 shrink-0 rounded-full bg-[var(--gray-6)]' />
                                  <span className='shrink-0'>
                                    {formatDatetime(raisedAt, 'datetime')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className='flex shrink-0 items-center gap-4'>
                              <div className='hidden items-center gap-3 lg:flex'>
                                {Object.entries(dummySummary).map(
                                  ([key, metric]: any) => (
                                    <SummaryMetric
                                      key={key}
                                      metric={metric}
                                      onFileSelect={(file) =>
                                        setSelectedFile(file)
                                      }
                                    />
                                  ),
                                )}
                              </div>
                              <div className='pr-2 text-[var(--gray-8)] transition-colors group-hover:text-[var(--primary-9)]'>
                                <Icon
                                  className='size-5'
                                  name='tabler:chevron-right'
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              return (
                <div
                  className='relative flex !cursor-pointer flex-col gap-4 hover:z-[100]'
                  key={groupId}
                >
                  {hasHeader && (
                    <motion.div
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className='group/header sticky top-0 z-20 -mx-2 flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--gray-3)] bg-[var(--surface)] px-3 py-3'
                      initial={{ opacity: 0, scale: 0.98, y: -20 }}
                      layout
                      transition={{
                        damping: 25,
                        duration: 0.4,
                        stiffness: 300,
                        type: 'spring',
                      }}
                      onClick={() => toggleGroup(groupId)}
                    >
                      {/* Left Side: Icon + Title */}
                      <div className='flex items-center gap-3'>
                        <div className='rounded-lg bg-[var(--primary-2)] p-2'>
                          <Icon
                            className='size-5 text-[var(--primary-9)]'
                            name='tabler:folder-open'
                          />
                        </div>
                        <div>
                          <h2 className='text-14 leading-tight font-bold text-[var(--gray-13)]'>
                            {group.groupValue}
                          </h2>
                        </div>
                      </div>

                      {/* Right Side: Stats + Chevron */}
                      <div className='flex items-center gap-4'>
                        {/* Stats Pills (Hidden on mobile) */}
                        <motion.div
                          animate={{ opacity: 1, x: 0 }}
                          className='hidden items-center gap-3 rounded-full border border-[var(--gray-3)] bg-[var(--surface-raised)] px-3 py-1 shadow-sm transition-shadow hover:shadow-md md:flex 2xl:gap-6 2xl:px-5 2xl:py-1.5'
                          initial={{ opacity: 0, x: 20 }}
                          transition={{ delay: 0.1, duration: 0.4 }}
                        >
                          <div className='flex items-baseline gap-2'>
                            <span className='text-[10px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                              Invoice Received
                            </span>
                            <span className='text-xs font-bold text-[var(--gray-12)] 2xl:text-14'>
                              {groupItems.length}
                            </span>
                          </div>
                          <div className='h-3 w-px bg-[var(--gray-3)]'></div>

                          {/* Duplicate Alert */}
                          <div className='-my-1 flex items-center gap-2 rounded-lg px-2 py-0.5 2xl:px-3'>
                            <span className='text-[10px] font-bold text-[var(--red-9)] uppercase 2xl:inline'>
                              Duplicates :{' '}
                              {
                                groupItems.filter(
                                  (i: any) => i.isDuplicateInvoice,
                                ).length
                              }
                            </span>
                            <div className='flex hidden items-center gap-1'>
                              <Icon
                                className='size-3.5 text-[var(--red-9)]'
                                name='tabler:alert-triangle'
                              />
                              <span className='text-xs font-bold text-[var(--red-9)] 2xl:text-14'>
                                $1,200.00
                              </span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Expand Button */}
                        <button className='rounded-full bg-transparent p-2 text-[var(--gray-10)] transition-colors hover:bg-[var(--primary-2)] hover:text-[var(--primary-9)]'>
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
                        id={`group-container-${groupId}`}
                        initial={{ height: 0, opacity: 0 }}
                        key='items-container'
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        onAnimationComplete={() => {
                          const el = document.getElementById(
                            `group-container-${groupId}`,
                          )
                          if (el) el.style.overflow = 'visible'
                        }}
                      >
                        <motion.div
                          animate='show'
                          className='flex flex-col gap-3 pt-1 pb-6'
                          initial='hidden'
                          variants={listVariants as any}
                        >
                          {groupItems.map((row: any, index: number) => {
                            const rowId =
                              row?.id ||
                              row?.processId ||
                              `item-${gIdx}-${index}`
                            const requestNo = row?.requestNo || `REQ-${rowId}`
                            const raisedBy = row?.raisedBy || 'Unknown User'
                            const raisedAt =
                              row?.raisedAt || row?.transaction_createdAt
                            const dummySummary =
                              dummySummaryMap.get(rowId) ||
                              generateDummySummary(rowId)
                            const variants = itemVariantSet()

                            return (
                              <motion.div
                                exit='exit'
                                key={rowId}
                                variants={variants as any}
                                whileHover='rowHover'
                                layout
                                className={cn(
                                  'group relative z-0 flex w-full flex-col rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] transition-all duration-200 hover:z-[70] hover:border-[var(--primary-3)]',
                                )}
                                transition={
                                  prefersReducedMotion
                                    ? { duration: 0 }
                                    : {
                                        damping: 25,
                                        stiffness: 400,
                                        type: 'spring',
                                      }
                                }
                              >
                                {/* Header (Click to view details) */}
                                <div
                                  className='flex cursor-pointer items-center justify-between gap-4 p-3'
                                  onClick={() => onRowClick(row, 'Overview')}
                                >
                                  <div className='flex min-w-0 items-center gap-4'>
                                    <motion.div
                                      className='flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-3)] bg-[var(--primary-2)] text-[var(--primary-9)]'
                                      transition={
                                        prefersReducedMotion
                                          ? { duration: 0 }
                                          : {
                                              damping: 26,
                                              stiffness: 520,
                                              type: 'spring',
                                            }
                                      }
                                      whileHover={
                                        prefersReducedMotion
                                          ? undefined
                                          : { rotate: -2, scale: 1.02 }
                                      }
                                    >
                                      <Icon
                                        className='size-6'
                                        name='tabler:file-invoice'
                                      />
                                    </motion.div>

                                    <div className='flex min-w-0 flex-col gap-1'>
                                      <div className='flex items-center gap-2'>
                                        <h3 className='truncate text-14 font-semibold text-[var(--gray-13)]'>
                                          {requestNo}
                                        </h3>
                                        {row?.isDuplicateInvoice && (
                                          <RequestStatusBadge status='Duplicated' />
                                        )}
                                      </div>
                                      <div className='flex items-center gap-2 truncate text-12 text-[var(--gray-10)]'>
                                        <span className='max-w-[200px] truncate'>
                                          {raisedBy}
                                        </span>
                                        <span className='h-1 w-1 shrink-0 rounded-full bg-[var(--gray-6)]' />
                                        <span className='shrink-0'>
                                          {formatDatetime(raisedAt, 'datetime')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className='flex shrink-0 items-center gap-4'>
                                    {/* Summary Icons with Hover Cards */}
                                    <div className='hidden items-center gap-3 lg:flex'>
                                      {Object.entries(dummySummary).map(
                                        ([key, metric]: any) => (
                                          <SummaryMetric
                                            key={key}
                                            metric={metric}
                                            onFileSelect={(file) =>
                                              setSelectedFile(file)
                                            }
                                          />
                                        ),
                                      )}
                                    </div>

                                    {/* Row Navigation Chevron */}
                                    <motion.div
                                      className='pr-2 text-[var(--gray-8)] transition-colors group-hover:text-[var(--primary-9)]'
                                      variants={{
                                        rowHover: { x: 8 },
                                      }}
                                    >
                                      <Icon
                                        className='size-5'
                                        name='tabler:chevron-right'
                                      />
                                    </motion.div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* File Preview Sheet */}
      <FileSheet
        file={selectedFile}
        fullScreen={true}
        opened={!!selectedFile}
        tenantId='dummy'
        userId='dummy'
        onClose={() => setSelectedFile(null)}
      />
    </>
  )
}

GridView.displayName = 'GridView'
export default GridView
