/* eslint-disable @typescript-eslint/no-explicit-any */
import { matchRuleValue } from './ruleEngine'

export interface CellRuleState {
  readOnly: boolean
  required: boolean
}

const readCell = (row: Record<string, any> | undefined, col: any) =>
  row?.[col.id] ?? (col.name ? row?.[col.name] : undefined)

/**
 * Per-row conditional mandatory / read-only state for a table's columns.
 *
 * A source column lists rules in `validation.mandatorySettings` /
 * `validation.readonlySettings`, the same shape top-level fields use:
 * `{ id, value, controls: [targetColumnId], notEqual? }`. The rule is
 * evaluated against the source column's value in THIS row (with the form
 * engine's own value matching), and its `controls` are sibling columns of the
 * same table. Only columns a rule actually affects appear in the result.
 *
 * Not supported here (the form engine has no per-row context for them):
 * rules written in the `conditions` form and the target-driven object form.
 */
export function getRowCellRuleStates(
  columns: any[],
  row: Record<string, any> | undefined,
): Record<string, CellRuleState> {
  const states: Record<string, CellRuleState> = {}
  const ids = new Set(columns.map((c) => c?.id).filter(Boolean))

  const mark = (targetId: unknown, key: keyof CellRuleState) => {
    const id = String(targetId)
    if (!ids.has(id)) return
    const existing: CellRuleState = states[id] ?? {
      readOnly: false,
      required: false,
    }
    states[id] = { ...existing, [key]: true }
  }

  for (const source of columns) {
    const validation = source?.settings?.validation
    if (!validation) continue
    const mandatory = Array.isArray(validation.mandatorySettings)
      ? validation.mandatorySettings
      : []
    const readonly = Array.isArray(validation.readonlySettings)
      ? validation.readonlySettings
      : []
    if (mandatory.length === 0 && readonly.length === 0) continue

    const sourceValue = readCell(row, source)

    for (const rule of mandatory) {
      if (!Array.isArray(rule?.controls) || rule.controls.length === 0) continue
      if (
        !matchRuleValue(sourceValue, rule.value, rule.operator || rule.logic)
      ) {
        continue
      }
      for (const target of rule.controls) {
        if (target !== source.id) mark(target, 'required')
      }
    }

    for (const rule of readonly) {
      if (!Array.isArray(rule?.controls) || rule.controls.length === 0) continue
      const matched = matchRuleValue(
        sourceValue,
        rule.value,
        rule.operator || rule.logic,
      )
      if (!(rule.notEqual ? !matched : matched)) continue
      for (const target of rule.controls) {
        if (target !== source.id) mark(target, 'readOnly')
      }
    }
  }

  return states
}
