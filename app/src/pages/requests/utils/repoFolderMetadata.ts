// Helpers for building repository-attachment metadata off the repository's
// OWN field schema (GET /repositories/:repoId), rather than guessing field
// names from the workflow's form. Every attachment filed under the same
// workflow instance is the same "document" conceptually, so it should carry
// forward whatever metadata an existing attachment already has — except
// the one field that actually varies per document (the deepest `level` in
// the schema, e.g. a folder-structure's last segment, or otherwise simply
// the most specific field defined). See instanceAttachmentUpload.ts for
// where this is used to auto-fill the shared fields and only prompt the
// uploader for that one.

export interface RepositoryFieldSchema {
  id: string
  name: string
  sqlColumnName: string
  dataType?: string
  includeInFolderStructure?: boolean
  isMandatory?: boolean
  level?: number
  optionsJson?: string | null
}

// optionsJson shows up in a couple of shapes in the wild:
// `["Pre Sales","Sales"]`, `{"type":"predefined","values":[...]}}`, or
// `{"type":"unique","values":[]}` (free text, no fixed options).
export const parseFieldOptionValues = (
  field: Pick<RepositoryFieldSchema, 'optionsJson'>,
): string[] => {
  if (!field.optionsJson) return []
  try {
    const parsed = JSON.parse(field.optionsJson)
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string')
    }
    if (parsed && Array.isArray(parsed.values)) {
      return (parsed.values as unknown[]).filter(
        (v): v is string => typeof v === 'string',
      )
    }
  } catch {
    // Not JSON, or unexpected shape — treat as no fixed options.
  }
  return []
}

// All of a repository's real (non-decorative) fields, in `level` order.
// Not gated on includeInFolderStructure — plenty of repositories (this
// one included) never set that flag but still define `level`, and even
// when every field is level 0 the metadata still needs inheriting.
export const getFolderStructureFields = (
  fields: RepositoryFieldSchema[] = [],
): RepositoryFieldSchema[] =>
  fields
    .filter((f) => f?.sqlColumnName)
    .slice()
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))

// The one field the uploader should be asked for — the most specific one
// (highest `level`; last-defined field when levels are tied/unset) —
// since it's the field that actually distinguishes one document from
// another, while everything else carries over unchanged.
export const getDeepestFolderField = (
  fields: RepositoryFieldSchema[] = [],
): RepositoryFieldSchema | null => {
  const ordered = getFolderStructureFields(fields)
  if (ordered.length === 0) return null
  return ordered.reduce(
    (max, f) => ((f.level ?? 0) >= (max.level ?? 0) ? f : max),
    ordered[0],
  )
}

export const isIndexingFieldRequired = (
  field: RepositoryFieldSchema,
): boolean => Boolean(field.isMandatory)

export const getMissingIndexingFields = (
  folderFields: RepositoryFieldSchema[],
  values: Record<string, string>,
): string[] =>
  folderFields
    .filter(
      (field) =>
        isIndexingFieldRequired(field) &&
        !String(values[field.sqlColumnName] || '').trim(),
    )
    .map((field) => field.name)

export const sortIndexingFields = <
  T extends { isMandatory?: boolean; level?: number },
>(
  fields: T[] = [],
): T[] =>
  fields.slice().sort((a, b) => {
    const mandatoryDiff =
      Number(Boolean(b.isMandatory)) - Number(Boolean(a.isMandatory))
    if (mandatoryDiff !== 0) return mandatoryDiff
    return (a.level ?? 0) - (b.level ?? 0)
  })

const normalizeIndexingKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '')

export const getFileNameWithoutExtension = (fileName: string) => {
  if (!fileName) return ''
  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex <= 0) return fileName
  return fileName.substring(0, lastDotIndex)
}

export const isFilenameField = (
  field: Pick<RepositoryFieldSchema, 'name' | 'sqlColumnName'>,
): boolean => {
  const normName = normalizeIndexingKey(field.name || '')
  const normSql = normalizeIndexingKey(field.sqlColumnName || '')
  return (
    normName === 'filename' ||
    normSql === 'filename' ||
    normName === 'file' ||
    normSql === 'file' ||
    normName === 'documentname' ||
    normSql === 'documentname'
  )
}

// Flattens the indexing form's values (keyed by sqlColumnName) into the
// metadata payload the upload endpoint expects — duplicated under both
// sqlColumnName and name since existing repository items were indexed under
// either key depending on when they were filed.
export const toUploadMetadata = (
  folderFields: RepositoryFieldSchema[],
  values: Record<string, string>,
): Record<string, string> => {
  const next: Record<string, string> = {}
  for (const field of folderFields) {
    const value = String(
      values[field.sqlColumnName] || values[field.name] || '',
    ).trim()
    next[field.sqlColumnName] = value
    if (field.name) next[field.name] = value
  }
  return next
}

export const applyFilenamePreFill = (
  values: Record<string, string>,
  folderFields: RepositoryFieldSchema[],
  fileName?: string,
): Record<string, string> => {
  const cleanFileName = getFileNameWithoutExtension(fileName || '')
  if (!cleanFileName) return values
  const next = { ...values }
  for (const field of folderFields) {
    if (isFilenameField(field)) next[field.sqlColumnName] = cleanFileName
  }
  return next
}

interface WorkspaceFieldRow {
  key?: string
  label?: string
  value?: unknown
}

// getRepositoryItemWorkspace's raw shape sections field rows under
// `DetailsRow[].fields[]` (key/label/value) — the same shape
// folderApi.toWorkspaceDetail reads to build the infoCards already shown
// in the attachment preview. Accepts that already-transformed
// `infoCards[].rows` shape too (label/value, no key), for callers that
// only have that.
const collectWorkspaceFieldRows = (workspace: unknown): WorkspaceFieldRow[] => {
  if (!workspace || typeof workspace !== 'object') return []
  const record = workspace as Record<string, unknown>

  if (Array.isArray(record.DetailsRow)) {
    return (
      record.DetailsRow as Array<{ fields?: WorkspaceFieldRow[] }>
    ).flatMap((section) => section?.fields || [])
  }
  if (Array.isArray(record.infoCards)) {
    return (
      record.infoCards as Array<{
        rows?: Array<{ label?: string; value?: unknown }>
      }>
    ).flatMap((card) => card?.rows || [])
  }
  return []
}

const matchesField = (
  row: WorkspaceFieldRow,
  field: RepositoryFieldSchema,
): boolean => {
  const key = String(row.key || '').toLowerCase()
  const label = String(row.label || '').toLowerCase()
  const sqlCol = String(field.sqlColumnName || '').toLowerCase()
  const name = String(field.name || '').toLowerCase()
  return (
    (!!key && key === sqlCol) ||
    (!!label && (label === name || label === sqlCol))
  )
}

// Case-insensitive flat lookup by sqlColumnName — fallback for a caller
// that already hands over a flat, pre-keyed object instead of the raw
// workspace response.
const getFlatValue = (row: unknown, sqlColumnName: string): string => {
  if (!row || typeof row !== 'object' || !sqlColumnName) return ''
  const record = row as Record<string, unknown>
  const directKey = Object.keys(record).find(
    (k) => k.toLowerCase() === sqlColumnName.toLowerCase(),
  )
  if (directKey && record[directKey] != null && record[directKey] !== '') {
    return String(record[directKey])
  }
  return ''
}

// Pulls the value of each given field out of an existing repository item —
// either the raw getRepositoryItemWorkspace response (DetailsRow sections)
// or a flat sqlColumnName-keyed object — keyed by sqlColumnName and ready
// to merge straight into a new attachment's metadata payload.
export const extractExistingFolderMetadata = (
  workspace: unknown,
  fields: RepositoryFieldSchema[],
): Record<string, string> => {
  const rows = collectWorkspaceFieldRows(workspace)
  const result: Record<string, string> = {}

  fields.forEach((f) => {
    if (!f.sqlColumnName) return

    const matchedRow = rows.find((r) => matchesField(r, f))
    if (
      matchedRow &&
      matchedRow.value !== undefined &&
      matchedRow.value !== null &&
      matchedRow.value !== ''
    ) {
      result[f.sqlColumnName] = String(matchedRow.value)
      return
    }

    const flatValue = getFlatValue(workspace, f.sqlColumnName)
    if (flatValue) result[f.sqlColumnName] = flatValue
  })

  return result
}
