export type QueuedFileStatus =
  | 'queued' // added, OCR not yet started
  | 'analyzing' // uploadForOcr in flight
  | 'ready' // OCR finished, fields editable, not yet indexed
  | 'indexing' // UploadFiles in flight for this entry
  | 'indexed' // UploadFiles succeeded
  | 'error' // OCR or index failed (still retryable)

export interface QueuedUploadFile {
  activeTab: 'fields' | 'json'
  exportStatus: 'idle' | 'exporting' | 'success' | 'error'
  fieldValues: Record<string, string>
  file: File
  focusedFieldKey: string | null

  id: string
  isSyncing: boolean
  masterSyncedValues: Record<string, string>
  ocrExtractedValues: Record<string, string>
  ocrStatus: 'idle' | 'analyzing' | 'complete' | 'error'
  previewUrl: string | null
  rawOcrJson: any
  rawOcrText: string

  status: QueuedFileStatus
  syncingField: string | null
  errorMessage?: string
}
