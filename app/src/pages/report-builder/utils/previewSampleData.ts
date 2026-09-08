export interface PreviewColumn {
  id: string
  label: string
  sampleType: PreviewSampleType
  choiceLabels?: string[]
}

export type PreviewSampleType =
  | 'calculated'
  | 'choice'
  | 'date'
  | 'number'
  | 'text'
  | 'user'

const SAMPLE_TEXT = [
  'Acme Corp',
  'Nimbus Traders',
  'Delta Logistics',
  'Orbit Retail',
]
const SAMPLE_USERS = ['A. Sharma', 'J. Fernandes', 'R. Gomez', 'K. Patel']
const DEFAULT_CHOICES = ['Pending', 'Approved', 'On Hold', 'Completed']

/**
 * Synthetic cell value generator shared by the Fields step's live preview
 * and the Report Detail Overview table — there's no real records API to pull
 * actual row data from yet, so both render the same deterministic mock data
 * for a given column type/row index.
 */
export const sampleValue = (column: PreviewColumn, row: number): string => {
  switch (column.sampleType) {
    case 'number':
      return (1200 + row * 340).toLocaleString()
    case 'calculated':
      return (1200 + row * 340 * 1.18).toFixed(2)
    case 'date':
      return new Date(Date.now() - row * 3 * 86400000).toLocaleDateString()
    case 'choice': {
      const labels = column.choiceLabels?.length
        ? column.choiceLabels
        : DEFAULT_CHOICES
      return labels[row % labels.length]
    }
    case 'user':
      return SAMPLE_USERS[row % SAMPLE_USERS.length]
    default:
      return SAMPLE_TEXT[row % SAMPLE_TEXT.length]
  }
}

const CHOICE_QUESTION_TYPES = new Set([
  'SINGLE_SELECT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
])

/** Question.type (form-builder field types) → preview sample type. */
export const sampleTypeForQuestionType = (type: string): PreviewSampleType => {
  if (type === 'CALCULATED') return 'calculated'
  if (['NUMBER', 'CURRENCY_AMOUNT', 'COUNTER'].includes(type)) return 'number'
  if (['DATE', 'DATE_TIME', 'TIME'].includes(type)) return 'date'
  if (CHOICE_QUESTION_TYPES.has(type)) return 'choice'
  return 'text'
}

const SAMPLE_TYPE_BY_DOMAIN_FIELD_TYPE: Record<string, PreviewSampleType> = {
  Choice: 'choice',
  Date: 'date',
  Number: 'number',
  Text: 'text',
  User: 'user',
}

/** Legacy DomainField.type → preview sample type. */
export const sampleTypeForDomainFieldType = (type: string): PreviewSampleType =>
  SAMPLE_TYPE_BY_DOMAIN_FIELD_TYPE[type] || 'text'

export const buildSampleRows = (
  columns: PreviewColumn[],
  rowCount = 8,
): Record<string, string>[] =>
  Array.from({ length: rowCount }).map((_, row) =>
    Object.fromEntries(
      columns.map((column) => [column.id, sampleValue(column, row)]),
    ),
  )
