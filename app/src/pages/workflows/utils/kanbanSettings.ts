export const KANBAN_CARD_COLORS = [
  { dot: 'bg-primary-9', id: 'primary', label: 'Purple' },
  { dot: 'bg-green-9', id: 'green', label: 'Green' },
  { dot: 'bg-blue-9', id: 'blue', label: 'Blue' },
  { dot: 'bg-orange-9', id: 'orange', label: 'Orange' },
  { dot: 'bg-red-9', id: 'red', label: 'Red' },
  { dot: 'bg-gray-8', id: 'gray', label: 'Gray' },
] as const

export type KanbanCardColor = (typeof KANBAN_CARD_COLORS)[number]['id']

export type KanbanCardSetting = {
  color: KanbanCardColor
  id: string
  name: string
  nodeIds: string[]
}

const COLOR_ALIASES: Record<string, KanbanCardColor> = {
  blue: 'blue',
  danger: 'red',
  default: 'gray',
  gray: 'gray',
  green: 'green',
  grey: 'gray',
  orange: 'orange',
  primary: 'primary',
  purple: 'primary',
  red: 'red',
  secondary: 'primary',
  success: 'green',
  warning: 'orange',
}

const textOf = (value: unknown) => {
  if (value == null) return ''
  return String(value).trim()
}

export const normalizeKanbanCardColor = (value: unknown): KanbanCardColor => {
  const key = textOf(value).toLowerCase()
  return COLOR_ALIASES[key] || 'primary'
}

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(textOf).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(textOf).filter(Boolean)
    } catch {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    }
  }
  return []
}

const parseOneCard = (
  raw: unknown,
  index: number,
): KanbanCardSetting | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const name = textOf(record.name || record.cardName || record.title)
  const nodeIds = asStringArray(
    record.nodeIds || record.nodes || record.stages || record.workflowNodes,
  )
  if (!name && !nodeIds.length) return null
  return {
    color: normalizeKanbanCardColor(record.color || record.cardColor),
    id: textOf(record.id) || `kanban-card-${index + 1}`,
    name: name || `Card ${index + 1}`,
    nodeIds,
  }
}

export const parseKanbanSettings = (raw: unknown): KanbanCardSetting[] => {
  let source = raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      source = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(source)) return []
  return source
    .map((entry, index) => parseOneCard(entry, index))
    .filter((card): card is KanbanCardSetting => Boolean(card?.nodeIds.length))
}

export const hasKanbanCardSettings = (cards: KanbanCardSetting[]) =>
  cards.some((card) => card.nodeIds.length > 0)

export const kanbanColorDotClass = (color?: string) =>
  KANBAN_CARD_COLORS.find((entry) => entry.id === color)?.dot || 'bg-primary-9'
