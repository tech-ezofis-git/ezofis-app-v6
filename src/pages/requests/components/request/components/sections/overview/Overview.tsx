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
  Plus,
  Store,
  Trash2,
  Wallet,
  Wand2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import BarLoader from '@/components/base/BarLoader'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import PaidActionApiTrigger from '@/components/playground/PaidActionApiTrigger'
import { useAttachments } from '@/pages/requests/hooks/useAttachments'
import { useComments } from '@/pages/requests/hooks/useComments'
import '@react-pdf-viewer/core/lib/styles/index.css'
import requestStore from '@/pages/requests/stores/useRequestStore'
import '@react-pdf-viewer/search/lib/styles/index.css'
import {
  getMockDB,
  startRelatedDocuments,
  startSupplierVerification,
} from '@/services/mockBackend'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import {
  buildFieldMetaMap,
  findPreferredLineItemsTable,
  hasMeaningfulScalarValue,
  resolveFieldMeta,
} from '../../../Request'
import Attachments from '../attachment/Attachments'
import Comments from '../comment/Comments'
import History from '../history/History'

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

const getLineItemAmount = (item: any): any => {
  return (
    item.Amount?.['Invoice Value'] ??
    item.total ??
    item.amount ??
    item.line_amount ??
    item.lineAmount ??
    0
  )
}

const FIELD_KEYS_MAP: Record<string, string[]> = {
  amount: ['Amount', 'total', 'amount', 'line_amount', 'lineAmount'],
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
    'total',
    'amount',
    'line_amount',
    'lineAmount',
  ])
  updateFieldIfValid(normalized, 'Amount', 'amount', amtVal)

  return normalized
}

const updateItemField = (item: any, fieldKey: string, value: any) => {
  const fields = FIELD_KEYS_MAP[fieldKey]
  if (fields) {
    for (const key of fields) {
      if (key in item) {
        updateValueInStructure(item, key, value)
      }
    }
  } else {
    updateValueInStructure(item, fieldKey, value)
  }
}

const recalculateItemAmount = (item: any) => {
  const qtyVal = item.Quantity?.['Invoice Value'] ?? item.quantity
  const priceVal =
    item.Price?.['Invoice Value'] ?? item.rate ?? item.unit_price ?? item.price

  const qtyNum = Number.parseFloat(String(qtyVal).replace(/[^0-9.-]+/g, ''))
  const priceNum = Number.parseFloat(String(priceVal).replace(/[^0-9.-]+/g, ''))

  if (!Number.isNaN(qtyNum) && !Number.isNaN(priceNum)) {
    const calculatedAmount = qtyNum * priceNum
    const formattedAmount = calculatedAmount.toFixed(2)
    if ('Amount' in item)
      updateValueInStructure(item, 'Amount', formattedAmount)
    if ('total' in item) updateValueInStructure(item, 'total', formattedAmount)
    if ('amount' in item)
      updateValueInStructure(item, 'amount', formattedAmount)
    if ('line_amount' in item)
      updateValueInStructure(item, 'line_amount', formattedAmount)
    if ('lineAmount' in item)
      updateValueInStructure(item, 'lineAmount', formattedAmount)
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
      formModel['Due Date'] ||
      formModel['due_date'] ||
      formModel['Due_Date'] ||
      formModel['DueDate']
    if (val && val !== '-') return String(val)
  }

  if (!row) return '-'
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
      parsedForm['vxnKCXsXkz8_acPogKe'] ||
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
      } catch (e) {}
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
      calculationText = 'in due'
      statusType = days <= 15 ? 'warning' : 'info'
    } else {
      daysText = '0 days'
      calculationText = 'immediate'
      statusType = 'danger'
    }
  } else if (daysDiff > 0) {
    daysText = `${daysDiff} days`
    calculationText = 'in due'
    statusType = daysDiff <= 15 ? 'warning' : 'info'
  } else if (daysDiff < 0) {
    daysText = `${Math.abs(daysDiff)} days`
    calculationText = 'overdue'
    statusType = 'danger'
  } else {
    daysText = '0 days'
    calculationText = 'immediate'
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

// --- Components ---

const AnalysisCard = ({
  icon: Icon,
  isLoading = false,
  isPulsing = false,
  isSelected = false,
  status,
  statusContent, // NEW: optional node that replaces the plain status badge
  statusType = 'success',
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
      <div className='flex items-center justify-between'>
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
  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 flex min-h-0 flex-1 flex-col bg-surface duration-300'>
      {/* Header */}
      <div className='flex shrink-0 items-center justify-between border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-6 py-3.5'>
        <div className='flex items-center gap-3'>
          <button
            className='group flex items-center gap-1 text-xs font-semibold text-[var(--gray-11)] transition-all hover:text-[var(--gray-13)] active:scale-95'
            onClick={onClose}
          >
            <Icon
              className='h-4 w-4 transition-transform group-hover:-translate-x-0.5'
              name='tabler:arrow-left'
            />
            <span>Back</span>
          </button>
          <div className='mx-1 h-4 w-[1px] bg-[var(--gray-3)]' />
          <div className='flex items-center gap-2'>
            <div className={cn('rounded-md p-1', getStatusStyles(statusType))}>
              <IconComponent className='h-4 w-4' />
            </div>
            <h3 className='text-sm font-bold text-[var(--gray-13)]'>{title}</h3>
          </div>
        </div>
        <span
          className={cn(
            'rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase',
            getStatusBorderStyles(statusType),
          )}
        >
          {status}
        </span>
      </div>

      {/* Content */}
      <div className='flex-1 space-y-6 overflow-y-auto p-6'>{children}</div>
    </div>
  )
}

const FormCard = ({
  highlight = false,
  icon: Icon,
  label,
  options = [],
  score,
  type = 'text',
  value,
  onChange,
  onFocus,
}: any) => {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      onChange?.(localValue)
    }
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') {
      setLocalValue(value)
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
        className={cn(
          'group flex items-start gap-3 rounded-lg border border-[var(--primary-3)] bg-surface p-3 shadow-sm ring-1 ring-[var(--primary-3)]/20',
        )}
      >
        <div
          className={cn(
            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)] transition-colors group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]',
            highlight && 'bg-[var(--green-9)]/10 text-[var(--green-9)]',
          )}
        >
          <Icon className='h-3.5 w-3.5' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='mb-0.5 flex items-center justify-between gap-2'>
            <p className='text-[10px] font-semibold text-[var(--gray-11)]'>
              {label}
            </p>
            {score !== undefined && score !== null && (
              <span
                className={cn(
                  'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold transition-colors',
                  Number(score) >= 90
                    ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
                    : Number(score) >= 70
                      ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                      : 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
                )}
              >
                {Math.round(Number(score))}%
              </span>
            )}
          </div>
          <div className='animate-in fade-in zoom-in-95 duration-200'>
            {inputElement}
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type='button'
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-none border-transparent bg-transparent p-3 text-left transition-all hover:border-[var(--gray-3)] hover:bg-surface hover:shadow-sm focus:ring-1 focus:ring-[var(--primary-3)]/50 focus:outline-none',
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
        <Icon className='h-3.5 w-3.5' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='mb-0.5 flex items-center justify-between gap-2'>
          <p className='text-[10px] font-semibold text-[var(--gray-11)]'>
            {label}
          </p>
          {score !== undefined && score !== null && (
            <span
              className={cn(
                'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold transition-colors',
                Number(score) >= 90
                  ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
                  : Number(score) >= 70
                    ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                    : 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
              )}
            >
              {Math.round(Number(score))}%
            </span>
          )}
        </div>
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
          {value === null || value === undefined || value === '' ? '-' : value}
        </p>
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
      label: 'Reject Transaction',
    }
  }
  if (r.includes('WAIT')) {
    return {
      bg: 'bg-[var(--blue-1)]/50',
      chip: 'border border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)]',
      icon: 'tabler:hourglass-high',
      label: 'Wait for Balance',
    }
  }
  if (r.includes('CONTACT')) {
    return {
      bg: 'bg-[var(--purple-1)]/50',
      chip: 'border border-[var(--purple-3)] bg-[var(--purple-1)] text-[var(--purple-9)]',
      icon: 'tabler:message-circle',
      label: 'Contact Vendor',
    }
  }
  if (r.includes('CANCEL')) {
    return {
      bg: 'bg-[var(--red-1)]/50',
      chip: 'border border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
      icon: 'tabler:ban',
      label: 'Cancel Remaining',
    }
  }
  return {
    bg: 'bg-[var(--gray-1)]/50',
    chip: 'border border-[var(--gray-3)] bg-[var(--gray-1)] text-[var(--gray-11)]',
    icon: 'tabler:dots',
    label: rec || 'No Action',
  }
}

const Overview = (props: any) => {
  const {
    actions,
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
    onOpenPlayground,
  } = props

  const processingProcesses = requestStore((state) => state.processingProcesses)
  const matchingProc = useMemo(() => {
    return processingProcesses.find(
      (p) =>
        String(p.processId || p.id) ===
        String(selectedItem?.processId || selectedItem?.id),
    )
  }, [processingProcesses, selectedItem])

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

  const isScanning = useMemo(() => {
    const hasData =
      formModel &&
      Object.keys(formModel).length > 0 &&
      Object.values(formModel).some(hasMeaningfulScalarValue)
    return !!isCurrentlyProcessing && !hasData
  }, [isCurrentlyProcessing, formModel])

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
  const paidAction = useMemo(() => {
    return (
      actions?.find(
        (act: any) => String(act?.label || '').toLowerCase() === 'paid',
      ) || {
        endpoint: 'https://ezagentplayground.onrender.com/apikey.html?id=2',
        label: 'Paid',
        model: 'gemini-2.0-flash-exp',
        provider: 'gemini',
      }
    )
  }, [actions])
  const analysisCardCount =
    3 +
    (showGlValidation ? 1 : 0) +
    1 + // Either Back Order or Payment Terms is always shown
    (showMatterValidation ? 1 : 0)

  const [activeTab, setActiveTab] = useState('summary')
  const [activeDetailView, setActiveDetailView] = useState<string | null>(null)

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

  // Related Documents Check State
  const [relatedDocsState, setRelatedDocsState] = useState<{
    data?: any
    status: 'not_run' | 'pending' | 'complete'
  }>(() => {
    if (!docId) return { status: 'not_run' }
    const db = getMockDB()
    return db.documents[docId]?.relatedDocuments || { status: 'not_run' }
  })

  // Synchronize state when document ID changes
  useEffect(() => {
    if (!docId) return
    const db = getMockDB()
    setSupplierCheckState(
      db.documents[docId]?.supplierVerification || { status: 'not_run' },
    )
    setRelatedDocsState(
      db.documents[docId]?.relatedDocuments || { status: 'not_run' },
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
      setRelatedDocsState(
        db.documents[docId]?.relatedDocuments || { status: 'not_run' },
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
        message: `Supplier verification completed: ${result.value}`,
        variant: 'success',
      })
    } catch (error: any) {
      setSupplierCheckState({ status: 'not_run' })
      showToast({
        message:
          error?.message || 'Verification failed. 1 credit has been refunded.',
        variant: 'error',
      })
    }
  }

  // Related Documents Handler
  const handleFindRelatedDocumentsClick = async () => {
    if (!docId) return
    try {
      setRelatedDocsState({ status: 'pending' })

      const result = await startRelatedDocuments(docId, supplierName)

      setRelatedDocsState({
        data: result,
        status: 'complete',
      })

      showToast({
        message: 'Successfully located related purchase orders and invoices.',
        variant: 'success',
      })
    } catch (error: any) {
      setRelatedDocsState({ status: 'not_run' })
      showToast({
        message: error?.message || 'Search failed. 1 credit has been refunded.',
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

  const [activeBackOrderTab, setActiveBackOrderTab] =
    useState<string>('current')
  const [selectedFile, setSelectedFile] = useState<any>(null)

  useEffect(() => {
    console.log('=== OVERVIEW COMPONENT RENDER ===')
    console.log('formModel:', formModel)
    console.log('allowedLabels:', allowedLabels)
  }, [formModel, allowedLabels])
  const { data: attachmentData } = useAttachments(
    workflowId,
    resolvedInstanceId,
    true,
  )
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useComments(workflowId, resolvedInstanceId, true)

  const [lineItems, setLineItems] = useState<any[]>([])

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
    if (lineItemsTable?.rows?.length) {
      return lineItemsTable.rows
    }

    return (
      agentData?.debug?.['Side-by-side Line Item matching'] ||
      agentData?.line_items ||
      agentData?.['Extracted Invoice JSON']?.invoice_items ||
      []
    )
  }, [agentData, lineItemsTable])

  const tableFieldMeta = useMemo(() => {
    if (!tableFieldKey) return null
    return resolveFieldMeta(fieldMetaMap, tableFieldKey)
  }, [fieldMetaMap, tableFieldKey])

  const isDynamicTable = useMemo(() => {
    return String(tableFieldMeta?.type || '').toUpperCase() === 'DYNAMIC_TABLE'
  }, [tableFieldMeta])

  const dynamicColumns = useMemo(() => {
    if (!rawLineItems || rawLineItems.length === 0) return []
    const keys = new Set<string>()
    rawLineItems.forEach((item: any) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((k) => {
          if (
            k !== '_id' &&
            k !== '_localFileUrl' &&
            k !== 'localUrl' &&
            k !== 'score' &&
            k !== 'Line Score' &&
            k !== 'status'
          ) {
            keys.add(k)
          }
        })
      }
    })
    return Array.from(keys)
  }, [rawLineItems])

  const formatHeaderLabel = (key: string) => {
    return key
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

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
        setScannerBounds({
          left: Math.max(0, pRect.left - wRect.left),
          right: Math.max(0, wRect.right - pRect.right),
        })
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
      onZoom: (e: any) => {
        setScale(e.scale)
      },
    }),
    [],
  )

  useEffect(() => {
    // Reset viewer state when request changes
    setSelectedFile(null)
    setPreviewUrl(null)
    lastFetchedRef.current = null
  }, [processId, transactionId])

  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData.at(-1))
    }
  }, [attachmentData, selectedFile])

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
              plugins={[toolbarPluginInstance, searchPluginInstance]}
            />
            <div className='absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-[var(--gray-3)] bg-surface/90 px-4 py-2 opacity-0 shadow-2xl backdrop-blur-sm transition-all duration-300 group-hover:opacity-100'>
              <button
                className='p-1 hover:text-[var(--primary-9)]'
                onClick={() => viewerRef.current?.zoom(scale - 0.1)}
              >
                <Icon className='size-5' name='lucide:zoom-out' />
              </button>
              <span className='min-w-[40px] text-center text-[12px] font-semibold'>
                {Math.round(scale * 100)}%
              </span>
              <button
                className='p-1 hover:text-[var(--primary-9)]'
                onClick={() => viewerRef.current?.zoom(scale + 0.1)}
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
                  className='animate-scan absolute h-[2px] bg-[var(--primary-9)] shadow-[0_0_8px_var(--primary-9),_0_0_16px_var(--primary-9)]'
                  style={{
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
              <div className='animate-scan absolute right-0 left-0 h-[2px] bg-[var(--primary-9)] shadow-[0_0_8px_var(--primary-9),_0_0_16px_var(--primary-9)]' />
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
                      analysisCardCount === 4 && 'grid-cols-2 lg:grid-cols-4',
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
                        formModel?.['RXwLGHILLrreMmRqlk9mj']
                      return (
                        <AnalysisCard
                          align='left'
                          icon={Paperclip}
                          isSelected={activeDetailView === 'po_matching'}
                          title='PO Matching'
                          isLoading={
                            isCurrentlyProcessing &&
                            (!poVal || poVal === '-' || poVal === 'N/A')
                          }
                          status={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? 'Matched'
                              : 'Not Matched'
                          }
                          statusType={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? 'success'
                              : 'warning'
                          }
                          value={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? `${poVal}`
                              : 'No PO Found'
                          }
                          onClick={() => setActiveDetailView('po_matching')}
                        />
                      )
                    })()}
                    <AnalysisCard
                      align='left'
                      icon={Layers}
                      isSelected={activeDetailView === 'duplicate_check'}
                      title='Duplicate Detection'
                      isLoading={
                        isCurrentlyProcessing && !agentData?.duplicate_check
                      }
                      status={
                        agentData?.duplicate_check?.status || 'No Duplicate'
                      }
                      statusType={
                        agentData?.duplicate_check?.status === 'Duplicate'
                          ? 'warning'
                          : 'success'
                      }
                      value={
                        agentData?.duplicate_check?.message ||
                        'No duplicates detected'
                      }
                      onClick={() => setActiveDetailView('duplicate_check')}
                    />
                    {supplierCheckState.status === 'not_run' && (
                      <AnalysisCard
                        align='left'
                        icon={Wand2}
                        isLoading={false}
                        isPulsing={true}
                        title='Supplier Verification'
                        value='Not Verified'
                        isSelected={
                          activeDetailView === 'supplier_verification'
                        }
                        statusContent={
                          <button
                            className='relative inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-1 text-[9px] font-bold text-[var(--primary-9)] shadow-sm transition-all hover:scale-[1.02] hover:bg-[var(--primary-3)] hover:text-[var(--primary-10)] active:scale-95'
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation() // don't also fire the card's onClick
                              handleVerifySupplierClick()
                            }}
                          >
                            <span className='relative flex h-1.5 w-1.5 shrink-0'>
                              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary-9)] opacity-75' />
                              <span className='relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--primary-9)]' />
                            </span>
                            Verify Supplier
                          </button>
                        }
                        onClick={handleVerifySupplierClick}
                      />
                    )}
                    {supplierCheckState.status === 'pending' && (
                      <AnalysisCard
                        align='left'
                        icon={Wand2}
                        isLoading={false}
                        status='Verifying...'
                        statusType='info'
                        title='Supplier Verification'
                        isSelected={
                          activeDetailView === 'supplier_verification'
                        }
                        value={
                          <span className='inline-flex animate-pulse items-center gap-1.5 text-xs font-medium text-[var(--gray-10)]'>
                            <Icon
                              className='h-3.5 w-3.5 animate-spin text-[var(--primary-9)]'
                              name='tabler:loader-2'
                            />
                            Verifying...
                          </span>
                        }
                      />
                    )}
                    {supplierCheckState.status === 'complete' && (
                      <AnalysisCard
                        align='left'
                        icon={Store}
                        isLoading={isCurrentlyProcessing}
                        status={supplierCheckState.data?.status || 'Verified'}
                        title='Supplier Verification'
                        isSelected={
                          activeDetailView === 'supplier_verification'
                        }
                        statusType={
                          supplierCheckState.data?.statusType || 'success'
                        }
                        value={
                          supplierCheckState.data?.value || 'Supplier verified'
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
                        status={glValidationDisplay.status}
                        statusType={glValidationDisplay.statusType}
                        title='GL Account Matching'
                        isLoading={
                          isCurrentlyProcessing &&
                          (!glValidationDisplay?.account ||
                            glValidationDisplay.account === 'Not Available')
                        }
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
                        status={backOrderDisplay.status}
                        statusType={backOrderDisplay.statusType}
                        title='Back Order'
                        value={backOrderDisplay.value}
                        isLoading={
                          isCurrentlyProcessing &&
                          (!backOrderDisplay?.value ||
                            backOrderDisplay.value === '---')
                        }
                        onClick={() => {
                          setActiveDetailView('back_order')
                          setActiveBackOrderTab('current')
                        }}
                      />
                    ) : (
                      <AnalysisCard
                        align='right'
                        icon={Calendar}
                        isSelected={activeDetailView === 'payment_terms'}
                        status={paymentTermsDisplay.calculationText}
                        statusType={paymentTermsDisplay.statusType}
                        title='Payment Terms'
                        isLoading={
                          isCurrentlyProcessing &&
                          (!paymentTermsDisplay?.termsDisplay ||
                            paymentTermsDisplay.termsDisplay === '-' ||
                            extractPaymentTerms(
                              selectedItem,
                              agentData,
                              formModel,
                            ) === '-')
                        }
                        value={paymentTermsDisplay.daysText.replace(
                          /days/i,
                          'Days',
                        )}
                        onClick={() => setActiveDetailView('payment_terms')}
                      />
                    )}
                    {showMatterValidation && matterValidationDisplay && (
                      <AnalysisCard
                        align='right'
                        icon={Briefcase}
                        isSelected={activeDetailView === 'matter_validation'}
                        status={matterValidationDisplay.status}
                        statusType={matterValidationDisplay.statusType}
                        title='Matter Validation'
                        value={matterValidationDisplay.value}
                        isLoading={
                          isCurrentlyProcessing &&
                          (!matterValidationDisplay?.value ||
                            matterValidationDisplay.value === '---')
                        }
                        onClick={() => setActiveDetailView('matter_validation')}
                      />
                    )}
                  </div>
                </div>

                {!activeDetailView && (
                  <div className='sticky top-0 z-10 shrink-0 border-b border-[var(--gray-3)] bg-surface px-6 pt-2'>
                    <div className='flex items-center justify-between gap-8'>
                      <div className='flex items-center gap-8'>
                        {[
                          {
                            icon: FileText,
                            id: 'summary',
                            label: 'Extracted Data',
                          },
                          { icon: Layers, id: 'line_items', label: 'Line Items' },
                          {
                            icon: Paperclip,
                            id: 'attachments',
                            label: 'Attachments',
                          },
                          {
                            icon: MessageCircle,
                            id: 'comments',
                            label: 'Comments',
                          },
                          { icon: HistoryIcon, id: 'history', label: 'History' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            className={cn(
                              '-mb-[2px] flex items-center gap-2 border-b-2 pb-4 text-[11px] font-semibold transition-all',
                              activeTab === tab.id
                                ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                                : 'border-transparent text-[var(--gray-11)]',
                            )}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <tab.icon className='h-4 w-4' />
                            {tab.label}
                            {tab.id === 'attachments' &&
                              attachmentData?.length > 0 && (
                                <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                                  {attachmentData.length}
                                </span>
                              )}
                            {tab.id === 'line_items' &&
                              (lineItems.length > 0 ||
                                agentData?.debug?.[
                                  'Side-by-side Line Item matching'
                                ]?.length > 0 ||
                                agentData?.line_items?.length > 0 ||
                                agentData?.['Extracted Invoice JSON']
                                  ?.invoice_items?.length > 0) && (
                                <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                                  {lineItems.length ||
                                    agentData?.debug?.[
                                      'Side-by-side Line Item matching'
                                    ]?.length ||
                                    agentData?.line_items?.length ||
                                    agentData?.['Extracted Invoice JSON']
                                      ?.invoice_items?.length}
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
                      {onOpenPlayground && (
                        <div className='pb-2.5 animate-in fade-in duration-300'>
                          <PaidActionApiTrigger
                            action={paidAction}
                            onTrigger={onOpenPlayground}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className='flex min-h-0 flex-1 flex-col'>
                  {activeDetailView ? (
                    <>
                      {activeDetailView === 'po_matching' && (
                        <DetailReportView
                          icon={Paperclip}
                          title='PO Matching Analysis'
                          status={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? 'Matched'
                              : 'Not Matched'
                          }
                          statusType={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? 'success'
                              : 'warning'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-2 gap-6'>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Document Mapping
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    PO Number (Extracted)
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {poVal || 'N/A'}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Vendor Name
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {agentData?.po_row?.['Vendor Name'] ||
                                      'N/A'}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Authorized Amount
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {agentData?.po_matching?.po_amount || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Validation Log
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs leading-relaxed'>
                                <p className='font-medium text-[var(--gray-12)]'>
                                  {poVal && poVal !== '-' && poVal !== 'N/A'
                                    ? 'The extraction engine resolved the PO reference block in the document header and verified its presence in the procurement ledger database.'
                                    : 'No purchase order barcode, ID, or header reference matches could be resolved automatically. Manual association may be required if this is a PO-backed invoice.'}
                                </p>
                                <div className='flex items-center gap-2 rounded-lg border border-[var(--primary-3)] bg-[var(--primary-2)] p-3 text-[var(--primary-9)]'>
                                  <Icon
                                    className='h-4 w-4 shrink-0'
                                    name='tabler:info-circle'
                                  />
                                  <span className='text-[11px] leading-tight font-medium'>
                                    System automatically performs two-way and
                                    three-way checks on verified purchase
                                    orders.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'duplicate_check' && (
                        <DetailReportView
                          icon={Layers}
                          title='Duplicate Payment Check'
                          status={
                            agentData?.duplicate_check?.status || 'No Duplicate'
                          }
                          statusType={
                            agentData?.duplicate_check?.status === 'Duplicate'
                              ? 'danger'
                              : 'success'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-2 gap-6'>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Historical Match Results
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Cross-Check Status
                                  </span>
                                  <span
                                    className={cn(
                                      'font-bold',
                                      agentData?.duplicate_check?.status ===
                                        'Duplicate'
                                        ? 'text-[var(--red-9)]'
                                        : 'text-[var(--green-9)]',
                                    )}
                                  >
                                    {agentData?.duplicate_check?.status ||
                                      'Passed'}
                                  </span>
                                </div>
                                <div className='flex flex-col gap-1'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    System Response
                                  </span>
                                  <span className='leading-normal font-medium text-[var(--gray-13)]'>
                                    {agentData?.duplicate_check?.message ||
                                      'No duplicate records found.'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Security & Auditing Policy
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-11)]'>
                                  Double-payment prevention checks analyze
                                  historical invoices by combining:
                                </p>
                                <ul className='list-disc space-y-1.5 pl-4 text-[var(--gray-11)]'>
                                  <li>
                                    Supplier tax identity and banking details.
                                  </li>
                                  <li>
                                    Exact Invoice Number string similarity.
                                  </li>
                                  <li>
                                    Grand Total and individual line-item value
                                    mapping.
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'supplier_verification' && (
                        <DetailReportView
                          icon={Store}
                          status={supplierCheckState.data?.status || 'Verified'}
                          title='Supplier Verification Registry'
                          statusType={
                            supplierCheckState.data?.statusType || 'success'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-2 gap-6'>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Supplier Details
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Supplier Code
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {formModel?.['Supplier ID'] ||
                                      formModel?.['SupplierCode'] ||
                                      formModel?.['Supplier Code'] ||
                                      formModel?.['supplier_id'] ||
                                      formModel?.['Vendor ID'] ||
                                      formModel?.['vendor_id'] ||
                                      'Not Available'}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Verification Result
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {supplierCheckState.data?.value ||
                                      'Verified'}
                                  </span>
                                </div>
                                {agentData?.supplier_validation?.mismatch &&
                                  agentData.supplier_validation.mismatch
                                    .length > 0 && (
                                    <div className='mt-1 flex flex-col gap-1 border-t border-[var(--gray-3)] pt-2'>
                                      <span className='font-semibold text-[var(--red-9)]'>
                                        Discrepancy Details
                                      </span>
                                      <ul className='list-disc space-y-1 pl-4 text-[11px] text-[var(--gray-12)]'>
                                        {agentData.supplier_validation.mismatch.map(
                                          (m: any, idx: number) => (
                                            <li key={idx}>{String(m)}</li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            </div>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Registry Verification Log
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-12)]'>
                                  Verification checks supplier address registry,
                                  bank details, and business license status
                                  against corporate supplier directories and
                                  compliance watchlists.
                                </p>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'gl_matching' && (
                        <DetailReportView
                          icon={ListFilter}
                          title='GL Account Matching Report'
                          status={
                            glValidationDisplay?.status || 'Not Available'
                          }
                          statusType={
                            glValidationDisplay?.statusType || 'default'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-2 gap-6'>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Suggested Allocation
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Matched GL Account
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {glValidationDisplay?.account ||
                                      'No account matched'}
                                  </span>
                                </div>
                                {(agentData?.gl_validation?.reason ||
                                  agentData?.gl_matching?.reason) && (
                                  <div className='mt-1 flex flex-col gap-1 border-t border-[var(--gray-3)] pt-2'>
                                    <span className='font-semibold text-[var(--gray-11)]'>
                                      Matching Rationale
                                    </span>
                                    <span className='leading-normal font-medium text-[var(--gray-12)]'>
                                      {agentData?.gl_validation?.reason ||
                                        agentData?.gl_matching?.reason}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Allocation Rules
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs leading-relaxed'>
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
                          status={paymentTermsDisplay.calculationText}
                          statusType={paymentTermsDisplay.statusType}
                          title='Payment Terms Analysis'
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-2 gap-6'>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Payment Deadlines
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Billing Terms
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {paymentTermsDisplay.termsDisplay}
                                  </span>
                                </div>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Due Date
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {extractDueDate(
                                      selectedItem,
                                      agentData,
                                      formModel,
                                    )}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Time Remaining
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {paymentTermsDisplay.daysText}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Deadlines & Penalty Insights
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-12)]'>
                                  Payments terms are verified by
                                  cross-referencing values extracted from
                                  invoice headers against agreed vendor contract
                                  parameters. Late fees may apply if settlement
                                  exceeds due date boundaries.
                                </p>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'matter_validation' && (
                        <DetailReportView
                          icon={Briefcase}
                          status={matterValidationDisplay?.status || 'Unknown'}
                          title='Legal Matter Association Check'
                          statusType={
                            matterValidationDisplay?.statusType || 'default'
                          }
                          onClose={() => setActiveDetailView(null)}
                        >
                          <div className='grid grid-cols-2 gap-6'>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Associated Entity
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs'>
                                <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                  <span className='font-semibold text-[var(--gray-11)]'>
                                    Matter Reference
                                  </span>
                                  <span className='font-bold text-[var(--gray-13)]'>
                                    {matterValidationDisplay?.value}
                                  </span>
                                </div>
                                {agentData?.matter_validation?.client_name && (
                                  <div className='flex justify-between border-b border-[var(--gray-3)] pb-2'>
                                    <span className='font-semibold text-[var(--gray-11)]'>
                                      Client
                                    </span>
                                    <span className='font-bold text-[var(--gray-13)]'>
                                      {agentData.matter_validation.client_name}
                                    </span>
                                  </div>
                                )}
                                {agentData?.matter_validation
                                  ?.validation_details?.reason && (
                                  <div className='mt-1 flex flex-col gap-1 border-t border-[var(--gray-3)] pt-2'>
                                    <span className='font-semibold text-[var(--gray-11)]'>
                                      Compliance Note
                                    </span>
                                    <span className='text-[11px] leading-normal font-medium text-[var(--gray-12)]'>
                                      {
                                        agentData.matter_validation
                                          .validation_details.reason
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className='space-y-4'>
                              <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                Matter Validation Rules
                              </h4>
                              <div className='space-y-3 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-4 text-xs leading-relaxed'>
                                <p className='text-[var(--gray-11)]'>
                                  Corporate legal invoices are checked for
                                  compliance against corporate billing
                                  guidelines, valid client matter IDs, and
                                  active legal budgets.
                                </p>
                              </div>
                            </div>
                          </div>
                        </DetailReportView>
                      )}
                      {activeDetailView === 'back_order' && (
                        <div className='animate-in fade-in slide-in-from-bottom-2 flex min-h-0 flex-1 flex-col bg-surface duration-300'>
                          {/* Header */}
                          <div className='flex shrink-0 items-center justify-between border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-6 py-3.5'>
                            <div className='flex items-center gap-3'>
                              <button
                                className='group flex items-center gap-1 text-xs font-semibold text-[var(--gray-11)] transition-all hover:text-[var(--gray-13)] active:scale-95'
                                onClick={() => setActiveDetailView(null)}
                              >
                                <Icon
                                  className='h-4 w-4 transition-transform group-hover:-translate-x-0.5'
                                  name='tabler:arrow-left'
                                />
                                <span>Back</span>
                              </button>
                              <div className='mx-1 h-4 w-[1px] bg-[var(--gray-3)]' />
                              <div className='flex items-center gap-2'>
                                <div className='rounded-md border border-[var(--orange-3)] bg-[var(--orange-1)] p-1 text-[var(--orange-9)]'>
                                  <Icon
                                    className='h-4 w-4'
                                    name='tabler:list-check'
                                  />
                                </div>
                                <h3 className='text-sm font-bold text-[var(--gray-13)]'>
                                  PO line items vs invoices
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
                                      'mr-2 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-bold shadow-xs',
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
                          <div className='flex shrink-0 items-center gap-4 border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-6'>
                            <div className='flex items-center gap-4'>
                              {/* Current Invoice tab */}
                              <button
                                className={cn(
                                  '-mb-[1px] border-b-2 px-1 pt-2 pb-2.5 text-xs font-semibold transition-all',
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
                                    '-mb-[1px] border-b-2 px-1 pt-2 pb-2.5 text-xs font-semibold transition-all',
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
                              <div className='grid shrink-0 grid-cols-4 divide-x divide-[var(--gray-3)] border-b border-[var(--gray-3)] bg-surface text-xs'>
                                <div className='space-y-1 p-4'>
                                  <p className='text-[10px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                    INVOICE AMOUNT
                                  </p>
                                  <p className='text-base font-extrabold text-[var(--gray-13)]'>
                                    {currencySymbol}
                                    {invoiceAmount.toFixed(2)}
                                  </p>
                                </div>
                                <div className='space-y-1 p-4'>
                                  <p className='text-[10px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                    LINES RECEIVED
                                  </p>
                                  <p className='text-base font-extrabold text-[var(--teal-9)]'>
                                    {linesReceivedCount} of {totalLines}
                                  </p>
                                </div>
                                <div className='space-y-1 p-4'>
                                  <p className='text-[10px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                    PENDING ITEMS
                                  </p>
                                  <p className='text-base font-extrabold text-[var(--orange-9)]'>
                                    {pendingItemsCount} item
                                    {pendingItemsCount === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <div className='space-y-1 p-4'>
                                  <p className='text-[10px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                                    STILL PENDING
                                  </p>
                                  <p className='text-base font-extrabold text-[var(--orange-9)]'>
                                    {currencySymbol}
                                    {stillPendingVal.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Main Content Area */}
                          <div className='scrollbar flex-1 space-y-5 overflow-y-auto bg-[var(--gray-1)] p-6'>
                            {/* Status/Explanation banner */}
                            {(() => {
                              const currentData =
                                activeBackOrderTab === 'current'
                                  ? backOrder
                                  : MOCK_PREVIOUS_BACKORDERS[
                                      activeBackOrderTab
                                    ] || {}

                              return (
                                <div className='animate-in fade-in slide-in-from-top-2 rounded-xl border border-[var(--orange-3)] bg-[var(--orange-1)]/30 p-4 shadow-xs duration-300'>
                                  <div className='flex items-start gap-3'>
                                    <div className='mt-0.5 shrink-0 rounded bg-[var(--orange-2)] p-1.5 text-[var(--orange-9)]'>
                                      <Icon
                                        className='h-4 w-4'
                                        name='tabler:info-circle'
                                      />
                                    </div>
                                    <div className='space-y-1'>
                                      <h4 className='text-xs font-bold text-[var(--orange-10)]'>
                                        {activeBackOrderTab === 'current'
                                          ? 'Current Invoice Back Order Status'
                                          : `Prior Ticket ${activeBackOrderTab} Details`}
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
                                <div className='animate-in fade-in overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-xs duration-300'>
                                  <div className='overflow-x-auto'>
                                    <table className='w-full border-collapse text-left text-xs'>
                                      <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]'>
                                        <tr className='text-[10px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                                          <th className='px-4 py-3.5'>
                                            LINE ITEM
                                          </th>
                                          <th className='px-4 py-3.5 text-center'>
                                            PO QTY
                                          </th>
                                          <th className='px-4 py-3.5 text-center'>
                                            RECV QTY
                                          </th>
                                          <th className='px-4 py-3.5 text-center'>
                                            BALANCE QTY
                                          </th>
                                          <th className='px-4 py-3.5 text-right'>
                                            INV AMOUNT
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
                                      <tfoot className='border-t border-[var(--gray-3)] bg-[var(--gray-1)] text-[11px] font-semibold text-[var(--gray-11)]'>
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
                        <div className='grid flex-1 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto p-4'>
                          {isCurrentlyProcessing &&
                          (!formModel ||
                            Object.keys(formModel).length === 0 ||
                            !Object.values(formModel).some(
                              hasMeaningfulScalarValue,
                            ))
                            ? Array.from({ length: 8 }).map((_, idx) => {
                                const labels = [
                                  'Supplier Name',
                                  'Invoice Number',
                                  'Invoice Date',
                                  'Invoice Amount',
                                  'PO Number',
                                  'Payment Terms',
                                  'Currency',
                                  'Tax Amount',
                                ]
                                const icons = [
                                  Store,
                                  ListFilter,
                                  HistoryIcon,
                                  Wallet,
                                  Paperclip,
                                  HistoryIcon,
                                  CreditCard,
                                  Wallet,
                                ]
                                const label = labels[idx]
                                const IconComp = icons[idx]
                                return (
                                  <div
                                    className='flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left'
                                    key={label}
                                  >
                                    <div className='mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)]'>
                                      <IconComp className='h-3.5 w-3.5' />
                                    </div>
                                    <div className='min-w-0 flex-1 space-y-1.5'>
                                      <p className='text-[10px] leading-none font-semibold text-[var(--gray-11)]'>
                                        {label}
                                      </p>
                                      <div className='h-4 w-28 animate-pulse rounded bg-[var(--gray-3)]' />
                                    </div>
                                  </div>
                                )
                              })
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
                                    return hasMeaningfulScalarValue(val)
                                  }

                                  return (
                                    allowedLabels.has(key) ||
                                    hasMeaningfulScalarValue(val)
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
                                  const displayValue =
                                    fieldType === 'date' &&
                                    (rawVal === null ||
                                      rawVal === undefined ||
                                      rawVal === '' ||
                                      rawVal === '-')
                                      ? null
                                      : rawVal || '-'

                                  return (
                                    <FormCard
                                      icon={getFieldIcon(key)}
                                      key={key}
                                      label={key}
                                      options={getOptions(key)}
                                      score={getFieldScore(key)}
                                      type={fieldType}
                                      value={displayValue}
                                      highlight={
                                        key.toLowerCase().includes('total') ||
                                        key.toLowerCase().includes('due')
                                      }
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
                        <div className='flex-1 overflow-y-auto p-4'>
                          <div className='overflow-x-auto overflow-y-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm'>
                            <table className='w-full border-collapse text-left text-xs'>
                              <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]'>
                                <tr>
                                  {isDynamicTable ? (
                                    dynamicColumns.map((colKey) => (
                                      <th
                                        key={colKey}
                                        className={cn(
                                          'px-3 py-2 text-[11px] font-semibold text-[var(--gray-11)]',
                                          (colKey
                                            .toLowerCase()
                                            .includes('qty') ||
                                            colKey
                                              .toLowerCase()
                                              .includes('quantity') ||
                                            colKey
                                              .toLowerCase()
                                              .includes('rate') ||
                                            colKey
                                              .toLowerCase()
                                              .includes('price') ||
                                            colKey
                                              .toLowerCase()
                                              .includes('amount') ||
                                            colKey
                                              .toLowerCase()
                                              .includes('total')) &&
                                            'text-right',
                                        )}
                                      >
                                        {formatHeaderLabel(colKey)}
                                      </th>
                                    ))
                                  ) : (
                                    <>
                                      <th className='px-3 py-2 text-[11px] font-semibold text-[var(--gray-11)]'>
                                        Description
                                      </th>
                                      <th className='w-[100px] px-3 py-2 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                        Qty
                                      </th>
                                      <th className='w-[140px] px-3 py-2 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                        Rate
                                      </th>
                                      <th className='w-[160px] px-3 py-2 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                        Total Amount
                                      </th>
                                    </>
                                  )}
                                  <th className='w-[100px] px-3 py-2 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                    Match Score
                                  </th>
                                  <th className='w-[44px] p-1 text-center'>
                                    <button
                                      className='inline-flex cursor-pointer items-center justify-center rounded border border-[var(--primary-4)] bg-[var(--primary-2)] p-1 text-[var(--primary-11)] transition-all hover:bg-[var(--primary-3)] hover:text-[var(--primary-12)] active:scale-95'
                                      title='Add New Item'
                                      type='button'
                                      onClick={handleAddItem}
                                    >
                                      <Plus className='h-3.5 w-3.5' />
                                    </button>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className='divide-y divide-[var(--gray-2)]'>
                                {isCurrentlyProcessing && lineItems.length === 0
                                  ? skeletonRows.map((rowKey) => (
                                      <tr
                                        className='group transition-colors'
                                        key={rowKey}
                                      >
                                        {isDynamicTable ? (
                                          dynamicColumns.map(
                                            (colKey, index) => (
                                              <td
                                                key={colKey}
                                                className={cn(
                                                  'px-3 py-3',
                                                  (colKey
                                                    .toLowerCase()
                                                    .includes('qty') ||
                                                    colKey
                                                      .toLowerCase()
                                                      .includes('quantity') ||
                                                    colKey
                                                      .toLowerCase()
                                                      .includes('rate') ||
                                                    colKey
                                                      .toLowerCase()
                                                      .includes('price') ||
                                                    colKey
                                                      .toLowerCase()
                                                      .includes('amount') ||
                                                    colKey
                                                      .toLowerCase()
                                                      .includes('total')) &&
                                                    'text-right',
                                                )}
                                              >
                                                <div
                                                  className={cn(
                                                    'h-4 animate-pulse rounded bg-[var(--gray-3)]',
                                                    index === 0
                                                      ? 'w-5/6'
                                                      : 'ml-auto w-12',
                                                  )}
                                                />
                                              </td>
                                            ),
                                          )
                                        ) : (
                                          <>
                                            <td className='px-3 py-3'>
                                              <div className='h-4 w-5/6 animate-pulse rounded bg-[var(--gray-3)]' />
                                            </td>
                                            <td className='w-[100px] px-3 py-3'>
                                              <div className='ml-auto h-4 w-8 animate-pulse rounded bg-[var(--gray-3)]' />
                                            </td>
                                            <td className='w-[140px] px-3 py-3'>
                                              <div className='ml-auto h-4 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
                                            </td>
                                            <td className='w-[160px] px-3 py-3'>
                                              <div className='ml-auto h-4 w-16 animate-pulse rounded bg-[var(--gray-3)]' />
                                            </td>
                                          </>
                                        )}
                                        <td className='w-[100px] px-3 py-3'>
                                          <div className='ml-auto h-4 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
                                        </td>
                                        <td className='w-[44px]' />
                                      </tr>
                                    ))
                                  : lineItems.map(
                                      (item: any, index: number) => {
                                        const matchData =
                                          agentData?.debug?.[
                                            'Side-by-side Line Item matching'
                                          ]?.[index]
                                        const lineScore =
                                          matchData?.['Line Score'] ??
                                          item['Line Score'] ??
                                          item?.score
                                        const isMatch =
                                          (lineScore !== undefined &&
                                          lineScore !== null
                                            ? Number(lineScore) >= 90
                                            : false) || item?.status === 'MATCH'

                                        return (
                                          <tr
                                            key={item._id}
                                            className={cn(
                                              'group transition-colors',
                                              isMatch
                                                ? 'hover:bg-[var(--gray-1)]'
                                                : 'bg-[var(--red-1)]/30 hover:bg-[var(--red-1)]/50',
                                            )}
                                          >
                                            {isDynamicTable ? (
                                              dynamicColumns.map((colKey) => {
                                                const cellVal =
                                                  getRawVal(item, colKey) ?? ''
                                                const isNumeric =
                                                  colKey
                                                    .toLowerCase()
                                                    .includes('qty') ||
                                                  colKey
                                                    .toLowerCase()
                                                    .includes('quantity') ||
                                                  colKey
                                                    .toLowerCase()
                                                    .includes('rate') ||
                                                  colKey
                                                    .toLowerCase()
                                                    .includes('price') ||
                                                  colKey
                                                    .toLowerCase()
                                                    .includes('amount') ||
                                                  colKey
                                                    .toLowerCase()
                                                    .includes('total')

                                                return (
                                                  <td
                                                    key={colKey}
                                                    className={cn(
                                                      'px-2 py-0.5 font-semibold text-[var(--gray-13)]',
                                                      isNumeric && 'text-right',
                                                    )}
                                                  >
                                                    <div className='group/cell relative'>
                                                      <input
                                                        title={String(cellVal)}
                                                        value={cellVal}
                                                        className={cn(
                                                          'w-full rounded border-none bg-transparent px-1.5 py-1 text-xs font-semibold transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none',
                                                          isNumeric
                                                            ? 'text-right text-[var(--gray-11)]'
                                                            : 'text-[var(--gray-13)]',
                                                        )}
                                                        onBlur={(e) => {
                                                          if (
                                                            colKey
                                                              .toLowerCase()
                                                              .includes(
                                                                'price',
                                                              ) ||
                                                            colKey
                                                              .toLowerCase()
                                                              .includes(
                                                                'rate',
                                                              ) ||
                                                            colKey
                                                              .toLowerCase()
                                                              .includes(
                                                                'amount',
                                                              ) ||
                                                            colKey
                                                              .toLowerCase()
                                                              .includes('total')
                                                          ) {
                                                            const num =
                                                              Number.parseFloat(
                                                                e.target.value.replace(
                                                                  /[^0-9.-]+/g,
                                                                  '',
                                                                ),
                                                              )
                                                            if (
                                                              !Number.isNaN(num)
                                                            ) {
                                                              handleLineItemChange(
                                                                index,
                                                                colKey,
                                                                num.toFixed(2),
                                                              )
                                                              return
                                                            }
                                                          }
                                                          handleLineItemChange(
                                                            index,
                                                            colKey,
                                                            e.target.value,
                                                          )
                                                        }}
                                                        onChange={(e) =>
                                                          handleLineItemChange(
                                                            index,
                                                            colKey,
                                                            e.target.value,
                                                          )
                                                        }
                                                        onFocus={() =>
                                                          handleFieldFocus?.(
                                                            cellVal,
                                                            colKey,
                                                          )
                                                        }
                                                      />
                                                      {/* Hover tooltip for long values */}
                                                      {String(cellVal).length >
                                                        20 && (
                                                        <div className='animate-in fade-in pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden max-w-[280px] rounded-lg border border-[var(--gray-3)] bg-surface px-3 py-2 text-xs font-medium break-words whitespace-normal text-[var(--gray-13)] shadow-xl duration-150 group-hover/cell:block'>
                                                          {String(cellVal)}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>
                                                )
                                              })
                                            ) : (
                                              <>
                                                {/* Description Cell */}
                                                <td className='px-2 py-0.5 font-semibold text-[var(--gray-13)]'>
                                                  <input
                                                    className='w-full rounded border-none bg-transparent px-1.5 py-1 text-xs font-semibold text-[var(--gray-13)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                                    value={
                                                      item.Description?.[
                                                        'Invoice Value'
                                                      ] ??
                                                      item.description ??
                                                      item.item_no ??
                                                      item.itemNo ??
                                                      ''
                                                    }
                                                    onChange={(e) =>
                                                      handleLineItemChange(
                                                        index,
                                                        'description',
                                                        e.target.value,
                                                      )
                                                    }
                                                    onFocus={() =>
                                                      handleFieldFocus?.(
                                                        item.Description?.[
                                                          'Invoice Value'
                                                        ] ??
                                                          item.description ??
                                                          item.item_no ??
                                                          item.itemNo ??
                                                          '',
                                                        'description',
                                                      )
                                                    }
                                                  />
                                                </td>

                                                {/* Quantity Cell */}
                                                <td className='w-[100px] px-2 py-0.5 text-right font-semibold text-[var(--gray-11)]'>
                                                  <input
                                                    className='w-full rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-11)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                                    value={
                                                      item.Quantity?.[
                                                        'Invoice Value'
                                                      ] ??
                                                      item.quantity ??
                                                      ''
                                                    }
                                                    onChange={(e) =>
                                                      handleLineItemChange(
                                                        index,
                                                        'quantity',
                                                        e.target.value,
                                                      )
                                                    }
                                                    onFocus={() =>
                                                      handleFieldFocus?.(
                                                        item.Quantity?.[
                                                          'Invoice Value'
                                                        ] ??
                                                          item.quantity ??
                                                          '',
                                                        'qty',
                                                      )
                                                    }
                                                  />
                                                </td>

                                                {/* Rate/Price Cell */}
                                                <td className='w-[140px] px-2 py-0.5 text-right font-semibold text-[var(--gray-11)]'>
                                                  <input
                                                    className='w-full rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-11)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                                    value={
                                                      item.Price?.[
                                                        'Invoice Value'
                                                      ] ??
                                                      item.rate ??
                                                      item.unit_price ??
                                                      item.price ??
                                                      ''
                                                    }
                                                    onBlur={(e) => {
                                                      const num =
                                                        Number.parseFloat(
                                                          e.target.value.replace(
                                                            /[^0-9.-]+/g,
                                                            '',
                                                          ),
                                                        )
                                                      if (!Number.isNaN(num)) {
                                                        handleLineItemChange(
                                                          index,
                                                          'price',
                                                          num.toFixed(2),
                                                        )
                                                      }
                                                    }}
                                                    onChange={(e) =>
                                                      handleLineItemChange(
                                                        index,
                                                        'price',
                                                        e.target.value,
                                                      )
                                                    }
                                                    onFocus={() =>
                                                      handleFieldFocus?.(
                                                        item.Price?.[
                                                          'Invoice Value'
                                                        ] ??
                                                          item.rate ??
                                                          item.unit_price ??
                                                          item.price ??
                                                          '',
                                                        'price',
                                                      )
                                                    }
                                                  />
                                                </td>

                                                {/* Total Amount Cell */}
                                                <td className='w-[160px] px-2 py-0.5 text-right font-semibold text-[var(--gray-13)]'>
                                                  <input
                                                    className='w-full rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-13)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                                    value={
                                                      item.Amount?.[
                                                        'Invoice Value'
                                                      ] ??
                                                      item.total ??
                                                      item.amount ??
                                                      item.line_amount ??
                                                      item.lineAmount ??
                                                      ''
                                                    }
                                                    onBlur={(e) => {
                                                      const num =
                                                        Number.parseFloat(
                                                          e.target.value.replace(
                                                            /[^0-9.-]+/g,
                                                            '',
                                                          ),
                                                        )
                                                      if (!Number.isNaN(num)) {
                                                        handleLineItemChange(
                                                          index,
                                                          'amount',
                                                          num.toFixed(2),
                                                        )
                                                      }
                                                    }}
                                                    onChange={(e) =>
                                                      handleLineItemChange(
                                                        index,
                                                        'amount',
                                                        e.target.value,
                                                      )
                                                    }
                                                    onFocus={() =>
                                                      handleFieldFocus?.(
                                                        item.Amount?.[
                                                          'Invoice Value'
                                                        ] ??
                                                          item.total ??
                                                          item.amount ??
                                                          item.line_amount ??
                                                          item.lineAmount ??
                                                          '',
                                                        'line_amount',
                                                      )
                                                    }
                                                  />
                                                </td>
                                              </>
                                            )}

                                            {/* Match Score Cell */}
                                            <td className='w-[100px] px-3 py-2 text-right font-semibold'>
                                              {(() => {
                                                if (
                                                  lineScore === undefined ||
                                                  lineScore === null
                                                )
                                                  return (
                                                    <span className='text-[11px] text-gray-9'>
                                                      -
                                                    </span>
                                                  )
                                                const scoreNum =
                                                  Number(lineScore)
                                                return (
                                                  <span
                                                    className={cn(
                                                      'text-xs font-bold',
                                                      {
                                                        'text-[var(--green-9)]':
                                                          scoreNum >= 90,
                                                        'text-[var(--orange-9)]':
                                                          scoreNum >= 70 &&
                                                          scoreNum < 90,
                                                        'text-[var(--red-9)]':
                                                          scoreNum < 70,
                                                      },
                                                    )}
                                                  >
                                                    {scoreNum.toFixed(0)}%
                                                  </span>
                                                )
                                              })()}
                                            </td>

                                            {/* Action Cell */}
                                            <td className='w-[44px] px-2 py-0.5 text-center'>
                                              <button
                                                className='rounded p-1 text-[var(--red-9)] transition-all hover:bg-[var(--red-2)] hover:text-[var(--red-11)] active:scale-95'
                                                title='Remove Item'
                                                type='button'
                                                onClick={() =>
                                                  handleRemoveItem(index)
                                                }
                                              >
                                                <Trash2 className='h-3.5 w-3.5' />
                                              </button>
                                            </td>
                                          </tr>
                                        )
                                      },
                                    )}
                              </tbody>
                              <tfoot className='border-t border-[var(--gray-3)] bg-[var(--gray-1)]'>
                                <tr className='font-bold'>
                                  <td
                                    className='px-3 py-2 text-right text-[11px] text-[var(--gray-11)]'
                                    colSpan={
                                      isDynamicTable
                                        ? Math.max(1, dynamicColumns.length - 1)
                                        : 3
                                    }
                                  >
                                    Grand Total
                                  </td>
                                  <td className='px-3 py-2 text-right text-[13px] text-[var(--gray-13)]'>
                                    {(() => {
                                      const currencyCode =
                                        formModel?.['Currency'] ||
                                        agentData?.['Extracted Invoice JSON']
                                          ?.invoice_header?.['Currency'] ||
                                        ''
                                      const total = lineItems.reduce(
                                        (sum: number, item: any) => {
                                          const val = getLineItemAmount(item)
                                          const num = Number.parseFloat(
                                            String(val).replace(
                                              /[^0-9.-]+/g,
                                              '',
                                            ),
                                          )
                                          return (
                                            sum + (Number.isNaN(num) ? 0 : num)
                                          )
                                        },
                                        0,
                                      )
                                      const formattedTotal =
                                        total.toLocaleString(undefined, {
                                          maximumFractionDigits: 2,
                                          minimumFractionDigits: 2,
                                        })
                                      return currencyCode
                                        ? `${currencyCode} ${formattedTotal}`
                                        : formattedTotal
                                    })()}
                                  </td>
                                  <td className='w-[100px] bg-[var(--gray-1)]' />
                                  <td className='w-[44px] bg-[var(--gray-1)]' />
                                </tr>
                              </tfoot>
                            </table>
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
                                Loading Attachments...
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Related Documents Gated Section */}
                              {relatedDocsState.status === 'not_run' && (
                                <div className='animate-in fade-in mb-4 rounded-xl border border-[var(--gray-3)] bg-surface p-4 shadow-sm duration-300'>
                                  <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
                                    <div className='flex-1 space-y-1'>
                                      <h4 className='flex items-center gap-1.5 text-xs font-bold text-[var(--gray-13)]'>
                                        <Icon
                                          className='h-4 w-4 text-[var(--gray-10)]'
                                          name='tabler:files'
                                        />
                                        Related Documents
                                      </h4>
                                      <p className='text-[11px] leading-normal text-[var(--gray-10)]'>
                                        Run a check to surface similar POs and
                                        prior invoices from this supplier.
                                      </p>
                                    </div>
                                    <button
                                      className='inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 self-start rounded-lg border-none bg-[var(--primary-9)] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[var(--primary-10)] active:scale-95 md:self-center'
                                      onClick={handleFindRelatedDocumentsClick}
                                    >
                                      <Icon
                                        className='h-4 w-4'
                                        name='tabler:search'
                                      />
                                      Find Documents
                                    </button>
                                  </div>
                                </div>
                              )}
                              {relatedDocsState.status === 'pending' && (
                                <div className='animate-in fade-in mb-4 rounded-xl border border-[var(--gray-3)] bg-surface p-4 shadow-sm duration-300'>
                                  <div className='flex items-center gap-3'>
                                    <Icon
                                      className='h-5 w-5 animate-spin text-[var(--primary-9)]'
                                      name='tabler:loader-2'
                                    />
                                    <div className='space-y-1'>
                                      <h4 className='text-xs font-bold text-[var(--gray-13)]'>
                                        Related Documents
                                      </h4>
                                      <p className='animate-pulse text-[11px] font-medium text-[var(--gray-10)]'>
                                        Searching related documents...
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {relatedDocsState.status === 'complete' && (
                                <div className='animate-in fade-in mb-4 rounded-xl border border-[var(--gray-3)] bg-surface p-4 shadow-sm duration-300'>
                                  <div className='space-y-3'>
                                    <div className='flex items-center justify-between border-b border-[var(--gray-3)] pb-2'>
                                      <h4 className='flex items-center gap-1.5 text-xs font-bold text-[var(--gray-13)]'>
                                        <Icon
                                          className='h-4 w-4 text-[var(--green-9)]'
                                          name='tabler:circle-check'
                                        />
                                        Related Documents
                                      </h4>
                                      <span className='rounded border border-[var(--green-3)] bg-[var(--green-1)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--green-9)]'>
                                        Completed
                                      </span>
                                    </div>

                                    <p className='text-xs leading-relaxed font-medium text-[var(--gray-12)]'>
                                      {relatedDocsState.data?.summary}
                                    </p>

                                    <div className='flex flex-wrap gap-2 pt-1'>
                                      {relatedDocsState.data?.chips?.map(
                                        (chip: any, idx: number) => (
                                          <div
                                            className='inline-flex items-center gap-1.5 rounded-md border border-[var(--gray-3)] bg-[var(--gray-2)] px-2 py-1 text-[11px] font-semibold text-[var(--gray-12)]'
                                            key={idx}
                                          >
                                            <Icon
                                              className='h-3 w-3 text-[var(--gray-10)]'
                                              name='tabler:file-text'
                                            />
                                            <span>{chip.id}</span>
                                            <span className='text-[10px] font-normal text-[var(--gray-9)]'>
                                              ({chip.date})
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <Attachments
                                enabled={true}
                                formModel={formModel}
                                instanceId={resolvedInstanceId}
                                processId={processId}
                                selectedItem={selectedItem}
                                transactionId={transactionId}
                                workflowId={workflowId}
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
                            </>
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
                                Loading Comments...
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
                                Loading History...
                              </p>
                            </div>
                          ) : (
                            <History
                              enabled={true}
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
