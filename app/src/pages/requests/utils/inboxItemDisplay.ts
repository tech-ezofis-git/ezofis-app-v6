import {
  getAgentDataFromItem,
  getItemDecision,
} from '@/pages/requests/utils/inboxList.utils'
import { formatUtcToLocalDate } from '@/utils/utcDate'

export type InboxCardData = {
  aiNote?: string
  amount: string
  id: string
  meta: string
  po?: string
  raw?: any
  reference: string
  status: string
  statusTone: InboxCardTone
  vendor: string
}

export type InboxCardTone = 'error' | 'success' | 'warning' | 'accent'

const isNonEmptyString = (val: unknown) =>
  typeof val === 'string' && val.trim() !== '' && val.trim() !== '-'

export const getParsedFormData = (row: any): Record<string, any> => {
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

const searchByKeys = (obj: any, keys: string[]): string | null => {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    const val = obj[key]
    if (isNonEmptyString(val)) return String(val).trim()
    if (val && typeof val === 'object') {
      const nested =
        val.value ?? val.val ?? val['Invoice Value'] ?? val['InvoiceValue']
      if (isNonEmptyString(nested)) return String(nested).trim()
    }
  }
  return null
}

export const findSupplierName = (row: any): string | null => {
  const parsedForm = getParsedFormData(row)
  const agent = getAgentDataFromItem(row)
  const header = agent?.['Extracted Invoice JSON']?.invoice_header

  return (
    searchByKeys(parsedForm, [
      'UtfgJy6Z0qyfRC5Bclf-c',
      'UtfgJy6Z0qyfRC5Bclf_c',
      'Supplier Name',
      'Vendor Name',
      'SupplierName',
      'VendorName',
      'Supplier',
      'Vendor',
    ]) ||
    searchByKeys(header, [
      'Supplier Name',
      'Vendor Name',
      'Supplier',
      'Vendor',
    ]) ||
    searchByKeys(agent, [
      'Supplier Name',
      'Vendor Name',
      'supplier',
      'vendor',
    ]) ||
    null
  )
}

export const findInvoiceNumber = (row: any): string | null => {
  const parsedForm = getParsedFormData(row)
  const agent = getAgentDataFromItem(row)
  const header = agent?.['Extracted Invoice JSON']?.invoice_header

  return (
    searchByKeys(parsedForm, [
      'kvcYuknkDumkTenjvrVLj',
      'Invoice Number',
      'InvoiceNumber',
      'invoice_number',
      'Invoice No',
    ]) ||
    searchByKeys(header, [
      'Invoice Number',
      'InvoiceNumber',
      'invoice_number',
    ]) ||
    (row.documentNumber ? String(row.documentNumber) : null) ||
    (row.requestNo ? String(row.requestNo) : null) ||
    null
  )
}

export const findInvoiceAmount = (row: any): string | null => {
  const parsedForm = getParsedFormData(row)
  const agent = getAgentDataFromItem(row)
  const header = agent?.['Extracted Invoice JSON']?.invoice_header

  return (
    searchByKeys(parsedForm, [
      'suyqsm0SYii_8vsj4p0c_',
      'WksH1Mrs42X4J9AHgoBtw',
      'Invoice Amount',
      'Invoice Value',
      'Amount',
      'Total',
    ]) ||
    searchByKeys(header, [
      'Invoice Amount',
      'Invoice Value',
      'Amount',
      'Total',
    ]) ||
    searchByKeys(agent?.po_matching, ['Invoice Value', 'Amount']) ||
    null
  )
}

export const extractPONumber = (row: any): string => {
  const parsedForm = getParsedFormData(row)
  const agent = getAgentDataFromItem(row)
  const header = agent?.['Extracted Invoice JSON']?.invoice_header

  return (
    searchByKeys(parsedForm, [
      'RXwLGHILLrreMmRqlk9mj',
      'PO Number',
      'PONumber',
      'po_number',
      'Purchase Order',
    ]) ||
    searchByKeys(header, ['PO Number', 'PONumber', 'po_number']) ||
    searchByKeys(agent?.po_matching, ['PO Number', 'po_number']) ||
    'N/A'
  )
}

const DUE_DATE_FORM_KEYS = [
  '792IWMnNXLKyfXjCGcowU',
  'kjQFGFMRYBzLnAz9Yrx_c',
  'Due Date',
  'due_date',
  'Due_Date',
  'DueDate',
]

const TERMS_FORM_KEYS = [
  'vxnKCXsXkz8_acPogKe',
  'vxnKCXs-Xkz8_acPog-Ke',
  'BsPnOsYv6F1fbzWsTpXCW',
  'Payment Terms',
  'payment_terms',
  'Terms',
  'terms',
]

const INVOICE_DATE_FORM_KEYS = [
  '9F6tPVHoRnmONGx3kYJu2',
  'Invoice Date',
  'invoice_date',
  'invoiceDate',
]

const normalizeFormValue = (val: unknown): string | null => {
  if (val == null || val === '-' || val === '') return null
  if (typeof val === 'object') {
    const nested =
      (val as any).value ??
      (val as any).val ??
      (val as any).text ??
      (val as any)['Due Date']
    return isNonEmptyString(nested) ? String(nested).trim() : null
  }
  const str = String(val).trim()
  return str && str !== '-' ? str : null
}

const pickFromForm = (
  parsedForm: Record<string, any>,
  keys: string[],
): string | null => {
  for (const key of keys) {
    const found = normalizeFormValue(parsedForm[key])
    if (found) return found
  }
  // Label/id match when keys differ slightly
  for (const key of Object.keys(parsedForm || {})) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (
      keys.some((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized)
    ) {
      const found = normalizeFormValue(parsedForm[key])
      if (found) return found
    }
  }
  return null
}

export const extractPaymentTermsFromForm = (row: any): string => {
  const parsedForm = getParsedFormData(row)
  return pickFromForm(parsedForm, TERMS_FORM_KEYS) || '-'
}

export const extractDueDate = (row: any): string => {
  const parsedForm = getParsedFormData(row)
  const agent = getAgentDataFromItem(row)
  const header = agent?.['Extracted Invoice JSON']?.invoice_header

  // 1) Prefer Due Date from the form control
  let val =
    pickFromForm(parsedForm, DUE_DATE_FORM_KEYS) ||
    searchByKeys(parsedForm, DUE_DATE_FORM_KEYS) ||
    (row.dueDate ? String(row.dueDate) : null) ||
    (row.due_date ? String(row.due_date) : null) ||
    searchByKeys(header, ['Due Date', 'DueDate', 'due_date']) ||
    agent?.payment_terms?.due_date ||
    agent?.po_matching?.due_date ||
    null

  // 2) Only if due date is missing, calculate from invoice date + terms
  if (!val || val === '-') {
    const invDateStr = pickFromForm(parsedForm, INVOICE_DATE_FORM_KEYS)
    const termsStr =
      pickFromForm(parsedForm, TERMS_FORM_KEYS) ||
      searchByKeys(header, ['Payment Terms', 'Terms', 'terms']) ||
      ''
    const numMatch = /\d+/.exec(String(termsStr))
    if (invDateStr && numMatch) {
      const days = Number.parseInt(numMatch[0], 10)
      const d = new Date(invDateStr)
      if (!Number.isNaN(d.getTime())) {
        d.setDate(d.getDate() + days)
        val = d.toISOString().split('T')[0]
      }
    }
  }

  if (!val || val === '-') return '-'
  return String(val)
}

export const isOverdue = (row: any) => {
  const dueDateStr = extractDueDate(row)
  if (!dueDateStr || dueDateStr === '-') return false
  try {
    const dueDate = new Date(dueDateStr)
    if (Number.isNaN(dueDate.getTime())) {
      // dayjs-friendly formats like DD-MMM-YYYY
      const parts = String(dueDateStr).trim()
      const parsed = Date.parse(parts)
      if (Number.isNaN(parsed)) return false
      const d = new Date(parsed)
      d.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return d < today
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  } catch {
    return false
  }
}

export const getDaysOverdue = (row: any) => {
  const dueDateStr = extractDueDate(row)
  if (!dueDateStr || dueDateStr === '-') return 0
  const dueDate = new Date(dueDateStr)
  if (Number.isNaN(dueDate.getTime())) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

export const formatAmount = (raw: string | null) => {
  if (!raw) return '—'
  const num = Number(String(raw).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(num)) return String(raw)
  return `$${num.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`
}

export const getHighValueThreshold = (rows: any[]) => {
  let max = 0
  rows.forEach((row) => {
    const amtStr = findInvoiceAmount(row)
    const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
    if (!Number.isNaN(amount) && amount > max) max = amount
  })
  if (max <= 0) return 10000
  return Math.max(1000, Math.round(max * 0.8))
}

export const filterRowsByQuickFilters = (
  rows: any[],
  activeQuickFilters: string[],
) => {
  if (!activeQuickFilters.length) return rows

  const activeStatus = activeQuickFilters.filter(
    (f) =>
      f === 'matched' ||
      f === 'discrepancies' ||
      f.startsWith('status:') ||
      f.startsWith('discrepancies:'),
  )
  const activeAmount = activeQuickFilters.filter(
    (f) => f === 'highValue' || f.startsWith('amount:'),
  )
  const activeDueDate = activeQuickFilters.filter(
    (f) =>
      f === 'overdue' || f.startsWith('due_date:') || f.startsWith('overdue:'),
  )
  const dynamicHighValue = getHighValueThreshold(rows)

  return rows.filter((row) => {
    const decision = getItemDecision(row).toUpperCase()
    const overdue = isOverdue(row)
    const isMatched = decision === 'APPROVED' || decision === 'MATCHED'
    const isDisc =
      decision === 'PARTIALLY APPROVED' ||
      decision === 'PARTIALLY MATCHED' ||
      decision === 'REJECTED' ||
      decision === 'NOT MATCHED' ||
      decision === 'NO MATCH' ||
      row.isDuplicateInvoice === true

    const amtStr = findInvoiceAmount(row)
    const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0

    let matchesStatus = true
    if (activeStatus.length > 0) {
      matchesStatus = activeStatus.some((filter) => {
        if (filter === 'matched') return isMatched
        if (filter === 'discrepancies') return isDisc
        return false
      })
    }

    let matchesAmount = true
    if (activeAmount.length > 0) {
      matchesAmount = activeAmount.some((filter) => {
        if (filter === 'highValue') return amount >= dynamicHighValue
        return false
      })
    }

    let matchesDue = true
    if (activeDueDate.length > 0) {
      matchesDue = activeDueDate.some((filter) => {
        if (filter === 'overdue') return overdue
        return false
      })
    }

    return matchesStatus && matchesAmount && matchesDue
  })
}

export const countQuickFilterMatches = (rows: any[]) => {
  const highValue = getHighValueThreshold(rows)
  let overdue = 0
  let matched = 0
  let discrepancies = 0
  let high = 0

  rows.forEach((row) => {
    const decision = getItemDecision(row).toUpperCase()
    if (isOverdue(row)) overdue += 1
    if (decision === 'APPROVED' || decision === 'MATCHED') matched += 1
    if (
      decision === 'PARTIALLY APPROVED' ||
      decision === 'PARTIALLY MATCHED' ||
      decision === 'REJECTED' ||
      decision === 'NOT MATCHED' ||
      decision === 'NO MATCH' ||
      row.isDuplicateInvoice === true
    ) {
      discrepancies += 1
    }
    const amtStr = findInvoiceAmount(row)
    const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
    if (amount >= highValue) high += 1
  })

  return { discrepancies, high, matched, overdue }
}

export const mapInboxItemToRequestCard = (row: any): InboxCardData => {
  const id = String(row.processId || row.workflowInstanceId || row.id || '')
  const vendor =
    findSupplierName(row) || row.vendor || row.raisedBy || 'Unknown Supplier'
  const invoice =
    findInvoiceNumber(row) || row.documentNumber || row.requestNo || `INV-${id}`
  const poRaw = extractPONumber(row)
  const po = poRaw && poRaw !== 'N/A' ? poRaw : ''
  const amount = formatAmount(findInvoiceAmount(row))
  const decision = getItemDecision(row).toUpperCase()
  const overdue = isOverdue(row)
  const agent = getAgentDataFromItem(row)

  let status = decision || row.stage || 'Pending'
  let statusTone: InboxCardTone = 'accent'

  if (overdue) {
    status = 'Overdue'
    statusTone = 'error'
  } else if (decision === 'APPROVED' || decision === 'MATCHED') {
    status = 'Matched'
    statusTone = 'success'
  } else if (
    decision === 'REJECTED' ||
    decision === 'NOT MATCHED' ||
    decision === 'NO MATCH' ||
    decision === 'PARTIALLY APPROVED' ||
    decision === 'PARTIALLY MATCHED' ||
    row.isDuplicateInvoice
  ) {
    status = 'Discrepancy'
    statusTone = 'warning'
  }

  const due = extractDueDate(row)
  const days = getDaysOverdue(row)
  const meta = overdue
    ? `${days} day${days === 1 ? '' : 's'} overdue`
    : due !== '-'
      ? `Due ${due}`
      : row.raisedAt
        ? `Raised ${formatUtcToLocalDate(row.raisedAt)}`
        : '—'

  return {
    aiNote: agent?.ai_insight || agent?.aiInsight || undefined,
    amount,
    id,
    meta,
    po,
    raw: row,
    reference: String(invoice),
    status,
    statusTone,
    vendor: String(vendor),
  }
}

export const flattenInboxGroups = (groups: any[] = []) => {
  const out: any[] = []
  const walk = (node: any) => {
    if (!node) return
    if (Array.isArray(node.items)) out.push(...node.items)
    if (Array.isArray(node.value)) out.push(...node.value)
    if (Array.isArray(node.rows)) out.push(...node.rows)
    if (Array.isArray(node.children)) node.children.forEach(walk)
    if (Array.isArray(node.groups)) node.groups.forEach(walk)
  }
  groups.forEach(walk)
  return out
}
