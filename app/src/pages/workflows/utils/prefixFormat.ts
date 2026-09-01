import type { PrefixSegment } from '../stores/useWorkflowStore'

export const SEPARATOR_OPTIONS = [
  { id: '-', name: 'Hyphen [-]' },
  { id: '#', name: 'Hash [#]' },
  { id: '_', name: 'Underscore [_]' },
]

export const RESET_CYCLE_OPTIONS = [
  { id: 'year', name: 'Calendar Year [Jan to Dec]' },
  { id: 'month', name: 'Month' },
  { id: 'financial_year', name: 'Financial Year [Apr to Mar]' },
]

export const YEAR_OPTIONS = [
  { id: 'yyyy', name: 'YYYY' },
  { id: 'yy', name: 'YY' },
]

export const MONTH_OPTIONS = [
  { id: 'mmmm', name: 'MMMM' },
  { id: 'mmm', name: 'MMM' },
  { id: 'mm', name: 'MM' },
]

export const TOKEN_TYPE_OPTIONS = [
  { id: 'prefix', name: 'Prefix' },
  { id: 'year', name: 'Year' },
  { id: 'month', name: 'Month' },
  { id: 'formColumn', name: 'Form Column' },
  { id: 'autoIncrement', name: 'Auto Increment' },
  { id: 'currentDate', name: 'Current Date' },
]

const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const pad2 = (n: number) => String(n).padStart(2, '0')

const datePart = (
  date: Date,
  key: 'dd' | 'MM' | 'MMM' | 'MMMM' | 'yy' | 'yyyy',
) => {
  switch (key) {
    case 'dd':
      return pad2(date.getDate())
    case 'MM':
      return pad2(date.getMonth() + 1)
    case 'MMM':
      return MONTH_NAMES_SHORT[date.getMonth()]
    case 'MMMM':
      return MONTH_NAMES_FULL[date.getMonth()]
    case 'yy':
      return String(date.getFullYear()).slice(-2)
    case 'yyyy':
      return String(date.getFullYear())
  }
}

const buildCurrentDatePattern =
  (order: Array<'dd' | 'MM' | 'MMM' | 'MMMM' | 'yy' | 'yyyy'>) =>
  (date: Date) =>
    order.map((part) => datePart(date, part)).join('')

const CURRENT_DATE_PATTERNS: Record<string, (date: Date) => string> = {
  ddMMMMyy: buildCurrentDatePattern(['dd', 'MMMM', 'yy']),
  ddMMMMyyyy: buildCurrentDatePattern(['dd', 'MMMM', 'yyyy']),
  ddMMMyy: buildCurrentDatePattern(['dd', 'MMM', 'yy']),
  ddMMMyyyy: buildCurrentDatePattern(['dd', 'MMM', 'yyyy']),
  ddMMyy: buildCurrentDatePattern(['dd', 'MM', 'yy']),
  ddMMyyyy: buildCurrentDatePattern(['dd', 'MM', 'yyyy']),
  MMddyy: buildCurrentDatePattern(['MM', 'dd', 'yy']),
  MMddyyyy: buildCurrentDatePattern(['MM', 'dd', 'yyyy']),
  MMMddyy: buildCurrentDatePattern(['MMM', 'dd', 'yy']),
  MMMddyyyy: buildCurrentDatePattern(['MMM', 'dd', 'yyyy']),
  MMMMddyy: buildCurrentDatePattern(['MMMM', 'dd', 'yy']),
  MMMMddyyyy: buildCurrentDatePattern(['MMMM', 'dd', 'yyyy']),
  yyMMdd: buildCurrentDatePattern(['yy', 'MM', 'dd']),
  yyMMMdd: buildCurrentDatePattern(['yy', 'MMM', 'dd']),
  yyMMMMdd: buildCurrentDatePattern(['yy', 'MMMM', 'dd']),
  yyyyMMdd: buildCurrentDatePattern(['yyyy', 'MM', 'dd']),
  yyyyMMMdd: buildCurrentDatePattern(['yyyy', 'MMM', 'dd']),
  yyyyMMMMdd: buildCurrentDatePattern(['yyyy', 'MMMM', 'dd']),
}

export const CURRENT_DATE_OPTIONS = Object.keys(CURRENT_DATE_PATTERNS).map(
  (key) => ({ id: key, name: CURRENT_DATE_PATTERNS[key](new Date()) }),
)

export const getSeparator = (segments: PrefixSegment[]) =>
  String(segments.find((s) => s.key === 'seperator')?.value || '-')

export const getResetCycle = (segments: PrefixSegment[]) =>
  String(segments.find((s) => s.key === 'reset')?.value || '')

export const getFormatPreview = (
  segments: PrefixSegment[],
  formFieldLabelsById: Record<string, string> = {},
) => {
  const separator = getSeparator(segments)
  const now = new Date()
  const tokenSegments = segments.filter(
    (s) => s.key !== 'seperator' && s.key !== 'reset',
  )

  const parts = tokenSegments
    .map((segment) => {
      switch (segment.key) {
        case 'prefix':
          return String(segment.value || '')
        case 'year':
          return datePart(now, segment.value === 'yy' ? 'yy' : 'yyyy')
        case 'month': {
          if (segment.value === 'mmmm') return datePart(now, 'MMMM')
          if (segment.value === 'mmm') return datePart(now, 'MMM')
          return datePart(now, 'MM')
        }
        case 'formColumn': {
          const ids = String(segment.value || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
          return ids.map((id) => formFieldLabelsById[id] || id).join(separator)
        }
        case 'autoIncrement': {
          const digits = Math.max(1, Number(segment.value) || 1)
          return '1'.padStart(digits, '0')
        }
        case 'currentDate': {
          const pattern = CURRENT_DATE_PATTERNS[String(segment.value)]
          return pattern ? pattern(now) : ''
        }
        default:
          return ''
      }
    })
    .filter(Boolean)

  return parts.join(separator)
}
