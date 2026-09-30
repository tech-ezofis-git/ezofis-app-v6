import { useMemo, useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import { useAttachments } from '@/pages/requests/hooks/useAttachments'
import { useComments } from '@/pages/requests/hooks/useComments'
import { useHistory } from '@/pages/requests/hooks/useHistory'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  extractDueDate,
  extractPONumber,
  findInvoiceAmount,
  findInvoiceNumber,
  findSupplierName,
  formatAmount,
  getParsedFormData,
  isOverdue,
} from '@/pages/requests/utils/inboxItemDisplay'
import { getItemDecision } from '@/pages/requests/utils/inboxList.utils'
import type { StatusType } from './InvoiceDetailPieces'

const pick = (...vals: unknown[]) => {
  for (const v of vals) {
    if (v === null || v === undefined) continue
    if (typeof v === 'object') {
      const nested = (v as any)?.['Invoice Value'] ?? (v as any)?.value
      if (nested !== null && nested !== undefined) {
        const s = String(nested).trim()
        if (s && s !== '-' && s !== 'undefined') return s
      }
      continue
    }
    const s = String(v).trim()
    if (s && s !== '-' && s !== 'undefined' && s !== 'null') return s
  }
  return ''
}

const confidenceLabel = (val: unknown) => {
  if (val === null || val === undefined || val === '') return undefined
  const n = Number(val)
  if (!Number.isNaN(n)) {
    const pct = n <= 1 ? Math.round(n * 100) : Math.round(n)
    return `${pct}%`
  }
  const s = String(val)
  return s.includes('%') ? s : `${s}%`
}

const normalizeFieldName = (name: string) => {
  const normalized = name.toLowerCase().trim()
  if (
    ['vendor name', 'supplier name', 'supplier', 'vendor'].includes(normalized)
  ) {
    return 'supplier name'
  }
  if (
    [
      'total due',
      'invoice amount',
      'invoice value',
      'amount',
      'total amount',
    ].includes(normalized)
  ) {
    return 'total due'
  }
  if (['invoice number', 'invoice no', 'invoice no.'].includes(normalized)) {
    return 'invoice number'
  }
  return normalized
}

const getLineRaw = (item: any, keys: string[]) => {
  for (const key of keys) {
    const val = item?.[key]
    if (val === null || val === undefined) continue
    if (typeof val === 'object') {
      const nested =
        val['Invoice Value'] ?? val['PO Value'] ?? val.value ?? val.val
      if (nested !== null && nested !== undefined && String(nested).trim()) {
        return String(nested)
      }
      continue
    }
    if (String(val).trim()) return String(val)
  }
  return ''
}

export type NormalizedLineItem = {
  amount: string
  description: string
  quantity: string
  score?: string
  unitPrice: string
}

export function useMobileRequestDetail() {
  const { selectedItem, selectedWorkflow, selectedWorkflowId } = requestStore()

  const workflowId =
    selectedWorkflowId || selectedWorkflow?.id || selectedItem?.workflowId
  const processId =
    selectedItem?.processId ||
    selectedItem?.workflowInstanceId ||
    selectedItem?.id
  const transactionId = selectedItem?.transactionId

  const {
    data: request,
    error,
    isFetching,
    isLoading,
    refetch,
  } = useRequestDetail(workflowId, processId, transactionId)

  const agent = useMemo(() => {
    const list = request?._agentData || selectedItem?._agentData || []
    if (Array.isArray(list) && list.length > 0) return list[0]
    return request?._agentResponse || selectedItem?._agentResponse || {}
  }, [request, selectedItem])

  const attachments = useAttachments(workflowId, processId, !!processId)
  const comments = useComments(workflowId, processId, !!processId)
  const history = useHistory(workflowId, processId, !!processId)

  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  const row = request || selectedItem || {}
  const header = agent?.['Extracted Invoice JSON']?.invoice_header || {}
  const formFields = getParsedFormData(row)

  const getFieldScore = (key: string) => {
    const cleanK = normalizeFieldName(key)
    const matchingFields = agent?.debug?.['Side-by-side Field Matching'] || []
    for (const field of matchingFields) {
      if (field?.Field && normalizeFieldName(String(field.Field)) === cleanK) {
        return confidenceLabel(field.Score)
      }
    }
    return undefined
  }

  const invoiceNumber = pick(
    findInvoiceNumber(row),
    header['Invoice Number'],
    header['Invoice No'],
    header.invoice_number,
    formFields['Invoice Number'],
    row.documentNumber,
    row.requestNo,
  )

  const poNumber = pick(
    extractPONumber(row) !== 'N/A' ? extractPONumber(row) : '',
    header['PO Number'],
    header.po_number,
    agent?.po_matching?.['PO Number'],
    agent?.po_matching?.po_number,
  )

  const supplier = pick(
    findSupplierName(row),
    header['Supplier Name'],
    header['Vendor Name'],
    header.Supplier,
    header.Vendor,
  )

  const invoiceAmountRaw = pick(
    findInvoiceAmount(row),
    header['Invoice Amount'],
    header['Total Due'],
    header.Total,
    agent?.po_matching?.['Invoice Value'],
  )

  const poAmountRaw = pick(
    agent?.po_matching?.total,
    agent?.po_matching?.amount,
    agent?.po_matching?.po_amount,
    agent?.po_matching?.total_amount,
    header['PO Value'],
    header['PO Amount'],
  )

  const currency = pick(header.Currency, header.currency, row.currency, 'CAD')
  const invoiceDate = pick(
    header['Invoice Date'],
    header.invoice_date,
    formFields['Invoice Date'],
    formFields['9F6tPVHoRnmONGx3kYJu2'],
  )
  const dueDate = extractDueDate(row)
  const decision = getItemDecision(row).toUpperCase() || pick(agent?.decision)
  const overdue = isOverdue(row)

  let daysUntilDue: number | null = null
  if (dueDate && dueDate !== '-') {
    const due = new Date(dueDate)
    if (!Number.isNaN(due.getTime())) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      daysUntilDue = Math.floor((due.getTime() - today.getTime()) / 86400000)
    }
  }

  const matched =
    decision === 'APPROVED' ||
    decision === 'MATCHED' ||
    String(agent?.po_matching?.status || '')
      .toLowerCase()
      .includes('match')

  const duplicateStatus = String(
    agent?.duplicate_check?.status || '',
  ).toUpperCase()
  const isDuplicate =
    row.isDuplicateInvoice ||
    agent?.is_duplicate_invoice ||
    duplicateStatus === 'DUPLICATE' ||
    duplicateStatus === 'DUPLICATED'

  const supplierStatusRaw = String(
    agent?.supplier_verification?.status ||
      agent?.supplier_validation?.status ||
      '',
  ).toLowerCase()
  const supplierVerified =
    agent?.supplier_verification?.verified === true ||
    supplierStatusRaw === 'verified' ||
    (supplierStatusRaw.includes('verified') &&
      !supplierStatusRaw.includes('not'))

  const paymentTermsRaw = pick(
    agent?.payment_terms?.terms,
    agent?.payment_terms?.payment_terms,
    header['Payment Terms'],
    formFields['Payment Terms'],
    formFields['vxnKCXsXkz8_acPogKe'],
  )

  const paymentBadge =
    overdue || (daysUntilDue !== null && daysUntilDue < 0)
      ? 'Overdue'
      : daysUntilDue !== null
        ? 'in due'
        : pick(agent?.payment_terms?.status, 'Terms')

  const paymentBadgeTone: StatusType =
    paymentBadge === 'Overdue'
      ? 'danger'
      : paymentBadge === 'in due'
        ? 'info'
        : 'default'

  const paymentDaysText =
    daysUntilDue !== null
      ? overdue || daysUntilDue < 0
        ? `${Math.abs(daysUntilDue)} Days`
        : `${daysUntilDue} Days`
      : paymentTermsRaw || '—'

  const formatMoney = (raw: string | null) => {
    const amount = formatAmount(raw)
    if (!raw || amount === '—') return '—'
    if (amount.startsWith('$')) return `${currency} ${amount}`
    return `${currency} ${amount}`
  }

  const confidence =
    confidenceLabel(
      agent?.po_matching?.confidence ||
        agent?.confidence ||
        agent?.score ||
        header.confidence ||
        agent?.['Extracted Invoice JSON']?.confidence,
    ) ||
    getFieldScore('Invoice Amount') ||
    '—'

  const extractedRows = [
    {
      confidence:
        getFieldScore('PO Number') ||
        confidenceLabel(header['PO Number_confidence']),
      highlightValue: false,
      label: 'PO number',
      value: poNumber || '—',
    },
    {
      confidence:
        getFieldScore('Invoice Number') ||
        confidenceLabel(header['Invoice Number_confidence']),
      highlightValue: true,
      label: 'Invoice no.',
      value: invoiceNumber || '—',
    },
    {
      confidence:
        getFieldScore('Invoice Amount') ||
        getFieldScore('Total Due') ||
        confidenceLabel(header['Invoice Amount_confidence']),
      highlightValue: false,
      label: 'Invoice amount',
      value: formatMoney(invoiceAmountRaw || null),
    },
    {
      confidence:
        getFieldScore('Currency') ||
        confidenceLabel(header['Currency_confidence']),
      highlightValue: false,
      label: 'Currency',
      value: currency || '—',
    },
    {
      confidence:
        getFieldScore('Supplier Name') ||
        confidenceLabel(header['Supplier Name_confidence']),
      highlightValue: false,
      label: 'Supplier',
      value: supplier || '—',
    },
    {
      confidence:
        getFieldScore('Invoice Date') ||
        confidenceLabel(header['Invoice Date_confidence']),
      highlightValue: false,
      label: 'Invoice date',
      value: invoiceDate || '—',
    },
    {
      highlightValue: false,
      label: 'Due date',
      value: dueDate !== '-' ? dueDate : '—',
    },
    {
      highlightValue: false,
      label: 'Payment terms',
      value: paymentTermsRaw || '—',
    },
  ]

  const rawLineItems =
    agent?.['Extracted Invoice JSON']?.invoice_items ||
    agent?.['Extracted Invoice JSON']?.line_items ||
    agent?.line_items ||
    agent?.debug?.['Side-by-side Line Item matching'] ||
    []

  const lineItems: NormalizedLineItem[] = (
    Array.isArray(rawLineItems) ? rawLineItems : []
  ).map((item: any) => {
    const score = confidenceLabel(
      item['Line Score'] ?? item.score ?? item.Score,
    )
    return {
      amount:
        formatMoney(
          getLineRaw(item, [
            'Amount',
            'Line Amount',
            'line amount',
            'LineAmount',
            'total',
            'amount',
            'line_amount',
            'lineAmount',
          ]) || null,
        ) || '—',
      description:
        getLineRaw(item, [
          'Description',
          'description',
          'Item',
          'item',
          'name',
          'item_no',
          'itemNo',
        ]) || 'Line item',
      quantity: getLineRaw(item, ['Quantity', 'quantity', 'Qty', 'qty']) || '—',
      score,
      unitPrice:
        formatMoney(
          getLineRaw(item, [
            'Unit Price',
            'unit_price',
            'Price',
            'price',
            'rate',
            'Rate',
          ]) || null,
        ) ||
        getLineRaw(item, [
          'Unit Price',
          'unit_price',
          'Price',
          'price',
          'rate',
          'Rate',
        ]) ||
        '—',
    }
  })

  const statusLabel = overdue
    ? 'Overdue'
    : matched
      ? 'Matched'
      : decision || row.stage || 'Pending'

  const statusTone: 'success' | 'warning' | 'error' | 'accent' = overdue
    ? 'error'
    : matched
      ? 'success'
      : decision.includes('REJECT') || decision.includes('NOT MATCH')
        ? 'warning'
        : 'accent'

  const submitComment = async () => {
    const text = commentText.trim()
    if (!text || !workflowId || !processId) return
    setCommentSubmitting(true)
    try {
      await workflowsApiV6.addInstanceComment(workflowId, processId, {
        comments: text,
        showTo: 2,
      })
      setCommentText('')
      await comments.refetch()
    } finally {
      setCommentSubmitting(false)
    }
  }

  return {
    agent,
    aiNote: agent?.ai_insight || agent?.aiInsight || agent?.reason || '',
    attachments: attachments.data,
    attachmentsLoading: attachments.isLoading,
    comments: comments.data,
    commentsLoading: comments.isLoading,
    commentSubmitting,
    commentText,
    confidence: confidence || '—',
    currency,
    decision,
    duplicateMessage: isDuplicate
      ? agent?.duplicate_check?.message || 'Duplicate detected'
      : 'No duplicates detected',
    duplicateStatus: isDuplicate
      ? agent?.duplicate_check?.status || 'Duplicate'
      : 'No Duplicate',
    duplicateTone: (isDuplicate ? 'danger' : 'success') as StatusType,
    error,
    extractedRows,
    history: history.data,
    historyLoading: history.isLoading,
    invoiceAmount: formatMoney(invoiceAmountRaw || null),
    invoiceNumber: invoiceNumber || 'Invoice',
    isFetching,
    isLoading: isLoading && !selectedItem,
    lineItems,
    matched,
    paymentBadge,
    paymentBadgeTone,
    paymentDaysText,
    paymentTerms: paymentTermsRaw || '—',
    poAmount: formatMoney(poAmountRaw || invoiceAmountRaw || null),
    poMatchingStatus: matched ? 'Matched' : 'Not Matched',
    poMatchingTone: (matched ? 'success' : 'warning') as StatusType,
    poNumber: poNumber || '—',
    poSubtitle: poNumber
      ? `PO ${String(poNumber).replace(/^PO[-\s]?/i, '')}`
      : '—',
    processId,
    refetch,
    request,
    selectedItem,
    statusLabel,
    statusTone,
    submitComment,
    supplier: supplier || 'Unknown Supplier',
    supplierNeedsAction: !supplierVerified,
    supplierStatus: supplierVerified ? 'Active' : 'Action needed',
    supplierTone: (supplierVerified ? 'success' : 'warning') as StatusType,
    supplierValue: supplierVerified
      ? 'Supplier verified'
      : pick(agent?.supplier_verification?.message, 'Not verified'),
    workflowId,
    setCommentText,
  }
}
