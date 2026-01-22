import { useMemo, useState } from 'react'
import { generateDummySummary } from '@/pages/requests/utils/dummyData'
import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
import { formatDatetime } from '@/utils/dayjs'
import cn from '@/utils/cn'
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
}: GridViewProps<TData>) => {
  const prefersReducedMotion = useReducedMotion()
  // const [expandedId, setExpandedId] = useState<string | number | null>(null)

  const flatRows = useMemo(() => {
    const out: any[] = []
    const walk = (node: any) => {
      if (!node) return
      if (Array.isArray(node.items)) out.push(...node.items)
      if (Array.isArray(node.value)) out.push(...node.value)
      if (Array.isArray(node.rows)) out.push(...node.rows)
      if (Array.isArray(node.children)) node.children.forEach(walk)
      if (Array.isArray(node.groups)) node.groups.forEach(walk)
    }
      ; (data || []).forEach(walk)
    return out
  }, [data])

  const getStatusConfig = (stage: string) => {
    const s = stage?.toUpperCase() || ''
    if (s === 'APPROVED' || s === 'COMPLETED') {
      return {
        bg: 'bg-[var(--green-2)]',
        text: 'text-[var(--green-11)]',
        border: 'border-[var(--green-4)]',
        icon: 'tabler:circle-check-filled',
      }
    }
    if (s === 'REJECTED') {
      return {
        bg: 'bg-[var(--red-2)]',
        text: 'text-[var(--red-11)]',
        border: 'border-[var(--red-4)]',
        icon: 'tabler:circle-x-filled',
      }
    }
    return {
      bg: 'bg-[var(--primary-2)]',
      text: 'text-[var(--primary-11)]',
      border: 'border-[var(--primary-4)]',
      icon: 'tabler:clock-filled',
    }
  }

  // const handleToggle = (id: string | number) => {
  //   setExpandedId((prev) => (prev === id ? null : id))
  // }

  // ✅ List-level choreography (stagger)
  const listVariants = {
    hidden: {},
    show: {
      transition: prefersReducedMotion
        ? {}
        : {
          staggerChildren: 0.06,
          delayChildren: 0.02,
        },
    },
  }

  /**
   * ✅ Different animation per item:
   */
  // ✅ Use row hover state for the arrow animation
  const itemVariantSet = (i: number) => {
    const k = i % 4
    const baseTransition = prefersReducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 520, damping: 36, mass: 0.7 }

    const hoverState = {
      y: -4,
      transition: { type: 'spring', stiffness: 400, damping: 25 }
    }

    const variants: any = {
      rowHover: hoverState
    }

    // 0) subtle rise
    if (k === 0) {
      return { ...variants, hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: baseTransition } }
    }
    // 1) slight scale-in
    if (k === 1) {
      return { ...variants, hidden: { opacity: 0, scale: 0.985 }, show: { opacity: 1, scale: 1, transition: baseTransition } }
    }
    // 2) left slide
    if (k === 2) {
      return { ...variants, hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: baseTransition } }
    }
    // 3) rotate micro + rise
    return { ...variants, hidden: { opacity: 0, y: 10, rotate: -0.25 }, show: { opacity: 1, y: 0, rotate: 0, transition: baseTransition } }
  }

  // Generate all dummy summary data upfront (outside the render loop to follow Rules of Hooks)
  const dummySummaryMap = useMemo(() => {
    const map = new Map()
    flatRows.forEach((row: any, index: number) => {
      const rowId = row?.id || index
      map.set(rowId, generateDummySummary(rowId))
    })
    return map
  }, [flatRows])

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
          className='!mb-1'
        />
      </div>

      {flatRows.length === 0 ? (
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
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 px-2"
        >
          <AnimatePresence initial={false}>
            {flatRows.map((row: any, index: number) => {
              const rowId = row?.id || index
              // const isExpanded = expandedId === rowId

              const requestNo = row?.requestNo || `REQ-${rowId}`
              const raisedBy = row?.raisedBy || 'Unknown User'
              const raisedAt = row?.raisedAt || row?.transaction_createdAt
              const stage = row?.stage || 'Pending'
              // const fieldCount = row?.formData?.fields ? Object.keys(row.formData.fields).length : 0
              const statusConfig = getStatusConfig(stage)

              // Get dummy summary data from the map
              const dummySummary = dummySummaryMap.get(rowId) || generateDummySummary(rowId)

              const variants = itemVariantSet(index)

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
                    'group relative flex w-full flex-col rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] transition-all duration-200 hover:border-[var(--primary-3)] z-0 hover:z-10'
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
                          <div key={key} className="relative group/icon">
                            {/* Data Badge Trigger */}
                            {/* Data Badge Trigger */}
                            <motion.div
                              whileHover={{ scale: 1.05, y: -1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              <SummaryBadge
                                label={metric.badgeText}
                                icon={metric.icon}
                                theme={metric.theme}
                                variant="outline"
                                className="cursor-default w-[160px]"
                              />
                            </motion.div>

                            {/* Hover Card */}
                            <AnimatePresence>
                              <div className="absolute bottom-full right-0 mb-3 opacity-0 invisible group-hover/icon:opacity-100 group-hover/icon:visible transition-all duration-300 z-50 pointer-events-none translate-y-2 group-hover/icon:translate-y-0">
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                  className="bg-white rounded-xl border border-[var(--gray-3)] shadow-xl p-4 min-w-[260px] overflow-hidden relative"
                                >
                                  {/* Background decoration */}
                                  <div className={cn(
                                    "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -mr-16 -mt-16 pointer-events-none",
                                    metric.theme === 'green' ? 'bg-[var(--green-9)]' :
                                      metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
                                        metric.theme === 'red' ? 'bg-[var(--red-9)]' :
                                          'bg-[var(--blue-9)]'
                                  )} />

                                  <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)]' :
                                          metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)]' :
                                            metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)]' :
                                              'bg-[var(--blue-2)] text-[var(--blue-11)]'
                                      )}>
                                        <Icon name={metric.icon} className="size-5" />
                                      </div>
                                      <div className="font-semibold text-[var(--gray-12)] text-13">
                                        {metric.label}
                                      </div>
                                    </div>
                                    <div className={cn(
                                      "px-2 py-0.5 rounded-full text-11 font-medium border",
                                      metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)] border-[var(--green-4)]' :
                                        metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)] border-[var(--orange-4)]' :
                                          metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)] border-[var(--red-4)]' :
                                            'bg-[var(--blue-2)] text-[var(--blue-11)] border-[var(--blue-4)]'
                                    )}>
                                      {metric.status}
                                    </div>
                                  </div>

                                  <div className="mb-4 relative z-10">
                                    <h4 className="text-24 font-bold text-[var(--gray-12)] tracking-tight">
                                      {metric.value}
                                    </h4>
                                  </div>

                                  <div className="flex items-end justify-between relative z-10">
                                    <div className="flex flex-col gap-1.5 flex-1 mr-4">
                                      <div className="flex items-center gap-1.5 text-[var(--gray-10)]">
                                        <span className="text-12 font-medium">{metric.description}</span>
                                        {metric.theme === 'red' && <Icon name="tabler:exclamation-circle" className="size-4 text-[var(--red-9)]" />}
                                      </div>
                                      <div className="h-1.5 w-full bg-[var(--gray-3)] rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${metric.pct}%` }}
                                          transition={{ duration: 0.5, delay: 0.1 }}
                                          className={cn(
                                            'h-full rounded-full',
                                            metric.theme === 'green' ? 'bg-[var(--green-9)]' :
                                              metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
                                                metric.theme === 'red' ? 'bg-[var(--red-9)]' :
                                                  'bg-[var(--blue-9)]'
                                          )}
                                        />
                                      </div>
                                    </div>

                                    {/* Animated Arrow */}
                                    <motion.div
                                      whileHover={{ x: 3 }}
                                      className="flex items-center justify-center p-1.5 rounded-full bg-[var(--gray-2)] text-[var(--gray-10)]"
                                    >
                                      <Icon name="tabler:chevron-right" className="size-4" />
                                    </motion.div>
                                  </div>
                                </motion.div>
                              </div>
                            </AnimatePresence>
                          </div>
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
          </AnimatePresence>
        </motion.div >
      )}
    </div >
  )
}

GridView.displayName = 'GridView'
export default GridView