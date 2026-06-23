export type DetailField = { key?: string; label?: string; value?: any }
export type DetailSection = {
  sectionKey?: string
  title?: string
  fields?: DetailField[] | null
}
export type DetailCard = {
  id: string
  title: string
  iconKey: string
  rows: Array<{ label: string; value: string }>
}

export type WorkspaceDocumentDetail = {
  documentId?: string
  fileName: string
  fileType: string
  fileUrl?: string
  DetailsRow?: DetailSection[] | null
  infoCards?: DetailCard[]
  lineItems?: Array<Record<string, any>> | null
  alert?: { title: string; subtitle: string; badge: string } | null
}

export type TimelineEvent = {
  id?: string
  eventType?: string
  title: string
  description?: string | null
  actorType?: string
  actorName?: string
  createdAtUtc?: string
  isDerived?: boolean
}

export type CommentItem = {
  id?: string
  author?: string
  authorName?: string
  actorName?: string
  createdAtUtc?: string
  date?: string
  message?: string
  comment?: string
  text?: string
  body?: string
  authorUserId?: string
}

const sectionIconMap: Record<string, string> = {
  documentInfo: 'fileText',
  supplierDetails: 'fileText',
  aiAnalysis: 'bot',
  systemInfo: 'clock',
}

export const eventIconMap: Record<string, string> = {
  system: 'fileText',
  ai: 'bot',
  workflow: 'check',
  comment: 'messageSquare',
  user: 'clock',
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
    .filter((section) => Array.isArray(section.fields) && section.fields.length > 0)
    .map((section, index) => ({
      id: section.sectionKey || `section-${index}`,
      title: section.title || section.sectionKey || `Section ${index + 1}`,
      iconKey: sectionIconMap[section.sectionKey || ''] || 'fileText',
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
    }))
    .filter((card) => card.rows.length > 0)
}

export const DOCUMENT_PREVIEW_BASE_URL = 'https://demo.ezofis.com/v6api'
