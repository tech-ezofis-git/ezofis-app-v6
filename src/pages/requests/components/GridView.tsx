import { useMemo, useState } from 'react'
// import { generateDummySummary } from '@/pages/requests/utils/dummyData'
// import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
import { formatDatetime } from '@/utils/dayjs'
import cn from '@/utils/cn'
// import SummaryMetric from './SummaryMetric'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import { type Table as TanstackTable } from '@tanstack/react-table'
import TableActionBar, { type TableActionButton } from '@/components/base/data-table/TableActionBar'
import type { RowSize } from '@/components/base/data-table/types'
// import RequestSummary from './RequestSummary'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import type { Option } from '@/types/option'

// ✅ Motion
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const GridRowSkeleton = ({ index }: { index: number }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--gray-3)] p-4 overflow-hidden"
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
  onRowSizeChange?: (size: RowSize) => void
  hideGrouping?: boolean

  /** ✅ Premium Design Props */
  viewMode?: 'table' | 'grid'
  onViewModeChange?: (mode: 'table' | 'grid') => void
  selectedRole?: string
  onRoleChange?: (role: string) => void
  workflow?: Option | null
  allWorkflows?: Option[] | null
  setWorkflow?: (workflow: Option | null) => void
}

const GridView = <TData extends unknown>({
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
  // workflow,
  // allWorkflows,
  // setWorkflow,
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
  // const dummySummaryMap = useMemo(() => {
  //   const map = new Map()
  //   allItems.forEach((row: any, index: number) => {
  //     const rowId = row?.id || row?.processId || index
  //     map.set(rowId, generateDummySummary(rowId))
  //   })
  //   return map
  // }, [allItems])

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
    <>
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
          <div className="flex flex-col gap-2 px-2 pb-6">
            {data.map((group: any, gIdx: number) => {
              const hasHeader = group.groupId !== 'root'
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
                  console.warn("GridView: failed to get row for group", groupId, e)
                  groupError = true
                }
              }

              if (groupItems.length === 0) return null

              if (groupError) {
                return (
                  <div key={groupId} className="flex flex-col gap-3 pb-6">
                    {groupItems.map((row: any, index: number) => {
                      const rowId = row?.id || row?.processId || `item-${gIdx}-${index}`
                      const requestNo = row?.requestNo || `REQ-${rowId}`
                      const raisedBy = row?.raisedBy || 'Unknown User'
                      const raisedAt = row?.raisedAt || row?.transaction_createdAt
                      //const dummySummary = dummySummaryMap.get(rowId) || generateDummySummary(rowId)

                      return (
                        <div
                          key={rowId}
                          className="group relative flex w-full flex-col rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] transition-all duration-200 hover:border-[var(--primary-3)]"
                        >
                          <div
                            onClick={() => onRowClick(row, 'Overview')}
                            className="flex cursor-pointer items-center justify-between gap-4 p-3"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-3)] bg-[var(--primary-2)] text-[var(--primary-9)]">
                                <Icon name="tabler:file-invoice" className="size-6" />
                              </div>
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="truncate text-14 font-semibold text-[var(--gray-13)]">
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
                            {/* <div className="flex items-center gap-4 shrink-0">
                              <div className="hidden lg:flex items-center gap-3">
                                {Object.entries(dummySummary).map(([key, metric]: any) => (
                                  <SummaryMetric
                                    key={key}
                                    metric={metric}
                                    onFileSelect={(file) => setSelectedFile(file)}
                                  />
                                ))}
                              </div>
                              <div className="text-[var(--gray-8)] group-hover:text-[var(--primary-9)] transition-colors pr-2">
                                <Icon name="tabler:chevron-right" className="size-5" />
                              </div>
                            </div> */}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // console.log(groupItems, groupId, "groupItems")
              return (
                <div key={groupId} className="flex flex-col !cursor-pointer gap-2 relative hover:z-[100]">
                  {hasHeader && (
                    <div
                      onClick={() => toggleGroup(groupId)}
                      className='group/gh sticky top-0 z-[60] -mx-2 mb-1.5 mt-2 flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-[var(--surface)]/95 backdrop-blur-sm border border-[var(--gray-3)] rounded-xl shadow-sm cursor-pointer transition-all hover:bg-[var(--gray-1)] hover:border-[var(--gray-4)]'
                    >
                      <div className='flex items-center gap-3'>
                        {(() => {
                          // Standardized Group Icon (Purple Stack) for all PO headers
                          const gIcon = "tabler:stack-2"
                          const gColorClass = "bg-purple-1 border-purple-2 text-purple-9"

                          return (
                            <div className={cn(
                              "flex items-center justify-center size-8 rounded-lg border transition-all group-hover/gh:scale-110",
                              gColorClass
                            )}>
                              <Icon className='size-4' name={gIcon} />
                            </div>
                          )
                        })()}
                        <h2 className='text-14 font-bold text-[var(--gray-13)] tracking-tight'>
                          {group.groupValue || group.title || 'Ungrouped'}
                        </h2>
                      </div>

                      <div className='flex items-center gap-3'>
                        <div className='flex items-center gap-2'>
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--gray-1)] border border-[var(--gray-2)]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-bold text-[var(--gray-9)] tracking-wider">PO</span>
                              <span className="text-12 font-bold text-[var(--gray-12)] tabular-nums">
                                ${groupItems.reduce((total: any, item: any) => total + Number(item["WksH1Mrs42X4J9AHgoBtw"] || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="w-px h-2.5 bg-[var(--gray-3)]" />
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-bold text-[var(--gray-9)] tracking-wider">Inv</span>
                              <span className="text-12 font-bold text-[var(--gray-12)] tabular-nums">
                                ${groupItems.reduce((total: any, item: any) => total + Number(item["suyqsm0SYii_8vsj4p0c_"] || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center bg-[var(--green-1)] border border-[var(--green-2)] rounded-lg px-2.5 py-1 gap-1.5">
                            <Icon name="tabler:circle-check-filled" className="size-3.5 text-[var(--green-9)]" />
                            <span className="text-11 font-bold text-[var(--green-11)] uppercase tracking-tight">
                              {groupItems.length} Received
                            </span>
                          </div>
                        </div>

                        {/* Toggle Icon - Switches between Right (Collapsed) and Down (Expanded) */}
                        <div className={cn(
                          "flex size-6 items-center justify-center transition-all duration-300",
                          isCollapsed
                            ? "opacity-0 translate-x-2 group-hover/gh:opacity-100 group-hover/gh:translate-x-0 text-[var(--gray-10)]"
                            : "opacity-100 translate-x-0 text-[var(--primary-9)]"
                        )}>
                          <Icon
                            name={isCollapsed ? "tabler:chevron-right" : "tabler:chevron-down"}
                            className="size-4"
                          />
                        </div>
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
                          className="flex flex-col gap-1.5 pt-1 pb-4 px-1"
                        >

                          <div className='flex flex-col gap-1.5'>
                            {groupItems.map((row: any, index: number) => {
                              const rowId = row?.id || row?.processId || `item-${gIdx}-${index}`
                              // Prioritize Invoice/Document Number over internal Request No
                              console.log(row, 'row')
                              const invoiceNo = row?.documentNumber || row?.['kvcYuknkDumkTenjvrVLj'] || row?.invoiceNo || row?.requestNo || `INV-${rowId}`
                              // Prioritize Supplier/Vendor name over 'Raised By'
                              const supplierName = row?.vendor || row?.['UtfgJy6Z0qyfRC5Bclf-c'] || row?.raisedBy || 'Unknown Supplier'
                              const raisedAt = row?.raisedAt || row?.transaction_createdAt
                              const amount = Number(row["suyqsm0SYii_8vsj4p0c_"] || row["WksH1Mrs42X4J9AHgoBtw"] || 0)
                              const status = row?.status || 'Pending'

                              // Exact Icon and Color matching from design
                              let iconName = "tabler:clock"
                              let iconColorClass = "bg-orange-1 border-orange-2 text-orange-9"

                              if (status === 'Approved' || index === 1) {
                                iconName = "tabler:circle-check"
                                iconColorClass = "bg-green-1 border-green-2 text-green-9"
                              } else if (row?.isDuplicateInvoice || index === 4) {
                                iconName = "tabler:stack-2"
                                iconColorClass = "bg-purple-1 border-purple-2 text-purple-9"
                              } else if (index === 3) {
                                iconName = "tabler:circle-check"
                                iconColorClass = "bg-blue-1 border-blue-2 text-blue-9"
                              } else if (index === 6) {
                                iconName = "tabler:currency-dollar"
                                iconColorClass = "bg-green-1 border-green-2 text-green-9"
                              } else if (index === 5) {
                                iconName = "tabler:clock"
                                iconColorClass = "bg-gray-1 border-gray-2 text-gray-9"
                              }

                              return (
                                <motion.div
                                  key={rowId}
                                  layout
                                  variants={itemVariantSet() as any}
                                  exit="exit"
                                  whileHover={{
                                    y: -1,
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                    borderColor: 'var(--gray-4)',
                                    zIndex: 10
                                  }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                  onClick={() => onRowClick(row, 'Overview')}
                                  className={cn(
                                    'group relative flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--gray-2)] bg-[var(--surface)] p-2.5 transition-all cursor-pointer'
                                  )}
                                >
                                  {/* Left Section: Icon & Identity */}
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={cn(
                                      "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300",
                                      iconColorClass
                                    )}>
                                      <Icon name={iconName} className="size-5" />
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <h3 className="truncate text-14 font-bold text-[var(--gray-12)] tracking-tight">
                                          {invoiceNo}
                                        </h3>
                                        {(index === 4 || row?.isDuplicateInvoice) && (
                                          <span className="bg-purple-1 text-purple-9 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-2 uppercase tracking-widest scale-90">
                                            DUP
                                          </span>
                                        )}
                                      </div>
                                      <p className="truncate text-12 font-medium text-[var(--gray-10)] mt-0.5">
                                        {supplierName}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Center Section: Status & Tags */}
                                  <div className="hidden xl:flex items-center gap-6 flex-1 justify-center">
                                    {/* Match Status */}
                                    <div className="flex items-center gap-2">
                                      {index % 3 === 0 ? (
                                        <>
                                          <Icon name="tabler:link" className="size-4 text-green-9" />
                                          <span className="text-12 font-semibold text-green-11">Matched</span>
                                          <Icon name="tabler:circle-check-filled" className="size-3.5 text-green-9" />
                                        </>
                                      ) : index % 3 === 1 ? (
                                        <>
                                          <Icon name="tabler:link-off" className="size-4 text-red-9" />
                                          <span className="text-12 font-semibold text-red-11">No Match</span>
                                          <Icon name="tabler:circle-x-filled" className="size-3.5 text-red-9" />
                                        </>
                                      ) : (
                                        <>
                                          <Icon name="tabler:link" className="size-4 text-orange-9" />
                                          <span className="text-12 font-semibold text-orange-11">Partial Match</span>
                                          <Icon name="tabler:alert-circle-filled" className="size-3.5 text-orange-9" />
                                        </>
                                      )}
                                    </div>

                                    {/* Category Tag */}
                                    <div className="bg-[var(--gray-2)] text-[var(--gray-11)] text-[10px] font-bold px-2 py-0.5 rounded border border-[var(--gray-3)] uppercase tracking-tight">
                                      {index % 4 === 0 ? 'Supplies' : index % 4 === 1 ? 'Software' : index % 4 === 2 ? 'Utilities' : 'Travel'}
                                    </div>

                                    {/* Priority Tag */}
                                    <div className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tight",
                                      index % 3 === 0 ? "bg-orange-1 text-orange-11 border-orange-2" :
                                        index % 3 === 1 ? "bg-red-1 text-red-11 border-red-2" :
                                          "bg-blue-1 text-blue-11 border-blue-2"
                                    )}>
                                      {index % 3 === 0 ? 'High' : index % 3 === 1 ? 'Critical' : 'Medium'}
                                    </div>
                                  </div>

                                  {/* Right Section: Amount & Date + Hover Arrow */}
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex flex-col items-end min-w-[100px]">
                                      <span className="text-15 font-bold text-[var(--gray-12)] tabular-nums tracking-tighter">
                                        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-11 font-medium text-[var(--gray-10)] mt-0.5">
                                        {formatDatetime(raisedAt, 'MMM DD, YYYY')}
                                      </span>
                                    </div>

                                    {/* Navigation Arrow - Appears on hover - Square & Transparent */}
                                    <div className="w-6 flex items-center justify-end overflow-hidden">
                                      <div className="flex size-6 items-center justify-center transition-all duration-300 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 text-[var(--primary-9)]">
                                        <Icon
                                          name="tabler:arrow-narrow-right"
                                          className="size-5"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
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
        opened={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        file={selectedFile}
        tenantId="dummy"
        userId="dummy"
        fullScreen={true}
      />
    </>
  )
}

GridView.displayName = 'GridView'
export default GridView