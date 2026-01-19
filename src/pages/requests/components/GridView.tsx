import React, { useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { formatDatetime } from '@/utils/dayjs'
import cn from '@/utils/cn'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import { type Table as TanstackTable } from '@tanstack/react-table'
import TableActionBar, { type TableActionButton } from '@/components/base/data-table/TableActionBar'
import type { RowSize } from '@/components/base/data-table/types'
import RequestSummary from './RequestSummary'

// ✅ Motion
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

// --- Helper: Safe JSON Parse ---
const safeJsonParse = (value: any) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return null
  }
}

// --- Helper: Detect Data Types for Summary (Existing) ---
const getSummaryData = (fields: Record<string, any>) => {
  const tables: { key: string; data: any[] }[] = []
  const files: { key: string; data: any[] }[] = []

  Object.entries(fields || {}).forEach(([key, value]) => {
    const parsed = safeJsonParse(value)

    if (Array.isArray(parsed) && parsed.length > 0) {
      if (
        parsed[0].hasOwnProperty('fileName') ||
        parsed[0].hasOwnProperty('fileId') ||
        parsed[0].hasOwnProperty('size')
      ) {
        files.push({ key, data: parsed })
      } else if (typeof parsed[0] === 'object') {
        tables.push({ key, data: parsed })
      }
    }
  })

  return { tables, files }
}
const GridRowSkeleton = ({ index }: { index: number }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--gray-3)] bg-white p-4 shadow-sm overflow-hidden"
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
        {/* Fields */}
        <div className="flex flex-col items-end gap-1">
          <div className="h-2.5 w-14 rounded bg-[var(--gray-3)]/60" />
          <div className="h-4 w-6 rounded bg-[var(--gray-3)]/80" />
        </div>

        {/* Status */}
        <div className="h-8 w-24 rounded-full bg-[var(--gray-3)]/70" />

        {/* Chevron */}
        <div className="size-5 rounded bg-[var(--gray-3)]/60" />
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
  const [expandedId, setExpandedId] = useState<string | number | null>(null)

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

  const handleToggle = (id: string | number) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

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
   * - We pick a variant set based on the index modulo N.
   * - This creates differentiated motion while still feeling cohesive.
   */
  const itemVariantSet = (i: number) => {
    const k = i % 4

    const baseTransition = prefersReducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 520, damping: 36, mass: 0.7 }

    // 0) subtle rise
    if (k === 0) {
      return {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: baseTransition },
        exit: { opacity: 0, y: 8, transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.16 } },
      }
    }

    // 1) slight scale-in
    if (k === 1) {
      return {
        hidden: { opacity: 0, scale: 0.985 },
        show: { opacity: 1, scale: 1, transition: baseTransition },
        exit: { opacity: 0, scale: 0.99, transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.16 } },
      }
    }

    // 2) left slide
    if (k === 2) {
      return {
        hidden: { opacity: 0, x: -10 },
        show: { opacity: 1, x: 0, transition: baseTransition },
        exit: { opacity: 0, x: -8, transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.16 } },
      }
    }

    // 3) rotate micro + rise
    return {
      hidden: { opacity: 0, y: 10, rotate: -0.25 },
      show: { opacity: 1, y: 0, rotate: 0, transition: baseTransition },
      exit: { opacity: 0, y: 8, rotate: 0.2, transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.16 } },
    }
  }

  // ✅ Expand/collapse animation (content reveal)
  const expandVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: {
      height: 'auto',
      opacity: 1,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
    },
  }

  // ✅ “Agent Intelligence” section animation (separate, adds polish)
  const sectionVariants = {
    hidden: { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' },
    },
  }

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
              const isExpanded = expandedId === rowId

              const requestNo = row?.requestNo || `REQ-${rowId}`
              const raisedBy = row?.raisedBy || 'Unknown User'
              const raisedAt = row?.raisedAt || row?.transaction_createdAt
              const stage = row?.stage || 'Pending'
              const fieldCount = row?.formData?.fields ? Object.keys(row.formData.fields).length : 0
              const statusConfig = getStatusConfig(stage)

              // computed but not used currently; keeping your existing logic
              // const _summary = isExpanded ? getSummaryData(row?.formData?.fields) : { tables: [], files: [] }

              const variants = itemVariantSet(index)

              return (
                <motion.div
                  key={rowId}
                  layout
                  variants={variants as any}
                  exit="exit"
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 520, damping: 38 }
                  }
                  className={cn(
                    'group relative flex w-full flex-col rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] shadow-sm transition-all duration-200',
                    isExpanded
                      ? 'border-[var(--primary-3)] ring-1 ring-[var(--primary-3)]'
                      : 'hover:border-[var(--primary-3)]'
                  )}
                >
                  {/* Header (Click to Toggle) */}
                  <div
                    onClick={() => handleToggle(rowId)}
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
                      <div className="hidden md:flex items-center gap-8">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--gray-9)]">
                            Fields
                          </span>
                          <span className="text-14 font-medium text-[var(--gray-12)]">
                            {fieldCount}
                          </span>
                        </div>

                        <motion.div
                          initial={false}
                          animate={
                            prefersReducedMotion
                              ? {}
                              : isExpanded
                                ? { scale: 1.02 }
                                : { scale: 1 }
                          }
                          transition={
                            prefersReducedMotion
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 520, damping: 34 }
                          }
                          className={cn(
                            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-12 font-semibold transition-colors',
                            statusConfig.bg,
                            statusConfig.text,
                            statusConfig.border
                          )}
                        >
                          <Icon name={statusConfig.icon} className="size-3.5" />
                          {stage}
                        </motion.div>
                      </div>

                      <motion.div
                        initial={false}
                        animate={
                          prefersReducedMotion
                            ? {}
                            : { rotate: isExpanded ? 90 : 0 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 520, damping: 34 }
                        }
                      >
                        <Icon
                          name="tabler:chevron-right"
                          className={cn(
                            'size-5 text-[var(--gray-8)] transition-colors',
                            isExpanded ? 'text-[var(--primary-9)]' : ''
                          )}
                        />
                      </motion.div>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`${rowId}-expanded`}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        variants={expandVariants as any}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col border-t border-[var(--gray-4)] bg-[var(--gray-1)]/50 p-4">
                          {/* 1. API Summary Component */}
                          {row.workflowId && row.processId && row.transactionId && (
                            <motion.div
                              variants={sectionVariants as any}
                              initial="hidden"
                              animate="show"
                              className="mb-4"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="mb-2 text-12 font-semibold uppercase tracking-wider text-[var(--gray-10)]">
                                  Agent Intelligence
                                </h4>
                              </div>

                              {/* subtle stagger inside summary container */}
                              <motion.div
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={
                                  prefersReducedMotion
                                    ? { duration: 0 }
                                    : { duration: 0.2, ease: 'easeOut' }
                                }
                              >
                                <RequestSummary
                                  workflowId={row.workflowId}
                                  processId={row.processId}
                                  transactionId={row.transactionId}
                                  requestNo={row.requestNo}
                                />
                              </motion.div>
                            </motion.div>
                          )}

                          {/* Action Footer */}
                          <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={
                              prefersReducedMotion
                                ? { duration: 0 }
                                : { delay: 0.05, duration: 0.2, ease: 'easeOut' }
                            }
                            className="flex justify-end pt-2 border-t border-[var(--gray-4)] mt-2"
                          >
                            <motion.button
                              whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onRowClick(row, 'Overview')
                              }}
                              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-9)] px-4 py-2 text-13 font-medium text-white shadow-sm transition-colors hover:bg-[var(--primary-10)]"
                            >
                              View Full Details
                              <Icon name="tabler:arrow-right" className="size-4" />
                            </motion.button>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

GridView.displayName = 'GridView'
export default GridView
