import type { SubWorkflowPrefillField } from '../types'

const SKIPPED_TYPES = new Set(['DIVIDER', 'LABEL', 'PARAGRAPH'])
const TABLE_TYPES = new Set(['DYNAMIC_TABLE', 'TABLE'])

const fieldKey = (field: any) =>
  String(field?.label || field?.type || '')
    .trim()
    .toLowerCase()

const isTable = (field: any) => TABLE_TYPES.has(String(field?.type))

const tableColumns = (field: any): any[] =>
  field?.settings?.specific?.tableColumns || []

/** Flattens form panels (or an already-flat field list) into fields. */
export const flattenFormFields = (panelsOrFields: any[]): any[] =>
  (panelsOrFields || []).flatMap((item) =>
    Array.isArray(item?.fields) ? item.fields : [item],
  )

const copyTableRows = (parent: any, child: any, rows: unknown) => {
  if (!Array.isArray(rows)) return []
  const columnMap = new Map<string, string>()
  for (const childCol of tableColumns(child)) {
    const match = tableColumns(parent).find(
      (c) => fieldKey(c) !== '' && fieldKey(c) === fieldKey(childCol),
    )
    if (match) columnMap.set(String(match.id), String(childCol.id))
  }
  return rows.map((row: any) => {
    const out: Record<string, unknown> = {}
    for (const [from, to] of columnMap) {
      if (row && from in row) out[to] = structuredClone(row[from])
    }
    return out
  })
}

// V5 pre-fill (SubWorkflow.vue:4303-4378): copy each parent value into the
// child field with the same label, once. Tables copy rows, keeping only the
// columns whose labels match. Layout-only and disabled child fields are
// skipped; values are copied as-is (no type conversion).
export const buildSubWorkflowPrefill = (
  parentFields: any[],
  parentModel: Record<string, unknown>,
  childFields: any[],
): SubWorkflowPrefillField[] => {
  const result: SubWorkflowPrefillField[] = []
  const used = new Set<string>()

  for (const child of childFields) {
    const type = String(child?.type || '')
    if (SKIPPED_TYPES.has(type)) continue
    if (child?.settings?.general?.visibility === 'DISABLE') continue
    if (!child?.label && !isTable(child)) continue

    const key = fieldKey(child)
    const parent = parentFields.find(
      (p) => !used.has(String(p.id)) && key !== '' && fieldKey(p) === key,
    )
    if (!parent) continue

    const raw = parentModel?.[parent.id]
    if (raw === undefined) continue

    let value: unknown
    if (isTable(child) && isTable(parent)) {
      value = copyTableRows(parent, child, raw)
    } else if (isTable(child) || isTable(parent)) {
      continue
    } else {
      value = structuredClone(raw)
    }

    used.add(String(parent.id))
    result.push({
      label: String(child.label || type),
      sourceId: String(parent.id),
      targetId: String(child.id),
      type,
      value,
    })
  }
  return result
}

const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) &&
    value.every(
      (row) =>
        row == null ||
        (typeof row === 'object' &&
          Object.values(row).every((v) => v === '' || v == null)),
    ))

/** Applies a pre-fill onto the child model without overwriting typed values. */
export const applySubWorkflowPrefill = (
  childModel: Record<string, unknown>,
  prefill: SubWorkflowPrefillField[],
) => {
  const next = { ...childModel }
  for (const { targetId, value } of prefill) {
    if (isEmptyValue(next[targetId])) next[targetId] = value
  }
  return next
}
