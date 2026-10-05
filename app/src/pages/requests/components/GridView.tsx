// import SummaryMetric from './SummaryMetric'
import { useLingui } from '@lingui/react/macro'
import { type Table as TanstackTable } from '@tanstack/react-table'
import dayjs from 'dayjs'
// ✅ Motion
import { motion, useReducedMotion } from 'framer-motion'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { TableActionButton } from '@/components/base/data-table/TableActionBar'
import type { RowSize } from '@/components/base/data-table/types'
import type { WorkflowOption } from '@/pages/requests/types'
import TableExport from '@/components/base/data-table/actions/TableExport'
// import TableFilters from '@/components/base/data-table/actions/TableFilters'
import TableReload from '@/components/base/data-table/actions/TableReload'
// ✅ Table Actions imports
// import { generateDummySummary } from '@/pages/requests/utils/dummyData'
// import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
// import RequestSummary from './RequestSummary'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import ListEmptyState from '@/components/common/ListEmptyState'
import requestStore, {
  useProcessingStatusText,
} from '@/pages/requests/stores/useRequestStore'
import { extractDueDate } from '@/pages/requests/utils/inboxItemDisplay'
import { isAccountsPayableWorkflow } from '@/pages/requests/utils/workflow.utils'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import { parseUtcDate } from '@/utils/utcDate'
import GenericGridCard from './GenericGridCard'
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

const isNonEmptyString = (val: any): boolean => {
  if (val == null || typeof val === 'object') return false
  const str = String(val).trim()
  return str !== '' && str !== '-'
}

const isValidTerm = (val: any): boolean => {
  return (
    val != null &&
    typeof val !== 'object' &&
    val !== '-' &&
    String(val).trim() !== ''
  )
}

const getRowIconAndColor = (
  isProcessing: boolean,
  rawDecision: string,
  isDuplicateInvoice: boolean,
) => {
  if (isProcessing) {
    return {
      iconColorClass:
        'bg-[var(--orange-2)] border-[var(--orange-2)] text-[var(--orange-9)]',
      iconName: 'tabler:loader-2',
    }
  }
  const dec = rawDecision.toUpperCase()
  if (dec === 'APPROVED' || dec === 'MATCHED') {
    return {
      iconColorClass:
        'bg-[var(--green-2)] border-[var(--green-2)] text-[var(--green-9)]',
      iconName: 'tabler:circle-check',
    }
  }
  if (dec === 'REJECTED' || dec === 'NOT MATCHED' || dec === 'NO MATCH') {
    return {
      iconColorClass:
        'bg-[var(--red-2)] border-[var(--red-2)] text-[var(--red-9)]',
      iconName: 'tabler:alert-circle',
    }
  }
  if (isDuplicateInvoice) {
    return {
      iconColorClass:
        'bg-[var(--purple-2)] border-[var(--purple-2)] text-[var(--purple-9)]',
      iconName: 'tabler:stack-2',
    }
  }
  if (
    dec === 'PARTIALLY APPROVED' ||
    dec === 'PARTIALLY MATCHED' ||
    dec === 'PARTIAL MATCH'
  ) {
    return {
      iconColorClass:
        'bg-[var(--orange-2)] border-[var(--orange-2)] text-[var(--orange-9)]',
      iconName: 'tabler:alert-triangle',
    }
  }
  return {
    iconColorClass:
      'bg-[var(--gray-2)] border-[var(--gray-2)] text-[var(--gray-9)]',
    iconName: 'tabler:clock',
  }
}

const searchInvoiceNumberInObj = (obj: any): string | null => {
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
    const val = obj[key]
    if (isNonEmptyString(val)) {
      return String(val).trim()
    }
  }

  for (const key of Object.keys(obj)) {
    const k = key
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim()
    if (k === 'invoiceno' || k === 'invoicenumber' || k === 'invoicenum') {
      const val = obj[key]
      if (isNonEmptyString(val)) {
        return String(val).trim()
      }
    }
  }
  return null
}

const extractAmountStr = (val: any): string | null => {
  if (val == null) return null
  let actualVal = val
  if (typeof val === 'object') {
    actualVal =
      val['Invoice Value'] || val['InvoiceValue'] || val['value'] || val['val']
  }
  if (actualVal == null) return null
  const str = String(actualVal).trim()
  return str !== '' && str !== '-' ? str : null
}

const searchInvoiceAmountInObj = (obj: any): string | null => {
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
    const extracted = extractAmountStr(obj[key])
    if (extracted !== null) return extracted
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
      const extracted = extractAmountStr(obj[key])
      if (extracted !== null) return extracted
    }
  }
  return null
}

const searchSupplierNameInObj = (obj: any): string | null => {
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
    const val = obj[key]
    if (isNonEmptyString(val)) {
      return String(val).trim()
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
      if (isNonEmptyString(val)) {
        return String(val).trim()
      }
    }
  }
  return null
}

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
  if (!row?.formData) return {}
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

  // 1. Priority: Form Data
  const fromForm = searchInvoiceNumberInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData = row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInvoiceNumberInObj(agentData)
  if (fromAgent) return fromAgent

  // Check Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInvoiceNumberInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  return null
}

const findInvoiceAmount = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  // 1. Priority: Form Data
  const fromForm = searchInvoiceAmountInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData =
    row._agentResponse || row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInvoiceAmountInObj(agentData)
  if (fromAgent) return fromAgent

  // Check Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInvoiceAmountInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  // Check po_matching
  const poMatching = agentData?.po_matching
  if (poMatching) {
    const fromPO = searchInvoiceAmountInObj(poMatching)
    if (fromPO) return fromPO
  }

  return null
}

const findSupplierName = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  // 1. Priority: Form Data
  const fromForm = searchSupplierNameInObj(parsedForm)
  if (fromForm) return fromForm

  // 2. Priority: Agent Data
  const agentData = row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchSupplierNameInObj(agentData)
  if (fromAgent) return fromAgent

  // Check Extracted Invoice JSON
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchSupplierNameInObj(invoiceHeader)
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
      const k = key.toLowerCase().replaceAll('_', ' ').trim()
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
      const k = key.toLowerCase().replaceAll('_', ' ').trim()
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
  const parsedForm = getParsedFormData(row)

  if (isValidTerm(parsedForm['vxnKCXsXkz8_acPogKe'])) {
    return String(parsedForm['vxnKCXsXkz8_acPogKe'])
  }
  if (isValidTerm(parsedForm['vxnKCXs-Xkz8_acPog-Ke'])) {
    return String(parsedForm['vxnKCXs-Xkz8_acPog-Ke'])
  }
  if (isValidTerm(parsedForm['BsPnOsYv6F1fbzWsTpXCW'])) {
    return String(parsedForm['BsPnOsYv6F1fbzWsTpXCW'])
  }

  // check termObj
  const termObj = row.payment_terms || row.paymentTerms || {}
  let val = extractValueFromTermObj(termObj)
  if (isValidTerm(val)) return String(val)

  // check row terms
  val = row.terms || row.payment_term || row.paymentTerms
  if (isValidTerm(val)) return String(val)

  // check formData
  const fields = row.formData?.fields || {}
  const fd = row.formData || {}
  const keys = ['Payment Terms', 'payment_terms', 'Terms', 'terms']
  for (const k of keys) {
    const v = fields[k] || fd[k]
    if (isValidTerm(v)) return String(v)
  }

  // check agentData
  const agentTermObj = agentData.payment_terms || {}
  val = extractValueFromTermObj(agentTermObj)
  if (isValidTerm(val)) return String(val)

  const header = agentData['Extracted Invoice JSON']?.invoice_header || {}
  for (const k of keys) {
    const v = header[k]
    if (isValidTerm(v)) return String(v)
  }

  return '-'
}

const calculateDaysDifference = (
  invoiceDateStr: any,
  dueDateStr: any,
): number | null => {
  if (!invoiceDateStr || !dueDateStr || dueDateStr === '-') return null
  const invDate = dayjs(invoiceDateStr)
  const dueDate = dayjs(dueDateStr)
  if (!invDate.isValid() || !dueDate.isValid()) return null
  return dueDate.startOf('day').diff(invDate.startOf('day'), 'day')
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

interface RowStatusBadgeProps {
  isProcessing: boolean
  originalIndex: number
  row: any
  activeTab?: string
}

const formatDecision = (decision: string) => {
  if (!decision) return ''
  return decision
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const RowStatusBadge = ({
  activeTab,
  isProcessing,
  originalIndex: _originalIndex,
  row,
}: RowStatusBadgeProps) => {
  if (isProcessing) return null

  if (activeTab === 'Processed') {
    return null
    /*
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
    */
  }

  // Retrieve decision from agentResponse
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
    formatted.toLowerCase() === 'not matched' ||
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
}

interface TermsColumnProps {
  row: any
  activeTab?: string
}

const TermsColumn = ({ activeTab, row }: TermsColumnProps) => {
  const isCompleted =
    activeTab === 'Processed' ||
    row.isCompleted ||
    Boolean(row.completedAtUtc) ||
    Boolean(row.completedAt) ||
    ['completed', 'approved', 'closed', 'paid'].includes(
      String(row.status || '')
        .toLowerCase()
        .trim(),
    )

  if (isCompleted) {
    return (
      <span className='inline-flex items-center gap-1 rounded-full border border-[var(--green-4)] bg-[var(--green-2)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--green-11)]'>
        <Icon
          className='size-3.5 text-[var(--green-9)]'
          name='tabler:circle-check'
        />
        Paid
      </span>
    )
  }

  const terms = extractPaymentTerms(row)
  const dueDate = extractDueDate(row)
  const todayStr = new Date().toISOString().split('T')[0]
  const daysDiff = calculateDaysDifference(todayStr, dueDate)

  let topText = ''
  let bottomText = ''
  let calculationTheme = ''

  if (daysDiff === null) {
    // fallback to terms numeric days diff if due date is not clear
    const numMatch = /\d+/.exec(terms)
    if (numMatch) {
      const days = Number.parseInt(numMatch[0], 10)
      topText = `${days} days`
      bottomText = 'In due'
      calculationTheme =
        days <= 15
          ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
          : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
    } else {
      topText = '0 days'
      bottomText = 'Immediate'
      calculationTheme =
        'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
    }
  } else if (daysDiff > 0) {
    topText = `${daysDiff} days`
    bottomText = 'In due'
    calculationTheme =
      daysDiff <= 15
        ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
        : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]'
  } else if (daysDiff < 0) {
    topText = `${Math.abs(daysDiff)} days`
    bottomText = 'Overdue'
    calculationTheme =
      'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
  } else {
    topText = '0 days'
    bottomText = 'Immediate'
    calculationTheme =
      'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
  }

  return (
    <div className='flex flex-col items-center gap-1'>
      <span className='text-[12px] font-semibold tracking-tight text-[var(--gray-12)]'>
        {topText}
      </span>
      <span
        className={cn(
          'rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide',
          calculationTheme,
        )}
      >
        {bottomText}
      </span>
    </div>
  )
}

interface GridRowItemProps {
  hasSelectionActive: boolean
  index: number
  isSelected: boolean
  row: any
  activeTab?: string
  workflow?: WorkflowOption | null
  toggleRowSelection: (id: string | number, e: React.MouseEvent) => void
  onRowClick: (item: any, tab: string) => void
}

const GridRowItem = memo(
  ({
    activeTab,
    hasSelectionActive,
    index,
    isSelected,
    row,
    toggleRowSelection,
    workflow,
    onRowClick,
  }: GridRowItemProps) => {
    const originalIndex =
      typeof row?._originalIndex === 'number' ? row._originalIndex : index
    const rowId = row?.id || row?.processId || `item-${originalIndex}`

    const { jobMappings, jobStatuses, processingProcesses } = requestStore(
      (state) => state,
    )
    const isPlaygroundOpen = usePlaygroundStore((state) => state.isOpen)
    const isAskAIOpen = useAskAIStore((state) => state.isOpen)
    const isSidebarOpen = isPlaygroundOpen || isAskAIOpen
    const matchingProc = useMemo(() => {
      return processingProcesses.find(
        (p) => String(p.processId || p.id) === String(row.processId || row.id),
      )
    }, [processingProcesses, row.processId, row.id])

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

    const defaultStatusText = useProcessingStatusText(
      matchingProc?.startTime ||
        row?.raisedAt ||
        row?.transaction_createdAt ||
        row?.createdAt,
    )

    if (!isAccountsPayableWorkflow(workflow)) {
      return (
        <GenericGridCard
          row={row}
          workflow={workflow ?? null}
          onRowClick={onRowClick}
        />
      )
    }

    const statusText =
      matchedJobStatus && !matchedJobStatus.isCompleted
        ? `${matchedJobStatus.message ? ` ${matchedJobStatus.message}` : ''}`
        : defaultStatusText

    const parsedForm = getParsedFormData(row)
    const invoiceNo =
      findInvoiceNumber(row) ||
      row?.documentNumber ||
      row?.['kvcYuknkDumkTenjvrVLj'] ||
      row?.invoiceNo ||
      row?.requestNo ||
      `INV-${rowId}`
    const supplierName =
      findSupplierName(row) ||
      row?.vendor ||
      row?.['UtfgJy6Z0qyfRC5Bclf-c'] ||
      row?.raisedBy ||
      'Unknown Supplier'
    const amtStr = findInvoiceAmount(row)
    const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : null
    const agentData =
      row._agentResponse || row._agentData?.[0] || row._agentData || {}
    const rawDecision = String(
      parsedForm['2MH_BMDFEVKsU0uAQjoI1'] ||
        agentData?.decision ||
        row.decision ||
        row.status ||
        '',
    ).toUpperCase()
    const rawAiInsight = String(
      agentData?.ai_insight ||
        agentData?.aiInsight ||
        agentData?.ai_insect ||
        row?.qualifyAgentResponse?.qualifier_result?.['AI Insight'] ||
        row?.qualifyAgentResponse?.qualifier_result?.['Ai Insight'] ||
        '',
    ).trim()
    const aiInsight = rawAiInsight.replace(/^[✨\u2728\u2729\u2730\s]+/, '').trim()

    const activeJobId = String(row?.apAgentJobId || row?.jobId || '').trim()
    const isJobProcessing =
      Boolean(activeJobId) &&
      !matchedJobStatus?.isCompleted &&
      (Boolean(row.isProcessing) ||
        Boolean(matchedJobStatus) ||
        Boolean(statusText?.trim()))

    const { iconColorClass, iconName } = getRowIconAndColor(
      isJobProcessing,
      rawDecision,
      !!row?.isDuplicateInvoice,
    )

    // Job-driven loading: spinner + job id only (never stageType / supplier).
    if (isJobProcessing) {
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
            'cursor-pointer',
            isSelected
              ? 'border-r border-l border-r-[var(--primary-3)] border-b-[var(--primary-3)] border-l-[var(--primary-3)] bg-[var(--primary-1)] shadow-sm'
              : 'bg-[var(--surface)] hover:border-r hover:border-l hover:border-r-[var(--orange-4)] hover:border-b-[var(--orange-4)] hover:border-l-[var(--orange-4)] hover:bg-[var(--orange-1)]/40 hover:shadow-sm',
          )}
          onClick={() => {
            onRowClick(row, 'Overview')
          }}
        >
          <div className='flex shrink-0 items-center'>
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
                iconColorClass,
              )}
            >
              <Icon className='size-5 animate-spin' name='tabler:loader-2' />
            </div>
          </div>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            <h3
              className='shrink-0 text-[15px] font-medium tracking-tight whitespace-nowrap text-[var(--text-primary)]'
              style={{ fontWeight: 500 }}
            >
              {`JOB-${activeJobId}`}
            </h3>
            {statusText?.trim() ? (
              <span className='ml-auto animate-pulse truncate text-right text-[12px] font-semibold text-[var(--orange-9)]'>
                {statusText}
              </span>
            ) : null}
          </div>
        </motion.div>
      )
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
          'cursor-pointer',
          isSelected
            ? 'border-r border-l border-r-[var(--primary-3)] border-b-[var(--primary-3)] border-l-[var(--primary-3)] bg-[var(--primary-1)] shadow-sm'
            : 'bg-[var(--surface)]',
          !isSelected &&
            'hover:z-10 hover:border-r hover:border-l hover:border-r-[var(--primary-4)] hover:border-b-[var(--primary-4)] hover:border-l-[var(--primary-4)] hover:bg-[var(--gray-1)] hover:shadow-sm',
        )}
        onClick={() => {
          onRowClick(row, 'Overview')
        }}
      >
        {/* Checkbox & Status Icon */}
        <div className='flex shrink-0 items-center'>
          <div
            className={cn(
              'relative flex items-center overflow-hidden transition-all duration-200',
              isSelected || hasSelectionActive
                ? 'mr-4 w-5 opacity-100'
                : 'mr-0 w-0 opacity-0 group-hover:mr-4 group-hover:w-5 group-hover:opacity-100',
            )}
          >
            <input
              checked={isSelected}
              className='absolute inset-0 z-10 cursor-pointer opacity-0'
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
          </div>
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
              iconColorClass,
            )}
          >
            <Icon className='size-5' name={iconName} />
          </div>
        </div>

        {/* Main Content: Identity & Metadata — always 2 lines */}
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <div className='group/inv flex min-w-0 flex-nowrap items-center gap-2.5'>
            <h3
              className='shrink-0 text-[15px] font-medium tracking-tight whitespace-nowrap text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-9)] group-hover:underline'
              style={{ fontWeight: 500 }}
            >
              {invoiceNo}
            </h3>
            <HoverExpandableText
              className='text-[12px] font-medium text-[var(--gray-10)]'
              fallbackText='Unknown Supplier'
              text={supplierName}
              normalMaxWidthClass={
                isSidebarOpen
                  ? 'max-w-[100px]'
                  : 'max-w-[160px] sm:max-w-[200px] md:max-w-[260px]'
              }
            />
            <div className='shrink-0'>
              <RowStatusBadge
                activeTab={activeTab}
                isProcessing={false}
                originalIndex={originalIndex}
                row={row}
              />
            </div>
          </div>

          {/* Sub-metadata row — PO / GL / category stay on line 2 */}
          <div className='flex min-w-0 flex-nowrap items-center gap-x-4 overflow-hidden text-[12px] font-medium text-[var(--gray-10)]'>
            <div className='flex min-w-0 shrink-0 items-center gap-1.5'>
              <Icon className='size-3.5 shrink-0' name='tabler:hash' />
              <HoverExpandableText
                className='text-[12px] font-medium text-[var(--gray-10)]'
                normalMaxWidthClass='max-w-[100px]'
                text={extractPONumber(row)}
              />
            </div>
            {(() => {
              const glNumber = findGLNumber(row)
              const category = findCategory(row)
              return (
                <>
                  {glNumber && (
                    <div className='flex min-w-0 items-center gap-1.5 text-[var(--gray-8)]'>
                      <Icon className='size-3.5 shrink-0' name='tabler:stack' />
                      <HoverExpandableText
                        className='text-[12px] font-medium text-[var(--gray-8)]'
                        normalMaxWidthClass='max-w-[90px]'
                        text={glNumber}
                      />
                    </div>
                  )}
                  {category && (
                    <div className='flex min-w-0 items-center gap-1.5 text-[var(--gray-8)]'>
                      <Icon className='size-3.5 shrink-0' name='tabler:tag' />
                      <HoverExpandableText
                        className='text-[12px] font-medium text-[var(--gray-8)]'
                        normalMaxWidthClass='max-w-[100px]'
                        text={category}
                      />
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* AI Insight inside Column 2 (stacked, visible ONLY when playground/chat/sidebar is open) */}
          {activeTab !== 'Processed' && aiInsight && isSidebarOpen && (
            <div className='mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[var(--primary-9)]'>
              <AiBrandIcon
                className='size-3.5 shrink-0'
                variant='outline-purple'
              />
              <HoverExpandableText
                className='text-[12px] font-medium text-[var(--primary-9)]'
                expandStyle='inline'
                maxLines={2}
                normalMaxWidthClass='max-w-[180px]'
                text={aiInsight}
              />
            </div>
          )}
        </div>

        {/* AI Insight Line - Centered in middle of row (visible ONLY when playground/chat/sidebar is closed) */}
        {activeTab !== 'Processed' && aiInsight && !isSidebarOpen && (
          <div className='flex min-w-0 flex-1 items-center justify-center px-4'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <AiBrandIcon
                className='size-3.5 shrink-0 text-[var(--primary-9)]'
                variant='outline-purple'
              />
              <HoverExpandableText
                className='text-[13px] font-medium text-[var(--gray-11)]'
                expandStyle='inline'
                maxLines={2}
                normalMaxWidthClass='max-w-[180px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[450px]'
                text={aiInsight}
              />
            </div>
          </div>
        )}

        {/* Columns 1-4 perfectly aligned across all rows */}
        <div className='ml-auto flex shrink-0 items-center gap-6 select-none'>
          {/* Column 3: Terms & Due Calculation */}
          <div className='flex w-[84px] shrink-0 flex-col items-center justify-center text-center'>
            <TermsColumn activeTab={activeTab} row={row} />
          </div>

          {/* Column 4: Invoice Value & Date */}
          <div className='flex w-[88px] shrink-0 flex-col items-end'>
            <span className='text-[15px] leading-none font-semibold tracking-tight text-[var(--text-primary)] tabular-nums'>
              {amount !== null && !Number.isNaN(amount) ? (
                `$${amount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}`
              ) : (
                <span className='text-[14px] font-semibold text-[var(--gray-9)]'>
                  N/A
                </span>
              )}
            </span>
            <span className='mt-1.5 text-[12px] font-medium text-[var(--gray-10)]'>
              {(() => {
                const rawDate =
                  extractInvoiceDate(row) ||
                  row.invoiceDate ||
                  row.invoice_date ||
                  row.date ||
                  row.createdAtUtc ||
                  row.createdAt

                if (rawDate && rawDate !== '-') {
                  const parsed = parseUtcDate(rawDate) || new Date(rawDate)
                  if (parsed && !Number.isNaN(parsed.getTime())) {
                    return dayjs(parsed).format('MMM DD, YYYY')
                  }
                }
                return 'Aug 20, 2026'
              })()}
            </span>
          </div>
        </div>

        {/* Navigation Arrow */}
        <div className='flex w-6 shrink-0 items-center justify-end select-none'>
          <Icon
            className='size-5 translate-x-[-4px] text-[var(--gray-8)] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-[var(--gray-8)] group-hover:opacity-100'
            name='tabler:arrow-right'
          />
        </div>
      </motion.div>
    )
  },
)

const getProceedAction = (item: any, rawWorkflowData: any) => {
  if (!item) return null

  // 1. Resolve actions using the exact overview component logic
  const isApAgentStage = item.stageType === 'AP_AGENT'
  let actionsList: any[] = []

  if (!isApAgentStage) {
    const rules = rawWorkflowData?.workflowJson?.rules || []
    const currentActivityId = item.activityId
    const dynamicRules = currentActivityId
      ? rules.filter((rule: any) => rule.fromBlockId === currentActivityId)
      : []

    const ruleActions = dynamicRules.map((rule: any) => {
      const actionName = rule.proceedAction || rule.action || 'Submit'
      return {
        color: 'green' as const,
        icon: 'tabler:check',
        label: actionName,
        value: actionName,
      }
    })

    const fallbackActions = item._actions || []
    actionsList = ruleActions.length > 0 ? ruleActions : fallbackActions
  }

  // 2. Find the positive proceed action
  return (
    actionsList.find((act: any) => {
      const label = String(act.label || '').toLowerCase()
      const value = String(act.value || '').toLowerCase()
      return (
        !label.includes('reject') &&
        !label.includes('cancel') &&
        !label.includes('deny') &&
        !value.includes('reject') &&
        !value.includes('cancel') &&
        !value.includes('deny')
      )
    }) || null
  )
}

const getActionText = (label: string) => {
  const lower = (label || '').toLowerCase()
  if (lower === 'approve') return 'Approved'
  if (lower === 'verify') return 'Verified'
  if (lower === 'complete') return 'Completed'
  if (lower === 'submit') return 'Submitted'
  return `${label}`
}

interface GridViewProps<TData> {
  data: any[]
  isLoading: boolean
  table: TanstackTable<TData>
  actions?: TableActionButton[]
  activeTab?: string
  hideExport?: boolean
  hideReload?: boolean
  isReloading?: boolean
  rowSize?: RowSize
  workflow?: WorkflowOption | null
  onNewRequest?: () => void
  onReload?: () => void
  onRowClick: (item: any, tab: string) => void
  onRowSizeChange?: (size: RowSize) => void
}

const GridView = <TData,>({
  actions,
  activeTab,
  data,
  hideExport = false,
  hideReload = false,
  isLoading,
  isReloading,
  rowSize: _rowSize,
  table,
  workflow,
  onNewRequest,
  onReload,
  onRowClick,
  onRowSizeChange: _onRowSizeChange,
}: GridViewProps<TData>) => {
  const { t } = useLingui()
  const listScrollRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  )

  const rawWorkflowData = requestStore((state) => state.rawWorkflowData)

  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
    new Set(),
  )

  useLayoutEffect(() => {
    const el = listScrollRef.current
    if (!el) return
    const measure = () => {
      const width = Math.max(0, el.offsetWidth - el.clientWidth)
      setScrollbarWidth((current) => (current === width ? current : width))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [data, isLoading])

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab])

  const groupIdsSignature = useMemo(
    () => data.map((g: any) => g.groupId).join('|'),
    [data],
  )

  useEffect(() => {
    setCollapsedGroupIds(new Set())
  }, [groupIdsSignature])

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

  const selectedItems = useMemo(() => {
    return allItems.filter((item, index) => {
      const rowId = item?.id || item?.processId || `item-${index}`
      return selectedIds.has(rowId)
    })
  }, [allItems, selectedIds])

  const actionValidation = useMemo(() => {
    if (selectedItems.length === 0) {
      return {
        action: null,
        isValid: true,
        mismatchAction: null,
        mismatchItem: null,
      }
    }

    const firstAction = getProceedAction(selectedItems[0], rawWorkflowData)
    const refAction = firstAction || { label: t`No action`, value: 'none' }

    for (let i = 1; i < selectedItems.length; i++) {
      const currentAct = getProceedAction(selectedItems[i], rawWorkflowData)
      const currentAction = currentAct || { label: t`No action`, value: 'none' }
      if (currentAction.value !== refAction.value) {
        return {
          action: firstAction,
          isValid: false,
          mismatchAction: currentAct,
          mismatchItem: selectedItems[i],
        }
      }
    }

    return {
      action: firstAction,
      isValid: true,
      mismatchAction: null,
      mismatchItem: null,
    }
  }, [selectedItems, rawWorkflowData])

  const toggleRowSelection = useCallback(
    (id: string | number, e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    [],
  )

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

  const isAllSelected =
    allItems.length > 0 && selectedIds.size === allItems.length
  const isPartiallySelected =
    selectedIds.size > 0 && selectedIds.size < allItems.length

  const checkboxBorderClass =
    isAllSelected || isPartiallySelected
      ? 'border-[var(--primary-9)] bg-surface'
      : 'border-[var(--gray-3)] bg-surface hover:border-[var(--primary-9)]'

  let content
  if (isLoading) {
    content = (
      <div className='flex flex-col gap-3 py-2'>
        {[1, 2, 3].map((i) => (
          <GridRowSkeleton index={i} key={i} />
        ))}
      </div>
    )
  } else if (allItems.length === 0) {
    const emptyPage =
      activeTab === 'Exceptions'
        ? 'requests-exceptions'
        : activeTab === 'Processed'
          ? 'requests-processed'
          : 'requests'
    content = (
      <ListEmptyState
        containerClassName='py-12'
        page={emptyPage}
        table={table as TanstackTable<any>}
        onPrimaryAction={
          activeTab === 'Inbox' || !activeTab ? onNewRequest : undefined
        }
      />
    )
  } else {
    let flatIndex = 0
    content = (
      <div className='flex flex-col gap-3 pt-3 pb-4'>
        {data.map((group: any) => {
          const groupId = group.groupId || 'root'
          const isRealGroup = Boolean(group.groupKey && group.groupValue)
          const isCollapsed = isRealGroup && collapsedGroupIds.has(groupId)
          const groupItems: any[] = Array.isArray(group.items)
            ? group.items
            : []

          // PO amount is a single value shared by every request against the
          // same PO — take it once, don't sum it.
          const poTotal = Number(
            groupItems.find(
              (item: any) => Number(item['WksH1Mrs42X4J9AHgoBtw']) > 0,
            )?.['WksH1Mrs42X4J9AHgoBtw'] || 0,
          )
          const invoiceTotal = groupItems.reduce(
            (acc: number, item: any) =>
              acc + Number(item['suyqsm0SYii_8vsj4p0c_'] || 0),
            0,
          )
          const isAmountMatch =
            Math.abs(poTotal - invoiceTotal) < 0.01 && poTotal > 0
          const showAmounts =
            groupItems.length > 0 &&
            (groupItems[0]['WksH1Mrs42X4J9AHgoBtw'] !== undefined ||
              groupItems[0]['suyqsm0SYii_8vsj4p0c_'] !== undefined)

          const groupRows = groupItems.map((row: any) => {
            const originalIndex =
              typeof row?._originalIndex === 'number'
                ? row._originalIndex
                : flatIndex
            flatIndex++
            const rowId = row?.id || row?.processId || `item-${originalIndex}`
            const isSelected = selectedIds.has(rowId)
            return (
              <GridRowItem
                activeTab={activeTab}
                hasSelectionActive={selectedIds.size > 0}
                index={originalIndex}
                isSelected={isSelected}
                key={rowId}
                row={row}
                toggleRowSelection={toggleRowSelection}
                workflow={workflow}
                onRowClick={onRowClick}
              />
            )
          })

          if (!isRealGroup) {
            return (
              <div className='flex flex-col gap-2.5' key={groupId}>
                {groupRows}
              </div>
            )
          }

          return (
            <div className='flex flex-col gap-2' key={groupId}>
              <button
                className='group/header sticky top-0 z-10 flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--gray-2)] bg-[var(--gray-1)] px-4 py-3.5 text-left transition-all hover:border-[var(--primary-4)] hover:bg-[var(--primary-2)]'
                type='button'
                onClick={() => toggleGroupCollapsed(groupId)}
              >
                <Icon
                  name='tabler:chevron-right'
                  className={cn(
                    'size-4 shrink-0 text-[var(--gray-8)] transition-transform duration-200',
                    !isCollapsed && 'rotate-90',
                  )}
                />
                <Icon
                  className='size-4 shrink-0 text-[var(--primary-9)]'
                  name='tabler:stack-2'
                />
                <span className='text-15 font-semibold whitespace-nowrap text-[var(--gray-13)]'>
                  {group.groupValue} ({group.groupCount})
                </span>
                {showAmounts && (
                  <div
                    className={cn(
                      'ml-auto flex items-center gap-4 rounded border px-3 py-1.5 text-xs font-normal',
                      isAmountMatch
                        ? 'border-[var(--green-3)] bg-[var(--green-2)]'
                        : 'border-[var(--gray-3)] bg-surface',
                    )}
                  >
                    <span className='flex items-center gap-1.5'>
                      <span
                        className={cn(
                          'text-[10px] font-normal uppercase',
                          isAmountMatch
                            ? 'text-[var(--green-9)]'
                            : 'text-[var(--gray-9)]',
                        )}
                      >
                        PO
                      </span>
                      <span
                        className={
                          isAmountMatch
                            ? 'text-[var(--green-11)]'
                            : 'text-[var(--secondary-9)]'
                        }
                      >
                        ${poTotal.toFixed(2)}
                      </span>
                    </span>
                    <span className='flex items-center gap-1.5'>
                      <span
                        className={cn(
                          'text-[10px] font-normal uppercase',
                          isAmountMatch
                            ? 'text-[var(--green-9)]'
                            : 'text-[var(--gray-9)]',
                        )}
                      >
                        Inv
                      </span>
                      <span
                        className={
                          isAmountMatch
                            ? 'text-[var(--green-11)]'
                            : 'text-[var(--primary-9)]'
                        }
                      >
                        ${invoiceTotal.toFixed(2)}
                      </span>
                    </span>
                  </div>
                )}
              </button>
              {!isCollapsed && (
                <div className='flex flex-col gap-2.5 pl-3'>{groupRows}</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className='flex h-full flex-col overflow-hidden'>
        {/* Temporarily hidden: Invoices group header */}
        <div className='sticky top-0 z-20 hidden items-center justify-between border-b border-[var(--gray-2)] bg-surface/70 py-1 pr-4 pl-7 backdrop-blur-sm'>
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
                  {t`${selectedIds.size} Selected`}
                </span>

                {activeTab === 'Processed' ? (
                  <button
                    className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--green-3)] bg-[var(--green-2)] px-3 py-1.5 text-12 font-semibold text-[var(--green-11)] shadow-sm transition-all hover:bg-[var(--green-3)] hover:shadow-md active:scale-95'
                    type='button'
                    onClick={() => {
                      showToast({
                        message: t`Bulk marked ${selectedIds.size} requests as Paid successfully!`,
                        variant: 'success',
                      })
                      exitSelectionMode()
                    }}
                  >
                    <Icon
                      className='size-4 text-[var(--green-9)]'
                      name='tabler:circle-check'
                    />
                    {t`Mark as Paid`}
                  </button>
                ) : (
                  <>
                    {actionValidation.isValid && actionValidation.action
                      ? (() => {
                          // const isVerify = actionValidation.action.label.toLowerCase() === 'verify'
                          return (
                            <button
                              className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--green-3)] bg-[var(--green-2)] px-3 py-1.5 text-12 font-semibold text-[var(--green-11)] shadow-sm transition-all hover:bg-[var(--green-3)] hover:shadow-md active:scale-95'
                              type='button'
                              onClick={() => {
                                showToast({
                                  message: t`Bulk action "${actionValidation.action.label}" applied to ${selectedIds.size} requests successfully!`,
                                  variant: 'success',
                                })
                                exitSelectionMode()
                              }}
                            >
                              {/* <Icon
                              className={cn(
                                'size-4',
                                isVerify ? 'text-[var(--green-9)]' : 'text-white'
                              )}
                              name='tabler:circle-check'
                            /> */}
                              {getActionText(actionValidation.action.label)}
                            </button>
                          )
                        })()
                      : null}

                    {!actionValidation.isValid && (
                      <div className='animate-in fade-in slide-in-from-right-4 flex max-w-lg items-center gap-2 rounded-lg border border-[var(--orange-3)] bg-[var(--orange-2)] px-3 py-1.5 text-12 font-medium text-[var(--orange-11)] duration-300 md:max-w-xl lg:max-w-2xl'>
                        <Icon
                          className='size-4 shrink-0 text-[var(--orange-9)]'
                          name='tabler:alert-triangle'
                        />
                        <span className='truncate'>
                          Bulk action unavailable: Action mismatch detected.
                        </span>
                      </div>
                    )}
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
                {/* <TableFilters table={table} /> */}
                {!hideExport && <TableExport table={table} />}
                {!hideReload && (
                  <TableReload
                    isReloading={isReloading || false}
                    onReload={onReload || (() => {})}
                  />
                )}

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

        <div className='flex min-h-0 flex-1'>
          <div className='w-4 shrink-0' />
          <div className='relative min-h-0 min-w-0 flex-1'>
            <div
              className='minimal-scrollbar absolute inset-y-0 left-0 overflow-y-auto'
              ref={listScrollRef}
              style={{ width: `calc(100% + ${scrollbarWidth}px)` }}
            >
              {content}
            </div>
          </div>
          <div className='w-4 shrink-0' />
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
