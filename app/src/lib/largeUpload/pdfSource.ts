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
/** Every remote read is a request: one block per step, little tail. */
const REMOTE_SCAN: ScanLimits = { block: 1024 * 1024, maxTail: 1024 * 1024 }
/** How far from the start to look when the end of the file is padding (stops at an all-zero block). */
const MAX_HEAD_SCAN = 64 * 1024 * 1024
const EOF_MARKER = '%%EOF'

const latin1 = new TextDecoder('latin1')

export const fileReader =
  (file: Blob): PdfByteReader =>
  async (begin, end) =>
    new Uint8Array(await file.slice(begin, end).arrayBuffer())

/** Remote reads go in blocks of this size: every request costs a round trip, so fewer, larger ones. */
export const REMOTE_BLOCK_SIZE = 1024 * 1024
/** Blocks kept per file, so the end-of-file scan and pdf.js reuse what was already read. */
const REMOTE_BLOCKS_KEPT = 48
/** Reads up to this size are fetched exactly instead of as a whole block. */
const SMALL_READ = 64 * 1024

const fetchRange = async (
  url: string,
  headers: Record<string, string>,
  begin: number,
  end: number,
) => {
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

/**
 * Reads byte ranges of a file served with HTTP Range support (e.g. `/uploadAndIndex/files/{id}`).
 * Reads whole 1 MB blocks and keeps the latest ones, so repeated or nearby reads need no new request.
 */
export const httpReader = (
  url: string,
  headers: Record<string, string> = {},
): PdfByteReader => {
  const blocks = new Map<number, Promise<Uint8Array>>()

  const block = (index: number) => {
    const known = blocks.get(index)
    if (known) {
      // Most recently used last.
      blocks.delete(index)
      blocks.set(index, known)
      return known
    }
    const start = index * REMOTE_BLOCK_SIZE
    const pending = fetchRange(url, headers, start, start + REMOTE_BLOCK_SIZE)
    pending.catch(() => blocks.delete(index))
    blocks.set(index, pending)
    while (blocks.size > REMOTE_BLOCKS_KEPT) {
      blocks.delete(blocks.keys().next().value as number)
    }
    return pending
  }

  return async (begin, end) => {
    if (end <= begin) return new Uint8Array(0)
    const first = Math.floor(begin / REMOTE_BLOCK_SIZE)
    const last = Math.floor((end - 1) / REMOTE_BLOCK_SIZE)
    // Small reads (probes, the last 1 KB) go as they are unless their block is already here.
    if (end - begin <= SMALL_READ && first === last && !blocks.has(first)) {
      return fetchRange(url, headers, begin, end)
    }
    const parts = await Promise.all(
      Array.from({ length: last - first + 1 }, (_, i) => block(first + i)),
    )
    const out = new Uint8Array(end - begin)
    let written = 0
    parts.forEach((bytes, i) => {
      const blockStart = (first + i) * REMOTE_BLOCK_SIZE
      const from = Math.max(0, begin - blockStart)
      const to = Math.min(bytes.length, end - blockStart)
      if (to > from) {
        out.set(bytes.subarray(from, to), written)
        written += to - from
      }
    })
    return written === out.length ? out : out.subarray(0, written)
  }
}

/** Sizes already read for a URL (e.g. by the page's first probe), so the viewer does not ask again. */
const knownRemoteSizes = new Map<string, number>()

export const rememberRemoteFileSize = (url: string, size: number) => {
  if (size > 0) knownRemoteSizes.set(url, size)
}

/** Total size of a remote file, from a 1-byte Range request (`Content-Range: bytes 0-0/<size>`). */
export const remoteFileSize = async (
  url: string,
  headers: Record<string, string> = {},
) => {
  const known = knownRemoteSizes.get(url)
  if (known) return known
  const controller = new AbortController()
  try {
    const response = await fetch(url, {
      headers: { ...headers, Range: 'bytes=0-0' },
      signal: controller.signal,
    })
    const total = response.headers.get('Content-Range')?.split('/')[1]
    if (response.status === 206 && total && /^\d+$/.test(total)) {
      rememberRemoteFileSize(url, Number(total))
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
 * Local files: 1 MB steps, up to 16 MB from the end. Remote files: 1 MB steps (cached blocks), 1 MB from the end.
 */
export { REMOTE_SCAN }

export const findPdfEnd = async (
  read: PdfByteReader,
  size: number,
  scan: ScanLimits = LOCAL_SCAN,
): Promise<number> => {
  if (size <= 0) return size

  const tailStart = Math.max(0, size - 1024)
  const tailBytes = await read(tailStart, size)
  if (latin1.decode(tailBytes).includes('startxref')) return size

  // Ends in zeros: padded, so look for where the padding starts.
  if (isAllZero(tailBytes)) {
    const found = await findEndBeforePadding(read, size)
    if (found > 0) return found
  }

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

  // A small PDF followed by a large zero-padded area: find where the padding starts with a few
  // rounds of small reads in parallel, instead of reading the whole document block by block.
  const found = await findEndBeforePadding(read, size)
  if (found > 0) return found

  // Fallback: forwards from the start, block by block.
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

/** Bytes read at each probe point, and probe points per round (a browser runs 6 at once per host). */
const PROBE_SIZE = 4 * 1024
const PROBES_PER_ROUND = 6
/** Stop narrowing when the window is this small, then look for %%EOF in it. */
const FINAL_WINDOW = 1024 * 1024

/**
 * Where a zero-padded PDF ends. Probes small pieces spread over the file in parallel: the padding
 * starts after the last probe holding data. Narrows that gap a few times, then finds the last %%EOF
 * just before the padding. Returns -1 when this does not work (the caller then scans in order).
 */
const findEndBeforePadding = async (
  read: PdfByteReader,
  size: number,
): Promise<number> => {
  const zeroAt = async (pos: number) =>
    isAllZero(await read(pos, Math.min(size, pos + PROBE_SIZE)))

  // [low, high): `low` holds data, `high` is padding, all the way to the end.
  let low = 0
  let high = size
  if (await zeroAt(0)) return -1
  while (high - low > FINAL_WINDOW) {
    const step = (high - low) / (PROBES_PER_ROUND + 1)
    const points = Array.from({ length: PROBES_PER_ROUND }, (_, i) =>
      Math.floor(low + step * (i + 1)),
    )
    const zero = await Promise.all(points.map(zeroAt))
    // The first probe after which every probe is zero: padding runs to the end from there.
    let firstPad = points.length
    while (firstPad > 0 && zero[firstPad - 1]) firstPad--
    const nextLow = firstPad === 0 ? low : points[firstPad - 1]
    const nextHigh = firstPad === points.length ? high : points[firstPad]
    if (nextHigh - nextLow >= high - low) break
    low = nextLow
    high = nextHigh
  }

  // The last %%EOF before the padding starts.
  const from = Math.max(0, low - EOF_MARKER.length)
  const to = Math.min(size, high + PROBE_SIZE)
  const bytes = await read(from, to)
  const index = latin1.decode(bytes).lastIndexOf(EOF_MARKER)
  return index >= 0 ? from + afterEof(bytes, index) : -1
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
  const length = await findPdfEnd(read, size, REMOTE_SCAN)
  prefetchRemotePdf(read, length)
  return { length, read, size }
}

/** A real PDF up to this size is fetched whole, in parallel, as soon as its end is known. */
const PREFETCH_ALL_MAX = 32 * 1024 * 1024
/** Larger ones: the first and last blocks (page 1 and the cross-reference table). */
const PREFETCH_HEAD_BLOCKS = 8
const PREFETCH_TAIL_BLOCKS = 2

/**
 * pdf.js asks for one piece at a time (each piece tells it what to read next), so on a slow server
 * page 1 waits for a long chain of requests. Starting the reads at once, in parallel, means those
 * requests are answered from memory. Last block first (pdf.js starts at the end), then from the start.
 */
const prefetchRemotePdf = (read: PdfByteReader, length: number) => {
  const blockCount = Math.ceil(length / REMOTE_BLOCK_SIZE)
  if (blockCount <= 0) return
  const all = blockCount * REMOTE_BLOCK_SIZE <= PREFETCH_ALL_MAX
  const order: number[] = []
  const add = (index: number) => {
    if (index >= 0 && index < blockCount && !order.includes(index))
      order.push(index)
  }
  for (let i = 1; i <= PREFETCH_TAIL_BLOCKS; i++) add(blockCount - i)
  const head = all ? blockCount : Math.min(blockCount, PREFETCH_HEAD_BLOCKS)
  for (let i = 0; i < head; i++) add(i)
  for (const index of order) {
    const start = index * REMOTE_BLOCK_SIZE
    // Errors are ignored here: pdf.js reads the block again when it needs it.
    // A whole block, even past the PDF's end, so it is kept for pdf.js (small reads are not).
    read(start, start + REMOTE_BLOCK_SIZE).catch(() => undefined)
  }
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
