import { t as staticT } from '@lingui/macro'
import { useLingui } from '@lingui/react/macro'
import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core'
import { searchPlugin } from '@react-pdf-viewer/search'
import {
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  HistoryIcon,
  Layers,
  ListFilter,
  MessageCircle,
  PackageX,
  Paperclip,
  Store,
  Wallet,
  Wand2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ApiPlaygroundContext } from '@/components/playground/ApiPlayground'
import fileApi from '@/api/file/file'
import BarLoader from '@/components/base/BarLoader'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { isKanbanMissingMatch } from '@/pages/requests/helpers/kanbanBoard'
import { useAttachments } from '@/pages/requests/hooks/useAttachments'
import { useComments } from '@/pages/requests/hooks/useComments'
import requestStore from '@/pages/requests/stores/useRequestStore'
import '@react-pdf-viewer/core/lib/styles/index.css'
import {
  localizeRequestFieldLabel,
  localizeRequestStatus,
} from '@/pages/requests/utils/localizeRequestUi'
import '@react-pdf-viewer/search/lib/styles/index.css'
import { getMockDB, startSupplierVerification } from '@/services/mockBackend'
import authUserStore from '@/stores/authUserStore'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import dayjs from 'dayjs'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'

const formatPaymentSyncTime = (dateStr: any): string => {
  if (!dateStr) return '2 min ago'
  const parsed = parseUtcDate(dateStr)
  if (!parsed) return String(dateStr)
  const ms = Math.abs(Date.now() - parsed.getTime())
  if (Number.isNaN(ms)) return String(dateStr)
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return dayjs(parsed).format('DD-MMM-YYYY hh:mm A')
}

const formatErpSystem = (erp: string | null | undefined): string => {
  if (!erp) return 'SAP'
  const trimmed = String(erp).trim()
  if (trimmed === 'HANA Cloud' || trimmed === 'HANA') {
    return 'SAP HANA Cloud'
  }
  if (trimmed.includes('HANA') && !trimmed.includes('SAP')) {
    return `SAP ${trimmed}`
  }
  return trimmed
}
import {
  buildFieldMetaMap,
  findPreferredLineItemsTable,
  hasMeaningfulScalarValue,
  resolveFieldMeta,
} from '../../../Request'
import Attachments from '../attachment/Attachments'
import Comments from '../comment/Comments'
import History from '../history/History'
import LineItemTable from './LineItemTable'

// --- Helpers ---

const isUuid = (val: string | number | undefined | null): boolean => {
  if (typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val,
  )
}

const getPctColorClass = (pct: number): string => {
  if (pct === 100) {
    return 'border-[var(--green-5)] bg-[var(--green-1)]/30 text-[var(--green-10)]'
  }
  if (pct > 0) {
    return 'border-[var(--orange-5)] bg-[var(--orange-1)]/30 text-[var(--orange-10)]'
  }
  return 'border-[var(--gray-4)] bg-[var(--gray-1)]/30 text-[var(--gray-11)]'
}

const fetchV6Binary = async (repoId: string, itemId: string) => {
  const response = await fileApi.viewBinaryV6(repoId, itemId)
  if (response?.data instanceof Blob) {
    const mimeType = response.data.type || 'application/pdf'
    const url = URL.createObjectURL(response.data)
    return { isBlob: true, mimeType, url }
  }
  return null
}

const fetchLegacyBinary = async (
  repoId: string,
  itemId: string,
  tenantId: any,
  userId: any,
  selectedFileId: any,
) => {
  const rId = Number(repoId)
  if (!Number.isNaN(rId) && rId > 0) {
    const tId = tenantId ? Number(tenantId) : 2
    const uId = userId ? String(userId) : '2'
    const response = await fileApi.viewBinary(
      tId,
      uId,
      rId,
      Number(itemId) || selectedFileId,
      2,
    )

    const base64 = response?.data?.file || response?.data
    if (typeof base64 === 'string') {
      const mimeType = getMimeTypeFromBase64(base64)
      const url = formatBase64Url(base64, mimeType)
      return { isBlob: false, mimeType, url }
    }
  }
  return null
}

const getStatusStyles = (statusType: string) => {
  switch (statusType) {
    case 'success':
      return 'bg-[var(--green-1)] text-[var(--green-9)]'
    case 'warning':
      return 'bg-[var(--orange-1)] text-[var(--orange-9)]'
    case 'danger':
      return 'bg-[var(--red-1)] text-[var(--red-9)]'
    case 'info':
      return 'bg-[var(--blue-1)] text-[var(--blue-9)]'
    default:
      return 'bg-[var(--gray-1)] text-[var(--gray-11)]'
  }
}

const getStatusBorderStyles = (statusType: string) => {
  switch (statusType) {
    case 'success':
      return 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
    case 'warning':
      return 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
    case 'danger':
      return 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]'
    case 'info':
      return 'border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)]'
    default:
      return 'border-[var(--gray-3)] bg-[var(--gray-1)] text-[var(--gray-11)]'
  }
}

const updateValueInStructure = (obj: any, pathKey: string, val: any) => {
  if (
    obj[pathKey] &&
    typeof obj[pathKey] === 'object' &&
    'Invoice Value' in obj[pathKey]
  ) {
    obj[pathKey] = { ...obj[pathKey], 'Invoice Value': val }
  } else {
    obj[pathKey] = val
  }
}

const getRawVal = (obj: any, pathKey: string) => {
  if (
    obj[pathKey] &&
    typeof obj[pathKey] === 'object' &&
    'Invoice Value' in obj[pathKey]
  ) {
    return obj[pathKey]['Invoice Value']
  }
  return obj[pathKey]
}

const FIELD_KEYS_MAP: Record<string, string[]> = {
  amount: [
    'Amount',
    'Line Amount',
    'line amount',
    'LineAmount',
    'total',
    'amount',
    'line_amount',
    'lineAmount',
  ],
  description: ['Description', 'description', 'item_no', 'itemNo'],
  price: ['Price', 'rate', 'unit_price', 'price'],
  quantity: ['Quantity', 'quantity'],
}

const getFieldValueWithFallback = (item: any, keys: string[]) => {
  for (const k of keys) {
    const val = item[k]
    if (val && typeof val === 'object' && 'Invoice Value' in val) {
      const inner = val['Invoice Value']
      if (inner !== null && inner !== undefined && inner !== '') return inner
    } else if (val !== null && val !== undefined && val !== '') {
      return val
    }
  }
  return undefined
}

const updateFieldIfValid = (
  normalized: any,
  mainKey: string,
  fallbackKey: string,
  value: any,
) => {
  if (value !== undefined && value !== null && value !== '') {
    if (mainKey in normalized) {
      updateValueInStructure(normalized, mainKey, value)
    } else if (!normalized[fallbackKey]) {
      normalized[fallbackKey] = value
    }
  }
}

const normalizeExtractedLineItem = (item: any) => {
  const normalized = { ...item }

  const descVal = getFieldValueWithFallback(normalized, [
    'Description',
    'description',
    'item_no',
    'itemNo',
  ])
  updateFieldIfValid(normalized, 'Description', 'description', descVal)

  const qtyVal = getFieldValueWithFallback(normalized, ['Quantity', 'quantity'])
  updateFieldIfValid(normalized, 'Quantity', 'quantity', qtyVal)

  const priceVal = getFieldValueWithFallback(normalized, [
    'Price',
    'rate',
    'unit_price',
    'price',
  ])
  updateFieldIfValid(normalized, 'Price', 'rate', priceVal)

  const amtVal = getFieldValueWithFallback(normalized, [
    'Amount',
    'Line Amount',
    'line amount',
    'LineAmount',
    'total',
    'amount',
    'line_amount',
    'lineAmount',
  ])
  updateFieldIfValid(normalized, 'Amount', 'amount', amtVal)

  return normalized
}

const getCanonicalColumnKey = (rawKey: string): string => {
  if (!rawKey || !rawKey.trim()) return ''
  const normalized = rawKey.trim().toLowerCase().replace(/[\s_-]+/g, '')

  if (
    normalized === 'description' ||
    normalized === 'descriptior' ||
    normalized === 'itemdescription' ||
    normalized === 'productdescription' ||
    normalized === 'details' ||
    normalized === 'desc' ||
    normalized === 'itemno' ||
    normalized === 'item_no'
  ) {
    return 'Description'
  }

  if (
    normalized === 'qty' ||
    normalized === 'quantity' ||
    normalized === 'qtyinvoiced' ||
    normalized === 'quantityinvoiced' ||
    normalized === 'invoicedqty' ||
    normalized === 'count' ||
    normalized === 'units'
  ) {
    return 'Qty'
  }

  if (
    normalized === 'price' ||
    normalized === 'rate' ||
    normalized === 'unitprice' ||
    normalized === 'unitrate' ||
    normalized === 'priceunit' ||
    normalized === 'unitcost' ||
    normalized === 'cost'
  ) {
    return 'Price'
  }

  if (
    normalized === 'lineno' ||
    normalized === 'linenumber' ||
    normalized === 'line' ||
    normalized === 'seqno' ||
    normalized === 'srno' ||
    normalized === 'slno' ||
    normalized === 'sno'
  ) {
    return 'Line No'
  }

  if (
    normalized === 'amount' ||
    normalized === 'lineamount' ||
    normalized === 'totalamount' ||
    normalized === 'total' ||
    normalized === 'netamount' ||
    normalized === 'grossamount' ||
    normalized === 'extended' ||
    normalized === 'extendedamount'
  ) {
    return 'Amount'
  }

  return rawKey.trim()
}

const updateItemField = (item: any, fieldKey: string, value: any) => {
  const fields =
    FIELD_KEYS_MAP[fieldKey] || FIELD_KEYS_MAP[fieldKey.toLowerCase()]
  if (fields) {
    for (const key of fields) {
      if (key in item) {
        updateValueInStructure(item, key, value)
      }
    }
  }

  const canonical = getCanonicalColumnKey(fieldKey)
  if (canonical === 'Qty') {
    ;['Qty', 'Quantity', 'quantity', 'qty'].forEach((k) => {
      if (k in item) updateValueInStructure(item, k, value)
    })
  } else if (canonical === 'Price') {
    ;['Price', 'rate', 'unit_price', 'price'].forEach((k) => {
      if (k in item) updateValueInStructure(item, k, value)
    })
  } else if (canonical === 'Amount') {
    ;[
      'Amount',
      'Line Amount',
      'line amount',
      'LineAmount',
      'total',
      'amount',
      'line_amount',
      'lineAmount',
    ].forEach((k) => {
      if (k in item) updateValueInStructure(item, k, value)
    })
  } else if (canonical === 'Description') {
    ;['Description', 'description', 'item_no', 'itemNo', 'descriptior'].forEach(
      (k) => {
        if (k in item) updateValueInStructure(item, k, value)
      },
    )
  } else {
    updateValueInStructure(item, fieldKey, value)
  }
}

const recalculateItemAmount = (item: any) => {
  const qtyVal =
    item.Quantity?.['Invoice Value'] ??
    item.quantity ??
    item.Qty?.['Invoice Value'] ??
    item.Qty ??
    item.qty
  const priceVal =
    item.Price?.['Invoice Value'] ??
    item.rate ??
    item.unit_price ??
    item.price ??
    item.Price

  const qtyNum = Number.parseFloat(String(qtyVal).replace(/[^0-9.-]+/g, ''))
  const priceNum = Number.parseFloat(String(priceVal).replace(/[^0-9.-]+/g, ''))

  if (!Number.isNaN(qtyNum) && !Number.isNaN(priceNum)) {
    const calculatedAmount = qtyNum * priceNum
    const formattedAmount = calculatedAmount.toFixed(2)
    const amountKeys = [
      'Amount',
      'Line Amount',
      'line amount',
      'LineAmount',
      'total',
      'amount',
      'line_amount',
      'lineAmount',
    ]
    let updatedAny = false
    for (const k of amountKeys) {
      if (k in item) {
        updateValueInStructure(item, k, formattedAmount)
        updatedAny = true
      }
    }
    if (!updatedAny) {
      updateValueInStructure(item, 'Amount', formattedAmount)
    }
  }
}

const getMimeTypeFromBase64 = (base64: string): string => {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  return 'application/pdf'
}

const formatBase64Url = (base64: string, mimeType: string): string => {
  return base64.startsWith('data:')
    ? base64
    : `data:${mimeType};base64,${base64}`
}

const formatAgentStatusLabel = (status?: string | null) => {
  if (!status) return '---'
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const getAgentStatusType = (
  status?: string | null,
  positiveValues: string[] = [],
  warningValues: string[] = [],
): 'success' | 'warning' | 'default' => {
  const normalized = String(status || '').toUpperCase()
  if (!normalized) return 'default'
  if (
    positiveValues.some((value) => normalized.includes(value)) ||
    ['MATCHED', 'ACTIVE', 'VALID', 'VERIFIED', 'APPROVED', 'PRESENT'].some(
      (value) => normalized.includes(value),
    )
  ) {
    return 'success'
  }
  if (
    warningValues.some((value) => normalized.includes(value)) ||
    [
      'NOT_PRESENT',
      'REVIEW',
      'PARTIAL',
      'PENDING',
      'MANUAL',
      'DETECTED',
      'MISMATCH',
      'NOT_MATCHED',
      'INVALID',
      'FAILED',
    ].some((value) => normalized.includes(value))
  ) {
    return 'warning'
  }
  return 'default'
}

const getGlValidationDisplay = (agentData: any) => {
  const glValidation = agentData?.gl_validation
  const legacyGlMatching = agentData?.gl_matching
  const status =
    glValidation?.status || legacyGlMatching?.status || 'Not Available'
  const account =
    glValidation?.account ||
    glValidation?.gl_account ||
    glValidation?.matched_account ||
    legacyGlMatching?.account ||
    ''

  return {
    account,
    status: formatAgentStatusLabel(status),
    statusType: getAgentStatusType(status, ['MATCHED', 'VERIFIED', 'VALID']),
  }
}

const getBackOrderDisplay = (agentData: any) => {
  const backOrder = agentData?.back_order || agentData?.backorder
  const detected = backOrder?.detected === true
  const missingCount = backOrder?.missing_qty_by_item?.length || 0
  const recommendation = backOrder?.recommendation

  if (detected) {
    let valueStr = 'Back order detected'
    if (missingCount > 0) {
      valueStr = `${missingCount} item${missingCount === 1 ? '' : 's'} affected`
    } else if (recommendation) {
      valueStr = formatAgentStatusLabel(recommendation)
    }

    return {
      status: 'Detected',
      statusType: 'warning' as const,
      value: valueStr,
    }
  }

  return {
    status: 'None',
    statusType: 'success' as const,
    value: recommendation
      ? formatAgentStatusLabel(recommendation)
      : 'No back order',
  }
}

const hasGlValidationData = (agentData: any) => {
  const glValidation = agentData?.gl_validation
  const legacyGlMatching = agentData?.gl_matching
  return (
    (!!glValidation && typeof glValidation === 'object') ||
    (!!legacyGlMatching && typeof legacyGlMatching === 'object')
  )
}

const hasBackOrderData = (agentData: any) => {
  const backOrder = agentData?.back_order || agentData?.backorder
  return !!backOrder && typeof backOrder === 'object'
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

const extractPaymentTerms = (
  row: any,
  agentData: any,
  formModel?: any,
): string => {
  if (formModel) {
    if (
      formModel['vxnKCXsXkz8_acPogKe'] &&
      formModel['vxnKCXsXkz8_acPogKe'] !== '-'
    ) {
      return String(formModel['vxnKCXsXkz8_acPogKe'])
    }
    if (
      formModel['vxnKCXs-Xkz8_acPog-Ke'] &&
      formModel['vxnKCXs-Xkz8_acPog-Ke'] !== '-'
    ) {
      return String(formModel['vxnKCXs-Xkz8_acPog-Ke'])
    }
    if (
      formModel['BsPnOsYv6F1fbzWsTpXCW'] &&
      formModel['BsPnOsYv6F1fbzWsTpXCW'] !== '-'
    ) {
      return String(formModel['BsPnOsYv6F1fbzWsTpXCW'])
    }
    const keys = ['Payment Terms', 'payment_terms', 'Terms', 'terms']
    for (const k of keys) {
      if (formModel[k] && formModel[k] !== '-') {
        return String(formModel[k])
      }
    }
  }

  if (!row) return '-'
  const parsedForm = getParsedFormData(row)

  if (
    parsedForm['vxnKCXsXkz8_acPogKe'] &&
    parsedForm['vxnKCXsXkz8_acPogKe'] !== '-'
  ) {
    return String(parsedForm['vxnKCXsXkz8_acPogKe'])
  }
  if (
    parsedForm['vxnKCXs-Xkz8_acPog-Ke'] &&
    parsedForm['vxnKCXs-Xkz8_acPog-Ke'] !== '-'
  ) {
    return String(parsedForm['vxnKCXs-Xkz8_acPog-Ke'])
  }
  if (
    parsedForm['BsPnOsYv6F1fbzWsTpXCW'] &&
    parsedForm['BsPnOsYv6F1fbzWsTpXCW'] !== '-'
  ) {
    return String(parsedForm['BsPnOsYv6F1fbzWsTpXCW'])
  }

  const fromRow = getFromObjectOrVal(row.payment_terms ?? row.paymentTerms)
  if (fromRow && fromRow !== '-') return fromRow

  const rowTerms = row.terms ?? row.payment_term ?? row.paymentTerms
  if (rowTerms && typeof rowTerms !== 'object' && rowTerms !== '-')
    return String(rowTerms)

  const fromForm =
    getFromFields(row.formData?.fields) ?? getFromFields(row.formData)
  if (fromForm && fromForm !== '-') return String(fromForm)

  const fromAgent = getFromObjectOrVal(agentData?.payment_terms)
  if (fromAgent && fromAgent !== '-') return fromAgent

  const header = agentData?.['Extracted Invoice JSON']?.invoice_header
  const fromHeader = getFromFields(header)
  if (fromHeader && fromHeader !== '-') return String(fromHeader)

  return '-'
}

const extractDueDate = (row: any, agentData: any, formModel?: any): string => {
  if (formModel) {
    const val =
      formModel['792IWMnNXLKyfXjCGcowU'] ||
      formModel['kjQFGFMRYBzLnAz9Yrx_c'] ||
      formModel['Due Date'] ||
      formModel['due_date'] ||
      formModel['Due_Date'] ||
      formModel['DueDate']
    if (val && val !== '-') return String(val)
  }

  if (!row) return '-'
  const parsedForm = getParsedFormData(row)

  let val =
    parsedForm['792IWMnNXLKyfXjCGcowU'] ||
    parsedForm['kjQFGFMRYBzLnAz9Yrx_c'] ||
    parsedForm['Due Date'] ||
    parsedForm['due_date'] ||
    parsedForm['Due_Date'] ||
    row.dueDate ||
    row.due_date ||
    row.payment_terms?.due_date ||
    row.paymentTerms?.due_date ||
    row.paymentTerms?.dueDate ||
    row.formData?.fields?.['792IWMnNXLKyfXjCGcowU'] ||
    row.formData?.fields?.['kjQFGFMRYBzLnAz9Yrx_c'] ||
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

  // Only if due date is missing, calculate from invoice date + terms
  if (
    (!val || val === '-') &&
    (parsedForm['9F6tPVHoRnmONGx3kYJu2'] ||
      formModel?.['9F6tPVHoRnmONGx3kYJu2'])
  ) {
    const invDateStr =
      formModel?.['9F6tPVHoRnmONGx3kYJu2'] ||
      parsedForm['9F6tPVHoRnmONGx3kYJu2']
    const termsStr =
      formModel?.['vxnKCXsXkz8_acPogKe'] ||
      formModel?.['vxnKCXs-Xkz8_acPog-Ke'] ||
      formModel?.['BsPnOsYv6F1fbzWsTpXCW'] ||
      parsedForm['vxnKCXsXkz8_acPogKe'] ||
      parsedForm['vxnKCXs-Xkz8_acPog-Ke'] ||
      parsedForm['BsPnOsYv6F1fbzWsTpXCW'] ||
      ''
    const numMatch = /\d+/.exec(String(termsStr))
    if (numMatch) {
      const days = parseInt(numMatch[0], 10)
      try {
        const d = new Date(invDateStr)
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + days)
          val = d.toISOString().split('T')[0]
        }
      } catch (e) { }
    }
  }

  if (!val || val === '-') return '-'
  return String(val)
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
  _formModel?: any,
): {
  calculationText: string
  daysText: string
  statusType: 'success' | 'warning' | 'danger' | 'info' | 'default'
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

  let calculationText = 'immediate'
  let statusType: 'success' | 'warning' | 'danger' | 'info' | 'default' =
    'danger'
  let daysText = '0 days'

  if (daysDiff === null) {
    const numMatch = /\d+/.exec(terms)
    if (numMatch) {
      const days = Number.parseInt(numMatch[0], 10)
      daysText = `${days} days`
      calculationText = 'In due'
      statusType = days <= 15 ? 'warning' : 'info'
    } else {
      daysText = '0 days'
      calculationText = 'Immediate'
      statusType = 'danger'
    }
  } else if (daysDiff > 0) {
    daysText = `${daysDiff} days`
    calculationText = 'In due'
    statusType = daysDiff <= 15 ? 'warning' : 'info'
  } else if (daysDiff < 0) {
    daysText = `${Math.abs(daysDiff)} days`
    calculationText = 'Overdue'
    statusType = 'danger'
  } else {
    daysText = '0 days'
    calculationText = 'Immediate'
    statusType = 'danger'
  }

  return { calculationText, daysText, statusType, termsDisplay }
}

const hasMatterValidationData = (agentData: any) => {
  const matterValidation = agentData?.matter_validation
  if (!matterValidation || typeof matterValidation !== 'object') return false

  const status = String(matterValidation.status || '')
    .trim()
    .toUpperCase()
  if (!status || status === 'NOT_PRESENT') return false

  return true
}

const getMatterValidationDisplay = (agentData: any) => {
  const matterValidation = agentData?.matter_validation
  if (!matterValidation || typeof matterValidation !== 'object') {
    return {
      status: '---',
      statusType: 'default' as const,
      value: '---',
    }
  }

  const status = matterValidation.status || 'Unknown'
  const matterId = matterValidation.matter_id
  const clientName = matterValidation.client_name
  const reason =
    matterValidation.validation_details?.reason ||
    (matterValidation.needs_manual_entry ? 'Manual entry required' : '')

  const value =
    matterId || clientName
      ? [matterId, clientName].filter(Boolean).join(' · ')
      : reason || '---'

  return {
    status: formatAgentStatusLabel(status),
    statusType: getAgentStatusType(status, ['VALID', 'MATCHED', 'VERIFIED']),
    value,
  }
}

const getSupplierValidationDisplay = (agentData: any, formModel: any) => {
  const supplierValidation = agentData?.supplier_validation
  const supplierId =
    formModel?.['Supplier ID'] ||
    formModel?.['SupplierCode'] ||
    formModel?.['Supplier Code'] ||
    formModel?.['supplier_id'] ||
    formModel?.['Vendor ID'] ||
    formModel?.['vendor_id'] ||
    ''

  if (supplierValidation?.status) {
    let valueStr = 'Supplier verified'
    if (supplierId) {
      valueStr = supplierId
    } else if (supplierValidation.mismatch?.length) {
      const mismatchLen = supplierValidation.mismatch.length
      valueStr = `${mismatchLen} mismatch${mismatchLen === 1 ? '' : 'es'}`
    }

    return {
      status: formatAgentStatusLabel(supplierValidation.status),
      statusType: getAgentStatusType(supplierValidation.status, [
        'ACTIVE',
        'VERIFIED',
      ]),
      value: valueStr,
    }
  }

  return {
    status: supplierId ? 'Verified' : 'Not Verified',
    statusType: supplierId ? ('success' as const) : ('warning' as const),
    value: supplierId || 'No supplier ID found',
  }
}

const FALLBACK_PO_COLS_MAP: Record<string, string> = {
  '2z2Rh5MpXEaiHSaWlMThr': 'Line',
  '8nVIWBIeCFM6wgC7JOlzL': 'Class',
  'eEpfRP5JIbS8aFle8J615': 'Part Number',
  'eewd3Jx-Kx1ub1ZcjBt7L': 'Qty',
  'gRh9236whOB_ri9TtFaKq': 'Amount',
  'hy5p0sTmR4l7MkX5sWIuE': 'UOM',
  'ja59TImIXkfIm_EIy2dxJ': 'Tax Rate',
  'JXmxAE-HiQMv119GGn5N6': 'Ref Code',
  'kXPikEE9xLRxtpE9lGwFo': 'Weight',
  'STqVWjmFqexaezHTRAkFG': 'Rate',
  'Ywg9Bc_J8IyRglLcnrAWl': 'Date',
  'ZpY63z5PRSjClud4PDpKV': 'Description',
}

const normalizeColumnLabel = (label: string): string => {
  if (!label) return ''
  const norm = label.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (
    norm === 'qty' ||
    norm === 'quantity' ||
    norm === 'quantities' ||
    norm === 'orderqty' ||
    norm === 'poqty'
  ) {
    return 'Qty'
  }
  if (
    norm === 'line' ||
    norm === 'lin' ||
    norm === 'lineitem' ||
    norm === 'lineno' ||
    norm === 'lineid' ||
    norm === 'itemno' ||
    norm === 'itemid' ||
    norm === 'pos'
  ) {
    return 'Line'
  }
  if (
    norm === 'amount' ||
    norm === 'amountusd' ||
    norm === 'lineamount' ||
    norm === 'totalamount' ||
    norm === 'extended' ||
    norm === 'extendedamount' ||
    norm === 'total' ||
    norm.startsWith('amount')
  ) {
    return 'Amount'
  }
  if (
    norm === 'price' ||
    norm === 'rate' ||
    norm === 'unitprice' ||
    norm === 'unitcost'
  ) {
    return 'Price'
  }
  if (
    norm === 'description' ||
    norm === 'itemdescription' ||
    norm === 'desc' ||
    norm === 'item'
  ) {
    return 'Description'
  }
  if (norm === 'uom' || norm === 'unit' || norm === 'unitofmeasure') {
    return 'UOM'
  }
  return label.trim()
}

const getPoTableColumnsMapping = (formJson: any) => {
  const colMap = new Map<string, string>()
  if (!formJson) return colMap

  let form = formJson
  if (typeof form === 'string') {
    try {
      form = JSON.parse(form)
      if (form && typeof form === 'object' && 'formJson' in form) {
        const inner = JSON.parse(form.formJson)
        if (inner && typeof inner === 'object') {
          form = inner
        }
      }
    } catch (e) {
      return colMap
    }
  }

  if (!form || typeof form !== 'object') return colMap

  const controls: any[] = []
  const append = (list: any) => {
    if (Array.isArray(list)) controls.push(...list)
  }

  append(form.controllist)
  append(form.controlList)

  const panels = [
    ...(Array.isArray(form.panels) ? form.panels : []),
    ...(Array.isArray(form.secondaryPanels) ? form.secondaryPanels : []),
  ]

  panels.forEach((panel) => {
    append(panel?.controlList)
    append(panel?.controllist)
    append(panel?.fields)
  })

  const poControl = controls.find((c: any) => {
    const id = c?.id || c?.jsonId || c?.name || ''
    return String(id).toLowerCase().startsWith('awai')
  })

  if (poControl) {
    const cols =
      poControl?.settings?.specific?.tableColumns ||
      poControl?.tableColumns ||
      []
    cols.forEach((col: any) => {
      if (col?.id && col?.label) {
        colMap.set(col.id, col.label)
      }
    })
  }

  return colMap
}

// --- Components ---

const AnalysisCard = ({
  icon: Icon,
  isLoading = false,
  isPulsing = false,
  isSelected = false,
  status,
  statusContent, // NEW: optional node that replaces the plain status badge
  statusType = 'success',
  subtitle,
  title,
  value,
  onClick,
}: any) => {
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border p-2.5 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95',
        isSelected
          ? 'border-[var(--primary-9)] bg-[var(--primary-2)]/30 shadow-sm ring-1 ring-[var(--primary-9)]/20'
          : 'border-[var(--gray-3)] bg-surface hover:bg-[var(--gray-1)]',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {isPulsing && (
        <div className='pointer-events-none absolute inset-0 animate-pulse rounded-xl ring-2 ring-[var(--orange-6)]/50' />
      )}
      <div className='flex items-center justify-between gap-1 flex-wrap'>
        <div
          className={cn(
            'shrink-0 rounded p-1.5 transition-colors',
            getStatusStyles(statusType),
          )}
        >
          <Icon className='h-3.5 w-3.5' />
        </div>
        {isLoading ? (
          <div className='h-5 w-14 animate-pulse rounded bg-[var(--gray-3)]' />
        ) : statusContent ? (
          statusContent
        ) : (
          <div
            className={cn(
              'shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-semibold',
              getStatusBorderStyles(statusType),
            )}
          >
            {status}
          </div>
        )}
      </div>
      <div className='mt-0.5 flex min-w-0 flex-col gap-0.5'>
        <span className='text-[11px] leading-none font-semibold tracking-tight text-[var(--gray-11)]'>
          {title}
        </span>
        {isLoading ? (
          <div className='mt-1 h-4 w-24 animate-pulse rounded bg-[var(--gray-3)]' />
        ) : (
          <div
            className='text-[13px] leading-tight font-semibold text-[var(--gray-13)]'
            title={typeof value === 'string' ? value : undefined}
          >
            {value || '---'}
          </div>
        )}
        {subtitle && (
          <div className='text-[10px] font-normal leading-none text-[var(--gray-10)] mt-0.5'>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
const DetailReportView = ({
  children,
  icon: IconComponent,
  status,
  statusType = 'success',
  title,
  onClose,
}: any) => {
  const { t } = useLingui()
  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 flex min-h-0 flex-1 flex-col bg-surface duration-300'>
      {/* Header */}
      <div className='flex shrink-0 items-center justify-between border-b border-[var(--gray-2)] bg-[var(--gray-1)] px-4 py-2.5'>
        <div className='flex items-center gap-2.5'>
          <button
            className='group flex items-center gap-1 text-xs font-semibold text-[var(--gray-11)] transition-all hover:text-[var(--gray-13)] active:scale-95'
            onClick={onClose}
          >
            <Icon
              className='h-4 w-4 transition-transform group-hover:-translate-x-0.5'
              name='tabler:arrow-left'
            />
            <span>{t`Back`}</span>
          </button>
          <div className='mx-1 h-4 w-[1px] bg-[var(--gray-2)]' />
          <div className='flex items-center gap-2'>
            <div className={cn('rounded-md p-1', getStatusStyles(statusType))}>
              <IconComponent className='h-4 w-4' />
            </div>
            <h3 className='text-sm font-semibold text-[var(--gray-13)]'>{title}</h3>
          </div>
        </div>
        <span
          className={cn(
            'rounded-md border px-2 py-0.5 text-[10px] font-semibold',
            getStatusBorderStyles(statusType),
          )}
        >
          {status}
        </span>
      </div>

      {/* Content */}
      <div className='flex-1 space-y-4 overflow-y-auto p-4'>{children}</div>
    </div>
  )
}

const normalizeComparable = (val: unknown) => {
  const str = String(val ?? '')
    .toLowerCase()
    .trim()
  if (!str || str === '-') return ''

  // Strip common currency symbols, commas, and spaces for numeric comparison
  const numericCleaned = str.replace(/[$€£¥₹,\s]/g, '')
  if (/^-?\d+(\.\d+)?$/.test(numericCleaned)) {
    const num = Number.parseFloat(numericCleaned)
    if (!Number.isNaN(num)) {
      return String(Number(num.toFixed(4)))
    }
  }

  return str.replace(/\s+/g, ' ')
}

const hasComparableValue = (val: unknown) => {
  if (val === null || val === undefined) return false
  const normalized = String(val).trim()
  return normalized !== '' && normalized !== '-'
}

const getPoRowObj = (agentData: any, selectedItem: any, matchingProc: any) => {
  const candidates = [
    agentData?.po_row,
    agentData?.agentResponse?.po_row,
    agentData?._agentResponse?.po_row,
    agentData,
    agentData?.agentResponse,
    agentData?._agentResponse,
    selectedItem?.po_row,
    selectedItem?.agentResponse?.po_row,
    selectedItem?._agentResponse?.po_row,
    selectedItem,
    matchingProc?.po_row,
    matchingProc?.agentResponse?.po_row,
    matchingProc?._agentResponse?.po_row,
  ]

  for (const cand of candidates) {
    if (!cand) continue
    if (typeof cand === 'object' && !Array.isArray(cand)) {
      if (cand.po_row && typeof cand.po_row === 'object') return cand.po_row
      if (
        cand['PO Number'] ||
        cand['PO Amount'] ||
        cand['PO Date'] ||
        cand['Supplier'] ||
        cand['po_number'] ||
        cand['po_amount'] ||
        cand['source']
      ) {
        return cand
      }
    }
    if (typeof cand === 'string') {
      try {
        const parsed = JSON.parse(cand)
        if (parsed && typeof parsed === 'object') {
          if (parsed.po_row && typeof parsed.po_row === 'object')
            return parsed.po_row
          if (
            parsed['PO Number'] ||
            parsed['PO Amount'] ||
            parsed['PO Date'] ||
            parsed['Supplier'] ||
            parsed['po_number'] ||
            parsed['po_amount'] ||
            parsed['source']
          ) {
            return parsed
          }
        }
      } catch { }
    }
  }
  return null
}

const getValueFromPoRow = (poRow: any, key: string) => {
  if (!poRow || typeof poRow !== 'object') return undefined

  if (
    key in poRow &&
    poRow[key] !== undefined &&
    poRow[key] !== null &&
    poRow[key] !== ''
  ) {
    return poRow[key]
  }

  const normalizePoKey = (k: string) => {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (
      norm === 'vendor' ||
      norm === 'vendorname' ||
      norm === 'supplier' ||
      norm === 'suppliername'
    ) {
      return 'supplier'
    }
    if (
      norm === 'poamount' ||
      norm === 'totaldue'
    ) {
      return 'poamount'
    }
    if (
      norm === 'invoiceamount' ||
      norm === 'totalamount'
    ) {
      return 'invoiceamount'
    }
    if (norm === 'ponumber' || norm === 'pono' || norm === 'purchaseorder') {
      return 'ponumber'
    }
    if (norm === 'podate') {
      return 'podate'
    }
    if (norm === 'invoicedate') {
      return 'invoicedate'
    }
    if (norm === 'invoicenumber' || norm === 'invoiceno') {
      return 'invoicenumber'
    }
    if (norm === 'currency') {
      return 'currency'
    }
    return norm
  }

  const targetNormKey = normalizePoKey(key)

  if (
    targetNormKey === 'invoicedate' ||
    targetNormKey === 'invoicenumber' ||
    targetNormKey === 'invoiceamount'
  ) {
    for (const [pKey, pVal] of Object.entries(poRow)) {
      if (pVal === undefined || pVal === null || pVal === '') continue
      if (
        pKey === 'source' ||
        pKey === 'PO Line Item Mapped' ||
        pKey === 'source_type'
      )
        continue
      const pNormKey = normalizePoKey(pKey)
      if (pNormKey === targetNormKey) {
        return pVal
      }
    }
    return undefined
  }

  for (const [pKey, pVal] of Object.entries(poRow)) {
    if (pVal === undefined || pVal === null || pVal === '') continue
    if (
      pKey === 'source' ||
      pKey === 'PO Line Item Mapped' ||
      pKey === 'source_type'
    )
      continue

    const pNormKey = normalizePoKey(pKey)
    if (
      pNormKey === targetNormKey ||
      pKey.toLowerCase().trim() === key.toLowerCase().trim()
    ) {
      return pVal
    }
  }

  return undefined
}

const FormCard = ({
  fieldKey,
  highlight = false,
  icon: FieldIcon,
  invoiceValue,
  isLoading = false,
  label,
  missing = false,
  options = [],
  poValue,
  poSourceLabel = 'PO Master',
  score,
  source,
  type = 'text',
  value,
  onChange,
  onFocus,
}: any) => {
  const { t } = useLingui()
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const [userEdited, setUserEdited] = useState(false)
  const [appliedSource, setAppliedSource] = useState<string | null>(null)

  useEffect(() => {
    setLocalValue(value)
    setUserEdited(false)
    setAppliedSource(null)
  }, [value])

  const isUsingPo =
    hasComparableValue(poValue) &&
    (normalizeComparable(value) === normalizeComparable(poValue) ||
      appliedSource === 'po_master' ||
      appliedSource === 'sap' ||
      !hasComparableValue(value))
  const canSwitchSources =
    hasComparableValue(poValue) &&
    hasComparableValue(invoiceValue) &&
    normalizeComparable(poValue) !== normalizeComparable(invoiceValue)
  const isPerfectMatch = isUsingPo
  const effectiveScore =
    score !== undefined &&
      score !== null &&
      Number(score) < 100 &&
      isPerfectMatch
      ? 100
      : score

  const activeSource = useMemo(() => {
    if (
      userEdited ||
      (localValue !== value &&
        localValue !== '-' &&
        localValue !== '' &&
        localValue !== null &&
        localValue !== undefined)
    ) {
      return 'manual'
    }
    if (appliedSource) {
      return appliedSource
    }
    if (isUsingPo) {
      return poSourceLabel.toLowerCase() === 'sap' ? 'sap' : 'po_master'
    }
    if (source) {
      return source
    }
    const normKey = String(label || '').toLowerCase()
    if (
      normKey.includes('terms') ||
      normKey.includes('due date') ||
      normKey.includes('status') ||
      normKey.includes('match')
    ) {
      return 'ai'
    }
    return 'ocr'
  }, [userEdited, localValue, value, appliedSource, isUsingPo, poSourceLabel, source, label])

  const renderSourceBadge = (src: string) => {
    const norm = String(src || '').toLowerCase()
    if (norm === 'manual') {
      return (
        <span
          className='inline-flex shrink-0 items-center gap-1 rounded border border-[var(--orange-3)] bg-[var(--orange-1)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--orange-10)]'
          title={t`Source: Manual Entry`}
        >
          <Icon
            className='h-2.5 w-2.5 text-[var(--orange-9)]'
            name='lucide:pencil'
          />
          <span>{t`Manual`}</span>
        </span>
      )
    }
    if (norm === 'po_master' || norm === 'po' || norm === 'sap' || norm === 'hana cloud') {
      const isSap =
        poSourceLabel.toLowerCase() === 'sap' ||
        norm === 'sap' ||
        norm === 'hana cloud'
      return (
        <span
          className='inline-flex shrink-0 items-center gap-1 rounded border border-[var(--blue-3)] bg-[var(--blue-1)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--blue-10)]'
          title={
            isSap
              ? t`Source: SAP (HANA Cloud)`
              : t`Source: PO Master (ERP/Excel Data)`
          }
        >
          <Icon
            className='h-2.5 w-2.5 text-[var(--blue-9)]'
            name='lucide:database'
          />
          <span>{isSap ? t`SAP` : t`PO Master`}</span>
        </span>
      )
    }
    if (norm === 'ai' || norm === 'ai_agent') {
      return (
        <span
          className='inline-flex shrink-0 items-center gap-1 rounded border border-[var(--primary-3)] bg-[var(--primary-1)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--primary-10)]'
          title='Source: AI Inferred'
        >
          <AiBrandIcon className='size-[10px] shrink-0' />
          <span>AI</span>
        </span>
      )
    }
    return (
      <span
        className='inline-flex shrink-0 items-center gap-1 rounded border border-[var(--teal-3)] bg-[var(--teal-1)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--teal-10)]'
        title='Source: OCR Document'
      >
        <Icon
          className='h-2.5 w-2.5 text-[var(--teal-9)]'
          name='lucide:scan-text'
        />
        <span>OCR</span>
      </span>
    )
  }

  const applySourceValue = (nextValue: unknown) => {
    setLocalValue(nextValue)
    const isSwitchingToPo = !isUsingPo
    setAppliedSource(
      isSwitchingToPo
        ? poSourceLabel.toLowerCase() === 'sap'
          ? 'sap'
          : 'po_master'
        : 'ocr',
    )
    setUserEdited(false)
    onChange?.(nextValue)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      setUserEdited(true)
      onChange?.(localValue)
    }
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') {
      setLocalValue(value)
      setUserEdited(false)
      setIsEditing(false)
    }
  }

  let inputElement = null
  if (type === 'date') {
    inputElement = (
      <InputDate
        className='w-full font-semibold'
        value={localValue}
        onChange={(val: any) => {
          setLocalValue(val)
          setUserEdited(true)
          onFocus?.(val)
        }}
      />
    )
  } else if (type === 'dropdown') {
    const selectedOption =
      typeof localValue === 'string' && localValue !== '-'
        ? options.find(
          (opt: any) =>
            String(opt.id).toLowerCase() === localValue.toLowerCase(),
        ) || (localValue ? { id: localValue, name: localValue } : null)
        : null

    inputElement = (
      <InputSelect
        className='w-full font-semibold'
        options={options}
        searchPlaceholder='Search or add custom value...'
        value={selectedOption}
        creatable
        searchable
        onChange={(val: any) => {
          const stringVal =
            val?.name && typeof val.id === 'number' && val.id < 0
              ? String(val.name)
              : String(val?.id || val?.name || '')
          setLocalValue(stringVal)
          setUserEdited(true)
          onFocus?.(stringVal)
          onChange?.(stringVal)
          setTimeout(() => setIsEditing(false), 0)
        }}
      />
    )
  } else {
    inputElement = (
      <input
        className='w-full border-none bg-transparent p-0 text-[13px] font-semibold text-[var(--gray-13)] placeholder:font-normal focus:ring-0 focus:outline-none'
        placeholder={`Enter ${label}...`}
        type='text'
        value={localValue === '-' ? '' : localValue}
        autoFocus
        onBlur={handleBlur}
        onChange={(e) => {
          setLocalValue(e.target.value)
          setUserEdited(true)
          onFocus?.(e.target.value)
        }}
        onFocus={() => onFocus?.(localValue)}
        onKeyDown={handleKeyDown}
      />
    )
  }

  if (isEditing) {
    return (
      <div
        data-field-id={fieldKey || label}
        className={cn(
          'group flex items-start gap-3 rounded-lg border border-[var(--primary-3)] bg-surface p-3 shadow-sm ring-1 ring-[var(--primary-3)]/20',
          missing && 'border-red-8 bg-red-1 ring-red-4',
        )}
      >
        <div
          className={cn(
            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)] transition-colors group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]',
            highlight && 'bg-[var(--green-9)]/10 text-[var(--green-9)]',
          )}
        >
          <FieldIcon className='h-3.5 w-3.5' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='mb-0.5 flex items-center justify-between gap-1 flex-wrap min-w-0'>
            <p className='min-w-0 text-[10px] font-semibold text-[var(--gray-11)] shrink-0'>
              {label}
            </p>
            <div className='flex shrink-0 items-center gap-1.5'>
              {isLoading ? (
                <div className='h-3.5 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
              ) : (
                <>
                  {effectiveScore !== undefined && effectiveScore !== null && (
                    <span
                      title={`Confidence Score: ${Math.round(Number(effectiveScore))}%`}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-normal transition-colors',
                        Number(effectiveScore) >= 90
                          ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-10)]'
                          : Number(effectiveScore) >= 70
                            ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-10)]'
                            : 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-10)]',
                      )}
                    >
                      <Icon
                        className='h-2.5 w-2.5 shrink-0'
                        name={
                          Number(effectiveScore) >= 90
                            ? 'lucide:circle-check'
                            : Number(effectiveScore) >= 70
                              ? 'lucide:alert-circle'
                              : 'lucide:alert-triangle'
                        }
                      />
                      <span>{Math.round(Number(effectiveScore))}%</span>
                    </span>
                  )}
                  {renderSourceBadge(activeSource)}
                </>
              )}
            </div>
          </div>
          <div className='animate-in fade-in zoom-in-95 duration-200'>
            {inputElement}
          </div>
          {missing ? (
            <p className='mt-1 text-12 font-medium text-red-9'>
              {t`This field is required.`}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <button
      type='button'
      data-field-id={fieldKey || label}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-none border-transparent bg-transparent p-3 text-left transition-all hover:border-[var(--gray-3)] hover:bg-surface hover:shadow-sm focus:ring-1 focus:ring-[var(--primary-3)]/50 focus:outline-none',
        missing && 'border border-solid border-red-8 bg-red-1',
      )}
      onClick={() => {
        setIsEditing(true)
        onFocus?.(localValue)
      }}
    >
      <div
        className={cn(
          'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)] transition-colors group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]',
          highlight && 'bg-[var(--green-9)]/10 text-[var(--green-9)]',
        )}
      >
        <FieldIcon className='h-3.5 w-3.5' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='mb-0.5 flex items-center justify-between gap-1 flex-wrap min-w-0'>
          <p className='min-w-0 text-[10px] font-semibold text-[var(--gray-11)] shrink-0'>
            {label}
          </p>
          <div className='flex shrink-0 items-center gap-1.5'>
            {isLoading ? (
              <div className='h-3.5 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
            ) : (
              <>
                {effectiveScore !== undefined && effectiveScore !== null && (
                  <span
                    title={`Confidence Score: ${Math.round(Number(effectiveScore))}%`}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-normal transition-colors',
                      Number(effectiveScore) >= 90
                        ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-10)]'
                        : Number(effectiveScore) >= 70
                          ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-10)]'
                          : 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-10)]',
                    )}
                  >
                    <Icon
                      className='h-2.5 w-2.5 shrink-0'
                      name={
                        Number(effectiveScore) >= 90
                          ? 'lucide:circle-check'
                          : Number(effectiveScore) >= 70
                            ? 'lucide:alert-circle'
                            : 'lucide:alert-triangle'
                      }
                    />
                    <span>{Math.round(Number(effectiveScore))}%</span>
                  </span>
                )}
                {renderSourceBadge(activeSource)}
              </>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className='mt-1 h-4 w-28 animate-pulse rounded bg-[var(--gray-3)]' />
        ) : (
          <div className='flex flex-col items-start gap-1.5'>
            <p
              className={cn(
                'text-[13px] leading-tight font-semibold text-[var(--gray-13)] transition-colors group-hover:text-[var(--primary-9)]',
                highlight && 'text-[var(--green-9)]',
                (value === '-' ||
                  value === null ||
                  value === undefined ||
                  value === '') &&
                'font-medium text-[var(--gray-9)]',
              )}
            >
              {value === null || value === undefined || value === ''
                ? '-'
                : value}
            </p>
            {missing ? (
              <p className='text-12 font-medium text-red-9'>
                {t`This field is required.`}
              </p>
            ) : null}
            {canSwitchSources && (
              <div
                className='group/suggest animate-in fade-in zoom-in-95 mt-0.5 flex w-full cursor-pointer items-start justify-between gap-2 rounded-md border-l-4 border-l-[var(--primary-9)] bg-[var(--primary-2)] px-2.5 py-1 text-xs transition-all duration-200 hover:bg-[var(--primary-2)] active:scale-98'
                role='button'
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  applySourceValue(isUsingPo ? invoiceValue : poValue)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    applySourceValue(isUsingPo ? invoiceValue : poValue)
                  }
                }}
              >
                <div className='min-w-0 flex-1 text-xs leading-normal'>
                  <span className='inline-flex items-center gap-1 align-middle'>
                    <AiBrandIcon
                      className='size-[13px] shrink-0'
                      variant='outline-purple'
                    />
                    <span className='font-semibold text-[var(--primary-9)]'>
                      {isUsingPo ? t`Invoice` : poSourceLabel}
                    </span>
                    <span className='text-[var(--primary-9)]/60'>·</span>
                  </span>{' '}
                  <span className='truncate inline-block max-w-[calc(100%-80px)] align-middle font-bold text-[var(--gray-13)] group-hover/suggest:inline group-hover/suggest:max-w-none group-hover/suggest:whitespace-normal group-hover/suggest:break-words'>
                    {isUsingPo ? invoiceValue : poValue}
                  </span>
                </div>
                <span className='shrink-0 font-bold text-[var(--primary-9)] transition-colors group-hover/suggest:underline'>
                  Apply
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

const SummarySkeleton = () => (
  <div className='flex-1 animate-pulse space-y-6 overflow-y-auto px-4 pb-8'>
    <div className='space-y-5 rounded-xl border border-[var(--gray-3)]/10 bg-surface p-6 shadow-sm'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-4'>
          <div className='h-12 w-12 rounded-xl bg-[var(--gray-2)]' />
          <div className='space-y-2'>
            <div className='h-3 w-24 rounded bg-[var(--gray-2)]' />
            <div className='h-5 w-40 rounded bg-[var(--gray-2)]' />
          </div>
        </div>
        <div className='h-7 w-20 rounded-full bg-[var(--gray-2)]' />
      </div>
      <div className='h-20 w-full rounded-xl bg-[var(--gray-1)]' />
    </div>
    <div className='grid grid-cols-2 gap-4'>
      {[1, 2, 3, 4].map((i) => (
        <div
          className='space-y-3 rounded-xl border border-[var(--gray-3)]/10 bg-surface p-4'
          key={i}
        >
          <div className='h-3 w-16 rounded bg-[var(--gray-2)]' />
          <div className='h-5 w-28 rounded bg-[var(--gray-2)]' />
        </div>
      ))}
    </div>
  </div>
)

// --- Main App ---

const skeletonRows = ['skeleton-row-0', 'skeleton-row-1', 'skeleton-row-2']
// const LINE_ITEM_LEFT_WIDTHS = [60, 100, 100]
const LINE_ITEM_SCORE_WIDTH = 55
const LINE_ITEM_ACTION_WIDTH = 38
// const LINE_ITEM_DEFAULT_WIDTH = 50

const isLineItemAmountColumn = (key: string) => {
  const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '')
  return (
    normalizedKey === 'lineamount' ||
    normalizedKey === 'amount' ||
    normalizedKey === 'totalamount'
  )
}

const formatValueToTwoDecimals = (val: any) => {
  if (val === undefined || val === null || val === '') return ''
  const num = Number.parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
  return Number.isNaN(num) ? val : num.toFixed(2)
}

const formatLineItemFields = (item: any, counter: number) => {
  const normalizedItem = normalizeExtractedLineItem(item)
  if (!normalizedItem._id) {
    normalizedItem._id = `li-${Date.now()}-${counter}`
  }

  // Format Price/Rate
  if ('Price' in normalizedItem)
    updateValueInStructure(
      normalizedItem,
      'Price',
      formatValueToTwoDecimals(getRawVal(normalizedItem, 'Price')),
    )
  if ('rate' in normalizedItem)
    updateValueInStructure(
      normalizedItem,
      'rate',
      formatValueToTwoDecimals(getRawVal(normalizedItem, 'rate')),
    )
  if ('unit_price' in normalizedItem)
    updateValueInStructure(
      normalizedItem,
      'unit_price',
      formatValueToTwoDecimals(getRawVal(normalizedItem, 'unit_price')),
    )
  if ('price' in normalizedItem && !normalizedItem.rate)
    normalizedItem.rate = formatValueToTwoDecimals(
      getRawVal(normalizedItem, 'price'),
    )

  // Format Amount
  if ('Amount' in normalizedItem)
    updateValueInStructure(
      normalizedItem,
      'Amount',
      formatValueToTwoDecimals(getRawVal(normalizedItem, 'Amount')),
    )
  if ('total' in normalizedItem)
    updateValueInStructure(
      normalizedItem,
      'total',
      formatValueToTwoDecimals(getRawVal(normalizedItem, 'total')),
    )
  if ('amount' in normalizedItem)
    updateValueInStructure(
      normalizedItem,
      'amount',
      formatValueToTwoDecimals(getRawVal(normalizedItem, 'amount')),
    )
  if ('line_amount' in normalizedItem && !normalizedItem.amount)
    normalizedItem.amount = formatValueToTwoDecimals(
      getRawVal(normalizedItem, 'line_amount'),
    )

  return normalizedItem
}

// --- Mock Data & Helpers for Backorder History Flow ---
const MOCK_PREVIOUS_BACKORDERS: Record<string, any> = {
  'MSP-REQ-55': {
    detected: true,
    full_filled: false,
    missing_qty_by_item: [
      {
        amount: 1050.0,
        description: 'Office Chair - Ergonomic',
        invoice_qty: 3,
        po_line_id: '1',
        po_qty: 10,
        price: 150.0,
        reason: 'SHORT_SHIP',
        remaining: 7,
      },
      {
        amount: 45.0,
        description: 'Delivery Charges',
        invoice_qty: 0,
        po_line_id: '2',
        po_qty: 1,
        price: 45.0,
        reason: 'SHORT_SHIP',
        remaining: 1,
      },
    ],
    reason:
      'PO #00026648: Initial shipment of Office Chairs had 3 units invoiced, leaving 7 remaining. Ticket MSP-REQ-55 created to track balance.',
    recommendation: 'WAIT_FOR_BALANCE',
  },
}

const getRecommendationMeta = (rec?: string) => {
  const r = String(rec || '').toUpperCase()
  if (r === 'REJECT_TRANSACTION' || r === 'REJECT') {
    return {
      bg: 'bg-[var(--red-1)]/50',
      chip: 'border border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
      icon: 'tabler:x',
      label: staticT`Reject Transaction`,
    }
  }
  if (r.includes('WAIT')) {
    return {
      bg: 'bg-[var(--blue-1)]/50',
      chip: 'border border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)]',
      icon: 'tabler:hourglass-high',
      label: staticT`Wait for Balance`,
    }
  }
  if (r.includes('CONTACT')) {
    return {
      bg: 'bg-[var(--purple-1)]/50',
      chip: 'border border-[var(--purple-3)] bg-[var(--purple-1)] text-[var(--purple-9)]',
      icon: 'tabler:message-circle',
      label: staticT`Contact Vendor`,
    }
  }
  if (r.includes('CANCEL')) {
    return {
      bg: 'bg-[var(--red-1)]/50',
      chip: 'border border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
      icon: 'tabler:ban',
      label: staticT`Cancel Remaining`,
    }
  }
  return {
    bg: 'bg-[var(--gray-1)]/50',
    chip: 'border border-[var(--gray-3)] bg-[var(--gray-1)] text-[var(--gray-11)]',
    icon: 'tabler:dots',
    label: rec || 'No Action',
  }
}

const unwrapPlaygroundValue = (value: any) => {
  if (value && typeof value === 'object') {
    if ('Invoice Value' in value) return value['Invoice Value']
    if ('value' in value) return value.value
  }
  return value
}

const firstPlaygroundValue = (...values: any[]) => {
  for (const value of values) {
    const unwrapped = unwrapPlaygroundValue(value)
    if (
      unwrapped !== undefined &&
      unwrapped !== null &&
      unwrapped !== '' &&
      unwrapped !== '-'
    ) {
      return unwrapped
    }
  }
  return undefined
}

const toPlaygroundString = (value: any, fallback = '') => {
  const resolved = firstPlaygroundValue(value)
  return resolved === undefined ? fallback : String(resolved)
}

const toPlaygroundAmount = (value: any) => {
  const resolved = firstPlaygroundValue(value)
  if (resolved === undefined) return 0

  const numeric = Number.parseFloat(String(resolved).replace(/[^0-9.-]+/g, ''))
  return Number.isNaN(numeric) ? String(resolved) : numeric
}

const Overview = (props: any) => {
  const { i18n, t } = useLingui()
  const {
    agentData,
    allowedLabels,
    formDefinition,
    formModel,
    isFourthItem,
    isProcessing,
    isThirdItem: _isThirdItem,
    processId,
    repositoryId,
    selectedItem,
    selectedWorkflow,
    transactionId,
    workflowId,
    setFormModel,
  } = props

  const processingProcesses = requestStore((state) => state.processingProcesses)
  const kanbanMissingFieldIds = requestStore(
    (state) => state.kanbanMissingFieldIds,
  )
  const matchingProc = useMemo(() => {
    return processingProcesses.find(
      (p) =>
        String(p.processId || p.id) ===
        String(selectedItem?.processId || selectedItem?.id),
    )
  }, [processingProcesses, selectedItem])

  const resolvedAgentData = useMemo(() => {
    let data = agentData
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      data =
        selectedItem?._agentResponse ||
        selectedItem?.agentResponse ||
        selectedItem?._agentData?.[0] ||
        matchingProc?.agentResponse ||
        matchingProc?._agentResponse
    }
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch { }
    }
    if (data && typeof data === 'object') {
      let merged = { ...data }
      if (merged._agentResponse) {
        if (typeof merged._agentResponse === 'string') {
          try {
            merged = { ...merged, ...JSON.parse(merged._agentResponse) }
          } catch { }
        } else if (typeof merged._agentResponse === 'object') {
          merged = { ...merged, ...merged._agentResponse }
        }
      }
      if (merged.agentResponse) {
        if (typeof merged.agentResponse === 'string') {
          try {
            merged = { ...merged, ...JSON.parse(merged.agentResponse) }
          } catch { }
        } else if (typeof merged.agentResponse === 'object') {
          merged = { ...merged, ...merged.agentResponse }
        }
      }
      return merged
    }
    return {}
  }, [agentData, selectedItem, matchingProc])

  const resolvedInstanceId = useMemo(() => {
    return String(
      selectedItem?.workflowInstanceId ||
      selectedItem?.instanceId ||
      processId ||
      '',
    )
  }, [selectedItem, processId])

  const isCurrentlyProcessing =
    isProcessing === undefined
      ? !!matchingProc || selectedItem?.isProcessing
      : isProcessing

  const poSourceType = useMemo(() => {
    const poRow = getPoRowObj(agentData, selectedItem, matchingProc)
    if (poRow?.source) return String(poRow.source).trim()
    if (poRow?.source_type) return String(poRow.source_type).trim()
    if (poRow?.sourceType) return String(poRow.sourceType).trim()

    const getSourceFromObj = (obj: any) => {
      if (!obj) return null
      if (typeof obj === 'object') {
        if (obj.source_type || obj.sourceType || obj.source)
          return obj.source_type || obj.sourceType || obj.source
        if (obj.agentResponse && typeof obj.agentResponse === 'object') {
          return (
            obj.agentResponse.source_type ||
            obj.agentResponse.sourceType ||
            obj.agentResponse.source ||
            null
          )
        }
        if (obj._agentResponse && typeof obj._agentResponse === 'object') {
          return (
            obj._agentResponse.source_type ||
            obj._agentResponse.sourceType ||
            obj._agentResponse.source ||
            null
          )
        }
        return null
      }
      if (typeof obj === 'string') {
        try {
          const parsed = JSON.parse(obj)
          if (parsed && typeof parsed === 'object')
            return parsed.source_type || parsed.sourceType || parsed.source || null
        } catch { }
      }
      return null
    }

    const candidates = [
      agentData,
      agentData?._agentResponse,
      agentData?.agentResponse,
      selectedItem,
      selectedItem?._agentResponse,
      selectedItem?.agentResponse,
      matchingProc,
      matchingProc?.agentResponse,
      matchingProc?._agentResponse,
    ]

    for (const cand of candidates) {
      const src = getSourceFromObj(cand)
      if (src) return String(src).trim()
    }
    return ''
  }, [agentData, selectedItem, matchingProc])

  const poSourceLabel = useMemo(() => {
    const norm = poSourceType.toLowerCase()
    if (
      norm === 'hana_cloud' ||
      norm === 'hana cloud' ||
      norm.includes('hana') ||
      norm.includes('sap')
    ) {
      return 'SAP'
    }
    return 'PO Master'
  }, [poSourceType])

  const isScanning = useMemo(() => {
    const hasData =
      formModel &&
      Object.keys(formModel).length > 0 &&
      Object.values(formModel).some(hasMeaningfulScalarValue)
    return !!isCurrentlyProcessing && !hasData
  }, [isCurrentlyProcessing, formModel])

  const isRequestCompleted = useMemo(() => {
    const rawStatus = String(
      selectedItem?.status ||
      selectedItem?.workflowStatus ||
      selectedItem?.stage ||
      agentData?.status ||
      '',
    )
      .toLowerCase()
      .trim()

    const hasCompletedAt = Boolean(
      selectedItem?.completedAtUtc ||
      agentData?.completedAtUtc ||
      matchingProc?.completedAtUtc ||
      selectedItem?.completedAt ||
      agentData?.completedAt,
    )

    return (
      hasCompletedAt ||
      rawStatus === 'completed' ||
      rawStatus === 'approved' ||
      rawStatus === 'paid' ||
      rawStatus === 'closed' ||
      rawStatus === 'done' ||
      props.isCompleted === true ||
      selectedItem?.isCompleted === true ||
      Boolean(agentData?.paymentStatus) ||
      Boolean(agentData?.payment_status)
    )
  }, [selectedItem, agentData, matchingProc, props.isCompleted])

  const formattedPaymentSyncTime = useMemo(() => {
    const rawDate =
      selectedItem?.completedAtUtc ||
      agentData?.completedAtUtc ||
      matchingProc?.completedAtUtc ||
      selectedItem?.completedAt ||
      agentData?.completedAt ||
      agentData?.paymentSyncTime

    return formatPaymentSyncTime(rawDate)
  }, [selectedItem, agentData, matchingProc])

  const getFieldScore = (key: string) => {
    const normalizeName = (name: string) => {
      const normalized = name.toLowerCase().trim()
      if (
        normalized === 'vendor name' ||
        normalized === 'supplier name' ||
        normalized === 'supplier' ||
        normalized === 'vendor'
      ) {
        return 'supplier name'
      }
      if (
        normalized === 'total due' ||
        normalized === 'invoice amount' ||
        normalized === 'invoice value' ||
        normalized === 'amount' ||
        normalized === 'total amount'
      ) {
        return 'total due'
      }
      if (
        normalized === 'invoice number' ||
        normalized === 'invoice no' ||
        normalized === 'invoice no.'
      ) {
        return 'invoice number'
      }
      return normalized
    }

    const cleanK = normalizeName(key)
    const matchingFields =
      agentData?.debug?.['Side-by-side Field Matching'] || []
    for (const field of matchingFields) {
      if (field?.Field && normalizeName(field.Field) === cleanK) {
        return Number(field.Score)
      }
    }
    return undefined
  }

  const getFieldPoValue = (key: string) => {
    const normKey = String(key || '').toLowerCase().trim()
    if (
      normKey.includes('invoice amount') ||
      normKey.includes('invoice date') ||
      normKey.includes('invoice number') ||
      normKey.includes('invoice no') ||
      normKey === 'invoice_amount' ||
      normKey === 'invoice_date' ||
      normKey === 'invoice_no' ||
      normKey === 'invoice_number'
    ) {
      return undefined
    }

    const poRow = getPoRowObj(agentData, selectedItem, matchingProc)
    const valFromPoRow = getValueFromPoRow(poRow, key)
    if (
      valFromPoRow !== undefined &&
      valFromPoRow !== null &&
      valFromPoRow !== ''
    ) {
      return valFromPoRow
    }

    const normalizeName = (name: string) => {
      const normalized = name.toLowerCase().trim()
      if (
        normalized === 'vendor name' ||
        normalized === 'supplier name' ||
        normalized === 'supplier' ||
        normalized === 'vendor'
      ) {
        return 'supplier name'
      }
      if (
        normalized === 'total due' ||
        normalized === 'po amount' ||
        normalized === 'po_amount' ||
        normalized === 'amount' ||
        normalized === 'total amount'
      ) {
        return 'po amount'
      }
      if (
        normalized === 'po number' ||
        normalized === 'po no' ||
        normalized === 'po no.' ||
        normalized === 'po_number' ||
        normalized === 'po_no'
      ) {
        return 'po number'
      }
      if (normalized === 'po date' || normalized === 'po_date') {
        return 'po date'
      }
      return normalized
    }

    const cleanK = normalizeName(key)

    const matchingFields =
      agentData?.debug?.['Side-by-side Field Matching'] || []
    for (const field of matchingFields) {
      if (field?.Field && normalizeName(field.Field) === cleanK) {
        return field['PO Value']
      }
    }
    return undefined
  }

  const getFieldInvoiceValue = (key: string) => {
    const normalizeName = (name: string) => {
      const normalized = name.toLowerCase().trim()
      if (
        normalized === 'vendor name' ||
        normalized === 'supplier name' ||
        normalized === 'supplier' ||
        normalized === 'vendor'
      ) {
        return 'supplier name'
      }
      if (
        normalized === 'total due' ||
        normalized === 'invoice amount' ||
        normalized === 'invoice value' ||
        normalized === 'amount' ||
        normalized === 'total amount'
      ) {
        return 'total due'
      }
      if (
        normalized === 'invoice number' ||
        normalized === 'invoice no' ||
        normalized === 'invoice no.'
      ) {
        return 'invoice number'
      }
      return normalized
    }

    const cleanK = normalizeName(key)
    const matchingFields =
      agentData?.debug?.['Side-by-side Field Matching'] || []
    for (const field of matchingFields) {
      if (field?.Field && normalizeName(field.Field) === cleanK) {
        return field['Invoice Value']
      }
    }
    return undefined
  }

  const glValidationDisplay = useMemo(
    () =>
      hasGlValidationData(agentData) ? getGlValidationDisplay(agentData) : null,
    [agentData],
  )
  const backOrder = useMemo(() => {
    if (isFourthItem) {
      return {
        detected: true,
        missing_qty_by_item: [
          {
            amount: 1050.0,
            description: 'Office Chair - Ergonomic',
            invoice_qty: 3,
            po_line_id: '1',
            po_qty: 10,
            price: 150.0,
            reason: 'SHORT_SHIP',
            remaining: 7,
          },
        ],
        previous_id: ['MSP-REQ-55'],
        recommendation: 'WAIT_FOR_BALANCE',
      }
    }
    return agentData?.back_order || agentData?.backorder
  }, [agentData, isFourthItem])

  const backOrderDisplay = useMemo(() => {
    if (isFourthItem) {
      return {
        status: 'Detected',
        statusType: 'warning' as const,
        value: '1 item affected',
      }
    }
    return hasBackOrderData(agentData) ? getBackOrderDisplay(agentData) : null
  }, [agentData, isFourthItem])
  const paymentTermsDisplay = useMemo(() => {
    const terms = extractPaymentTerms(selectedItem, agentData, formModel)
    const dueDate = extractDueDate(selectedItem, agentData, formModel)
    return computeDueDateInfo(selectedItem, terms, dueDate, formModel)
  }, [selectedItem, agentData, formModel])
  const matterValidationDisplay = useMemo(
    () =>
      hasMatterValidationData(agentData)
        ? getMatterValidationDisplay(agentData)
        : null,
    [agentData],
  )
  const supplierValidationDisplay = useMemo(
    () => getSupplierValidationDisplay(agentData, formModel),
    [agentData, formModel],
  )
  const showGlValidation = useMemo(
    () => hasGlValidationData(agentData),
    [agentData],
  )
  const showBackOrder = useMemo(
    () => isFourthItem || hasBackOrderData(agentData),
    [agentData, isFourthItem],
  )
  const showMatterValidation = useMemo(
    () => hasMatterValidationData(agentData),
    [agentData],
  )
  const analysisCardCount =
    3 +
    (showGlValidation ? 1 : 0) +
    1 + // Either Back Order or Payment Terms is always shown
    (showMatterValidation ? 1 : 0)

  const [activeTab, setActiveTab] = useState('summary')
  const [activeDetailView, setActiveDetailView] = useState<string | null>(null)
  const [expandedLedgerKeys, setExpandedLedgerKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!kanbanMissingFieldIds?.length) return
    setActiveTab('summary')
    const timer = window.setTimeout(() => {
      const target = kanbanMissingFieldIds
        .map((id) =>
          document.querySelector(`[data-field-id="${CSS.escape(id)}"]`),
        )
        .find((node) => node instanceof HTMLElement)
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 280)
    return () => window.clearTimeout(timer)
  }, [kanbanMissingFieldIds])

  // Document ID resolver
  const docId = useMemo(() => {
    const rawId =
      resolvedInstanceId ||
      selectedItem?.workflowInstanceId ||
      selectedItem?.instanceId ||
      processId
    if (!rawId || String(rawId) === 'NaN') {
      return String(selectedItem?.id || '')
    }
    return String(rawId)
  }, [resolvedInstanceId, selectedItem, processId])

  // Supplier Name resolver
  const supplierName = useMemo(() => {
    const name =
      formModel?.['Supplier Name'] ||
      formModel?.['Vendor Name'] ||
      formModel?.['SupplierName'] ||
      formModel?.['VendorName'] ||
      formModel?.['Supplier'] ||
      formModel?.['Vendor'] ||
      agentData?.po_row?.['Vendor Name'] ||
      ''
    return String(name).trim() || 'the supplier'
  }, [formModel, agentData])

  // Supplier Verification Check State
  const [supplierCheckState, setSupplierCheckState] = useState<{
    data?: any
    status: 'not_run' | 'pending' | 'complete'
  }>(() => {
    if (!docId) return { status: 'not_run' }
    const db = getMockDB()
    return db.documents[docId]?.supplierVerification || { status: 'not_run' }
  })

  // Synchronize state when document ID changes
  useEffect(() => {
    if (!docId) return
    const db = getMockDB()
    setSupplierCheckState(
      db.documents[docId]?.supplierVerification || { status: 'not_run' },
    )
  }, [docId])

  // Tab sync for external updates (e.g. cross-tab events)
  useEffect(() => {
    const handleStorageChange = () => {
      if (!docId) return
      const db = getMockDB()
      setSupplierCheckState(
        db.documents[docId]?.supplierVerification || { status: 'not_run' },
      )
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [docId])

  // Supplier Verification Handler
  const handleVerifySupplierClick = async () => {
    if (!docId) return
    try {
      const realResult = {
        status: supplierValidationDisplay.status,
        statusType: supplierValidationDisplay.statusType,
        value: supplierValidationDisplay.value,
      }

      setSupplierCheckState({ status: 'pending' })

      const result = await startSupplierVerification(docId, realResult)

      setSupplierCheckState({
        data: result,
        status: 'complete',
      })

      showToast({
        message: t`Supplier verification completed: ${result.value}`,
        variant: 'success',
      })
    } catch (error: any) {
      setSupplierCheckState({ status: 'not_run' })
      showToast({
        message:
          error?.message || t`Verification failed. 1 credit has been refunded.`,
        variant: 'error',
      })
    }
  }

  const poVal = useMemo(() => {
    return (
      formModel?.['PO Number'] ||
      formModel?.['PO No'] ||
      formModel?.['po_number'] ||
      formModel?.['poNumber'] ||
      formModel?.['po_no'] ||
      formModel?.['pono'] ||
      formModel?.['Purchase Order'] ||
      formModel?.['RXwLGHILLrreMmRqlk9mj']
    )
  }, [formModel])

  const invoiceSummary = useMemo(() => {
    const invoiceHeader =
      agentData?.['Extracted Invoice JSON']?.invoice_header || {}
    const amount = firstPlaygroundValue(
      formModel?.['Invoice Amount'],
      formModel?.['Total Due'],
      formModel?.['Total'],
      formModel?.['invoice_amount'],
      formModel?.['total_amount'],
      invoiceHeader?.['Invoice Amount'],
      invoiceHeader?.['Total Due'],
      invoiceHeader?.['Total'],
      invoiceHeader?.['invoice_amount'],
      invoiceHeader?.['total_amount'],
      selectedItem?.totalAmount,
      selectedItem?.amount,
    )
    const vendor = firstPlaygroundValue(
      formModel?.['Supplier Name'],
      formModel?.['Vendor Name'],
      formModel?.['SupplierName'],
      formModel?.['VendorName'],
      formModel?.['Supplier'],
      formModel?.['Vendor'],
      invoiceHeader?.['Supplier Name'],
      invoiceHeader?.['Vendor Name'],
      invoiceHeader?.['Supplier'],
      invoiceHeader?.['Vendor'],
      agentData?.po_row?.['Vendor Name'],
      selectedItem?.vendor,
      supplierName === 'the supplier' ? '' : supplierName,
    )
    return {
      amount: toPlaygroundAmount(amount),
      currency: toPlaygroundString(
        firstPlaygroundValue(
          formModel?.['Currency'],
          invoiceHeader?.['Currency'],
          selectedItem?.currency,
        ),
        'USD',
      ),
      invoiceNumber: toPlaygroundString(
        firstPlaygroundValue(
          formModel?.['Invoice Number'],
          formModel?.['Invoice No'],
          formModel?.['invoice_number'],
          formModel?.['invoice_no'],
          invoiceHeader?.['Invoice Number'],
          invoiceHeader?.['Invoice No'],
          invoiceHeader?.['invoice_number'],
          invoiceHeader?.['invoice_no'],
          selectedItem?.invoiceNumber,
        ),
      ),
      poNumber: toPlaygroundString(
        firstPlaygroundValue(
          poVal,
          selectedItem?.purchaseOrderNumber,
          selectedItem?.poNumber,
        ),
      ),
      requestNo: toPlaygroundString(
        firstPlaygroundValue(
          selectedItem?.requestNo,
          selectedItem?.reqNo,
          selectedItem?.transactionId,
          selectedItem?.processId,
        ),
      ),
      vendor: toPlaygroundString(vendor),
    }
  }, [agentData, formModel, poVal, selectedItem, supplierName])

  const apiPlaygroundContext = useMemo<ApiPlaygroundContext>(() => {
    const document = invoiceSummary

    return {
      endpoints: [
        {
          apiPath: `/api/v6/requests/${document.requestNo || 'REQ-1'}`,
          description:
            'Retrieve full metadata and extracted data for a specific request.',
          id: 'get_request',
          method: 'GET',
          requestPayload: null,
          responsePayload: {
            data: document,
            success: true,
          },
          title: 'Get Request Details',
        },
        {
          apiPath: `/api/v6/requests/${document.requestNo || 'REQ-1'}/move-next`,
          description:
            'Approve and transition the specified request to the next step in its workflow.',
          id: 'move_next',
          method: 'POST',
          requestPayload: {
            action: 'approve',
            comments: 'Verified automatically.',
          },
          responsePayload: {
            message: 'Request successfully moved to the next stage.',
            nextStage: 'Manager Approval',
            success: true,
            transactionId: document.requestNo || 'REQ-1',
          },
          title: 'Move to Next Stage',
        },
      ],
    }
  }, [invoiceSummary])

  const setPlaygroundContext = usePlaygroundStore((state) => state.setContext)
  useEffect(() => {
    setPlaygroundContext(apiPlaygroundContext)
    return () => setPlaygroundContext(null)
  }, [apiPlaygroundContext, setPlaygroundContext])

  const [activeBackOrderTab, setActiveBackOrderTab] =
    useState<string>('current')
  const [selectedFile, setSelectedFile] = useState<any>(null)

  useEffect(() => {
    console.log('=== OVERVIEW COMPONENT RENDER ===')
    console.log('formModel:', formModel)
    console.log('allowedLabels:', allowedLabels)
  }, [formModel, allowedLabels])
  const { data: attachmentData, refetch: refetchAttachments } = useAttachments(
    workflowId,
    resolvedInstanceId,
    true,
  )
  const attachedItemIds = useMemo(
    () =>
      new Set(
        (attachmentData || [])
          .map((file) => String(file.itemId ?? file.id ?? ''))
          .filter(Boolean),
      ),
    [attachmentData],
  )
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useComments(workflowId, resolvedInstanceId, true)

  const [lineItems, setLineItems] = useState<any[]>([])

  // --- PO Line Items Setup ---
  const parsedFormData = useMemo(() => {
    return getParsedFormData(selectedItem)
  }, [selectedItem])

  const poLineItemsKey = useMemo(() => {
    let key = formModel
      ? Object.keys(formModel).find((k) => k.toLowerCase().startsWith('awai'))
      : null
    if (key) return key

    if (parsedFormData) {
      key = Object.keys(parsedFormData).find((k) =>
        k.toLowerCase().startsWith('awai'),
      )
    }
    return key || null
  }, [formModel, parsedFormData])

  const rawPoLineItems = useMemo(() => {
    // 1. Check formModel / parsedFormData by key starting with 'awai'
    if (poLineItemsKey) {
      let val = formModel ? formModel[poLineItemsKey] : undefined
      if (val === undefined && parsedFormData) {
        val = parsedFormData[poLineItemsKey]
      }
      if (Array.isArray(val) && val.length > 0) return val
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch { }
      }
    }

    // 2. Check po_row in agentData / selectedItem / matchingProc
    const poRow = getPoRowObj(agentData, selectedItem, matchingProc)
    if (poRow && typeof poRow === 'object') {
      const lineItemCandidates = [
        poRow['PO Line Item Mapped'],
        poRow['po_line_items'],
        poRow['PO Line Items'],
        poRow['line_items'],
        poRow['items'],
        poRow['po_items'],
      ]
      for (const cand of lineItemCandidates) {
        if (Array.isArray(cand) && cand.length > 0) return cand
        if (typeof cand === 'string') {
          try {
            const parsed = JSON.parse(cand)
            if (Array.isArray(parsed) && parsed.length > 0) return parsed
          } catch { }
        }
      }
    }

    // 3. Check agentData directly
    const agentCandidates = [
      agentData?.po_line_items,
      agentData?.po_items,
      agentData?.['Extracted Invoice JSON']?.line_items,
      agentData?.['Extracted Invoice JSON']?.invoice_items,
      selectedItem?.po_line_items,
    ]
    for (const cand of agentCandidates) {
      if (Array.isArray(cand) && cand.length > 0) return cand
      if (typeof cand === 'string') {
        try {
          const parsed = JSON.parse(cand)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch { }
      }
    }

    return []
  }, [formModel, parsedFormData, poLineItemsKey, agentData, selectedItem, matchingProc])

  const poColMap = useMemo(() => {
    return getPoTableColumnsMapping(
      selectedWorkflow?.formJson || formDefinition,
    )
  }, [selectedWorkflow, formDefinition])

  const poLineItems = useMemo(() => {
    return rawPoLineItems.map((item: any, idx: number) => {
      const mappedItem: any = {
        _id: item._id || `po-li-${idx}-${Date.now()}`,
      }

      Object.entries(item).forEach(([k, v]) => {
        if (k === '_id') return
        const rawLabel = poColMap.get(k) || FALLBACK_PO_COLS_MAP[k] || k
        const label = normalizeColumnLabel(rawLabel)
        if (
          mappedItem[label] === undefined ||
          mappedItem[label] === null ||
          mappedItem[label] === ''
        ) {
          mappedItem[label] = v
        } else if (v !== undefined && v !== null && v !== '') {
          mappedItem[label] = v
        }
      })

      return mappedItem
    })
  }, [rawPoLineItems, poColMap])

  const poDynamicColumns = useMemo(() => {
    if (!poLineItems || poLineItems.length === 0) return []

    const canonicalKeyMap = new Map<string, string>()

    poLineItems.forEach((item: any) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((k) => {
          if (
            !k ||
            !k.trim() ||
            k === '_id' ||
            k === '_localFileUrl' ||
            k === 'localUrl' ||
            k === 'score' ||
            k === 'Line Score' ||
            k === 'status'
          ) {
            return
          }

          const canonical = getCanonicalColumnKey(k)
          if (!canonical) return

          const groupKey = canonical.toLowerCase()
          if (!canonicalKeyMap.has(groupKey)) {
            canonicalKeyMap.set(groupKey, canonical)
          }
        })
      }
    })

    const columns = Array.from(canonicalKeyMap.values())
    const standardOrder = [
      'Line No',
      'Description',
      'Qty',
      'Price',
      'UOM',
      'Tax Rate',
      'Class',
      'Part Number',
      'Ref Code',
      'Date',
    ]

    const result: string[] = []
    const colSet = new Set(columns)

    standardOrder.forEach((std) => {
      if (colSet.has(std)) {
        result.push(std)
        colSet.delete(std)
      }
    })

    const amountCols = Array.from(colSet).filter(isLineItemAmountColumn)
    const otherCols = Array.from(colSet).filter((k) => !isLineItemAmountColumn(k))

    return [...result, ...otherCols, ...amountCols]
  }, [poLineItems])

  const poDynamicWidths = useMemo(() => {
    if (!poLineItems || poLineItems.length === 0) return [60, 100, 100]
    const widths: number[] = []

    const totalsByKey: Record<string, string> = {}
    poDynamicColumns.forEach((colKey: string) => {
      const normalizedKey = colKey.toLowerCase()
      if (
        normalizedKey.includes('amount') ||
        normalizedKey.includes('total') ||
        normalizedKey === 'price' ||
        normalizedKey === 'rate'
      ) {
        const total = poLineItems.reduce((sum: number, item: any) => {
          const val = item[colKey] ?? ''
          const strVal = String(val)
          const num = Number.parseFloat(strVal.replace(/[^0-9.-]+/g, ''))
          return sum + (Number.isNaN(num) ? 0 : num)
        }, 0)
        const formattedTotal = total.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        })
        totalsByKey[colKey] = formattedTotal
      }
    })

    poDynamicColumns.forEach((colKey: string, index: number) => {
      let maxChars = colKey.length
      if (colKey.toLowerCase().includes('line')) maxChars = 2
      if (colKey.toLowerCase() === 'uom') maxChars = 4
      poLineItems.forEach((item: any) => {
        const val = item[colKey] ?? ''
        const str = String(val)
        if (str.length > maxChars) maxChars = str.length
      })
      if (totalsByKey[colKey]) {
        if (totalsByKey[colKey].length > maxChars)
          maxChars = totalsByKey[colKey].length
      }

      widths[index] = Math.min(
        100,
        Math.max(35, Math.ceil(maxChars * 8.0) + 24),
      )
    })

    return widths
  }, [poLineItems, poDynamicColumns])

  const poScrollContainerRef = useRef<HTMLDivElement>(null)
  const [poAtEnd, setPoAtEnd] = useState(false)
  const updatePoScrollEdges = useCallback(() => {
    if (!poScrollContainerRef.current) return
    const el = poScrollContainerRef.current
    setPoAtEnd(Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    updatePoScrollEdges()
    window.addEventListener('resize', updatePoScrollEdges)
    return () => window.removeEventListener('resize', updatePoScrollEdges)
  }, [poLineItems, poDynamicWidths, updatePoScrollEdges])

  useEffect(() => {
    console.log('=== DATA SOURCE & TABLES DEBUG ===')
    console.log('Raw formData (from API/item):', selectedItem?.formData)
    console.log('Parsed formData:', getParsedFormData(selectedItem))
    console.log('Invoice Line Items Table values:', lineItems)
    console.log('PO Line Items Table values (mapped):', poLineItems)
  }, [selectedItem, lineItems, poLineItems])

  const handlePoLineItemChange = (
    index: number,
    fieldLabel: string,
    value: any,
  ) => {
    const canonicalField = normalizeColumnLabel(fieldLabel)

    setFormModel?.((prevForm: any) => {
      const nextForm = { ...prevForm }
      if (!poLineItemsKey) return nextForm

      const val = nextForm[poLineItemsKey]
      let currentItems: any[] = []
      if (Array.isArray(val)) {
        currentItems = [...val]
      } else if (typeof val === 'string') {
        try {
          currentItems = JSON.parse(val)
        } catch {
          currentItems = []
        }
      }

      if (currentItems[index]) {
        const itemToUpdate = { ...currentItems[index] }
        let updatedAny = false
        Object.keys(itemToUpdate).forEach((k) => {
          const rawLabel = poColMap.get(k) || FALLBACK_PO_COLS_MAP[k] || k
          if (
            normalizeColumnLabel(rawLabel) === canonicalField ||
            normalizeColumnLabel(k) === canonicalField ||
            k === fieldLabel
          ) {
            itemToUpdate[k] = value
            updatedAny = true
          }
        })
        if (!updatedAny) {
          itemToUpdate[fieldLabel] = value
        }
        currentItems[index] = itemToUpdate
      }

      nextForm[poLineItemsKey] = currentItems
      return nextForm
    })
  }

  const handleAddPoItem = () => {
    setFormModel?.((prevForm: any) => {
      const nextForm = { ...prevForm }
      if (!poLineItemsKey) return nextForm

      const val = nextForm[poLineItemsKey]
      let currentItems: any[] = []
      if (Array.isArray(val)) {
        currentItems = [...val]
      } else if (typeof val === 'string') {
        try {
          currentItems = JSON.parse(val)
        } catch {
          currentItems = []
        }
      }

      const newItem: any = {}
      poColMap.forEach((_, colId) => {
        newItem[colId] = ''
      })
      Object.keys(FALLBACK_PO_COLS_MAP).forEach((colId) => {
        newItem[colId] = ''
      })

      currentItems.push(newItem)
      nextForm[poLineItemsKey] = currentItems
      return nextForm
    })
  }

  const handleRemovePoItem = (indexToRemove: number) => {
    setFormModel?.((prevForm: any) => {
      const nextForm = { ...prevForm }
      if (!poLineItemsKey) return nextForm

      const val = nextForm[poLineItemsKey]
      let currentItems: any[] = []
      if (Array.isArray(val)) {
        currentItems = [...val]
      } else if (typeof val === 'string') {
        try {
          currentItems = JSON.parse(val)
        } catch {
          currentItems = []
        }
      }

      const updated = currentItems.filter((_, idx) => idx !== indexToRemove)
      nextForm[poLineItemsKey] = updated
      return nextForm
    })
  }

  const currentSearchPluginInstance = searchPlugin()
  const searchPluginInstanceRef = useRef<any>(null)
  if (searchPluginInstanceRef.current) {
    Object.assign(searchPluginInstanceRef.current, currentSearchPluginInstance)
  } else {
    searchPluginInstanceRef.current = { ...currentSearchPluginInstance }
  }
  const searchPluginInstance = searchPluginInstanceRef.current
  const { clearHighlights, highlight } = searchPluginInstance

  const handleFieldFocus = (value: any, _fieldKey?: string) => {
    const stringVal = String(value || '').trim()
    if (stringVal && stringVal !== '-') {
      highlight([stringVal])
    } else {
      clearHighlights()
    }
  }

  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [searchFilter, setSearchFilter] = useState<string>('')

  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const eligibleFields = useMemo(() => {
    if (!formModel) return []
    return Object.entries(formModel)
      .filter(([key, val]) => {
        if (typeof val === 'object' && val !== null) return false
        if (typeof val === 'string') {
          const trimmed = val.trim()
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) return false
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) return false
        }
        if (!allowedLabels || allowedLabels.size === 0) {
          return hasMeaningfulScalarValue(val)
        }
        return allowedLabels.has(key) || hasMeaningfulScalarValue(val)
      })
      .map(([key]) => key)
  }, [formModel, allowedLabels])

  const handleMouseUp = () => {
    const selection = globalThis.getSelection()
    if (!selection) return
    const text = selection.toString().trim()
    if (!text) {
      setSelectedText(null)
      setMenuPosition(null)
      setSearchFilter('')
      return
    }

    try {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (viewerContainerRef.current) {
        const containerRect = viewerContainerRef.current.getBoundingClientRect()
        const x = rect.left - containerRect.left
        const y = rect.bottom - containerRect.top

        // Position boundary check to keep dropdown inside the 40% PDF viewer
        const menuWidth = 224
        const menuHeight = 240
        let leftPos = x
        let topPos = y + 10

        if (leftPos + menuWidth > containerRect.width) {
          leftPos = containerRect.width - menuWidth - 8
        }
        if (leftPos < 8) {
          leftPos = 8
        }

        if (topPos + menuHeight > containerRect.height) {
          topPos = rect.top - containerRect.top - menuHeight - 10
        }
        if (topPos < 8) {
          topPos = 8
        }

        setSelectedText(text)
        setMenuPosition({ x: leftPos, y: topPos })
      }
    } catch (err) {
      console.error('Error getting selection range:', err)
    }
  }

  const handleFieldSelect = (fieldKey: string) => {
    if (selectedText) {
      handleFieldChange(fieldKey, selectedText)
    }
    setSelectedText(null)
    setMenuPosition(null)
    setSearchFilter('')
    globalThis.getSelection()?.removeAllRanges()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setSelectedText(null)
        setMenuPosition(null)
        setSearchFilter('')
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedText(null)
        setMenuPosition(null)
        setSearchFilter('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const fieldMetaMap = useMemo(
    () => buildFieldMetaMap(selectedWorkflow, formDefinition),
    [selectedWorkflow, formDefinition],
  )

  const lineItemsTable = useMemo(
    () => findPreferredLineItemsTable(fieldMetaMap, formModel || {}),
    [fieldMetaMap, formModel],
  )

  const tableFieldKey = lineItemsTable?.label ?? null

  const rawLineItems = useMemo(() => {
    const hasMeaningfulLineData = (rows: any[]) => {
      if (!Array.isArray(rows) || rows.length === 0) return false
      return rows.some((r) => {
        if (!r || typeof r !== 'object') return false
        return Object.entries(r).some(([k, v]) => {
          if (
            k === '_id' ||
            k === '_localFileUrl' ||
            k === 'localUrl' ||
            k === 'score' ||
            k === 'Line Score' ||
            k === 'status'
          )
            return false
          const val =
            v && typeof v === 'object' && 'Invoice Value' in v
              ? (v as any)['Invoice Value']
              : v
          return (
            val !== null &&
            val !== undefined &&
            String(val).trim() !== '' &&
            String(val).trim() !== '0'
          )
        })
      })
    }

    if (
      lineItemsTable?.rows?.length &&
      hasMeaningfulLineData(lineItemsTable.rows)
    ) {
      return lineItemsTable.rows
    }

    const candidates = [
      agentData?.debug?.['Side-by-side Line Item matching'],
      agentData?.line_items,
      agentData?.['Extracted Invoice JSON']?.invoice_items,
      agentData?.['Extracted Invoice JSON']?.line_items,
      agentData?.invoice_items,
      selectedItem?.line_items,
      selectedItem?.invoice_items,
    ]

    for (const cand of candidates) {
      if (hasMeaningfulLineData(cand)) {
        return cand
      }
    }

    return (
      lineItemsTable?.rows ||
      candidates.find((c) => Array.isArray(c) && c.length > 0) ||
      []
    )
  }, [agentData, lineItemsTable, selectedItem])

  const tableFieldMeta = useMemo(() => {
    if (!tableFieldKey) return null
    return resolveFieldMeta(fieldMetaMap, tableFieldKey)
  }, [fieldMetaMap, tableFieldKey])

  const isDynamicTable = useMemo(() => {
    return String(tableFieldMeta?.type || '').toUpperCase() === 'DYNAMIC_TABLE'
  }, [tableFieldMeta])

  const dynamicColumns = useMemo(() => {
    if (!rawLineItems || rawLineItems.length === 0) return []

    const canonicalKeyMap = new Map<string, string>()

    rawLineItems.forEach((item: any) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((k) => {
          if (
            !k ||
            !k.trim() ||
            k === '_id' ||
            k === '_localFileUrl' ||
            k === 'localUrl' ||
            k === 'score' ||
            k === 'Line Score' ||
            k === 'status'
          ) {
            return
          }

          const canonical = getCanonicalColumnKey(k)
          if (!canonical) return

          const groupKey = canonical.toLowerCase()
          if (!canonicalKeyMap.has(groupKey)) {
            canonicalKeyMap.set(groupKey, canonical)
          }
        })
      }
    })

    const columns = Array.from(canonicalKeyMap.values())
    const standardOrder = ['Description', 'Qty', 'Price', 'Line No']
    const result: string[] = []
    const colSet = new Set(columns)

    if (colSet.has('Line No')) {
      result.push('Line No')
      colSet.delete('Line No')
    }
    standardOrder.forEach((std) => {
      if (colSet.has(std)) {
        result.push(std)
        colSet.delete(std)
      }
    })

    const amountCols = Array.from(colSet).filter(isLineItemAmountColumn)
    const otherCols = Array.from(colSet).filter((k) => !isLineItemAmountColumn(k))

    return [...result, ...otherCols, ...amountCols]
  }, [rawLineItems])

  useEffect(() => {
    if (rawLineItems && rawLineItems.length > 0) {
      const cloned = structuredClone(rawLineItems)
      const formatted = cloned.map((item: any, idx: number) =>
        formatLineItemFields(item, idx),
      )
      setLineItems(formatted)
    } else {
      setLineItems([])
    }
  }, [rawLineItems])

  const dynamicWidths = useMemo(() => {
    if (!lineItems || lineItems.length === 0) return [60, 100, 100]
    const widths: number[] = []

    // 1. Compute totals first for amount columns
    const totalsByKey: Record<string, string> = {}
    if (isDynamicTable && dynamicColumns && lineItems) {
      dynamicColumns.forEach((colKey: string) => {
        if (
          colKey.toLowerCase().includes('amount') ||
          colKey.toLowerCase().includes('total') ||
          colKey.toLowerCase() === 'price'
        ) {
          const total = lineItems.reduce((sum: number, item: any) => {
            const val = item[colKey]?.['Invoice Value'] ?? item[colKey] ?? ''
            const strVal = String(val)
            const num = Number.parseFloat(strVal.replace(/[^0-9.-]+/g, ''))
            return sum + (Number.isNaN(num) ? 0 : num)
          }, 0)
          const formattedTotal = total.toLocaleString(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })
          totalsByKey[colKey] = formattedTotal
        }
      })
    } else if (lineItems) {
      const total = lineItems.reduce((sum: number, item: any) => {
        const val =
          item.Amount?.['Invoice Value'] ?? item.amount ?? item.Amount ?? ''
        const num = Number.parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
        return sum + (Number.isNaN(num) ? 0 : num)
      }, 0)
      totalsByKey['amount'] = total.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      })
    }

    if (isDynamicTable && dynamicColumns) {
      dynamicColumns.forEach((colKey: string, index: number) => {
        let maxChars = colKey.length
        if (colKey.toLowerCase().includes('line')) maxChars = 2
        if (colKey.toLowerCase() === 'uom') maxChars = 4
        lineItems.forEach((item: any) => {
          const val = item[colKey]?.['Invoice Value'] ?? item[colKey] ?? ''
          const str = String(val)
          if (str.length > maxChars) maxChars = str.length
        })
        if (totalsByKey[colKey]) {
          if (totalsByKey[colKey].length > maxChars)
            maxChars = totalsByKey[colKey].length
        }

        if (colKey.toLowerCase().includes('line')) {
          widths[index] = Math.min(
            80,
            Math.max(35, Math.ceil(maxChars * 8.0) + 24),
          )
        } else {
          widths[index] = Math.min(
            80,
            Math.max(35, Math.ceil(maxChars * 8.0) + 24),
          )
        }
      })
    } else {
      const cols = ['no', 'description', 'quantity', 'rate', 'amount']
      cols.forEach((col: string, index: number) => {
        let maxChars = col.length
        if (col === 'no') maxChars = 2 // Keep line no smaller
        lineItems.forEach((item: any) => {
          let val = ''
          if (col === 'description')
            val =
              item.Description?.['Invoice Value'] ??
              item.description ??
              item.item_no ??
              item.itemNo ??
              ''
          else if (col === 'quantity')
            val = item.Quantity?.['Invoice Value'] ?? item.quantity ?? ''
          else if (col === 'rate')
            val =
              item.Price?.['Invoice Value'] ??
              item.rate ??
              item.unit_price ??
              item.price ??
              ''
          else if (col === 'amount')
            val =
              item.Amount?.['Invoice Value'] ?? item.amount ?? item.Amount ?? ''
          const str = String(val)
          if (str.length > maxChars) maxChars = str.length
        })
        if (col === 'amount' && totalsByKey['amount']) {
          if (totalsByKey['amount'].length > maxChars)
            maxChars = totalsByKey['amount'].length
        }

        if (col === 'description') {
          widths[index] = Math.max(120, Math.ceil(maxChars * 8.0) + 24)
        } else {
          widths[index] = Math.min(
            80,
            Math.max(35, Math.ceil(maxChars * 8.0) + 24),
          )
        }
      })
    }
    return widths
  }, [lineItems, isDynamicTable, dynamicColumns])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)

  const updateScrollEdges = useCallback(() => {
    if (!scrollContainerRef.current) return
    const el = scrollContainerRef.current
    setAtEnd(Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    updateScrollEdges()
    window.addEventListener('resize', updateScrollEdges)
    return () => window.removeEventListener('resize', updateScrollEdges)
  }, [lineItems, dynamicWidths, updateScrollEdges])

  const hasAnyScore = useMemo(() => {
    return lineItems.some((item: any, index: number) => {
      const matchData =
        agentData?.debug?.['Side-by-side Line Item matching']?.[index]
      const lineScore =
        matchData?.['Line Score'] ?? item['Line Score'] ?? item?.score
      return lineScore !== undefined && lineScore !== null
    })
  }, [lineItems, agentData])

  const currentScoreWidth = hasAnyScore ? LINE_ITEM_SCORE_WIDTH : 0

  const syncLineItemsToFormModel = (updatedItems: any[]) => {
    const sanitizeItems = (items: any[]) => {
      return items.map(({ _id, ...rest }) => rest)
    }
    const sanitized = sanitizeItems(updatedItems)
    // const newGrandTotal = sanitized.reduce((sum: number, it: any) => {
    //   const val = getLineItemAmount(it)
    //   const num = Number.parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
    //   return sum + (Number.isNaN(num) ? 0 : num)
    // }, 0)

    setFormModel?.((prevForm: any) => {
      const nextForm = { ...prevForm }

      if (agentData?.debug?.['Side-by-side Line Item matching']) {
        if (!nextForm.debug) nextForm.debug = { ...agentData.debug }
        nextForm.debug['Side-by-side Line Item matching'] = sanitized
      }
      if (agentData?.line_items) {
        nextForm.line_items = sanitized
      }
      if (agentData?.['Extracted Invoice JSON']?.invoice_items) {
        if (!nextForm['Extracted Invoice JSON']) {
          nextForm['Extracted Invoice JSON'] = {
            ...agentData['Extracted Invoice JSON'],
          }
        }
        nextForm['Extracted Invoice JSON'].invoice_items = sanitized
      }

      if (tableFieldKey) {
        nextForm[tableFieldKey] = sanitized
      }

      // const formattedGrandTotal = newGrandTotal.toFixed(2)

      // Object.keys(nextForm).forEach((k) => {
      //   const lk = k.toLowerCase()
      //   if (
      //     lk === 'invoice amount' ||
      //     lk === 'invoice_amount' ||
      //     lk === 'total due' ||
      //     lk === 'total_due' ||
      //     lk === 'total' ||
      //     lk === 'total_amount'
      //   ) {
      //     nextForm[k] = formattedGrandTotal
      //   }
      // })

      return nextForm
    })
  }

  const handleLineItemChange = (
    index: number,
    fieldKey: string,
    value: any,
  ) => {
    setLineItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }

      updateItemField(item, fieldKey, value)

      // Automatically recalculate amount if quantity or price changed
      if (fieldKey === 'quantity' || fieldKey === 'price') {
        recalculateItemAmount(item)
      }

      updated[index] = item
      syncLineItemsToFormModel(updated)
      return updated
    })
  }

  const handleAddItem = () => {
    const newItem: any = {
      _id: `li-${Date.now()}-${Math.random()}`,
    }

    if (isDynamicTable) {
      dynamicColumns.forEach((col) => {
        newItem[col] = ''
      })
    } else {
      newItem.Amount = { 'Invoice Value': '' }
      newItem.amount = ''
      newItem.Description = { 'Invoice Value': '' }
      newItem.description = ''
      newItem.Price = { 'Invoice Value': '' }
      newItem.Quantity = { 'Invoice Value': '' }
      newItem.quantity = ''
      newItem.rate = ''
      newItem.total = ''
      newItem.unit_price = ''
    }

    setLineItems((prev) => {
      const updated = [...prev, newItem]
      syncLineItemsToFormModel(updated)
      return updated
    })
  }

  const handleRemoveItem = (indexToRemove: number) => {
    setLineItems((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove)
      syncLineItemsToFormModel(updated)
      return updated
    })
  }

  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId
  const userId = session?.id

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [isViewerLoading, setIsViewerLoading] = useState(false)
  const [scale, setScale] = useState(1)
  const [scannerBounds, setScannerBounds] = useState<{
    left: number
    right: number
  }>({ left: 0, right: 0 })
  const viewerRef = useRef<any>(null)
  const pdfViewerWrapperRef = useRef<HTMLDivElement>(null)
  const lastFetchedRef = useRef<{
    itemId: string
    localUrl?: string
    repoId: string
  } | null>(null)

  // Measure the actual PDF page element bounds so scanner line is confined to it
  useEffect(() => {
    if (!pdfViewerWrapperRef.current || !isScanning) return
    const wrapper = pdfViewerWrapperRef.current
    const measure = () => {
      const page =
        wrapper.querySelector('.rpv-core__page-layer') ||
        wrapper.querySelector('[class*="page-layer"]') ||
        wrapper.querySelector('canvas')
      if (page && wrapper) {
        const wRect = wrapper.getBoundingClientRect()
        const pRect = page.getBoundingClientRect()
        const newLeft = Math.max(0, pRect.left - wRect.left)
        const newRight = Math.max(0, wRect.right - pRect.right)
        setScannerBounds((prev) =>
          prev.left === newLeft && prev.right === newRight
            ? prev
            : { left: newLeft, right: newRight },
        )
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(wrapper)
    const mutationObserver = new MutationObserver(measure)
    mutationObserver.observe(wrapper, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [isScanning, previewUrl])

  const toolbarPluginInstance = useMemo(
    () => ({
      install: (pluginFunctions: any) => {
        viewerRef.current = pluginFunctions
      },
      onViewerStateChange: (viewerState: any) => {
        if (viewerState && viewerState.scale) {
          setScale((prev) =>
            prev === viewerState.scale ? prev : viewerState.scale,
          )
        }
        return viewerState
      },
      onZoom: (e: any) => {
        setScale(e.scale)
      },
    }),
    [],
  )

  const requestFileKey = useMemo(
    () =>
      [
        selectedItem?.processId,
        selectedItem?.id,
        selectedItem?.transactionId,
        selectedItem?.itemId,
        repositoryId,
      ]
        .filter(Boolean)
        .join(':'),
    [repositoryId, selectedItem],
  )

  const zoomTo = (nextScale: number) => {
    const boundedScale = Math.min(
      1.5,
      Math.max(0.75, Number(nextScale.toFixed(2))),
    )
    setScale(boundedScale)
    viewerRef.current?.zoom(boundedScale)
  }

  useEffect(() => {
    // Reset viewer state when request changes
    setSelectedFile(null)
    setPreviewUrl(null)
    setFileType(null)
    setScale(1)
    setIsViewerLoading(false)
    lastFetchedRef.current = null
  }, [requestFileKey])

  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData.at(-1))
    }
  }, [attachmentData, requestFileKey, selectedFile])

  useEffect(() => {
    const el = viewerContainerRef.current
    if (!el) return
    el.addEventListener('mouseup', handleMouseUp)
    return () => {
      el.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseUp])

  const fetchFileBinaryData = async (
    repoId: string,
    itemId: string,
    tenantId: any,
    userId: any,
    selectedFileId: any,
  ) => {
    if (isUuid(repoId) && isUuid(itemId)) {
      return fetchV6Binary(repoId, itemId)
    }
    return fetchLegacyBinary(repoId, itemId, tenantId, userId, selectedFileId)
  }

  useEffect(() => {
    let activeUrl: string | null = null
    const fetchFile = async () => {
      const localUrl =
        selectedFile?._localFileUrl ||
        selectedItem?._localFileUrl ||
        selectedFile?.localUrl ||
        selectedItem?.localUrl
      if (localUrl) {
        if (lastFetchedRef.current?.localUrl === localUrl) {
          return
        }
        lastFetchedRef.current = { itemId: '', localUrl, repoId: '' }
        setPreviewUrl(localUrl)
        setFileType(
          selectedFile?.type || selectedItem?.type || 'application/pdf',
        )
        setIsViewerLoading(false)
        return
      }

      const repoId = String(
        selectedFile?.repositoryId ||
        selectedItem?.repositoryId ||
        repositoryId ||
        '',
      ).trim()
      const itemId = String(
        selectedFile?.itemId || selectedFile?.id || selectedItem?.itemId || '',
      ).trim()

      if (
        !repoId ||
        !itemId ||
        repoId === 'undefined' ||
        itemId === 'undefined'
      )
        return

      if (
        lastFetchedRef.current?.repoId === repoId &&
        lastFetchedRef.current?.itemId === itemId
      ) {
        return
      }
      lastFetchedRef.current = { itemId, repoId }

      setIsViewerLoading(true)
      try {
        const res = await fetchFileBinaryData(
          repoId,
          itemId,
          tenantId,
          userId,
          selectedFile?.id,
        )
        if (res) {
          if (res.isBlob) {
            activeUrl = res.url
          }
          setPreviewUrl(res.url)
          setFileType(res.mimeType)
        }
      } catch (error) {
        console.error('Error fetching file:', error)
        lastFetchedRef.current = null
      } finally {
        setIsViewerLoading(false)
      }
    }
    fetchFile()
    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl)
      }
    }
  }, [selectedFile, repositoryId, selectedItem, tenantId, userId])

  const handleFieldChange = (key: string, value: string) => {
    setFormModel?.((prev: any) => {
      const next = { ...prev }
      updateValueInStructure(next, key, value)
      return next
    })
  }

  const getFieldType = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('date')) return 'date'
    if (l.includes('currency') || l.includes('status')) return 'dropdown'
    return 'text'
  }

  const getOptions = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('currency'))
      return [
        { id: 'USD', name: 'USD' },
        { id: 'EUR', name: 'EUR' },
        { id: 'GBP', name: 'GBP' },
        { id: 'INR', name: 'INR' },
        { id: 'AED', name: 'AED' },
      ]
    return []
  }

  const getFieldIcon = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('supplier') || l.includes('vendor')) return Store
    if (l.includes('invoice') || l.includes('number')) return ListFilter
    if (l.includes('date')) return HistoryIcon
    if (l.includes('total') || l.includes('amount') || l.includes('value'))
      return Wallet
    if (l.includes('currency')) return CreditCard
    return FileText
  }

  let previewContent = null
  if (previewUrl) {
    if (fileType === 'application/pdf') {
      previewContent = (
        <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'>
          <div
            className='group relative h-full w-full overflow-hidden'
            ref={pdfViewerWrapperRef}
          >
            <Viewer
              defaultScale={SpecialZoomLevel.PageWidth}
              fileUrl={previewUrl}
              key={`${requestFileKey}-${previewUrl}`}
              plugins={[toolbarPluginInstance, searchPluginInstance]}
              renderError={() => (
                <div className='flex h-full flex-col items-center justify-center p-6 text-center'>
                  <Icon
                    className='mb-4 size-12 text-[var(--gray-4)]'
                    name='tabler:file-off'
                  />
                  <p className='text-[15px] font-semibold text-[var(--gray-11)]'>
                    No document preview available
                  </p>
                </div>
              )}
            />
            <div className='absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-[var(--gray-3)] bg-surface/90 px-4 py-2 opacity-0 shadow-2xl backdrop-blur-sm transition-all duration-300 group-hover:opacity-100'>
              <button
                className='p-1 hover:text-[var(--primary-9)] disabled:cursor-not-allowed disabled:opacity-40'
                disabled={scale <= 0.75}
                onClick={() => {
                  const step = scale <= 1 ? 0.05 : 0.1
                  zoomTo(scale - step)
                }}
              >
                <Icon className='size-5' name='lucide:zoom-out' />
              </button>
              <span className='min-w-[40px] text-center text-[12px] font-semibold'>
                {Math.round(scale * 100)}%
              </span>
              <button
                className='p-1 hover:text-[var(--primary-9)] disabled:cursor-not-allowed disabled:opacity-40'
                disabled={scale >= 1.5}
                onClick={() => {
                  const step = scale < 1 ? 0.05 : 0.1
                  zoomTo(scale + step)
                }}
              >
                <Icon className='size-5' name='lucide:zoom-in' />
              </button>
            </div>

            {/* Scanner overlay — constrained to actual PDF page width via measured bounds */}
            {isScanning && (
              <div className='pointer-events-none absolute inset-0 z-10 overflow-hidden'>
                <div
                  className='bg-[color-mix(in srgb,var(--primary-9)_3%,transparent)] absolute inset-y-0'
                  style={{
                    left: scannerBounds.left,
                    right: scannerBounds.right,
                  }}
                />
                <div
                  className='animate-scan absolute h-[1px] bg-[var(--primary-8)] shadow-[0_0_6px_var(--primary-9)]'
                  style={{
                    animationDuration: '8s',
                    left: scannerBounds.left,
                    right: scannerBounds.right,
                  }}
                />
              </div>
            )}
          </div>
        </Worker>
      )
    } else {
      previewContent = (
        <div className='relative flex h-full w-full items-center justify-center p-4'>
          <img
            alt='Preview'
            className='max-h-full max-w-full rounded-xl border object-contain shadow-2xl'
            src={previewUrl}
          />
          {/* Scanner overlay (restricted to Image) */}
          {isScanning && (
            <div className='pointer-events-none absolute inset-x-4 top-12 bottom-4 z-10 overflow-hidden rounded-xl'>
              <div className='bg-[color-mix(in srgb,var(--primary-9)_3%,transparent)] absolute inset-0' />
              <div
                className='animate-scan absolute right-0 left-0 h-[1px] bg-[var(--primary-8)] shadow-[0_0_6px_var(--primary-9)]'
                style={{ animationDuration: '8s' }}
              />
            </div>
          )}
        </div>
      )
    }
  } else if (!isViewerLoading) {
    previewContent = (
      <div className='flex h-full flex-col items-center justify-center p-6 text-center'>
        <Icon
          className='mb-4 size-12 text-[var(--gray-4)]'
          name='tabler:file-off'
        />
        <p className='text-[15px] font-semibold text-[var(--gray-11)]'>
          No document preview available
        </p>
      </div>
    )
  }

  return (
    <div className='relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden font-sans'>
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        {/* Left Side - Document Viewer (40% Width) */}
        <div
          className='relative flex w-[40%] flex-col overflow-hidden border-r border-[var(--gray-3)]'
          ref={viewerContainerRef}
        >
          {isViewerLoading && (
            <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--gray-1)]'>
              <BarLoader />
              <p className='text-xs font-bold tracking-widest text-[var(--gray-10)] uppercase'>
                Loading Preview...
              </p>
            </div>
          )}

          {previewContent}

          {menuPosition && selectedText && (
            <menu
              className='animate-in fade-in slide-in-from-top-1 absolute z-50 flex max-h-60 w-56 flex-col rounded-lg border border-[var(--gray-3)] bg-surface py-1 shadow-lg duration-200'
              ref={dropdownRef}
              style={{
                left: `${menuPosition.x}px`,
                top: `${menuPosition.y}px`,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              {/* Assign Header */}
              <div className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]/50 px-3 py-1.5 text-[10px] font-semibold text-[var(--gray-11)]'>
                {'Assign "'}
                <span className='inline-block max-w-[140px] truncate align-bottom font-bold text-[var(--gray-13)]'>
                  {selectedText}
                </span>
                {'" to:'}
              </div>

              {/* Search Filter Input */}
              <div className='border-b border-[var(--gray-3)] px-2 py-1.5'>
                <input
                  className='w-full rounded border border-[var(--gray-3)] bg-transparent px-2 py-1 text-xs text-[var(--gray-13)] placeholder:font-normal focus:border-[var(--primary-3)] focus:outline-none'
                  placeholder='Filter fields...'
                  type='text'
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Fields List */}
              <div className='max-h-40 min-h-[40px] flex-1 overflow-y-auto px-1 py-1'>
                {eligibleFields
                  .filter((key) =>
                    key.toLowerCase().includes(searchFilter.toLowerCase()),
                  )
                  .map((key) => (
                    <button
                      className='w-full rounded px-2.5 py-1.5 text-left text-xs font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--primary-3)] hover:text-[var(--primary-9)] active:scale-95'
                      key={key}
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFieldSelect(key)
                      }}
                    >
                      {key}
                    </button>
                  ))}
                {eligibleFields.filter((key) =>
                  key.toLowerCase().includes(searchFilter.toLowerCase()),
                ).length === 0 && (
                    <div className='px-3 py-2 text-center text-xs font-medium text-[var(--gray-9)]'>
                      No matching fields
                    </div>
                  )}
              </div>
            </menu>
          )}
        </div>

        {/* Right Side - Analysis & Data (60% Width) */}
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--gray-1)]'>
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {!selectedItem || Object.keys(selectedItem).length === 0 ? (
              <SummarySkeleton />
            ) : (
              <div className='flex h-full flex-col overflow-hidden'>
                <div className='shrink-0 space-y-4 p-4'>
                  <div
                    className={cn(
                      'grid gap-3',
                      analysisCardCount <= 3 && 'grid-cols-1 sm:grid-cols-3',
                      analysisCardCount === 4 && 'grid-cols-2 md:grid-cols-2 xl:grid-cols-4',
                      analysisCardCount === 5 &&
                      'grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
                      analysisCardCount >= 6 &&
                      'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
                    )}
                  >
                    {(() => {
                      const poVal =
                        formModel?.['PO Number'] ||
                        formModel?.['PO No'] ||
                        formModel?.['po_number'] ||
                        formModel?.['poNumber'] ||
                        formModel?.['po_no'] ||
                        formModel?.['pono'] ||
                        formModel?.['Purchase Order'] ||
                        formModel?.['RXwLGHILLrreMmRqlk9mj'] ||
                        resolvedAgentData?.po_row?.['PO Number'] ||
                        resolvedAgentData?.['Extracted Invoice JSON']?.invoice_header?.['PO Number']

                      const hasPoMatchingData =
                        Boolean(resolvedAgentData?.decision) ||
                        Boolean(resolvedAgentData?.po_row) ||
                        Boolean(poVal && poVal !== '-' && poVal !== 'N/A')

                      const isPoMatchingLoading =
                        isCurrentlyProcessing || !hasPoMatchingData

                      const isMatched =
                        resolvedAgentData?.decision === 'Matched' ||
                        (poVal && poVal !== '-' && poVal !== 'N/A')

                      return (
                        <AnalysisCard
                          align='left'
                          icon={Paperclip}
                          isSelected={activeDetailView === 'po_matching'}
                          title={t`PO Matching`}
                          isLoading={isPoMatchingLoading}
                          status={
                            isMatched
                              ? resolvedAgentData?.decision || t`Matched`
                              : t`Not Matched`
                          }
                          statusType={isMatched ? 'success' : 'warning'}
                          value={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? `${poVal}`
                              : t`No PO Found`
                          }
                          subtitle={
                            poVal &&
                              poVal !== '-' &&
                              poVal !== 'N/A' &&
                              resolvedAgentData?.source_type
                              ? `via ${formatErpSystem(resolvedAgentData.source_type)}`
                              : undefined
                          }
                          onClick={() => setActiveDetailView('po_matching')}
                        />
                      )
                    })()}
                    {(() => {
                      const hasDupData =
                        Boolean(resolvedAgentData?.duplicate_check) ||
                        Boolean(agentData?.duplicate_check) ||
                        Boolean(resolvedAgentData?.invoice_errors)

                      const isDupLoading = isCurrentlyProcessing || !hasDupData

                      return (
                        <AnalysisCard
                          align='left'
                          icon={Layers}
                          isSelected={activeDetailView === 'duplicate_check'}
                          title={t`Duplicate Detection`}
                          isLoading={isDupLoading}
                          status={localizeRequestStatus(
                            i18n,
                            resolvedAgentData?.duplicate_check?.status ||
                            agentData?.duplicate_check?.status ||
                            (resolvedAgentData?.invoice_errors?.severity === 'NONE'
                              ? 'No Duplicate'
                              : 'No Duplicate'),
                          )}
                          statusType={
                            resolvedAgentData?.duplicate_check?.status === 'Duplicate' ||
                              agentData?.duplicate_check?.status === 'Duplicate'
                              ? 'warning'
                              : 'success'
                          }
                          value={
                            resolvedAgentData?.duplicate_check?.message ||
                            agentData?.duplicate_check?.message ||
                            t`No duplicates detected`
                          }
                          onClick={() => setActiveDetailView('duplicate_check')}
                        />
                      )
                    })()}
                    {supplierCheckState.status === 'not_run' && (
                      <AnalysisCard
                        align='left'
                        icon={Wand2}
                        isLoading={false}
                        isPulsing={true}
                        statusType='warning'
                        title={t`Supplier Verification`}
                        value={t`Not Verified`}
                        isSelected={
                          activeDetailView === 'supplier_verification'
                        }
                        statusContent={
                          <button
                            className='relative inline-flex shrink-0 animate-pulse items-center gap-1.5 rounded-lg border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-1 text-[10px] font-bold text-[var(--primary-9)] shadow-sm transition-all hover:scale-[1.02] hover:animate-none hover:bg-[var(--primary-3)] hover:text-[var(--primary-10)] active:scale-95'
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation() // don't also fire the card's onClick
                              handleVerifySupplierClick()
                            }}
                          >
                            <Icon className='size-3.5' name='lucide:bot' />
                            {t`Verify`}
                          </button>
                        }
                        onClick={() => {
                          showToast({
                            message: t`Please click 'Verify' to check if this supplier is legitimate and prevent fraud.`,
                          })
                        }}
                      />
                    )}
                    {supplierCheckState.status === 'pending' && (
                      <AnalysisCard
                        align='left'
                        icon={Wand2}
                        isLoading={false}
                        status={t`Verifying...`}
                        statusType='info'
                        title={t`Supplier Verification`}
                        isSelected={
                          activeDetailView === 'supplier_verification'
                        }
                        value={
                          <span className='inline-flex animate-pulse items-center gap-1.5 text-xs font-medium text-[var(--gray-10)]'>
                            <Icon
                              className='h-3.5 w-3.5 animate-spin text-[var(--primary-9)]'
                              name='tabler:loader-2'
                            />
                            {t`Verifying...`}
                          </span>
                        }
                      />
                    )}
                    {supplierCheckState.status === 'complete' && (
                      <AnalysisCard
                        align='left'
                        icon={Store}
                        isLoading={isCurrentlyProcessing || (!resolvedAgentData?.supplier_validation && !supplierCheckState.data)}
                        title={t`Supplier Verification`}
                        isSelected={
                          activeDetailView === 'supplier_verification'
                        }
                        status={localizeRequestStatus(
                          i18n,
                          resolvedAgentData?.supplier_validation?.status ||
                          supplierCheckState.data?.status ||
                          'Verified',
                        )}
                        statusType={
                          resolvedAgentData?.supplier_validation?.status === 'ACTIVE' ||
                            supplierCheckState.data?.statusType === 'success'
                            ? 'success'
                            : 'warning'
                        }
                        value={
                          resolvedAgentData?.supplier_validation?.validation_details?.reason ||
                          supplierCheckState.data?.value ||
                          t`Supplier verified`
                        }
                        onClick={() =>
                          setActiveDetailView('supplier_verification')
                        }
                      />
                    )}
                    {showGlValidation && glValidationDisplay && (
                      <AnalysisCard
                        align='right'
                        icon={ListFilter}
                        isSelected={activeDetailView === 'gl_matching'}
                        statusType={glValidationDisplay.statusType}
                        title={t`GL Account Matching`}
                        isLoading={
                          isCurrentlyProcessing ||
                          (!hasGlValidationData(resolvedAgentData) &&
                            !hasGlValidationData(agentData) &&
                            (!glValidationDisplay?.account ||
                              glValidationDisplay.account === 'Not Available'))
                        }
                        status={localizeRequestStatus(
                          i18n,
                          glValidationDisplay.status,
                        )}
                        value={
                          glValidationDisplay.account ||
                          glValidationDisplay.status
                        }
                        onClick={() => setActiveDetailView('gl_matching')}
                      />
                    )}
                    {showBackOrder &&
                      backOrderDisplay?.status === 'Detected' ? (
                      <AnalysisCard
                        align='right'
                        icon={PackageX}
                        isSelected={activeDetailView === 'back_order'}
                        statusType={backOrderDisplay.statusType}
                        title={t`Back Order`}
                        value={backOrderDisplay.value}
                        isLoading={
                          isCurrentlyProcessing ||
                          (!hasBackOrderData(resolvedAgentData) &&
                            !hasBackOrderData(agentData) &&
                            (!backOrderDisplay?.value ||
                              backOrderDisplay.value === '---'))
                        }
                        status={localizeRequestStatus(
                          i18n,
                          backOrderDisplay.status,
                        )}
                        onClick={() => {
                          setActiveDetailView('back_order')
                          setActiveBackOrderTab('current')
                        }}
                      />
                    ) : isRequestCompleted ? (
                      <AnalysisCard
                        align='right'
                        icon={CreditCard}
                        isSelected={activeDetailView === 'payment_terms'}
                        statusContent={
                          <div className='flex items-center gap-1 rounded-full bg-[var(--purple-1)] border border-[var(--purple-3)] px-2 py-0.5 text-[9px] font-semibold text-[var(--purple-9)]'>
                            <span>{agentData?.paymentSyncStatus || 'Synced'}</span>
                            <span className='size-1.5 rounded-full bg-[var(--purple-9)]' />
                          </div>
                        }
                        statusType='success'
                        title={t`Payment Status`}
                        value={agentData?.paymentStatus || agentData?.payment_status || 'Paid'}
                        subtitle={
                          agentData?.paymentSyncSubtitle ||
                          `via ${agentData?.erpSystem || (agentData?.poMasterSourceType === 'quickbooks' ? 'QuickBooks' : 'SAP')} · ${formattedPaymentSyncTime}`
                        }
                        onClick={() => setActiveDetailView('payment_terms')}
                      />
                    ) : (
                      <AnalysisCard
                        align='right'
                        icon={Calendar}
                        isSelected={activeDetailView === 'payment_terms'}
                        status={
                          paymentTermsDisplay.calculationText ||
                          resolvedAgentData?.payment_terms?.raw ||
                          'In due'
                        }
                        statusType={paymentTermsDisplay.statusType}
                        title={t`Payment Terms`}
                        isLoading={
                          isCurrentlyProcessing ||
                          (!resolvedAgentData?.payment_terms &&
                            !agentData?.payment_terms &&
                            (!paymentTermsDisplay?.termsDisplay ||
                              paymentTermsDisplay.termsDisplay === '-'))
                        }
                        value={
                          paymentTermsDisplay.daysText
                            ? paymentTermsDisplay.daysText.replace(/days/i, 'Days')
                            : '0 Days'
                        }
                        onClick={() => setActiveDetailView('payment_terms')}
                      />
                    )}
                    {showMatterValidation && matterValidationDisplay && (
                      <AnalysisCard
                        align='right'
                        icon={Briefcase}
                        isSelected={activeDetailView === 'matter_validation'}
                        statusType={matterValidationDisplay.statusType}
                        title={t`Matter Validation`}
                        value={matterValidationDisplay.value}
                        isLoading={
                          isCurrentlyProcessing &&
                          (!matterValidationDisplay?.value ||
                            matterValidationDisplay.value === '---')
                        }
                        status={localizeRequestStatus(
                          i18n,
                          matterValidationDisplay.status,
                        )}
                        onClick={() => setActiveDetailView('matter_validation')}
                      />
                    )}
                  </div>
                </div>

                {!activeDetailView && (
                  <div className='sticky top-0 z-10 shrink-0 border-b border-[var(--gray-3)] bg-surface px-3 sm:px-6 pt-2 overflow-x-auto no-scrollbar scrollbar-none'>
                    <div className='flex items-center justify-between gap-4'>
                      <div className='flex items-center gap-2 sm:gap-6 md:gap-8 min-w-0 overflow-x-auto no-scrollbar'>
                        {[
                          {
                            icon: FileText,
                            id: 'summary',
                            label: t`Extracted Data`,
                          },
                          {
                            icon: Layers,
                            id: 'line_items',
                            label: t`Line Items`,
                          },
                          {
                            icon: Paperclip,
                            id: 'attachments',
                            label: t`Attachments`,
                          },
                          {
                            icon: MessageCircle,
                            id: 'comments',
                            label: t`Comments`,
                          },
                          {
                            icon: HistoryIcon,
                            id: 'history',
                            label: t`History`,
                          },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            className={cn(
                              '-mb-[2px] flex shrink-0 whitespace-nowrap items-center gap-1.5 sm:gap-2 border-b-2 pb-3.5 text-[11px] font-semibold transition-all',
                              activeTab === tab.id
                                ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                                : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
                            )}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <tab.icon className='h-4 w-4 shrink-0' />
                            <span>{tab.label}</span>
                            {tab.id === 'attachments' &&
                              attachmentData?.length > 0 && (
                                <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                                  {attachmentData.length}
                                </span>
                              )}

                            {tab.id === 'comments' &&
                              commentsData &&
                              commentsData.length > 0 && (
                                <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                                  {commentsData.length}
                                </span>
                              )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex min-h-0 flex-1 flex-col'>
                  {activeDetailView ? (
                    <>
                      {activeDetailView === 'po_matching' && (
                        <DetailReportView
                          icon={Paperclip}
                          title={t`PO Matching Analysis`}
                          status={
                            resolvedAgentData?.decision ||
                            (poVal && poVal !== '-' && poVal !== 'N/A'
                              ? t`Matched`
                              : t`Not Matched`)
                          }
                          statusType={
                            resolvedAgentData?.decision === 'Matched' ||
                              (poVal && poVal !== '-' && poVal !== 'N/A')
                              ? 'success'
                              : 'warning'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='space-y-4'>
                            {/* AI Insight & Match Score Overview Banner */}
                            {(resolvedAgentData?.ai_insight ||
                              resolvedAgentData?.reason ||
                              resolvedAgentData?.score !== undefined) && (
                                <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                                  {resolvedAgentData?.ai_insight && (
                                    <div className='md:col-span-2 flex items-start gap-3 rounded-xl border border-[var(--purple-3)] bg-[var(--purple-1)] p-3.5 text-xs text-[var(--purple-11)] shadow-xs'>
                                      <AiBrandIcon
                                        className='size-4.5 shrink-0 mt-0.5 text-[var(--purple-9)]'
                                        variant='outline-purple'
                                      />
                                      <div className='space-y-1'>
                                        <div className='font-semibold text-[var(--purple-12)] text-xs flex items-center gap-1.5'>
                                          {t`AI Insight & Verification Summary`}
                                        </div>
                                        <p className='leading-relaxed font-medium text-[var(--purple-12)]'>
                                          {resolvedAgentData.ai_insight}
                                        </p>
                                        {resolvedAgentData.reason && (
                                          <p className='text-[11px] leading-relaxed text-[var(--purple-11)] opacity-90 pt-1 border-t border-[var(--purple-3)]/60'>
                                            {resolvedAgentData.reason}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div
                                    className={cn(
                                      'flex flex-col justify-center items-center rounded-xl border p-3.5 text-center shadow-xs',
                                      (resolvedAgentData?.score ?? 100) >= 90
                                        ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-11)]'
                                        : 'border-[var(--amber-3)] bg-[var(--amber-1)] text-[var(--amber-11)]',
                                    )}
                                  >
                                    <span className='text-[11px] font-medium text-[var(--gray-11)] mb-0.5'>
                                      {t`Match Score`}
                                    </span>
                                    <div className='flex items-baseline gap-1'>
                                      <span className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
                                        {resolvedAgentData?.score !== undefined
                                          ? `${resolvedAgentData.score}%`
                                          : '100%'}
                                      </span>
                                      <span className='text-xs font-semibold text-[var(--green-9)]'>
                                        {resolvedAgentData?.decision || 'Matched'}
                                      </span>
                                    </div>
                                    {resolvedAgentData?.source_type && (
                                      <span className='text-[10px] text-[var(--gray-10)] mt-0.5'>
                                        {resolvedAgentData.source_type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Document & Procurement Ledger Mapping */}
                            {(() => {
                              const poRowObj =
                                getPoRowObj(resolvedAgentData, selectedItem, matchingProc) ||
                                resolvedAgentData?.po_row ||
                                agentData?.po_row

                              const poLineItemsMapped =
                                poRowObj?.['PO Line Item Mapped'] ||
                                poRowObj?.po_line_item_mapped ||
                                poRowObj?.line_items ||
                                []

                              const supplierIdVal =
                                poRowObj?.['Supplier Id'] ||
                                poRowObj?.['Supplier ID'] ||
                                poRowObj?.['Supplier_Id'] ||
                                poRowObj?.supplier_id ||
                                poRowObj?.['Vendor Id']

                              const poDateVal =
                                poRowObj?.['PO Date'] ||
                                poRowObj?.['po_date'] ||
                                poRowObj?.poDate

                              const currencyVal =
                                poRowObj?.['Currency'] ||
                                poRowObj?.currency ||
                                'USD'

                              const poAmountVal =
                                poRowObj?.['PO Amount'] !== undefined && poRowObj?.['PO Amount'] !== null
                                  ? poRowObj['PO Amount']
                                  : poRowObj?.total !== undefined && poRowObj?.total !== null
                                    ? poRowObj.total
                                    : poRowObj?.po_amount

                              const sourceSystemVal =
                                formatErpSystem(
                                  poRowObj?.source ||
                                  poRowObj?.source_type ||
                                  resolvedAgentData?.source_type,
                                ) || 'SAP'

                              // Extract extra key-values from poRowObj that aren't part of standard display
                              const standardKeys = new Set([
                                'PO Number', 'po_number', 'PO No', 'po_no', 'Supplier', 'supplier', 'Supplier Name',
                                'Supplier Id', 'Supplier ID', 'Supplier_Id', 'supplier_id', 'Vendor Id', 'Vendor',
                                'PO Date', 'po_date', 'poDate', 'PO Amount', 'po_amount', 'Currency', 'currency',
                                'source', 'source_type', 'sourceType', 'total', 'matches', 'PO Line Item Mapped',
                                'po_line_item_mapped', 'line_items'
                              ])

                              const extraPoRowEntries = poRowObj && typeof poRowObj === 'object'
                                ? Object.entries(poRowObj).filter(
                                  ([k, v]) =>
                                    !standardKeys.has(k) &&
                                    v !== null &&
                                    v !== undefined &&
                                    v !== '' &&
                                    typeof v !== 'object',
                                )
                                : []

                              return (
                                <>
                                  {/* Document & Procurement Ledger Mapping */}
                                  <div className='space-y-2.5'>
                                    <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                      {t`Document & Procurement Ledger Mapping`}
                                    </h4>
                                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3 text-xs'>
                                      {[
                                        {
                                          label: t`PO Number`,
                                          value:
                                            poVal ||
                                            poRowObj?.['PO Number'] ||
                                            poRowObj?.po_number ||
                                            'N/A',
                                        },
                                        {
                                          label: t`Source System`,
                                          value: sourceSystemVal || 'N/A',
                                        },
                                        {
                                          label: t`Vendor Name`,
                                          value:
                                            poRowObj?.['Supplier'] ||
                                            poRowObj?.supplier ||
                                            resolvedAgentData?.['Extracted Invoice JSON']
                                              ?.invoice_header?.['Vendor Name'] ||
                                            formModel?.['Supplier Name'] ||
                                            formModel?.['Vendor Name'] ||
                                            selectedItem?.vendorName ||
                                            'N/A',
                                        },
                                        {
                                          label: t`Supplier ID`,
                                          value: supplierIdVal || 'N/A',
                                        },
                                        {
                                          label: t`PO Date`,
                                          value: poDateVal || 'N/A',
                                        },
                                        {
                                          label: t`Authorized Amount`,
                                          value: poAmountVal
                                            ? `${currencyVal} ${poAmountVal}`
                                            : agentData?.po_matching?.po_amount || 'N/A',
                                        },
                                        ...extraPoRowEntries.map(([k, v]) => ({
                                          label: String(k),
                                          value: String(v),
                                        })),
                                      ].map((item, idx) => {
                                        const isExpanded = !!expandedLedgerKeys[item.label]
                                        return (
                                          <div
                                            key={idx}
                                            onClick={() =>
                                              setExpandedLedgerKeys((prev) => ({
                                                ...prev,
                                                [item.label]: !prev[item.label],
                                              }))
                                            }
                                            className={cn(
                                              'group/card min-w-0 space-y-0.5 rounded-lg border border-[var(--gray-3)]/60 bg-surface/80 p-2.5 shadow-2xs transition-all cursor-pointer hover:border-[var(--primary-4)] hover:bg-surface hover:shadow-xs',
                                              isExpanded &&
                                              'col-span-2 sm:col-span-2 md:col-span-3 border-[var(--primary-4)] bg-surface shadow-xs',
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                'block w-full text-[11px] font-medium text-[var(--gray-10)] transition-all',
                                                isExpanded
                                                  ? 'whitespace-normal break-words'
                                                  : 'truncate group-hover/card:whitespace-normal group-hover/card:break-words',
                                              )}
                                            >
                                              {item.label}
                                            </span>
                                            <div
                                              className={cn(
                                                'block w-full text-xs font-semibold text-[var(--gray-13)] transition-all',
                                                isExpanded
                                                  ? 'whitespace-normal break-words'
                                                  : 'truncate group-hover/card:whitespace-normal group-hover/card:break-words',
                                              )}
                                            >
                                              {item.value}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>

                                  {/* Mapped PO Line Items from ERP / po_row */}
                                  {Array.isArray(poLineItemsMapped) && poLineItemsMapped.length > 0 && (
                                    <div className='space-y-2.5'>
                                      <div className='flex items-center justify-between'>
                                        <h4 className='text-xs font-semibold text-[var(--gray-12)] flex items-center gap-1.5'>
                                          <span>{t`ERP PO Line Items Mapped`}</span>
                                        </h4>
                                        <span className='inline-flex items-center gap-1 rounded-md border border-[var(--primary-3)] bg-[var(--primary-1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-10)]'>
                                          <Icon
                                            className='h-3 w-3 text-[var(--primary-9)] shrink-0'
                                            name='tabler:list-check'
                                          />
                                          <span>
                                            {poLineItemsMapped.length} {t`Line Items Mapped`}
                                          </span>
                                        </span>
                                      </div>
                                      <div className='overflow-x-auto rounded-xl border border-[var(--gray-2)] bg-surface'>
                                        <table className='w-full text-left text-xs border-collapse min-w-[700px]'>
                                          <thead>
                                            <tr className='border-b border-[var(--gray-2)] bg-[var(--gray-2)]/50 text-[11px] font-semibold text-[var(--gray-11)]'>
                                              <th className='px-3 py-2 w-12 text-center'>#</th>
                                              <th className='px-3 py-2'>{t`Material ID`}</th>
                                              <th className='px-3 py-2'>{t`Description`}</th>
                                              <th className='px-3 py-2'>{t`Material Group`}</th>
                                              <th className='px-3 py-2 text-center'>{t`Plant`}</th>
                                              <th className='px-3 py-2 text-center'>{t`Category`}</th>
                                              <th className='px-3 py-2 text-center'>{t`Qty / UOM`}</th>
                                              <th className='px-3 py-2 text-right'>{t`Unit Cost`}</th>
                                              <th className='px-3 py-2 text-right'>{t`Net Value`}</th>
                                            </tr>
                                          </thead>
                                          <tbody className='divide-y divide-[var(--gray-2)]'>
                                            {poLineItemsMapped.map((item: any, idx: number) => {
                                              const lineNo =
                                                item.Line ?? item['Item Number'] ?? item.item_no ?? idx + 1
                                              const matId =
                                                item['Material Id'] || item['Material ID'] || item.material_id || '-'
                                              const matDesc =
                                                item['Material Description'] ||
                                                item.Description ||
                                                item.description ||
                                                '-'
                                              const matGroup =
                                                item['Material Group'] || item.material_group || '-'
                                              const plant = item.Plant || item.plant || '-'
                                              const cat = item['Item Category'] || item.item_category || 'Standard'
                                              const qty = item.Quantity ?? item['Order Quantity'] ?? '-'
                                              const uom = item['Unit of Measure'] || item.uom || ''
                                              const price = item['Unit Cost'] ?? item['Net Price'] ?? '-'
                                              const priceUnit = item['Price Unit'] || '1'
                                              const extended = item.Extended ?? item['Net Value'] ?? item.amount ?? '-'

                                              return (
                                                <tr
                                                  key={idx}
                                                  className='hover:bg-[var(--gray-1)] transition-colors'
                                                >
                                                  <td className='px-3 py-2 text-center font-mono text-[11px] text-[var(--gray-10)]'>
                                                    {lineNo}
                                                  </td>
                                                  <td className='px-3 py-2 font-mono text-xs font-semibold text-[var(--primary-9)]'>
                                                    <span className='block w-full truncate max-w-[140px] hover:whitespace-normal hover:break-words transition-all'>
                                                      {matId}
                                                    </span>
                                                  </td>
                                                  <td className='px-3 py-2 font-medium text-[var(--gray-13)]'>
                                                    <span className='block w-full truncate max-w-[240px] hover:whitespace-normal hover:break-words transition-all'>
                                                      {matDesc}
                                                    </span>
                                                  </td>
                                                  <td className='px-3 py-2 text-[var(--gray-11)] text-[11px]'>
                                                    <span className='block w-full truncate max-w-[180px] hover:whitespace-normal hover:break-words transition-all'>
                                                      {matGroup}
                                                    </span>
                                                  </td>
                                                  <td className='px-3 py-2 text-center text-[var(--gray-12)] font-mono text-[11px]'>
                                                    {plant}
                                                  </td>
                                                  <td className='px-3 py-2 text-center text-[var(--gray-11)] text-[11px]'>
                                                    {cat}
                                                  </td>
                                                  <td className='px-3 py-2 text-center font-medium text-[var(--gray-13)]'>
                                                    {qty} {uom}
                                                  </td>
                                                  <td className='px-3 py-2 text-right font-medium text-[var(--gray-12)]'>
                                                    {price !== '-' ? `${currencyVal} ${price}` : '-'}
                                                    {priceUnit && priceUnit !== '1' && (
                                                      <span className='text-[10px] text-[var(--gray-10)] block'>
                                                        /{priceUnit}
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className='px-3 py-2 text-right font-bold text-[var(--gray-13)]'>
                                                    {extended !== '-' ? `${currencyVal} ${extended}` : '-'}
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )
                            })()}

                            {/* Side-by-Side Field Matching Table */}
                            {Array.isArray(
                              resolvedAgentData?.debug?.[
                              'Side-by-side Field Matching'
                              ],
                            ) &&
                              resolvedAgentData.debug[
                                'Side-by-side Field Matching'
                              ].length > 0 && (
                                <div className='space-y-2.5'>
                                  <div className='flex items-center justify-between'>
                                    <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                      {t`Field Matching`}
                                    </h4>
                                    <span className='inline-flex items-center gap-1 rounded-md border border-[var(--green-3)] bg-[var(--green-1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--green-10)]'>
                                      <Icon
                                        className='h-3 w-3 text-[var(--green-9)] shrink-0'
                                        name='tabler:circle-check'
                                      />
                                      <span>
                                        {
                                          resolvedAgentData.debug[
                                            'Side-by-side Field Matching'
                                          ].length
                                        }{' '}
                                        {t`Header Fields Checked`}
                                      </span>
                                    </span>
                                  </div>
                                  <div className='overflow-hidden rounded-xl border border-[var(--gray-2)] bg-surface'>
                                    <table className='w-full text-left text-xs border-collapse'>
                                      <thead>
                                        <tr className='border-b border-[var(--gray-2)] bg-[var(--gray-2)]/50 text-[11px] font-semibold text-[var(--gray-11)]'>
                                          <th className='px-3 py-2'>{t`Field`}</th>
                                          <th className='px-3 py-2'>{t`Invoice Value`}</th>
                                          <th className='px-3 py-2'>{t`PO Value`}</th>
                                          <th className='px-3 py-2 text-right'>{t`Score`}</th>
                                        </tr>
                                      </thead>
                                      <tbody className='divide-y divide-[var(--gray-2)]'>
                                        {resolvedAgentData.debug[
                                          'Side-by-side Field Matching'
                                        ].map((row: any, idx: number) => (
                                          <tr
                                            key={idx}
                                            className='hover:bg-[var(--gray-1)] transition-colors'
                                          >
                                            <td className='px-3 py-2 font-medium text-[var(--gray-13)]'>
                                              {row.Field}
                                            </td>
                                            <td className='px-3 py-2 text-[var(--gray-12)]'>
                                              {String(row['Invoice Value'] ?? '-')}
                                            </td>
                                            <td className='px-3 py-2 text-[var(--gray-12)]'>
                                              {String(row['PO Value'] ?? '-')}
                                            </td>
                                            <td className='px-3 py-2 text-right'>
                                              <span
                                                className={cn(
                                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                                  Number(row.Score) >= 100
                                                    ? 'bg-[var(--green-2)] text-[var(--green-9)] border border-[var(--green-3)]'
                                                    : Number(row.Score) >= 80
                                                      ? 'bg-[var(--amber-2)] text-[var(--amber-9)] border border-[var(--amber-3)]'
                                                      : 'bg-[var(--red-2)] text-[var(--red-9)] border border-[var(--red-3)]',
                                                )}
                                              >
                                                {row.Score}%
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                            {/* Side-by-Side Line Item Matching Table */}
                            {Array.isArray(
                              resolvedAgentData?.debug?.[
                              'Side-by-side Line Item matching'
                              ],
                            ) &&
                              resolvedAgentData.debug[
                                'Side-by-side Line Item matching'
                              ].length > 0 && (
                                <div className='space-y-2.5'>
                                  <div className='flex items-center justify-between'>
                                    <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                      {t`Line Item Matching`}
                                    </h4>
                                    <span className='inline-flex items-center gap-1 rounded-md border border-[var(--green-3)] bg-[var(--green-1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--green-10)]'>
                                      <Icon
                                        className='h-3 w-3 text-[var(--green-9)] shrink-0'
                                        name='tabler:circle-check'
                                      />
                                      <span>
                                        {
                                          resolvedAgentData.debug[
                                            'Side-by-side Line Item matching'
                                          ].length
                                        }{' '}
                                        {t`Line Items Verified`}
                                      </span>
                                    </span>
                                  </div>
                                  <div className='overflow-hidden rounded-xl border border-[var(--gray-2)] bg-surface'>
                                    <table className='w-full text-left text-xs border-collapse'>
                                      <thead>
                                        <tr className='border-b border-[var(--gray-2)] bg-[var(--gray-2)]/50 text-[11px] font-semibold text-[var(--gray-11)]'>
                                          <th className='px-3 py-2'>{t`Item Description`}</th>
                                          <th className='px-3 py-2 text-center'>{t`Quantity (Inv / PO)`}</th>
                                          <th className='px-3 py-2 text-right'>{t`Unit Price (Inv / PO)`}</th>
                                          <th className='px-3 py-2 text-right'>{t`Total Amount (Inv / PO)`}</th>
                                          <th className='px-3 py-2 text-right'>{t`Line Score`}</th>
                                        </tr>
                                      </thead>
                                      <tbody className='divide-y divide-[var(--gray-2)]'>
                                        {resolvedAgentData.debug[
                                          'Side-by-side Line Item matching'
                                        ].map((line: any, idx: number) => (
                                          <tr
                                            key={idx}
                                            className='hover:bg-[var(--gray-1)] transition-colors'
                                          >
                                            <td className='px-3 py-2 font-medium text-[var(--gray-13)]'>
                                              <div>
                                                {line.Description?.[
                                                  'Invoice Value'
                                                ] || 'N/A'}
                                              </div>
                                              {line.Description?.['PO Value'] &&
                                                line.Description?.['PO Value'] !==
                                                line.Description?.['Invoice Value'] && (
                                                  <div className='text-[10px] text-[var(--gray-10)]'>
                                                    PO: {line.Description['PO Value']}
                                                  </div>
                                                )}
                                            </td>
                                            <td className='px-3 py-2 text-center text-[var(--gray-12)] font-medium'>
                                              {line.Quantity?.['Invoice Value']} /{' '}
                                              {line.Quantity?.['PO Value']}
                                            </td>
                                            <td className='px-3 py-2 text-right text-[var(--gray-12)] font-medium'>
                                              ${line.Price?.['Invoice Value']} / $
                                              {line.Price?.['PO Value']}
                                            </td>
                                            <td className='px-3 py-2 text-right text-[var(--gray-12)] font-medium'>
                                              ${line.Amount?.['Invoice Value']} / $
                                              {line.Amount?.['PO Value']}
                                            </td>
                                            <td className='px-3 py-2 text-right'>
                                              <span
                                                className={cn(
                                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                                  Number(line['Line Score']) >= 100
                                                    ? 'bg-[var(--green-2)] text-[var(--green-9)] border border-[var(--green-3)]'
                                                    : 'bg-[var(--amber-2)] text-[var(--amber-9)] border border-[var(--amber-3)]',
                                                )}
                                              >
                                                {line['Line Score']}%
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'duplicate_check' && (
                        <DetailReportView
                          icon={Layers}
                          title={t`Duplicate Payment Check`}
                          status={localizeRequestStatus(
                            i18n,
                            resolvedAgentData?.duplicate_check?.status ||
                            (resolvedAgentData?.invoice_errors?.severity ===
                              'NONE'
                              ? 'No Duplicate'
                              : 'No Duplicate'),
                          )}
                          statusType={
                            resolvedAgentData?.duplicate_check?.status ===
                              'Duplicate'
                              ? 'danger'
                              : 'success'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Historical Match & Integrity Results`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Cross-Check Status`}
                                  </span>
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      resolvedAgentData?.duplicate_check?.status ===
                                        'Duplicate'
                                        ? 'text-[var(--red-9)]'
                                        : 'text-[var(--green-9)]',
                                    )}
                                  >
                                    {resolvedAgentData?.duplicate_check?.status ||
                                      'Passed (No Duplicates)'}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Error Severity`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.invoice_errors?.severity ||
                                      'NONE'}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Invoice Ref`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.['Extracted Invoice JSON']
                                      ?.invoice_header?.['Invoice No'] ||
                                      formModel?.['Invoice Number'] ||
                                      formModel?.['Invoice No'] ||
                                      selectedItem?.invoiceNumber ||
                                      'N/A'}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Vendor Name`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.['Extracted Invoice JSON']
                                      ?.invoice_header?.['Vendor Name'] ||
                                      resolvedAgentData?.po_row?.Supplier ||
                                      formModel?.['Supplier Name'] ||
                                      formModel?.['Vendor Name'] ||
                                      selectedItem?.vendorName ||
                                      'N/A'}
                                  </span>
                                </div>
                                <div className='flex flex-col gap-1.5 pt-1'>
                                  <div className='flex items-center gap-1.5'>
                                    <AiBrandIcon className='size-[14px] shrink-0' />
                                    <span className='font-medium text-[var(--gray-11)]'>
                                      {t`AI Insight`}
                                    </span>
                                  </div>
                                  <span className='leading-normal font-medium text-[var(--gray-13)]'>
                                    {resolvedAgentData?.duplicate_check?.message ||
                                      resolvedAgentData?.duplicate_check?.ai_insight ||
                                      'No duplicate records found in historical ERP database.'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Security & Auditing Policy`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-11)]'>
                                  {t`Double-payment prevention checks analyze historical invoices by combining:`}
                                </p>
                                <ul className='list-disc space-y-1.5 pl-4 text-[var(--gray-11)]'>
                                  <li>{t`Supplier tax identity and banking details.`}</li>
                                  <li>{t`Exact Invoice Number string similarity.`}</li>
                                  <li>{t`Grand Total and individual line-item value mapping.`}</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'supplier_verification' && (
                        <DetailReportView
                          icon={Store}
                          title={t`Supplier Verification Registry`}
                          status={localizeRequestStatus(
                            i18n,
                            resolvedAgentData?.supplier_validation?.status ||
                            supplierCheckState.data?.status ||
                            'Verified',
                          )}
                          statusType={
                            resolvedAgentData?.supplier_validation?.status ===
                              'ACTIVE' ||
                              supplierCheckState.data?.statusType === 'success'
                              ? 'success'
                              : 'warning'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Supplier Details`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Vendor Name`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.supplier_validation
                                      ?.vendor_master_match ||
                                      resolvedAgentData?.po_row?.Supplier ||
                                      resolvedAgentData?.['Extracted Invoice JSON']
                                        ?.invoice_header?.['Vendor Name'] ||
                                      'Steel & More Inc.'}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Supplier Status`}
                                  </span>
                                  <span className='font-semibold text-[var(--green-9)]'>
                                    {resolvedAgentData?.supplier_validation
                                      ?.status || 'ACTIVE'}
                                  </span>
                                </div>
                                <div className='flex flex-col gap-1 border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Verification Rationale`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.supplier_validation
                                      ?.validation_details?.reason ||
                                      supplierCheckState.data?.value ||
                                      'Invoice vendor matches PO vendor.'}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Mismatches`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.supplier_validation
                                      ?.mismatch?.length || 0}{' '}
                                    {t`Mismatches Found`}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Registry Verification Log`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-12)]'>
                                  {t`Verification checks supplier address registry, bank details, and business license status against corporate supplier directories and compliance watchlists.`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'gl_matching' && (
                        <DetailReportView
                          icon={ListFilter}
                          title={t`GL Account Matching Report`}
                          status={localizeRequestStatus(
                            i18n,
                            glValidationDisplay?.status || 'Not Available',
                          )}
                          statusType={
                            glValidationDisplay?.statusType || 'default'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-2 gap-4'>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Suggested Allocation`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Matched GL Account`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {glValidationDisplay?.account ||
                                      'No account matched'}
                                  </span>
                                </div>
                                {(resolvedAgentData?.gl_validation?.reason ||
                                  resolvedAgentData?.gl_matching?.reason) && (
                                    <div className='mt-1 flex flex-col gap-1 border-t border-[var(--gray-2)] pt-2'>
                                      <span className='font-medium text-[var(--gray-11)]'>
                                        Matching Rationale
                                      </span>
                                      <span className='leading-normal font-medium text-[var(--gray-12)]'>
                                        {resolvedAgentData?.gl_validation?.reason ||
                                          resolvedAgentData?.gl_matching?.reason}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                Allocation Rules
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-11)]'>
                                  GL matching translates plain-text line-item
                                  descriptions into numerical corporate
                                  chart-of-account segments based on historical
                                  vendor spend patterns and machine learning
                                  classifications.
                                </p>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'payment_terms' && (
                        <DetailReportView
                          icon={Calendar}
                          title={t`Payment Terms Analysis`}
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Payment Deadlines & Terms`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2 items-center'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Payment Terms`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.payment_terms?.raw ||
                                      resolvedAgentData?.[
                                        'Extracted Invoice JSON'
                                      ]?.invoice_header?.TERMS ||
                                      paymentTermsDisplay.termsDisplay}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2 items-center'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`SAP Invoice Status`}
                                  </span>
                                  <span
                                    className={cn(
                                      'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold',
                                      getStatusBorderStyles(isRequestCompleted ? 'success' : 'info'),
                                    )}
                                  >
                                    {isRequestCompleted
                                      ? agentData?.sapInvoiceStatus ||
                                      agentData?.sap_invoice_status ||
                                      'Paid'
                                      : agentData?.sapInvoiceStatus ||
                                      agentData?.sap_invoice_status ||
                                      agentData?.po_row?.sap_invoice_status ||
                                      agentData?.po_row?.['SAP Invoice Status'] ||
                                      'Follow-On Documents'}
                                  </span>
                                </div>
                                {!isRequestCompleted && (
                                  <div className='flex justify-between border-b border-[var(--gray-2)] pb-2 items-center'>
                                    <span className='font-medium text-[var(--gray-11)]'>
                                      {t`Days`}
                                    </span>
                                    <span
                                      className={cn(
                                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold',
                                        getStatusBorderStyles(paymentTermsDisplay.statusType),
                                      )}
                                    >
                                      {paymentTermsDisplay.daysText
                                        ? paymentTermsDisplay.daysText.replace(/days/i, 'Days')
                                        : '0 Days'}
                                    </span>
                                  </div>
                                )}
                                {isRequestCompleted && (
                                  <div className='flex justify-between border-b border-[var(--gray-2)] pb-2 items-center'>
                                    <span className='font-medium text-[var(--gray-11)]'>
                                      {t`ERP System`}
                                    </span>
                                    <span className='inline-flex items-center rounded-md border border-[var(--purple-3)] bg-[var(--purple-1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--purple-9)]'>
                                      {formatErpSystem(
                                        agentData?.erpSystem ||
                                        (agentData?.poMasterSourceType === 'quickbooks'
                                          ? 'QuickBooks'
                                          : resolvedAgentData?.source_type || 'SAP'),
                                      )}
                                    </span>
                                  </div>
                                )}
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2 items-center'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Invoice Date`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.payment_terms?.invoice_date ||
                                      resolvedAgentData?.[
                                        'Extracted Invoice JSON'
                                      ]?.invoice_header?.['Invoice Date'] ||
                                      formModel?.['Invoice Date'] ||
                                      selectedItem?.invoiceDate ||
                                      'N/A'}
                                  </span>
                                </div>
                                {isRequestCompleted ? (
                                  <div className='flex justify-between items-center'>
                                    <span className='font-medium text-[var(--gray-11)]'>
                                      {t`Paid Date`}
                                    </span>
                                    <span className='font-semibold text-[var(--gray-13)]'>
                                      {agentData?.payment_date ||
                                        agentData?.paymentDate ||
                                        (selectedItem?.completedAtUtc
                                          ? dayjs(selectedItem.completedAtUtc).format('YYYY-MM-DD')
                                          : selectedItem?.completedAt
                                            ? dayjs(selectedItem.completedAt).format('YYYY-MM-DD')
                                            : agentData?.completedAt
                                              ? dayjs(agentData.completedAt).format('YYYY-MM-DD')
                                              : dayjs().format('YYYY-MM-DD'))}
                                    </span>
                                  </div>
                                ) : (
                                  <div className='flex justify-between items-center'>
                                    <span className='font-medium text-[var(--gray-11)]'>
                                      {t`Due Date`}
                                    </span>
                                    <span className='font-semibold text-[var(--gray-13)]'>
                                      {resolvedAgentData?.payment_terms?.due_date ||
                                        resolvedAgentData?.[
                                          'Extracted Invoice JSON'
                                        ]?.invoice_header?.['Due Date'] ||
                                        extractDueDate(
                                          selectedItem,
                                          agentData,
                                          formModel,
                                        )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {isRequestCompleted
                                  ? t`Payment Completion Insights`
                                  : t`Deadlines & Penalty Insights`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-12)]'>
                                  {isRequestCompleted
                                    ? t`Invoice payment has been successfully processed and synced with ERP database (${agentData?.erpSystem || (agentData?.poMasterSourceType === 'quickbooks' ? 'QuickBooks' : 'SAP')}). No outstanding balance or late penalties remain.`
                                    : t`Payment terms are verified by cross-referencing values extracted from invoice headers against agreed vendor contract parameters. Late fees may apply if settlement exceeds due date boundaries.`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'matter_validation' && (
                        <DetailReportView
                          icon={Briefcase}
                          title={t`Legal Matter Association Check`}
                          status={localizeRequestStatus(
                            i18n,
                            resolvedAgentData?.matter_validation?.status ||
                            matterValidationDisplay?.status ||
                            'NOT_PRESENT',
                          )}
                          statusType={
                            resolvedAgentData?.matter_validation?.status ===
                              'VALID' ||
                              resolvedAgentData?.matter_validation?.status ===
                              'MATCHED'
                              ? 'success'
                              : 'warning'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Associated Entity`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Matter Reference`}
                                  </span>
                                  <span className='font-semibold text-[var(--gray-13)]'>
                                    {resolvedAgentData?.matter_validation
                                      ?.matter_id || 'Not Present'}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-2)] pb-2'>
                                  <span className='font-medium text-[var(--gray-11)]'>
                                    {t`Needs Manual Entry`}
                                  </span>
                                  <span className='font-semibold text-[var(--amber-9)]'>
                                    {resolvedAgentData?.matter_validation
                                      ?.needs_manual_entry
                                      ? t`Yes`
                                      : t`No`}
                                  </span>
                                </div>
                                {resolvedAgentData?.matter_validation
                                  ?.validation_details?.reason && (
                                    <div className='mt-1 flex flex-col gap-1 border-t border-[var(--gray-2)] pt-2'>
                                      <span className='font-medium text-[var(--gray-11)]'>
                                        {t`Compliance Note`}
                                      </span>
                                      <span className='text-[11px] leading-normal font-medium text-[var(--gray-12)]'>
                                        {
                                          resolvedAgentData.matter_validation
                                            .validation_details.reason
                                        }
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                            <div className='space-y-3'>
                              <h4 className='text-xs font-semibold text-[var(--gray-12)]'>
                                {t`Matter Validation Rules`}
                              </h4>
                              <div className='space-y-2.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-2)]/50 p-3.5 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-11)]'>
                                  {t`Corporate legal invoices are checked for compliance against corporate billing guidelines, valid client matter IDs, and active legal budgets.`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'back_order' && (
                        <div className='animate-in fade-in slide-in-from-bottom-2 flex min-h-0 flex-1 flex-col bg-surface duration-300'>
                          {/* Header */}
                          <div className='flex shrink-0 items-center justify-between border-b border-[var(--gray-2)] bg-[var(--gray-1)] px-4 py-2.5'>
                            <div className='flex items-center gap-2.5'>
                              <button
                                className='group flex items-center gap-1 text-xs font-semibold text-[var(--gray-11)] transition-all hover:text-[var(--gray-13)] active:scale-95'
                                onClick={() => setActiveDetailView(null)}
                              >
                                <Icon
                                  className='h-4 w-4 transition-transform group-hover:-translate-x-0.5'
                                  name='tabler:arrow-left'
                                />
                                <span>{t`Back`}</span>
                              </button>
                              <div className='mx-1 h-4 w-[1px] bg-[var(--gray-2)]' />
                              <div className='flex items-center gap-2'>
                                <div className='rounded-md border border-[var(--orange-3)] bg-[var(--orange-1)] p-1 text-[var(--orange-9)]'>
                                  <Icon
                                    className='h-4 w-4'
                                    name='tabler:list-check'
                                  />
                                </div>
                                <h3 className='text-sm font-semibold text-[var(--gray-13)]'>
                                  {t`PO Line Items vs Invoices`}
                                </h3>
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              {/* Recommendation badge in header */}
                              {(() => {
                                const currentRec =
                                  activeBackOrderTab === 'current'
                                    ? backOrder?.recommendation
                                    : MOCK_PREVIOUS_BACKORDERS[
                                      activeBackOrderTab
                                    ]?.recommendation
                                const recMeta =
                                  getRecommendationMeta(currentRec)
                                return (
                                  <span
                                    className={cn(
                                      'mr-2 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold shadow-xs',
                                      recMeta.chip,
                                    )}
                                  >
                                    <Icon
                                      className='h-3 w-3 animate-pulse'
                                      name={recMeta.icon}
                                    />
                                    {recMeta.label}
                                  </span>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Sub-header with active tabs */}
                          <div className='flex shrink-0 items-center gap-4 border-b border-[var(--gray-2)] bg-[var(--gray-1)] px-4'>
                            <div className='flex items-center gap-4'>
                              {/* Current Invoice tab */}
                              <button
                                className={cn(
                                  '-mb-[1px] border-b-2 px-1 pt-2 pb-2 text-xs font-semibold transition-all',
                                  activeBackOrderTab === 'current'
                                    ? 'border-[var(--teal-9)] font-bold text-[var(--teal-9)]'
                                    : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
                                )}
                                onClick={() => setActiveBackOrderTab('current')}
                              >
                                INV-4402 (Current)
                              </button>
                              {/* Previous tickets mapped as tabs */}
                              {backOrder?.previous_id?.map((prevId: string) => (
                                <button
                                  key={prevId}
                                  className={cn(
                                    '-mb-[1px] border-b-2 px-1 pt-2 pb-2 text-xs font-semibold transition-all',
                                    activeBackOrderTab === prevId
                                      ? 'border-[var(--teal-9)] font-bold text-[var(--teal-9)]'
                                      : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
                                  )}
                                  onClick={() => setActiveBackOrderTab(prevId)}
                                >
                                  INV-4401 ({prevId})
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Metrics Summary Row - 4 equal columns split by lines */}
                          {(() => {
                            const currentData =
                              activeBackOrderTab === 'current'
                                ? backOrder
                                : MOCK_PREVIOUS_BACKORDERS[
                                activeBackOrderTab
                                ] || {}
                            const items = currentData?.missing_qty_by_item || []

                            const currencySymbol =
                              agentData?.po_row?.Currency || '$'
                            const invoiceAmount = items.reduce(
                              (sum: number, r: any) =>
                                sum + (r.invoice_qty || 0) * (r.price || 0),
                              0,
                            )
                            const linesReceivedCount = items.filter(
                              (r: any) => (r.invoice_qty || 0) > 0,
                            ).length
                            const totalLines = items.length
                            const pendingItemsCount = items.filter(
                              (r: any) => (r.remaining || 0) > 0,
                            ).length
                            const stillPendingVal = items.reduce(
                              (sum: number, r: any) =>
                                sum + (r.remaining || 0) * (r.price || 0),
                              0,
                            )

                            return (
                              <div className='grid shrink-0 grid-cols-4 divide-x divide-[var(--gray-2)] border-b border-[var(--gray-2)] bg-surface text-xs'>
                                <div className='space-y-0.5 p-3'>
                                  <p className='text-[11px] font-medium text-[var(--gray-10)]'>
                                    {t`Invoice Amount`}
                                  </p>
                                  <p className='text-sm font-bold text-[var(--gray-13)]'>
                                    {currencySymbol}
                                    {invoiceAmount.toFixed(2)}
                                  </p>
                                </div>
                                <div className='space-y-0.5 p-3'>
                                  <p className='text-[11px] font-medium text-[var(--gray-10)]'>
                                    {t`Lines Received`}
                                  </p>
                                  <p className='text-sm font-bold text-[var(--teal-9)]'>
                                    {linesReceivedCount} of {totalLines}
                                  </p>
                                </div>
                                <div className='space-y-0.5 p-3'>
                                  <p className='text-[11px] font-medium text-[var(--gray-10)]'>
                                    {t`Pending Items`}
                                  </p>
                                  <p className='text-sm font-bold text-[var(--orange-9)]'>
                                    {pendingItemsCount} item
                                    {pendingItemsCount === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <div className='space-y-0.5 p-3'>
                                  <p className='text-[11px] font-medium text-[var(--gray-10)]'>
                                    {t`Still Pending`}
                                  </p>
                                  <p className='text-sm font-bold text-[var(--orange-9)]'>
                                    {currencySymbol}
                                    {stillPendingVal.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Main Content Area */}
                          <div className='scrollbar flex-1 space-y-4 overflow-y-auto bg-[var(--gray-1)] p-4'>
                            {/* Status/Explanation banner */}
                            {(() => {
                              const currentData =
                                activeBackOrderTab === 'current'
                                  ? backOrder
                                  : MOCK_PREVIOUS_BACKORDERS[
                                  activeBackOrderTab
                                  ] || {}

                              return (
                                <div className='animate-in fade-in slide-in-from-top-2 rounded-xl border border-[var(--orange-3)] bg-[var(--orange-1)]/30 p-3.5 shadow-xs duration-300'>
                                  <div className='flex items-start gap-3'>
                                    <div className='mt-0.5 shrink-0 rounded bg-[var(--orange-2)] p-1.5 text-[var(--orange-9)]'>
                                      <Icon
                                        className='h-4 w-4'
                                        name='tabler:info-circle'
                                      />
                                    </div>
                                    <div className='space-y-1'>
                                      <h4 className='text-xs font-semibold text-[var(--orange-10)]'>
                                        {activeBackOrderTab === 'current'
                                          ? t`Current Invoice Back Order Status`
                                          : t`Prior Ticket ${activeBackOrderTab} Details`}
                                      </h4>
                                      <p className='text-xs leading-relaxed font-medium text-[var(--gray-12)]'>
                                        {currentData?.reason}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}

                            {/* Items Table */}
                            {(() => {
                              const currentData =
                                activeBackOrderTab === 'current'
                                  ? backOrder
                                  : MOCK_PREVIOUS_BACKORDERS[
                                  activeBackOrderTab
                                  ] || {}

                              const items =
                                currentData?.missing_qty_by_item || []
                              const currencySymbol =
                                agentData?.po_row?.Currency || '$'

                              // Totals
                              const totalRemaining = items.reduce(
                                (sum: number, r: any) =>
                                  sum + (r.remaining || 0),
                                0,
                              )
                              const totalInvoiceAmt = items.reduce(
                                (sum: number, r: any) =>
                                  sum + (r.invoice_qty || 0) * (r.price || 0),
                                0,
                              )

                              return (
                                <div className='animate-in fade-in overflow-hidden rounded-xl border border-[var(--gray-2)] bg-surface shadow-xs duration-300'>
                                  <div className='overflow-x-auto'>
                                    <table className='w-full border-collapse text-left text-xs'>
                                      <thead className='border-b border-[var(--gray-2)] bg-[var(--gray-1)]'>
                                        <tr className='text-[11px] font-semibold text-[var(--gray-11)]'>
                                          <th className='px-3 py-2.5'>
                                            {t`Line Item`}
                                          </th>
                                          <th className='px-3 py-2.5 text-center'>
                                            {t`PO Qty`}
                                          </th>
                                          <th className='px-3 py-2.5 text-center'>
                                            {t`Recv Qty`}
                                          </th>
                                          <th className='px-3 py-2.5 text-center'>
                                            {t`Balance Qty`}
                                          </th>
                                          <th className='px-3 py-2.5 text-right'>
                                            {t`Inv Amount`}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className='divide-y divide-[var(--gray-2)] bg-surface'>
                                        {items.map((row: any) => {
                                          const desc =
                                            row.description?.trim() ||
                                            'Unmapped item'
                                          const invQty = row.invoice_qty ?? 0
                                          const poQty = row.po_qty ?? 1
                                          const price = row.price ?? 0
                                          const receivedVal = invQty * price
                                          const remaining = row.remaining ?? 0

                                          // Dynamic percent calculation
                                          const totalReceived =
                                            poQty - remaining
                                          const pct = Math.max(
                                            0,
                                            Math.min(
                                              100,
                                              Math.round(
                                                (totalReceived / poQty) * 100,
                                              ),
                                            ),
                                          )

                                          return (
                                            <tr
                                              className='transition-colors hover:bg-[var(--gray-1)]/50'
                                              key={`${row.po_line_id || 'line'}-${desc}`}
                                            >
                                              <td className='flex items-center gap-3.5 px-4 py-3 font-semibold text-[var(--gray-13)]'>
                                                {/* Circular Progress Badge */}
                                                <div
                                                  className={cn(
                                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-black transition-colors',
                                                    getPctColorClass(pct),
                                                  )}
                                                >
                                                  {pct}%
                                                </div>
                                                <div>
                                                  <div className='text-xs font-bold text-[var(--gray-13)]'>
                                                    {desc}
                                                  </div>
                                                  <div className='mt-0.5 text-[10px] font-medium text-[var(--gray-9)]'>
                                                    PO Line:{' '}
                                                    {row.po_line_id || '—'} •
                                                    Price: {currencySymbol}
                                                    {price.toFixed(2)}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className='px-4 py-3 text-center font-bold text-[var(--gray-13)]'>
                                                {poQty}
                                              </td>
                                              <td
                                                className={cn(
                                                  'px-4 py-3 text-center font-bold',
                                                  invQty > 0
                                                    ? 'text-[var(--teal-9)]'
                                                    : 'font-medium text-[var(--gray-9)]',
                                                )}
                                              >
                                                {invQty > 0 ? invQty : '—'}
                                              </td>
                                              <td className='px-4 py-3 text-center font-bold'>
                                                {remaining > 0 ? (
                                                  <span className='text-[var(--orange-9)]'>
                                                    {remaining} pending
                                                  </span>
                                                ) : (
                                                  <span className='text-[var(--gray-11)]'>
                                                    0
                                                  </span>
                                                )}
                                              </td>
                                              <td
                                                className={cn(
                                                  'px-4 py-3 text-right font-bold',
                                                  receivedVal > 0
                                                    ? 'text-[var(--teal-10)]'
                                                    : 'font-medium text-[var(--gray-9)]',
                                                )}
                                              >
                                                {receivedVal > 0
                                                  ? `${currencySymbol}${receivedVal.toFixed(2)}`
                                                  : '—'}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                      <tfoot className='border-t border-[var(--gray-2)] bg-[var(--gray-1)] text-[11px] font-semibold text-[var(--gray-11)]'>
                                        <tr className='h-11'>
                                          <td className='px-4 py-3 font-medium'>
                                            {items.length} line items
                                          </td>
                                          <td
                                            className='px-4 py-3'
                                            colSpan={2}
                                          />
                                          <td className='px-4 py-3 text-center font-bold text-[var(--orange-10)]'>
                                            Total pending qty:{' '}
                                            <span className='underline decoration-[var(--orange-4)] decoration-2 underline-offset-4'>
                                              {totalRemaining}
                                            </span>
                                          </td>
                                          <td className='px-4 py-3 text-right font-black text-[var(--gray-13)]'>
                                            Inv total: {currencySymbol}
                                            {totalInvoiceAmt.toFixed(2)}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {activeTab === 'summary' && (
                        <div className='grid flex-1 grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto p-4'>
                          {!formModel ||
                            Object.keys(formModel).length === 0 ||
                            !Object.values(formModel).some(
                              hasMeaningfulScalarValue,
                            )
                            ? [
                              'Supplier Name',
                              'Invoice Number',
                              'Invoice Date',
                              'Invoice Amount',
                              'PO Number',
                              'Payment Terms',
                              'Currency',
                              'Tax Amount',
                            ].map((label) => (
                              <FormCard
                                fieldKey={label}
                                icon={getFieldIcon(label)}
                                isLoading={isCurrentlyProcessing}
                                key={label}
                                label={localizeRequestFieldLabel(i18n, label)}
                                missing={isKanbanMissingMatch(
                                  kanbanMissingFieldIds,
                                  label,
                                )}
                                options={getOptions(label)}
                                poValue={getFieldPoValue(label)}
                                poSourceLabel={poSourceLabel}
                                type={getFieldType(label)}
                                value={'-'}
                                onChange={(newVal: string) =>
                                  handleFieldChange(label, newVal)
                                }
                                onFocus={(val: any) =>
                                  handleFieldFocus(val, label)
                                }
                              />
                            ))
                            : Object.entries(formModel || {})
                              .filter(([key, val]) => {
                                if (typeof val === 'object' && val !== null) {
                                  if ('Invoice Value' in val) {
                                    return true
                                  }
                                  return false
                                }
                                if (typeof val === 'string') {
                                  const trimmed = val.trim()
                                  if (
                                    trimmed.startsWith('[') &&
                                    trimmed.endsWith(']')
                                  )
                                    return false
                                  if (
                                    trimmed.startsWith('{') &&
                                    trimmed.endsWith('}')
                                  )
                                    return false
                                }

                                if (
                                  !allowedLabels ||
                                  allowedLabels.size === 0
                                ) {
                                  return (
                                    hasMeaningfulScalarValue(val) ||
                                    isKanbanMissingMatch(
                                      kanbanMissingFieldIds,
                                      key,
                                    )
                                  )
                                }

                                return (
                                  allowedLabels.has(key) ||
                                  hasMeaningfulScalarValue(val) ||
                                  isKanbanMissingMatch(
                                    kanbanMissingFieldIds,
                                    key,
                                  )
                                )
                              })
                              .map(([key, val]) => {
                                const rawVal =
                                  val &&
                                    typeof val === 'object' &&
                                    'Invoice Value' in val
                                    ? val['Invoice Value']
                                    : val

                                const fieldType = getFieldType(key)
                                let displayValue =
                                  fieldType === 'date' &&
                                    (rawVal === null ||
                                      rawVal === undefined ||
                                      rawVal === '' ||
                                      rawVal === '-')
                                    ? null
                                    : rawVal || '-'

                                if (
                                  typeof displayValue === 'string' &&
                                  (key.toLowerCase().includes('invoice no') ||
                                    key.toLowerCase().includes('invoice number'))
                                ) {
                                  displayValue = displayValue
                                    .replace(/\s*PO\s*(Number|No|num|#)?:?\s*\d+/gi, '')
                                    .trim()
                                }

                                return (
                                  <FormCard
                                    fieldKey={key}
                                    icon={getFieldIcon(key)}
                                    key={key}
                                    missing={isKanbanMissingMatch(
                                      kanbanMissingFieldIds,
                                      key,
                                    )}
                                    options={getOptions(key)}
                                    poValue={getFieldPoValue(key)}
                                    poSourceLabel={poSourceLabel}
                                    score={getFieldScore(key)}
                                    type={fieldType}
                                    value={displayValue}
                                    highlight={(() => {
                                      const normalized = key.toLowerCase()
                                      if (normalized.includes('due date'))
                                        return false
                                      return (
                                        normalized.includes('total') ||
                                        normalized === 'due' ||
                                        normalized.includes('total due')
                                      )
                                    })()}
                                    invoiceValue={
                                      getFieldInvoiceValue(key) ??
                                      displayValue
                                    }
                                    isLoading={
                                      isCurrentlyProcessing &&
                                      (displayValue === null ||
                                        displayValue === undefined ||
                                        displayValue === '' ||
                                        displayValue === '-')
                                    }
                                    label={localizeRequestFieldLabel(
                                      i18n,
                                      key,
                                    )}
                                    onChange={(newVal: string) =>
                                      handleFieldChange(key, newVal)
                                    }
                                    onFocus={(val: any) =>
                                      handleFieldFocus(val, key)
                                    }
                                  />
                                )
                              })}
                        </div>
                      )}
                      {activeTab === 'line_items' && (
                        <div className='flex-1 space-y-6 overflow-y-auto p-4'>
                          {/* PO Line Items Section */}
                          {poLineItems.length > 0 && (
                            <div className='space-y-2.5'>
                              <div className='flex items-center justify-between'>
                                <h4 className='flex items-center gap-1.5 text-xs font-bold tracking-tight text-[var(--gray-13)]'>
                                  <Icon
                                    className='h-4 w-4 text-[var(--orange-9)]'
                                    name='tabler:shopping-cart'
                                  />
                                  {t`PO Line Items`} ({poLineItems.length})
                                </h4>
                              </div>
                              <div className='relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface'>
                                <div
                                  className='h-full w-full overflow-x-auto overflow-y-hidden'
                                  ref={poScrollContainerRef}
                                  onScroll={updatePoScrollEdges}
                                >
                                  <LineItemTable
                                    agentData={agentData}
                                    atEnd={poAtEnd}
                                    currentScoreWidth={0}
                                    dynamicColumns={poDynamicColumns}
                                    dynamicWidths={poDynamicWidths}
                                    formModel={formModel}
                                    handleFieldFocus={handleFieldFocus}
                                    hasAnyScore={false}
                                    hideFooter={true}
                                    isDynamicTable={true}
                                    lineItems={poLineItems}
                                    skeletonRows={skeletonRows}
                                    handleLineItemChange={
                                      handlePoLineItemChange
                                    }
                                    isCurrentlyProcessing={
                                      isCurrentlyProcessing
                                    }
                                    LINE_ITEM_ACTION_WIDTH={
                                      LINE_ITEM_ACTION_WIDTH
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Invoice Line Items Section */}
                          <div
                            className={cn(
                              'space-y-2.5',
                              poLineItems.length > 0 &&
                              'border-t border-[var(--gray-3)] pt-4',
                            )}
                          >
                            <div className='flex items-center justify-between'>
                              <h4 className='flex items-center gap-1.5 text-xs font-bold tracking-tight text-[var(--gray-13)]'>
                                <Icon
                                  className='h-4 w-4 text-[var(--primary-9)]'
                                  name='tabler:file-invoice'
                                />
                                {t`Invoice Line Items`} ({lineItems.length})
                              </h4>
                            </div>
                            <div className='relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface'>
                              <div
                                className='h-full w-full overflow-x-auto overflow-y-hidden'
                                ref={scrollContainerRef}
                                onScroll={updateScrollEdges}
                              >
                                <LineItemTable
                                  agentData={agentData}
                                  atEnd={atEnd}
                                  compareLines={poLineItems}
                                  currentScoreWidth={currentScoreWidth}
                                  dynamicColumns={dynamicColumns}
                                  dynamicWidths={dynamicWidths}
                                  formModel={formModel}
                                  handleAddItem={handleAddItem}
                                  handleFieldFocus={handleFieldFocus}
                                  handleLineItemChange={handleLineItemChange}
                                  handleRemoveItem={handleRemoveItem}
                                  hasAnyScore={hasAnyScore}
                                  isCurrentlyProcessing={isCurrentlyProcessing}
                                  isDynamicTable={isDynamicTable}
                                  lineItems={lineItems}
                                  skeletonRows={skeletonRows}
                                  LINE_ITEM_ACTION_WIDTH={
                                    LINE_ITEM_ACTION_WIDTH
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'attachments' && (
                        <div className='flex-1 overflow-y-auto p-4'>
                          {isCurrentlyProcessing ? (
                            <div className='flex h-48 flex-col items-center justify-center text-center'>
                              <Icon
                                className='mb-2 size-8 animate-spin text-[var(--primary-9)]'
                                name='tabler:loader-2'
                              />
                              <p className='text-xs font-semibold text-[var(--gray-10)]'>
                                {t`Loading Attachments...`}
                              </p>
                            </div>
                          ) : (
                            <Attachments
                              enabled={true}
                              formModel={formModel}
                              instanceId={resolvedInstanceId}
                              processId={processId}
                              selectedItem={selectedItem}
                              transactionId={transactionId}
                              workflowId={workflowId}
                              initialData={
                                attachmentData ||
                                selectedItem?.attachments ||
                                []
                              }
                              repositoryId={
                                repositoryId || selectedItem?.repositoryId
                              }
                              onSelect={(file) =>
                                selectedFile?.id === file.id
                                  ? (setIsViewerLoading(true),
                                    setTimeout(
                                      () => setIsViewerLoading(false),
                                      500,
                                    ))
                                  : setSelectedFile(file)
                              }
                            />
                          )}
                        </div>
                      )}

                      {activeTab === 'comments' && (
                        <div className='flex min-h-0 flex-1 flex-col pt-4 pb-0'>
                          {isCurrentlyProcessing ? (
                            <div className='flex h-48 flex-col items-center justify-center text-center'>
                              <Icon
                                className='mb-2 size-8 animate-spin text-[var(--primary-9)]'
                                name='tabler:loader-2'
                              />
                              <p className='text-xs font-semibold text-[var(--gray-10)]'>
                                {t`Loading Comments...`}
                              </p>
                            </div>
                          ) : (
                            <Comments
                              attachments={selectedItem?.attachments || []}
                              comments={commentsData}
                              enabled={true}
                              instanceId={resolvedInstanceId}
                              isLoading={isLoadingComments}
                              processId={processId}
                              refetch={refetchComments}
                              repositoryId={repositoryId}
                              transactionId={transactionId}
                              workflowId={workflowId}
                            />
                          )}
                        </div>
                      )}

                      {activeTab === 'history' && (
                        <div className='flex-1 overflow-y-auto p-4'>
                          {isCurrentlyProcessing ? (
                            <div className='flex h-48 flex-col items-center justify-center text-center'>
                              <Icon
                                className='mb-2 size-8 animate-spin text-[var(--primary-9)]'
                                name='tabler:loader-2'
                              />
                              <p className='text-xs font-semibold text-[var(--gray-10)]'>
                                {t`Loading History...`}
                              </p>
                            </div>
                          ) : (
                            <History
                              enabled={true}
                              isCompleted={isRequestCompleted}
                              processId={processId}
                              workflowId={workflowId}
                              instanceId={
                                selectedItem?.workflowInstanceId ||
                                selectedItem?.instanceId ||
                                processId
                              }
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
