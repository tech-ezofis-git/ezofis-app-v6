import type { StartWorkflowJsonPayload } from '@/api/v6/workflows'
import {
  isFileColumnType,
  toFileList,
} from '@/pages/form-builder/helpers/tableColumnFiles'
import {
  findFormFieldIdByName,
  PRESENTATIONAL_TYPES,
  SYNTHETIC_FIELD_PREFIX,
} from './fieldRendering'

export interface StagedFile {
  fileId: string
  repositoryId: string
  // Identify which FILE_UPLOAD/IMAGE_UPLOAD field this entry came from, so a
  // form with multiple file fields can be re-associated on the backend.
  // Undefined for extraAttachments (sidebar attachments aren't tied to a
  // field).
  fieldId?: string
  fieldName?: string
  fileName?: string
  jsonId?: string
}

const FILE_FIELD_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD'])

const toStagedFile = (file: StagedFile & { itemId?: string }): StagedFile => {
  const { itemId: _itemId, ...rest } = file
  return rest
}

/**
 * Builds the body for POST /Workflows/{id}/start/json, per the "Normal
 * Workflow — Frontend Integration Guide" (PR #40, Aug 2026):
 * - `formData` is a flat object keyed by each field's jsonId (== field.id
 *   in this form-builder schema — confirmed against the same ids
 *   InboxList.tsx already reads off submitted formData, e.g.
 *   'RXwLGHILLrreMmRqlk9mj' for PO Number).
 * - File fields are NOT included in formData. Each one must already have
 *   been uploaded via uploadAndIndex.uploadWithOcr (see FieldRenderer's
 *   FILE_UPLOAD case), and is passed here as a { repositoryId, fileId }
 *   entry in `stagedFiles` instead.
 */
export const buildStartWorkflowPayload = (
  panels: any[],
  formModel: Record<string, any>,
  // General attachments added via the sidebar (not tied to any specific
  // form field) and an optional initiator note — both folded into the same
  // documented payload shape rather than invented fields: extra files just
  // become more `stagedFiles` entries, the note becomes `context`.
  extraAttachments: StagedFile[] = [],
  comment = '',
): StartWorkflowJsonPayload => {
  const formData: Record<string, any> = {}
  const stagedFiles: StagedFile[] = extraAttachments.map(toStagedFile)

  for (const panel of panels || []) {
    for (const field of panel.fields || []) {
      if (PRESENTATIONAL_TYPES.has(field.type)) continue

      const value = formModel[field.id]
      if (value === undefined || value === null) continue

      if (FILE_FIELD_TYPES.has(field.type)) {
        const fileId = String(value.fileId || value.itemId || '').trim()
        const repositoryId = String(value.repositoryId || '').trim()
        if (fileId && repositoryId) {
          stagedFiles.push({
            fieldId: field.id,
            fieldName: field.label,
            fileId,
            fileName: value.fileName,
            jsonId: field.id,
            repositoryId,
          })
        }
        continue
      }

      formData[field.id] = value

      // Files picked in a table's file columns: the backend flattens every
      // table cell to text and turns an object cell into "", so the row
      // carries the file name as a plain string. The file itself is attached
      // after the request starts (useWorkflowForm) - staging it here makes the
      // backend write its id over the whole table.
      if (Array.isArray(value)) {
        const fileColumns = (field.settings?.specific?.tableColumns || []).filter(
          (c: any) => c?.id && isFileColumnType(c.type),
        )
        if (fileColumns.length === 0) continue
        formData[field.id] = value.map((row: any) => {
          const nextRow = { ...row }
          for (const col of fileColumns) {
            const names = toFileList(row?.[col.id])
              .map((file) => String(file.fileName ?? ''))
              .filter(Boolean)
            if (names.length > 0) nextRow[col.id] = names.join(', ')
          }
          return nextRow
        })
      }
    }
  }

  // Every repository field is held in formModel under its own repo-native
  // id (see fieldRendering.ts) — fold it into formData by repository field
  // name, UNLESS it also matches a real form field, in which case the panel
  // loop above already submitted it under that field's real jsonId (the two
  // slots are kept mirrored, so either one has the current value — only one
  // should end up in the payload).
  for (const [key, value] of Object.entries(formModel)) {
    if (!key.startsWith(SYNTHETIC_FIELD_PREFIX)) continue
    if (value === undefined || value === null || value === '') continue
    const name = key.slice(SYNTHETIC_FIELD_PREFIX.length)
    if (findFormFieldIdByName(panels, name)) continue
    formData[name] = value
  }

  const keyByName = isKeyByNameEnabled()
  const payload = {
    context: comment,
    envType: 'trial',
    formData: keyByName ? rekeyFormDataByName(panels, formData) : formData,
    stagedFiles,
  }
  // Debug aid for the table-file investigation: shows exactly what start/json
  // is sent. Run localStorage.setItem('debugStartKeysByName', '1') to send
  // field/column names as keys instead of ids.
  console.log('[start/json] keyed by', keyByName ? 'name' : 'id', payload)
  return payload
}

const isKeyByNameEnabled = (): boolean => {
  try {
    return localStorage.getItem('debugStartKeysByName') === '1'
  } catch {
    return false
  }
}

/**
 * Same formData with every field keyed by its name (label as fallback) and
 * every table row's cells keyed by column name, instead of by id.
 */
export const rekeyFormDataByName = (
  panels: any[],
  formData: Record<string, any>,
): Record<string, any> => {
  const out: Record<string, any> = {}
  const fieldById = new Map<string, any>()
  for (const panel of panels || []) {
    for (const field of panel.fields || []) fieldById.set(field.id, field)
  }
  for (const [key, value] of Object.entries(formData)) {
    const field = fieldById.get(key)
    if (!field) {
      out[key] = value
      continue
    }
    const columns: any[] = field.settings?.specific?.tableColumns || []
    out[field.name || field.label || key] =
      Array.isArray(value) && columns.length > 0
        ? value.map((row: any) => {
            const next: Record<string, any> = {}
            for (const [cellKey, cellValue] of Object.entries(row || {})) {
              const col = columns.find((c) => c.id === cellKey)
              next[col ? col.name || col.label || cellKey : cellKey] = cellValue
            }
            return next
          })
        : value
  }
  return out
}
