import axios, { type AxiosProgressEvent, type AxiosRequestConfig } from 'axios'
import type { UploadWithOcrResult } from './uploadAndIndex'
import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'

export interface LargeUploadCompletePayload {
  chunkSize: number
  fileSize: number
  repositoryId: string
  /** Same as uploadWithOcr's `fields`: JSON of the OCR field list (name/value pairs). */
  metadata?: string
  ocrJson?: string
  ocrText?: string
  totalPages?: number
}

/**
 * Large-file upload API (1–10 GB). See api/src/Api/Controllers/LargeUploadController.cs.
 * The browser sends every chunk to the API; only the API writes to storage.
 */
export interface LargeUploadSession {
  chunkSize: number
  fileId: string
  fileName: string
  maxConcurrency: number
  maxFileSize: number
  repositoryId: string
  totalChunks: number
}

export interface LargeUploadStatus {
  chunkSize: number
  completed: boolean
  fileId: string
  maxConcurrency: number
  stageStatus: string
  totalChunks: number
  uploadedChunks: number[]
}

type V6RequestConfig = AxiosRequestConfig & { skipCancellation?: boolean }

/** Error from the large-upload API, with the HTTP status (0 = network). */
export class LargeUploadApiError extends Error {
  missingChunks: number[]
  status: number

  constructor(message: string, status: number, missingChunks: number[] = []) {
    super(message)
    this.name = 'LargeUploadApiError'
    this.status = status
    this.missingChunks = missingChunks
  }
}

const tenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return { 'X-Tenant-Id': String(tenantId) }
}

const toApiError = (error: unknown): Error => {
  if (axios.isCancel(error)) return error as Error
  const err = error as {
    message?: string
    name?: string
    response?: {
      data?: { error?: string; missingChunks?: number[] } | string
      status?: number
    }
  }
  if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
    return error as Error
  }
  const data = err?.response?.data
  const message =
    (typeof data === 'string' ? data : data?.error) ||
    err?.message ||
    'Upload failed'
  const missing =
    typeof data === 'object' && Array.isArray(data?.missingChunks)
      ? data.missingChunks
      : []
  return new LargeUploadApiError(message, err?.response?.status ?? 0, missing)
}

const request = async <T>(config: V6RequestConfig) => {
  try {
    const finalConfig: V6RequestConfig = {
      ...config,
      headers: { ...tenantHeaders(), ...(config.headers ?? {}) },
      // Parallel chunk calls must not cancel each other (axiosV6 de-dupes identical requests).
      skipCancellation: true,
    }
    const { data } = await axiosV6(finalConfig)
    return data as T
  } catch (error) {
    throw toApiError(error)
  }
}

export const initLargeUpload = (params: {
  contentType: string
  fileName: string
  fileSize: number
  repositoryId: string
}) =>
  request<LargeUploadSession>({
    data: params,
    method: 'POST',
    url: '/uploadAndIndex/large/init',
  })

export const getLargeUploadStatus = (
  fileId: string,
  repositoryId: string,
  fileSize: number,
) =>
  request<LargeUploadStatus>({
    method: 'GET',
    params: { fileSize, repositoryId },
    url: `/uploadAndIndex/large/${encodeURIComponent(fileId)}`,
  })

export const uploadLargeChunk = (params: {
  chunk: Blob
  fileId: string
  fileSize: number
  index: number
  repositoryId: string
  signal?: AbortSignal
  onProgress?: (loaded: number) => void
}) =>
  request<void>({
    data: params.chunk,
    headers: { 'Content-Type': 'application/octet-stream' },
    method: 'PUT',
    params: { fileSize: params.fileSize, repositoryId: params.repositoryId },
    signal: params.signal,
    // Send the Blob as-is (no JSON transform).
    transformRequest: [(payload: unknown) => payload],
    url: `/uploadAndIndex/large/${encodeURIComponent(params.fileId)}/chunks/${params.index}`,
    onUploadProgress: (event: AxiosProgressEvent) =>
      params.onProgress?.(event.loaded ?? 0),
  })

export const completeLargeUpload = (
  fileId: string,
  payload: LargeUploadCompletePayload,
) =>
  request<UploadWithOcrResult>({
    data: payload,
    method: 'POST',
    url: `/uploadAndIndex/large/${encodeURIComponent(fileId)}/complete`,
  })
