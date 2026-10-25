/**
 * Single source of truth for the colors a report column value can be
 * highlighted with (status pills). The `id` is what gets stored in
 * `ReportStatusRule.color` / `statusDefault` and what the report agent must
 * return. Class strings are written out literally so Tailwind picks them up.
 */
export interface ReportHighlightColor {
  className: string
  /** Light-theme solid (step 9) hex — reference only, for the agent prompt. */
  hex: string
  id: string
  name: string
  usage: string
}

export const REPORT_HIGHLIGHT_COLORS: ReportHighlightColor[] = [
  {
    className: 'border-gray-4 bg-gray-2 text-gray-10',
    hex: '#8181a0',
    id: 'gray',
    name: 'Gray',
    usage: 'Neutral, inactive, draft, not started, unknown',
  },
  {
    className: 'border-green-5 bg-green-3 text-green-11',
    hex: '#30a46c',
    id: 'green',
    name: 'Green',
    usage: 'Success, approved, completed, active, paid',
  },
  {
    className: 'border-red-5 bg-red-3 text-red-11',
    hex: '#e5484d',
    id: 'red',
    name: 'Red',
    usage: 'Error, rejected, overdue, failed, escalated',
  },
  {
    className: 'border-orange-5 bg-orange-3 text-orange-11',
    hex: '#f76b15',
    id: 'orange',
    name: 'Orange',
    usage: 'Warning, pending, on hold, due soon',
  },
  {
    className: 'border-yellow-6 bg-yellow-3 text-yellow-11',
    hex: '#ffc53d',
    id: 'yellow',
    name: 'Yellow',
    usage: 'Attention, needs review, partially done',
  },
  {
    className: 'border-blue-5 bg-blue-3 text-blue-11',
    hex: '#0090ff',
    id: 'blue',
    name: 'Blue',
    usage: 'Info, in progress, submitted, open',
  },
  {
    className: 'border-primary-5 bg-primary-3 text-primary-11',
    hex: '#7c5cff',
    id: 'primary',
    name: 'Primary (brand purple)',
    usage: 'Brand highlight, featured, current',
  },
  {
    className: 'border-secondary-5 bg-secondary-3 text-secondary-11',
    hex: '#00bcd4',
    id: 'secondary',
    name: 'Secondary (brand cyan)',
    usage: 'Secondary brand highlight',
  },
  {
    className: 'border-tertiary-5 bg-tertiary-3 text-tertiary-11',
    hex: '#30a46c',
    id: 'tertiary',
    name: 'Tertiary (brand green)',
    usage: 'Tertiary brand highlight',
  },
  {
    className: 'border-purple-5 bg-purple-3 text-purple-11',
    hex: '#8e4ec6',
    id: 'purple',
    name: 'Purple',
    usage: 'Category / grouping',
  },
  {
    className: 'border-violet-5 bg-violet-3 text-violet-11',
    hex: '#6e56cf',
    id: 'violet',
    name: 'Violet',
    usage: 'Category / grouping',
  },
  {
    className: 'border-indigo-5 bg-indigo-3 text-indigo-11',
    hex: '#3e63dd',
    id: 'indigo',
    name: 'Indigo',
    usage: 'Category / grouping',
  },
  {
    className: 'border-cyan-5 bg-cyan-3 text-cyan-11',
    hex: '#00a2c7',
    id: 'cyan',
    name: 'Cyan',
    usage: 'Category / grouping',
  },
  {
    className: 'border-teal-5 bg-teal-3 text-teal-11',
    hex: '#12a594',
    id: 'teal',
    name: 'Teal',
    usage: 'Category / grouping',
  },
  {
    className: 'border-pink-5 bg-pink-3 text-pink-11',
    hex: '#d6409f',
    id: 'pink',
    name: 'Pink',
    usage: 'Category / grouping',
  },
  {
    className: 'border-bronze-5 bg-bronze-3 text-bronze-11',
    hex: '#a18072',
    id: 'bronze',
    name: 'Bronze',
    usage: 'Category / grouping',
  },
  {
    className: 'border-gold-5 bg-gold-3 text-gold-11',
    hex: '#978365',
    id: 'gold',
    name: 'Gold',
    usage: 'Category / grouping, premium tier',
  },
]

export const DEFAULT_HIGHLIGHT_COLOR = 'gray'

const COLOR_BY_ID = new Map(REPORT_HIGHLIGHT_COLORS.map((c) => [c.id, c]))

const COLOR_ALIASES: Record<string, string> = {
  danger: 'red',
  error: 'red',
  grey: 'gray',
  info: 'blue',
  neutral: 'gray',
  success: 'green',
  warning: 'orange',
}

/**
 * Agent output isn't guaranteed to be exact, so accept "Red", "red-9",
 * "success" etc. and map them onto a palette id; anything unknown falls back
 * to gray.
 */
export const normalizeHighlightColor = (value: string | undefined): string => {
  const key = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-_\s]?a?\d+$/, '')
  const id = COLOR_ALIASES[key] ?? key
  return COLOR_BY_ID.has(id) ? id : DEFAULT_HIGHLIGHT_COLOR
}

export const getHighlightColorClass = (value: string | undefined): string =>
  COLOR_BY_ID.get(normalizeHighlightColor(value))!.className

export const HIGHLIGHT_COLOR_OPTIONS = REPORT_HIGHLIGHT_COLORS.map((c) => ({
  id: c.id,
  name: c.name,
}))

/** Ready-to-paste highlight instructions for the report agent's prompt. */
export const REPORT_AGENT_COLOR_PROMPT = [
  'To highlight a column\'s values, add a "highlight" object to that column in reportSpec.columns:',
  '"highlight": { "default": "<color id or null>", "rules": [ { "op": "...", "value": ..., "value2": ..., "compareField": "...", "color": "<color id>", "label": "..." } ] }',
  '- op: eq | neq | contains | notContains | gt | gte | lt | lte | between | empty | notEmpty',
  '- gt/gte/lt/lte/between compare numerically (currency symbols and commas are ignored); text ops are case-insensitive.',
  '- between uses value (min) and value2 (max).',
  '- compareField: another column key to compare against instead of value (e.g. Total gt ALT_Total).',
  '- label is optional; omit it to show the cell value itself.',
  '- Rules are checked in order and the first match wins, so put the most specific rule first.',
  '- default: color for values that match no rule; null leaves them gray.',
  '- Omit "highlight" (or use null) for columns that need no color.',
  '',
  'color must be exactly one of these ids:',
  ...REPORT_HIGHLIGHT_COLORS.map(
    (c) => `- ${c.id} (${c.hex}): ${c.usage}`,
  ),
  `If unsure, use "${DEFAULT_HIGHLIGHT_COLOR}". Return the id only, never a hex code.`,
].join('\n')
