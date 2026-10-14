/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ColumnOption {
  id: string
  name: string
}

/** Options already resolved for a table, keyed by column id (and parent value). */
export interface ColumnOptionSources {
  masterByColumn?: Record<string, ColumnOption[]>
  masterCascaded?: Record<string, Record<string, ColumnOption[]>>
  repositoryByColumn?: Record<string, ColumnOption[]>
  repositoryCascaded?: Record<string, Record<string, ColumnOption[]>>
  userList?: ColumnOption[]
}

export type ColumnOptionsSource = 'API' | 'LOOKUP' | 'MASTER' | 'USER_LIST'

const isBlank = (v: unknown) => v === undefined || v === null || v === ''

/**
 * Adds any currently selected value that is missing from `options` so a saved
 * selection stays visible when the option list changes or has not loaded yet.
 */
export function ensureSelectedOptions(
  options: ColumnOption[],
  selected: unknown,
): ColumnOption[] {
  const values = (Array.isArray(selected) ? selected : [selected]).filter(
    (v) => !isBlank(v) && typeof v !== 'object',
  )
  const known = new Set(options.map((o) => o.id))
  const extra = values
    .map((v) => String(v))
    .filter((v) => !known.has(v))
    .map((v) => ({ id: v, name: v }))
  return extra.length > 0 ? [...options, ...extra] : options
}

/** Field list (id / label) of a form definition, used to pick a master column. */
export function extractFormFieldChoices(data: any): ColumnOption[] {
  let raw = data?.formJson || data?.data?.formJson || data?.data || data
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return []
    }
  }
  const panels: any[] = raw?.panels || []
  return panels
    .flatMap((p) =>
      (p.fields || []).map((f: any) => ({
        id: String(f.id || f.label || ''),
        name: String(f.label || f.name || f.displayLabel || f.id || ''),
      })),
    )
    .filter((col) => Boolean(col.id))
}

/** Master-table source settings (same keys as top-level fields), if complete. */
export function getColumnMasterConfig(col: any): {
  masterFormColumn: string
  masterFormId: string
  showAllData: boolean
} | null {
  if (getColumnOptionsSource(col) !== 'MASTER') return null
  const specific = col?.settings?.specific
  const masterFormId = String(specific?.masterFormId ?? '').trim()
  const masterFormColumn = String(specific?.masterFormColumn ?? '').trim()
  if (!masterFormId || !masterFormColumn) return null
  return {
    masterFormColumn,
    masterFormId,
    showAllData: Boolean(specific?.showAllData),
  }
}

/**
 * Where a choice column gets its options from. Stored in
 * `lookupSettings.optionsSource`; unset (older columns) means LOOKUP, i.e.
 * the static list unless a repository is configured.
 */
export function getColumnOptionsSource(col: any): ColumnOptionsSource {
  const source = col?.settings?.lookupSettings?.optionsSource
  return source === 'API' || source === 'MASTER' || source === 'USER_LIST'
    ? source
    : 'LOOKUP'
}

/**
 * Splits a static option list. COMMA is the default so existing columns are
 * unchanged; NEWLINE (the top-level `separateOptionsUsing` value) allows
 * options that contain commas.
 */
export function parseColumnOptionList(
  raw: string | undefined | null,
  separator?: string,
): ColumnOption[] {
  const parts = String(raw ?? '').split(separator === 'NEWLINE' ? /\r?\n/ : ',')
  return parts
    .map((opt) => opt.trim())
    .filter(Boolean)
    .map((opt) => ({ id: opt, name: opt }))
}

export function parseColumnOptions(col: any): ColumnOption[] {
  return parseColumnOptionList(
    col?.settings?.specific?.customOptions,
    col?.settings?.specific?.separateOptionsUsing,
  )
}

/**
 * Picks the options a single cell should offer, from whichever source the
 * column uses. Returns undefined when the column has no dynamic source (the
 * caller then falls back to the static list); a dynamic source that has not
 * loaded or has no match returns [] rather than leaking the static list.
 */
export function selectColumnCellOptions(
  col: any,
  row: Record<string, any>,
  sources: ColumnOptionSources,
): ColumnOption[] | undefined {
  const source = getColumnOptionsSource(col)
  const parentColId = col?.settings?.lookupSettings?.cascadeFromColumn
  const parentVal = parentColId ? row?.[parentColId] : undefined

  if (source === 'USER_LIST') return sources.userList ?? []

  if (source === 'MASTER') {
    if (!getColumnMasterConfig(col)) return undefined
    if (parentColId) {
      if (isBlank(parentVal)) return []
      return sources.masterCascaded?.[col.id]?.[String(parentVal)] ?? []
    }
    return sources.masterByColumn?.[col.id] ?? []
  }

  if (source === 'LOOKUP') {
    if (parentColId) {
      if (isBlank(parentVal)) return []
      return sources.repositoryCascaded?.[col.id]?.[String(parentVal)] || []
    }
    return sources.repositoryByColumn?.[col.id]
  }

  return undefined
}
