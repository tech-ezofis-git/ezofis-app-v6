export type TableColMeta = { key: string; label: string }

export const isTableType = (fieldType: any) => {
  const t = String(fieldType ?? '').toUpperCase()
  return t === 'DYNAMIC_TABLE' || t === 'TABLE'
}

export const isDecorativeFieldType = (fieldType: unknown) => {
  const type = String(fieldType ?? '').toUpperCase()
  return type === 'DIVIDER' || type === 'LABEL' || type === 'PARAGRAPH'
}

export const isMatrixFieldType = (fieldType: unknown) => {
  return String(fieldType ?? '').toUpperCase() === 'MATRIX'
}

export const isIgnorableField = (field: any) => {
  if (!field) return true
  if (isDecorativeFieldType(field.type)) return true
  if (isMatrixFieldType(field.type)) return true
  if (field.settings?.general?.visibility === 'DISABLE') return true
  return false
}

export const isParentField = (field: any) => {
  const pid = field?.parentId
  return pid === 0 || pid === '0'
}

export const getFieldKey = (field: any) =>
  field?.jsonId || field?.id || field?.name

export const getFieldLabel = (field: any) =>
  field?.label || field?.name || getFieldKey(field)

export const toDisplayString = (val: any) => {
  if (val === null || val === undefined || val === '') return '-'
  if (
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'boolean'
  )
    return String(val)
  try {
    return JSON.stringify(val)
  } catch {
    return String(val)
  }
}

export const normalizeTablePayload = (
  safeParse: (v: any) => any,
  rawVal: any,
) => {
  const parsed = typeof rawVal === 'string' ? safeParse(rawVal) : rawVal

  if (Array.isArray(parsed)) return { meta: null as any, rows: parsed }

  if (parsed && typeof parsed === 'object') {
    const rows =
      (parsed as any).rows || (parsed as any).data || (parsed as any).items
    if (Array.isArray(rows)) return { meta: parsed, rows }
  }

  return { meta: parsed, rows: [] as any[] }
}

export const deriveRowKeys = (rows: any[]) => {
  if (!rows?.length) return []
  const first = rows[0]

  if (typeof first !== 'object' || first === null || Array.isArray(first)) {
    return ['Value']
  }

  const keys = new Set<string>()
  rows.forEach((r: any) => {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      Object.keys(r).forEach((k) => keys.add(k))
    }
  })

  return Array.from(keys)
}

export const buildTableMeta = (
  allPanels: any[],
): Map<string, TableColMeta[]> => {
  const controlsFlat: any[] = []

  allPanels.forEach((panel: any) => {
    const controls =
      panel?.controlList || panel?.controllist || panel?.fields || []
    if (Array.isArray(controls)) controlsFlat.push(...controls)
  })

  const tableParentIds = new Set<string>()
  controlsFlat.forEach((f) => {
    if (isIgnorableField(f)) return
    if (!isParentField(f)) return
    if (!isTableType(f.type)) return
    const parentId = f?.id
    if (parentId !== undefined && parentId !== null)
      tableParentIds.add(String(parentId))
  })

  const map = new Map<string, TableColMeta[]>()
  tableParentIds.forEach((pid) => map.set(pid, []))

  controlsFlat.forEach((f) => {
    if (isIgnorableField(f)) return
    const pid = f?.parentId
    if (pid === undefined || pid === null) return

    const pidStr = String(pid)
    if (!tableParentIds.has(pidStr)) return

    const key = String(f?.jsonId || f?.id || f?.name || '')
    if (!key) return

    const label = String(getFieldLabel(f) || key)
    const list = map.get(pidStr) || []
    if (!list.some((x) => x.key === key)) list.push({ key, label })
    map.set(pidStr, list)
  })

  return map
}
