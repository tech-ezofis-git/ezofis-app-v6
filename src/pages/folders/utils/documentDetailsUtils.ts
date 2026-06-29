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
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
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

export const DOCUMENT_PREVIEW_BASE_URL = 'https://demo.ezofis.com/v6api'
