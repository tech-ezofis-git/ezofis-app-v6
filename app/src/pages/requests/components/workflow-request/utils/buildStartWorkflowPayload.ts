import type { StartWorkflowJsonPayload } from '@/api/v6/workflows'
import {
  findFormFieldIdByName,
  PRESENTATIONAL_TYPES,
  SYNTHETIC_FIELD_PREFIX,
} from './fieldRendering'

export interface StagedFile {
  fileId: string
  repositoryId: string
  fileName?: string
  // Identify which FILE_UPLOAD/IMAGE_UPLOAD field this entry came from, so a
  // form with multiple file fields can be re-associated on the backend.
  // Undefined for extraAttachments (sidebar attachments aren't tied to a
  // field). itemId mirrors fileId, matching the convention already used by
  // FieldRenderer's onOpenAttachment call.
  fieldId?: string
  fieldName?: string
  itemId?: string
  jsonId?: string
}

const FILE_FIELD_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD'])

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
  const stagedFiles: StagedFile[] = [...extraAttachments]

  for (const panel of panels || []) {
    for (const field of panel.fields || []) {
      if (PRESENTATIONAL_TYPES.has(field.type)) continue

      const value = formModel[field.id]
      if (value === undefined || value === null) continue

      if (FILE_FIELD_TYPES.has(field.type)) {
        if (value.fileId && value.repositoryId) {
          stagedFiles.push({
            fieldId: field.id,
            fieldName: field.label,
            fileId: value.fileId,
            fileName: value.fileName,
            itemId: value.fileId,
            jsonId: field.id,
            repositoryId: value.repositoryId,
          })
        }
        continue
      }

      formData[field.id] = value
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

  return {
    context: comment,
    envType: 'trial',
    formData,
    stagedFiles,
  }
}
