/**
 * Helpers for searching form entries through the API
 * (POST /form/{id}/entry/all with `filterBy`).
 *
 * The API matches `criteria` against the physical column names of the form's
 * entry table and silently ignores a filter whose column it cannot find, which
 * would return every row. So the column is only sent when it is resolved from
 * the column names the API itself returned.
 */

const keepLettersDigits = /[\p{L}\p{N}]/u

/** Mirrors the API's label to column rule: "PO Number" -> "PO_Number". */
export const labelToEntryColumn = (label: string) => {
  const chars: string[] = []
  let lastWasUnderscore = false

  for (const char of label.trim()) {
    if (keepLettersDigits.test(char)) {
      chars.push(char)
      lastWasUnderscore = false
    } else if (/\s/.test(char) && chars.length > 0 && !lastWasUnderscore) {
      chars.push('_')
      lastWasUnderscore = true
    }
  }

  while (chars.at(-1) === '_') chars.pop()

  const cleaned = chars.join('')
  if (!cleaned) return ''
  return /^\d/.test(cleaned) ? `F_${cleaned}` : cleaned
}

/** Older forms name the column after the field id instead of its label. */
const fieldIdToEntryColumn = (fieldId: string) =>
  fieldId.replace(/[^\p{L}\p{N}_-]/gu, '')

interface ResolveOptions {
  /** Column names present on the rows the API returned (any entry). */
  availableColumns: string[]
  fieldId: string
  fieldLabel: string
  /** Labels of every field in the form, to detect duplicates. */
  allLabels: string[]
}

/**
 * Finds the entry-table column for a field, or null when it cannot be
 * determined safely (the caller then searches the loaded rows instead).
 */
export const resolveEntryColumn = ({
  allLabels,
  availableColumns,
  fieldId,
  fieldLabel,
}: ResolveOptions): string | null => {
  if (availableColumns.length === 0) return null

  const byLowerCase = new Map(
    availableColumns.map((column) => [column.toLowerCase(), column]),
  )

  // Two fields with the same label get suffixed columns (Address, Address_2)
  // that cannot be told apart by label, so only the field id is trusted then.
  const normalizedLabel = fieldLabel.trim().toLowerCase()
  const isLabelAmbiguous =
    allLabels.filter((label) => label.trim().toLowerCase() === normalizedLabel)
      .length > 1

  const candidates = [
    ...(isLabelAmbiguous ? [] : [labelToEntryColumn(fieldLabel)]),
    fieldIdToEntryColumn(fieldId),
  ].filter(Boolean)

  for (const candidate of candidates) {
    const match = byLowerCase.get(candidate.toLowerCase())
    if (match) return match
  }

  return null
}

export const buildEntrySearchPayload = ({
  criteria,
  itemsPerPage,
  value,
}: {
  criteria: string
  itemsPerPage: number
  value: string
}) => ({
  currentPage: 1,
  filterBy: [
    {
      filters: [{ condition: 'contains', criteria, value }],
      groupCondition: '',
    },
  ],
  includeFormJson: true,
  itemsPerPage,
  mode: 'browse',
})
