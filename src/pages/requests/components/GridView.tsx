import { useMemo, useState } from 'react'
// import { generateDummySummary } from '@/pages/requests/utils/dummyData'
// import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
import { formatDatetime } from '@/utils/dayjs'
import cn from '@/utils/cn'
// import SummaryMetric from './SummaryMetric'
import { type Table as TanstackTable } from '@tanstack/react-table'
import type { TableActionButton } from '@/components/base/data-table/TableActionBar'
import type { RowSize } from '@/components/base/data-table/types'
// import RequestSummary from './RequestSummary'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import type { Option } from '@/types/option'

// ✅ Table Actions imports
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import TableFilters from '@/components/base/data-table/actions/TableFilters'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableReload from '@/components/base/data-table/actions/TableReload'

// ✅ Motion
import { motion, useReducedMotion } from 'framer-motion'

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

const itemVariantSet = () => ({

  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
  rowHover: { scale: 1.005, backgroundColor: 'var(--gray-1)' },
})



const findPONumberInObject = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null;

  const extractStringValue = (val: any): string | null => {
    if (val == null) return null;
    if (typeof val === 'object') {
      const innerVal = val['Invoice Value'] || val['InvoiceValue'] || val['PO Value'] || val['POValue'] || val['value'] || val['val'];
      if (innerVal !== undefined) return extractStringValue(innerVal);
      return null;
    }
    const str = String(val).trim();
    return (str !== '' && str !== '-' && str.toUpperCase() !== 'N/A') ? str : null;
  };

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    const isStrictPOKey = 
      lowerKey === 'po' || 
      lowerKey === 'po_number' || 
      lowerKey === 'ponumber' || 
      lowerKey === 'po number' || 
      lowerKey === 'purchase_order_number' || 
      lowerKey === 'purchaseorder_number' || 
      lowerKey === 'purchase order number' || 
      lowerKey === 'rxwlghillrremmrqlk9mj' ||
      lowerKey.includes('purchase order');

    if (isStrictPOKey) {
      if (!lowerKey.includes('value') && !lowerKey.includes('amount') && !lowerKey.includes('total') && !lowerKey.includes('date') && !lowerKey.includes('price')) {
        const extracted = extractStringValue(obj[key]);
        if (extracted && extracted !== '-' && extracted !== '') {
          return extracted;
        }
      }
    }
  }

  return null;
};

const extractPONumber = (row: any): string => {
  if (!row) return 'N/A';
  const agentData = row._agentData?.[0] || row._agentData || {};
  
  const fromForm = findPONumberInObject(row.formData?.fields) || findPONumberInObject(row.formData);
  if (fromForm) return fromForm;

  const fromAgentHeader = findPONumberInObject(agentData?.['Extracted Invoice JSON']?.invoice_header);
  if (fromAgentHeader) return fromAgentHeader;

  const fromPOMatching = findPONumberInObject(agentData?.po_matching);
  if (fromPOMatching) return fromPOMatching;

  const fromAgent = findPONumberInObject(agentData);
  if (fromAgent) return fromAgent;

  const fromSelected = findPONumberInObject(row);
  if (fromSelected) return fromSelected;

  return 'N/A';
};

const extractDueDate = (row: any): string => {
  if (!row) return '-';
  const agentData = row._agentData?.[0] || row._agentData || {};
  const val = row.dueDate || 
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
              agentData?.po_matching?.due_date;
  if (!val || val === '-') return '-';
  try {
    return formatDatetime(val as string, 'date');
  } catch {
    return String(val);
  }
};

const extractPaymentTerms = (row: any): string => {
  if (!row) return '-';
  const agentData = row._agentData?.[0] || row._agentData || {};
  
  let termObj = row.payment_terms || row.paymentTerms || {};
  let val = typeof termObj === 'object' ? (termObj.payment_terms || termObj.terms || termObj.payment_term || termObj.term) : termObj;
  if (val && val !== '-') return String(val);

  val = row.terms || row.payment_term || row.paymentTerms;
  if (val && typeof val !== 'object' && val !== '-') return String(val);

  val = row.formData?.fields?.['Payment Terms'] || row.formData?.fields?.['payment_terms'] || row.formData?.fields?.['Terms'] || row.formData?.fields?.['terms'] ||
        row.formData?.['Payment Terms'] || row.formData?.['payment_terms'] || row.formData?.['Terms'] || row.formData?.['terms'];
  if (val && val !== '-') return String(val);

  if (agentData) {
    let agentTermObj = agentData.payment_terms || {};
    val = typeof agentTermObj === 'object' ? (agentTermObj.payment_terms || agentTermObj.terms || agentTermObj.payment_term || agentTermObj.term) : agentTermObj;
    if (val && val !== '-') return String(val);

    const header = agentData['Extracted Invoice JSON']?.invoice_header || {};
    val = header['Payment Terms'] || header['payment_terms'] || header['Terms'] || header['terms'];
    if (val && val !== '-') return String(val);
  }

  return '-';
};

const calculateDaysDifference = (invoiceDateStr: any, dueDateStr: any): number | null => {
  if (!invoiceDateStr || !dueDateStr || dueDateStr === '-') return null;
  try {
    const invDate = new Date(invoiceDateStr);
    const dueDate = new Date(dueDateStr);
    if (isNaN(invDate.getTime()) || isNaN(dueDate.getTime())) return null;
    const diffTime = dueDate.getTime() - invDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
};

const extractInvoiceDate = (row: any): string => {
  if (!row) return '-';
  const agentData = row._agentData?.[0] || row._agentData || {};
  
  // 1. Check dynamic field key 9F6tPVHoRnmONGx3kYJu2 in fields and row
  const fromForm9F = row.formData?.fields?.['9F6tPVHoRnmONGx3kYJu2'] || row['9F6tPVHoRnmONGx3kYJu2'];
  if (fromForm9F && fromForm9F !== '-') return String(fromForm9F).trim();

  // 2. Check general Invoice Date keys
  const exactKeys = [
    'Invoice Date', 'invoice_date', 'invoiceDate', 'Date', 'date', '9F6tPVHoRnmONGx3kYJu2'
  ];
  
  const extractVal = (val: any): string | null => {
    if (val == null) return null;
    if (typeof val === 'object') {
      const inner = val['Invoice Value'] || val['value'] || val['val'] || val['text'];
      return inner !== undefined ? String(inner).trim() : null;
    }
    return String(val).trim();
  };

  const fields = row.formData?.fields || {};
  for (const key of exactKeys) {
    const v = extractVal(fields[key]) || extractVal(row[key]);
    if (v && v !== '-' && v !== '') return v;
  }

  // 3. Check agentData Extracted Invoice JSON
  const agentHeader = agentData?.['Extracted Invoice JSON']?.invoice_header || {};
  for (const key of exactKeys) {
    const v = extractVal(agentHeader[key]);
    if (v && v !== '-' && v !== '') return v;
  }

  // 4. Fallback to row.raisedAt or row.transaction_createdAt
  const raisedAt = row.raisedAt || row.transaction_createdAt || row.createdAt;
  if (raisedAt) return String(raisedAt);

  return '-';
};

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

// Simple highlighting logic for common terms in tooltips
const renderHighlightedContent = (text: string) => {
  if (!text) return null;

  // Highlight percentages, scores, and statuses
  const parts = text.split(/(\d+%|Approved|Partially Approved|Matched|Discrepancy|Aligned|Threshold)/gi);
  return parts.map((part, i) => {
    const lower = part.toLowerCase();
    if (/\d+%/.test(part)) return <span key={i} className="text-[var(--primary-9)] font-bold">{part}</span>;
    if (lower === 'approved' || lower === 'matched' || lower === 'aligned') return <span key={i} className="text-[var(--green-9)] font-bold">{part}</span>;
    if (lower === 'partially approved' || lower === 'threshold') return <span key={i} className="text-[var(--orange-9)] font-bold">{part}</span>;
    if (lower === 'discrepancy') return <span key={i} className="text-[var(--red-9)] font-bold">{part}</span>;
    return part;
  });
};

const GridView = <TData extends unknown>({
  data,
  isLoading,
  onRowClick,
  actions,
  table,
  isReloading,
  onReload,
  rowSize: _rowSize,
  onRowSizeChange: _onRowSizeChange,
  hideGrouping: _hideGrouping,
}: GridViewProps<TData>) => {
  const prefersReducedMotion = useReducedMotion()
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [hoveredRowId, setHoveredRowId] = useState<string | number | null>(null)

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
      <div className="flex flex-col gap-3 p-2">
        {[1, 2, 3].map((i) => (
          <GridRowSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }

  const isAllSelected = allItems.length > 0 && selectedIds.size === allItems.length
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < allItems.length

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="pl-7 pr-4 py-1 flex items-center justify-between border-b border-[var(--gray-2)] bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div
              onClick={toggleAllSelection}
              className={cn(
                "size-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all",
                isAllSelected ? "bg-white border-[var(--primary-9)]" :
                  isPartiallySelected ? "bg-white border-[var(--primary-9)]" :
                    "bg-white border-[var(--gray-3)] hover:border-[var(--primary-9)]"
              )}
            >
              {isAllSelected && <Icon name="tabler:check" className="size-3.5 text-[var(--primary-9)] stroke-[3px]" />}
              {isPartiallySelected && <div className="size-2 rounded-sm bg-[var(--primary-9)]" />}
            </div>
            <span className="text-[14px] font-medium text-[#0F172A]">
              Invoices {selectedIds.size > 0 && <span className="text-[var(--gray-10)] ml-1">({selectedIds.size})</span>}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="px-2.5 py-1 bg-[var(--primary-2)] border border-[var(--primary-3)] text-[var(--primary-11)] text-[12px] font-semibold rounded-md animate-pulse">
                  {selectedIds.size} Selected
                </span>

                <button
                  type="button"
                  onClick={() => {
                    alert(`Bulk approved ${selectedIds.size} requests successfully!`);
                    setSelectedIds(new Set());
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--green-9)] px-3 py-1.5 text-12 font-semibold text-white hover:bg-[var(--green-10)] shadow-sm hover:shadow-md active:scale-95 transition-all"
                >
                  <Icon name="tabler:circle-check" className="size-4" />
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => {
                    alert(`Bulk rejected ${selectedIds.size} requests successfully!`);
                    setSelectedIds(new Set());
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--red-2)] border border-[var(--red-3)] px-3 py-1.5 text-12 font-semibold text-[var(--red-11)] hover:bg-[var(--red-3)] shadow-sm hover:shadow-md active:scale-95 transition-all"
                >
                  <Icon name="tabler:trash-2" className="size-4 text-[var(--red-9)]" />
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--gray-3)] bg-white px-2.5 py-1.5 text-12 font-medium text-[var(--gray-11)] hover:bg-[var(--gray-1)] hover:text-[var(--gray-13)] transition-all"
                >
                  <Icon name="tabler:x" className="size-3.5" />
                  Clear
                </button>
              </motion.div>
            ) : (
              <>
                <TableSearch table={table} />
                <TableFilters table={table} />
                <TableExport table={table} />
                <TableReload isReloading={isReloading || false} onReload={onReload || (() => { })} />

                {/* Custom Actions */}
                {actions && actions.map((a, idx) => (
                  <button
                    disabled={a.disabled}
                    key={`${a.label}-${idx}`}
                    title={a.title ?? a.label}
                    type='button'
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--secondary-9)] px-3 py-1.5 text-12 font-semibold text-white hover:bg-[var(--secondary-10)] shadow-sm hover:shadow-md active:scale-95 transition-all',
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

        <div className="flex-1 min-h-0 overflow-y-auto">

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
            <div className="flex flex-col gap-2.5 px-2 pt-3 pb-4">
              {allItems.map((row: any, index: number) => {
                const originalIndex = typeof row?._originalIndex === 'number' ? row._originalIndex : index
                const rowId = row?.id || row?.processId || `item-${originalIndex}`
                const isSelected = selectedIds.has(rowId)
                const invoiceNo = row?.documentNumber || row?.['kvcYuknkDumkTenjvrVLj'] || row?.invoiceNo || row?.requestNo || `INV-${rowId}`
                const supplierName = row?.vendor || row?.['UtfgJy6Z0qyfRC5Bclf-c'] || row?.raisedBy || 'Unknown Supplier'
                const raisedAt = row?.raisedAt || row?.transaction_createdAt
                const amount = Number(row["suyqsm0SYii_8vsj4p0c_"] || row["WksH1Mrs42X4J9AHgoBtw"] || 0)
                const status = row?.status || 'Pending'

                const aiInsight = originalIndex % 3 === 0 ? 'Ready for auto-approval' :
                  originalIndex % 3 === 1 ? 'No PO linked — request PO or code to GL' :
                    'Partial match — review unmatched lines'

                const aiInsightDetail = originalIndex % 3 === 0
                  ? "Invoice details perfectly align with Purchase Order PO-451. Supplier verification successful, duplicate detection negative, and GL account matching verified. Recommended for straight-through automated processing with high confidence (98%)."
                  : originalIndex % 3 === 1
                    ? "No matching Purchase Order found in the procurement ledger. Supplier verification completed successfully, but automated straight-through processing is blocked due to the missing PO validation. Action required: request PO from vendor or manually code this invoice to GL account 5100-001."
                    : "A partial matching discrepancy was detected on the line-items level. While the supplier verification and GL mapping are correct, there is a unit price mismatch on Line Item 3 compared to Purchase Order PO-453. Action required: review mismatched values and manually correct or approve the deviation."

                const aiScore = 98 - (originalIndex * 2)
                const aiScoreTextColor = aiScore >= 90
                  ? "text-[var(--green-11)]"
                  : aiScore >= 60
                    ? "text-[var(--orange-11)]"
                    : "text-[var(--red-11)]"
                const aiScoreBgColor = aiScore >= 90
                  ? "bg-[var(--green-9)]"
                  : aiScore >= 60
                    ? "bg-[var(--orange-9)]"
                    : "bg-[var(--red-9)]"

                // Exact Icon and Color matching from design
                let iconName = "tabler:clock"
                let iconColorClass = "bg-orange-2 border-orange-2 text-orange-9"

                if (status === 'Approved' || originalIndex % 5 === 0) {
                  iconName = "tabler:circle-check"
                  iconColorClass = "bg-green-2 border-green-2 text-green-9"
                } else if (row?.isDuplicateInvoice || originalIndex % 7 === 0) {
                  iconName = "tabler:stack-2"
                  iconColorClass = "bg-purple-2 border-purple-2 text-purple-9"
                } else if (originalIndex % 4 === 0) {
                  iconName = "tabler:circle-check"
                  iconColorClass = "bg-blue-2 border-blue-2 text-blue-9"
                }

                return (
                  <motion.div
                    key={rowId}
                    layout
                    variants={itemVariantSet() as any}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    whileHover={{
                      boxShadow: '0 6px 12px -4px rgba(0,0,0,0.08)'
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onMouseEnter={() => setHoveredRowId(rowId)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    style={{ zIndex: hoveredRowId === rowId ? 99999 : 1 }}
                    onClick={() => onRowClick(row, 'Overview')}
                    className={cn(
                      'group relative flex w-full items-center gap-4 rounded-xl border px-5 py-3 transition-all cursor-pointer',
                      isSelected ? 'border-[var(--primary-3)] bg-[var(--primary-1)]' : 'border-[var(--gray-2)] bg-[var(--surface)]'
                    )}
                  >
                    {/* Checkbox & Status Icon */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div
                        onClick={(e) => toggleRowSelection(rowId, e)}
                        className={cn(
                          "size-5 rounded-md border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-white border-[var(--primary-9)]" : "bg-white border-[var(--gray-3)] group-hover:border-[var(--primary-9)]"
                        )}
                      >
                        {isSelected && <Icon name="tabler:check" className="size-3.5 text-[var(--primary-9)] stroke-[3px]" />}
                      </div>
                      <div className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300",
                        iconColorClass
                      )}>
                        <Icon name={iconName} className="size-5" />
                      </div>
                    </div>

                    {/* Main Content: Identity & Metadata */}
                    <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="truncate text-[15px]  text-[#0F172A] tracking-tight" style={{ fontWeight: 500 }}>
                          {invoiceNo}
                        </h3>
                        <span className="text-[12px] text-[var(--gray-10)]">
                          {supplierName}
                        </span>
                        {originalIndex % 4 === 1 && (
                          <span className="bg-[var(--blue-2)] text-[var(--blue-11)] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[var(--blue-4)] flex items-center gap-1">
                            <Icon name="tabler:file-alert" className="size-3.5" />
                            Missing PO
                          </span>
                        )}
                        {originalIndex % 4 === 2 && (
                          <span className="bg-[var(--purple-2)] text-[var(--purple-11)] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[var(--purple-4)] flex items-center gap-1">
                            <Icon name="tabler:scan" className="size-3.5" />
                            OCR Low
                          </span>
                        )}
                        {originalIndex % 4 === 3 && (
                          <span className="bg-[var(--orange-2)] text-[var(--orange-11)] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[var(--orange-4)] flex items-center gap-1">
                            <Icon name="tabler:arrows-split" className="size-3.5" />
                            PO Mismatch
                          </span>
                        )}
                      </div>

                      {/* Sub-metadata row */}
                      <div className="flex items-center gap-4 text-[12px] text-[var(--gray-10)] font-medium">
                        <div className="flex items-center gap-1.5">
                          <Icon name="tabler:hash" className="size-3.5" />
                          <span>{extractPONumber(row)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--gray-8)]">
                          <Icon name="tabler:stack" className="size-3.5" />
                          <span>5100-00{originalIndex + 1}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--gray-8)]">
                          <Icon name="tabler:tag" className="size-3.5" />
                          <span>{originalIndex % 4 === 0 ? 'Supplies' : originalIndex % 4 === 1 ? 'Software' : originalIndex % 4 === 2 ? 'Utilities' : 'Travel'}</span>
                        </div>
                      </div>

                      {/* AI Insight Line */}
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-teal-600">
                        <Icon name="tabler:sparkles" className="size-3.5" />
                        <span>{aiInsight}</span>
                      </div>
                    </div>
                    {/* Columns 1-4 perfectly aligned across all rows */}
                    <div className="flex items-center gap-6 shrink-0 select-none ml-auto">
                      {/* Column 1: Match Status */}
                      <div className="w-[110px] flex justify-center shrink-0">
                        {originalIndex % 3 === 0 ? (
                          <div className="w-[100px] text-center text-[12px] font-semibold px-2.5 py-0.5 rounded-full border border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]">
                            Matched
                          </div>
                        ) : originalIndex % 3 === 1 ? (
                          <div className="w-[100px] text-center text-[12px] font-semibold px-2.5 py-0.5 rounded-full border border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]">
                            No Match
                          </div>
                        ) : (
                          <div className="w-[100px] text-center text-[12px] font-semibold px-2.5 py-0.5 rounded-full border border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]">
                            Partial Match
                          </div>
                        )}
                      </div>

                      {/* Column 2: AI Score */}
                      <div className="relative group/aiscore z-10 hover:z-[9999] flex flex-col gap-1 w-[130px] shrink-0 cursor-pointer justify-center">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--gray-11)] uppercase tracking-wide">
                            <Icon name="tabler:sparkles" className="size-3.5 text-[var(--gray-9)]" />
                            <span>AI Score</span>
                          </div>
                          <span className={cn(
                            "text-[13px] font-bold",
                            aiScoreTextColor
                          )}>
                            {aiScore}%
                          </span>
                        </div>
                        <div className="h-[4px] w-full bg-[var(--gray-2)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${aiScore}%` }}
                            className={cn(
                              "h-full rounded-full",
                              aiScoreBgColor
                            )}
                          />
                        </div>

                        {/* Hover Overlay Tooltip showing AI Insights */}
                        <div
                          style={{ zIndex: 999999 }}
                          className={cn(
                            "pointer-events-none invisible absolute left-1/2 w-[360px] -translate-x-1/2 opacity-0 transition-all duration-300 group-hover/aiscore:visible group-hover/aiscore:opacity-100",
                            originalIndex < 2
                              ? "top-full mt-3 -translate-y-2 group-hover/aiscore:translate-y-0"
                              : "bottom-full mb-3 translate-y-2 group-hover/aiscore:translate-y-0"
                          )}
                        >
                          <div
                            style={{ backgroundColor: '#ffffff', opacity: 1 }}
                            className="relative rounded-xl border border-[var(--gray-3)] p-4 shadow-2xl overflow-hidden"
                          >
                            {/* Decorative background circle */}
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-20 w-20 rounded-full bg-[var(--teal-9)] opacity-10 blur-2xl pointer-events-none" />

                            <div className="flex items-center gap-2 mb-2 relative z-10">
                              <div className="p-1 rounded-md bg-[var(--primary-1)] text-[var(--primary-9)]">
                                <Icon name="tabler:sparkles" className="size-4" />
                              </div>
                              <span className="text-[11px] font-bold text-[var(--gray-12)] tracking-wide">
                                Invoice Decision Details
                              </span>
                            </div>

                            <div className="bg-[var(--primary-1)]/50 rounded-lg border border-[var(--primary-2)] p-3 relative z-10">
                              <p className="text-[12px] text-[var(--gray-12)] font-medium leading-relaxed">
                                {renderHighlightedContent(aiInsightDetail)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Terms & Due Calculation */}
                      <div className="w-[110px] flex flex-col items-center justify-center text-center shrink-0">
                        {(() => {
                          const terms = extractPaymentTerms(row);
                          const dueDate = extractDueDate(row);
                          const daysDiff = calculateDaysDifference(raisedAt, dueDate);
                          
                          // Format terms in days (e.g. Net 30 -> 30 Days)
                          let termsDisplay = terms !== '-' ? terms : 'Immediate';
                          if (termsDisplay.toLowerCase() === 'immediate') {
                            termsDisplay = '0 Days';
                          } else {
                            // Extract numeric value from terms (e.g. "Net 30" -> "30 Days")
                            const numMatch = termsDisplay.match(/\d+/);
                            if (numMatch) {
                              termsDisplay = `${numMatch[0]} Days`;
                            }
                          }

                          // Calculation from invoice date
                          let calculationText = 'Immediate';
                          let calculationTheme = 'border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]';

                          if (daysDiff !== null) {
                            if (daysDiff > 0) {
                              calculationText = `In ${daysDiff} days`;
                              if (daysDiff <= 15) {
                                calculationTheme = 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]';
                              } else {
                                calculationTheme = 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]';
                              }
                            } else if (daysDiff < 0) {
                              calculationText = `${Math.abs(daysDiff)}d Overdue`;
                              calculationTheme = 'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]';
                            }
                          } else {
                            // fallback to terms numeric days diff if due date is not clear
                            const numMatch = terms.match(/\d+/);
                            if (numMatch) {
                              const days = parseInt(numMatch[0]);
                              calculationText = `In ${days} days`;
                              calculationTheme = days <= 15 ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]' : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]';
                            }
                          }

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[12px] font-semibold text-[var(--gray-12)] tracking-tight">
                                {termsDisplay}
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase",
                                calculationTheme
                              )}>
                                {calculationText}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Column 4: Invoice Value & Date */}
                      <div className="flex flex-col items-end w-[115px] shrink-0">
                        <span className="text-[15px] text-[#0F172A] tabular-nums tracking-tight leading-none" style={{ fontWeight: 600 }}>
                          ${(amount || 3450).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[12px] font-medium text-[var(--gray-10)] mt-1.5">
                          {(() => {
                            const rawDate = extractInvoiceDate(row);
                            return rawDate !== '-' ? formatDatetime(rawDate, 'MMM DD, YYYY') : '-';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Arrow */}
                    <div className="w-6 flex items-center justify-end shrink-0 select-none">
                      <Icon
                        name="tabler:arrow-right"
                        className="size-5 text-[var(--gray-8)] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-4px] group-hover:translate-x-0"
                      />
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