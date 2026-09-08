import type { ReportFieldSetting } from '../types'

export interface ResolvedStatus {
  color: string
  label: string
}

/**
 * Applies a field's computed-status rules to a row's raw value, falling
 * back to the field's default color/the raw value itself when no rule
 * matches.
 */
export const resolveFieldStatus = (
  setting: ReportFieldSetting | undefined,
  row: Record<string, string>,
): ResolvedStatus | null => {
  if (!setting || setting.colType !== 'status') return null

  const baseField = setting.statusBase
  const rawValue = baseField ? row[baseField] : undefined
  if (rawValue === undefined) return null

  const rule = (setting.statusRules || []).find((r) => r.match === rawValue)
  if (rule) return { color: rule.color, label: rule.label }

  return { color: setting.statusDefault || 'gray', label: rawValue }
}
