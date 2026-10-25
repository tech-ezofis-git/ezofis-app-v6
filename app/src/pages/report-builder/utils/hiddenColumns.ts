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

const normalizeKey = (key: string) => key.toLowerCase().replace(/[\s_-]/g, '')

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
