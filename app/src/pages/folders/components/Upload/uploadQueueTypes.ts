import type { StageFileStatus } from '@/api/v6/uploadAndIndex'

export type QueuedFileStatus =
  | 'queued' // added locally, not yet sent to bulkUpload
  | 'analyzing' // staged; bulkUpload job still polling OCR for this file
  | 'ready' // backend status 'OCR' - fields editable, not yet indexed
  | 'indexing' // indexStageFile in flight for this entry
  | 'indexed' // indexStageFile succeeded (ARCHIVED)
  | 'error' // stage/OCR/index failed (still retryable)

export interface QueuedUploadFile {
  activeTab: 'fields' | 'json'
  backendStatus: StageFileStatus | null
  exportStatus: 'idle' | 'exporting' | 'success' | 'error'
  fieldValues: Record<string, string>
  /** Per-field OCR status labels keyed like `fieldValues` (e.g. "Expired · 11 years"). */
  fieldStatuses: Record<string, string>
  // Local binary, present only for files added in this session. Restored
  // entries (from a prior staged session, via listStagedFiles) have none.
  file: File | null
  fileName: string
  fileSize: number
  focusedFieldKey: string | null

  id: string
  isSyncing: boolean
  jobId: string | null
  masterSyncedValues: Record<string, string>
  ocrExtractedValues: Record<string, string>
  ocrStatus: 'idle' | 'analyzing' | 'complete' | 'error'
  previewUrl: string | null
  rawOcrJson: any
  rawOcrText: string
  // True once populated via listStagedFiles/loadStageFile on mount, rather
  // than freshly dropped in this session.
  restoredFromServer: boolean

  stageFileId: string | null
  status: QueuedFileStatus
  syncingField: string | null
  createdAt?: string
  errorMessage?: string
}
