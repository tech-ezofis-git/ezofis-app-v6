import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'

export type DocumentPreviewRequest = {
  formData: Record<string, unknown>
  templateJson: Record<string, unknown> | string
  formId?: string
}

export type DocumentPreviewResponse = {
  fileName?: string
  formData?: Record<string, unknown>
  pdfBase64?: string
}

const tenantHeaders = () => {
  const state = authUserStore.getState()
  const tenantId =
    state?.session?.tenantId ||
    state?.identity?.tenantId ||
    (typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('tenantId')
      : null)
  if (!tenantId) return undefined
  return { 'X-Tenant-Id': String(tenantId) }
}

export const previewDocument = async (
  payload: DocumentPreviewRequest,
): Promise<{ data: DocumentPreviewResponse | null; error: string }> => {
  try {
    const body: DocumentPreviewRequest = {
      formData: payload.formData,
      templateJson: payload.templateJson,
    }
    if (payload.formId) body.formId = payload.formId

    const { data, status } = await axiosV6({
      data: body,
      headers: tenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      // Base URL already includes /api → POST /api/workflows/document/preview
      url: '/workflows/document/preview',
    })
    if (status < 200 || status >= 300) {
      throw new Error(`Invalid status code ${status}`)
    }
    return { data: (data || {}) as DocumentPreviewResponse, error: '' }
  } catch (error: unknown) {
    const err = error as {
      message?: string
      response?: {
        data?: { error?: string; message?: string }
        status?: number
      }
    }
    console.error('[documentPreview] Failed:', error)
    const status = err?.response?.status
    return {
      data: null,
      error:
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (status === 404
          ? 'Document preview endpoint not found (404)'
          : err?.message) ||
        'Failed to generate document preview',
    }
  }
}

export const pdfBase64ToObjectUrl = (pdfBase64: string): string => {
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}
