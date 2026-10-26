// Identifier-like names with no word separator ("workflowid", "transactionid").
const COMPACT_ID_NAMES =
  /^(workflow|item|instance|process|transaction|request|form|repository|repo|folder|file|document|doc|user|session|tenant|record|ticket|activity|stage|task|entry|row|parent|wf|w)?(id|ids|uuid|guid)$/

const ID_TOKENS = new Set(['guid', 'id', 'ids', 'uuid'])

/** Splits `workflow_Id`, `Instance-ID`, `processId`, `Item ID` into words. */
const tokenize = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean)

const looksLikeId = (value: string | undefined) => {
  if (!value) return false
  const tokens = tokenize(value)
  if (tokens.length === 0) return false
  if (ID_TOKENS.has(tokens[0]) || ID_TOKENS.has(tokens[tokens.length - 1]))
    return true
  return COMPACT_ID_NAMES.test(tokens.join(''))
}

/**
 * Internal identifier columns (workflow id, item id, instance id, process id,
 * transaction id, ...) in any spacing/casing — not shown in report tables.
 * The label decides when there is one, so a bare `id` key labelled "Req No"
 * (the request number) stays visible.
 */
export const isIdColumn = (key: string, label?: string) => {
  if (looksLikeId(label)) return true
  if (label && key.trim().toLowerCase() === 'id') return false
  return looksLikeId(key)
}

export const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[\s_-]/g, '')

const VALUE_ALIASES: Record<string, string[]> = {
  filename: ['filename', 'file_name', 'originalfilename', 'original_file_name'],
  repository: ['repository', 'repositoryname', 'repository_name'],
  repositoryname: ['repository', 'repositoryname', 'repository_name'],
}

const cellText = (value: unknown): string | undefined => {
  if (value == null || value === '') return undefined
  return typeof value === 'string' ? value : String(value)
}

/** Read a live report cell by key, label, or compact alias (File Name / FileName). */
export const pickRowValue = (
  row: Record<string, unknown> | undefined,
  ...names: Array<string | undefined>
): string | undefined => {
  if (!row) return undefined
  for (const name of names) {
    if (!name) continue
    const direct = cellText(row[name])
    if (direct != null) return direct
  }
  const wants = new Set<string>()
  for (const name of names) {
    if (!name) continue
    const compact = normalizeKey(name)
    wants.add(compact)
    for (const alias of VALUE_ALIASES[compact] || []) wants.add(alias)
  }
  for (const [key, value] of Object.entries(row)) {
    const text = cellText(value)
    if (text == null) continue
    if (wants.has(normalizeKey(key))) return text
  }
  return undefined
}

// Workflow name repeats on every row of a single-workflow report.
// Repository / File Name are data columns on folder reports and must stay visible.
const SOURCE_NAME_COLUMNS = new Set(['workflow', 'workflowname'])

/** Columns report tables don't display: ids and the source workflow/repository. */
export const isHiddenReportColumn = (key: string, label?: string) =>
  isIdColumn(key, label) ||
  SOURCE_NAME_COLUMNS.has(normalizeKey(key)) ||
  SOURCE_NAME_COLUMNS.has(normalizeKey(label ?? ''))

/**
 * Finds a `userPrompt` value (any of `userPrompt`, `user_prompt`,
 * `User Prompt`, ...) at the top level of each source or one level down.
 */
export const findUserPrompt = (...sources: unknown[]): string => {
  const visit = (value: unknown, depth: number): string => {
    if (!value || typeof value !== 'object' || depth > 2) return ''
    const entries = Object.entries(value as Record<string, unknown>)
    for (const [key, entry] of entries) {
      if (
        normalizeKey(key) === 'userprompt' &&
        typeof entry === 'string' &&
        entry.trim()
      )
        return entry
    }
    for (const [, entry] of entries) {
      if (Array.isArray(entry)) continue
      const found = visit(entry, depth + 1)
      if (found) return found
    }
    return ''
  }

  for (const source of sources) {
    let value = source
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch {
        continue
      }
    }
    const found = visit(value, 0)
    if (found) return found
  }
  return ''
}
