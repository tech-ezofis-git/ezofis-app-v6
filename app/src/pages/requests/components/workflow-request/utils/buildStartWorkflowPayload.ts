import type { StartWorkflowJsonPayload } from '@/api/v6/workflows'
import { PRESENTATIONAL_TYPES } from './fieldRendering'

export interface StagedFile {
  fileId: string
  repositoryId: string
  fileName?: string
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
            fileId: value.fileId,
            fileName: value.fileName,
            repositoryId: value.repositoryId,
          })
        }
        continue
      }

      formData[field.id] = value
    }
  }

  return {
    context: comment,
    envType: 'trial',
    formData,
    stagedFiles,
  }
}
