// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeLargeUpload,
  getLargeUploadStatus,
  initLargeUpload,
  LargeUploadApiError,
  type LargeUploadSession,
  uploadLargeChunk,
} from '@/api/v6/largeUpload'
import { LargeFileUploader } from './LargeFileUploader'
import {
  fileFingerprint,
  getResumeRecord,
  saveResumeRecord,
} from './resumeStore'

vi.mock('@/api/v6/largeUpload', async () => {
  const actual = await vi.importActual<typeof import('@/api/v6/largeUpload')>(
    '@/api/v6/largeUpload',
  )
  return {
    ...actual,
    completeLargeUpload: vi.fn(),
    initLargeUpload: vi.fn(),
    uploadLargeChunk: vi.fn(),
    getLargeUploadStatus: vi.fn(),
  }
})

const REPO = 'repo-1'
const CHUNK = 4

const session = (
  overrides: Partial<LargeUploadSession> = {},
): LargeUploadSession => ({
  chunkSize: CHUNK,
  fileId: 'file-1',
  fileName: 'big.pdf',
  maxConcurrency: 3,
  maxFileSize: 10 * 1024 ** 3,
  repositoryId: REPO,
  totalChunks: 3,
  ...overrides,
})

const completed = {
  fileId: 'file-1',
  fileName: 'big.pdf',
  filePath: 'monitor/big.pdf',
  ocrFieldList: [],
  ocrJson: '',
  repositoryId: REPO,
}

// 10 bytes → chunks of 4, 4, 2
const makeFile = () =>
  new File([new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])], 'big.pdf', {
    lastModified: 1_700_000_000_000,
    type: 'application/pdf',
  })

const sentChunks = () =>
  vi
    .mocked(uploadLargeChunk)
    .mock.calls.map(([params]) => params.index)
    .sort((a, b) => a - b)

describe('LargeFileUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(uploadLargeChunk).mockResolvedValue(undefined)
    vi.mocked(completeLargeUpload).mockResolvedValue(completed)
  })

  it('sends every chunk to the API with the right byte range, then completes', async () => {
    vi.mocked(initLargeUpload).mockResolvedValue(session())
    const file = makeFile()
    const progress: number[] = []
    const uploader = new LargeFileUploader({
      file,
      repositoryId: REPO,
      onProgress: (p) => progress.push(p.loaded),
    })

    await uploader.upload(new AbortController().signal)

    const sizes = vi
      .mocked(uploadLargeChunk)
      .mock.calls.map(([params]) => [params.index, params.chunk.size])
      .sort((a, b) => a[0] - b[0])
    expect(sizes).toEqual([
      [0, 4],
      [1, 4],
      [2, 2],
    ])
    expect(progress.at(-1)).toBe(10)
    // Resume info is kept until the upload completes.
    expect(getResumeRecord(fileFingerprint(file, REPO))?.fileId).toBe('file-1')

    await uploader.complete({ totalPages: 4 }, new AbortController().signal)
    expect(completeLargeUpload).toHaveBeenCalledWith('file-1', {
      chunkSize: CHUNK,
      fileSize: 10,
      repositoryId: REPO,
      totalPages: 4,
    })
    expect(getResumeRecord(fileFingerprint(file, REPO))).toBeNull()
  })

  it('resumes an interrupted upload and only sends the missing chunks', async () => {
    const file = makeFile()
    saveResumeRecord(fileFingerprint(file, REPO), {
      fileId: 'file-1',
      repositoryId: REPO,
    })
    vi.mocked(getLargeUploadStatus).mockResolvedValue({
      chunkSize: CHUNK,
      completed: false,
      fileId: 'file-1',
      maxConcurrency: 3,
      stageStatus: 'Uploading',
      totalChunks: 3,
      uploadedChunks: [0, 2],
    })

    await new LargeFileUploader({ file, repositoryId: REPO }).upload(
      new AbortController().signal,
    )

    expect(initLargeUpload).not.toHaveBeenCalled()
    expect(sentChunks()).toEqual([1])
  })

  it('retries a chunk after a network error', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(initLargeUpload).mockResolvedValue(
        session({ maxConcurrency: 1 }),
      )
      vi.mocked(uploadLargeChunk)
        .mockRejectedValueOnce(new LargeUploadApiError('Network Error', 0))
        .mockResolvedValue(undefined)

      const done = new LargeFileUploader({
        file: makeFile(),
        repositoryId: REPO,
      }).upload(new AbortController().signal)
      await vi.runAllTimersAsync()
      await done

      // Chunk 0 twice (failed + retried), then 1 and 2.
      expect(vi.mocked(uploadLargeChunk)).toHaveBeenCalledTimes(4)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not retry a request the server rejects', async () => {
    vi.mocked(initLargeUpload).mockResolvedValue(session({ maxConcurrency: 1 }))
    vi.mocked(uploadLargeChunk).mockRejectedValue(
      new LargeUploadApiError('chunkIndex must be between 0 and 2.', 400),
    )

    await expect(
      new LargeFileUploader({ file: makeFile(), repositoryId: REPO }).upload(
        new AbortController().signal,
      ),
    ).rejects.toThrow('chunkIndex must be between 0 and 2.')
    expect(uploadLargeChunk).toHaveBeenCalledTimes(1)
  })

  it('re-sends chunks the server reports missing when completing', async () => {
    vi.mocked(initLargeUpload).mockResolvedValue(session())
    vi.mocked(completeLargeUpload)
      .mockRejectedValueOnce(
        new LargeUploadApiError('Upload is incomplete', 409, [1]),
      )
      .mockResolvedValueOnce(completed)

    const uploader = new LargeFileUploader({
      file: makeFile(),
      repositoryId: REPO,
    })
    await uploader.upload(new AbortController().signal)
    vi.mocked(uploadLargeChunk).mockClear()

    await uploader.complete({}, new AbortController().signal)

    expect(sentChunks()).toEqual([1])
    expect(completeLargeUpload).toHaveBeenCalledTimes(2)
  })

  it('never sends more chunks at once than the API allows', async () => {
    vi.mocked(initLargeUpload).mockResolvedValue(
      session({ maxConcurrency: 2, totalChunks: 3 }),
    )
    let active = 0
    let peak = 0
    vi.mocked(uploadLargeChunk).mockImplementation(async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active--
    })

    await new LargeFileUploader({
      file: makeFile(),
      repositoryId: REPO,
    }).upload(new AbortController().signal)

    expect(peak).toBe(2)
    expect(sentChunks()).toEqual([0, 1, 2])
  })

  it('counts only stored chunks, not bytes merely sent to the API', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(initLargeUpload).mockResolvedValue(
        session({ maxConcurrency: 3 }),
      )
      // All chunks are handed to the network at once; storing them takes a long time.
      vi.mocked(uploadLargeChunk).mockImplementation(async (params) => {
        params.onProgress?.(params.chunk.size)
        await new Promise((resolve) => setTimeout(resolve, 60_000))
      })
      const seen: number[] = []
      const done = new LargeFileUploader({
        file: makeFile(),
        repositoryId: REPO,
        onProgress: (p) => seen.push(p.loaded),
      }).upload(new AbortController().signal)

      await vi.advanceTimersByTimeAsync(1000)
      expect(Math.max(...seen)).toBe(0)

      await vi.runAllTimersAsync()
      await done
      expect(seen.at(-1)).toBe(10)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports progress while chunks are still being stored, not only at the end', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(initLargeUpload).mockResolvedValue(
        session({ maxConcurrency: 1 }),
      )
      // Each chunk is sent at once (fast local link), then the server takes a while to store it.
      vi.mocked(uploadLargeChunk).mockImplementation(async (params) => {
        params.onProgress?.(params.chunk.size)
        await new Promise((resolve) => setTimeout(resolve, 2000))
      })
      const seen: number[] = []
      const done = new LargeFileUploader({
        file: makeFile(),
        repositoryId: REPO,
        onProgress: (p) => {
          if (p.phase === 'uploading') seen.push(p.loaded)
        },
      }).upload(new AbortController().signal)

      await vi.advanceTimersByTimeAsync(2500)
      // Chunk 0 is stored and chunk 1 is on its way: progress must already show it.
      expect(Math.max(...seen)).toBeGreaterThanOrEqual(4)

      await vi.runAllTimersAsync()
      await done
      expect(Math.max(...seen)).toBe(10)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops when cancelled', async () => {
    vi.mocked(initLargeUpload).mockResolvedValue(session({ maxConcurrency: 1 }))
    const controller = new AbortController()
    vi.mocked(uploadLargeChunk).mockImplementation(async () => {
      controller.abort()
    })

    await expect(
      new LargeFileUploader({ file: makeFile(), repositoryId: REPO }).upload(
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(uploadLargeChunk).toHaveBeenCalledTimes(1)
  })
})
