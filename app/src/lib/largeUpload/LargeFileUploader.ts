import {
  completeLargeUpload,
  getLargeUploadStatus,
  initLargeUpload,
  LargeUploadApiError,
  type LargeUploadCompletePayload,
  type LargeUploadSession,
  uploadLargeChunk,
} from '@/api/v6/largeUpload'
import {
  clearResumeRecord,
  fileFingerprint,
  getResumeRecord,
  saveResumeRecord,
} from './resumeStore'

export interface LargeUploadProgress {
  bytesPerSecond: number
  /** Seconds left at the current speed (NaN while measuring). */
  etaSeconds: number
  loaded: number
  phase: 'finishing' | 'preparing' | 'uploading'
  total: number
}

interface LargeFileUploaderOptions {
  file: File
  repositoryId: string
  onProgress?: (progress: LargeUploadProgress) => void
  /** Called as soon as the server has a file id (before any chunk is sent). */
  onSession?: (session: LargeUploadSession) => void
}

const MAX_ATTEMPTS = 6
const SPEED_WINDOW_MS = 10_000
const PROGRESS_INTERVAL_MS = 250

const abortError = () => new DOMException('Upload cancelled', 'AbortError')

const isAbort = (error: unknown) => {
  const name = (error as { name?: string })?.name
  return name === 'AbortError' || name === 'CanceledError'
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(abortError())
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(abortError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })

/** Resolves once the browser is online again (uploads pause instead of failing while offline). */
const waitForOnline = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (navigator.onLine) return resolve()
    if (signal.aborted) return reject(abortError())
    const onOnline = () => {
      cleanup()
      resolve()
    }
    const onAbort = () => {
      cleanup()
      reject(abortError())
    }
    const cleanup = () => {
      window.removeEventListener('online', onOnline)
      signal.removeEventListener('abort', onAbort)
    }
    window.addEventListener('online', onOnline)
    signal.addEventListener('abort', onAbort, { once: true })
  })

/** Network errors, timeouts, throttling and 5xx are retried; other 4xx will not succeed on retry. */
const isRetryable = (error: unknown) => {
  if (!(error instanceof LargeUploadApiError)) return true
  const { status } = error
  return status === 0 || status === 408 || status === 429 || status >= 500
}

/**
 * Uploads one large file to the API in fixed-size chunks: a few in parallel, each retried with
 * backoff, pausing while offline. Only the API writes to storage. Interrupted uploads resume from
 * the chunks already stored.
 *
 * Usage: `await uploader.upload(signal)` then `await uploader.complete(payload)`.
 */
export class LargeFileUploader {
  private readonly file: File
  private readonly repositoryId: string
  private readonly fingerprint: string
  private readonly onProgress?: (progress: LargeUploadProgress) => void
  private readonly onSession?: (session: LargeUploadSession) => void

  private session: LargeUploadSession | null = null
  private uploaded = new Set<number>()
  private inFlight = new Map<number, number>()
  private uploadedBytes = 0
  private samples: Array<{ at: number; loaded: number }> = []
  private lastEmit = 0
  private trailingEmit: null | number = null
  private phase: LargeUploadProgress['phase'] = 'preparing'

  constructor(options: LargeFileUploaderOptions) {
    this.file = options.file
    this.repositoryId = options.repositoryId
    this.fingerprint = fileFingerprint(options.file, options.repositoryId)
    this.onProgress = options.onProgress
    this.onSession = options.onSession
  }

  get fileId() {
    return this.session?.fileId ?? null
  }

  get chunkSize() {
    return this.session?.chunkSize ?? 0
  }

  /** Sends every chunk that is not stored yet. */
  async upload(signal: AbortSignal) {
    this.emit(true)
    await this.openSession(signal)
    const session = this.session!
    const pending: number[] = []
    for (let index = 0; index < session.totalChunks; index++) {
      if (!this.uploaded.has(index)) pending.push(index)
    }
    this.phase = 'uploading'
    this.emit(true)
    await this.runPool(pending, signal)
    this.phase = 'finishing'
    this.emit(true)
  }

  /**
   * Commits the upload and stores the OCR metadata. Re-sends any chunk the server reports missing.
   */
  async complete(
    payload: Omit<
      LargeUploadCompletePayload,
      'chunkSize' | 'fileSize' | 'repositoryId'
    >,
    signal: AbortSignal,
  ) {
    const session = this.session
    if (!session) throw new Error('Upload has not started.')

    for (let attempt = 0; ; attempt++) {
      try {
        const result = await completeLargeUpload(session.fileId, {
          ...payload,
          chunkSize: session.chunkSize,
          fileSize: this.file.size,
          repositoryId: this.repositoryId,
        })
        clearResumeRecord(this.fingerprint)
        return result
      } catch (error) {
        if (
          error instanceof LargeUploadApiError &&
          error.status === 409 &&
          error.missingChunks.length > 0 &&
          attempt < 2
        ) {
          error.missingChunks.forEach((index) => this.uploaded.delete(index))
          this.phase = 'uploading'
          await this.runPool(error.missingChunks, signal)
          this.phase = 'finishing'
          continue
        }
        if (isRetryable(error) && attempt < 3 && !isAbort(error)) {
          await waitForOnline(signal)
          await sleep(1000 * 2 ** attempt, signal)
          continue
        }
        throw error
      }
    }
  }

  private async openSession(signal: AbortSignal) {
    const size = this.file.size
    const previous = getResumeRecord(this.fingerprint)

    if (previous && previous.repositoryId === this.repositoryId) {
      try {
        const status = await getLargeUploadStatus(
          previous.fileId,
          this.repositoryId,
          size,
        )
        if (!status.completed) {
          this.session = {
            chunkSize: status.chunkSize,
            fileId: status.fileId,
            fileName: this.file.name,
            maxConcurrency: status.maxConcurrency,
            maxFileSize: Number.POSITIVE_INFINITY,
            repositoryId: this.repositoryId,
            totalChunks: status.totalChunks,
          }
          status.uploadedChunks.forEach((index) => this.uploaded.add(index))
          this.uploadedBytes = status.uploadedChunks.reduce(
            (sum, index) => sum + this.chunkLength(index),
            0,
          )
          this.onSession?.(this.session)
          return
        }
      } catch (error) {
        if (isAbort(error)) throw error
        // Gone or no longer resumable: start a new upload below.
      }
      clearResumeRecord(this.fingerprint)
    }

    if (signal.aborted) throw abortError()
    this.session = await initLargeUpload({
      contentType: this.file.type || 'application/octet-stream',
      fileName: this.file.name,
      fileSize: size,
      repositoryId: this.repositoryId,
    })
    saveResumeRecord(this.fingerprint, {
      fileId: this.session.fileId,
      repositoryId: this.repositoryId,
    })
    this.onSession?.(this.session)
  }

  private async runPool(indexes: number[], signal: AbortSignal) {
    const queue = [...indexes]
    const workers = Math.max(
      1,
      Math.min(this.session!.maxConcurrency, queue.length),
    )
    // Stop the other workers as soon as one chunk fails for good.
    const poolController = new AbortController()
    const onAbort = () => poolController.abort()
    signal.addEventListener('abort', onAbort, { once: true })

    try {
      await Promise.all(
        Array.from({ length: workers }, async () => {
          while (queue.length > 0) {
            if (poolController.signal.aborted) throw abortError()
            const index = queue.shift()!
            try {
              await this.uploadChunk(index, poolController.signal)
            } catch (error) {
              poolController.abort()
              throw error
            }
          }
        }),
      )
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
    if (signal.aborted) throw abortError()
  }

  private async uploadChunk(index: number, signal: AbortSignal) {
    const session = this.session!
    const start = index * session.chunkSize
    const chunk = this.file.slice(start, start + this.chunkLength(index))

    for (let attempt = 1; ; attempt++) {
      if (signal.aborted) throw abortError()
      await waitForOnline(signal)
      try {
        await uploadLargeChunk({
          chunk,
          fileId: session.fileId,
          fileSize: this.file.size,
          index,
          repositoryId: this.repositoryId,
          signal,
          onProgress: (loaded) => this.trackChunk(index, loaded),
        })
        this.inFlight.delete(index)
        this.uploaded.add(index)
        this.uploadedBytes += chunk.size
        this.emit()
        return
      } catch (error) {
        this.inFlight.delete(index)
        this.emit()
        if (isAbort(error) || signal.aborted) throw abortError()
        if (!isRetryable(error) || attempt >= MAX_ATTEMPTS) throw error
        const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1))
        await sleep(backoff + Math.random() * 500, signal)
      }
    }
  }

  private chunkLength(index: number) {
    const { chunkSize, totalChunks } = this.session!
    return index < totalChunks - 1
      ? chunkSize
      : this.file.size - chunkSize * (totalChunks - 1)
  }

  private trackChunk(index: number, loaded: number) {
    this.inFlight.set(index, loaded)
  }

  private emit(force = false) {
    if (!this.onProgress) return
    const now = Date.now()
    if (!force && now - this.lastEmit < PROGRESS_INTERVAL_MS) {
      // Don't drop the update: on a fast link a whole chunk is sent inside one interval, and the next
      // event may only come minutes later (when the server has stored it).
      if (this.trailingEmit === null) {
        this.trailingEmit = window.setTimeout(
          () => {
            this.trailingEmit = null
            this.emit(true)
          },
          PROGRESS_INTERVAL_MS - (now - this.lastEmit),
        )
      }
      return
    }
    if (this.trailingEmit !== null) {
      window.clearTimeout(this.trailingEmit)
      this.trailingEmit = null
    }
    this.lastEmit = now

    // Count only chunks the API has confirmed as stored. Bytes merely sent to the API are not progress:
    // the API still has to write them to storage, which on a slow uplink takes far longer than sending
    // them over the local network (counting them showed 99% while nothing was stored yet).
    const loaded = Math.min(this.uploadedBytes, this.file.size)

    this.samples.push({ at: now, loaded })
    while (
      this.samples.length > 2 &&
      now - this.samples[0].at > SPEED_WINDOW_MS
    ) {
      this.samples.shift()
    }
    const first = this.samples[0]
    const elapsed = (now - first.at) / 1000
    const bytesPerSecond =
      elapsed >= 1 ? Math.max(0, (loaded - first.loaded) / elapsed) : 0
    const etaSeconds =
      bytesPerSecond > 0
        ? (this.file.size - loaded) / bytesPerSecond
        : Number.NaN

    this.onProgress({
      bytesPerSecond,
      etaSeconds,
      loaded,
      phase: this.phase,
      total: this.file.size,
    })
  }
}
