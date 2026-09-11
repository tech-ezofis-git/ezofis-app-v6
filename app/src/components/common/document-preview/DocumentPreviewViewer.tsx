import { useLingui } from '@lingui/react/macro'
import { type DocumentLoadEvent, Viewer, Worker } from '@react-pdf-viewer/core'
import {
  searchPlugin,
  type HighlightArea,
  type RenderHighlightsProps,
} from '@react-pdf-viewer/search'
import { FileText } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import Icon from '@/components/base/icon/Icon'
import SkeletonDocumentPreview from '@/components/common/skeletons/SkeletonDocumentPreview'
import {
  buildFieldSearchKeywords,
  getFieldDisplayValue,
  getFieldSearchVariantStrings,
} from '@/pages/folders/utils/fieldPdfSearch'
import {
  getFileExtension,
  resolveDocumentPreviewKind,
} from '@/pages/folders/utils/documentDetailsUtils'
import CollaboraPreviewViewer from '@/pages/folders/components/CollaboraPreviewViewer'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/search/lib/styles/index.css'

type ViewerMode =
  | 'pdf'
  | 'image'
  | 'tiff'
  | 'office'
  | 'spreadsheet'
  | 'word'
  | 'text'
  | 'office-remote'
  | 'unsupported'

const SPREADSHEET_EXTS = new Set(['xlsx', 'xls', 'xlsm', 'xlsb', 'csv', 'ods'])
const WORD_EXTS = new Set(['docx', 'doc', 'rtf', 'odt'])
const TEXT_EXTS = new Set([
  'txt',
  'json',
  'xml',
  'md',
  'log',
  'html',
  'htm',
  'tsv',
])
const OFFICE_REMOTE_EXTS = new Set([
  ...SPREADSHEET_EXTS,
  ...WORD_EXTS,
  'ppt',
  'pptx',
])

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url)

const resolveViewerMode = ({
  fileName,
  fileUrl,
  isImage,
  isPdf,
}: {
  fileName?: string
  fileUrl: string | null
  isImage: boolean
  isPdf: boolean
}): ViewerMode => {
  if (isPdf) return 'pdf'
  if (isImage) {
    const kind = resolveDocumentPreviewKind('image/*', fileName)
    return kind === 'tiff' ? 'tiff' : 'image'
  }

  const ext = getFileExtension(fileName)
  const kind = resolveDocumentPreviewKind('', fileName)
  if (kind === 'pdf') return 'pdf'
  if (kind === 'image') return 'image'
  if (kind === 'tiff') return 'tiff'
  if (kind === 'office') return 'office'

  if (SPREADSHEET_EXTS.has(ext)) return 'spreadsheet'
  if (WORD_EXTS.has(ext)) return 'word'
  if (TEXT_EXTS.has(ext)) return 'text'

  // Public Office URLs can use Microsoft's online viewer as a fallback.
  if (fileUrl && isHttpUrl(fileUrl) && OFFICE_REMOTE_EXTS.has(ext)) {
    return 'office-remote'
  }

  return 'unsupported'
}

const PDF_WORKER_URL = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString()

/**
 * SpecialZoomLevel.PageWidth re-scales pages while they are still rendering,
 * which makes @react-pdf-viewer 3.12 paint scanned pages as solid black
 * (react-pdf-viewer#1293). Measure the first page instead and render once at a
 * fixed scale.
 */
const PROBE_SCALE = 0.25
const PAGE_WIDTH_GUTTER = 24
const MIN_PAGE_SCALE = 0.1
const MAX_PAGE_SCALE = 5
const MIN_USER_ZOOM = 0.5
const MAX_USER_ZOOM = 2.5

type DocumentPreviewViewerProps = {
  activeHighlightColor?: string
  activeHighlightTerm?: string | null
  className?: string
  enableHighlight?: boolean
  fileBlob?: Blob | null
  fileName?: string
  fileUrl: string | null
  /** Increment to force scroll to the active highlight term. */
  focusRequestId?: number
  /** Hex/CSS colors keyed by highlight term / search variant. */
  highlightColors?: Record<string, string>
  highlightTerms?: string[]
  isImage?: boolean
  isLoading?: boolean
  isPdf?: boolean
  onProbeComplete?: (matchedValues: string[]) => void
  probeTerms?: string[]
  showScanOverlay?: boolean
}

type PdfViewerProps = {
  activeHighlightColor?: string
  activeHighlightTerm?: string | null
  fileUrl: string
  focusRequestId?: number
  highlightColors?: Record<string, string>
  highlightTerms?: string[]
  onProbeComplete?: (matchedValues: string[]) => void
  probeTerms?: string[]
}

const hexToRgba = (color: string, alpha: number) => {
  const raw = String(color || '').trim()
  if (raw.startsWith('rgba') || raw.startsWith('rgb')) return raw
  const hex = raw.replace('#', '')
  if (hex.length !== 3 && hex.length !== 6) {
    return `color-mix(in srgb, ${raw} ${Math.round(alpha * 100)}%, transparent)`
  }
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : hex
  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((part) => Number.isNaN(part))) {
    return `color-mix(in srgb, ${raw} ${Math.round(alpha * 100)}%, transparent)`
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const normalizeHighlightKey = (value: string) =>
  String(value || '')
    .replace(/\\([.*+?^${}()|[\]\\])/g, '$1')
    .replace(/\\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const resolveHighlightColor = (
  source: string,
  colors: Record<string, string>,
  textContent?: string,
) => {
  const candidates = [source, textContent || '']
    .map(normalizeHighlightKey)
    .filter(Boolean)

  for (const candidate of candidates) {
    const exact = Object.entries(colors).find(
      ([term]) => normalizeHighlightKey(term) === candidate,
    )?.[1]
    if (exact) return exact
  }

  // Prefer the longest color key contained in the highlighted text/source.
  let best: { color: string; length: number } | null = null
  for (const [term, color] of Object.entries(colors)) {
    const key = normalizeHighlightKey(term)
    if (!key) continue
    const hit = candidates.some(
      (candidate) => candidate.includes(key) || key.includes(candidate),
    )
    if (!hit) continue
    if (!best || key.length > best.length) {
      best = { color, length: key.length }
    }
  }
  return best?.color || null
}

const getScrollParent = (element: HTMLElement | null) => {
  let node: HTMLElement | null = element
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    if (
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node
    }
    node = node.parentElement
  }
  return null
}

const scrollElementIntoView = (element: HTMLElement) => {
  const scrollParent =
    getScrollParent(element) ||
    element.closest('.rpv-core__inner-pages') ||
    element.closest('.rpv-core__viewer')

  if (scrollParent instanceof HTMLElement) {
    const elementRect = element.getBoundingClientRect()
    const parentRect = scrollParent.getBoundingClientRect()
    const offset =
      elementRect.top -
      parentRect.top -
      parentRect.height / 2 +
      elementRect.height / 2
    scrollParent.scrollBy({ top: offset, behavior: 'smooth' })
    return
  }

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  })
}

/** Merge same-line word fragments into one continuous box (fixes |__||__| look). */
const isValidHighlightArea = (area: HighlightArea): boolean => {
  const str = String(area.keywordStr || '').trim()
  if (!str || str.length < 2) return false
  if (/^[\s\-_=|.,:;]+$/.test(str)) return false

  const { height, width } = area
  // Drop ultra-thin wide boxes (table rules / line graphics in the text layer).
  if (height < 0.3) return false
  if (height < 0.55 && width > height * 6) return false
  if (width < 0.08 && height > width * 4) return false

  return true
}

const mergeHighlightAreas = (areas: HighlightArea[]): HighlightArea[] => {
  const valid = areas.filter(isValidHighlightArea)
  if (valid.length <= 1) return valid

  const sorted = [...valid].sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top
    return a.left - b.left
  })

  const merged: HighlightArea[] = []

  for (const area of sorted) {
    const last = merged[merged.length - 1]
    if (!last) {
      merged.push({ ...area })
      continue
    }

    const sameKeyword =
      normalizeHighlightKey(last.keywordStr) ===
      normalizeHighlightKey(area.keywordStr)
    const lineTolerance = Math.max(last.height, area.height) * 0.35
    const sameLine =
      Math.abs(last.top - area.top) <= lineTolerance &&
      Math.abs(last.top + last.height - area.top - area.height) <=
        lineTolerance * 1.5
    const lastRight = last.left + last.width
    const gap = area.left - lastRight
    // Only merge direct word spacing — not across table cells.
    const maxGap = Math.max(last.height, area.height) * 0.65
    const adjacent = gap >= -0.5 && gap <= maxGap

    if (sameKeyword && sameLine && adjacent) {
      const right = Math.max(lastRight, area.left + area.width)
      const top = Math.min(last.top, area.top)
      const bottom = Math.max(last.top + last.height, area.top + area.height)
      last.left = Math.min(last.left, area.left)
      last.top = top
      last.width = right - last.left
      last.height = bottom - top
      continue
    }

    merged.push({ ...area })
  }

  return merged
}

const applyHighlightStyles = (
  element: HTMLElement,
  color: string,
  isActive: boolean,
) => {
  element.style.backgroundColor = hexToRgba(color, isActive ? 0.32 : 0.2)
  element.style.outline = `2px solid ${color}`
  element.style.border = 'none'
  element.style.borderRadius = '2px'
  element.style.mixBlendMode = 'multiply'
  element.style.boxShadow = 'none'
}

function ZoomToolbar({
  scale,
  onZoom,
}: {
  scale: number
  onZoom: (nextScale: number) => void
}) {
  const { t } = useLingui()
  const zoomBy = (direction: -1 | 1) => {
    const step = scale <= 1 ? 0.05 : 0.1
    const next = Number((scale + direction * step).toFixed(2))
    onZoom(Math.min(MAX_USER_ZOOM, Math.max(MIN_USER_ZOOM, next)))
  }

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-[var(--gray-3)] bg-surface/90 px-4 py-2 shadow-2xl backdrop-blur-sm duration-300'>
      <button
        aria-label={t`Zoom out`}
        className='p-1 text-[var(--gray-11)] transition-all hover:text-[var(--primary-9)] active:scale-90 disabled:cursor-not-allowed disabled:opacity-40'
        disabled={scale <= MIN_USER_ZOOM}
        type='button'
        onClick={() => zoomBy(-1)}
      >
        <Icon className='size-5' name='lucide:zoom-out' />
      </button>
      <span className='min-w-[40px] text-center text-[12px] font-semibold text-[var(--gray-13)]'>
        {Math.round(scale * 100)}%
      </span>
      <button
        aria-label={t`Zoom in`}
        className='p-1 text-[var(--gray-11)] transition-all hover:text-[var(--primary-9)] active:scale-90 disabled:cursor-not-allowed disabled:opacity-40'
        disabled={scale >= MAX_USER_ZOOM}
        type='button'
        onClick={() => zoomBy(1)}
      >
        <Icon className='size-5' name='lucide:zoom-in' />
      </button>
    </div>
  )
}

export default function DocumentPreviewViewer({
  activeHighlightColor,
  activeHighlightTerm,
  className = '',
  enableHighlight = false,
  fileBlob,
  fileName,
  fileUrl,
  focusRequestId = 0,
  highlightColors = {},
  highlightTerms = [],
  isImage = false,
  isLoading = false,
  isPdf = false,
  onProbeComplete,
  probeTerms = [],
  showScanOverlay = false,
}: DocumentPreviewViewerProps) {
  const mode = resolveViewerMode({
    fileName,
    fileUrl,
    isImage,
    isPdf,
  })

  let content = null

  if (isLoading) {
    content = <SkeletonDocumentPreview />
  } else if (!fileUrl && !fileBlob) {
    content = (
      <UnsupportedPreview fileName={fileName} message='Preview not available' />
    )
  } else if (mode === 'office') {
    content = (
      <CollaboraPreviewViewer
        fileBlob={fileBlob}
        fileName={fileName}
        fileUrl={fileUrl}
      />
    )
  } else if (mode === 'pdf') {
    if (!fileUrl) {
      content = (
        <UnsupportedPreview
          fileName={fileName}
          message='Preview not available'
        />
      )
    } else {
      content = (
        <PdfViewer
          activeHighlightColor={activeHighlightColor}
          activeHighlightTerm={activeHighlightTerm}
          fileUrl={fileUrl}
          focusRequestId={focusRequestId}
          highlightColors={enableHighlight ? highlightColors : {}}
          highlightTerms={enableHighlight ? highlightTerms : []}
          key={fileUrl}
          onProbeComplete={onProbeComplete}
          probeTerms={probeTerms}
        />
      )
    }
  } else if (mode === 'tiff') {
    content = (
      <UnsupportedPreview
        fileName={fileName}
        message='TIFF preview is not supported in the browser'
        hint='Download the file to view it, or upload a PDF / PNG / JPEG for in-app preview.'
      />
    )
  } else if (mode === 'image' && fileUrl) {
    content = <ImagePreview fileName={fileName} fileUrl={fileUrl} />
  } else if (mode === 'spreadsheet' && fileUrl) {
    content = <SpreadsheetPreview fileName={fileName} fileUrl={fileUrl} />
  } else if (mode === 'word' && fileUrl) {
    content = <WordPreview fileName={fileName} fileUrl={fileUrl} />
  } else if (mode === 'text' && fileUrl) {
    content = <TextFilePreview fileName={fileName} fileUrl={fileUrl} />
  } else if (mode === 'office-remote' && fileUrl) {
    content = <OfficeOnlinePreview fileName={fileName} fileUrl={fileUrl} />
  } else {
    content = (
      <UnsupportedPreview
        fileName={fileName}
        fileUrl={fileUrl}
        message='Preview not available'
        hint='This file type cannot be previewed here. Open or download it instead.'
      />
    )
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[var(--gray-1)] ${className}`}
    >
      {content}

      {showScanOverlay && fileUrl ? (
        <div className='pointer-events-none absolute inset-0 z-10 overflow-hidden'>
          <div className='bg-[color-mix(in srgb,var(--primary-9)_3%,transparent)] absolute inset-0' />
          <div
            className='animate-scan absolute right-0 left-0 h-[1px] bg-[var(--primary-5)] shadow-[0_0_6px_var(--primary-7)]'
            style={{ animationDuration: '8s' }}
          />
        </div>
      ) : null}
    </div>
  )
}

function UnsupportedPreview({
  fileName,
  fileUrl,
  hint,
  message,
}: {
  fileName?: string
  fileUrl?: string | null
  hint?: string
  message: string
}) {
  return (
    <div className='flex h-full min-h-[320px] flex-col items-center justify-center gap-2 bg-[var(--gray-1)] px-6 text-center'>
      <FileText className='text-[var(--primary-9)]' size={40} />
      <p className='text-sm font-semibold text-[var(--gray-13)]'>{message}</p>
      {fileName ? (
        <p className='text-xs font-medium text-[var(--gray-9)]'>{fileName}</p>
      ) : null}
      {hint ? (
        <p className='max-w-sm text-xs text-[var(--gray-10)]'>{hint}</p>
      ) : null}
      {fileUrl ? (
        <a
          className='mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--gray-4)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--primary-9)] transition hover:bg-[var(--primary-1)]'
          href={fileUrl}
          rel='noreferrer'
          target='_blank'
        >
          <Icon className='size-3.5' name='lucide:external-link' />
          Open file
        </a>
      ) : null}
    </div>
  )
}

function SpreadsheetPreview({
  fileName,
  fileUrl,
}: {
  fileName?: string
  fileUrl: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<string[][]>([])
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const workbookRef = useRef<XLSX.WorkBook | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      workbookRef.current = null
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Unable to load spreadsheet')
        const buffer = await response.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const names = workbook.SheetNames || []
        if (!names.length) throw new Error('No sheets found in this file')
        if (cancelled) return
        workbookRef.current = workbook
        setSheetNames(names)
        setActiveSheet(names[0])
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to preview spreadsheet',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [fileUrl])

  useEffect(() => {
    const workbook = workbookRef.current
    if (!workbook || !activeSheet) return
    const sheet = workbook.Sheets[activeSheet]
    if (!sheet) {
      setRows([])
      return
    }
    const matrix = XLSX.utils.sheet_to_json<
      Array<string | number | boolean | null>
    >(sheet, {
      blankrows: false,
      defval: '',
      header: 1,
    })
    setRows(
      matrix
        .slice(0, 200)
        .map((row) =>
          (Array.isArray(row) ? row : []).map((cell) =>
            cell == null ? '' : String(cell),
          ),
        ),
    )
  }, [activeSheet, loading, sheetNames])

  if (loading) return <SkeletonDocumentPreview />
  if (error) {
    return (
      <UnsupportedPreview
        fileName={fileName}
        fileUrl={fileUrl}
        hint={error}
        message='Unable to preview spreadsheet'
      />
    )
  }

  const colCount = Math.max(1, ...rows.map((row) => row.length))

  return (
    <div className='flex h-full min-h-[320px] w-full flex-col bg-[var(--gray-1)]'>
      {sheetNames.length > 1 ? (
        <div className='flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--gray-3)] bg-surface px-3 py-2'>
          {sheetNames.map((name) => (
            <button
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition ${
                name === activeSheet
                  ? 'bg-[var(--primary-9)] text-white'
                  : 'bg-[var(--gray-2)] text-[var(--gray-11)] hover:bg-[var(--gray-3)]'
              }`}
              key={name}
              type='button'
              onClick={() => setActiveSheet(name)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <div className='min-h-0 flex-1 overflow-auto p-3'>
        {rows.length === 0 ? (
          <div className='flex h-full items-center justify-center text-xs text-[var(--gray-10)]'>
            Sheet is empty
          </div>
        ) : (
          <table className='min-w-full border-collapse text-left text-[12px]'>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  className={
                    rowIndex === 0
                      ? 'bg-[var(--gray-2)] font-semibold text-[var(--gray-13)]'
                      : 'text-[var(--gray-12)]'
                  }
                  key={`row-${rowIndex}`}
                >
                  {Array.from({ length: colCount }, (_, colIndex) => (
                    <td
                      className='max-w-[240px] truncate border border-[var(--gray-4)] bg-surface px-2.5 py-1.5'
                      key={`cell-${rowIndex}-${colIndex}`}
                      title={row[colIndex] || ''}
                    >
                      {row[colIndex] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className='shrink-0 border-t border-[var(--gray-3)] bg-surface px-3 py-1.5 text-[10px] text-[var(--gray-9)]'>
        Showing first {rows.length} row{rows.length === 1 ? '' : 's'}
        {fileName ? ` · ${fileName}` : ''}
      </div>
    </div>
  )
}

function WordPreview({
  fileName,
  fileUrl,
}: {
  fileName?: string
  fileUrl: string
}) {
  const ext = getFileExtension(fileName)

  // Prefer in-browser DOCX rendering for uploaded / blob / fetchable files.
  if (ext === 'docx') {
    return <DocxRenderedPreview fileName={fileName} fileUrl={fileUrl} />
  }

  // Public URLs for other Office formats can use Microsoft Office Online.
  if (isHttpUrl(fileUrl)) {
    return <OfficeOnlinePreview fileName={fileName} fileUrl={fileUrl} />
  }

  return (
    <UnsupportedPreview
      fileName={fileName}
      fileUrl={fileUrl}
      hint='Legacy Word (.doc) and some Office formats cannot be rendered in the browser. Open the file instead.'
      message='Preview not available'
    />
  )
}

const DEFAULT_DOCX_ZOOM = 0.7

function DocxRenderedPreview({
  fileName,
  fileUrl,
}: {
  fileName?: string
  fileUrl: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(DEFAULT_DOCX_ZOOM)

  useEffect(() => {
    let cancelled = false
    setScale(DEFAULT_DOCX_ZOOM)

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Unable to load document')
        const buffer = await response.arrayBuffer()
        if (buffer.byteLength < 4) {
          throw new Error('File is empty or not a valid Word document')
        }

        const xml = await extractDocxDocumentXml(buffer)
        if (!xml) {
          throw new Error(
            'Could not read Word document contents. Try Open file, or re-save as .docx.',
          )
        }

        const paragraphs = xml
          .split(/<\/w:p>/i)
          .map((chunk) => {
            const texts = [
              ...chunk.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi),
            ].map((match) => decodeXmlEntities(match[1] || ''))
            return texts.join('')
          })
          .map((text) => text.replace(/\s+/g, ' ').trim())
          .filter(Boolean)

        if (!paragraphs.length) {
          // Tables / text boxes may still have content under <w:t>.
          const loose = [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)]
            .map((match) => decodeXmlEntities(match[1] || '').trim())
            .filter(Boolean)
          if (!loose.length) {
            throw new Error('No readable text found in this Word document')
          }
          if (!cancelled) {
            setHtml(
              `<p class="mb-2 leading-relaxed text-[13px] text-[var(--gray-12)]">${escapeHtml(loose.join(' '))}</p>`,
            )
          }
          return
        }

        if (!cancelled) {
          setHtml(
            paragraphs
              .map(
                (paragraph) =>
                  `<p class="mb-2 leading-relaxed text-[13px] text-[var(--gray-12)]">${escapeHtml(paragraph)}</p>`,
              )
              .join(''),
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to preview Word document',
          )
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (error) {
    return (
      <UnsupportedPreview
        fileName={fileName}
        fileUrl={fileUrl}
        hint={error}
        message='Unable to preview Word document'
      />
    )
  }

  return (
    <div className='relative h-full min-h-[320px] bg-[var(--gray-2)]'>
      {loading && (
        <div className='absolute inset-0 z-10'>
          <SkeletonDocumentPreview />
        </div>
      )}
      <div ref={styleRef} className='hidden' />
      {/* Scroll only this pane so the zoom toolbar stays pinned. */}
      <div className='h-full overflow-auto'>
        <div
          className={cn(
            'flex min-h-full min-w-full justify-center px-3 py-4',
            loading && 'invisible',
          )}
        >
          <div
            ref={containerRef}
            className='ez-docx-preview origin-top transition-transform duration-200'
            style={{ transform: `scale(${scale})` }}
          />
        </div>
      </div>
      {!loading && <ZoomToolbar scale={scale} onZoom={setScale} />}
      <style>{`
        .ez-docx-preview .ez-docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
        }
        .ez-docx-preview .ez-docx {
          background: #fff !important;
          box-shadow: 0 1px 3px rgba(0,0,0,.08);
          margin: 0 auto 16px !important;
          padding: 48px 56px !important;
          color: #111;
        }
        .ez-docx-preview .ez-docx section.ez-docx {
          min-height: auto;
        }
        .ez-docx-preview table {
          border-collapse: collapse;
        }
        .ez-docx-preview td,
        .ez-docx-preview th {
          border: 1px solid #d0d0d0;
          padding: 4px 8px;
        }
      `}</style>
    </div>
  )
}

function TextFilePreview({
  fileName,
  fileUrl,
}: {
  fileName?: string
  fileUrl: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Unable to load file')
        const content = await response.text()
        if (!cancelled) setText(content.slice(0, 200_000))
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to preview file',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (loading) return <SkeletonDocumentPreview />
  if (error) {
    return (
      <UnsupportedPreview
        fileName={fileName}
        fileUrl={fileUrl}
        hint={error}
        message='Unable to preview file'
      />
    )
  }

  return (
    <div className='h-full min-h-[320px] overflow-auto bg-[var(--gray-1)] p-4'>
      <pre className='rounded-xl border border-[var(--gray-3)] bg-surface p-4 text-[12px] leading-relaxed break-words whitespace-pre-wrap text-[var(--gray-12)]'>
        {text}
      </pre>
    </div>
  )
}

function OfficeOnlinePreview({
  fileName,
  fileUrl,
}: {
  fileName?: string
  fileUrl: string
}) {
  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`

  return (
    <div className='relative h-full min-h-[320px] w-full bg-[var(--gray-1)]'>
      <iframe
        className='h-full w-full border-0'
        src={embedUrl}
        title={fileName || 'Office document preview'}
      />
    </div>
  )
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

async function inflateRaw(payload: Uint8Array): Promise<Uint8Array> {
  const copy = Uint8Array.from(payload)
  const stream = new Blob([copy])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * Read `word/document.xml` from a .docx (ZIP) using the central directory.
 * Local-header-only parsing fails on many Office files that use data descriptors.
 */
async function extractDocxDocumentXml(
  buffer: ArrayBuffer,
): Promise<string | null> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const decoder = new TextDecoder('utf-8')

  // PK\x03\x04 = local, PK\x01\x02 = central, PK\x05\x06 = EOCD
  if (
    bytes.length < 22 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    bytes[2] !== 0x03 ||
    bytes[3] !== 0x04
  ) {
    return null
  }

  // Find End of Central Directory (scan backwards; comment can follow it).
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocd = i
      break
    }
    // Don't scan forever on huge trailing comments.
    if (bytes.length - i > 65_536) break
  }
  if (eocd < 0) return extractDocxDocumentXmlFallback(bytes, view, decoder)

  const totalEntries = view.getUint16(eocd + 10, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  if (centralOffset >= bytes.length) {
    return extractDocxDocumentXmlFallback(bytes, view, decoder)
  }

  let offset = centralOffset
  for (let entry = 0; entry < totalEntries; entry++) {
    if (
      offset + 46 > bytes.length ||
      bytes[offset] !== 0x50 ||
      bytes[offset + 1] !== 0x4b ||
      bytes[offset + 2] !== 0x01 ||
      bytes[offset + 3] !== 0x02
    ) {
      break
    }

    const compression = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const nameStart = offset + 46
    const nameEnd = nameStart + nameLength
    if (nameEnd > bytes.length) break

    const name = decoder
      .decode(bytes.subarray(nameStart, nameEnd))
      .replace(/\\/g, '/')
    offset = nameEnd + extraLength + commentLength

    if (!/(^|\/)word\/document\.xml$/i.test(name)) continue

    if (
      localHeaderOffset + 30 > bytes.length ||
      bytes[localHeaderOffset] !== 0x50 ||
      bytes[localHeaderOffset + 1] !== 0x4b ||
      bytes[localHeaderOffset + 2] !== 0x03 ||
      bytes[localHeaderOffset + 3] !== 0x04
    ) {
      return null
    }

    const localNameLength = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
    const dataStart =
      localHeaderOffset + 30 + localNameLength + localExtraLength
    const dataEnd = dataStart + compressedSize
    if (dataEnd > bytes.length) return null

    const payload = bytes.subarray(dataStart, dataEnd)
    if (compression === 0) return decoder.decode(payload)
    if (compression !== 8) return null

    try {
      return decoder.decode(await inflateRaw(payload))
    } catch {
      return null
    }
  }

  return extractDocxDocumentXmlFallback(bytes, view, decoder)
}

/** Fallback when EOCD/central directory is missing or incomplete. */
async function extractDocxDocumentXmlFallback(
  bytes: Uint8Array,
  view: DataView,
  decoder: TextDecoder,
): Promise<string | null> {
  for (let offset = 0; offset + 30 < bytes.length; ) {
    if (
      bytes[offset] !== 0x50 ||
      bytes[offset + 1] !== 0x4b ||
      bytes[offset + 2] !== 0x03 ||
      bytes[offset + 3] !== 0x04
    ) {
      offset += 1
      continue
    }

    const flags = view.getUint16(offset + 6, true)
    const compression = view.getUint16(offset + 8, true)
    let compressedSize = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const nameEnd = nameStart + nameLength
    if (nameEnd > bytes.length) break

    const name = decoder
      .decode(bytes.subarray(nameStart, nameEnd))
      .replace(/\\/g, '/')
    const dataStart = nameEnd + extraLength
    const hasDataDescriptor = (flags & 0x08) !== 0

    // When bit 3 is set, sizes in the local header are zero — scan for
    // the data descriptor (PK\x07\x08) or next local header.
    if (hasDataDescriptor && compressedSize === 0) {
      let cursor = dataStart
      let found = -1
      while (cursor + 16 < bytes.length) {
        if (
          bytes[cursor] === 0x50 &&
          bytes[cursor + 1] === 0x4b &&
          ((bytes[cursor + 2] === 0x07 && bytes[cursor + 3] === 0x08) ||
            (bytes[cursor + 2] === 0x03 && bytes[cursor + 3] === 0x04) ||
            (bytes[cursor + 2] === 0x01 && bytes[cursor + 3] === 0x02))
        ) {
          found = cursor
          break
        }
        cursor += 1
      }
      if (found < 0) break
      compressedSize = found - dataStart
      // Optional signature before CRC in data descriptor.
      const nextOffset =
        bytes[found + 2] === 0x07 && bytes[found + 3] === 0x08
          ? found + 16
          : found

      if (/(^|\/)word\/document\.xml$/i.test(name)) {
        const payload = bytes.subarray(dataStart, dataStart + compressedSize)
        if (compression === 0) return decoder.decode(payload)
        if (compression !== 8) return null
        try {
          return decoder.decode(await inflateRaw(payload))
        } catch {
          return null
        }
      }

      offset = nextOffset
      continue
    }

    const dataEnd = dataStart + compressedSize
    if (dataEnd > bytes.length) break

    if (/(^|\/)word\/document\.xml$/i.test(name)) {
      const payload = bytes.subarray(dataStart, dataEnd)
      if (compression === 0) return decoder.decode(payload)
      if (compression !== 8) return null
      try {
        return decoder.decode(await inflateRaw(payload))
      } catch {
        return null
      }
    }

    offset = dataEnd
  }

  return null
}

function ImagePreview({
  fileName,
  fileUrl,
}: {
  fileName?: string
  fileUrl: string
}) {
  const [scale, setScale] = useState(1)

  return (
    <div className='relative h-full w-full overflow-auto bg-[var(--gray-1)]'>
      <div className='flex min-h-full min-w-full items-center justify-center p-4'>
        <img
          alt={fileName || 'Document Preview'}
          className='max-h-full max-w-full origin-center object-contain transition-transform duration-200'
          src={fileUrl}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
      <ZoomToolbar scale={scale} onZoom={setScale} />
    </div>
  )
}

function PdfViewer({
  activeHighlightColor,
  activeHighlightTerm,
  fileUrl,
  focusRequestId = 0,
  highlightColors = {},
  highlightTerms = [],
  onProbeComplete,
  probeTerms = [],
}: PdfViewerProps) {
  const colorsRef = useRef(highlightColors)
  colorsRef.current = highlightColors
  const activeTermRef = useRef(activeHighlightTerm)
  activeTermRef.current = activeHighlightTerm
  const highlightElementsRef = useRef<Map<string, HTMLElement[]>>(new Map())

  const onProbeCompleteRef = useRef(onProbeComplete)
  onProbeCompleteRef.current = onProbeComplete

  // searchPlugin uses React hooks internally — must run every render (not in useMemo).
  const currentSearchPluginInstance = searchPlugin({
    renderHighlights: (props: RenderHighlightsProps) => {
      const areas = mergeHighlightAreas(props.highlightAreas)
      return (
        <>
          {areas.map((area, index) => {
            const source = String(area.keywordStr || '').trim()
            const color =
              resolveHighlightColor(source, colorsRef.current, source) ||
              '#94a3b8'
            const normalizedActive = normalizeHighlightKey(
              String(activeTermRef.current || ''),
            )
            const isActive =
              Boolean(normalizedActive) &&
              (normalizeHighlightKey(source) === normalizedActive ||
                normalizedActive.includes(normalizeHighlightKey(source)) ||
                normalizeHighlightKey(source).includes(normalizedActive))

            return (
              <div
                className='rpv-search__highlight'
                data-highlight-source={source}
                data-highlight-text={source}
                data-index={index}
                key={`${area.pageIndex}-${index}-${area.left.toFixed(2)}-${area.top.toFixed(2)}`}
                ref={(element) => {
                  if (!element) return
                  applyHighlightStyles(element, color, isActive)
                  const mapKey = normalizeHighlightKey(source)
                  if (!mapKey) return
                  const list = highlightElementsRef.current.get(mapKey) || []
                  if (!list.includes(element)) {
                    list.push(element)
                    highlightElementsRef.current.set(mapKey, list)
                  }
                }}
                style={{
                  ...props.getCssProperties(area),
                  position: 'absolute',
                }}
                title={source}
              />
            )
          })}
        </>
      )
    },
  })
  const searchPluginInstanceRef = useRef<ReturnType<
    typeof searchPlugin
  > | null>(null)
  if (searchPluginInstanceRef.current) {
    Object.assign(searchPluginInstanceRef.current, currentSearchPluginInstance)
  } else {
    searchPluginInstanceRef.current = { ...currentSearchPluginInstance }
  }
  const searchPluginInstance = searchPluginInstanceRef.current

  const [documentReady, setDocumentReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [probeDone, setProbeDone] = useState(false)
  const [renderAttempt, setRenderAttempt] = useState(0)
  const [pageScale, setPageScale] = useState<number | null>(null)
  const [scale, setScale] = useState(1)
  const blankRetryUsedRef = useRef(false)
  const viewerRef = useRef<{ zoom?: (nextScale: number) => void } | null>(null)

  const zoomPluginInstance = useMemo(
    () => ({
      install: (pluginFunctions: { zoom?: (nextScale: number) => void }) => {
        viewerRef.current = pluginFunctions
      },
      onViewerStateChange: (viewerState: any) => {
        if (viewerState?.scale) {
          setScale((previous) =>
            previous === viewerState.scale
              ? previous
              : viewerState.scale || previous,
          )
        }
        return viewerState
      },
      onZoom: (event: { scale: number }) => {
        setScale(event.scale)
      },
    }),
    [],
  )

  const zoomTo = (nextScale: number) => {
    const boundedScale = Math.min(
      MAX_USER_ZOOM,
      Math.max(MIN_USER_ZOOM, Number(nextScale.toFixed(2))),
    )
    setScale(boundedScale)
    viewerRef.current?.zoom?.(boundedScale)
  }

  const handleDocumentLoad = (event: DocumentLoadEvent) => {
    setLoadError(null)

    if (pageScale !== null) {
      setDocumentReady(true)
      return
    }

    const containerWidth = viewerContainerRef.current?.clientWidth ?? 0

    if (!containerWidth) {
      setPageScale(1)
      setScale(1)
      return
    }

    event.doc
      .getPage(1)
      .then((page) => {
        const pageWidth = page.getViewport({ scale: 1 }).width
        const usableWidth = Math.max(containerWidth - PAGE_WIDTH_GUTTER, 1)
        const nextScale = pageWidth > 0 ? usableWidth / pageWidth : 1
        const fitted = Math.min(
          Math.max(nextScale, MIN_PAGE_SCALE),
          MAX_PAGE_SCALE,
        )

        setPageScale(fitted)
        setScale(fitted)
      })
      .catch(() => {
        setPageScale(1)
        setScale(1)
      })
  }
  const [matchesVersion, setMatchesVersion] = useState(0)
  const lastHighlightKeyRef = useRef('')
  const probeRunIdRef = useRef(0)
  const matchesRef = useRef<
    Array<{ pageIndex: number; source: string; startIndex: number }>
  >([])
  const viewerContainerRef = useRef<HTMLDivElement>(null)

  const highlightKey = useMemo(() => {
    return highlightTerms
      .map((term) => getFieldDisplayValue(term))
      .filter(Boolean)
      .join('\u0001')
  }, [highlightTerms])

  const colorsKey = useMemo(
    () =>
      Object.entries(highlightColors)
        .map(([term, color]) => `${term}=${color}`)
        .join('\u0001'),
    [highlightColors],
  )

  const probeKey = useMemo(() => {
    return probeTerms
      .map((term) => getFieldDisplayValue(term))
      .filter(Boolean)
      .join('\u0001')
  }, [probeTerms])

  useEffect(() => {
    setDocumentReady(false)
    setLoadError(null)
    setProbeDone(false)
    lastHighlightKeyRef.current = ''
    matchesRef.current = []
    highlightElementsRef.current = new Map()
    probeRunIdRef.current += 1
    setScale(1)
    viewerRef.current = null
  }, [fileUrl, renderAttempt])

  // Page canvases use a non-alpha 2d context, so a canvas that never received
  // pixels paints solid black instead of staying transparent. Re-mount the
  // document once when that happens so the pages render again.
  useEffect(() => {
    if (!documentReady || blankRetryUsedRef.current) return

    const container = viewerContainerRef.current
    if (!container) return

    let cancelled = false

    const isBlankCanvas = (canvas: HTMLCanvasElement) => {
      const { height, width } = canvas
      if (!width || !height) return false

      const context = canvas.getContext('2d')
      if (!context) return false

      const samples = [0.2, 0.5, 0.8]

      try {
        for (const ratioY of samples) {
          for (const ratioX of samples) {
            const [red, green, blue] = context.getImageData(
              Math.floor(width * ratioX),
              Math.floor(height * ratioY),
              1,
              1,
            ).data
            if (red || green || blue) return false
          }
        }
      } catch {
        return false
      }

      return true
    }

    const retryWhenBlank = () => {
      if (cancelled || blankRetryUsedRef.current) return

      const canvases = Array.from(
        container.querySelectorAll<HTMLCanvasElement>('canvas'),
      ).filter((canvas) => !canvas.hidden && canvas.width && canvas.height)

      if (!canvases.length || !canvases.every(isBlankCanvas)) return

      blankRetryUsedRef.current = true
      setRenderAttempt((previous) => previous + 1)
    }

    const timers = [
      window.setTimeout(retryWhenBlank, 400),
      window.setTimeout(retryWhenBlank, 1200),
    ]

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [documentReady])

  useEffect(() => {
    if (!documentReady) return

    if (!probeKey) {
      setProbeDone(true)
      onProbeCompleteRef.current?.([])
      return
    }

    const runId = ++probeRunIdRef.current
    let cancelled = false
    const plugin = searchPluginInstanceRef.current

    const runProbe = async () => {
      await new Promise((resolve) => setTimeout(resolve, 150))
      if (cancelled || runId !== probeRunIdRef.current || !plugin) return

      const matched: string[] = []
      const uniqueTerms = [...new Set(probeKey.split('\u0001').filter(Boolean))]

      for (const term of uniqueTerms) {
        if (cancelled || runId !== probeRunIdRef.current) return
        const keywords = buildFieldSearchKeywords(term)
        if (!keywords.length) continue

        let found = false
        for (const keyword of keywords) {
          if (cancelled || runId !== probeRunIdRef.current) return
          try {
            plugin.clearHighlights()
            const matches = await plugin.highlight([keyword])
            if (matches?.length > 0) {
              found = true
              break
            }
          } catch {
            // Search plugin not ready yet for this term
          }
        }
        if (found) matched.push(term)
      }

      if (cancelled || runId !== probeRunIdRef.current) return
      try {
        plugin.clearHighlights()
      } catch {
        // ignore
      }
      setProbeDone(true)
      onProbeCompleteRef.current?.(matched)
    }

    void runProbe()

    return () => {
      cancelled = true
    }
  }, [documentReady, probeKey])

  useEffect(() => {
    if (!documentReady || !probeDone) return
    const nextKey = `${highlightKey}::${colorsKey}`
    if (lastHighlightKeyRef.current === nextKey) return
    lastHighlightKeyRef.current = nextKey

    const plugin = searchPluginInstanceRef.current
    if (!plugin) return

    let cancelled = false

    const applyHighlights = async () => {
      try {
        highlightElementsRef.current = new Map()
        if (!highlightKey) {
          matchesRef.current = []
          plugin.clearHighlights()
          return
        }
        const keywords = highlightKey.split('\u0001').flatMap((term) => {
          const variants = buildFieldSearchKeywords(term)
          if (!variants.length) return []
          // Date variants only — amounts use the full phrase to avoid false hits.
          if (/^\d{4}-\d{2}-\d{2}$/.test(term)) {
            return variants
          }
          return [variants[0]]
        })
        if (!keywords.length) {
          matchesRef.current = []
          plugin.clearHighlights()
          return
        }
        const matches = await plugin.highlight(keywords)
        if (cancelled) return
        matchesRef.current = (matches || []).map((match) => ({
          pageIndex: match.pageIndex,
          source: String(match.keyword?.source || ''),
          startIndex: match.startIndex,
        }))
        setMatchesVersion((previous) => previous + 1)
      } catch {
        // Search plugin not ready yet
      }
    }

    void applyHighlights()

    return () => {
      cancelled = true
    }
  }, [highlightKey, colorsKey, documentReady, probeDone])

  useEffect(() => {
    const container = viewerContainerRef.current
    if (!container) return

    const normalizedActive = normalizeHighlightKey(
      String(activeHighlightTerm || ''),
    )
    const highlights = container.querySelectorAll('.rpv-search__highlight')

    highlights.forEach((node) => {
      const element = node as HTMLElement
      const source = element.dataset.highlightSource || ''
      const text = element.dataset.highlightText || element.textContent || ''
      const color =
        resolveHighlightColor(source, colorsRef.current, text) || '#94a3b8'
      const isActive =
        Boolean(normalizedActive) &&
        (normalizeHighlightKey(source) === normalizedActive ||
          normalizeHighlightKey(text) === normalizedActive ||
          normalizeHighlightKey(text).includes(normalizedActive) ||
          normalizedActive.includes(normalizeHighlightKey(text)))

      applyHighlightStyles(element, color, isActive)
    })
  }, [activeHighlightTerm, focusRequestId, matchesVersion, colorsKey])

  useEffect(() => {
    if (!documentReady || !probeDone || !activeHighlightTerm) return
    if (focusRequestId <= 0) return

    const plugin = searchPluginInstanceRef.current
    if (!plugin) return

    const variants = new Set(
      getFieldSearchVariantStrings(activeHighlightTerm).map((value) =>
        normalizeHighlightKey(value),
      ),
    )
    variants.add(normalizeHighlightKey(activeHighlightTerm))

    const matchIndex = matchesRef.current.findIndex((match) => {
      const source = normalizeHighlightKey(match.source)
      if (!source) return false
      if (variants.has(source)) return true
      return [...variants].some(
        (variant) => source.includes(variant) || variant.includes(source),
      )
    })

    const findTargetElement = (): HTMLElement | null => {
      const container = viewerContainerRef.current
      const current = container?.querySelector(
        '.rpv-search__highlight--current',
      ) as HTMLElement | null
      if (current) return current

      for (const variant of variants) {
        const elements = highlightElementsRef.current.get(variant)
        if (elements?.[0]) return elements[0]
      }

      const allHighlights = container?.querySelectorAll(
        '.rpv-search__highlight',
      )
      if (!allHighlights?.length) return null

      for (const node of allHighlights) {
        const element = node as HTMLElement
        const source = normalizeHighlightKey(
          element.dataset.highlightSource || '',
        )
        const text = normalizeHighlightKey(element.dataset.highlightText || '')
        if (
          (source && variants.has(source)) ||
          (text && variants.has(text)) ||
          [...variants].some(
            (variant) =>
              (text && (text.includes(variant) || variant.includes(text))) ||
              (source &&
                (source.includes(variant) || variant.includes(source))),
          )
        ) {
          return element
        }
      }
      return null
    }

    const scrollHighlightIntoView = () => {
      const target = findTargetElement()
      if (target) scrollElementIntoView(target)
    }

    try {
      if (matchIndex >= 0) {
        // jumpToMatch is 1-based
        plugin.jumpToMatch(matchIndex + 1)
      }
    } catch {
      // ignore
    }

    const timer = window.setTimeout(scrollHighlightIntoView, 80)
    const retryTimer = window.setTimeout(scrollHighlightIntoView, 220)
    const lateTimer = window.setTimeout(scrollHighlightIntoView, 500)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(retryTimer)
      window.clearTimeout(lateTimer)
    }
  }, [
    activeHighlightTerm,
    focusRequestId,
    documentReady,
    probeDone,
    highlightKey,
    matchesVersion,
  ])

  return (
    <div
      className='relative h-full min-h-[320px] w-full bg-[var(--gray-1)]'
      ref={viewerContainerRef}
    >
      {!documentReady && !loadError ? (
        <SkeletonDocumentPreview className='absolute inset-0 z-10' />
      ) : null}

      {loadError ? (
        <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--gray-1)] px-6 text-center'>
          <FileText className='text-[var(--primary-9)]' size={40} />
          <p className='text-sm font-semibold text-[var(--gray-13)]'>
            Unable to display this document
          </p>
          <p className='text-xs text-[var(--gray-10)]'>{loadError}</p>
        </div>
      ) : null}

      <div
        className={`h-full w-full ${documentReady ? 'opacity-100' : 'opacity-0'}`}
      >
        <Worker
          key={`${renderAttempt}-${pageScale ?? 'probe'}`}
          workerUrl={PDF_WORKER_URL}
        >
          <Viewer
            defaultScale={pageScale ?? PROBE_SCALE}
            fileUrl={fileUrl}
            plugins={[searchPluginInstance, zoomPluginInstance]}
            renderError={() => (
              <div className='flex h-full min-h-[320px] items-center justify-center bg-[var(--gray-1)] text-sm text-[var(--gray-11)]'>
                Unable to display this document
              </div>
            )}
            onDocumentLoad={handleDocumentLoad}
          />
        </Worker>
      </div>

      {documentReady && !loadError ? (
        <ZoomToolbar scale={scale} onZoom={zoomTo} />
      ) : null}
    </div>
  )
}
