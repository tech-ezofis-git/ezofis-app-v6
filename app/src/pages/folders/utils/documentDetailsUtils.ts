import { getV6ApiBaseUrl } from '@/api/axios'
import { formatUtcToLocalDateTime } from '@/utils/utcDate'

export type CommentItem = {
  actorName?: string
  author?: string
  authorName?: string
  authorUserId?: string
  body?: string
  comment?: string
  createdAtUtc?: string
  date?: string
  id?: string
  message?: string
  text?: string
}
export type DetailCard = {
  iconKey: string
  id: string
  rows: Array<{ label: string; value: string }>
  title: string
}
export type DetailField = { key?: string; label?: string; value?: any }

export type DetailSection = {
  fields?: DetailField[] | null
  sectionKey?: string
  title?: string
}

export type TimelineEvent = {
  actorName?: string
  actorType?: string
  createdAtUtc?: string
  description?: string | null
  eventType?: string
  id?: string
  isDerived?: boolean
  title: string
}

export type WorkspaceDocumentDetail = {
  alert?: { badge: string; subtitle: string; title: string } | null
  DetailsRow?: DetailSection[] | null
  documentId?: string
  fileName: string
  fileType: string
  fileUrl?: string
  infoCards?: DetailCard[]
  lineItems?: Array<Record<string, any>> | null
}

const sectionIconMap: Record<string, string> = {
  aiAnalysis: 'bot',
  documentInfo: 'fileText',
  supplierDetails: 'fileText',
  systemInfo: 'clock',
}

export const eventIconMap: Record<string, string> = {
  ai: 'bot',
  comment: 'messageSquare',
  system: 'fileText',
  user: 'clock',
  workflow: 'check',
}

export const toDisplayValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export const formatDateTime = (value?: string) => {
  if (!value) return ''
  return formatUtcToLocalDateTime(value, value)
}

export const buildInfoCards = (
  data: WorkspaceDocumentDetail | null,
): DetailCard[] => {
  if (!data) return []
  if (Array.isArray(data.infoCards) && data.infoCards.length > 0)
    return data.infoCards

  const sections = Array.isArray(data.DetailsRow) ? data.DetailsRow : []

  return sections
    .filter(
      (section) => Array.isArray(section.fields) && section.fields.length > 0,
    )
    .map((section, index) => ({
      iconKey: sectionIconMap[section.sectionKey || ''] || 'fileText',
      id: section.sectionKey || `section-${index}`,
      rows: (section.fields || [])
        .filter(
          (field) =>
            field &&
            field.value !== null &&
            field.value !== undefined &&
            field.value !== '',
        )
        .map((field) => ({
          label: field.label || field.key || '-',
          value: toDisplayValue(field.value),
        })),
      title: section.title || section.sectionKey || `Section ${index + 1}`,
    }))
    .filter((card) => card.rows.length > 0)
}

export const getDocumentPreviewBaseUrl = (): string => {
  const apiUrl = getV6ApiBaseUrl()
  return apiUrl.replace(/\/api\/?$/, '')
}

export const DOCUMENT_PREVIEW_BASE_URL = getDocumentPreviewBaseUrl()

const GENERIC_BLOB_TYPES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/force-download',
  'application/download',
])

export type DocumentPreviewKind =
  | 'image'
  | 'office'
  | 'pdf'
  | 'tiff'
  | 'unsupported'

export const OFFICE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'ppt',
  'pptx',
  'rtf',
  'odt',
  'ods',
  'odp',
])

const OFFICE_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'application/rtf',
  'text/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
])

export const getFileExtension = (fileName?: string | null) => {
  const name = String(fileName || '')
    .trim()
    .toLowerCase()
  if (!name.includes('.')) return ''
  return (
    name
      .split('.')
      .pop()
      ?.replace(/[^a-z0-9]/g, '') || ''
  )
}

/** Prefer real Content-Type; fall back to file extension when the API returns a generic blob type. */
export const resolvePreviewMimeType = (
  blobType?: string | null,
  fileName?: string | null,
  fileTypeHint?: string | null,
) => {
  const mime = String(blobType || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  if (mime && !GENERIC_BLOB_TYPES.has(mime)) return mime

  const ext = getFileExtension(fileName) || getFileExtension(fileTypeHint)
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'tif' || ext === 'tiff') return 'image/tiff'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'bmp') return 'image/bmp'
  if (ext === 'docx')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (ext === 'doc') return 'application/msword'
  if (ext === 'xlsx')
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (ext === 'xls') return 'application/vnd.ms-excel'
  if (ext === 'pptx')
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (ext === 'ppt') return 'application/vnd.ms-powerpoint'
  if (ext === 'csv') return 'text/csv'
  if (ext === 'rtf') return 'application/rtf'

  const hint = String(fileTypeHint || '').toLowerCase()
  if (hint.includes('pdf')) return 'application/pdf'
  if (hint.includes('png')) return 'image/png'
  if (hint.includes('jpg') || hint.includes('jpeg')) return 'image/jpeg'
  if (hint.includes('tif')) return 'image/tiff'

  return mime
}

export const resolveDocumentPreviewKind = (
  mimeType?: string | null,
  fileName?: string | null,
): DocumentPreviewKind => {
  const mime = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const ext = getFileExtension(fileName)

  if (
    mime === 'application/pdf' ||
    mime === 'application/x-pdf' ||
    ext === 'pdf'
  ) {
    return 'pdf'
  }

  if (
    mime === 'image/tiff' ||
    mime === 'image/tif' ||
    ext === 'tif' ||
    ext === 'tiff'
  ) {
    return 'tiff'
  }

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)
  ) {
    return 'image'
  }

  if (
    OFFICE_EXTENSIONS.has(ext) ||
    OFFICE_MIME_TYPES.has(mime) ||
    mime.includes('officedocument') ||
    mime.includes('msword') ||
    mime.includes('ms-excel') ||
    mime.includes('ms-powerpoint')
  ) {
    return 'office'
  }

  return 'unsupported'
}

/** Sniff common file signatures when Content-Type / extension are missing. */
export const sniffBlobMimeType = async (blob: Blob): Promise<string> => {
  try {
    const header = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
    if (
      header.length >= 4 &&
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46
    ) {
      return 'application/pdf'
    }
    if (
      header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      return 'image/png'
    }
    if (
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff
    ) {
      return 'image/jpeg'
    }
    if (
      header.length >= 4 &&
      ((header[0] === 0x49 &&
        header[1] === 0x49 &&
        header[2] === 0x2a &&
        header[3] === 0x00) ||
        (header[0] === 0x4d &&
          header[1] === 0x4d &&
          header[2] === 0x00 &&
          header[3] === 0x2a))
    ) {
      return 'image/tiff'
    }
  } catch {
    // ignore sniff errors
  }
  return String(blob.type || '')
}
