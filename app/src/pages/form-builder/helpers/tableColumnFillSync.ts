// "Fill Value" for NUMBER / DATE / DATE_TIME table columns: a column can take
// its value from another column of the same row, or from a master-table row
// matched on another column's value. Stored on the column as
// specific.defaultValueType = 'ASSIGN_PARENT_FIELD' | 'MASTER' with
// specific.parentFieldId (the source column id) and, for MASTER,
// specific.masterFormId / masterFormColumn.

export const FILL_SYNC_COLUMN_TYPES = ['NUMBER', 'DATE', 'DATE_TIME']

type AnyColumn = {
  id: string
  type?: string
  settings?: { specific?: Record<string, any> }
}

const specificOf = (col: AnyColumn) => col?.settings?.specific || {}

/** Columns that mirror `sourceColId`'s cell value. */
export function getCopyTargets<T extends AnyColumn>(
  columns: T[],
  sourceColId: string,
): T[] {
  return columns.filter(
    (c) =>
      c.id !== sourceColId &&
      specificOf(c).defaultValueType === 'ASSIGN_PARENT_FIELD' &&
      String(specificOf(c).parentFieldId || '') === sourceColId,
  )
}

/** Columns filled from a master table row matched on `sourceColId`. */
export function getMasterTargets<T extends AnyColumn>(
  columns: T[],
  sourceColId: string,
): T[] {
  return columns.filter((c) => {
    const s = specificOf(c)
    return (
      c.id !== sourceColId &&
      s.defaultValueType === 'MASTER' &&
      Boolean(s.masterFormId) &&
      Boolean(s.masterFormColumn) &&
      String(s.parentFieldId || '') === sourceColId
    )
  })
}

/**
 * The master-form column to match `sourceCol`'s value against: the master
 * column that column itself lists (V5 behaviour), else its own header.
 */
export function getMasterMatchColumn(sourceCol: AnyColumn & { name?: string }) {
  return String(specificOf(sourceCol).masterFormColumn || sourceCol.name || '')
}
