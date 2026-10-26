import type { ReportFieldSetting } from '../types'
import { matchesHighlightRule } from './matchHighlightRule'

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

  // First matching rule wins, so order rules from most to least specific.
  const rule = (setting.statusRules || []).find((r) =>
    matchesHighlightRule(r, rawValue, row),
  )
  if (rule) return { color: rule.color, label: rule.label || rawValue }

  return { color: setting.statusDefault || 'gray', label: rawValue }
}
