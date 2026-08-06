import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import { useLingui } from '@lingui/react/macro'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import SignatureCanvas from 'react-signature-canvas'
import { Rnd } from 'react-rnd'
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Crosshair,
  Download,
  Eraser,
  FileText,
  Loader2,
  Minus,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import type { Option } from '@/types/option'
import { getUsers } from '@/api/v6/user'
import type { CreateSignRequestPayload } from '@/api/v6/folder/signRequest'
import type { SignRequestFieldDto } from '@/api/v6/folder/signRequest'
import {
  collectSignRequestFields,
  createSignRequest,
  submitSignRequest,
} from '@/api/v6/folder/signRequest'
import { saveSignRequestFields } from '../utils/signRequestFieldsStorage'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tooltip from '@/components/base/Tooltip'
import showToast from '@/components/base/toast/showToast'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import styles from './DocumentSigningPage.module.css'
import { SignRequestAssignForm } from './SignRequestAssignForm'

const EMPTY_SIGNATURE_FIELDS: SignRequestFieldDto[] = []

export interface SavedSignature {
  id: string
  name: string
  type: 'typed' | 'drawn' | 'uploaded'
  imageUrl: string
}

export interface SignaturePlacement {
  signatureId?: string
  source: 'typed' | 'drawn' | 'uploaded' | 'saved'
  imageDataUrl: string
  /** PDF page (1-based) */
  pageNumber: number
  /** PDF points, origin top-left */
  x: number
  y: number
  width: number
  height: number
}

export interface SignatureAssignment {
  assigneeName: string
  assigneeEmail?: string
  x: number
  y: number
  width: number
  height: number
}

export interface DocumentSigningPageProps {
  documentUrl: string
  documentName?: string
  signerName?: string
  savedSignatures?: SavedSignature[]
  isLoading?: boolean
  isPdf?: boolean
  isImage?: boolean
  /** page = full takeover; inline = menu picker + place on details viewer */
  mode?: 'page' | 'inline'
  /** Required for mode="inline" — wraps the details DocumentPreviewViewer */
  externalSurfaceRef?: RefObject<HTMLDivElement | null>
  /** Inline only: toolbar Sign button used to position the share-style menu. */
  pickerAnchorRef?: RefObject<HTMLElement | null>
  repositoryId?: string
  itemId?: string
  /** Existing sign request to submit against (Path B). If omitted, a single self-request is created first. */
  signRequestId?: string
  signerEmail?: string
  /** Preset signature places from API — used when signing an invite/pending request. */
  signatureFields?: SignRequestFieldDto[]
  /** When true, signer may only fill their own active fields (no free placement). */
  restrictToFields?: boolean
  /**
   * Inline only: draw assigned places on the details PDF without the signing toolbar.
   * Used so places stay visible after Send / before the assignee clicks Sign.
   */
  overlayOnly?: boolean
  /**
   * Bump this when the user clicks Sign so the menu always opens
   * (even if the signing layer was already mounted in overlay-only mode).
   */
  openPickerKey?: number
  onBack?: () => void
  onSaveSignature?: (
    signature: Omit<SavedSignature, 'id'>,
  ) => void | Promise<void>
  onDeleteSavedSignature?: (signatureId: string) => void | Promise<void>
  onCompleteSigning?: (
    placements: SignaturePlacement[],
  ) => void | Promise<void>
  onSaveAssignment?: (
    assignments: SignatureAssignment[],
  ) => void | Promise<void>
  onSignRequestCreated?: (payload?: {
    signRequestId: string
    fields?: SignRequestFieldDto[]
  }) => void
}

type SignatureTab = 'type' | 'draw' | 'upload' | 'saved'
type SignatureSource = 'typed' | 'drawn' | 'uploaded' | 'saved'
type WorkspaceMode = 'create' | 'assign'

type ActiveSignature = {
  source: SignatureSource
  imageDataUrl: string
  signatureId?: string
  name?: string
}

type PlacementState = {
  x: number
  y: number
  width: number
  height: number
}

type PlacedSignature = PlacementState & {
  id: string
  signature: ActiveSignature
}

type PlacedAssignment = PlacementState & {
  id: string
  assigneeName: string
  assigneeEmail?: string
}

type HistorySnapshot = {
  placements: PlacedSignature[]
  assignments: PlacedAssignment[]
}

let boxIdCounter = 0
function nextBoxId(prefix: string) {
  boxIdCounter += 1
  return `${prefix}-${Date.now()}-${boxIdCounter}`
}

const SIZE_PRESETS = {
  small: { width: 120, height: 50 },
  medium: { width: 180, height: 75 },
  large: { width: 240, height: 100 },
} as const

const TYPED_STYLES = [
  {
    id: 'brush',
    label: 'Brush',
    fontFamily: '"Brush Script MT", "Segoe Script", cursive',
  },
  {
    id: 'lucida',
    label: 'Lucida',
    fontFamily: '"Lucida Handwriting", cursive',
  },
  {
    id: 'chancery',
    label: 'Chancery',
    fontFamily: '"Apple Chancery", cursive',
  },
  {
    id: 'urw',
    label: 'URW',
    fontFamily: '"URW Chancery L", cursive',
  },
] as const

const SIGNATURE_COLORS = [
  { id: 'ink', label: 'Ink', value: 'var(--text-primary)' },
  { id: 'navy', label: 'Navy', value: 'var(--accent-primary)' },
  { id: 'slate', label: 'Slate', value: 'var(--text-secondary)' },
  { id: 'muted', label: 'Muted', value: 'var(--text-muted)' },
] as const

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/jpg']

const DEFAULT_PLACEMENT = SIZE_PRESETS.medium

const RESIZE_HANDLES = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
  top: true,
  right: true,
  bottom: true,
  left: true,
} as const

const RESIZE_HANDLE_CLASSES = {
  topLeft: styles.handle,
  topRight: styles.handle,
  bottomLeft: styles.handle,
  bottomRight: styles.handle,
  top: `${styles.handle} ${styles.handleTop}`,
  right: `${styles.handle} ${styles.handleRight}`,
  bottom: `${styles.handle} ${styles.handleBottom}`,
  left: `${styles.handle} ${styles.handleLeft}`,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeCoord(value: number, total: number) {
  if (!total) return 0
  return clamp(Number((value / total).toFixed(4)), 0, 1)
}

async function toPngDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl) return dataUrl
  if (dataUrl.startsWith('data:image/png')) return dataUrl

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, img.naturalWidth || img.width || 1)
      canvas.height = Math.max(1, img.naturalHeight || img.height || 1)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Unable to convert signature image'))
    img.src = dataUrl
  })
}

type PageRect = { left: number; top: number; width: number; height: number }

function getPageRects(
  surfaceRoot: HTMLElement | null | undefined,
  layerHost: HTMLElement,
  zoom: number,
): PageRect[] {
  const hostRect = layerHost.getBoundingClientRect()
  const pageEls = Array.from(
    surfaceRoot?.querySelectorAll('.rpv-core__inner-page') || [],
  ) as HTMLElement[]
  if (pageEls.length === 0) {
    return [
      {
        left: 0,
        top: 0,
        width: layerHost.offsetWidth,
        height: layerHost.offsetHeight,
      },
    ]
  }
  return pageEls.map((el) => {
    const r = el.getBoundingClientRect()
    return {
      left: (r.left - hostRect.left) / zoom,
      top: (r.top - hostRect.top) / zoom,
      width: r.width / zoom,
      height: r.height / zoom,
    }
  })
}

function mapBoxToPdfPoints(
  box: PlacementState,
  pageRects: PageRect[],
  pageSizesPt: Array<{ width: number; height: number }>,
) {
  const centerY = box.y + box.height / 2
  let pageIndex = pageRects.findIndex(
    (rect) => centerY >= rect.top && centerY <= rect.top + rect.height,
  )
  if (pageIndex < 0) pageIndex = 0
  const rect = pageRects[pageIndex] || pageRects[0]
  const size = pageSizesPt[pageIndex] ||
    pageSizesPt[0] || {
      width: rect.width,
      height: rect.height,
    }
  const scaleX = size.width / Math.max(1, rect.width)
  const scaleY = size.height / Math.max(1, rect.height)
  return {
    pageNumber: pageIndex + 1,
    x: Number(((box.x - rect.left) * scaleX).toFixed(2)),
    y: Number(((box.y - rect.top) * scaleY).toFixed(2)),
    width: Number((box.width * scaleX).toFixed(2)),
    height: Number((box.height * scaleY).toFixed(2)),
  }
}

function mapPdfFieldToScreen(
  field: {
    pageNumber: number
    x: number
    y: number
    width: number
    height: number
  },
  pageRects: PageRect[],
  pageSizesPt: Array<{ width: number; height: number }>,
): PlacementState | null {
  const pageIndex = Math.max(0, (Number(field.pageNumber) || 1) - 1)
  const rect = pageRects[pageIndex] || pageRects[0]
  if (!rect) return null
  const size = pageSizesPt[pageIndex] || {
    width: rect.width,
    height: rect.height,
  }
  const scaleX = rect.width / Math.max(1, size.width)
  const scaleY = rect.height / Math.max(1, size.height)
  return {
    x: rect.left + Number(field.x) * scaleX,
    y: rect.top + Number(field.y) * scaleY,
    width: Math.max(48, Number(field.width) * scaleX),
    height: Math.max(24, Number(field.height) * scaleY),
  }
}

function fieldKey(field: SignRequestFieldDto, index: number) {
  return (
    field.fieldId ||
    `${field.signerEmail || 'signer'}-${field.pageNumber}-${field.x}-${field.y}-${index}`
  )
}

function isFieldForCurrentSigner(
  field: SignRequestFieldDto,
  currentEmail: string,
) {
  if (!currentEmail) return true
  const fieldEmail = String(field.signerEmail || '')
    .trim()
    .toLowerCase()
  if (!fieldEmail) return true
  return fieldEmail === currentEmail
}

function isFieldSigned(field: SignRequestFieldDto) {
  const status = String(field.status || '').toUpperCase()
  return status === 'SIGNED' || Boolean(field.signedAtUtc)
}

function createTypedSignatureDataUrl(
  name: string,
  fontFamily: string,
  color: string,
) {
  const safeName = name.trim() || 'Signature'
  const width = Math.max(280, Math.min(640, safeName.length * 28))
  const height = 96
  const fill = resolveCssColor(color)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="transparent"/>
  <text
    x="50%"
    y="58%"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="${fill}"
    font-family='${fontFamily.replace(/'/g, "\\'")}'
    font-size="42"
  >${safeName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')}</text>
</svg>`.trim()

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

function resolveCssColor(token: string) {
  if (token === 'var(--text-primary)') return '#1a1a1a'
  if (token === 'var(--accent-primary)') return '#1a1a1a'
  if (token === 'var(--text-secondary)') return '#4b5563'
  if (token === 'var(--text-muted)') return '#9ca3af'
  if (token.startsWith('var(')) return '#1a1a1a'
  return token || '#1a1a1a'
}

export function DocumentSigningPage({
  documentUrl,
  documentName = 'Document.pdf',
  signerName = '',
  savedSignatures = [],
  isLoading = false,
  isPdf = true,
  isImage = false,
  mode = 'page',
  externalSurfaceRef,
  pickerAnchorRef,
  repositoryId = '',
  itemId = '',
  signRequestId = '',
  signerEmail = '',
  signatureFields = EMPTY_SIGNATURE_FIELDS,
  restrictToFields = false,
  overlayOnly = false,
  openPickerKey = 0,
  onBack,
  onSaveSignature,
  onDeleteSavedSignature,
  onCompleteSigning,
  onSaveAssignment,
  onSignRequestCreated,
}: DocumentSigningPageProps) {
  const { t } = useLingui()
  const isInline = mode === 'inline'
  const currentSignerEmail = String(signerEmail || '')
    .trim()
    .toLowerCase()
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('create')
  // Request-sign must place new areas even if prior assigned fields exist.
  const fieldSigning = Boolean(
    restrictToFields &&
      signatureFields.length > 0 &&
      workspaceMode === 'create',
  )
  // Popup opens whenever full signing UI is active (not overlay-only markers).
  const [showPicker, setShowPicker] = useState(!overlayOnly)
  const [activeTab, setActiveTab] = useState<SignatureTab>('draw')
  const [typedName, setTypedName] = useState(signerName)
  const [typedStyleId, setTypedStyleId] = useState<string>(TYPED_STYLES[0].id)
  const [signatureColor, setSignatureColor] = useState<string>(
    SIGNATURE_COLORS[0].value,
  )
  const [saveTyped, setSaveTyped] = useState(false)
  const [saveDrawn, setSaveDrawn] = useState(false)
  const [saveUploaded, setSaveUploaded] = useState(false)

  const [hasDrawnStroke, setHasDrawnStroke] = useState(false)
  const [penColor, setPenColor] = useState<string>(SIGNATURE_COLORS[0].value)
  const [penWidth, setPenWidth] = useState(2)

  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [activeSignature, setActiveSignature] =
    useState<ActiveSignature | null>(null)
  const [placements, setPlacements] = useState<PlacedSignature[]>([])
  const [assignments, setAssignments] = useState<PlacedAssignment[]>([])
  /** Filled signature images keyed by API field id / composite key */
  const [fieldSignatures, setFieldSignatures] = useState<
    Record<string, string>
  >({})
  const [pageSizesPt, setPageSizesPt] = useState<
    Array<{ width: number; height: number }>
  >([])
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
  const [assigneeOptions, setAssigneeOptions] = useState<Option[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState<Option | null>(null)
  const [readyToMarkAssignment, setReadyToMarkAssignment] = useState(false)
  const [pendingRequestPayload, setPendingRequestPayload] =
    useState<CreateSignRequestPayload | null>(null)
  const [showGuides, setShowGuides] = useState(false)

  const [zoom, setZoom] = useState(1)
  const [completing, setCompleting] = useState(false)
  const [savedOnce, setSavedOnce] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [historyTick, setHistoryTick] = useState(0)
  const [layerHost, setLayerHost] = useState<HTMLElement | null>(null)

  const signaturePadRef = useRef<SignatureCanvas | null>(null)
  const documentSurfaceRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pickerPanelRef = useRef<HTMLDivElement | null>(null)
  const readySignatureRef = useRef(false)
  const closeSignaturePickerRef = useRef<() => void>(() => {})
  const [pickerPanelPos, setPickerPanelPos] = useState<{
    top: number
    left: number
  } | null>(null)
  const historyRef = useRef<{ index: number; stack: HistorySnapshot[] }>({
    index: -1,
    stack: [],
  })

  const selectedBox: PlacementState | null =
    placements.find((item) => item.id === selectedBoxId) ||
    assignments.find((item) => item.id === selectedBoxId) ||
    null

  const assigneeName = selectedAssignee?.name || ''
  const assigneeEmail =
    selectedAssignee?.value || selectedAssignee?.description || ''

  useEffect(() => {
    let cancelled = false
    const loadPageSizes = async () => {
      if (!isPdf || !documentUrl) {
        setPageSizesPt([])
        return
      }
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'
        const pdf = await pdfjsLib.getDocument(documentUrl).promise
        const sizes: Array<{ width: number; height: number }> = []
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1 })
          sizes.push({ width: viewport.width, height: viewport.height })
        }
        if (!cancelled) setPageSizesPt(sizes)
      } catch (error) {
        console.error(error)
        if (!cancelled) setPageSizesPt([])
      }
    }
    void loadPageSizes()
    return () => {
      cancelled = true
    }
  }, [documentUrl, isPdf])

  useEffect(() => {
    setTypedName(signerName)
  }, [signerName])

  useEffect(() => {
    if (overlayOnly) {
      setShowPicker(false)
      return
    }
    // Sign button / entering signing mode — always open the menu on Draw.
    if (isInline) {
      setActiveTab('draw')
      setShowPicker(true)
    }
  }, [overlayOnly, isInline, openPickerKey])

  useLayoutEffect(() => {
    if (!isInline || !showPicker) {
      setPickerPanelPos(null)
      return
    }
    const update = () => {
      const width = 380
      const anchor = pickerAnchorRef?.current
      if (anchor) {
        const rect = anchor.getBoundingClientRect()
        const left = Math.min(
          Math.max(8, rect.right - width),
          window.innerWidth - width - 8,
        )
        setPickerPanelPos({ left, top: rect.bottom + 12 })
        return
      }
      // forceSigning / missing trigger: top-right under header
      setPickerPanelPos({
        left: Math.max(8, window.innerWidth - width - 16),
        top: 72,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [isInline, showPicker, pickerAnchorRef, openPickerKey])

  useEffect(() => {
    if (!isInline || !showPicker) return
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        pickerPanelRef.current?.contains(target) ||
        pickerAnchorRef?.current?.contains(target)
      ) {
        return
      }
      // Close via shared handler (exits signing if no signature was created).
      closeSignaturePickerRef.current()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isInline, showPicker, pickerAnchorRef])

  useEffect(() => {
    let mounted = true
    void getUsers().then((response) => {
      if (!mounted || response.error || !Array.isArray(response.data)) return
      setAssigneeOptions(
        response.data
          .filter((user) => Boolean(user.displayName?.trim() || user.email?.trim()))
          .map((user) => ({
            description: user.email || undefined,
            id: user.id || user.email,
            name: user.displayName || user.email,
            value: user.email,
          })),
      )
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const root = isInline
      ? externalSurfaceRef?.current ?? null
      : documentSurfaceRef.current
    if (!root || isLoading) {
      setLayerHost((previous) => (previous === null ? previous : null))
      return
    }

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    const attachLayer = () => {
      if (cancelled) return

      const innerPages = root.querySelector(
        '.rpv-core__inner-pages',
      ) as HTMLElement | null

      if (innerPages) {
        const content = (innerPages.firstElementChild ||
          innerPages) as HTMLElement
        if (getComputedStyle(content).position === 'static') {
          content.style.position = 'relative'
        }

        let layer = content.querySelector(
          ':scope > [data-signing-layer]',
        ) as HTMLElement | null

        if (!layer) {
          layer = document.createElement('div')
          layer.setAttribute('data-signing-layer', 'true')
          content.appendChild(layer)
        }

        const height = Math.max(
          content.scrollHeight,
          content.clientHeight,
          innerPages.scrollHeight,
          640,
        )
        layer.style.cssText = `position:absolute;inset:0 auto auto 0;width:100%;height:${height}px;pointer-events:none;z-index:30;`
        setLayerHost((previous) => (previous === layer ? previous : layer))

        resizeObserver?.disconnect()
        resizeObserver = new ResizeObserver(() => {
          const nextHeight = Math.max(
            content.scrollHeight,
            content.clientHeight,
            innerPages.scrollHeight,
            640,
          )
          layer!.style.height = `${nextHeight}px`
        })
        resizeObserver.observe(content)
        resizeObserver.observe(innerPages)
        return
      }

      // Image / non-PDF fallback: overlay on the surface itself
      if (getComputedStyle(root).position === 'static') {
        root.style.position = 'relative'
      }
      let fallback = root.querySelector(
        ':scope > [data-signing-layer]',
      ) as HTMLElement | null
      if (!fallback) {
        fallback = document.createElement('div')
        fallback.setAttribute('data-signing-layer', 'true')
        root.appendChild(fallback)
      }
      fallback.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:30;'
      setLayerHost((previous) => (previous === fallback ? previous : fallback))
    }

    attachLayer()
    const observer = new MutationObserver(attachLayer)
    observer.observe(root, { childList: true, subtree: true })
    const intervalId = window.setInterval(attachLayer, 700)

    return () => {
      cancelled = true
      observer.disconnect()
      resizeObserver?.disconnect()
      window.clearInterval(intervalId)
      const existing = root.querySelectorAll('[data-signing-layer]')
      existing.forEach((node) => node.parentElement?.removeChild(node))
      setLayerHost(null)
    }
  }, [documentUrl, externalSurfaceRef, isImage, isInline, isLoading, isPdf])

  const typedStyle = useMemo(
    () =>
      TYPED_STYLES.find((style) => style.id === typedStyleId) || TYPED_STYLES[0],
    [typedStyleId],
  )

  const typedPreviewUrl = useMemo(
    () =>
      createTypedSignatureDataUrl(
        typedName || 'Your Name',
        typedStyle.fontFamily,
        signatureColor,
      ),
    [typedName, typedStyle.fontFamily, signatureColor],
  )

  const zoomPercent = Math.round(zoom * 100)
  const canUndo = historyRef.current.index >= 0
  const canRedo =
    historyRef.current.index < historyRef.current.stack.length - 1

  const commitSnapshot = useCallback(
    (nextPlacements: PlacedSignature[], nextAssignments: PlacedAssignment[]) => {
      const { index, stack } = historyRef.current
      const trimmed = stack.slice(0, index + 1)
      trimmed.push({
        placements: nextPlacements,
        assignments: nextAssignments,
      })
      historyRef.current = { index: trimmed.length - 1, stack: trimmed }
      setPlacements(nextPlacements)
      setAssignments(nextAssignments)
      setHistoryTick((value) => value + 1)
    },
    [],
  )

  const applyActiveSignature = useCallback(
    async (
      signature: ActiveSignature,
      options?: {
        save?: boolean
        name?: string
        type?: SavedSignature['type']
        /** Keep the signature picker open (auto-sync from active tab). */
        keepPickerOpen?: boolean
      },
    ) => {
      setActiveSignature(signature)
      setSelectedBoxId(null)
      setValidationMessage('')
      if (isInline && !options?.keepPickerOpen) setShowPicker(false)

      if (options?.save && onSaveSignature) {
        await onSaveSignature({
          name: options.name || options.type || 'Signature',
          type: options.type || 'drawn',
          imageUrl: signature.imageDataUrl,
        })
      }
    },
    [isInline, onSaveSignature],
  )

  const notifySigningError = useCallback((message: string) => {
    setValidationMessage('')
    showToast({ message, variant: 'error' })
  }, [])

  const handleUseTyped = async (options?: { keepPickerOpen?: boolean }) => {
    if (!typedName.trim()) {
      if (!options?.keepPickerOpen) {
        notifySigningError(t`Enter your full name to create a typed signature.`)
      }
      return
    }
    setValidationMessage('')
    const imageDataUrl = createTypedSignatureDataUrl(
      typedName.trim(),
      typedStyle.fontFamily,
      signatureColor,
    )
    await applyActiveSignature(
      { source: 'typed', imageDataUrl, name: typedName.trim() },
      {
        save: options?.keepPickerOpen ? false : saveTyped,
        name: typedName.trim(),
        type: 'typed',
        keepPickerOpen: options?.keepPickerOpen,
      },
    )
  }

  const handleUseDrawn = async (options?: { keepPickerOpen?: boolean }) => {
    const pad = signaturePadRef.current
    if (!pad || pad.isEmpty()) {
      if (!options?.keepPickerOpen) {
        notifySigningError(t`Draw your signature before using it.`)
      }
      return
    }
    setValidationMessage('')
    const imageDataUrl = pad.toDataURL('image/png')
    await applyActiveSignature(
      { source: 'drawn', imageDataUrl, name: typedName.trim() || t`Drawn signature` },
      {
        save: options?.keepPickerOpen ? false : saveDrawn,
        name: typedName.trim() || t`Drawn signature`,
        type: 'drawn',
        keepPickerOpen: options?.keepPickerOpen,
      },
    )
  }

  const handleUseUploaded = async (options?: { keepPickerOpen?: boolean }) => {
    if (!uploadedDataUrl) {
      if (!options?.keepPickerOpen) {
        notifySigningError(t`Upload a signature image first.`)
      }
      return
    }
    setValidationMessage('')
    await applyActiveSignature(
      {
        source: 'uploaded',
        imageDataUrl: uploadedDataUrl,
        name: uploadedFileName || t`Uploaded signature`,
      },
      {
        save: options?.keepPickerOpen ? false : saveUploaded,
        name: uploadedFileName || t`Uploaded signature`,
        type: 'uploaded',
        keepPickerOpen: options?.keepPickerOpen,
      },
    )
  }

  const handleUseSaved = async (signature: SavedSignature) => {
    setSelectedSavedId(signature.id)
    await applyActiveSignature({
      source: 'saved',
      imageDataUrl: signature.imageUrl,
      signatureId: signature.id,
      name: signature.name,
    })
  }

  // Active tab owns the signature — sync it automatically (no "Use signature" button).
  useEffect(() => {
    if (activeTab !== 'type') return
    if (!typedName.trim()) {
      setActiveSignature(null)
      return
    }
    const timer = window.setTimeout(() => {
      void handleUseTyped({ keepPickerOpen: true })
    }, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from active tab inputs only
  }, [activeTab, typedName, typedStyleId, signatureColor])

  useEffect(() => {
    if (activeTab !== 'draw') return
    if (!hasDrawnStroke) {
      // Empty draw pad — do not keep a typed/upload signature ready (no place cursor).
      setActiveSignature(null)
    }
  }, [activeTab, hasDrawnStroke])

  useEffect(() => {
    if (activeTab !== 'upload') return
    if (!uploadedDataUrl) {
      setActiveSignature(null)
      return
    }
    void handleUseUploaded({ keepPickerOpen: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, uploadedDataUrl, uploadedFileName])

  const syncDrawnSignature = () => {
    if (activeTab !== 'draw') return
    setHasDrawnStroke(true)
    void handleUseDrawn({ keepPickerOpen: true })
  }

  const hasReadySignatureForActiveTab =
    activeTab === 'type'
      ? Boolean(typedName.trim() && activeSignature?.source === 'typed')
      : activeTab === 'draw'
        ? Boolean(hasDrawnStroke && activeSignature?.source === 'drawn')
        : activeTab === 'upload'
          ? Boolean(uploadedDataUrl && activeSignature?.source === 'uploaded')
          : activeTab === 'saved'
            ? Boolean(activeSignature?.source === 'saved')
            : false

  readySignatureRef.current = hasReadySignatureForActiveTab

  const closeSignaturePicker = useCallback(() => {
    const hasReady = readySignatureRef.current
    if (!hasReady) {
      setActiveSignature(null)
      // Opened and closed with no signature — exit signing (hide footer).
      // Keep signing only if something was already placed on the document.
      const hasPlacedWork =
        placements.length > 0 ||
        Object.keys(fieldSignatures).length > 0 ||
        assignments.length > 0 ||
        savedOnce
      if (!hasPlacedWork) {
        setShowPicker(false)
        setValidationMessage('')
        onBack?.()
        return
      }
    }
    setShowPicker(false)
  }, [
    placements.length,
    fieldSignatures,
    assignments.length,
    savedOnce,
    onBack,
  ])

  closeSignaturePickerRef.current = closeSignaturePicker

  const processUploadFile = (file: File) => {
    setUploadError('')
    if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
      setUploadError(t`Supported formats: PNG, JPG, JPEG.`)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t`Maximum file size is 5 MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) {
        setUploadError(t`Unable to read the selected file.`)
        return
      }
      setUploadedDataUrl(result)
      setUploadedFileName(file.name)
    }
    reader.onerror = () => setUploadError(t`Unable to read the selected file.`)
    reader.readAsDataURL(file)
  }

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processUploadFile(file)
    event.target.value = ''
  }

  const onDropUpload = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) processUploadFile(file)
  }

  const placeSignatureAt = (clientX: number, clientY: number) => {
    const host = layerHost
    if (!host) return
    // Field-signing mode: only fill assigned boxes (no free placement).
    // Freeform sign invites (no assigned places) must still allow placement.
    if (restrictToFields && workspaceMode === 'create' && signatureFields.length > 0)
      return

    const canPlaceCreate =
      workspaceMode === 'create' &&
      !!activeSignature &&
      !(restrictToFields && signatureFields.length > 0)
    const canPlaceAssign =
      workspaceMode === 'assign' &&
      readyToMarkAssignment &&
      !!assigneeName.trim()
    if (!canPlaceCreate && !canPlaceAssign) return

    const rect = host.getBoundingClientRect()
    const localX = (clientX - rect.left) / zoom
    const localY = (clientY - rect.top) / zoom
    const surfaceWidth = host.offsetWidth || rect.width / zoom
    const surfaceHeight = host.offsetHeight || rect.height / zoom

    const width = DEFAULT_PLACEMENT.width
    const height = DEFAULT_PLACEMENT.height
    const x = clamp(localX - width / 2, 0, Math.max(0, surfaceWidth - width))
    const y = clamp(localY - height / 2, 0, Math.max(0, surfaceHeight - height))

    setValidationMessage('')

    if (canPlaceCreate && activeSignature) {
      const box: PlacedSignature = {
        id: nextBoxId('sig'),
        signature: activeSignature,
        x,
        y,
        width,
        height,
      }
      setSelectedBoxId(box.id)
      commitSnapshot([...placements, box], assignments)
      if (isInline) setShowPicker(false)
      void persistActiveSignatureIfRequested(activeSignature)
      return
    }

    const box: PlacedAssignment = {
      id: nextBoxId('assign'),
      assigneeName: assigneeName.trim(),
      assigneeEmail: assigneeEmail.trim() || undefined,
      x,
      y,
      width,
      height,
    }
    setSelectedBoxId(box.id)
    // Stay in mark mode so another place can be added for the same signer.
    setReadyToMarkAssignment(true)
    commitSnapshot(placements, [...assignments, box])

    const email = String(box.assigneeEmail || '')
      .trim()
      .toLowerCase()
    const countForUser =
      assignments.filter(
        (item) =>
          String(item.assigneeEmail || '')
            .trim()
            .toLowerCase() === email,
      ).length + 1

    const signers = pendingRequestPayload?.signers || []
    const currentIndex = signers.findIndex(
      (signer) =>
        String(signer.email || '')
          .trim()
          .toLowerCase() === email,
    )
    const nextSigner =
      pendingRequestPayload?.signingMode === 'sequential' && currentIndex >= 0
        ? signers[currentIndex + 1]
        : undefined

    if (nextSigner && countForUser >= 1) {
      setValidationMessage(
        `${countForUser} place(s) for ${box.assigneeName}. Click again for more, or select ${nextSigner.name} next.`,
      )
    } else {
      setValidationMessage(
        t`${countForUser} place(s) for ${box.assigneeName}. Click again to add another, or Send when done.`,
      )
    }
  }

  const persistActiveSignatureIfRequested = useCallback(
    async (signature: ActiveSignature) => {
      if (!onSaveSignature) return
      if (signature.source === 'typed' && saveTyped) {
        await onSaveSignature({
          name: signature.name || typedName.trim() || t`Typed signature`,
          type: 'typed',
          imageUrl: signature.imageDataUrl,
        })
      } else if (signature.source === 'drawn' && saveDrawn) {
        await onSaveSignature({
          name: signature.name || t`Drawn signature`,
          type: 'drawn',
          imageUrl: signature.imageDataUrl,
        })
      } else if (signature.source === 'uploaded' && saveUploaded) {
        await onSaveSignature({
          name: signature.name || uploadedFileName || t`Uploaded signature`,
          type: 'uploaded',
          imageUrl: signature.imageDataUrl,
        })
      }
    },
    [
      onSaveSignature,
      saveTyped,
      saveDrawn,
      saveUploaded,
      typedName,
      uploadedFileName,
    ],
  )

  const applySignatureToField = async (
    field: SignRequestFieldDto,
    index: number,
  ) => {
    let signature = activeSignature
    if (!signature) {
      if (activeTab === 'type' && typedName.trim()) {
        await handleUseTyped({ keepPickerOpen: true })
        signature = {
          source: 'typed',
          imageDataUrl: createTypedSignatureDataUrl(
            typedName.trim(),
            typedStyle.fontFamily,
            signatureColor,
          ),
          name: typedName.trim(),
        }
      } else if (activeTab === 'draw') {
        const pad = signaturePadRef.current
        if (pad && !pad.isEmpty()) {
          await handleUseDrawn({ keepPickerOpen: true })
          signature = {
            source: 'drawn',
            imageDataUrl: pad.toDataURL('image/png'),
            name: typedName.trim() || t`Drawn signature`,
          }
        }
      } else if (activeTab === 'upload' && uploadedDataUrl) {
        await handleUseUploaded({ keepPickerOpen: true })
        signature = {
          source: 'uploaded',
          imageDataUrl: uploadedDataUrl,
          name: uploadedFileName || t`Uploaded signature`,
        }
      }
    }
    if (!signature) {
      notifySigningError(t`Choose a signature first, then tap your sign area.`)
      if (isInline) setShowPicker(true)
      return
    }
    if (!isFieldForCurrentSigner(field, currentSignerEmail)) {
      notifySigningError(t`This sign area belongs to another user.`)
      return
    }
    if (isFieldSigned(field)) {
      notifySigningError(t`This area is already signed.`)
      return
    }
    const key = fieldKey(field, index)
    setFieldSignatures((previous) => ({
      ...previous,
      [key]: signature.imageDataUrl,
    }))
    setValidationMessage('')
    setSelectedBoxId(key)
    if (isInline) setShowPicker(false)
    void persistActiveSignatureIfRequested(signature)
  }

  const handleDocumentClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-signature-placement]')) {
      return
    }
    placeSignatureAt(event.clientX, event.clientY)
  }

  const constrainPlacement = useCallback(
    (next: PlacementState): PlacementState => {
      const host = layerHost || documentSurfaceRef.current
      if (!host) return next
      const surfaceWidth = host.offsetWidth
      const surfaceHeight = host.offsetHeight
      const width = clamp(next.width, 60, Math.max(60, surfaceWidth))
      const height = clamp(next.height, 28, Math.max(28, surfaceHeight))
      return {
        width,
        height,
        x: clamp(next.x, 0, Math.max(0, surfaceWidth - width)),
        y: clamp(next.y, 0, Math.max(0, surfaceHeight - height)),
      }
    },
    [layerHost],
  )

  const updateBox = (boxId: string, patch: Partial<PlacementState>) => {
    const applyPatch = <T extends PlacementState>(item: T): T =>
      constrainPlacement({ ...item, ...patch }) as PlacementState & T

    if (placements.some((item) => item.id === boxId)) {
      commitSnapshot(
        placements.map((item) =>
          item.id === boxId ? { ...item, ...applyPatch(item) } : item,
        ),
        assignments,
      )
      return
    }
    if (assignments.some((item) => item.id === boxId)) {
      commitSnapshot(
        placements,
        assignments.map((item) =>
          item.id === boxId ? { ...item, ...applyPatch(item) } : item,
        ),
      )
    }
  }

  const deleteBox = (boxId: string) => {
    if (placements.some((item) => item.id === boxId)) {
      commitSnapshot(
        placements.filter((item) => item.id !== boxId),
        assignments,
      )
    } else {
      commitSnapshot(
        placements,
        assignments.filter((item) => item.id !== boxId),
      )
    }
    if (selectedBoxId === boxId) setSelectedBoxId(null)
  }

  const undoPlacement = () => {
    const { index, stack } = historyRef.current
    if (index < 0) return
    const nextIndex = index - 1
    historyRef.current = { index: nextIndex, stack }
    const snapshot = nextIndex >= 0 ? stack[nextIndex] : null
    setPlacements(snapshot?.placements || [])
    setAssignments(snapshot?.assignments || [])
    setSelectedBoxId(null)
    setHistoryTick((value) => value + 1)
  }

  const redoPlacement = () => {
    const { index, stack } = historyRef.current
    if (index >= stack.length - 1) return
    const nextIndex = index + 1
    historyRef.current = { index: nextIndex, stack }
    setPlacements(stack[nextIndex].placements)
    setAssignments(stack[nextIndex].assignments)
    setSelectedBoxId(null)
    setHistoryTick((value) => value + 1)
  }

  const handleCompleteSigning = async () => {
    if (!layerHost) return
    const surfaceWidth = layerHost.offsetWidth
    const surfaceHeight = layerHost.offsetHeight
    const surfaceRoot = isInline
      ? externalSurfaceRef?.current
      : documentSurfaceRef.current

    if (workspaceMode === 'assign') {
      if (pendingRequestPayload) {
        if (assignments.length === 0) {
          notifySigningError(
            t`Mark at least one signature place on the document before sending.`,
          )
          return
        }
        const missing = signersMissingPlaces()
        if (missing.length) {
          notifySigningError(
            `Mark at least one place for: ${missing
              .map((signer) => signer.name || signer.email)
              .join(', ')}`,
          )
          const firstMissing = missing[0]
          if (firstMissing) {
            selectAssigneeForMarking({
              description: firstMissing.email,
              id: firstMissing.email,
              name: firstMissing.name,
              value: firstMissing.email,
            })
          }
          return
        }
        setCompleting(true)
        setValidationMessage('')
        try {
          const pageRects = getPageRects(surfaceRoot, layerHost, zoom)
          const sizes =
            pageSizesPt.length > 0
              ? pageSizesPt
              : pageRects.map((rect) => ({
                  width: rect.width,
                  height: rect.height,
                }))

          const fields = assignments.map((item, index) => {
            const pdf = mapBoxToPdfPoints(item, pageRects, sizes)
            const signer = pendingRequestPayload.signers.find(
              (entry) =>
                String(entry.email || '').toLowerCase() ===
                  String(item.assigneeEmail || '').toLowerCase() ||
                String(entry.name || '').toLowerCase() ===
                  String(item.assigneeName || '').toLowerCase(),
            )
            return {
              height: pdf.height,
              pageNumber: pdf.pageNumber,
              signerEmail: item.assigneeEmail || signer?.email,
              signerOrder: signer?.order || index + 1,
              width: pdf.width,
              x: pdf.x,
              y: pdf.y,
            }
          })

          const result = await createSignRequest({
            ...pendingRequestPayload,
            fields,
            signers: pendingRequestPayload.signers.map((signer) => ({
              ...signer,
              fields: fields
                .filter(
                  (field) =>
                    String(field.signerEmail || '').toLowerCase() ===
                      String(signer.email || '').toLowerCase() ||
                    Number(field.signerOrder) === Number(signer.order),
                )
                .map((field) => ({
                  height: field.height,
                  pageNumber: field.pageNumber,
                  width: field.width,
                  x: field.x,
                  y: field.y,
                })),
            })),
          })
          if (result.error || !result.data) {
            notifySigningError(
              String(result.error || t`Unable to create sign request`),
            )
            return
          }

          const storedFields: SignRequestFieldDto[] = fields.map((field) => ({
            height: field.height,
            pageNumber: field.pageNumber,
            signerEmail: field.signerEmail,
            signerName:
              pendingRequestPayload.signers.find(
                (signer) =>
                  String(signer.email || '').toLowerCase() ===
                  String(field.signerEmail || '').toLowerCase(),
              )?.name || undefined,
            signerOrder: field.signerOrder,
            status: 'REQUESTED',
            width: field.width,
            x: field.x,
            y: field.y,
          }))

          const echoed = collectSignRequestFields(result.data)
          const fieldsToKeep = echoed.length ? echoed : storedFields

          saveSignRequestFields({
            fields: fieldsToKeep,
            itemId: pendingRequestPayload.itemId,
            repositoryId: pendingRequestPayload.repositoryId,
            signRequestId: result.data.signRequestId,
          })

          await onSaveAssignment?.(
            assignments.map((item) => {
              const pdf = mapBoxToPdfPoints(item, pageRects, sizes)
              return {
                assigneeEmail: item.assigneeEmail,
                assigneeName: item.assigneeName,
                height: pdf.height,
                width: pdf.width,
                x: pdf.x,
                y: pdf.y,
              }
            }),
          )
          setSavedOnce(true)
          setPendingRequestPayload(null)
          onSignRequestCreated?.({
            fields: fieldsToKeep,
            signRequestId: result.data.signRequestId,
          })
        } catch {
          notifySigningError(t`Unable to send sign request. Please try again.`)
        } finally {
          setCompleting(false)
        }
        return
      }

      if (assignments.length === 0) {
        notifySigningError(
          t`Select a user and mark at least one signature place on the document.`,
        )
        return
      }

      const payload: SignatureAssignment[] = assignments.map((item) => ({
        assigneeName: item.assigneeName,
        assigneeEmail: item.assigneeEmail,
        x: normalizeCoord(item.x, surfaceWidth),
        y: normalizeCoord(item.y, surfaceHeight),
        width: normalizeCoord(item.width, surfaceWidth),
        height: normalizeCoord(item.height, surfaceHeight),
      }))

      setCompleting(true)
      setValidationMessage('')
      try {
        await onSaveAssignment?.(payload)
        setSavedOnce(true)
      } catch {
        notifySigningError(t`Unable to save assignments. Please try again.`)
      } finally {
        setCompleting(false)
      }
      return
    }

    if (placements.length === 0) {
      if (fieldSigning) {
        const filled = signatureFields.filter(
          (field, index) =>
            isFieldForCurrentSigner(field, currentSignerEmail) &&
            Boolean(fieldSignatures[fieldKey(field, index)]) &&
            !isFieldSigned(field),
        )
        if (filled.length === 0) {
          notifySigningError(
            signatureFields.some((field) =>
              isFieldForCurrentSigner(field, currentSignerEmail),
            )
              ? t`Tap your highlighted sign area to place your signature.`
              : t`No signature place was assigned to your account on this document.`,
          )
          return
        }

        setCompleting(true)
        setValidationMessage('')
        try {
          const payload: SignaturePlacement[] = []
          for (let index = 0; index < signatureFields.length; index++) {
            const field = signatureFields[index]
            const key = fieldKey(field, index)
            const image = fieldSignatures[key]
            if (!image || !isFieldForCurrentSigner(field, currentSignerEmail)) {
              continue
            }
            if (isFieldSigned(field)) continue
            payload.push({
              height: field.height,
              imageDataUrl: await toPngDataUrl(image),
              pageNumber: field.pageNumber || 1,
              signatureId: field.fieldId,
              source: activeSignature?.source || 'drawn',
              width: field.width,
              x: field.x,
              y: field.y,
            })
          }

          if (onCompleteSigning) {
            await onCompleteSigning(payload)
          } else if (signRequestId) {
            for (const placement of payload) {
              const submitted = await submitSignRequest({
                signRequestId,
                signature: {
                  fieldId: placement.signatureId,
                  height: placement.height,
                  pageNumber: placement.pageNumber,
                  signatureImageBase64: placement.imageDataUrl,
                  signedAtClientUtc: new Date().toISOString(),
                  width: placement.width,
                  x: placement.x,
                  y: placement.y,
                },
              })
              if (submitted.error) throw new Error(String(submitted.error))
            }
          } else {
            throw new Error('Sign request context is missing')
          }
          setSavedOnce(true)
          // Exit signing UI so the details view can show the refreshed file.
          setShowPicker(false)
          setActiveSignature(null)
          setPlacements([])
          setFieldSignatures({})
          onBack?.()
        } catch (error) {
          console.error(error)
          notifySigningError(
            error instanceof Error
              ? error.message
              : t`Unable to submit signature. Please try again.`,
          )
        } finally {
          setCompleting(false)
        }
        return
      }

      notifySigningError(
        t`Place at least one signature on the document before completing.`,
      )
      return
    }

    setCompleting(true)
    setValidationMessage('')
    try {
      const pageRects = getPageRects(surfaceRoot, layerHost, zoom)
      let pageSizesPt = pageRects.map((rect) => ({
        width: rect.width,
        height: rect.height,
      }))

      if (isPdf && documentUrl) {
        try {
          const pdfjsLib = await import('pdfjs-dist')
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'
          const pdf = await pdfjsLib.getDocument(documentUrl).promise
          const sizes: Array<{ width: number; height: number }> = []
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber)
            const viewport = page.getViewport({ scale: 1 })
            sizes.push({ width: viewport.width, height: viewport.height })
          }
          pageSizesPt = sizes
        } catch (error) {
          console.error(error)
        }
      }

      const payload: SignaturePlacement[] = []
      for (const item of placements) {
        const pdf = mapBoxToPdfPoints(item, pageRects, pageSizesPt)
        const imageDataUrl = await toPngDataUrl(item.signature.imageDataUrl)
        payload.push({
          signatureId: item.signature.signatureId,
          source: item.signature.source,
          imageDataUrl,
          pageNumber: pdf.pageNumber,
          x: pdf.x,
          y: pdf.y,
          width: pdf.width,
          height: pdf.height,
        })
      }

      if (onCompleteSigning) {
        await onCompleteSigning(payload)
      } else if (signRequestId) {
        // Submit only — never create `.../items/.../sign-requests` here.
        // Creating sign requests is Share / invite-others only.
        for (const placement of payload) {
          const submitted = await submitSignRequest({
            signRequestId,
            signature: {
              height: placement.height,
              pageNumber: placement.pageNumber,
              signatureImageBase64: placement.imageDataUrl,
              signedAtClientUtc: new Date().toISOString(),
              width: placement.width,
              x: placement.x,
              y: placement.y,
            },
          })
          if (submitted.error) {
            throw new Error(String(submitted.error))
          }
        }
      } else {
        throw new Error(
          'No sign request to submit against. Use Share with Sign to invite first.',
        )
      }

      setSavedOnce(true)
      // Close the floating sign footer; parent refreshes the signed file.
      setShowPicker(false)
      setActiveSignature(null)
      setPlacements([])
      setFieldSignatures({})
      onBack?.()
    } catch (error) {
      console.error(error)
      notifySigningError(
        error instanceof Error
          ? error.message
          : t`Unable to complete signing. Please try again.`,
      )
    } finally {
      setCompleting(false)
    }
  }

  const handleDownloadSigned = async () => {
    if (!documentUrl || !layerHost || downloading) return
    setDownloading(true)
    setValidationMessage('')
    try {
      const baseName = documentName.replace(/\.[^.]+$/, '') || 'document'
      const boxes = [
        ...placements.map((item) => ({ kind: 'signature' as const, item })),
        ...assignments.map((item) => ({ kind: 'assignment' as const, item })),
      ]

      const loadImageElement = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error('Unable to load image'))
          img.src = src
        })

      // Draws signature images / assignee labels plainly (no border, no fill).
      const drawBox = async (
        ctx: CanvasRenderingContext2D,
        box: (typeof boxes)[number],
        offsetX: number,
        offsetY: number,
        scaleX: number,
        scaleY: number,
      ) => {
        const x = (box.item.x - offsetX) * scaleX
        const y = (box.item.y - offsetY) * scaleY
        const w = box.item.width * scaleX
        const h = box.item.height * scaleY

        if (box.kind === 'signature') {
          const img = await loadImageElement(box.item.signature.imageDataUrl)
          ctx.drawImage(img, x, y, w, h)
          return
        }

        ctx.save()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.strokeStyle = '#3e63dd'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 4])
        ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2))
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(62, 99, 221, 0.1)'
        ctx.fillRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2))
        ctx.fillStyle = '#3e63dd'
        ctx.font = `600 ${Math.max(11, h * 0.28)}px Inter, "Segoe UI", sans-serif`
        ctx.fillText(box.item.assigneeName, x + w / 2, y + h / 2 - h * 0.08, w)
        ctx.fillStyle = '#6b7280'
        ctx.font = `${Math.max(9, h * 0.16)}px Inter, "Segoe UI", sans-serif`
        ctx.fillText(t`Sign here`, x + w / 2, y + h / 2 + h * 0.22, w)
        ctx.restore()
      }

      if (isPdf) {
        const [pdfjsLib, { default: JsPdf }] = await Promise.all([
          import('pdfjs-dist'),
          import('jspdf'),
        ])
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'

        const pdf = await pdfjsLib.getDocument(documentUrl).promise

        const hostRect = layerHost.getBoundingClientRect()
        const surfaceRoot = isInline
          ? externalSurfaceRef?.current
          : documentSurfaceRef.current
        const pageEls = Array.from(
          surfaceRoot?.querySelectorAll('.rpv-core__inner-page') || [],
        ) as HTMLElement[]
        const pageRects = pageEls.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            left: (r.left - hostRect.left) / zoom,
            top: (r.top - hostRect.top) / zoom,
            width: r.width / zoom,
            height: r.height / zoom,
          }
        })

        let doc: InstanceType<typeof JsPdf> | null = null

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber)
          const baseViewport = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: 2 })

          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          await page.render({ canvasContext: ctx, viewport }).promise

          const rect = pageRects[pageNumber - 1] || {
            left: 0,
            top: 0,
            width: layerHost.offsetWidth,
            height: layerHost.offsetHeight,
          }
          const scaleX = canvas.width / rect.width
          const scaleY = canvas.height / rect.height

          for (const box of boxes) {
            const centerY = box.item.y + box.item.height / 2
            if (centerY < rect.top || centerY > rect.top + rect.height) continue
            await drawBox(ctx, box, rect.left, rect.top, scaleX, scaleY)
          }

          const orientation =
            baseViewport.width > baseViewport.height ? 'landscape' : 'portrait'
          if (!doc) {
            doc = new JsPdf({
              orientation,
              unit: 'pt',
              format: [baseViewport.width, baseViewport.height],
            })
          } else {
            doc.addPage([baseViewport.width, baseViewport.height], orientation)
          }
          doc.addImage(
            canvas.toDataURL('image/jpeg', 0.92),
            'JPEG',
            0,
            0,
            baseViewport.width,
            baseViewport.height,
          )
        }

        doc?.save(`${baseName}-signed.pdf`)
      } else {
        const sourceImg = await loadImageElement(documentUrl)
        const canvas = document.createElement('canvas')
        canvas.width = sourceImg.naturalWidth
        canvas.height = sourceImg.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas unavailable')
        ctx.drawImage(sourceImg, 0, 0)

        // Map layer coords through the rendered <img> box (object-contain).
        const hostRect = layerHost.getBoundingClientRect()
        const renderedImg = documentSurfaceRef.current?.querySelector('img')
        let offsetX = 0
        let offsetY = 0
        let scaleX = canvas.width / layerHost.offsetWidth
        let scaleY = canvas.height / layerHost.offsetHeight
        if (renderedImg) {
          const imgRect = renderedImg.getBoundingClientRect()
          offsetX = (imgRect.left - hostRect.left) / zoom
          offsetY = (imgRect.top - hostRect.top) / zoom
          scaleX = canvas.width / (imgRect.width / zoom)
          scaleY = canvas.height / (imgRect.height / zoom)
        }

        for (const box of boxes) {
          await drawBox(ctx, box, offsetX, offsetY, scaleX, scaleY)
        }

        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = `${baseName}-signed.png`
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
    } catch (exception) {
      console.error(exception)
      notifySigningError(t`Unable to download the signed file. Please try again.`)
    } finally {
      setDownloading(false)
    }
  }

  const switchWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode)
    setValidationMessage('')
    setSelectedBoxId(null)
    if (mode === 'assign') {
      // Starting a new request — do not keep field-only lock from a prior request.
      setActiveSignature(null)
      setReadyToMarkAssignment(false)
    } else {
      setReadyToMarkAssignment(false)
      setPendingRequestPayload(null)
    }
  }

  const handleRequestContinue = (payload: CreateSignRequestPayload) => {
    setPendingRequestPayload(payload)
    const first = payload.signers[0]
    if (first) {
      setSelectedAssignee({
        id: first.email,
        name: first.name,
        value: first.email,
        description: first.email,
      })
    }
    setReadyToMarkAssignment(true)
    const multi = payload.signers.length > 1
    const sequential = payload.signingMode === 'sequential'
    setValidationMessage(
      first
        ? multi
          ? sequential
            ? `Sequential: mark place(s) for ${first.name} first, then switch to the next signer.`
            : `Select a signer below, then click the document to mark one or more places.`
          : t`Click the document to mark one or more places for ${first.name}, then Send.`
        : t`Click on the document to mark signature places.`,
    )
    if (isInline) setShowPicker(false)
  }

  const selectAssigneeForMarking = (option: Option | null) => {
    if (!option) return
    setSelectedAssignee(option)
    setReadyToMarkAssignment(true)
    setValidationMessage(
      `Click the document to mark place(s) for ${option.name}. You can add multiple places.`,
    )
  }

  const handlePrepareAssignmentMark = () => {
    if (!selectedAssignee) {
      notifySigningError(t`Select a user before marking a place.`)
      return
    }
    setReadyToMarkAssignment(true)
    setValidationMessage(
      `Click the document to mark place(s) for ${selectedAssignee.name}.`,
    )
  }

  const assignmentCountForEmail = (email: string) => {
    const normalized = String(email || '')
      .trim()
      .toLowerCase()
    return assignments.filter(
      (item) =>
        String(item.assigneeEmail || '')
          .trim()
          .toLowerCase() === normalized,
    ).length
  }

  const signersMissingPlaces = () => {
    if (!pendingRequestPayload?.signers?.length) return []
    return pendingRequestPayload.signers.filter((signer) => {
      const email = String(signer.email || '')
        .trim()
        .toLowerCase()
      const name = String(signer.name || '')
        .trim()
        .toLowerCase()
      return !assignments.some(
        (item) =>
          String(item.assigneeEmail || '')
            .trim()
            .toLowerCase() === email ||
          (!email &&
            String(item.assigneeName || '')
              .trim()
              .toLowerCase() === name),
      )
    })
  }

  const tabs: Array<{ id: SignatureTab; label: string }> = [
    { id: 'draw', label: t`Draw` },
    { id: 'type', label: t`Type` },
    { id: 'upload', label: t`Upload` },
    { id: 'saved', label: t`Saved (${savedSignatures.length})` },
  ]

  // Keep historyTick referenced so undo/redo button disabled states refresh.
  void historyTick

  const handleCancelSigning = () => {
    setShowPicker(false)
    setActiveSignature(null)
    setValidationMessage('')
    onBack?.()
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const order: SignatureTab[] = ['draw', 'type', 'upload', 'saved']
    const index = order.indexOf(activeTab)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setActiveTab(order[(index + 1) % order.length])
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setActiveTab(order[(index - 1 + order.length) % order.length])
    }
  }

  const controlButtonClass =
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-surface-primary px-2.5 text-[13px] font-semibold text-gray-13 shadow-sm transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-3 disabled:cursor-not-allowed disabled:opacity-50'

  const iconButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-3 bg-surface-primary text-gray-11 shadow-sm transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-3 disabled:cursor-not-allowed disabled:opacity-50'

  const primaryButtonClass =
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary-10 px-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-blue-11 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-3 disabled:cursor-not-allowed disabled:opacity-50'

  const panelSectionClass =
    'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200'

  // Closing the picker only hides the menu — never exits the signing session
  // (that was incorrectly treated as "signed" for invite flows).
  // Without a completed signature, clear so nothing can be placed on the document.
  const handleCloseInlinePicker = () => {
    closeSignaturePicker()
  }

  const surfaceRootForFields = isInline
    ? externalSurfaceRef?.current
    : documentSurfaceRef.current
  const livePageRects =
    layerHost != null
      ? getPageRects(surfaceRootForFields, layerHost, zoom)
      : []
  const livePageSizes =
    pageSizesPt.length > 0
      ? pageSizesPt
      : livePageRects.map((rect) => ({
          width: rect.width,
          height: rect.height,
        }))

  const myFilledFieldCount = signatureFields.filter(
    (field, index) =>
      isFieldForCurrentSigner(field, currentSignerEmail) &&
      Boolean(fieldSignatures[fieldKey(field, index)]),
  ).length

  const placementOverlayNodes = (
    <>
      {((workspaceMode === 'create' &&
        hasReadySignatureForActiveTab &&
        !fieldSigning) ||
        (workspaceMode === 'assign' && readyToMarkAssignment)) && (
        <div
          className='absolute inset-0 z-10 cursor-crosshair'
          style={{ pointerEvents: 'auto' }}
          onClick={handleDocumentClick}
          aria-label={
            workspaceMode === 'assign'
              ? t`Click to mark assignee signature place`
              : t`Click to place signature`
          }
        />
      )}

      {showGuides && selectedBox ? (
        <>
          <div
            className={styles.guideLineX}
            style={{ top: selectedBox.y + selectedBox.height / 2 }}
          />
          <div
            className={styles.guideLineY}
            style={{ left: selectedBox.x + selectedBox.width / 2 }}
          />
        </>
      ) : null}

      {signatureFields.map((field, index) => {
        const screen = mapPdfFieldToScreen(field, livePageRects, livePageSizes)
        if (!screen) return null
        const key = fieldKey(field, index)
        const mine = isFieldForCurrentSigner(field, currentSignerEmail)
        const signed = isFieldSigned(field)
        const filledImage = fieldSignatures[key]
        const boxClass = signed || filledImage
          ? styles.fieldBoxSigned
          : mine
            ? styles.fieldBoxActive
            : styles.fieldBoxMuted

        return (
          <div
            key={key}
            data-signature-placement
            className={`${boxClass} absolute z-20 flex items-center justify-center`}
            style={{
              left: screen.x,
              top: screen.y,
              width: screen.width,
              height: screen.height,
              pointerEvents:
                !overlayOnly && mine && !signed ? 'auto' : 'none',
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (overlayOnly || !mine || signed) return
              applySignatureToField(field, index)
            }}
            role={!overlayOnly && mine && !signed ? 'button' : undefined}
            aria-label={
              mine
                ? filledImage
                  ? `Your signature for ${field.signerName || 'you'}`
                  : `Sign here for ${field.signerName || 'you'}`
                : `Reserved for ${field.signerName || field.signerEmail || 'another signer'}`
            }
          >
            {filledImage || signed ? (
              filledImage ? (
                <img
                  src={filledImage}
                  alt='Signature'
                  className='pointer-events-none h-full w-full object-contain p-1'
                  draggable={false}
                />
              ) : (
                <p className='text-[11px] font-semibold text-green-11'>{t`Signed`}</p>
              )
            ) : mine ? (
              <div className='flex flex-col items-center gap-0.5 px-1 text-center'>
                <PenLine className='h-3.5 w-3.5 text-blue-10' />
                <p className='max-w-full truncate text-[11px] font-semibold text-blue-11'>
                  {field.signerName || 'You'}
                </p>
                <p className='text-[10px] font-medium text-gray-10'>{t`Sign here`}</p>
              </div>
            ) : (
              <div className='flex flex-col items-center gap-0.5 px-1 text-center'>
                <UserRound className='h-3.5 w-3.5 text-gray-9' />
                <p className='max-w-full truncate text-[11px] font-semibold text-gray-10'>
                  {field.signerName || field.signerEmail || t`Other signer`}
                </p>
              </div>
            )}
          </div>
        )
      })}

      {!fieldSigning &&
        placements.map((item) => (
        <Rnd
          key={item.id}
          data-signature-placement
          bounds='parent'
          size={{ width: item.width, height: item.height }}
          position={{ x: item.x, y: item.y }}
          enableResizing={RESIZE_HANDLES}
          resizeHandleClasses={RESIZE_HANDLE_CLASSES}
          onDragStart={() => {
            setSelectedBoxId(item.id)
            setShowGuides(true)
          }}
          onResizeStart={() => {
            setSelectedBoxId(item.id)
            setShowGuides(true)
          }}
          onDragStop={(_e, data) => {
            setShowGuides(false)
            updateBox(item.id, { x: data.x, y: data.y })
          }}
          onResizeStop={(_e, _dir, ref, _delta, position) => {
            setShowGuides(false)
            updateBox(item.id, {
              x: position.x,
              y: position.y,
              width: ref.offsetWidth,
              height: ref.offsetHeight,
            })
          }}
          className={`${styles.placementBox} z-20 ${
            selectedBoxId === item.id ? 'opacity-100' : 'opacity-95'
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
          onClick={(event: MouseEvent) => {
            event.stopPropagation()
            setSelectedBoxId(item.id)
          }}
        >
          <img
            src={item.signature.imageDataUrl}
            alt='Placed signature'
            className='pointer-events-none h-full w-full select-none bg-transparent object-contain p-1'
            draggable={false}
          />
          <button
            type='button'
            aria-label={t`Delete this signature`}
            className='absolute -top-2.5 -right-2.5 z-30 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-3 bg-surface-primary text-red-9 shadow-sm transition-all hover:bg-red-2'
            onClick={(event) => {
              event.stopPropagation()
              deleteBox(item.id)
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </button>
        </Rnd>
      ))}

      {!fieldSigning &&
        assignments.map((item) => (
          <Rnd
            key={item.id}
            data-signature-placement
            bounds='parent'
            size={{ width: item.width, height: item.height }}
            position={{ x: item.x, y: item.y }}
            enableResizing={RESIZE_HANDLES}
            resizeHandleClasses={RESIZE_HANDLE_CLASSES}
            onDragStart={() => {
              setSelectedBoxId(item.id)
              setShowGuides(true)
            }}
            onResizeStart={() => {
              setSelectedBoxId(item.id)
              setShowGuides(true)
            }}
            onDragStop={(_e, data) => {
              setShowGuides(false)
              updateBox(item.id, { x: data.x, y: data.y })
            }}
            onResizeStop={(_e, _dir, ref, _delta, position) => {
              setShowGuides(false)
              updateBox(item.id, {
                x: position.x,
                y: position.y,
                width: ref.offsetWidth,
                height: ref.offsetHeight,
              })
            }}
            className={`${styles.assignmentBox} z-20`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
            }}
            onClick={(event: MouseEvent) => {
              event.stopPropagation()
              setSelectedBoxId(item.id)
            }}
          >
            <div className='flex flex-col items-center justify-center gap-0.5 px-2 text-center'>
              <UserRound className='h-3.5 w-3.5 text-blue-10' />
              <p className='max-w-full truncate text-[11px] font-semibold text-blue-11'>
                {item.assigneeName || 'Assignee'}
              </p>
              <p className='text-[10px] font-medium text-gray-10'>{t`Sign here`}</p>
            </div>
            <button
              type='button'
              aria-label={`Remove assignment for ${item.assigneeName}`}
              className='absolute -top-2.5 -right-2.5 z-30 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-3 bg-surface-primary text-red-9 shadow-sm transition-all hover:bg-red-2'
              onClick={(event) => {
                event.stopPropagation()
                deleteBox(item.id)
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
            >
              <Trash2 className='h-3 w-3' />
            </button>
          </Rnd>
        ))}
    </>
  )

  if (isInline) {
    if (overlayOnly) {
      return (
        <>
          {layerHost ? createPortal(placementOverlayNodes, layerHost) : null}
        </>
      )
    }

    return (
      <>
        {typeof document !== 'undefined'
          ? createPortal(
              <AnimatePresence>
                {showPicker && pickerPanelPos ? (
                  <motion.div
                    ref={pickerPanelRef}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className='fixed z-[200] flex max-h-[min(70vh,560px)] w-[380px] flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface shadow-2xl backdrop-blur-md'
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    style={{ left: pickerPanelPos.left, top: pickerPanelPos.top }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className='flex shrink-0 items-center justify-between border-b border-gray-2 px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <PenLine className='h-4 w-4 text-primary-9' />
                        <span className='text-[13px] font-semibold text-gray-13'>
                          Sign
                        </span>
                      </div>
                      <button
                        type='button'
                        className='flex cursor-pointer items-center justify-center rounded-md p-1 text-gray-8 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95'
                        aria-label={t`Close`}
                        onClick={handleCloseInlinePicker}
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </div>

                    <div
                      className='flex shrink-0 gap-3 border-b border-gray-3 px-4'
                      role='tablist'
                      aria-label={t`Signature methods`}
                      onKeyDown={onTabKeyDown}
                    >
                      {tabs.map((tab) => {
                        const selected = activeTab === tab.id
                        return (
                          <button
                            key={tab.id}
                            type='button'
                            role='tab'
                            aria-selected={selected}
                            className={`-mb-px border-b-2 px-0.5 py-2.5 text-[13px] font-semibold transition-colors ${
                              selected
                                ? 'border-primary-9 text-gray-13'
                                : 'border-transparent text-gray-9 hover:text-gray-11'
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>

                    <div className='ez-scrollbar flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-3'>
                      {activeTab === 'type' ? (
                        <div className={`${panelSectionClass} space-y-3`}>
                          <label className='block'>
                            <span className='mb-1.5 block text-[12px] font-semibold text-gray-10'>
                              Full name
                            </span>
                            <input
                              className='h-9 w-full rounded-lg border border-gray-3 bg-surface-primary px-3 text-[13px] text-gray-13 outline-none placeholder:text-gray-8 focus:border-blue-8 focus:ring-2 focus:ring-blue-3'
                              value={typedName}
                              onChange={(event) =>
                                setTypedName(event.target.value)
                              }
                              placeholder={t`Type your name`}
                            />
                          </label>
                          <div
                            className='flex h-20 items-center justify-center rounded-lg border border-dashed border-gray-4 bg-gray-1 px-3 text-[28px] text-gray-13'
                            style={{ fontFamily: typedStyle.fontFamily }}
                          >
                            {typedName.trim() || 'Your signature'}
                          </div>
                          <div className='flex items-center justify-between gap-3'>
                            <label className='flex shrink-0 items-center gap-2 text-[12px] text-gray-10'>
                              <input
                                type='checkbox'
                                checked={saveTyped}
                                onChange={(event) =>
                                  setSaveTyped(event.target.checked)
                                }
                              />
                              {t`Save for reuse`}
                            </label>
                            <div className='flex flex-wrap justify-end gap-2'>
                              {TYPED_STYLES.map((style) => (
                                <Tooltip
                                  content={style.label}
                                  key={style.id}
                                  position='top'
                                >
                                  <button
                                    type='button'
                                    aria-label={style.label}
                                    aria-pressed={typedStyleId === style.id}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[17px] leading-none transition-all ${
                                      typedStyleId === style.id
                                        ? 'border-blue-8 bg-blue-2 text-blue-11'
                                        : 'border-gray-3 bg-surface-primary text-gray-12 hover:border-gray-5 hover:bg-gray-2'
                                    }`}
                                    style={{ fontFamily: style.fontFamily }}
                                    onClick={() => setTypedStyleId(style.id)}
                                  >
                                    Aa
                                  </button>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {activeTab === 'draw' ? (
                        <div className={`${panelSectionClass} space-y-3`}>
                          <Tooltip
                            content={t`Kindly draw the signature`}
                            disabled={hasDrawnStroke}
                            position='top'
                            opened={!hasDrawnStroke ? true : false}
                          >
                            <div
                              className={`relative w-[348px] max-w-full overflow-hidden rounded-lg border border-gray-3 bg-white ${styles.penCursor}`}
                            >
                              {!hasDrawnStroke ? (
                                <div className='pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 px-4 text-center'>
                                  <PenLine className='h-5 w-5 text-gray-8' strokeWidth={2} />
                                  <span className='text-[13px] font-medium text-gray-9'>
                                    {t`Kindly draw the signature`}
                                  </span>
                                </div>
                              ) : null}
                              <SignatureCanvas
                                ref={(ref) => {
                                  signaturePadRef.current = ref
                                }}
                                penColor='#1a1a1a'
                                canvasProps={{
                                  className: `h-36 w-full touch-none ${styles.penCursor}`,
                                  width: 348,
                                  height: 144,
                                }}
                                onBegin={() => setHasDrawnStroke(true)}
                                onEnd={syncDrawnSignature}
                              />
                            </div>
                          </Tooltip>
                          <div className='flex items-center justify-between gap-3'>
                            <label className='flex items-center gap-2 text-[12px] text-gray-10'>
                              <input
                                type='checkbox'
                                checked={saveDrawn}
                                onChange={(event) =>
                                  setSaveDrawn(event.target.checked)
                                }
                              />
                              {t`Save for reuse`}
                            </label>
                            <Tooltip content='Clear' position='top'>
                              <button
                                type='button'
                                className={iconButtonClass}
                                aria-label={t`Clear`}
                                onClick={() => {
                                  signaturePadRef.current?.clear()
                                  setHasDrawnStroke(false)
                                  setActiveSignature(null)
                                }}
                              >
                                <Eraser className='h-4 w-4' />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      ) : null}

                      {activeTab === 'upload' ? (
                        <div className={`${panelSectionClass} space-y-3`}>
                          <Tooltip
                            content='Kindly upload the signature'
                            disabled={Boolean(uploadedDataUrl)}
                            position='top'
                            opened={!uploadedDataUrl ? true : false}
                          >
                            <div
                              className={`flex min-h-28 w-[348px] max-w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center transition-colors ${
                                isDragOver
                                  ? 'border-blue-8 bg-blue-2'
                                  : 'border-gray-4 bg-gray-1'
                              }`}
                              onDragOver={(event) => {
                                event.preventDefault()
                                setIsDragOver(true)
                              }}
                              onDragLeave={() => setIsDragOver(false)}
                              onDrop={onDropUpload}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className='h-5 w-5 text-gray-9' />
                              <p className='mt-2 text-[13px] font-semibold text-gray-13'>
                                {uploadedDataUrl
                                  ? 'Signature uploaded'
                                  : 'Kindly upload the signature'}
                              </p>
                              <p className='mt-1 text-[11px] text-gray-9'>
                                PNG, JPG up to 5 MB
                              </p>
                              <input
                                ref={fileInputRef}
                                type='file'
                                accept='image/png,image/jpeg,image/jpg'
                                className='hidden'
                                onChange={onFileInputChange}
                              />
                            </div>
                          </Tooltip>
                          {uploadError ? (
                            <p className='text-[12px] font-medium text-red-10'>
                              {uploadError}
                            </p>
                          ) : null}
                          {uploadedDataUrl ? (
                            <img
                              src={uploadedDataUrl}
                              alt='Uploaded signature'
                              className='max-h-24 rounded-lg border border-gray-3 object-contain'
                            />
                          ) : null}
                          <label className='flex items-center gap-2 text-[12px] text-gray-10'>
                            <input
                              type='checkbox'
                              checked={saveUploaded}
                              onChange={(event) =>
                                setSaveUploaded(event.target.checked)
                              }
                            />
                            {t`Save for reuse`}
                          </label>
                        </div>
                      ) : null}

                      {activeTab === 'saved' ? (
                        <div className={`${panelSectionClass} space-y-2`}>
                          {savedSignatures.length === 0 ? (
                            <p className='text-[13px] text-gray-9'>
                              No saved signatures yet.
                            </p>
                          ) : (
                            savedSignatures.map((signature) => (
                              <button
                                key={signature.id}
                                type='button'
                                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                                  selectedSavedId === signature.id
                                    ? 'border-blue-8 bg-blue-2'
                                    : 'border-gray-3 hover:bg-gray-2'
                                }`}
                                onClick={() => void handleUseSaved(signature)}
                              >
                                <img
                                  src={signature.imageUrl}
                                  alt={signature.name}
                                  className='h-10 w-24 object-contain'
                                />
                                <span className='min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-13'>
                                  {signature.name}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>,
              document.body,
            )
          : null}

        {!showPicker &&
        (hasReadySignatureForActiveTab ||
          placements.length > 0 ||
          assignments.length > 0 ||
          Object.keys(fieldSignatures).length > 0 ||
          savedOnce)
          ? createPortal(
              <div className='fixed bottom-5 left-1/2 z-[10000] flex max-w-[min(92vw,520px)] -translate-x-1/2 flex-col items-center gap-2'>
                {validationMessage ? (
                  <p
                    className='w-full rounded-lg border border-blue-4 bg-blue-1 px-3 py-2 text-center text-[12px] font-medium text-blue-11 shadow-sm'
                    role='status'
                  >
                    {validationMessage}
                  </p>
                ) : null}

                <div className='flex items-center gap-1.5 rounded-xl border border-gray-3 bg-surface-primary px-2 py-1.5 shadow-lg'>
                <Tooltip content='Choose signature' position='top'>
                  <button
                    type='button'
                    className={iconButtonClass}
                    aria-label={t`Choose signature`}
                    onClick={() => setShowPicker(true)}
                  >
                    <PenLine className='h-4 w-4 text-blue-9' />
                  </button>
                </Tooltip>

                <Tooltip content='Undo' position='top'>
                  <button
                    type='button'
                    className={iconButtonClass}
                    aria-label={t`Undo`}
                    disabled={!canUndo}
                    onClick={undoPlacement}
                  >
                    <Undo2 className='h-4 w-4' />
                  </button>
                </Tooltip>

                <button
                  type='button'
                  className={primaryButtonClass}
                  disabled={
                    (fieldSigning
                      ? myFilledFieldCount === 0
                      : workspaceMode === 'create'
                        ? placements.length === 0
                        : assignments.length === 0) ||
                    completing ||
                    isLoading
                  }
                  onClick={() => void handleCompleteSigning()}
                >
                  {completing ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : workspaceMode === 'assign' ? (
                    <Send className='h-3.5 w-3.5' />
                  ) : (
                    <CheckCircle2 className='h-3.5 w-3.5' />
                  )}
                  {completing
                    ? 'Saving...'
                    : workspaceMode === 'assign'
                      ? t`Send`
                      : 'Save'}
                </button>

                {savedOnce && workspaceMode === 'create' ? (
                  <Tooltip content='Download' position='top'>
                    <button
                      type='button'
                      className={iconButtonClass}
                      aria-label={t`Download`}
                      disabled={downloading || placements.length === 0}
                      onClick={() => void handleDownloadSigned()}
                    >
                      {downloading ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Download className='h-4 w-4' />
                      )}
                    </button>
                  </Tooltip>
                ) : null}

                <Tooltip content='Cancel signing' position='top'>
                  <button
                    type='button'
                    className={iconButtonClass}
                    aria-label={t`Cancel signing`}
                    onClick={handleCancelSigning}
                  >
                    <X className='h-4 w-4' />
                  </button>
                </Tooltip>
                </div>
              </div>,
              document.body,
            )
          : null}

        {layerHost ? createPortal(placementOverlayNodes, layerHost) : null}
      </>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-secondary)] text-[13px] text-[var(--text-primary)]'>
      <header className='flex h-[60px] shrink-0 items-center gap-2 border-b border-[var(--border-default)] bg-[var(--surface-primary)] px-4 sm:px-5'>
        <button
          type='button'
          className={controlButtonClass}
          onClick={onBack}
          aria-label={t`Back`}
        >
          <ArrowLeft className='h-4 w-4' />
          <span className='hidden sm:inline'>{t`Back`}</span>
        </button>

        <div className='flex min-w-0 flex-1 items-center gap-2'>
          <FileText className='h-4 w-4 shrink-0 text-[var(--accent-primary)]' />
          <p className='truncate text-[14px] font-semibold'>{documentName}</p>
        </div>

        <div className='hidden items-center gap-1 sm:flex'>
          <button
            type='button'
            className={controlButtonClass}
            aria-label={t`Zoom out`}
            disabled={zoom <= 0.5}
            onClick={() =>
              setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.5, 2))
            }
          >
            <Minus className='h-3.5 w-3.5' />
          </button>
          <span className='min-w-[52px] text-center text-[12px] font-semibold text-[var(--text-secondary)]'>
            {zoomPercent}%
          </span>
          <button
            type='button'
            className={controlButtonClass}
            aria-label={t`Zoom in`}
            disabled={zoom >= 2}
            onClick={() =>
              setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.5, 2))
            }
          >
            <Plus className='h-3.5 w-3.5' />
          </button>
          <button
            type='button'
            className={controlButtonClass}
            aria-label={t`Reset zoom`}
            onClick={() => setZoom(1)}
          >
            <RotateCcw className='h-3.5 w-3.5' />
          </button>

          <span className='mx-1 h-5 w-px bg-[var(--border-default)]' />

          <button
            type='button'
            className={controlButtonClass}
            aria-label={t`Undo`}
            disabled={!canUndo}
            onClick={undoPlacement}
          >
            <Undo2 className='h-3.5 w-3.5' />
            <span className='hidden lg:inline'>{t`Undo`}</span>
          </button>
          <button
            type='button'
            className={controlButtonClass}
            aria-label={t`Redo`}
            disabled={!canRedo}
            onClick={redoPlacement}
          >
            <Redo2 className='h-3.5 w-3.5' />
            <span className='hidden lg:inline'>{t`Redo`}</span>
          </button>
        </div>

        <button
          type='button'
          className={primaryButtonClass}
          disabled={
            (fieldSigning
              ? myFilledFieldCount === 0
              : workspaceMode === 'create'
                ? placements.length === 0
                : assignments.length === 0 || !pendingRequestPayload) ||
            completing ||
            isLoading
          }
          onClick={() => void handleCompleteSigning()}
        >
          {completing ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <CheckCircle2 className='h-4 w-4' />
          )}
          <span className='hidden sm:inline'>
            {completing
              ? 'Saving...'
              : workspaceMode === 'assign'
                ? t`Send Sign Request`
                : 'Submit Signature'}
          </span>
          <span className='sm:hidden'>{completing ? '...' : 'Save'}</span>
        </button>

        {savedOnce ? (
          <button
            type='button'
            className={controlButtonClass}
            disabled={downloading || (placements.length === 0 && assignments.length === 0)}
            onClick={() => void handleDownloadSigned()}
          >
            {downloading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Download className='h-4 w-4' />
            )}
            <span className='hidden sm:inline'>
              {downloading ? 'Preparing...' : 'Download'}
            </span>
          </button>
        ) : null}
      </header>

      <div className='grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <section className='flex min-h-0 flex-col border-b border-[var(--border-default)] lg:border-r lg:border-b-0'>
          <div className='relative min-h-0 flex-1 overflow-hidden bg-[var(--surface-muted)]'>
            {!documentUrl && !isLoading ? (
              <div className='flex h-full min-h-[320px] items-center justify-center p-8 text-center'>
                <div>
                  <FileText className='mx-auto h-10 w-10 text-[var(--text-muted)]' />
                  <p className='mt-3 text-[14px] font-semibold'>
                    Document unavailable
                  </p>
                </div>
              </div>
            ) : (
              <div className='h-full w-full overflow-hidden'>
                <div
                  className='h-full w-full origin-top-left'
                  style={{
                    transform: `scale(${zoom})`,
                    width: `${100 / zoom}%`,
                    height: `${100 / zoom}%`,
                  }}
                >
                  <div
                    ref={documentSurfaceRef}
                    className='relative h-full w-full bg-[var(--surface-primary)]'
                    role='presentation'
                  >
                    <DocumentPreviewViewer
                      className='h-full min-h-full'
                      fileName={documentName}
                      fileUrl={documentUrl || null}
                      isImage={isImage}
                      isLoading={isLoading}
                      isPdf={isPdf}
                    />

                    {layerHost ? createPortal(placementOverlayNodes, layerHost) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className='ez-scrollbar flex min-h-0 flex-col overflow-y-auto bg-[var(--surface-primary)]'>
          <div
            className='flex gap-5 border-b border-[var(--border-default)] px-5'
            role='tablist'
            aria-label={t`Signature methods`}
            onKeyDown={onTabKeyDown}
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type='button'
                  role='tab'
                  aria-selected={selected}
                  id={`signature-tab-${tab.id}`}
                  className={`-mb-px border-b-2 px-0.5 py-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                    selected
                      ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className='flex-1 space-y-4 p-5'>
            {validationMessage ? (
              <p
                className='motion-safe:animate-in motion-safe:fade-in rounded-lg border border-[var(--error-main)]/30 bg-[var(--error-main)]/10 px-3 py-2 text-[12px] text-[var(--error-main)] motion-safe:duration-200'
                role='alert'
              >
                {validationMessage}
              </p>
            ) : null}

            {activeTab === 'type' ? (
              <div className={`${panelSectionClass} space-y-4`} role='tabpanel'>
                <label className='block'>
                  <span className='mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]'>
                    Full name
                  </span>
                  <input
                    type='text'
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    className='h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-[13px] outline-none transition-colors focus:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]'
                    placeholder={t`Enter your full name`}
                  />
                </label>

                <div>
                  <p className='mb-2 text-[12px] font-semibold text-[var(--text-secondary)]'>
                    Live preview
                  </p>
                  <div className='flex h-24 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 transition-all duration-200'>
                    <img
                      src={typedPreviewUrl}
                      alt='Typed signature preview'
                      className='max-h-16 max-w-full object-contain'
                    />
                  </div>
                </div>

                <div>
                  <p className='mb-2 text-[12px] font-semibold text-[var(--text-secondary)]'>
                    Signature style
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {TYPED_STYLES.map((style) => (
                      <Tooltip content={style.label} key={style.id} position='top'>
                        <button
                          type='button'
                          aria-label={style.label}
                          aria-pressed={typedStyleId === style.id}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[17px] leading-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                            typedStyleId === style.id
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                              : 'border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
                          }`}
                          style={{ fontFamily: style.fontFamily }}
                          onClick={() => setTypedStyleId(style.id)}
                        >
                          Aa
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div>
                  <p className='mb-2 text-[12px] font-semibold text-[var(--text-secondary)]'>
                    Signature color
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {SIGNATURE_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type='button'
                        aria-label={color.label}
                        className={`h-8 w-8 rounded-full border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                          signatureColor === color.value
                            ? 'border-[var(--accent-primary)] scale-105'
                            : 'border-[var(--border-default)] hover:scale-105'
                        }`}
                        style={{ backgroundColor: resolveCssColor(color.value) }}
                        onClick={() => setSignatureColor(color.value)}
                      />
                    ))}
                  </div>
                </div>

                <label className='flex items-center gap-2 text-[12px] text-[var(--text-secondary)]'>
                  <input
                    type='checkbox'
                    checked={saveTyped}
                    onChange={(event) => setSaveTyped(event.target.checked)}
                    className='h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent-primary)]'
                  />
                  Save this signature
                </label>
              </div>
            ) : null}

            {activeTab === 'draw' ? (
              <div className={`${panelSectionClass} space-y-4`} role='tabpanel'>
                <div>
                  <div className='mb-2 flex items-center justify-between'>
                    <p className='text-[12px] font-semibold text-[var(--text-secondary)]'>
                      Draw signature
                    </p>
                    <button
                      type='button'
                      className={controlButtonClass}
                      onClick={() => {
                        signaturePadRef.current?.clear()
                        setHasDrawnStroke(false)
                        setActiveSignature(null)
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div
                    className={`relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] ${styles.penCursor}`}
                  >
                    {!hasDrawnStroke ? (
                      <div className='pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 px-4 text-center'>
                        <PenLine className='h-5 w-5 text-[var(--text-muted)]' />
                        <span className='text-[13px] font-medium text-[var(--text-muted)]'>
                          {t`Kindly draw the signature`}
                        </span>
                      </div>
                    ) : null}
                    <SignatureCanvas
                      ref={signaturePadRef}
                      penColor={resolveCssColor(penColor)}
                      minWidth={penWidth}
                      maxWidth={penWidth + 1.5}
                      canvasProps={{
                        className: `h-40 w-full touch-none ${styles.penCursor}`,
                        style: {
                          width: '100%',
                          height: '160px',
                        },
                      }}
                      onBegin={() => setHasDrawnStroke(true)}
                      onEnd={syncDrawnSignature}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <label className='block'>
                    <span className='mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]'>
                      Pen color
                    </span>
                    <div className='flex gap-2'>
                      {SIGNATURE_COLORS.map((color) => (
                        <button
                          key={color.id}
                          type='button'
                          aria-label={color.label}
                          className={`h-7 w-7 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                            penColor === color.value
                              ? 'border-[var(--accent-primary)]'
                              : 'border-[var(--border-default)]'
                          }`}
                          style={{ backgroundColor: resolveCssColor(color.value) }}
                          onClick={() => setPenColor(color.value)}
                        />
                      ))}
                    </div>
                  </label>

                  <label className='block'>
                    <span className='mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]'>
                      Pen width
                    </span>
                    <input
                      type='range'
                      min={1}
                      max={5}
                      step={1}
                      value={penWidth}
                      onChange={(event) => setPenWidth(Number(event.target.value))}
                      className='w-full accent-[var(--accent-primary)]'
                      aria-label={t`Pen width`}
                    />
                  </label>
                </div>

                <label className='flex items-center gap-2 text-[12px] text-[var(--text-secondary)]'>
                  <input
                    type='checkbox'
                    checked={saveDrawn}
                    onChange={(event) => setSaveDrawn(event.target.checked)}
                    className='h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent-primary)]'
                  />
                  Save this signature
                </label>
              </div>
            ) : null}

            {activeTab === 'upload' ? (
              <div className={`${panelSectionClass} space-y-4`} role='tabpanel'>
                <div
                  className={`rounded-xl border border-dashed p-5 text-center transition-all duration-150 ${
                    isDragOver
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-strong)] bg-[var(--surface-muted)]'
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDropUpload}
                >
                  <Upload className='mx-auto h-6 w-6 text-[var(--accent-primary)]' />
                  <p className='mt-2 text-[13px] font-semibold'>
                    {uploadedDataUrl
                      ? 'Signature uploaded'
                      : 'Kindly upload the signature'}
                  </p>
                  <p className='mt-1 text-[11px] text-[var(--text-muted)]'>
                    PNG, JPG, JPEG · Max 5 MB
                  </p>
                  <button
                    type='button'
                    className={`${controlButtonClass} mt-3`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse
                  </button>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.png,.jpg,.jpeg,image/png,image/jpeg'
                    className='hidden'
                    onChange={onFileInputChange}
                  />
                </div>

                {uploadError ? (
                  <p className='text-[12px] text-[var(--error-main)]' role='alert'>
                    {uploadError}
                  </p>
                ) : null}

                {uploadedDataUrl ? (
                  <div className='space-y-3'>
                    <div className='flex h-28 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3'>
                      <img
                        src={uploadedDataUrl}
                        alt={uploadedFileName || 'Uploaded signature preview'}
                        className='max-h-full max-w-full object-contain'
                      />
                    </div>
                    <p className='truncate text-[12px] text-[var(--text-secondary)]'>
                      {uploadedFileName}
                    </p>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        className={controlButtonClass}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace file
                      </button>
                      <button
                        type='button'
                        className={controlButtonClass}
                        onClick={() => {
                          setUploadedDataUrl(null)
                          setUploadedFileName('')
                        }}
                      >
                        Remove file
                      </button>
                    </div>
                  </div>
                ) : null}

                <label className='flex items-center gap-2 text-[12px] text-[var(--text-secondary)]'>
                  <input
                    type='checkbox'
                    checked={saveUploaded}
                    onChange={(event) => setSaveUploaded(event.target.checked)}
                    className='h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent-primary)]'
                  />
                  Save this signature
                </label>
              </div>
            ) : null}

            {activeTab === 'saved' ? (
              <div className={`${panelSectionClass} space-y-3`} role='tabpanel'>
                {savedSignatures.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-10 text-center'>
                    <Bookmark className='mx-auto h-6 w-6 text-[var(--text-muted)]' />
                    <p className='mt-2 text-[13px] font-semibold'>{t`No saved signatures`}</p>
                    <p className='mt-1 text-[12px] text-[var(--text-secondary)]'>
                      Signatures you save will appear here for reuse.
                    </p>
                  </div>
                ) : (
                  savedSignatures.map((signature) => {
                    const selected = selectedSavedId === signature.id
                    const confirming = deleteConfirmId === signature.id
                    return (
                      <div
                        key={signature.id}
                        className={`rounded-xl border p-3 transition-all duration-150 ${
                          selected
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:bg-[var(--surface-hover)]'
                        }`}
                        onClick={() => handleUseSaved(signature)}
                      >
                        <button
                          type='button'
                          className='w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]'
                          onClick={() => setSelectedSavedId(signature.id)}
                        >
                          <div className='flex h-16 items-center justify-center rounded-lg bg-[var(--surface-muted)] px-3'>
                            <img
                              src={signature.imageUrl}
                              alt={`${signature.name} signature`}
                              className='max-h-12 max-w-full object-contain'
                            />
                          </div>
                          <div className='mt-2 flex items-center justify-between gap-2'>
                            <div className='min-w-0'>
                              <p className='truncate text-[13px] font-semibold'>
                                {signature.name}
                              </p>
                              <p className='text-[11px] capitalize text-[var(--text-muted)]'>
                                {signature.type}
                              </p>
                            </div>
                            {selected ? (
                              <span className='rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold text-white'>
                                Selected
                              </span>
                            ) : null}
                             <button
                              type='button'
                              className={controlButtonClass}
                              aria-label={`Delete ${signature.name}`}
                              onClick={() => setDeleteConfirmId(signature.id)}
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </button>
                          </div>
                        </button>

                        {confirming ? (
                          <div className='mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2'>
                            <p className='text-[12px] font-medium'>{t`Delete this signature?`}</p>
                            <div className='mt-2 flex gap-2'>
                              <button
                                type='button'
                                className={controlButtonClass}
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                type='button'
                                className={`${controlButtonClass} text-[var(--error-main)]`}
                                onClick={async () => {
                                  await onDeleteSavedSignature?.(signature.id)
                                  setDeleteConfirmId(null)
                                  if (selectedSavedId === signature.id) {
                                    setSelectedSavedId(null)
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          false&& (<div className='mt-3 flex gap-2'>
                            <button
                              type='button'
                              className={`${primaryButtonClass} h-8 flex-1 px-3 text-[12px]`}
                              onClick={() => void handleUseSaved(signature)}
                            >
                              Use
                            </button>
                            <button
                              type='button'
                              className={controlButtonClass}
                              aria-label={`Delete ${signature.name}`}
                              onClick={() => setDeleteConfirmId(signature.id)}
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </button>
                          </div>)
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default DocumentSigningPage

/*
Demo usage:

<DocumentSigningPage
  documentUrl="/sample-document.pdf"
  documentName="Supplier Agreement.pdf"
  signerName="Mohamed Bilal"
  savedSignatures={[
    {
      id: 'signature-1',
      name: 'Primary signature',
      type: 'drawn',
      imageUrl: '/sample-signature.png',
    },
  ]}
  onSaveSignature={async (signature) => {
    console.log('Connect save-signature API here', signature)
  }}
  onDeleteSavedSignature={async (signatureId) => {
    console.log('Connect delete-signature API here', signatureId)
  }}
  onCompleteSigning={async (placement) => {
    console.log('Connect complete-signing API here', placement)
  }}
/>
*/
