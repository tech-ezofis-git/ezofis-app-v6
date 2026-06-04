// import SummaryMetric from './SummaryMetric'
import { type Table as TanstackTable } from '@tanstack/react-table'
// ✅ Motion
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { TableActionButton } from '@/components/base/data-table/TableActionBar'
import type { RowSize } from '@/components/base/data-table/types'
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

const extractValueFromTermObj = (termObj: any) => {
  if (!termObj || typeof termObj !== 'object') return termObj
  return (
    termObj.payment_terms ||
    termObj.terms ||
    termObj.payment_term ||
    termObj.term
  )
}

const extractPaymentTerms = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}

  // check termObj
  const termObj = row.payment_terms || row.paymentTerms || {}
  let val = extractValueFromTermObj(termObj)
  if (val && val !== '-') return String(val)

  // check row terms
  val = row.terms || row.payment_term || row.paymentTerms
  if (val && typeof val !== 'object' && val !== '-') return String(val)

  // check formData
  const fields = row.formData?.fields || {}
  const fd = row.formData || {}
  const keys = ['Payment Terms', 'payment_terms', 'Terms', 'terms']
  for (const k of keys) {
    const v = fields[k] || fd[k]
    if (v && v !== '-') return String(v)
  }

  // check agentData
  const agentTermObj = agentData.payment_terms || {}
  val = extractValueFromTermObj(agentTermObj)
  if (val && val !== '-') return String(val)

  const header = agentData['Extracted Invoice JSON']?.invoice_header || {}
  for (const k of keys) {
    const v = header[k]
    if (v && v !== '-') return String(v)
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
    if (Number.isNaN(invDate.getTime()) || Number.isNaN(dueDate.getTime()))
      return null
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
      return inner === undefined ? null : String(inner).trim()
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

const getAIInsight = (index: number): string => {
  const insights = [
    'Ready for auto-approval',
    'No PO linked — request PO or code to GL',
    'Partial match — review unmatched lines',
  ]
  return insights[index % 3]
}

const getCategory = (index: number): string => {
  const categories = ['Supplies', 'Software', 'Utilities', 'Travel']
  return categories[index % 4]
}

interface RowStatusBadgeProps {
  isProcessing: boolean
  originalIndex: number
  activeTab?: string
}

const RowStatusBadge = ({
  activeTab,
  isProcessing,
  originalIndex,
}: RowStatusBadgeProps) => {
  if (isProcessing) return null

  if (activeTab === 'Processed') {
    if (originalIndex % 2 === 0) {
      return (
        <span className='flex items-center gap-1 rounded-md border border-[var(--green-4)] bg-[var(--green-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
          <Icon className='size-3.5' name='tabler:circle-check' />
          Paid
        </span>
      )
    }
    return (
      <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
        <Icon className='size-3.5' name='tabler:clock' />
        Pending for Payment
      </span>
    )
  }

  if (originalIndex % 3 === 0) {
    return (
      <span className='flex items-center gap-1 rounded-md border border-[var(--green-4)] bg-[var(--green-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
        <Icon className='size-3.5' name='tabler:circle-check' />
        Matched
      </span>
    )
  }

  if (originalIndex % 3 === 1) {
    return (
      <span className='flex items-center gap-1 rounded-md border border-[var(--red-4)] bg-[var(--red-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--red-11)]'>
        <Icon className='size-3.5' name='tabler:alert-circle' />
        No Match
      </span>
    )
  }

  return (
    <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
      <Icon className='size-3.5' name='tabler:alert-triangle' />
      Partial Match
    </span>
  )
}

interface TermsColumnProps {
  raisedAt: any
  row: any
}

const TermsColumn = ({ raisedAt, row }: TermsColumnProps) => {
  const terms = extractPaymentTerms(row)
  const dueDate = extractDueDate(row)
  const daysDiff = calculateDaysDifference(raisedAt, dueDate)

  // Format terms in days (e.g. Net 30 -> 30 Days)
  let termsDisplay = terms === '-' ? 'Immediate' : terms
  if (termsDisplay.toLowerCase() === 'immediate') {
    termsDisplay = '0 Days'
  } else {
    // Extract numeric value from terms (e.g. "Net 30" -> "30 Days")
    const numMatch = /\d+/.exec(termsDisplay)
    if (numMatch) {
      termsDisplay = `${numMatch[0]} Days`
    }
  }

  // Calculation from invoice date
  let calculationText = 'Immediate'
  let calculationTheme =
    'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'

  if (daysDiff === null) {
    // fallback to terms numeric days diff if due date is not clear
    const numMatch = /\d+/.exec(terms)
    if (numMatch) {
      const days = Number.parseInt(numMatch[0], 10)
      calculationText = `In ${days} days`
      calculationTheme =
        days <= 15
          ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
          : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
    }
  } else if (daysDiff > 0) {
    calculationText = `In ${daysDiff} days`
    calculationTheme =
      daysDiff <= 15
        ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
        : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
  } else if (daysDiff < 0) {
    calculationText = `${Math.abs(daysDiff)}d Overdue`
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
}

interface GridRowItemProps {
  index: number
  isSelected: boolean
  row: any
  activeTab?: string
  toggleRowSelection: (id: string | number, e: React.MouseEvent) => void
  onRowClick: (item: any, tab: string) => void
}

const GridRowItem = ({
  activeTab,
  index,
  isSelected,
  row,
  toggleRowSelection,
  onRowClick,
}: GridRowItemProps) => {
  const originalIndex =
    typeof row?._originalIndex === 'number' ? row._originalIndex : index
  const rowId = row?.id || row?.processId || `item-${originalIndex}`
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
    row['suyqsm0SYii_8vsj4p0c_'] || row['WksH1Mrs42X4J9AHgoBtw'] || 0,
  )
  const status = row?.status || 'Pending'

  const aiInsight = getAIInsight(originalIndex)

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
        {!row.isProcessing && (
          <label className='relative flex cursor-pointer items-center'>
            <input
              checked={isSelected}
              className='sr-only'
              type='checkbox'
              onChange={() => {}}
              onClick={(e) => {
                e.stopPropagation()
                toggleRowSelection(rowId, e)
              }}
            />
            <div
              className={cn(
                'flex size-5 items-center justify-center rounded-md border-2 transition-all',
                isSelected
                  ? 'border-[var(--primary-9)] bg-surface'
                  : 'border-[var(--gray-3)] bg-surface group-hover:border-[var(--primary-9)]',
              )}
            >
              {isSelected && (
                <Icon
                  className='size-3.5 stroke-[3px] text-[var(--primary-9)]'
                  name='tabler:check'
                />
              )}
            </div>
          </label>
        )}
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
            iconColorClass,
          )}
        >
          <Icon
            className={cn('size-5', row.isProcessing && 'animate-spin')}
            name={iconName}
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
          <RowStatusBadge
            activeTab={activeTab}
            isProcessing={row.isProcessing}
            originalIndex={originalIndex}
          />
        </div>

        {/* Sub-metadata row */}
        <div className='flex items-center gap-4 text-[12px] font-medium text-[var(--gray-10)]'>
          <div className='flex items-center gap-1.5'>
            <Icon className='size-3.5' name='tabler:hash' />
            <span>
              {row.isProcessing ? 'Fetching...' : extractPONumber(row)}
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
                <span>{getCategory(originalIndex)}</span>
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
              <TermsColumn raisedAt={raisedAt} row={row} />
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
                    try {
                      return new Date(rawDate).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    } catch {
                      return 'May 19, 2026'
                    }
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
}

interface GridViewProps<TData> {
  data: any[]
  isLoading: boolean
  table: TanstackTable<TData>
  actions?: TableActionButton[]
  activeTab?: string
  hideGrouping?: boolean
  isReloading?: boolean
  rowSize?: RowSize
  onNewRequest?: () => void
  onReload?: () => void
  onRowClick: (item: any, tab: string) => void
  onRowSizeChange?: (size: RowSize) => void
}

const GridView = <TData,>({
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

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab])

  const exitSelectionMode = () => {
    setSelectedIds(new Set())
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

  const checkboxBorderClass =
    isAllSelected || isPartiallySelected
      ? 'border-[var(--primary-9)] bg-surface'
      : 'border-[var(--gray-3)] bg-surface hover:border-[var(--primary-9)]'

  return (
    <>
      <div className='flex h-full flex-col overflow-hidden'>
        <div className='sticky top-0 z-20 flex items-center justify-between border-b border-[var(--gray-2)] bg-surface/70 py-1 pr-4 pl-7 backdrop-blur-sm'>
          <div className='flex items-center gap-4'>
            {allItems.length > 0 && (
              <label className='relative flex cursor-pointer items-center'>
                <input
                  checked={isAllSelected}
                  className='sr-only'
                  type='checkbox'
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySelected
                  }}
                  onChange={toggleAllSelection}
                />
                <div
                  className={cn(
                    'flex size-5 items-center justify-center rounded-md border-2 transition-all',
                    checkboxBorderClass,
                  )}
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
              </label>
            )}
            <span className='text-[14px] font-medium text-[var(--text-primary)]'>
              Invoices{' '}
              {selectedIds.size > 0 && (
                <span className='ml-1 text-[var(--gray-10)]'>
                  ({selectedIds.size})
                </span>
              )}
            </span>
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
                {actions?.map((a, idx) => (
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
                    {a.icon ? <Icon className='size-4' name={a.icon} /> : null}
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
                return (
                  <GridRowItem
                    activeTab={activeTab}
                    index={index}
                    isSelected={isSelected}
                    key={rowId}
                    row={row}
                    toggleRowSelection={toggleRowSelection}
                    onRowClick={onRowClick}
                  />
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
