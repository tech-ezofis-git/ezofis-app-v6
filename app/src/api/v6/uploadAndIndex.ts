import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'

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
  // The already-extracted results from an earlier uploadForOcr call on this
  // same file. When present, sent as the `fields` payload instead of the
  // bare "Name,TYPE" hint strings — the hint strings only carry names, so
  // the backend has nothing to echo back for value/type. ocrJson/ocrText
  // are forwarded too so the backend doesn't have to run OCR again.
  ocrFieldList?: { name?: string; type?: string | null; value?: string }[]
  ocrJson?: string
  ocrText?: string
  // Full repository field set (name -> current value, '' if unfilled) —
  // see buildRepoMetadata in fieldRendering.ts.
  metadata?: Record<string, string>
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

const uploadAndIndexApi = {
  uploadWithOcr,
}

export default uploadAndIndexApi
