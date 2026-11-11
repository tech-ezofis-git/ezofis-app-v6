import type { SlaSelection } from './slaSettings'

/** Helpers for the Custom Setup screen. The API repeats the rule lookup in WorkflowSlaRuleSelector. */

export type EntryRow = Record<string, unknown>
export type SlaLevel = { what: string; when: string }

const asRow = (value: unknown): EntryRow =>
  value && typeof value === 'object' ? (value as EntryRow) : {}

/** "Response_Time", "response time" → "responsetime" (as the API matches labels). */
export const normalizeLabel = (label: unknown) =>
  String(label ?? '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

/** GET /form/{id}/entry/all → { entries: [...] } (or a bare array). */
export const entryList = (data: unknown): EntryRow[] => {
  const list = Array.isArray(data)
    ? data
    : (asRow(data).entries ?? asRow(asRow(data).data).entries)
  return Array.isArray(list) ? list.map(asRow) : []
}

const toText = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value).trim()
}

/** An entry's value for a field: by jsonId, else a key matching its label. */
export const fieldValue = (
  entry: EntryRow,
  field: { id: string; label: string },
) => {
  const direct = toText(entry[field.id] ?? asRow(entry.formData)[field.id])
  if (direct) return direct
  const target = normalizeLabel(field.label)
  const key = Object.keys(entry).find((k) => normalizeLabel(k) === target)
  return key ? toText(entry[key]) : ''
}

export const entryKey = (entry: EntryRow) =>
  String(entry.item_id ?? entry.itemId ?? entry.id ?? '')

/** Compared without case or extra spaces. */
const sameText = (a: unknown, b: unknown) => {
  const clean = (t: unknown) =>
    String(t ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
  return clean(a) === clean(b)
}

/** A cell may hold the entry's id or its name. */
export const findEntryId = (
  text: unknown,
  entries: { id: number | string; name: string }[],
) => {
  const value = String(text ?? '').trim()
  if (!value) return null
  const found =
    entries.find((e) => String(e.id) === value) ??
    entries.find((e) => sameText(e.name, value))
  return found ? String(found.id) : null
}

export type RulePick = {
  entryId: null | string
  source: 'default' | 'none' | 'value'
}

/** Which rule a request with this value gets. Falls back to the default rule. */
export const findRuleForValue = (
  selection: SlaSelection,
  value: string,
  entries: { id: number | string; name: string }[],
  /** Column method: the rule named in the selected record. */
  recordRule?: (value: string) => string | undefined,
): RulePick => {
  let entryId: null | string = null
  if (selection.method === 'map')
    entryId =
      selection.valueRules.find((r) => sameText(r.value, value))?.entryId ??
      null
  else if (selection.method === 'sameName')
    entryId = findEntryId(value, entries)
  else entryId = findEntryId(recordRule?.(value), entries)

  if (entryId) return { entryId, source: 'value' }
  return selection.defaultEntryId
    ? { entryId: selection.defaultEntryId, source: 'default' }
    : { entryId: null, source: 'none' }
}

/** The line under the rule choice. Counts only, so it works for any field. */
export const selectionStatus = (
  total: number,
  withRule: number,
  hasDefault: boolean,
): { text: string; tone: 'ok' | 'warn' } => {
  const left = total - withRule
  if (total === 0)
    return { text: 'This field has no options yet.', tone: 'warn' }
  if (left === 0)
    return {
      text:
        total === 1
          ? 'This option has a time limit rule.'
          : `All ${total} options have a time limit rule.`,
      tone: 'ok',
    }
  if (withRule === 0)
    return {
      text:
        total === 1
          ? `No time limit rule has been selected for this option. ${hasDefault ? 'The default rule will be used for it.' : 'It will have no time limit.'}`
          : `No time limit rules have been selected for these ${total} options. ${hasDefault ? 'The default rule will be used for all of them.' : 'They will have no time limit.'}`,
      tone: 'warn',
    }
  return {
    text: `${withRule} out of ${total} options ${withRule === 1 ? 'has' : 'have'} a time limit rule. ${left === 1 ? 'The remaining option' : `The remaining ${left} options`} ${hasDefault ? 'will use the default rule.' : 'will have no time limit.'}`,
    tone: 'warn',
  }
}

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(toText).filter(Boolean)
  const text = toText(value)
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      return asList(JSON.parse(text))
    } catch {
      return [text]
    }
  }
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

const whenText = (after: unknown, unit: unknown) => {
  const amount = toText(after)
  const word = toText(unit).toLowerCase() || 'minutes'
  return `After ${amount} ${amount === '1' ? word.replace(/s$/, '') : word}`
}

type FormField = {
  id: string
  label?: string
  settings?: unknown
}

/**
 * The levels of an SLA form entry as a person reads them: from its SLA Steps
 * table, or from the older time columns. `name` turns a saved user id into a
 * name.
 */
export const readLevels = (
  entry: EntryRow | undefined,
  fields: FormField[],
  isBlock: boolean,
  name: (id: string) => string = (id) => id,
): SlaLevel[] => {
  if (!entry) return []
  const people = (value: unknown) => asList(value).map(name).join(', ')
  const steps = fields.find(
    (f) => normalizeLabel(f.label) === normalizeLabel('SLA Steps'),
  )
  if (steps) {
    const raw = entry[steps.id] ?? asRow(entry.formData)[steps.id]
    const key = Object.keys(entry).find(
      (k) => normalizeLabel(k) === normalizeLabel('SLA Steps'),
    )
    const rows = asRowList(raw ?? (key ? entry[key] : undefined))
    const settings = steps.settings as
      | { specific?: { tableColumns?: { id: string; label: string }[] } }
      | undefined
    const columns = settings?.specific?.tableColumns ?? []
    return rows.flatMap((row) => stepLevels(row, columns, people))
  }

  const prefix = isBlock ? 'Response' : 'Resolution'
  const label = (text: string) => ({ id: '', label: text })
  const after = fieldValue(entry, label(`${prefix} Time`))
  if (!after) return []
  const when = whenText(after, fieldValue(entry, label(`${prefix} Type`)))
  const notify = people(fieldValue(entry, label('Notify')))
  const escalate = people(fieldValue(entry, label('Escalate')))
  return [
    ...(notify ? [{ what: `Notify ${notify}`, when }] : []),
    ...(escalate ? [{ what: `Escalate to ${escalate}`, when }] : []),
  ]
}

const asRowList = (value: unknown): EntryRow[] => {
  let parsed = value
  if (typeof parsed === 'string' && parsed.trim().startsWith('[')) {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return []
    }
  }
  return Array.isArray(parsed) ? parsed.map(asRow) : []
}

const stepLevels = (
  row: EntryRow,
  columns: { id: string; label: string }[],
  people: (value: unknown) => string,
): SlaLevel[] => {
  const cell = (label: string) => {
    const column = columns.find(
      (c) => normalizeLabel(c.label) === normalizeLabel(label),
    )
    if (column && row[column.id] !== undefined) return row[column.id]
    const key = Object.keys(row).find(
      (k) => normalizeLabel(k) === normalizeLabel(label),
    )
    return key ? row[key] : undefined
  }
  const when = whenText(cell('After'), cell('Time unit') ?? cell('Unit'))

  // The earlier table shape: one Action with one Send to.
  const action = toText(cell('Action')).toLowerCase()
  if (action) {
    const target =
      people(cell('Users')) || toText(cell('Group')) || toText(cell('Stage'))
    return [
      {
        what: `${action === 'escalate' ? 'Escalate to' : 'Notify'} ${target}`.trim(),
        when,
      },
    ]
  }

  const told = [
    people(cell('Notify users')),
    toText(cell('Notify group')),
    ['yes', 'true'].includes(toText(cell('Notify initiator')).toLowerCase())
      ? 'the requester'
      : '',
  ]
    .filter(Boolean)
    .join(', ')
  const target =
    people(cell('Escalate user')) ||
    toText(cell('Escalate group')) ||
    toText(cell('Escalate stage'))
  return [
    ...(told ? [{ what: `Notify ${told}`, when }] : []),
    ...(target ? [{ what: `Escalate to ${target}`, when }] : []),
  ]
}
