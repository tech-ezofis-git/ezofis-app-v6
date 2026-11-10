import { PDFDataRangeTransport } from 'pdfjs-dist'

/** pdf.js fetch size per range request when reading large PDFs piece by piece. */
export const PDF_RANGE_CHUNK_SIZE = 512 * 1024

/** A large PDF prepared for pdf.js: read in pieces, cut at the real end of the document. */
export interface LargePdfSource {
  /** Bytes pdf.js sees: up to the last `%%EOF` (junk after it is ignored). */
  length: number
  read: PdfByteReader
  /** Size of the whole file, including anything after the PDF's end. */
  size: number
}

/** Reads bytes [begin, end) of a PDF. */
export type PdfByteReader = (begin: number, end: number) => Promise<Uint8Array>

/** How much to read per step, and how far from the end to look before trying the start. */
interface ScanLimits {
  block: number
  maxTail: number
}

/** Local reads are cheap: look further from the end. */
const LOCAL_SCAN: ScanLimits = { block: 1024 * 1024, maxTail: 16 * 1024 * 1024 }
/** Every remote read is a request (slow links): small steps, little tail. */
const REMOTE_SCAN: ScanLimits = { block: 256 * 1024, maxTail: 256 * 1024 }
/** How far from the start to look when the end of the file is padding (stops at an all-zero block). */
const MAX_HEAD_SCAN = 64 * 1024 * 1024
const EOF_MARKER = '%%EOF'

const latin1 = new TextDecoder('latin1')

export const fileReader =
  (file: Blob): PdfByteReader =>
  async (begin, end) =>
    new Uint8Array(await file.slice(begin, end).arrayBuffer())

/** Reads byte ranges of a file served with HTTP Range support (e.g. `/uploadAndIndex/files/{id}`). */
export const httpReader =
  (url: string, headers: Record<string, string> = {}): PdfByteReader =>
  async (begin, end) => {
    if (end <= begin) return new Uint8Array(0)
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { ...headers, Range: `bytes=${begin}-${end - 1}` },
        })
        if (response.status !== 206) {
          throw new Error(`Range request returned ${response.status}`)
        }
        return new Uint8Array(await response.arrayBuffer())
      } catch (error) {
        if (attempt >= 3) throw error
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      }
    }
  }

/** Total size of a remote file, from a 1-byte Range request (`Content-Range: bytes 0-0/<size>`). */
export const remoteFileSize = async (
  url: string,
  headers: Record<string, string> = {},
) => {
  const controller = new AbortController()
  try {
    const response = await fetch(url, {
      headers: { ...headers, Range: 'bytes=0-0' },
      signal: controller.signal,
    })
    const total = response.headers.get('Content-Range')?.split('/')[1]
    if (response.status === 206 && total && /^\d+$/.test(total)) {
      return Number(total)
    }
    throw new Error('The server does not support range requests.')
  } finally {
    controller.abort()
  }
}

const isAllZero = (bytes: Uint8Array) => {
  for (let i = 0; i < bytes.length; i++) if (bytes[i] !== 0) return false
  return true
}

/** Position just after `%%EOF` (and its line ending) at `index` in `bytes`. */
const afterEof = (bytes: Uint8Array, index: number) => {
  let end = index + EOF_MARKER.length
  if (bytes[end] === 0x0d) end++
  if (bytes[end] === 0x0a) end++
  return end
}

/**
 * Where the PDF document really ends. pdf.js looks for `startxref` in the last 1 KB only; when a file
 * has junk after `%%EOF` (padding, appended data) it falls back to scanning the whole file, which for
 * a multi-GB file never finishes. This finds the last `%%EOF`, reading only a little: first backwards
 * from the end, then (for files padded at the end) forwards from the start until an all-zero block.
 * Local files: 1 MB steps, up to 16 MB from the end. Remote files: 256 KB steps, 256 KB from the end.
 */
export { REMOTE_SCAN }

export const findPdfEnd = async (
  read: PdfByteReader,
  size: number,
  scan: ScanLimits = LOCAL_SCAN,
): Promise<number> => {
  if (size <= 0) return size

  const tailStart = Math.max(0, size - 1024)
  const tail = latin1.decode(await read(tailStart, size))
  if (tail.includes('startxref')) return size

  // Backwards from the end: a little junk after %%EOF.
  let scanned = 0
  let blockEnd = size
  while (blockEnd > 0 && scanned < scan.maxTail) {
    const blockStart = Math.max(0, blockEnd - scan.block)
    const bytes = await read(blockStart, blockEnd)
    scanned += bytes.length
    const index = latin1.decode(bytes).lastIndexOf(EOF_MARKER)
    if (index >= 0) return blockStart + afterEof(bytes, index)
    if (blockStart === 0) break
    // Overlap by the marker's length so one split across blocks is still found.
    blockEnd = blockStart + EOF_MARKER.length
  }

  // Forwards from the start: a small PDF followed by a large padded area.
  let lastEnd = -1
  for (
    let blockStart = 0;
    blockStart < Math.min(size, MAX_HEAD_SCAN);
    blockStart += scan.block - EOF_MARKER.length
  ) {
    const bytes = await read(
      blockStart,
      Math.min(size, blockStart + scan.block),
    )
    const text = latin1.decode(bytes)
    const index = text.lastIndexOf(EOF_MARKER)
    if (index >= 0) lastEnd = blockStart + afterEof(bytes, index)
    else if (lastEnd > 0 && isAllZero(bytes)) break
  }

  return lastEnd > 0 ? lastEnd : size
}

/** Prepares a large local file for pdf.js. */
export const prepareLocalPdf = async (file: Blob): Promise<LargePdfSource> => {
  const read = fileReader(file)
  return { length: await findPdfEnd(read, file.size), read, size: file.size }
}

/** Prepares a large remote PDF (served with Range support) for pdf.js. */
export const prepareRemotePdf = async (
  url: string,
  headers: Record<string, string> = {},
  knownSize?: number,
): Promise<LargePdfSource> => {
  const size =
    knownSize && knownSize > 0 ? knownSize : await remoteFileSize(url, headers)
  const read = httpReader(url, headers)
  return { length: await findPdfEnd(read, size, REMOTE_SCAN), read, size }
}

/**
 * pdf.js range transport over a {@link LargePdfSource}: pdf.js asks for byte ranges and gets only those,
 * so a multi-GB PDF opens by reading just the pages being shown.
 */
export const createRangeTransport = (source: LargePdfSource) => {
  const transport = new PDFDataRangeTransport(source.length, null)
  transport.requestDataRange = (begin: number, end: number) => {
    void source
      .read(begin, Math.min(end, source.length))
      .then((bytes) => transport.onDataRange(begin, bytes))
      .catch(() => {
        // Unreadable range (file moved, connection lost): pdf.js reports the load error.
      })
  }
  return transport
}

/** getDocument options that read `source` piece by piece. */
export const rangeDocumentParams = (source: LargePdfSource) => ({
  disableAutoFetch: true,
  disableStream: true,
  range: createRangeTransport(source),
  rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
})
