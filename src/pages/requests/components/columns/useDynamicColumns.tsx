import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
import requestStore from '../../stores/useRequestStore'
import HoverExpandableText from '../HoverExpandableText'
import DynamicTableCell from './components/DynamicTableCell'
// ✅ Your generic FileSheet (React version)
// import FileSheet from '@/components/common/file-sheet/FileSheet'
// add this import near the top
import FileUploadCell from './components/FileUploadCell'
import WrapOnHoverCell from './components/WrapOnHoverCell'

const LINK_TEXT =
  'transition-colors cursor-pointer font-medium underline hover:text-gray-13 text-14 bg-transparent border-0 p-0 text-left'

const wrap = (content: React.ReactNode) => <WrapOnHoverCell value={content} />

const resolveFormJson = (
  workflow: WorkflowOption | null,
): Record<string, any> | any[] | null => {
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
//                         className="bg-surface rounded-xl border border-[var(--gray-3)] shadow-xl p-4 min-w-[260px] overflow-hidden relative"
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

const getParsedFormData = (row: any): any => {
  if (!row || !row.formData) return {}
  if (typeof row.formData === 'object') {
    return row.formData.fields || row.formData || {}
  }
  if (typeof row.formData === 'string') {
    try {
      const parsed = JSON.parse(row.formData)
      return parsed.fields || parsed || {}
    } catch {
      return {}
    }
  }
  return {}
}

const formatDecision = (decision: string) => {
  if (!decision) return ''
  return decision
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const extractPONumber = (row: any): string => {
  if (!row) return 'N/A'
  const agentData = row._agentData?.[0] || row._agentData || {}
  const parsedForm = getParsedFormData(row)

  if (parsedForm['RXwLGHILLrreMmRqlk9mj']) {
    return String(parsedForm['RXwLGHILLrreMmRqlk9mj'])
  }

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

const findInvoiceNumber = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const searchInObj = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null

    const directKeys = [
      'kvcYuknkDumkTenjvrVLj',
      'Invoice No',
      'Invoice No.',
      'Invoice Number',
      'Invoice_No',
      'Invoice_Number',
      'InvoiceNo',
      'InvoiceNumber',
    ]
    for (const key of directKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const val = String(obj[key]).trim()
        if (val !== '' && val !== '-') return val
      }
    }

    for (const key of Object.keys(obj)) {
      const k = key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
      if (k === 'invoiceno' || k === 'invoicenumber' || k === 'invoicenum') {
        const val = obj[key]
        if (
          val &&
          typeof val !== 'object' &&
          String(val).trim() !== '' &&
          String(val).trim() !== '-'
        ) {
          return String(val).trim()
        }
      }
    }
    return null
  }

  // 1. Priority: Form Data
  const fromForm = searchInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData = row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInObj(agentData)
  if (fromAgent) return fromAgent

  // Check Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  return null
}

const findInvoiceAmount = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const searchInObj = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null

    const directKeys = [
      'suyqsm0SYii_8vsj4p0c_',
      'WksH1Mrs42X4J9AHgoBtw',
      'Invoice Amount',
      'Invoice Amount Value',
      'Invoice No',
      'Invoice No.',
      'Invoice Number',
      'Invoice_No',
      'Invoice_Number',
      'InvoiceNo',
      'InvoiceNumber',
      'PO Amount',
      'PO_Amount',
      'POAmount',
      'Invoice Value',
      'PO Value',
      'Amount',
      'total',
      'amount',
    ]
    for (const key of directKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        let val = obj[key]
        if (val && typeof val === 'object') {
          val =
            val['Invoice Value'] ||
            val['InvoiceValue'] ||
            val['value'] ||
            val['val']
        }
        if (val !== undefined && val !== null) {
          const strVal = String(val).trim()
          if (strVal !== '' && strVal !== '-') return strVal
        }
      }
    }

    for (const key of Object.keys(obj)) {
      const k = key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
      if (
        k === 'invoiceamount' ||
        k === 'totalamount' ||
        k === 'amount' ||
        k === 'total' ||
        k === 'suyqsm0syii8vsj4p0c' ||
        k === 'wksh1mrs42x4j9ahgobtw'
      ) {
        let val = obj[key]
        if (val && typeof val === 'object') {
          val =
            val['Invoice Value'] ||
            val['InvoiceValue'] ||
            val['value'] ||
            val['val']
        }
        if (val !== undefined && val !== null) {
          const strVal = String(val).trim()
          if (strVal !== '' && strVal !== '-') return strVal
        }
      }
    }
    return null
  }

  // 1. Priority: Form Data
  const fromForm = searchInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData =
    row._agentResponse || row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInObj(agentData)
  if (fromAgent) return fromAgent

  // Check Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  // Check po_matching
  const poMatching = agentData?.po_matching
  if (poMatching) {
    const fromPO = searchInObj(poMatching)
    if (fromPO) return fromPO
  }

  return null
}

const findSupplierName = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const searchInObj = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null

    const directKeys = [
      'UtfgJy6Z0qyfRC5Bclfc',
      'UtfgJy6Z0qyfRC5Bclf-c',
      'UtfgJy6Z0qyfRC5Bclf_c',
      'Supplier Name',
      'Vendor Name',
      'Supplier_Name',
      'Vendor_Name',
      'SupplierName',
      'VendorName',
    ]
    for (const key of directKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const val = String(obj[key]).trim()
        if (val !== '' && val !== '-') return val
      }
    }

    for (const key of Object.keys(obj)) {
      const k = key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
      if (
        k === 'suppliername' ||
        k === 'vendorname' ||
        k === 'supplier' ||
        k === 'vendor'
      ) {
        const val = obj[key]
        if (
          val &&
          typeof val !== 'object' &&
          String(val).trim() !== '' &&
          String(val).trim() !== '-'
        ) {
          return String(val).trim()
        }
      }
    }
    return null
  }

  // 1. Priority: Form Data
  const fromForm = searchInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData = row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInObj(agentData)
  if (fromAgent) return fromAgent

  // Check Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  return null
}

const findGLNumber = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const searchInObj = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null
    for (const key of Object.keys(obj)) {
      const k = key.toLowerCase().replace(/_/g, ' ').trim()
      if (
        k === 'gl number' ||
        k === 'gl account' ||
        k === 'gl account code' ||
        k === 'gl code'
      ) {
        const val = obj[key]
        if (
          val &&
          typeof val !== 'object' &&
          String(val).trim() !== '' &&
          String(val).trim() !== '-'
        ) {
          return String(val).trim()
        }
      }
    }
    return null
  }

  // 1. Priority: Form Data
  const fromForm = searchInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData = row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInObj(agentData)
  if (fromAgent) return fromAgent

  // 3. gl_matching in agentData
  if (agentData?.gl_matching?.account) {
    return String(agentData.gl_matching.account).trim()
  }

  // 4. Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  return null
}

const findCategory = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const searchInObj = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null
    for (const key of Object.keys(obj)) {
      const k = key.toLowerCase().replace(/_/g, ' ').trim()
      if (k === 'category' || k === 'supplier category') {
        const val = obj[key]
        if (
          val &&
          typeof val !== 'object' &&
          String(val).trim() !== '' &&
          String(val).trim() !== '-'
        ) {
          return String(val).trim()
        }
      }
    }
    return null
  }

  // 1. Priority: Form Data
  const fromForm = searchInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData = row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInObj(agentData)
  if (fromAgent) return fromAgent

  // 3. Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  // 4. Check row fields directly
  if (row.category && typeof row.category !== 'object') {
    return String(row.category).trim()
  }
  if (row.supplierCategory && typeof row.supplierCategory !== 'object') {
    return String(row.supplierCategory).trim()
  }

  return null
}

const extractDueDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}
  const parsedForm = getParsedFormData(row)

  let val =
    parsedForm['Due Date'] ||
    parsedForm['due_date'] ||
    parsedForm['Due_Date'] ||
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

  if ((!val || val === '-') && parsedForm['9F6tPVHoRnmONGx3kYJu2']) {
    const invDateStr = parsedForm['9F6tPVHoRnmONGx3kYJu2']
    const termsStr = parsedForm['vxnKCXsXkz8_acPogKe'] || ''
    const numMatch = /\d+/.exec(termsStr)
    if (numMatch) {
      const days = parseInt(numMatch[0], 10)
      try {
        const d = new Date(invDateStr)
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + days)
          val = d.toISOString().split('T')[0]
        }
      } catch (e) {}
    }
  }

  if (!val || val === '-') return '-'
  try {
    return formatDatetime(val as string, 'date')
  } catch {
    return String(val)
  }
}

const getFromObjectOrVal = (obj: any): string | null => {
  if (!obj) return null
  if (typeof obj !== 'object') return String(obj)
  const val = obj.payment_terms ?? obj.terms ?? obj.payment_term ?? obj.term
  return val ? String(val) : null
}

const getFromFields = (fields: any): string | null => {
  if (!fields) return null
  return (
    fields['Payment Terms'] ??
    fields['payment_terms'] ??
    fields['Terms'] ??
    fields['terms']
  )
}

const extractPaymentTerms = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] ?? row._agentData ?? {}
  const parsedForm = getParsedFormData(row)

  if (
    parsedForm['vxnKCXsXkz8_acPogKe'] &&
    parsedForm['vxnKCXsXkz8_acPogKe'] !== '-'
  ) {
    return String(parsedForm['vxnKCXsXkz8_acPogKe'])
  }

  const fromRow = getFromObjectOrVal(row.payment_terms ?? row.paymentTerms)
  if (fromRow && fromRow !== '-') return fromRow

  const rowTerms = row.terms ?? row.payment_term ?? row.paymentTerms
  if (rowTerms && typeof rowTerms !== 'object' && rowTerms !== '-')
    return String(rowTerms)

  const fromForm =
    getFromFields(row.formData?.fields) ?? getFromFields(row.formData)
  if (fromForm && fromForm !== '-') return String(fromForm)

  const fromAgent = getFromObjectOrVal(agentData.payment_terms)
  if (fromAgent && fromAgent !== '-') return fromAgent

  const header = agentData['Extracted Invoice JSON']?.invoice_header
  const fromHeader = getFromFields(header)
  if (fromHeader && fromHeader !== '-') return String(fromHeader)

  return '-'
}
const extractInvoiceDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}
  const parsedForm = getParsedFormData(row)

  if (
    parsedForm['9F6tPVHoRnmONGx3kYJu2'] &&
    parsedForm['9F6tPVHoRnmONGx3kYJu2'] !== '-'
  ) {
    return String(parsedForm['9F6tPVHoRnmONGx3kYJu2']).trim()
  }

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

const extractInvoiceNumber = (row: any): string => {
  if (!row) return '-'

  const fromResolved = findInvoiceNumber(row)
  if (fromResolved) return fromResolved

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
    if (Number.isNaN(invDate.getTime()) || Number.isNaN(dueDate.getTime()))
      return null
    const diffTime = dueDate.getTime() - invDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  } catch {
    return null
  }
}

const computeDueDateInfo = (
  _row: any,
  terms: string,
  dueDate: string,
): {
  calculationText: string
  calculationTheme: string
  termsDisplay: string
} => {
  const todayStr = new Date().toISOString().split('T')[0]
  const daysDiff = calculateDaysDifference(todayStr, dueDate)

  let termsDisplay = terms === '-' ? 'Immediate' : terms
  if (termsDisplay.toLowerCase() === 'immediate') {
    termsDisplay = '0 Days'
  } else {
    const numMatch = /\d+/.exec(termsDisplay)
    if (numMatch) {
      termsDisplay = `${numMatch[0]} Days`
    }
  }

  let calculationText = 'Immediate'
  const calculationTheme =
    'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'

  if (daysDiff === null) {
    const numMatch = /\d+/.exec(terms)
    if (numMatch) {
      const days = Number.parseInt(numMatch[0], 10)
      const theme =
        days <= 15
          ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
          : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
      return {
        calculationText: `In ${days} days`,
        calculationTheme: theme,
        termsDisplay,
      }
    }
  } else if (daysDiff > 0) {
    const theme =
      daysDiff <= 15
        ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
        : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
    return {
      calculationText: `In ${daysDiff} days`,
      calculationTheme: theme,
      termsDisplay,
    }
  } else if (daysDiff < 0) {
    calculationText = `${Math.abs(daysDiff)}d Overdue`
  }

  return { calculationText, calculationTheme, termsDisplay }
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

const StepIcon = ({ status }: { status: string }) => {
  if (status === 'completed') {
    return (
      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-9)] text-white ring-4 ring-[var(--green-2)]'>
        <Icon className='size-3 stroke-[3px]' name='tabler:check' />
      </div>
    )
  }
  if (status === 'active') {
    return (
      <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--primary-9)] bg-surface ring-4 ring-[var(--primary-2)]'>
        <div className='size-1.5 animate-pulse rounded-full bg-[var(--primary-9)]' />
      </div>
    )
  }
  return (
    <div className='relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--gray-4)] bg-surface text-[var(--gray-8)]'>
      <div className='size-1.5 rounded-full bg-[var(--gray-4)]' />
    </div>
  )
}

const getStepStatuses = (stage: string) => {
  let step2Status = 'pending'
  let step3Status = 'pending'
  let step4Status = 'pending'

  if (
    stage === 'Start' ||
    stage === 'Fetching & Analysing...' ||
    stage.startsWith('AP AGENT') ||
    stage.startsWith('AP_AGENT')
  ) {
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

  return { step2Status, step3Status, step4Status }
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

  const agentData = row._agentData?.[0] || row._agentData || {}
  const parsedForm = getParsedFormData(row)
  const rawDecision = String(
    parsedForm['2MH_BMDFEVKsU0uAQjoI1'] ||
      agentData?.decision ||
      row.decision ||
      row.status ||
      '',
  ).toUpperCase()

  let iconName = 'tabler:clock'
  let iconColorClass =
    'bg-[var(--gray-2)] border-[var(--gray-2)] text-[var(--gray-9)]'

  if (row.isProcessing) {
    iconName = 'tabler:loader-2'
    iconColorClass =
      'bg-[var(--orange-2)] border-[var(--orange-2)] text-[var(--orange-9)]'
  } else if (rawDecision === 'APPROVED' || rawDecision === 'MATCHED') {
    iconName = 'tabler:circle-check'
    iconColorClass =
      'bg-[var(--green-2)] border-[var(--green-2)] text-[var(--green-9)]'
  } else if (
    rawDecision === 'REJECTED' ||
    rawDecision === 'NOT MATCHED' ||
    rawDecision === 'NO MATCH'
  ) {
    iconName = 'tabler:alert-circle'
    iconColorClass =
      'bg-[var(--red-2)] border-[var(--red-2)] text-[var(--red-9)]'
  } else if (row?.isDuplicateInvoice) {
    iconName = 'tabler:stack-2'
    iconColorClass =
      'bg-[var(--purple-2)] border-[var(--purple-2)] text-[var(--purple-9)]'
  } else if (
    rawDecision === 'PARTIALLY APPROVED' ||
    rawDecision === 'PARTIALLY MATCHED' ||
    rawDecision === 'PARTIAL MATCH'
  ) {
    iconName = 'tabler:alert-triangle'
    iconColorClass =
      'bg-[var(--orange-2)] border-[var(--orange-2)] text-[var(--orange-9)]'
  }

  return (
    <div
      aria-hidden='true'
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

      {row.isProcessing &&
        isHovered &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className='pointer-events-none fixed top-1/2 left-1/2 w-[360px] -translate-x-1/2 -translate-y-1/2 text-left transition-all duration-300'
            style={{ zIndex: 999999 }}
          >
            <div
              className='animate-in fade-in zoom-in-95 relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-5 shadow-2xl duration-200'
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
                const { step2Status, step3Status, step4Status } =
                  getStepStatuses(stage)

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
                      <StepIcon status={step2Status} />
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
                      <StepIcon status={step3Status} />
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
                      <StepIcon status={step4Status} />
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
          </div>,
          document.body,
        )}
    </div>
  )
}

const isPOField = (label: string) =>
  label.includes('po number') || label === 'po' || label === 'po_number'

const isDueDateField = (label: string) =>
  label.includes('due date') || label === 'due_date'

const isTermsField = (label: string) =>
  label === 'terms' ||
  label.includes('payment terms') ||
  label === 'payment_term' ||
  label === 'payment_terms'

const isInvoiceDateField = (label: string, fieldKey: string) =>
  label.includes('invoice date') ||
  label === 'invoice_date' ||
  fieldKey === '9F6tPVHoRnmONGx3kYJu2'

const extractStandardFieldValue = (
  row: any,
  fieldKey: string,
  label: string,
): string | null => {
  const lowerLabel = String(label || '').toLowerCase()

  if (isPOField(lowerLabel)) {
    const extracted = extractPONumber(row)
    return extracted && extracted !== 'N/A' ? extracted : null
  }
  if (isDueDateField(lowerLabel)) {
    const extracted = extractDueDate(row)
    return extracted && extracted !== '-' ? extracted : null
  }
  if (isTermsField(lowerLabel)) {
    const extracted = extractPaymentTerms(row)
    return extracted && extracted !== '-' ? extracted : null
  }
  if (isInvoiceDateField(lowerLabel, fieldKey)) {
    const extracted = extractInvoiceDate(row)
    return extracted && extracted !== '-' ? extracted : null
  }

  return null
}

const renderCellByType = (type: string, rawVal: any, row: any) => {
  switch (type) {
    case 'FILE_UPLOAD':
      return wrap(<FileUploadCell rawVal={rawVal} row={row} />)

    case 'DATE':
      return (
        <WrapOnHoverCell value={formatDatetime(rawVal as string, 'date')} />
      )

    case 'CURRENCY':
      return (
        <WrapOnHoverCell
          value={
            <span className='text-gray-900 font-medium'>{String(rawVal)}</span>
          }
        />
      )

    case 'NUMBER':
      return <WrapOnHoverCell value={String(rawVal)} />

    default:
      return <WrapOnHoverCell value={String(rawVal)} />
  }
}

const renderDynamicCell = (
  row: any,
  fieldKey: string,
  label: string,
  field: any,
  tableMetaByParentId: Map<string, any>,
) => {
  let rawVal =
    row[fieldKey] ??
    row.formData?.fields?.[fieldKey] ??
    row.formData?.[fieldKey]

  const extracted = extractStandardFieldValue(row, fieldKey, label)
  if (extracted !== null) {
    rawVal = extracted
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
  return renderCellByType(type, rawVal, row)
}

const getFormPanels = (form: any) => {
  if (!form) return []
  const panels =
    !Array.isArray(form) && Array.isArray(form?.panels) ? form.panels : []
  const secondaryPanels =
    !Array.isArray(form) && Array.isArray(form?.secondaryPanels)
      ? form.secondaryPanels
      : []
  const rootPanels = Array.isArray(form) ? form : [form]
  return [...rootPanels, ...panels, ...secondaryPanels]
}

const getBaseColumns = (
  selectedItem: any,
  activeTab: string | undefined,
  onRowClick: (item: any, tab: string) => void,
): Column[] => {
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
                <button
                  className={LINK_TEXT}
                  type='button'
                  onClick={(e) => {
                    e?.stopPropagation?.()
                    if (onRowClick) {
                      onRowClick(row, 'Overview')
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      if (onRowClick) {
                        onRowClick(row, 'Overview')
                      }
                    }
                  }}
                >
                  {extractInvoiceNumber(row)}
                </button>
              }
            />
            {row?.isDuplicateInvoice && (
              <RequestStatusBadge status='Duplicated' />
            )}
          </div>
        </div>
      ),
    },
  ]

  if (selectedItem) {
    return columns
  }

  columns.push(
    {
      id: 'matchStatus',
      label: activeTab === 'Processed' ? 'Payment Status' : 'Match Status',
      size: 140,
      renderCell: (row: any, _index = 0) => {
        if (activeTab === 'Processed') {
          return null
          /*
          const isPaid = index % 2 === 0
          if (isPaid) {
            return (
              <span className='flex items-center gap-1 rounded-md border border-[var(--green-4)] bg-[var(--green-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
                <Icon className='size-3.5' name='tabler:circle-check' />
                Paid
              </span>
            )
          } else {
            return (
              <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
                <Icon className='size-3.5' name='tabler:clock' />
                Pending for Payment
              </span>
            )
          }
          */
        }

        const rowId = row.processId || row.id
        const storeState = requestStore.getState()
        const jobStatuses = storeState.jobStatuses || {}
        const jobMappings = storeState.jobMappings || {}

        let matchedJobStatus = jobStatuses[String(rowId)]
        if (!matchedJobStatus) {
          const mappedJobId = Object.keys(jobMappings).find(
            (key) => String(jobMappings[key]) === String(rowId),
          )
          if (mappedJobId) {
            matchedJobStatus = jobStatuses[`job-${mappedJobId}`]
          }
        }
        if (!matchedJobStatus && row.apAgentJobId) {
          matchedJobStatus = jobStatuses[`job-${row.apAgentJobId}`]
        }

        if (row.isProcessing) {
          const statusText =
            matchedJobStatus && !matchedJobStatus.isCompleted
              ? `${matchedJobStatus.stage}${matchedJobStatus.message ? ` - ${matchedJobStatus.message}` : ''}`
              : 'Processing'
          return (
            <span
              className='flex animate-pulse items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-[var(--orange-11)]'
              title={statusText}
            >
              <Icon className='size-3.5 animate-spin' name='tabler:loader-2' />
              {statusText}
            </span>
          )
        }

        const agentData = row._agentData?.[0] || row._agentData || {}
        const parsedForm = getParsedFormData(row)
        const rawDecision =
          parsedForm['2MH_BMDFEVKsU0uAQjoI1'] ||
          agentData?.decision ||
          row.decision ||
          row.status ||
          ''

        if (!rawDecision) {
          return null
        }

        const formatted = formatDecision(String(rawDecision))

        if (
          formatted.toLowerCase() === 'approved' ||
          formatted.toLowerCase() === 'matched'
        ) {
          return (
            <span className='flex items-center gap-1 rounded-md border border-[var(--green-4)] bg-[var(--green-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
              <Icon className='size-3.5' name='tabler:circle-check' />
              {formatted}
            </span>
          )
        }

        if (
          formatted.toLowerCase() === 'rejected' ||
          formatted.toLowerCase() === 'no match'
        ) {
          return (
            <span className='flex items-center gap-1 rounded-md border border-[var(--red-4)] bg-[var(--red-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--red-11)]'>
              <Icon className='size-3.5' name='tabler:alert-circle' />
              {formatted}
            </span>
          )
        }

        return (
          <span className='flex items-center gap-1 rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--orange-11)]'>
            <Icon className='size-3.5' name='tabler:alert-triangle' />
            {formatted}
          </span>
        )
      },
    },
    {
      id: 'raisedBy',
      label: 'Raised By',
      size: 200,
      renderCell: (row: any) => {
        const supplierName =
          findSupplierName(row) ||
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
      renderCell: (row: any) => {
        const glNumber = findGLNumber(row)
        const category = findCategory(row)

        if (!glNumber && !category) return null

        return (
          <div className='flex items-center gap-2 text-[12px] font-medium text-[var(--gray-10)]'>
            {glNumber && (
              <div className='flex items-center gap-1 text-[var(--gray-8)]'>
                <Icon className='size-3.5' name='tabler:stack' />
                <span>{glNumber}</span>
              </div>
            )}
            {category && (
              <div className='flex items-center gap-1 text-[var(--gray-8)]'>
                <Icon className='size-3.5' name='tabler:tag' />
                <span>{category}</span>
              </div>
            )}
          </div>
        )
      },
    },
  )

  if (activeTab !== 'Processed') {
    columns.push({
      id: 'aiInsight',
      label: 'AI Insight',
      size: 260,
      renderCell: (_row: any) => {
        const agentData =
          _row._agentResponse || _row._agentData?.[0] || _row._agentData || {}
        const aiInsight =
          agentData?.ai_insight ||
          agentData?.aiInsight ||
          agentData?.ai_insect ||
          ''
        if (!aiInsight) {
          return (
            <span className='text-[13px] font-semibold text-[var(--gray-9)]'>
              N/A
            </span>
          )
        }
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
    })
  }

  columns.push(
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
        const { calculationText, calculationTheme, termsDisplay } =
          computeDueDateInfo(row, terms, dueDate)

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
        const amtStr = findInvoiceAmount(row)
        const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : null
        return (
          <span className='text-[14px] leading-none font-semibold tracking-tight text-[var(--text-primary)] tabular-nums'>
            {amount !== null && !Number.isNaN(amount) ? (
              `$${amount.toLocaleString(undefined, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}`
            ) : (
              <span className='text-[13px] font-semibold text-[var(--gray-9)]'>
                N/A
              </span>
            )}
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
            dateDisplay = new Date(rawDate).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
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
  )

  return columns
}

const buildDynamicColumns = (
  allPanels: any[],
  selectedItem: any,
  tableMetaByParentId: Map<string, any>,
) => {
  const dynamicCols: Column[] = []
  for (const panel of allPanels) {
    const controls =
      panel?.controlList || panel?.controllist || panel?.fields || []

    for (const field of controls) {
      if (isIgnorableField(field)) continue
      if (!isParentField(field)) continue

      const fieldKey = getFieldKey(field) // Uses encrypted jsonId if available
      if (!fieldKey) continue

      const label = getFieldLabel(field)
      if (isStandardField(field, label)) continue

      if (!selectedItem) {
        dynamicCols.push({
          id: fieldKey,
          label,
          size: 200,
          renderCell: (row: any) =>
            renderDynamicCell(row, fieldKey, label, field, tableMetaByParentId),
        })
      }
    }
  }
  return dynamicCols
}

export const useDynamicColumns = (
  workflow: WorkflowOption | null,
  onRowClick: (item: any, tab: string) => void,
  selectedItem: any,
  activeTab?: string,
) => {
  return useMemo(() => {
    const columns = getBaseColumns(selectedItem, activeTab, onRowClick)

    const form = resolveFormJson(workflow)
    if (!form) {
      if (!selectedItem) {
        columns.push(makeActionsColumn(onRowClick))
      }
      return columns
    }

    const allPanels = getFormPanels(form)
    if (!allPanels.length) {
      if (!selectedItem) {
        columns.push(makeActionsColumn(onRowClick))
      }
      return columns
    }

    const tableMetaByParentId = buildTableMeta(allPanels)
    const dynamicCols = buildDynamicColumns(
      allPanels,
      selectedItem,
      tableMetaByParentId,
    )
    columns.push(...dynamicCols)

    if (!selectedItem) {
      columns.push(makeActionsColumn(onRowClick))
    }
    return columns
  }, [workflow, onRowClick, selectedItem, activeTab])
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
    size: 80,
    renderCell: (row: any) => {
      const attachmentCount = Number(row?.attachmentCount ?? 0)
      const commentsCount = Number(row?.commentsCount ?? 0)

      const attachmentsLabel =
        attachmentCount > 0 ? `Attachments (${attachmentCount})` : 'Attachments'
      const commentsLabel =
        commentsCount > 0 ? `Comments (${commentsCount})` : 'Comments'

      return (
        <div
          className='flex items-center justify-center gap-1.5'
          onClick={(e) => e.stopPropagation()}
        >
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
              onClick={() => onRowClick?.(row, 'Attachments')}
            />
            <MenuItem
              icon='tabler:message-circle'
              label={commentsLabel}
              onClick={() => onRowClick?.(row, 'Comments')}
            />
            <MenuItem
              icon='tabler:history'
              label='History'
              onClick={() => onRowClick?.(row, 'History')}
            />
          </Menu>
        </div>
      )
    },
  }
}
