import type { ReportSpecColumn } from '@/api/v6/reportAgent'
import type { ReportFieldSetting } from '../types'
import { normalizeHighlightColor } from '../highlightColors'
import { createDefaultFieldSetting } from '../types'

const toText = (value: unknown) =>
  value === null || value === undefined ? '' : String(value)

/**
 * Converts an agent `reportSpec` column into the report's field setting. A
 * column with `highlight` rules becomes a status column keyed on itself, so
 * OverviewTab renders its values as colored pills.
 */
export const reportSpecColumnToFieldSetting = (
  column: ReportSpecColumn,
): ReportFieldSetting => {
  const setting = createDefaultFieldSetting(column.label || column.key)
  const rules = column.highlight?.rules ?? []
  if (rules.length === 0) return setting

  return {
    ...setting,
    colType: 'status',
    statusBase: column.key,
    statusDefault: normalizeHighlightColor(
      column.highlight?.default ?? undefined,
    ),
    statusRules: rules.map((rule, index) => ({
      color: normalizeHighlightColor(rule.color),
      compareField: rule.compareField || undefined,
      id: `${column.key}-r${index + 1}`,
      label: toText(rule.label),
      match: toText(rule.value),
      operator: rule.op,
      value2: toText(rule.value2) || undefined,
    })),
  }
}

/** Field settings for every selected column of an agent report spec. */
export const reportSpecToFieldSettings = (
  columns: ReportSpecColumn[],
): Record<string, ReportFieldSetting> =>
  Object.fromEntries(
    columns
      .filter((column) => column.selected !== false)
      .map((column) => [column.key, reportSpecColumnToFieldSetting(column)]),
  )
