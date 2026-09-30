import type { FileItem } from '@/pages/folders/types/folderTypes'
import {
  getRepositoryFieldRawValue,
  getRepositoryFieldStringValue,
} from '@/pages/folders/utils/repositoryFieldUtils'

const pickFirst = (
  file: FileItem,
  keys: string[],
  context: Record<string, string> = {},
) => {
  for (const key of keys) {
    const value = getRepositoryFieldStringValue(file, key, context)
    if (value) return value
  }
  return ''
}

export const getMobileFileName = (file: FileItem) => {
  const direct =
    file?.fileName ??
    file?.FileName ??
    file?.name ??
    file?.Name ??
    file?.InvoiceNumber ??
    file?.invoiceNumber ??
    file?.InvoiceNo ??
    file?.invoiceNo ??
    file?.['Invoice No'] ??
    file?.DocumentName ??
    file?.documentName

  if (direct !== undefined && direct !== null && String(direct).trim()) {
    return String(direct)
  }

  return (
    pickFirst(file, [
      'fileName',
      'InvoiceNumber',
      'Invoice No',
      'DocumentName',
    ]) || 'Untitled'
  )
}

export const getMobileFileStatus = (file: FileItem) =>
  pickFirst(file, ['status', 'Status', 'Stage', 'stage', 'WorkflowStatus']) ||
  ''

export const getMobileFileSupplier = (
  file: FileItem,
  context: Record<string, string> = {},
) =>
  pickFirst(
    file,
    ['Supplier', 'supplier', 'SupplierName', 'Vendor', 'VendorName'],
    context,
  )

export const getMobileFileDocType = (
  file: FileItem,
  context: Record<string, string> = {},
) =>
  pickFirst(
    file,
    ['DocumentType', 'documentType', 'DocType', 'Type', 'type', 'Category'],
    context,
  ) || 'Document'

export const getMobileFilePo = (
  file: FileItem,
  context: Record<string, string> = {},
) =>
  pickFirst(
    file,
    ['PONumber', 'poNumber', 'poNo', 'PO No', 'PurchaseOrder', 'PO'],
    context,
  )

export const getMobileFileDate = (
  file: FileItem,
  context: Record<string, string> = {},
) => {
  const raw =
    getRepositoryFieldRawValue(file, 'InvoiceDate', context) ??
    getRepositoryFieldRawValue(file, 'DocumentDate', context) ??
    getRepositoryFieldRawValue(file, 'Date', context) ??
    file.date

  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw)
  return date.toISOString().slice(0, 10)
}

export const getMobileFileAmount = (
  file: FileItem,
  context: Record<string, string> = {},
) => {
  const raw =
    getRepositoryFieldRawValue(file, 'Amount', context) ??
    getRepositoryFieldRawValue(file, 'InvoiceAmount', context) ??
    getRepositoryFieldRawValue(file, 'Total', context) ??
    file.amount

  if (raw === undefined || raw === null || raw === '') return ''
  const numeric = Number(String(raw).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(numeric)) return String(raw)
  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
}

export const getMobileFileCurrency = (
  file: FileItem,
  context: Record<string, string> = {},
) => pickFirst(file, ['Currency', 'currency', 'CurrencyCode'], context)

export const getMobileStatusTone = (
  status: string,
): 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  const s = status.toLowerCase()
  if (!s) return 'neutral'
  if (s.includes('paid') || s.includes('approved') || s.includes('matched')) {
    return 'success'
  }
  if (s.includes('reject') || s.includes('error') || s.includes('fail')) {
    return 'error'
  }
  if (s.includes('overdue') || s.includes('pending') || s.includes('action')) {
    return 'warning'
  }
  if (
    s.includes('verifier') ||
    s.includes('review') ||
    s.includes('progress')
  ) {
    return 'info'
  }
  return 'info'
}
