import { describe, expect, it, vi } from 'vitest'
import { findPdfEnd, type PdfByteReader, REMOTE_SCAN } from './pdfSource'

vi.mock('pdfjs-dist', () => ({ PDFDataRangeTransport: class {} }))

const MB = 1024 * 1024

/** A sparse "file": real bytes at the start, then `padding` zero bytes, then optional trailer. */
const virtualFile = (head: string, padding: number, trailer = '') => {
  const headBytes = new TextEncoder().encode(head)
  const trailerBytes = new TextEncoder().encode(trailer)
  const size = headBytes.length + padding + trailerBytes.length
  const reads: Array<[number, number]> = []
  const read: PdfByteReader = async (begin, end) => {
    reads.push([begin, end])
    const out = new Uint8Array(end - begin)
    for (let pos = begin; pos < end; pos++) {
      if (pos < headBytes.length) out[pos - begin] = headBytes[pos]
      else if (pos >= headBytes.length + padding) {
        out[pos - begin] = trailerBytes[pos - headBytes.length - padding]
      }
    }
    return out
  }
  const bytesRead = () => reads.reduce((sum, [b, e]) => sum + (e - b), 0)
  return { bytesRead, read, size }
}

const PDF =
  '%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\n0 1\ntrailer\n<<>>\nstartxref\n9\n%%EOF\n'

describe('findPdfEnd', () => {
  it('keeps a normal PDF whole (startxref in the last 1 KB)', async () => {
    const file = virtualFile(PDF, 0)
    expect(await findPdfEnd(file.read, file.size)).toBe(file.size)
  })

  it('cuts a little junk after %%EOF', async () => {
    const file = virtualFile(PDF, 5000)
    expect(await findPdfEnd(file.read, file.size)).toBe(PDF.length)
  })

  it('finds the end of a small PDF padded to 2 GB, reading only a few MB', async () => {
    const file = virtualFile(PDF, 2 * 1024 * MB)
    expect(await findPdfEnd(file.read, file.size)).toBe(PDF.length)
    // 16 MB from the end, then the first blocks from the start: never the whole file.
    expect(file.bytesRead()).toBeLessThan(20 * MB)
  })

  it('reads under 1 MB for a padded 2 GB file on the server', async () => {
    const file = virtualFile(PDF, 2 * 1024 * MB)
    expect(await findPdfEnd(file.read, file.size, REMOTE_SCAN)).toBe(PDF.length)
    expect(file.bytesRead()).toBeLessThan(1 * MB)
  })

  it('uses the last %%EOF when a file was updated incrementally', async () => {
    const updated = `${PDF}2 0 obj\n<<>>\nendobj\nstartxref\n50\n%%EOF\n`
    const file = virtualFile(updated, 3 * MB)
    expect(await findPdfEnd(file.read, file.size)).toBe(updated.length)
  })

  it('leaves files without an end marker to pdf.js', async () => {
    const file = virtualFile('%PDF-1.4\nbroken', 100)
    expect(await findPdfEnd(file.read, file.size)).toBe(file.size)
  })
})
