// import SummaryMetric from './SummaryMetric'
import { type Table as TanstackTable } from '@tanstack/react-table'
// ✅ Motion
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { TableActionButton } from '@/components/base/data-table/TableActionBar'
import type { RowSize } from '@/components/base/data-table/types'
import type { Option } from '@/types/option'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableFilters from '@/components/base/data-table/actions/TableFilters'
import TableReload from '@/components/base/data-table/actions/TableReload'
// ✅ Table Actions imports
import TableSearch from '@/components/base/data-table/actions/TableSearch'
// import { generateDummySummary } from '@/pages/requests/utils/dummyData'
// import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
// import RequestSummary from './RequestSummary'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import ListEmptyState from '@/components/common/ListEmptyState'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import HoverExpandableText from './HoverExpandableText'

const GridRowSkeleton = ({ index }: { index: number }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      aria-busy='true'
      className='relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border border-[var(--gray-3)] p-4'
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

const itemVariantSet = () => ({
  exit: { opacity: 0, scale: 0.95 },
  hidden: { opacity: 0, y: 10 },
  rowHover: { backgroundColor: 'var(--gray-1)', scale: 1.005 },
  show: { opacity: 1, y: 0 },
})

const findPONumberInObject = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null

  const extractStringValue = (val: any): string | null => {
    if (val == null) return null
    if (typeof val === 'object') {
      const innerVal =
        val['Invoice Value'] ||
        val['InvoiceValue'] ||
        val['PO Value'] ||
        val['POValue'] ||
        val['value'] ||
        val['val']
      if (innerVal !== undefined) return extractStringValue(innerVal)
      return null
    }
    const str = String(val).trim()
    return str !== '' && str !== '-' && str.toUpperCase() !== 'N/A' ? str : null
  }

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase()
    const isStrictPOKey =
      lowerKey === 'po' ||
      lowerKey === 'po_number' ||
      lowerKey === 'ponumber' ||
      lowerKey === 'po number' ||
      lowerKey === 'po_no' ||
      lowerKey === 'pono' ||
      lowerKey === 'po no' ||
      lowerKey === 'purchase_order' ||
      lowerKey === 'purchaseorder' ||
      lowerKey === 'purchase_order_number' ||
      lowerKey === 'purchaseorder_number' ||
      lowerKey === 'purchase order number' ||
      lowerKey === 'purchase_order_no' ||
      lowerKey === 'purchaseorder_no' ||
      lowerKey === 'purchase order no' ||
      lowerKey === 'rxwlghillrremmrqlk9mj' ||
      lowerKey.includes('purchase order') ||
      lowerKey.includes('purchase_order') ||
      lowerKey.includes('purchaseorder')

    if (isStrictPOKey) {
      if (
        !lowerKey.includes('value') &&
        !lowerKey.includes('amount') &&
        !lowerKey.includes('total') &&
        !lowerKey.includes('date') &&
        !lowerKey.includes('price')
      ) {
        const extracted = extractStringValue(obj[key])
        if (extracted && extracted !== '-' && extracted !== '') {
          return extracted
        }
      }
    }
  }

  return null
}

const extractPONumber = (row: any): string => {
  if (!row) return 'N/A'
  const agentData = row._agentData?.[0] || row._agentData || {}

  const fromForm =
    findPONumberInObject(row.formData?.fields) ||
    findPONumberInObject(row.formData)
  if (fromForm) return fromForm

  const fromAgentHeader = findPONumberInObject(
    agentData?.['Extracted Invoice JSON']?.invoice_header,
  )
  if (fromAgentHeader) return fromAgentHeader

  const fromPOMatching = findPONumberInObject(agentData?.po_matching)
  if (fromPOMatching) return fromPOMatching

  const fromAgent = findPONumberInObject(agentData)
  if (fromAgent) return fromAgent

  const fromSelected = findPONumberInObject(row)
  if (fromSelected) return fromSelected

  return 'N/A'
}

const extractDueDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}
  const val =
    row.dueDate ||
    row.due_date ||
    row.payment_terms?.due_date ||
    row.paymentTerms?.due_date ||
    row.paymentTerms?.dueDate ||
    row.formData?.fields?.['Due Date'] ||
    row.formData?.fields?.['due_date'] ||
    row.formData?.fields?.['Due_Date'] ||
    row.formData?.['Due Date'] ||
    row.formData?.['due_date'] ||
    row.formData?.['Due_Date'] ||
    agentData?.payment_terms?.due_date ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['Due Date'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['due_date'] ||
    agentData?.po_matching?.due_date
  if (!val || val === '-') return '-'
  try {
    return formatDatetime(val as string, 'date')
  } catch {
    return String(val)
  }
}

const extractPaymentTerms = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}

  const termObj = row.payment_terms || row.paymentTerms || {}
  let val =
    typeof termObj === 'object'
      ? termObj.payment_terms ||
        termObj.terms ||
        termObj.payment_term ||
        termObj.term
      : termObj
  if (val && val !== '-') return String(val)

  val = row.terms || row.payment_term || row.paymentTerms
  if (val && typeof val !== 'object' && val !== '-') return String(val)

  val =
    row.formData?.fields?.['Payment Terms'] ||
    row.formData?.fields?.['payment_terms'] ||
    row.formData?.fields?.['Terms'] ||
    row.formData?.fields?.['terms'] ||
    row.formData?.['Payment Terms'] ||
    row.formData?.['payment_terms'] ||
    row.formData?.['Terms'] ||
    row.formData?.['terms']
  if (val && val !== '-') return String(val)

  if (agentData) {
    const agentTermObj = agentData.payment_terms || {}
    val =
      typeof agentTermObj === 'object'
        ? agentTermObj.payment_terms ||
          agentTermObj.terms ||
          agentTermObj.payment_term ||
          agentTermObj.term
        : agentTermObj
    if (val && val !== '-') return String(val)

    const header = agentData['Extracted Invoice JSON']?.invoice_header || {}
    val =
      header['Payment Terms'] ||
      header['payment_terms'] ||
      header['Terms'] ||
      header['terms']
    if (val && val !== '-') return String(val)
  }

  return '-'
}

const calculateDaysDifference = (
  invoiceDateStr: any,
  dueDateStr: any,
): number | null => {
  if (!invoiceDateStr || !dueDateStr || dueDateStr === '-') return null
  try {
    const invDate = new Date(invoiceDateStr)
    const dueDate = new Date(dueDateStr)
    if (isNaN(invDate.getTime()) || isNaN(dueDate.getTime())) return null
    const diffTime = dueDate.getTime() - invDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  } catch {
    return null
  }
}

const extractInvoiceDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}

  // 1. Check dynamic field key 9F6tPVHoRnmONGx3kYJu2 in fields and row
  const fromForm9F =
    row.formData?.fields?.['9F6tPVHoRnmONGx3kYJu2'] ||
    row['9F6tPVHoRnmONGx3kYJu2']
  if (fromForm9F && fromForm9F !== '-') return String(fromForm9F).trim()

  // 2. Check general Invoice Date keys
  const exactKeys = [
    'Invoice Date',
    'invoice_date',
    'invoiceDate',
    'Date',
    'date',
    '9F6tPVHoRnmONGx3kYJu2',
  ]

  const extractVal = (val: any): string | null => {
    if (val == null) return null
    if (typeof val === 'object') {
      const inner =
        val['Invoice Value'] || val['value'] || val['val'] || val['text']
      return inner !== undefined ? String(inner).trim() : null
    }
    return String(val).trim()
  }

  const fields = row.formData?.fields || {}
  for (const key of exactKeys) {
    const v = extractVal(fields[key]) || extractVal(row[key])
    if (v && v !== '-' && v !== '') return v
  }

  // 3. Check agentData Extracted Invoice JSON
  const agentHeader =
    agentData?.['Extracted Invoice JSON']?.invoice_header || {}
  for (const key of exactKeys) {
    const v = extractVal(agentHeader[key])
    if (v && v !== '-' && v !== '') return v
  }

  // 4. Fallback to row.raisedAt or row.transaction_createdAt
  const raisedAt = row.raisedAt || row.transaction_createdAt || row.createdAt
  if (raisedAt) return String(raisedAt)

  return '-'
}

interface GridViewProps<TData> {
  data: any[]
  isLoading: boolean
  table: TanstackTable<TData>
  actions?: TableActionButton[]
  activeTab?: string
  allWorkflows?: Option[] | null
  hideGrouping?: boolean
  isReloading?: boolean
  rowSize?: RowSize
  selectedRole?: string
  /** ✅ Premium Design Props */
  viewMode?: 'table' | 'grid'

  workflow?: Option | null
  setWorkflow?: (workflow: Option | null) => void
  onNewRequest?: () => void
  onReload?: () => void
  onRoleChange?: (role: string) => void
  onRowClick: (item: any, tab: string) => void
  onRowSizeChange?: (size: RowSize) => void
  onViewModeChange?: (mode: 'table' | 'grid') => void
}

const GridView = <TData extends unknown>({
  actions,
  activeTab,
  data,
  hideGrouping: _hideGrouping,
  isLoading,
  isReloading,
  rowSize: _rowSize,
  table,
  onNewRequest,
  onReload,
  onRowClick,
  onRowSizeChange: _onRowSizeChange,
}: GridViewProps<TData>) => {
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  )
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  useEffect(() => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }, [activeTab])

  const exitSelectionMode = () => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  const allItems = useMemo(() => {
    const items: any[] = []
    data.forEach((group: any) => {
      if (Array.isArray(group.items)) {
        items.push(...group.items)
      }
    })
    return items
  }, [data])

  const toggleRowSelection = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const toggleAllSelection = () => {
    if (selectedIds.size === allItems.length && allItems.length > 0) {
      setSelectedIds(new Set())
    } else {
      const next = new Set<string | number>()
      allItems.forEach((row, index) => {
        const rowId = row?.id || row?.processId || `item-${index}`
        next.add(rowId)
      })
      setSelectedIds(next)
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3 p-2'>
        {[1, 2, 3].map((i) => (
          <GridRowSkeleton index={i} key={i} />
        ))}
      </div>
    )
  }

  const isAllSelected =
    allItems.length > 0 && selectedIds.size === allItems.length
  const isPartiallySelected =
    selectedIds.size > 0 && selectedIds.size < allItems.length

  return (
    <>
      <div className='flex h-full flex-col overflow-hidden'>
        <div className='sticky top-0 z-20 flex items-center justify-between border-b border-[var(--gray-2)] bg-surface/70 py-1 pr-4 pl-7 backdrop-blur-sm'>
          <div className='flex items-center gap-4'>
            {isSelectionMode ? (
              <div
                className={cn(
                  'flex size-5 cursor-pointer items-center justify-center rounded-md border-2 transition-all',
                  isAllSelected
                    ? 'border-[var(--primary-9)] bg-surface'
                    : isPartiallySelected
                      ? 'border-[var(--primary-9)] bg-surface'
                      : 'border-[var(--gray-3)] bg-surface hover:border-[var(--primary-9)]',
                )}
                onClick={toggleAllSelection}
              >
                {isAllSelected && (
                  <Icon
                    className='size-3.5 stroke-[3px] text-[var(--primary-9)]'
                    name='tabler:check'
                  />
                )}
                {isPartiallySelected && (
                  <div className='size-2 rounded-sm bg-[var(--primary-9)]' />
                )}
              </div>
            ) : null}
            <span className='text-[14px] font-medium text-[var(--text-primary)]'>
              Invoices{' '}
              {isSelectionMode && selectedIds.size > 0 && (
                <span className='ml-1 text-[var(--gray-10)]'>
                  ({selectedIds.size})
                </span>
              )}
            </span>
            {!isSelectionMode && allItems.length > 0 && (
              <button
                className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--gray-3)] bg-surface px-2.5 py-1 text-[12px] font-medium text-[var(--gray-11)] transition-all hover:border-[var(--primary-4)] hover:bg-[var(--primary-1)] hover:text-[var(--primary-11)]'
                type='button'
                onClick={() => setIsSelectionMode(true)}
              >
                <Icon className='size-3.5' name='tabler:checkbox' />
                Select
              </button>
            )}
            {isSelectionMode && selectedIds.size === 0 && (
              <button
                className='inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[var(--gray-10)] transition-all hover:bg-[var(--gray-1)] hover:text-[var(--gray-12)]'
                type='button'
                onClick={exitSelectionMode}
              >
                Cancel
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {selectedIds.size > 0 ? (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className='flex items-center gap-2'
                initial={{ opacity: 0, x: 20 }}
              >
                <span className='animate-pulse rounded-md border border-[var(--primary-3)] bg-[var(--primary-2)] px-2.5 py-1 text-[12px] font-semibold text-[var(--primary-11)]'>
                  {selectedIds.size} Selected
                </span>

                {activeTab === 'Processed' ? (
                  <button
                    className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--green-9)] px-3 py-1.5 text-12 font-semibold text-white shadow-sm transition-all hover:bg-[var(--green-10)] hover:shadow-md active:scale-95'
                    type='button'
                    onClick={() => {
                      showToast({
                        message: `Bulk marked ${selectedIds.size} requests as Paid successfully!`,
                        variant: 'success',
                      })
                      exitSelectionMode()
                    }}
                  >
                    <Icon className='size-4' name='tabler:circle-check' />
                    Mark as Paid
                  </button>
                ) : (
                  <>
                    <button
                      className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--green-9)] px-3 py-1.5 text-12 font-semibold text-white shadow-sm transition-all hover:bg-[var(--green-10)] hover:shadow-md active:scale-95'
                      type='button'
                      onClick={() => {
                        showToast({
                          message: `Bulk approved ${selectedIds.size} requests successfully!`,
                          variant: 'success',
                        })
                        exitSelectionMode()
                      }}
                    >
                      <Icon className='size-4' name='tabler:circle-check' />
                      Approve
                    </button>

                    <button
                      className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--red-3)] bg-[var(--red-2)] px-3 py-1.5 text-12 font-semibold text-[var(--red-11)] shadow-sm transition-all hover:bg-[var(--red-3)] hover:shadow-md active:scale-95'
                      type='button'
                      onClick={() => {
                        showToast({
                          message: `Bulk rejected ${selectedIds.size} requests successfully!`,
                          variant: 'warning',
                        })
                        exitSelectionMode()
                      }}
                    >
                      <Icon
                        className='size-4 text-[var(--red-9)]'
                        name='tabler:trash-2'
                      />
                      Reject
                    </button>
                  </>
                )}

                <button
                  className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--gray-3)] bg-surface px-2.5 py-1.5 text-12 font-medium text-[var(--gray-11)] transition-all hover:bg-[var(--gray-1)] hover:text-[var(--gray-13)]'
                  type='button'
                  onClick={exitSelectionMode}
                >
                  <Icon className='size-3.5' name='tabler:x' />
                  Clear
                </button>
              </motion.div>
            ) : (
              <>
                <TableSearch table={table} />
                <TableFilters table={table} />
                <TableExport table={table} />
                <TableReload
                  isReloading={isReloading || false}
                  onReload={onReload || (() => {})}
                />

                {/* Custom Actions */}
                {actions &&
                  actions.map((a, idx) => (
                    <button
                      disabled={a.disabled}
                      key={`${a.label}-${idx}`}
                      title={a.title ?? a.label}
                      type='button'
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--secondary-9)] px-3 py-1.5 text-12 font-semibold text-white shadow-sm transition-all hover:bg-[var(--secondary-10)] hover:shadow-md active:scale-95',
                        a.disabled &&
                          'cursor-not-allowed opacity-60 hover:bg-[var(--secondary-9)]',
                        a.className,
                      )}
                      onClick={a.onClick}
                    >
                      {a.icon ? (
                        <Icon className='size-4' name={a.icon} />
                      ) : null}
                      {a.label}
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto'>
          {allItems.length === 0 ? (
            <ListEmptyState
              containerClassName='py-12'
              page='requests'
              table={table as TanstackTable<any>}
              onPrimaryAction={onNewRequest}
            />
          ) : (
            <div className='flex flex-col gap-2.5 px-2 pt-3 pb-4'>
              {allItems.map((row: any, index: number) => {
                const originalIndex =
                  typeof row?._originalIndex === 'number'
                    ? row._originalIndex
                    : index
                const rowId =
                  row?.id || row?.processId || `item-${originalIndex}`
                const isSelected = selectedIds.has(rowId)
                const invoiceNo =
                  row?.documentNumber ||
                  row?.['kvcYuknkDumkTenjvrVLj'] ||
                  row?.invoiceNo ||
                  row?.requestNo ||
                  `INV-${rowId}`
                const supplierName =
                  row?.vendor ||
                  row?.['UtfgJy6Z0qyfRC5Bclf-c'] ||
                  row?.raisedBy ||
                  'Unknown Supplier'
                const raisedAt = row?.raisedAt || row?.transaction_createdAt
                const amount = Number(
                  row['suyqsm0SYii_8vsj4p0c_'] ||
                    row['WksH1Mrs42X4J9AHgoBtw'] ||
                    0,
                )
                const status = row?.status || 'Pending'

                const aiInsight =
                  originalIndex % 3 === 0
                    ? 'Ready for auto-approval'
                    : originalIndex % 3 === 1
                      ? 'No PO linked — request PO or code to GL'
                      : 'Partial match — review unmatched lines'

                // Exact Icon and Color matching from design
                let iconName = 'tabler:clock'
                let iconColorClass = 'bg-orange-2 border-orange-2 text-orange-9'

                if (row.isProcessing) {
                  iconName = 'tabler:loader-2'
                  iconColorClass =
                    'bg-[var(--orange-2)] border-[var(--orange-2)] text-[var(--orange-9)]'
                } else if (status === 'Approved' || originalIndex % 5 === 0) {
                  iconName = 'tabler:circle-check'
                  iconColorClass =
                    'bg-[var(--green-2)] border-[var(--green-2)] text-[var(--green-9)]'
                } else if (row?.isDuplicateInvoice || originalIndex % 7 === 0) {
                  iconName = 'tabler:stack-2'
                  iconColorClass =
                    'bg-[var(--purple-2)] border-[var(--purple-2)] text-[var(--purple-9)]'
                } else if (originalIndex % 4 === 0) {
                  iconName = 'tabler:circle-check'
                  iconColorClass =
                    'bg-[var(--blue-2)] border-[var(--blue-2)] text-[var(--blue-9)]'
                }

                return (
                  <motion.div
                    animate='show'
                    exit='exit'
                    initial='hidden'
                    key={rowId}
                    transition={{ damping: 30, stiffness: 400, type: 'spring' }}
                    variants={itemVariantSet() as any}
                    className={cn(
                      'group relative flex w-full items-center gap-4 rounded-xl border-0 border-b border-b-[var(--gray-2)] px-5 py-3 transition-colors transition-shadow duration-200',
                      row.isProcessing ? 'cursor-default' : 'cursor-pointer',
                      isSelected
                        ? 'border-r border-l border-r-[var(--primary-3)] border-b-[var(--primary-3)] border-l-[var(--primary-3)] bg-[var(--primary-1)] shadow-sm'
                        : 'bg-[var(--surface)]',
                      !isSelected &&
                        !row.isProcessing &&
                        'hover:z-10 hover:border-r hover:border-l hover:border-r-[var(--primary-4)] hover:border-b-[var(--primary-4)] hover:border-l-[var(--primary-4)] hover:bg-[var(--gray-1)] hover:shadow-sm',
                      !isSelected &&
                        row.isProcessing &&
                        'hover:border-r hover:border-l hover:border-r-[var(--orange-4)] hover:border-b-[var(--orange-4)] hover:border-l-[var(--orange-4)] hover:bg-[var(--orange-1)]/40 hover:shadow-sm',
                    )}
                    onClick={() => {
                      if (!row.isProcessing) onRowClick(row, 'Overview')
                    }}
                  >
                    {/* Checkbox & Status Icon */}
                    <div className='flex shrink-0 items-center gap-4'>
                      {isSelectionMode && (
                        <div
                          className={cn(
                            'flex size-5 items-center justify-center rounded-md border-2 transition-all',
                            isSelected
                              ? 'border-[var(--primary-9)] bg-surface'
                              : 'border-[var(--gray-3)] bg-surface group-hover:border-[var(--primary-9)]',
                          )}
                          onClick={(e) => {
                            if (row.isProcessing) {
                              e.stopPropagation()
                              return
                            }
                            toggleRowSelection(rowId, e)
                          }}
                        >
                          {isSelected && (
                            <Icon
                              className='size-3.5 stroke-[3px] text-[var(--primary-9)]'
                              name='tabler:check'
                            />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
                          iconColorClass,
                        )}
                      >
                        <Icon
                          name={iconName}
                          className={cn(
                            'size-5',
                            row.isProcessing && 'animate-spin',
                          )}
                        />
                      </div>
                    </div>

                    {/* Main Content: Identity & Metadata */}
                    <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                      <div className='flex items-center gap-3'>
                        <h3
                          className='truncate text-[15px] tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-9)]'
                          style={{ fontWeight: 500 }}
                        >
                          {invoiceNo}
                        </h3>
                        {!row.isProcessing && (
                          <HoverExpandableText
                            className='align-bottom text-[12px] font-medium text-[var(--gray-10)]'
                            fallbackText='Unknown Supplier'
                            normalMaxWidthClass='max-w-[120px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[260px]'
                            text={supplierName}
                          />
                        )}
                        <div className='flex shrink-0 justify-start'>
                          {row.isProcessing ? null : activeTab ===
                            'Processed' ? (
                            originalIndex % 2 === 0 ? (
                              <span className='flex items-center gap-1 rounded-md border border-[var(--green-4)] bg-[var(--green-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
                                <Icon
                                  className='size-3.5'
                                  name='tabler:circle-check'
                                />
                                Paid
                              </span>
                            ) : (
                              <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
                                <Icon
                                  className='size-3.5'
                                  name='tabler:clock'
                                />
                                Pending for Payment
                              </span>
                            )
                          ) : originalIndex % 3 === 0 ? (
                            <span className='flex items-center gap-1 rounded-md border border-[var(--green-4)] bg-[var(--green-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
                              <Icon
                                className='size-3.5'
                                name='tabler:circle-check'
                              />
                              Matched
                            </span>
                          ) : originalIndex % 3 === 1 ? (
                            <span className='flex items-center gap-1 rounded-md border border-[var(--red-4)] bg-[var(--red-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--red-11)]'>
                              <Icon
                                className='size-3.5'
                                name='tabler:alert-circle'
                              />
                              No Match
                            </span>
                          ) : (
                            <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
                              <Icon
                                className='size-3.5'
                                name='tabler:alert-triangle'
                              />
                              Partial Match
                            </span>
                          )}
                        </div>
                        {/* {originalIndex % 4 === 1 && !row.isProcessing && (
                          <span className='flex items-center gap-1 rounded-md border border-[var(--blue-4)] bg-[var(--blue-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--blue-11)]'>
                            <Icon
                              className='size-3.5'
                              name='tabler:file-alert'
                            />
                            Missing PO
                          </span>
                        )}
                        {originalIndex % 4 === 2 && !row.isProcessing && (
                          <span className='flex items-center gap-1 rounded-md border border-[var(--purple-4)] bg-[var(--purple-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--purple-11)]'>
                            <Icon className='size-3.5' name='tabler:scan' />
                            OCR Low
                          </span>
                        )}
                        {originalIndex % 4 === 3 && !row.isProcessing && (
                          <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
                            <Icon
                              className='size-3.5'
                              name='tabler:arrows-split'
                            />
                            PO Mismatch
                          </span>
                        )} */}
                      </div>

                      {/* Sub-metadata row */}
                      <div className='flex items-center gap-4 text-[12px] font-medium text-[var(--gray-10)]'>
                        <div className='flex items-center gap-1.5'>
                          <Icon className='size-3.5' name='tabler:hash' />
                          <span>
                            {row.isProcessing
                              ? 'Fetching...'
                              : extractPONumber(row)}
                          </span>
                        </div>
                        {!row.isProcessing && (
                          <>
                            <div className='flex items-center gap-1.5 text-[var(--gray-8)]'>
                              <Icon className='size-3.5' name='tabler:stack' />
                              <span>5100-00{originalIndex + 1}</span>
                            </div>
                            <div className='flex items-center gap-1.5 text-[var(--gray-8)]'>
                              <Icon className='size-3.5' name='tabler:tag' />
                              <span>
                                {originalIndex % 4 === 0
                                  ? 'Supplies'
                                  : originalIndex % 4 === 1
                                    ? 'Software'
                                    : originalIndex % 4 === 2
                                      ? 'Utilities'
                                      : 'Travel'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* AI Insight Line - Centered in middle of row */}
                    {!row.isProcessing && activeTab !== 'Processed' && (
                      <div className='flex min-w-0 flex-1 items-center justify-center px-4'>
                        <div className='flex min-w-0 items-center gap-1.5'>
                          <Icon
                            className='size-3.5 shrink-0 text-[var(--primary-9)]'
                            name='tabler:sparkles'
                          />
                          <HoverExpandableText
                            className='text-[13px] font-medium text-[var(--gray-11)]'
                            normalMaxWidthClass='max-w-[180px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[450px]'
                            text={aiInsight}
                          />
                        </div>
                      </div>
                    )}
                    {/* Columns 1-4 perfectly aligned across all rows */}
                    <div className='ml-auto flex shrink-0 items-center gap-6 select-none'>
                      {/* Column 1: Match Status */}
                      {/* <div className='flex min-w-[110px] shrink-0 justify-center'>
                        {row.isProcessing ? null : originalIndex % 3 === 0 ? (
                          <div className='w-[100px] rounded-full border border-[var(--green-4)] bg-[var(--green-2)] px-2.5 py-0.5 text-center text-[12px] font-semibold text-[var(--green-11)]'>
                            Matched
                          </div>
                        ) : originalIndex % 3 === 1 ? (
                          <div className='w-[100px] rounded-full border border-[var(--red-4)] bg-[var(--red-2)] px-2.5 py-0.5 text-center text-[12px] font-semibold text-[var(--red-11)]'>
                            No Match
                          </div>
                        ) : (
                          <div className='w-[100px] rounded-full border border-[var(--orange-4)] bg-[var(--orange-2)] px-2.5 py-0.5 text-center text-[12px] font-semibold text-[var(--orange-11)]'>
                            Partial Match
                          </div>
                        )}
                      </div> */}

                      {/* Column 2: AI Score */}
                      {/* {row.isProcessing ? (
                        <div className='w-[130px] shrink-0' />
                      ) : (
                        <div className='group/aiscore relative z-10 flex w-[130px] shrink-0 cursor-pointer flex-col justify-center gap-1 hover:z-[9999]'>
                          <div className='flex items-center justify-between gap-2'>
                            <div className='flex items-center gap-1 text-[10px] font-semibold tracking-wide text-[var(--gray-11)] uppercase'>
                              <Icon
                                className='size-3.5 text-[var(--gray-9)]'
                                name='tabler:sparkles'
                              />
                              <span>AI Score</span>
                            </div>
                            <span
                              className={cn(
                                'text-[13px] font-bold',
                                aiScoreTextColor,
                              )}
                            >
                              {aiScore}%
                            </span>
                          </div>
                          <div className='h-[4px] w-full overflow-hidden rounded-full bg-[var(--gray-2)]'>
                            <motion.div
                              animate={{ width: `${aiScore}%` }}
                              initial={{ width: 0 }}
                              className={cn(
                                'h-full rounded-full',
                                aiScoreBgColor,
                              )}
                            />
                          </div>

                          <div
                            style={{ zIndex: 999999 }}
                            className={cn(
                              'pointer-events-none invisible absolute left-1/2 w-[360px] -translate-x-1/2 opacity-0 transition-all duration-300 group-hover/aiscore:visible group-hover/aiscore:opacity-100',
                              originalIndex < 2
                                ? 'top-full mt-3 -translate-y-2 group-hover/aiscore:translate-y-0'
                                : 'bottom-full mb-3 translate-y-2 group-hover/aiscore:translate-y-0',
                            )}
                          >
                            <div className='relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-4 opacity-100 shadow-2xl'>
                              <div className='pointer-events-none absolute top-0 right-0 -mt-10 -mr-10 h-20 w-20 rounded-full bg-[var(--teal-9)] opacity-10 blur-2xl' />

                              <div className='relative z-10 mb-2 flex items-center gap-2'>
                                <div className='rounded-md bg-[var(--primary-1)] p-1 text-[var(--primary-9)]'>
                                  <Icon
                                    className='size-4'
                                    name='tabler:sparkles'
                                  />
                                </div>
                                <span className='text-[11px] font-bold tracking-wide text-[var(--gray-12)]'>
                                  Invoice Decision Details
                                </span>
                              </div>

                              <div className='relative z-10 rounded-lg border border-[var(--primary-2)] bg-[var(--primary-1)]/50 p-3'>
                                <p className='text-[12px] leading-relaxed font-medium text-[var(--gray-12)]'>
                                  {renderHighlightedContent(aiInsightDetail)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )} */}

                      {row.isProcessing ? (
                        <div className='relative flex w-[249px] items-center justify-end gap-2 pr-4'>
                          <span className='text-[12px] font-medium text-[var(--gray-10)]'>
                            Analyzing...
                          </span>
                          {row.stage ? (
                            <span className='rounded-md border border-[var(--primary-3)] bg-[var(--primary-1)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary-11)]'>
                              {row.stage}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          {/* Column 3: Terms & Due Calculation */}
                          <div className='flex w-[110px] shrink-0 flex-col items-center justify-center text-center'>
                            {(() => {
                              const terms = extractPaymentTerms(row)
                              const dueDate = extractDueDate(row)
                              const daysDiff = calculateDaysDifference(
                                raisedAt,
                                dueDate,
                              )

                              // Format terms in days (e.g. Net 30 -> 30 Days)
                              let termsDisplay =
                                terms !== '-' ? terms : 'Immediate'
                              if (termsDisplay.toLowerCase() === 'immediate') {
                                termsDisplay = '0 Days'
                              } else {
                                // Extract numeric value from terms (e.g. "Net 30" -> "30 Days")
                                const numMatch = termsDisplay.match(/\d+/)
                                if (numMatch) {
                                  termsDisplay = `${numMatch[0]} Days`
                                }
                              }

                              // Calculation from invoice date
                              let calculationText = 'Immediate'
                              let calculationTheme =
                                'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'

                              if (daysDiff !== null) {
                                if (daysDiff > 0) {
                                  calculationText = `In ${daysDiff} days`
                                  if (daysDiff <= 15) {
                                    calculationTheme =
                                      'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
                                  } else {
                                    calculationTheme =
                                      'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
                                  }
                                } else if (daysDiff < 0) {
                                  calculationText = `${Math.abs(daysDiff)}d Overdue`
                                  calculationTheme =
                                    'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
                                }
                              } else {
                                // fallback to terms numeric days diff if due date is not clear
                                const numMatch = terms.match(/\d+/)
                                if (numMatch) {
                                  const days = parseInt(numMatch[0])
                                  calculationText = `In ${days} days`
                                  calculationTheme =
                                    days <= 15
                                      ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
                                      : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
                                }
                              }

                              return (
                                <div className='flex flex-col items-center gap-1'>
                                  <span className='text-[12px] font-semibold tracking-tight text-[var(--gray-12)]'>
                                    {termsDisplay}
                                  </span>
                                  <span
                                    className={cn(
                                      'rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide',
                                      calculationTheme,
                                    )}
                                  >
                                    {calculationText}
                                  </span>
                                </div>
                              )
                            })()}
                          </div>

                          {/* Column 4: Invoice Value & Date */}
                          <div className='flex w-[115px] shrink-0 flex-col items-end'>
                            <span
                              className='text-[15px] leading-none tracking-tight text-[var(--text-primary)] tabular-nums'
                              style={{ fontWeight: 600 }}
                            >
                              $
                              {(amount || 3450).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <span className='mt-1.5 text-[12px] font-medium text-[var(--gray-10)]'>
                              {(() => {
                                const rawDate = extractInvoiceDate(row)
                                if (rawDate && rawDate !== '-') {
                                  return new Date(rawDate).toLocaleDateString(
                                    'en-US',
                                    {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    },
                                  )
                                }
                                return 'May 19, 2026'
                              })()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Navigation Arrow */}
                    <div className='flex w-6 shrink-0 items-center justify-end select-none'>
                      {!row.isProcessing && (
                        <Icon
                          className='size-5 translate-x-[-4px] text-[var(--gray-8)] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-[var(--gray-8)] group-hover:opacity-100'
                          name='tabler:arrow-right'
                        />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
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
