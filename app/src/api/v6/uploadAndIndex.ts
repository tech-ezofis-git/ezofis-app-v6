import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'

export interface DocumentIntelligentAgentResponse {
  document_intelligent_result: DocumentIntelligentResult
}

export interface DocumentIntelligentCandidate {
  repository_id: string
  repository_name: string
  score: number
  rationale?: string
}

export interface DocumentIntelligentResult {
  candidates: DocumentIntelligentCandidate[]
  confidence_score?: number
  rationale?: string
  repository_id: string | null
  repository_name: string | null
  ocr_text?: string
  source_reference?: string
}

export interface OcrFieldResult {
  name: string
  type: string
  value: string
}

export interface UploadWithOcrResult {
  fileId: string
  fileName: string
  filePath: string
  ocrFieldList: OcrFieldResult[]
  ocrJson: string
  repositoryId: string
}

export function parseApiError(errData: unknown): string {
  if (!errData) return ''
  if (typeof errData === 'string') return errData
  if (typeof errData === 'object') {
    const obj = errData as Record<string, unknown>
    if (typeof obj.error === 'string') return obj.error
    if (typeof obj.message === 'string') return obj.message
    try {
      return JSON.stringify(obj)
    } catch {
      return String(obj)
    }
  }
  return String(errData)
}

const getTenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return { 'X-Tenant-Id': tenantId }
}

interface UploadWithOcrParams {
  file: File
  repositoryId: string
  fields?: string[]
  filename?: string
  // Full repository field set (name -> current value, '' if unfilled) —
  // see buildRepoMetadata in fieldRendering.ts.
  metadata?: Record<string, string>
  // The already-extracted results from an earlier uploadForOcr call on this
  // same file. When present, sent as the `fields` payload instead of the
  // bare "Name,TYPE" hint strings — the hint strings only carry names, so
  // the backend has nothing to echo back for value/type. ocrJson/ocrText
  // are forwarded too so the backend doesn't have to run OCR again.
  ocrFieldList?: { name?: string; type?: string | null; value?: string }[]
  ocrJson?: string
  ocrText?: string
}

// Pre-ticket upload for the normal (non-AP-Agent) workflow flow — see the
// "Normal Workflow — Frontend Integration Guide" (PR #40, Aug 2026).
// Stages the file (temp/monitor + stage table), runs OCR, and returns a
// fileId to be passed as `stagedFiles` on POST /Workflows/{id}/start/json.
const uploadWithOcr = async ({
  fields,
  file,
  filename,
  metadata,
  ocrFieldList,
  ocrJson,
  ocrText,
  repositoryId,
}: UploadWithOcrParams) => {
  const response: { data: UploadWithOcrResult | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('repositoryId', repositoryId)
    if (filename) formData.append('filename', filename)
    if (ocrFieldList && ocrFieldList.length > 0) {
      formData.append('fields', JSON.stringify(ocrFieldList))
    } else if (fields && fields.length > 0) {
      formData.append('fields', JSON.stringify(fields))
    }
    if (ocrJson) formData.append('ocrJson', ocrJson)
    if (ocrText) formData.append('ocrText', ocrText)
    if (metadata) formData.append('metadata', JSON.stringify(metadata))

    const { data, status } = await axiosV6({
      data: formData,
      headers: {
        ...getTenantHeaders(),
        'Content-Type': 'multipart/form-data',
      },
      method: 'POST',
      url: '/uploadAndIndex/uploadWithOcr',
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data as UploadWithOcrResult
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error uploading file'
  }
  return response
}

export interface BulkUploadFileResult {
  error: string | null
  fileId: string
  fileName: string
  filePath: string
  ocrFieldList: OcrFieldResult[]
  ocrJson: string
  repositoryId: string
  status: 'Queued'
  succeeded: boolean
}

export interface BulkUploadJobStatus {
  errorMessage: string | null
  files: JobStatusFileEntry[]
  hangfireState: HangfireState
  isTerminal: boolean
  jobId: string
  ocrCompleted: number
  ocrFailed: number
  ocrPending: number
  repositoryId: string
}

export interface BulkUploadResponse {
  failed: number
  files: BulkUploadFileResult[]
  jobId: string
  message: string
  repositoryId: string
  succeeded: number
}

export type HangfireState = 'Enqueued' | 'Failed' | 'Processing' | 'Succeeded'

// Confirmed against a real PUT /uploadAndIndex/index/{fileId} request body.
export interface IndexStageFileRequest {
  fields: IndexStageFileRequestField[]
  itemId: string | null
  ocrResult: unknown | null
  repositoryId: string | null
  status: 'Indexing'
}

export interface IndexStageFileRequestField {
  name: string
  type: string
  value: string
}

export interface IndexStageFileResponse {
  [key: string]: unknown
  fileName: string
  itemId: string
  filePath?: string
}

export interface JobStatusFileEntry {
  error: string | null
  fileId: string
  fileName: string
  status: StageFileStatus
}

// Confirmed against a real POST /uploadAndIndex/load/{fileId} response.
export interface LoadStageFileField {
  name: string
  type: string
  value: string
}

export interface LoadStageFileResponse {
  [key: string]: unknown
  error: string | null
  fields: LoadStageFileField[]
  id: string
  name: string
  status: StageFileStatus
  archivePath?: string
  createdAt?: string
  createdBy?: string
  filePath?: string
  hangfireJobId?: string | null
  isDeleted?: boolean
  isVerified?: boolean
  itemId?: string
  modifiedAt?: string
  modifiedBy?: string
  promotedItemId?: string | null
  repository?: { id: string; value: string }
  size?: number
  tenantId?: string
  totalPage?: number
  uploadedFrom?: string
  workspace?: { id: string; value: string }
}

// The response groups staged files under `data[].value` (grouping key is an
// empty string when no grouping is applied), plus a `meta` pagination block.
export interface StageFileListGroup {
  key: string
  value: StageFileSummary[]
}

export interface StageFileListResponse {
  data: StageFileListGroup[]
  meta: {
    currentPage: number
    itemsPerPage: number
    totalItems: number
  }
}

export type StageFileStatus =
  | 'ARCHIVED'
  | 'OCR'
  | 'OCRFailed'
  | 'PendingOCR'
  | 'Queued'

// Confirmed against a real POST /uploadAndIndex/index/all response.
export interface StageFileSummary {
  [key: string]: unknown
  id: string
  name: string
  status: StageFileStatus
  createdAt?: string
  promotedItemId?: string | null
  repositoryId?: string
  repositoryName?: string
  size?: number
}

interface BulkUploadParams {
  files: File[]
  repositoryId: string
  fields?: string[]
  ocrType?: string
  pageNo?: string
  validateType?: string
}

const bulkUpload = async ({
  fields,
  files,
  ocrType,
  pageNo,
  repositoryId,
  validateType,
}: BulkUploadParams) => {
  const response: { data: BulkUploadResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file, file.name))
    formData.append('repositoryId', repositoryId)
    // Swagger declares `fields` as a single array-typed parameter — send
    // one JSON-stringified array, not repeated same-name parts.
    if (fields && fields.length > 0) {
      formData.append('fields', JSON.stringify(fields))
    }
    if (pageNo) formData.append('pageNo', pageNo)
    if (ocrType) formData.append('ocrType', ocrType)
    if (validateType) formData.append('validateType', validateType)

    const { data, status } = await axiosV6({
      data: formData,
      headers: { ...getTenantHeaders(), 'Content-Type': 'multipart/form-data' },
      method: 'POST',
      url: '/uploadAndIndex/bulkUpload',
    })
    if (status !== 200 && status !== 201 && status !== 202) {
      throw new Error('invalid status code')
    }
    response.data = data as BulkUploadResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error uploading files'
  }
  return response
}

const getBulkUploadJobStatus = async (jobId: string) => {
  const response: { data: BulkUploadJobStatus | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: { ...getTenantHeaders() },
      method: 'GET',
      url: `/uploadAndIndex/bulkUpload/jobs/${jobId}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as BulkUploadJobStatus
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching job status'
  }
  return response
}

interface ListStagedFilesParams {
  repositoryId: string
  currentPage?: number
  itemsPerPage?: number
  mode?: string
}

// Confirmed request body shape for POST /uploadAndIndex/index/all.
const listStagedFiles = async ({
  currentPage = 1,
  itemsPerPage = 50,
  mode = 'browse',
  repositoryId,
}: ListStagedFilesParams) => {
  const response: { data: StageFileSummary[] | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      data: { currentPage, itemsPerPage, mode, repositoryId },
      headers: { ...getTenantHeaders() },
      method: 'POST',
      url: '/uploadAndIndex/index/all',
    })
    if (status !== 200) throw new Error('invalid status code')
    const payload = data as Record<string, unknown> | StageFileSummary[]
    if (Array.isArray(payload)) {
      response.data = payload
    } else if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { data?: unknown }).data)
    ) {
      const dataArray = (payload as { data: unknown[] }).data
      const first = dataArray[0]
      if (
        first &&
        typeof first === 'object' &&
        'value' in first &&
        Array.isArray((first as { value?: unknown }).value)
      ) {
        response.data = (dataArray as { value?: StageFileSummary[] }[]).flatMap(
          (group) => group.value ?? [],
        )
      } else {
        response.data = dataArray as StageFileSummary[]
      }
    } else if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { items?: unknown }).items)
    ) {
      response.data = (payload as { items: StageFileSummary[] }).items
    } else if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { content?: unknown }).content)
    ) {
      response.data = (payload as { content: StageFileSummary[] }).content
    }
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error listing staged files'
  }
  return response
}

const loadStageFile = async (fileId: string) => {
  const response: { data: LoadStageFileResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: { ...getTenantHeaders() },
      method: 'POST',
      url: `/uploadAndIndex/load/${fileId}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as LoadStageFileResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error loading staged file'
  }
  return response
}

const indexStageFile = async (
  fileId: string,
  payload: IndexStageFileRequest,
) => {
  const response: { data: IndexStageFileResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: { ...getTenantHeaders() },
      method: 'PUT',
      url: `/uploadAndIndex/index/${fileId}`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data as IndexStageFileResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as {
      message?: string
      response?: { data?: unknown; status?: number }
    }
    if (err?.response?.status === 400) {
      response.error = ''
    } else {
      response.error =
        parseApiError(err?.response?.data) ||
        err?.message ||
        'error exporting staged file'
    }
  }
  return response
}

const deleteStagedFiles = async (payload: {
  fileIds: string[]
  repositoryId: string
}) => {
  const response: { data: unknown; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: { ...getTenantHeaders() },
      method: 'POST',
      url: '/uploadAndIndex/index/deletefiles',
    })
    if (status !== 200 && status !== 201 && status !== 204) {
      throw new Error('invalid status code')
    }
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error deleting staged files'
  }
  return response
}

const fetchStageFileBlob = async (fileId: string) => {
  try {
    const { data } = await axiosV6({
      headers: { ...getTenantHeaders() },
      method: 'GET',
      responseType: 'blob',
      url: `/uploadAndIndex/files/${fileId}`,
    })
    return data as Blob
  } catch (e) {
    console.error('Error fetching stage file blob:', e)
    return null
  }
}

const uploadAndClassifyDocument = async (
  file: File,
  sessionId?: string,
  includeRepositoryCatalog = true,
  pageno = '1',
) => {
  const response: {
    data: DocumentIntelligentAgentResponse | null
    error: string
  } = { data: null, error: '' }
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (sessionId) formData.append('session_id', sessionId)
    formData.append('pageno', pageno)
    formData.append(
      'include_repository_catalog',
      String(includeRepositoryCatalog),
    )

    const { data, status } = await axiosV6({
      data: formData,
      headers: { ...getTenantHeaders(), 'Content-Type': 'multipart/form-data' },
      method: 'POST',
      url: '/repositories/document-intelligent-agent/upload',
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data as DocumentIntelligentAgentResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error classifying document'
  }
  return response
}

const classifyDocumentWithText = async (params: {
  filepath?: string | null
  includeRepositoryCatalog?: boolean
  ocrText: string
  pageno?: string
  sessionId?: string
}) => {
  const response: {
    data: DocumentIntelligentAgentResponse | null
    error: string
  } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: {
        filepath: params.filepath ?? null,
        includeRepositoryCatalog: params.includeRepositoryCatalog ?? true,
        ocrText: params.ocrText,
        pageno: params.pageno ?? '1',
        sessionId: params.sessionId ?? 'demo-di',
      },
      headers: { ...getTenantHeaders() },
      method: 'POST',
      url: '/repositories/document-intelligent-agent',
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data as DocumentIntelligentAgentResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error classifying document'
  }
  return response
}

const uploadAndIndexApi = {
  bulkUpload,
  classifyDocumentWithText,
  deleteStagedFiles,
  fetchStageFileBlob,
  indexStageFile,
  listStagedFiles,
  loadStageFile,
  uploadAndClassifyDocument,
  uploadWithOcr,
  getBulkUploadJobStatus,
}

export default uploadAndIndexApi
export {
  bulkUpload,
  classifyDocumentWithText,
  deleteStagedFiles,
  fetchStageFileBlob,
  getBulkUploadJobStatus,
  indexStageFile,
  listStagedFiles,
  loadStageFile,
  uploadAndClassifyDocument,
  uploadWithOcr,
}
