/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolveRuntimeFieldType } from './runtimeFieldAdapter'

type Row = Record<string, any>

const isTableField = (field: any) => {
  const type = resolveRuntimeFieldType(field)
  return type === 'TABLE' || type === 'DYNAMIC_TABLE'
}

/** Whether a field is a table with configured columns (vs a loose JSON list). */
export function hasConfiguredTableColumns(field: any): boolean {
  const columns = field?.settings?.specific?.tableColumns
  return isTableField(field) && Array.isArray(columns) && columns.length > 0
}

/**
 * Rows held by a table value. Form entries store a table as a JSON string,
 * the runtime renderer works with an array; both (and empty values) are read.
 */
export function parseTableRows(value: unknown): Row[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // not valid JSON: treated as no rows
    }
  }
  return []
}

/**
 * Table rows as stored in a form entry (JSON string). Attached `File` objects
 * cannot be serialized, so a file cell keeps its name and size only.
 */
export function serializeTableRows(rows: Row[]): string {
  return JSON.stringify(rows, (key, val) =>
    key === 'rawFile' ? undefined : val,
  )
}

/**
 * Copy of a form model where every configured table's JSON-string value is
 * parsed into rows, so column validation sees the same shape the renderer
 * does. Other values are untouched.
 */
export function withParsedTableValues(
  panels: any[] = [],
  model: Record<string, any> = {},
): Record<string, any> {
  const next = { ...model }
  for (const panel of panels) {
    for (const field of panel?.fields || []) {
      if (!hasConfiguredTableColumns(field)) continue
      for (const key of [field.id, field.jsonId]) {
        if (key && typeof next[key] === 'string') {
          next[key] = parseTableRows(next[key])
        }
      }
    }
  }
  return next
}
