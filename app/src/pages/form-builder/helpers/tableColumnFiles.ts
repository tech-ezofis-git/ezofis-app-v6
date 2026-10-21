/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const FILE_COLUMN_TYPES = ['FILE_UPLOAD', 'IMAGE', 'IMAGE_UPLOAD']

// Column types extracted text (OCR / address pieces) must never be written into
const NON_TEXT_TARGET_TYPES = [
  'CALCULATED',
  'FILE_UPLOAD',
  'IMAGE',
  'IMAGE_UPLOAD',
  'LABEL',
  'SERIAL_NUMBER',
]

export interface ColumnFileInfo {
  name?: string
  size?: number
}

const isBlank = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)

// Formats a table cell stores: DATE "YYYY-MM-DD", TIME "HH:mm" (24 h),
// DATE_TIME "YYYY-MM-DD HH:mm".
const DATE_INPUT_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'DD/MM/YYYY',
  'DD-MM-YYYY',
  'DD.MM.YYYY',
  'D/M/YYYY',
  'D-M-YYYY',
  'DD MMM YYYY',
  'D MMM YYYY',
  'DD-MMM-YYYY',
  'DD MMMM YYYY',
  'D MMMM YYYY',
  'MMM D, YYYY',
  'MMMM D, YYYY',
]
const TIME_INPUT_FORMATS = [
  'HH:mm',
  'HH:mm:ss',
  'H:mm',
  'h:mm A',
  'h:mm a',
  'hh:mm A',
  'h:mm:ss A',
]

// Same normalisation top-level OCR mapping uses: ignore case, asterisks and
// repeated whitespace so "Bill No *" matches "Bill No".
const normalizeName = (s: string) =>
  s.replace(/\*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

const fileKey = (entry: Record<string, any>) =>
  `${entry?.fileName ?? entry?.name ?? ''}|${entry?.fileSize ?? entry?.size ?? ''}`

/**
 * New picks added to a cell's value. A multiple-files column appends (skipping
 * a file that is already attached); otherwise the newest file replaces the
 * old one, as before.
 */
export function addFilesToValue(
  col: any,
  current: unknown,
  entries: Array<Record<string, any>>,
): unknown {
  if (entries.length === 0) return current
  if (!isMultiFileColumn(col)) return entries[entries.length - 1]
  const list = toFileList(current)
  const known = new Set(list.map(fileKey))
  const added = entries.filter((e) => !known.has(fileKey(e)))
  return [...list, ...added]
}

/**
 * OCR field hints for `uploadForOcr`, in the same "Name,TYPE" shape the
 * top-level upload field sends for its auto-fill controls.
 */
export function buildColumnOcrHints(targets: any[]): string[] {
  return targets
    .map((t) => ({
      name: String(t?.name || t?.label || '').trim(),
      type: t?.type || 'SHORT_TEXT',
    }))
    .filter((t) => t.name)
    .map((t) => `${t.name},${t.type}`)
}

/** Allowed extensions (lower case, no dot); empty means no restriction. */
export function getColumnAllowedFileTypes(col: any): string[] {
  const raw = col?.settings?.validation?.allowedFileTypes
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[\n,]/)
      : []
  return list
    .map((t) => String(t).trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean)
}

/**
 * Checks one file against the column's type and size limits. Returns the
 * error message, or undefined when the file is acceptable or has no
 * restrictions. A missing size is not treated as a violation (already
 * uploaded files only carry their name).
 */
export function getColumnFileError(
  col: any,
  file: ColumnFileInfo,
): string | undefined {
  const types = getColumnAllowedFileTypes(col)
  const name = String(file.name || '')
  if (types.length > 0 && name) {
    const dot = name.lastIndexOf('.')
    const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
    if (!types.includes(ext)) return `should be a ${types.join(' | ')} file`
  }
  const maxMb = getColumnMaxFileSizeMb(col)
  if (maxMb !== undefined && typeof file.size === 'number') {
    if (file.size / (1024 * 1024) > maxMb) {
      return `file size should not be more than ${maxMb} mb`
    }
  }
  return undefined
}

/** Maximum size in MB (`validation.maxFileSize`), or undefined when unset. */
export function getColumnMaxFileSizeMb(col: any): number | undefined {
  const raw = col?.settings?.validation?.maxFileSize
  if (raw === undefined || raw === null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Sibling columns an uploaded document should fill (the same
 * `validation.assignOtherControls` key top-level upload fields use). Columns
 * that cannot hold extracted text are skipped.
 */
export function getColumnOcrTargets(col: any, siblings: any[]): any[] {
  const raw = col?.settings?.validation?.assignOtherControls
  const ids = new Set(Array.isArray(raw) ? raw.map(String) : [])
  if (ids.size === 0) return []
  return siblings.filter(
    (c) =>
      c?.id &&
      c.id !== col?.id &&
      ids.has(String(c.id)) &&
      isTextFillableColumn(c),
  )
}

/**
 * True while a file column in the same row is set to fill `col` and holds no
 * file yet — the cell stays disabled until the document is uploaded. A cell
 * that already has a value (a saved row) is never locked.
 */
export function isAwaitingColumnFile(
  col: any,
  row: Record<string, any> | undefined,
  siblings: any[],
): boolean {
  if (!col?.id || isFileColumnType(col.type)) return false
  const cellValue = (c: any) =>
    row?.[c.id] ?? (c.name ? row?.[c.name] : undefined)
  if (!isBlank(cellValue(col))) return false
  const sources = siblings.filter(
    (c) =>
      c?.id !== col.id &&
      isFileColumnType(c?.type) &&
      getColumnOcrTargets(c, siblings).some((t) => t.id === col.id),
  )
  if (sources.length === 0) return false
  return sources.every((src) => isBlank(cellValue(src)))
}

/**
 * Value for the picker's `accept` attribute. Configured types win; otherwise
 * image columns keep their `image/*` filter and plain file columns stay open.
 */
export function getFileInputAccept(
  col: any,
  isImageColumn: boolean,
): string | undefined {
  const types = getColumnAllowedFileTypes(col)
  if (types.length > 0) return types.map((t) => `.${t}`).join(',')
  return isImageColumn ? 'image/*' : undefined
}

/** Name and size of whatever a file cell currently stores. */
export function getStoredFileInfo(value: unknown): ColumnFileInfo {
  if (typeof value === 'string') return { name: value }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const v = value as Record<string, any>
  const size = v.fileSize ?? v.size ?? v.rawFile?.size
  return {
    name: v.fileName ?? v.name ?? v.rawFile?.name,
    size: typeof size === 'number' ? size : undefined,
  }
}

/**
 * Submit-time check of everything a cell holds (one file or several).
 * Returns the first violation; with more than one file it names the file.
 */
export function getStoredFilesError(
  col: any,
  value: unknown,
): string | undefined {
  const list = toFileList(value)
  for (const entry of list) {
    const info = getStoredFileInfo(entry)
    const error = getColumnFileError(col, info)
    if (error) {
      return Array.isArray(value) && info.name
        ? `${error} (${info.name})`
        : error
    }
  }
  return undefined
}

/** FILE_UPLOAD, IMAGE_UPLOAD and the V5 IMAGE alias share one file cell. */
export function isFileColumnType(type: unknown): boolean {
  return FILE_COLUMN_TYPES.includes(String(type || '').toUpperCase())
}

/** Whether the column accepts several files (`specific.allowMultipleFiles`). */
export function isMultiFileColumn(col: any): boolean {
  return col?.settings?.specific?.allowMultipleFiles === true
}

/** Whether a column can receive text written from another column's action. */
export function isTextFillableColumn(col: any): boolean {
  return !NON_TEXT_TARGET_TYPES.includes(String(col?.type || '').toUpperCase())
}

/**
 * Turns OCR results (`[{ name, value }]` from `uploadForOcr`) into a patch for
 * one row, limited to the columns the upload was set to fill. A non-empty cell
 * is only replaced when `overwrite` is true (a single-file column re-reading
 * its replacement document); otherwise user-entered values are kept.
 */
export function mapOcrToRowPatch(
  targets: any[],
  ocrFieldList: Array<{ name?: string; value?: unknown }> | undefined,
  row: Record<string, any> | undefined,
  overwrite: boolean,
): Record<string, number | string> {
  const patch: Record<string, number | string> = {}
  if (!Array.isArray(ocrFieldList)) return patch
  for (const item of ocrFieldList) {
    const rawName = String(item?.name ?? '')
    const name = normalizeName(rawName.split(',')[0] || '')
    const value = item?.value
    if (!name || isBlank(value)) continue
    const target = targets.find(
      (t) => normalizeName(String(t?.name || t?.label || '')) === name,
    )
    if (!target) continue
    const existing = row?.[target.id] ?? (target.name ? row?.[target.name] : '')
    if (!overwrite && !isBlank(existing)) continue
    const converted = normalizeOcrValue(target, value)
    if (converted !== undefined) patch[target.id] = converted
  }
  return patch
}

/**
 * An extracted document value in the format the target column stores, or
 * undefined when it cannot be read as that type (it is then left out rather
 * than written as text the cell would show blank).
 * Dates are read as day-month-year first (14/10/2026), then year-first and
 * written-month forms. Numbers ignore currency symbols and thousands commas.
 */
export function normalizeOcrValue(
  col: any,
  value: unknown,
): number | string | undefined {
  const text = String(value ?? '').trim()
  if (!text) return undefined
  const type = String(col?.type || '').toUpperCase()

  if (type === 'DATE') {
    const parsed = dayjs(text, DATE_INPUT_FORMATS, true)
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined
  }
  if (type === 'TIME') {
    const parsed = dayjs(text, TIME_INPUT_FORMATS, true)
    return parsed.isValid() ? parsed.format('HH:mm') : undefined
  }
  if (type === 'DATE_TIME') {
    const combos = DATE_INPUT_FORMATS.flatMap((d) =>
      TIME_INPUT_FORMATS.map((t) => `${d} ${t}`),
    )
    const parsed = dayjs(text, combos, true)
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD HH:mm')
    const dateOnly = dayjs(text, DATE_INPUT_FORMATS, true)
    return dateOnly.isValid()
      ? dateOnly.format('YYYY-MM-DD') + ' 00:00'
      : undefined
  }
  if (type === 'NUMBER' || type === 'COUNTER' || type === 'CURRENCY_AMOUNT') {
    const cleaned = text.replace(/[^0-9.,-]/g, '').replace(/,/g, '')
    const n = Number(cleaned)
    return cleaned !== '' && Number.isFinite(n) ? n : undefined
  }
  return text
}

/** Removes the file at `index`; an emptied multi-file cell becomes null. */
export function removeFileFromValue(
  col: any,
  current: unknown,
  index: number,
): unknown {
  if (!isMultiFileColumn(col)) return null
  const next = toFileList(current).filter((_, i) => i !== index)
  return next.length > 0 ? next : null
}

/** Files held by a cell, whether it stores none, one object, or a list. */
export function toFileList(value: unknown): Array<Record<string, any>> {
  if (isBlank(value)) return []
  if (Array.isArray(value)) {
    return value.filter((v) => v && typeof v === 'object')
  }
  if (typeof value === 'string') return [{ fileName: value }]
  return typeof value === 'object' ? [value as Record<string, any>] : []
}
