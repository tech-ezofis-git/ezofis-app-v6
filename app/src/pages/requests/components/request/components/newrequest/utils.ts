const MAX_SIZE = 50 * 1024 * 1024 // 50MB

// Document & Media Types accepted for DMS: PDF, Office, Text, Images, Archives
const DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.png,.jpg,.jpeg,.tiff,.tif,.webp,.svg,.bmp,.zip,.rar,.7z,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/tiff,image/webp,image/svg+xml,application/zip'

// Invoice (PDF)
const PDF_ACCEPT = 'application/pdf'

// Images (PNG, JPG, TIFF)
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/tiff,image/tif'

// PO Import (CSV/XLSX)
const PO_ACCEPT =
  '.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'

const makeId = (): string =>
  `file-${Date.now()}-${Math.floor(Math.random() * 100000)}`

const isPdf = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

const isImage = (file: File) =>
  ['image/png', 'image/jpeg', 'image/tiff', 'image/webp'].includes(file.type) ||
  /\.(png|jpe?g|tiff?|webp|svg|bmp)$/i.test(file.name)

const isSupportedDocument = (file: File): boolean => {
  if (!file) return false
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const allowedExts = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'csv',
    'ppt',
    'pptx',
    'txt',
    'rtf',
    'log',
    'png',
    'jpg',
    'jpeg',
    'tiff',
    'tif',
    'webp',
    'svg',
    'bmp',
    'zip',
    'rar',
    '7z',
    'json',
    'xml',
  ]
  return allowedExts.includes(ext) || isPdf(file) || isImage(file) || isCsv(file) || isXlsx(file) || Boolean(file.type)
}

const isCsv = (file: File) =>
  file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')

const isXlsx = (file: File) =>
  file.type ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  file.name.toLowerCase().endsWith('.xlsx')

const API_URL = import.meta.env?.VITE_BASE_URL

function downloadTemplate(tenantId: string) {
  const downloadURL = `${API_URL}/form/downloadExcel/${tenantId}/3`
  return downloadURL
}

export {
  DOCUMENT_ACCEPT,
  downloadTemplate,
  IMAGE_ACCEPT,
  isCsv,
  isImage,
  isPdf,
  isSupportedDocument,
  isXlsx,
  makeId,
  MAX_SIZE,
  PDF_ACCEPT,
  PO_ACCEPT,
}
