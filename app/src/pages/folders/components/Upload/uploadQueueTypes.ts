import type { StageFileStatus } from '@/api/v6/uploadAndIndex'
import type { LargeUploadProgress } from '@/lib/largeUpload/LargeFileUploader'

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
  /** Per-field OCR status labels keyed like `fieldValues` (e.g. "Expired · 11 years"). */
  fieldStatuses: Record<string, string>
  fieldValues: Record<string, string>
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
  /** Server id of a large (chunked) upload still in progress; becomes `stageFileId` when done. */
  largeUploadFileId?: string | null
  /** Auth headers for a remote `previewUrl`: large PDFs stream page by page instead of downloading. */
  previewHeaders?: Record<string, string> | null
  /** Large file too big to preview here (not a PDF); shown as "preview not available". */
  previewTooLarge?: boolean
  /** Bytes sent / speed / time left while a large file uploads (status stays 'analyzing'). */
  uploadProgress?: LargeUploadProgress | null
}
