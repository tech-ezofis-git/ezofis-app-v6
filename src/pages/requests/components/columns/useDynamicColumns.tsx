import React, { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
// ✅ Menu UI
import IconButton from '@/components/base/button/IconButton'
// import SummaryBadge from '@/components/common/SummaryBadge'
// import { generateDummySummary } from '@/pages/requests/utils/dummyData'
// import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import {
  buildTableMeta,
  getFieldKey,
  getFieldLabel,
  isIgnorableField,
  isParentField,
  isTableType,
} from '@/pages/requests/utils/dynamicTable.utils'
import { safeParse } from '@/pages/requests/utils/workflow.utils'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import type { WorkflowOption } from '../../types'
import HoverExpandableText from '../HoverExpandableText'
import DynamicTableCell from './components/DynamicTableCell'
// ✅ Your generic FileSheet (React version)
// import FileSheet from '@/components/common/file-sheet/FileSheet'
// add this import near the top
import FileUploadCell from './components/FileUploadCell'
import WrapOnHoverCell from './components/WrapOnHoverCell'

const LINK_TEXT =
  'transition-colors cursor-pointer font-medium underline hover:text-gray-13 text-14'

const wrap = (content: React.ReactNode) => <WrapOnHoverCell value={content} />

const resolveFormJson = (workflow: WorkflowOption | null): any | null => {
  if (!workflow?.formJson) return null

  const raw = workflow.formJson

  if (typeof raw === 'string') {
    try {
      const parsed = safeParse(raw)
      return parsed || null
    } catch {
      return null
    }
  }

  return [raw]
}

// ✅ Local component for summary badges with hover cards
// const SummaryBadgeWithHover = ({ metric }: { metric: any }) => {
//     return (
//         <div className="relative group/icon">
//             <motion.div
//                 whileHover={{ scale: 1.05, y: -1 }}
//                 transition={{ type: 'spring', stiffness: 400, damping: 20 }}
//             >
//                 <SummaryBadge
//                     label={metric.badgeText || metric.shortText}
//                     icon={metric.icon}
//                     theme={metric.theme as any}
//                     variant="outline"
//                     className="cursor-default w-[160px]"
//                 />
//             </motion.div>

//             <AnimatePresence>
//                 <div className="absolute right-0 bottom-full mb-3 opacity-0 invisible group-hover/icon:opacity-100 group-hover/icon:visible transition-all duration-300 z-[100] pointer-events-none translate-y-2 group-hover/icon:translate-y-0">
//                     <motion.div
//                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
//                         whileInView={{ opacity: 1, y: 0, scale: 1 }}
//                         transition={{ type: 'spring', stiffness: 400, damping: 25 }}
//                         className="bg-white rounded-xl border border-[var(--gray-3)] shadow-xl p-4 min-w-[260px] overflow-hidden relative"
//                     >
//                         <div className={cn(
//                             "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -mr-16 -mt-16 pointer-events-none",
//                             metric.theme === 'green' ? 'bg-[var(--green-9)]' :
//                                 metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
//                                     metric.theme === 'red' ? 'bg-[var(--red-9)]' :
//                                         'bg-[var(--blue-9)]'
//                         )} />

//                         <div className="flex items-start justify-between mb-4 relative z-10">
//                             <div className="flex items-center gap-3">
//                                 <div className={cn(
//                                     "p-2 rounded-lg",
//                                     metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)]' :
//                                         metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)]' :
//                                             metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)]' :
//                                                 'bg-[var(--blue-2)] text-[var(--blue-11)]'
//                                 )}>
//                                     <Icon name={metric.icon} className="size-5" />
//                                 </div>
//                                 <div className="font-semibold text-[var(--gray-12)] text-13">
//                                     {metric.label}
//                                 </div>
//                             </div>
//                             <div className={cn(
//                                 "px-2 py-0.5 rounded-full text-11 font-medium border",
//                                 metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)] border-[var(--green-4)]' :
//                                     metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)] border-[var(--orange-4)]' :
//                                         metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)] border-[var(--red-4)]' :
//                                             'bg-[var(--blue-2)] text-[var(--blue-11)] border-[var(--blue-4)]'
//                             )}>
//                                 {metric.status}
//                             </div>
//                         </div>

//                         <div className="mb-4 relative z-10">
//                             <h4 className="text-24 font-bold text-[var(--gray-12)] tracking-tight">
//                                 {metric.value}
//                             </h4>
//                         </div>

//                         <div className="flex items-end justify-between relative z-10">
//                             <div className="flex flex-col gap-1.5 flex-1 mr-4">
//                                 <div className="flex items-center gap-1.5 text-[var(--gray-10)]">
//                                     <span className="text-12 font-medium">{metric.description}</span>
//                                     {metric.theme === 'red' && <Icon name="tabler:exclamation-circle" className="size-4 text-[var(--red-9)]" />}
//                                 </div>
//                                 <div className="h-1.5 w-full bg-[var(--gray-3)] rounded-full overflow-hidden">
//                                     <motion.div
//                                         initial={{ width: 0 }}
//                                         whileInView={{ width: `${metric.pct}%` }}
//                                         transition={{ duration: 0.5, delay: 0.1 }}
//                                         className={cn(
//                                             'h-full rounded-full',
//                                             metric.theme === 'green' ? 'bg-[var(--green-9)]' :
//                                                 metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
//                                                     metric.theme === 'red' ? 'bg-[var(--red-9)]' :
//                                                         'bg-[var(--blue-9)]'
//                                         )}
//                                     />
//                                 </div>
//                             </div>
//                             <motion.div
//                                 whileHover={{ x: 3 }}
//                                 className="flex items-center justify-center p-1.5 rounded-full bg-[var(--gray-2)] text-[var(--gray-10)]"
//                             >
//                                 <Icon name="tabler:chevron-right" className="size-4" />
//                             </motion.div>
//                         </div>
//                     </motion.div>
//                 </div>
//             </AnimatePresence>
//         </div>
//     )
// }

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

const extractInvoiceNumber = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}

  // 1. Check dynamic field key kvcYuknkDumkTenjvrVLj in fields and row
  const fromFormKvc =
    row.formData?.fields?.['kvcYuknkDumkTenjvrVLj'] ||
    row['kvcYuknkDumkTenjvrVLj']
  if (fromFormKvc && fromFormKvc !== '-') return String(fromFormKvc).trim()

  // 2. Check agent data
  const fromAgent =
    agentData?.['kvcYuknkDumkTenjvrVLj'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['Invoice Number'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['invoice_number'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['invoice_num'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['invoice_no'] ||
    agentData?.invoice_number ||
    agentData?.invoiceNumber ||
    agentData?.invoiceNo ||
    agentData?.reqNo

  if (fromAgent && fromAgent !== '-') return String(fromAgent).trim()

  // 3. Fallbacks
  const fallback =
    row.documentNumber ||
    row.invoiceNo ||
    row.invoiceNumber ||
    row.reqNo ||
    row.requestNo

  if (fallback && fallback !== '-') return String(fallback).trim()

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

const isStandardField = (field: any, label: string) => {
  const lowerLabel = String(label || '').toLowerCase()
  const type = String(field.type ?? '').toUpperCase()

  // Skip file uploads per user rule
  if (type === 'FILE_UPLOAD') return true

  // Standard invoice fields to avoid duplicates
  return (
    lowerLabel.includes('po number') ||
    lowerLabel === 'po' ||
    lowerLabel === 'po_number' ||
    lowerLabel.includes('due date') ||
    lowerLabel === 'due_date' ||
    lowerLabel === 'terms' ||
    lowerLabel.includes('payment terms') ||
    lowerLabel === 'payment_term' ||
    lowerLabel === 'payment_terms' ||
    lowerLabel.includes('invoice date') ||
    lowerLabel === 'invoice_date' ||
    lowerLabel === 'date' ||
    field.jsonId === '9F6tPVHoRnmONGx3kYJu2' ||
    lowerLabel.includes('vendor') ||
    lowerLabel.includes('supplier') ||
    lowerLabel === 'raised by' ||
    lowerLabel.includes('amount') ||
    lowerLabel.includes('total') ||
    lowerLabel.includes('value')
  )
}

const StatusCell = ({
  originalIndex,
  row,
}: {
  originalIndex: number
  row: any
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const rowId = row?.id || row?.processId || `item-${originalIndex}`
  const status = row?.status || 'Pending'

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
    <div
      className='relative flex size-9 items-center justify-center'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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

      {row.isProcessing && isHovered && (
        <div
          className='pointer-events-none absolute top-1/2 left-full ml-2 w-[360px] -translate-y-1/2 text-left transition-all duration-300'
          style={{ zIndex: 999999 }}
        >
          <div
            className='animate-in fade-in zoom-in-95 relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-white p-5 shadow-2xl duration-200'
            style={{ opacity: 1 }}
          >
            <div className='pointer-events-none absolute top-0 right-0 -mt-10 -mr-10 h-20 w-20 rounded-full bg-[var(--orange-9)] opacity-10 blur-2xl' />

            {/* Title / Header */}
            <div className='relative z-10 mb-4 flex items-center justify-between border-b border-[var(--gray-2)] pb-2'>
              <div className='flex items-center gap-2'>
                <div className='rounded-lg bg-[var(--orange-2)] p-1.5 text-[var(--orange-9)]'>
                  <Icon
                    className='size-4 animate-spin'
                    name='tabler:loader-2'
                  />
                </div>
                <div>
                  <h4 className='text-[13px] font-bold text-[var(--gray-12)]'>
                    Extraction Progress
                  </h4>
                  <p className='text-[10px] text-[var(--gray-9)]'>
                    ID: {rowId}
                  </p>
                </div>
              </div>
              <span className='rounded bg-[var(--primary-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary-11)]'>
                {row.stage || 'Start'}
              </span>
            </div>

            {/* Stepper Content */}
            {(() => {
              const stage = row.stage || 'Start'
              let step2Status = 'pending'
              let step3Status = 'pending'
              let step4Status = 'pending'

              if (stage === 'Start') {
                step2Status = 'active'
              } else if (stage === 'AI Agent') {
                step2Status = 'completed'
                step3Status = 'active'
              } else if (stage === 'Verifier') {
                step2Status = 'completed'
                step3Status = 'completed'
                step4Status = 'active'
              } else if (['Approved', 'Completed'].includes(stage)) {
                step2Status = 'completed'
                step3Status = 'completed'
                step4Status = 'completed'
              }

              return (
                <div className='relative z-10 flex flex-col pl-2'>
                  {/* Step 1: Upload */}
                  <div className='relative flex gap-3 pb-5'>
                    {/* Line */}
                    <div className='absolute top-5 bottom-0 left-[9px] w-0.5 bg-[var(--green-9)]' />
                    {/* Circle */}
                    <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-9)] text-white ring-4 ring-[var(--green-2)]'>
                      <Icon
                        className='size-3 stroke-[3px]'
                        name='tabler:check'
                      />
                    </div>
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-[12px] font-bold text-[var(--gray-12)]'>
                        Upload & Ingestion
                      </span>
                      <span className='text-[10px] leading-normal text-[var(--gray-10)]'>
                        Invoice document successfully received and parsed.
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Extraction */}
                  <div className='relative flex gap-3 pb-5'>
                    {/* Line */}
                    <div
                      className={cn(
                        'absolute top-5 bottom-0 left-[9px] w-0.5',
                        step2Status === 'completed'
                          ? 'bg-[var(--green-9)]'
                          : 'bg-[var(--gray-3)]',
                      )}
                    />
                    {/* Circle */}
                    {step2Status === 'completed' ? (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-9)] text-white ring-4 ring-[var(--green-2)]'>
                        <Icon
                          className='size-3 stroke-[3px]'
                          name='tabler:check'
                        />
                      </div>
                    ) : step2Status === 'active' ? (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--primary-9)] bg-white ring-4 ring-[var(--primary-2)]'>
                        <div className='size-1.5 animate-pulse rounded-full bg-[var(--primary-9)]' />
                      </div>
                    ) : (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--gray-4)] bg-white text-[var(--gray-8)]'>
                        <div className='size-1.5 rounded-full bg-[var(--gray-4)]' />
                      </div>
                    )}
                    <div className='flex flex-col gap-0.5'>
                      <span
                        className={cn(
                          'text-[12px] font-bold',
                          step2Status === 'active'
                            ? 'text-[var(--primary-9)]'
                            : 'text-[var(--gray-12)]',
                        )}
                      >
                        Data Extraction (OCR)
                      </span>
                      <span className='text-[10px] leading-normal text-[var(--gray-10)]'>
                        AI Agent is reading metadata, headers, line items &
                        amounts.
                      </span>
                    </div>
                  </div>

                  {/* Step 3: PO Matching */}
                  <div className='relative flex gap-3 pb-5'>
                    {/* Line */}
                    <div
                      className={cn(
                        'absolute top-5 bottom-0 left-[9px] w-0.5',
                        step3Status === 'completed'
                          ? 'bg-[var(--green-9)]'
                          : 'bg-[var(--gray-3)]',
                      )}
                    />
                    {/* Circle */}
                    {step3Status === 'completed' ? (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-9)] text-white ring-4 ring-[var(--green-2)]'>
                        <Icon
                          className='size-3 stroke-[3px]'
                          name='tabler:check'
                        />
                      </div>
                    ) : step3Status === 'active' ? (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--primary-9)] bg-white ring-4 ring-[var(--primary-2)]'>
                        <div className='size-1.5 animate-pulse rounded-full bg-[var(--primary-9)]' />
                      </div>
                    ) : (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--gray-4)] bg-white text-[var(--gray-8)]'>
                        <div className='size-1.5 rounded-full bg-[var(--gray-4)]' />
                      </div>
                    )}
                    <div className='flex flex-col gap-0.5'>
                      <span
                        className={cn(
                          'text-[12px] font-bold',
                          step3Status === 'active'
                            ? 'text-[var(--primary-9)]'
                            : 'text-[var(--gray-12)]',
                        )}
                      >
                        PO Matching & Verification
                      </span>
                      <span className='text-[10px] leading-normal text-[var(--gray-10)]'>
                        Matching invoice items with PO and checking policy
                        compliance.
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Final Review */}
                  <div className='relative flex gap-3'>
                    {/* Circle */}
                    {step4Status === 'completed' ? (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-9)] text-white ring-4 ring-[var(--green-2)]'>
                        <Icon
                          className='size-3 stroke-[3px]'
                          name='tabler:check'
                        />
                      </div>
                    ) : step4Status === 'active' ? (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--primary-9)] bg-white ring-4 ring-[var(--primary-2)]'>
                        <div className='size-1.5 animate-pulse rounded-full bg-[var(--primary-9)]' />
                      </div>
                    ) : (
                      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--gray-4)] bg-white text-[var(--gray-8)]'>
                        <div className='size-1.5 rounded-full bg-[var(--gray-4)]' />
                      </div>
                    )}
                    <div className='flex flex-col gap-0.5'>
                      <span
                        className={cn(
                          'text-[12px] font-bold',
                          step4Status === 'active'
                            ? 'text-[var(--primary-9)]'
                            : 'text-[var(--gray-12)]',
                        )}
                      >
                        Final Verification Review
                      </span>
                      <span className='text-[10px] leading-normal text-[var(--gray-10)]'>
                        Routing the verified invoice to the final approval
                        queue.
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export const useDynamicColumns = (
  workflow: WorkflowOption | null,
  onRowClick: (item: any, tab: string) => void,
  selectedItem: any,
  /**
   * ✅ Optional: provide a real preview URL builder for your backend
   * Example: (file) => `/api/workflow/files/preview/${file.repositoryId}/${file.id}`
   */
  //getFilePreviewUrl?: (file: UploadedFile, row: any) => string,
) => {
  return useMemo(() => {
    const columns: Column[] = [
      {
        id: 'requestNo',
        label: 'Invoice Number',
        size: 260,
        renderCell: (row: any, index = 0) => (
          <div className='flex min-w-0 items-center gap-3'>
            <StatusCell originalIndex={index} row={row} />
            <div className='flex min-w-0 items-center gap-2'>
              <WrapOnHoverCell
                value={
                  <span
                    className={LINK_TEXT}
                    onClick={(e) => {
                      e?.stopPropagation?.()
                      onRowClick && onRowClick(row, 'Overview')
                    }}
                  >
                    {extractInvoiceNumber(row)}
                  </span>
                }
              />
              {row?.isDuplicateInvoice && (
                <RequestStatusBadge status='Duplicated' />
              )}
            </div>
          </div>
        ),
      },
      ...(selectedItem
        ? []
        : [
            {
              id: 'matchStatus',
              label: 'Match Status',
              size: 140,
              renderCell: (_row: any, index = 0) => {
                const matchType = index % 3
                if (matchType === 0) {
                  return (
                    <span className='flex items-center gap-1 rounded-md border border-[var(--green-4)] bg-[var(--green-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
                      <Icon className='size-3.5' name='tabler:circle-check' />
                      Matched
                    </span>
                  )
                } else if (matchType === 1) {
                  return (
                    <span className='flex items-center gap-1 rounded-md border border-[var(--red-4)] bg-[var(--red-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--red-11)]'>
                      <Icon className='size-3.5' name='tabler:alert-circle' />
                      No Match
                    </span>
                  )
                } else {
                  return (
                    <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
                      <Icon className='size-3.5' name='tabler:alert-triangle' />
                      Partial Match
                    </span>
                  )
                }
              },
            },
            {
              id: 'raisedBy',
              label: 'Raised By',
              size: 200,
              renderCell: (row: any) => {
                const supplierName =
                  row?.vendor ||
                  row?.['UtfgJy6Z0qyfRC5Bclf-c'] ||
                  row?.raisedBy ||
                  'Unknown Supplier'
                return (
                  <HoverExpandableText
                    className='text-[13px] font-medium text-[var(--gray-11)]'
                    fallbackText='Unknown Supplier'
                    normalMaxWidthClass='max-w-[180px]'
                    text={supplierName}
                  />
                )
              },
            },
            {
              id: 'glCodeCategory',
              label: 'GL & Category',
              size: 220,
              renderCell: (_row: any, index = 0) => {
                const category =
                  index % 4 === 0
                    ? 'Supplies'
                    : index % 4 === 1
                      ? 'Software'
                      : index % 4 === 2
                        ? 'Utilities'
                        : 'Travel'
                return (
                  <div className='flex items-center gap-2 text-[12px] font-medium text-[var(--gray-10)]'>
                    <div className='flex items-center gap-1 text-[var(--gray-8)]'>
                      <Icon className='size-3.5' name='tabler:stack' />
                      <span>5100-00{index + 1}</span>
                    </div>
                    <div className='flex items-center gap-1 text-[var(--gray-8)]'>
                      <Icon className='size-3.5' name='tabler:tag' />
                      <span>{category}</span>
                    </div>
                  </div>
                )
              },
            },
            {
              id: 'aiInsight',
              label: 'AI Insight',
              size: 260,
              renderCell: (_row: any, index = 0) => {
                const aiInsight =
                  index % 3 === 0
                    ? 'Ready for auto-approval'
                    : index % 3 === 1
                      ? 'No PO linked — request PO or code to GL'
                      : 'Partial match — review unmatched lines'
                return (
                  <div className='flex min-w-0 items-center gap-1.5'>
                    <Icon
                      className='size-3.5 shrink-0 text-[var(--primary-9)]'
                      name='tabler:sparkles'
                    />
                    <HoverExpandableText
                      className='text-[13px] font-medium text-[var(--gray-11)]'
                      normalMaxWidthClass='max-w-[220px]'
                      text={aiInsight}
                    />
                  </div>
                )
              },
            },
            {
              id: 'poNumber',
              label: 'PO Number',
              size: 160,
              renderCell: (row: any) => {
                const poNum = extractPONumber(row)
                return (
                  <div className='flex items-center gap-1.5 text-[12px] font-medium text-[var(--gray-10)]'>
                    <Icon className='size-3.5' name='tabler:hash' />
                    <span>{poNum}</span>
                  </div>
                )
              },
            },
            {
              id: 'termsDueDate',
              label: 'Due & Terms',
              size: 160,
              renderCell: (row: any) => {
                const terms = extractPaymentTerms(row)
                const dueDate = extractDueDate(row)
                const raisedAt = row?.raisedAt || row?.transaction_createdAt
                const daysDiff = calculateDaysDifference(raisedAt, dueDate)

                let termsDisplay = terms !== '-' ? terms : 'Immediate'
                if (termsDisplay.toLowerCase() === 'immediate') {
                  termsDisplay = '0 Days'
                } else {
                  const numMatch = termsDisplay.match(/\d+/)
                  if (numMatch) {
                    termsDisplay = `${numMatch[0]} Days`
                  }
                }

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
                  <div className='flex flex-col items-start gap-1'>
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
              },
            },
            {
              id: 'amount',
              label: 'Total Value',
              size: 140,
              renderCell: (row: any) => {
                const amount = Number(
                  row['suyqsm0SYii_8vsj4p0c_'] ||
                    row['WksH1Mrs42X4J9AHgoBtw'] ||
                    0,
                )
                return (
                  <span className='text-[14px] leading-none font-semibold tracking-tight text-[#0F172A] tabular-nums'>
                    $
                    {(amount || 3450).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )
              },
            },
            {
              id: 'invoiceDate',
              label: 'Invoice Date',
              size: 140,
              renderCell: (row: any) => {
                const rawDate = extractInvoiceDate(row)
                let dateDisplay = 'May 19, 2026'
                if (rawDate && rawDate !== '-') {
                  try {
                    dateDisplay = new Date(rawDate).toLocaleDateString(
                      'en-US',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      },
                    )
                  } catch {
                    // fallback
                  }
                }
                return (
                  <span className='text-[12px] font-medium text-[var(--gray-10)]'>
                    {dateDisplay}
                  </span>
                )
              },
            },
          ]),
    ]

    const form = resolveFormJson(workflow)
    if (!form) {
      columns.push(makeActionsColumn(onRowClick))
      return columns
    }

    const panels = Array.isArray((form as any).panels)
      ? (form as any).panels
      : []
    const secondaryPanels = Array.isArray((form as any).secondaryPanels)
      ? (form as any).secondaryPanels
      : []
    const rootPanels = Array.isArray(form) ? form : [form]

    const allPanels = [...rootPanels, ...panels, ...secondaryPanels]
    if (!allPanels.length) {
      columns.push(makeActionsColumn(onRowClick))
      return columns
    }

    const tableMetaByParentId = buildTableMeta(allPanels)

    allPanels.forEach((panel: any) => {
      const controls =
        panel?.controlList || panel?.controllist || panel?.fields || []

      controls.forEach((field: any) => {
        if (isIgnorableField(field)) return
        if (!isParentField(field)) return

        const fieldKey = getFieldKey(field) // Uses encrypted jsonId if available
        if (!fieldKey) return

        const label = getFieldLabel(field)

        if (isStandardField(field, label)) return

        if (!selectedItem) {
          columns.push({
            id: fieldKey,
            label,
            size: 200,
            renderCell: (row: any) => {
              let rawVal =
                row[fieldKey] ??
                row.formData?.fields?.[fieldKey] ??
                row.formData?.[fieldKey]

              const lowerLabel = String(label || '').toLowerCase()
              const isPOField =
                lowerLabel.includes('po number') ||
                lowerLabel === 'po' ||
                lowerLabel === 'po_number'
              const isDueDateField =
                lowerLabel.includes('due date') || lowerLabel === 'due_date'
              const isTermsField =
                lowerLabel === 'terms' ||
                lowerLabel.includes('payment terms') ||
                lowerLabel === 'payment_term' ||
                lowerLabel === 'payment_terms'
              const isInvoiceDateField =
                lowerLabel.includes('invoice date') ||
                lowerLabel === 'invoice_date' ||
                fieldKey === '9F6tPVHoRnmONGx3kYJu2'

              if (isPOField) {
                const extracted = extractPONumber(row)
                if (extracted && extracted !== 'N/A') {
                  rawVal = extracted
                }
              } else if (isDueDateField) {
                const extracted = extractDueDate(row)
                if (extracted && extracted !== '-') {
                  rawVal = extracted
                }
              } else if (isTermsField) {
                const extracted = extractPaymentTerms(row)
                if (extracted && extracted !== '-') {
                  rawVal = extracted
                }
              } else if (isInvoiceDateField) {
                const extracted = extractInvoiceDate(row)
                if (extracted && extracted !== '-') {
                  rawVal = extracted
                }
              }

              if (rawVal === undefined || rawVal === null || rawVal === '') {
                return <WrapOnHoverCell value='-' />
              }

              if (isTableType(field.type)) {
                const tableParentId = field?.id
                const colMeta =
                  tableParentId !== undefined && tableParentId !== null
                    ? tableMetaByParentId.get(String(tableParentId))
                    : undefined

                return (
                  <span className='inline-flex items-center'>
                    <DynamicTableCell
                      colMeta={colMeta}
                      modalWidth={900}
                      rawVal={rawVal}
                      safeParse={safeParse}
                      title={String(label)}
                    />
                  </span>
                )
              }

              const type = String(field.type ?? '').toUpperCase()

              switch (type) {
                case 'FILE_UPLOAD': {
                  // ✅ OPEN FILESHEET MODAL HERE
                  return wrap(<FileUploadCell rawVal={rawVal} row={row} />)
                }

                case 'DATE':
                  return (
                    <WrapOnHoverCell
                      value={formatDatetime(rawVal as string, 'date')}
                    />
                  )

                case 'CURRENCY':
                  return (
                    <WrapOnHoverCell
                      value={
                        <span className='text-gray-900 font-medium'>
                          {String(rawVal)}
                        </span>
                      }
                    />
                  )

                case 'NUMBER':
                  return <WrapOnHoverCell value={String(rawVal)} />

                default:
                  return <WrapOnHoverCell value={String(rawVal)} />
              }
            },
          } as Column)
        }
      })
    })

    if (!selectedItem) {
      columns.push(makeActionsColumn(onRowClick))
    }
    return columns
  }, [workflow, onRowClick, selectedItem])
}

function makeActionsColumn(
  onRowClick?: (row: any, tab: string) => void,
): Column {
  return {
    className: 'p-1',
    hideHeader: true,
    id: 'actions',
    isDisplayColumn: true,
    label: 'Actions',
    size: 40,
    renderCell: (row: any) => {
      const attachmentCount = Number(row?.attachmentCount ?? 0)
      const commentsCount = Number(row?.commentsCount ?? 0)

      const attachmentsLabel =
        attachmentCount > 0 ? `Attachments (${attachmentCount})` : 'Attachments'
      const commentsLabel =
        commentsCount > 0 ? `Comments (${commentsCount})` : 'Comments'

      return (
        <div className='flex items-center justify-center'>
          <Menu
            position='bottom-end'
            width={200}
            target={
              <IconButton color='gray' icon='tabler:dots' variant='ghost' />
            }
          >
            <MenuItem
              icon='tabler:paperclip'
              label={attachmentsLabel}
              onClick={() => onRowClick && onRowClick(row, 'Attachments')}
            />
            <MenuItem
              icon='tabler:message-circle'
              label={commentsLabel}
              onClick={() => onRowClick && onRowClick(row, 'Comments')}
            />
            <MenuItem
              icon='tabler:history'
              label='History'
              onClick={() => onRowClick && onRowClick(row, 'History')}
            />
          </Menu>
        </div>
      )
    },
  } as Column
}
