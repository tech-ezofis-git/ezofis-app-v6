import { useMemo } from 'react'
import { generateDummySummary } from '@/pages/requests/utils/dummyData'
// import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
import { formatDatetime } from '@/utils/dayjs'
import cn from '@/utils/cn'
import SummaryMetric from './SummaryMetric'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import { type Table as TanstackTable } from '@tanstack/react-table'
import TableActionBar, { type TableActionButton } from '@/components/base/data-table/TableActionBar'
import type { RowSize } from '@/components/base/data-table/types'
// import RequestSummary from './RequestSummary'

// ✅ Motion
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const GridRowSkeleton = ({ index }: { index: number }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--gray-3)] bg-white p-4 overflow-hidden"
      aria-busy="true"
    >
      {/* shimmer */}
      {!prefersReducedMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)]"
          style={{ mixBlendMode: 'overlay' }}
          animate={{ x: ['-60%', '160%'] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: [0, 0, 1, 1],
            delay: index * 0.1,
          }}
        />
      )}

      {/* Left */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Icon */}
        <div className="size-12 rounded-lg bg-[var(--gray-3)]/80" />

        {/* Text */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="h-4 w-44 rounded bg-[var(--gray-3)]/80" />
          <div className="h-3 w-32 rounded bg-[var(--gray-3)]/60" />
        </div>
      </div>

      {/* Right */}
      <div className="hidden md:flex items-center gap-8 shrink-0">
        {/* Status */}
        <div className="h-8 w-24 rounded-full bg-[var(--gray-3)]/70" />
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

  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
  rowHover: { scale: 1.005, backgroundColor: 'var(--gray-1)' },
})



interface GridViewProps<TData> {
  data: any[]
  isLoading: boolean
  onRowClick: (item: any, tab: string) => void
  actions?: TableActionButton[]
  table: TanstackTable<TData>
  isReloading?: boolean
  onReload?: () => void
  rowSize?: RowSize
  onRowSizeChange?: (rowSize: RowSize) => void
  hideGrouping?: boolean
}

const GridView = <TData,>({
  data,
  isLoading,
  onRowClick,
  actions = [],
  table,
  isReloading = false,
  onReload = () => { },
  rowSize = 'default',
  onRowSizeChange = () => { },
  hideGrouping = false,
}: GridViewProps<TData>) => {
  const prefersReducedMotion = useReducedMotion()
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
      <div className="flex flex-col gap-3 p-2">
        {[1, 2, 3].map((i) => (
          <GridRowSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="px-2 pt-1">
        <TableActionBar
          table={table}
          actions={actions}
          isReloading={isReloading}
          onReload={onReload}
          rowSize={rowSize}
          onRowSizeChange={onRowSizeChange}
          hideTableActions={true}
          hideGrouping={hideGrouping}
          className="!mb-1"
        />
      </div>

      {allItems.length === 0 ? (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-[var(--gray-2)]">
            <Icon name="tabler:inbox" className="size-8 text-[var(--gray-8)]" />
          </div>
          <p className="mt-4 text-[var(--gray-11)] font-medium">No requests found</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-8 px-2 pb-6">
          {data.map((group: any, gIdx: number) => {
            const hasHeader = group.groupValue && group.groupId !== 'root'
            const groupItems = group.items || []
            const groupId = group.groupId || gIdx
            const row = groupId === 'root' ? null : table.getRow(String(groupId))
            const isCollapsed = row ? !row.getIsExpanded() : false

            if (groupItems.length === 0) return null

            return (
              <div key={groupId} className="flex flex-col !cursor-pointer gap-4 relative hover:z-[100]">
                {hasHeader && (
                  <div
                    onClick={() => toggleGroup(groupId)}
                    className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-primary/95 backdrop-blur-sm border-b border-[var(--gray-3)] flex items-center justify-between cursor-pointer group/header"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-3)] text-[var(--primary-9)] transition-transform group-hover/header:scale-105">
                        <Icon name="tabler:folders" className="size-5" />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-[var(--gray-13)] tracking-tight">
                          {group.groupValue}
                        </h2>
                        <span className="text-10 text-[var(--gray-10)] uppercase font-semibold">
                          {group.groupCount || groupItems.length} Requests
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon
                        name="tabler:chevron-down"
                        className={cn(
                          "size-5 text-[var(--gray-8)] transition-transform duration-300",
                          isCollapsed ? "-rotate-90" : "rotate-0"
                        )}
                      />
                    </div>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      key="items-container"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                      onAnimationComplete={() => {
                        const el = document.getElementById(`group-container-${groupId}`);
                        if (el) el.style.overflow = 'visible';
                      }}
                      id={`group-container-${groupId}`}
                    >
                      <motion.div
                        variants={listVariants as any}
                        initial="hidden"
                        animate="show"
                        className="flex flex-col gap-3 pt-1"
                      >
                        {groupItems.map((row: any, index: number) => {
                          const rowId = row?.id || row?.processId || `item-${gIdx}-${index}`
                          const requestNo = row?.requestNo || `REQ-${rowId}`
                          const raisedBy = row?.raisedBy || 'Unknown User'
                          const raisedAt = row?.raisedAt || row?.transaction_createdAt
                          const dummySummary = dummySummaryMap.get(rowId) || generateDummySummary(rowId)
                          const variants = itemVariantSet()

                          return (
                            <motion.div
                              key={rowId}
                              layout
                              variants={variants as any}
                              exit="exit"
                              whileHover="rowHover"
                              transition={
                                prefersReducedMotion
                                  ? { duration: 0 }
                                  : { type: 'spring', stiffness: 400, damping: 25 }
                              }
                              className={cn(
                                'group relative flex w-full flex-col rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] transition-all duration-200 hover:border-[var(--primary-3)] z-0 hover:z-[70]'
                              )}
                            >
                              {/* Header (Click to view details) */}
                              <div
                                onClick={() => onRowClick(row, 'Overview')}
                                className="flex cursor-pointer items-center justify-between gap-4 p-3"
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <motion.div
                                    whileHover={
                                      prefersReducedMotion ? undefined : { rotate: -2, scale: 1.02 }
                                    }
                                    transition={
                                      prefersReducedMotion
                                        ? { duration: 0 }
                                        : { type: 'spring', stiffness: 520, damping: 26 }
                                    }
                                    className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-3)] bg-[var(--primary-2)] text-[var(--primary-9)]"
                                  >
                                    <Icon name="tabler:file-invoice" className="size-6" />
                                  </motion.div>

                                  <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="truncate text-15 font-semibold text-[var(--gray-13)]">
                                        {requestNo}
                                      </h3>
                                      {row?.isDuplicateInvoice && <RequestStatusBadge status="Duplicated" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-12 text-[var(--gray-10)] truncate">
                                      <span className="truncate max-w-[200px]">{raisedBy}</span>
                                      <span className="h-1 w-1 rounded-full bg-[var(--gray-6)] shrink-0" />
                                      <span className="shrink-0">{formatDatetime(raisedAt, 'datetime')}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                  {/* Summary Icons with Hover Cards */}
                                  <div className="hidden lg:flex items-center gap-3">
                                    {Object.entries(dummySummary).map(([key, metric]: any) => (
                                      <SummaryMetric key={key} metric={metric} />
                                    ))}
                                  </div>

                                  {/* Row Navigation Chevron */}
                                  <motion.div
                                    className="text-[var(--gray-8)] group-hover:text-[var(--primary-9)] transition-colors pr-2"
                                    variants={{
                                      rowHover: { x: 8 }
                                    }}
                                  >
                                    <Icon name="tabler:chevron-right" className="size-5" />
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
  )
}

GridView.displayName = 'GridView'
export default GridView