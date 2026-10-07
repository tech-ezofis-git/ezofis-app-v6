import { useLingui } from '@lingui/react/macro'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PenLine,
  ScanText,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { axiosV6 } from '@/api/axios'
import fileApi from '@/api/file/file'
import {
  getRepositoryById,
  persistEditedDocumentToRepository,
  type RepositoryFieldDto,
  type UploadArchiveResponse,
} from '@/api/v6/folder/folder'
import {
  collectSignRequestFields,
  createSignRequest,
  getSignRequest,
  getSignRequestInviteFile,
  listItemSignRequests,
  listPendingSignRequestsForMe,
  type SignRequestFieldDto,
  type SignRequestInvitePreview,
  submitInviteSignRequest,
  submitSignRequest,
} from '@/api/v6/folder/signRequest'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import Menu from '@/components/base/menu/Menu'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import {
  buildRedactedFileBlob,
  collectRedactValues,
} from '@/components/common/document-preview/pii'
import { SkeletonDocumentDetails } from '@/components/common/skeletons'
import { getSearchHitTitle } from '@/layouts/app/components/topbar/components/globalSearchApi'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import RelatedDocumentsFinder from '@/pages/requests/components/request/components/sections/overview/RelatedDocumentsFinder'

const getMilestoneIcon = (milestone?: string) => {
  switch (String(milestone || '').toLowerCase()) {
    case 'start':
      return 'play'
    case 'approved':
      return 'checkCircle'
    case 'forwarded':
      return 'arrowRight'
    case 'pending':
      return 'clock'
    case 'completed':
      return 'check'
    default:
      return 'circle'
  }
}
import Buttons from '@/components/base/button/Button'
import authUserStore from '@/stores/authUserStore'
import {
  formatUtcToLocalDate,
  formatUtcToLocalDateTime,
  parseUtcDate,
} from '@/utils/utcDate'
import { folderApi } from '../api/folderApi'
import {
  type DocumentPreviewKind,
  getFileExtension,
  resolveDocumentPreviewKind,
  resolvePreviewMimeType,
  sniffBlobMimeType,
} from '../utils/documentDetailsUtils'
import {
  getFieldDisplayValue,
  getFieldSearchVariantStrings,
} from '../utils/fieldPdfSearch'
import {
  emptyFolderPiiSettings,
  type FolderPiiSettings,
  resolveFolderPiiSettings,
  userCanToggleFolderPii,
  verifyFolderPiiPassword,
} from '../utils/folderPiiSettings'
import { resolveShareContext } from '../utils/shareContextStorage'
import {
  loadSignRequestFields,
  saveSignRequestFields,
} from '../utils/signRequestFieldsStorage'
import CollaboraEditor from './CollaboraEditor'
import {
  type DocumentSigningActionRef,
  DocumentSigningPage,
  type DocumentSigningState,
  type SavedSignature,
} from './DocumentSigningPage'
import FolderSharePopover from './FolderSharePopover'
import { DynamicIcon } from './icons'
import { Button, Card, PrimaryButton, StatusPill } from './Ui'
const EMPTY_SIGNATURE_FIELDS: SignRequestFieldDto[] = []

type CommentItem = {
  actorName?: string
  author?: string
  authorEmail?: string
  authorName?: string
  authorUserId?: string
  body?: string
  comment?: string
  createdAtUtc?: string
  date?: string
  id?: string
  message?: string
  text?: string
}
type DetailCard = {
  iconKey: string
  id: string
  rows: Array<{ color?: string; label: string; value: string }>
  title: string
}
type DetailField = { key?: string; label?: string; value?: any }

type DetailSection = {
  fields?: DetailField[] | null
  sectionKey?: string
  title?: string
}

type RelatedDoc = {
  createdAtUtc?: string | null
  documentType?: string | null
  fileName: string
  fileSize?: number | null
  fileType?: string | null
  id: string
  matchCount?: number
  matchedFields?: string[]
  matchScore?: number
  relatedItemId?: string
  relatedRepositoryId?: string
  repositoryId: string
  repositoryName?: string | null
  supplier?: string | null
}

const toRelatedDoc = (
  row: {
    createdAtUtc?: string | null
    documentType?: string | null
    fileName?: string | null
    fileSize?: number | null
    fileType?: string | null
    id?: string
    matchCount?: number
    matchedFields?: string[]
    matchScore?: number
    relatedItemId?: string
    relatedRepositoryId?: string
    repositoryId?: string
    repositoryName?: string | null
    supplier?: string | null
  },
  untitled: string,
): RelatedDoc | null => {
  const relatedItemId = String(row?.relatedItemId || row?.id || '').trim()
  const relatedRepositoryId = String(
    row?.relatedRepositoryId || row?.repositoryId || '',
  ).trim()
  if (!relatedItemId || !relatedRepositoryId) return null
  return {
    createdAtUtc: row.createdAtUtc,
    documentType: row.documentType,
    fileName: String(row.fileName || untitled),
    fileSize: row.fileSize,
    fileType: row.fileType,
    id: relatedItemId,
    matchCount: row.matchCount,
    matchedFields: Array.isArray(row.matchedFields) ? row.matchedFields : [],
    matchScore: row.matchScore,
    relatedItemId,
    relatedRepositoryId,
    repositoryId: relatedRepositoryId,
    repositoryName: row.repositoryName,
    supplier: row.supplier,
  }
}

type TimelineEvent = {
  actorName?: string
  actorType?: string
  createdAtUtc?: string
  description?: string | null
  eventType?: string
  id?: string
  isDerived?: boolean
  title: string
}

type WorkspaceDocumentDetail = {
  alert?: { badge: string; subtitle: string; title: string } | null
  DetailsRow?: DetailSection[] | null
  documentId?: string
  fileName: string
  fileType: string
  fileUrl?: string
  infoCards?: DetailCard[]
  lineItems?: Array<Record<string, any>> | null
}

const sectionIconMap: Record<string, string> = {
  aiAnalysis: 'bot',
  documentInfo: 'fileText',
  supplierDetails: 'fileText',
  systemInfo: 'clock',
}

const eventIconMap: Record<string, string> = {
  ai: 'bot',
  comment: 'messageSquare',
  system: 'fileText',
  user: 'clock',
  workflow: 'check',
}

const toDisplayValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const formatDateTime = (value?: string) => {
  if (!value) return ''
  return formatUtcToLocalDateTime(value, value)
}

const formatDateOnly = (value?: string) => {
  if (!value) return ''
  return formatUtcToLocalDate(value, '')
}

const formatTimeOnly = (value?: string) => {
  if (!value) return ''
  const d = parseUtcDate(value)
  if (!d) return ''
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
  })
}

const formatRelatedFileSize = (bytes?: number | null) => {
  if (bytes == null || Number.isNaN(Number(bytes)) || Number(bytes) <= 0) {
    return ''
  }
  const size = Number(bytes)
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const PRIMARY_HIGHLIGHT_COLOR = 'var(--primary-9)'

const formatLineItemHeader = (key: string) =>
  String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-'

const lineItemStickyClass = (index: number, kind: 'th' | 'td') => {
  const baseBg = kind === 'th' ? 'bg-surface-primary' : 'bg-surface-primary'
  if (index === 0) {
    return `sticky left-0 z-20 min-w-[88px] max-w-[120px] ${baseBg}`
  }
  if (index === 1) {
    return `sticky left-[88px] z-20 min-w-[140px] max-w-[220px] ${baseBg}`
  }
  return 'min-w-[120px]'
}

const buildInfoCards = (
  data: WorkspaceDocumentDetail | null,
  t: ReturnType<typeof useLingui>['t'],
): DetailCard[] => {
  if (!data) return []
  if (Array.isArray(data.infoCards) && data.infoCards.length > 0)
    return data.infoCards

  const sections = Array.isArray(data.DetailsRow) ? data.DetailsRow : []

  return sections
    .filter(
      (section) => Array.isArray(section.fields) && section.fields.length > 0,
    )
    .map((section, index) => ({
      iconKey: sectionIconMap[section.sectionKey || ''] || 'fileText',
      id: section.sectionKey || `section-${index}`,
      rows: (section.fields || [])
        .filter(
          (field) =>
            field &&
            field.value !== null &&
            field.value !== undefined &&
            field.value !== '',
        )
        .map((field) => ({
          label:
            String(field.label || field.key || '')
              .trim()
              .toLowerCase() === 'status'
              ? t`Current Stage`
              : field.label || field.key || '-',
          value: toDisplayValue(field.value),
        })),
      title: section.title || section.sectionKey || t`Section ${index + 1}`,
    }))
    .filter((card) => card.rows.length > 0)
}

const isMissingDocumentError = (message: string) => {
  const text = message.trim().toLowerCase()
  return (
    text === 'not found' ||
    text.includes('not found') ||
    text.includes('does not exist') ||
    text.includes('404')
  )
}

const toUiErrorMessage = (value: unknown, fallback: string) => {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (value instanceof Error) return value.message || fallback
  if (typeof value === 'object') {
    const record = value as {
      detail?: unknown
      error?: unknown
      message?: unknown
      title?: unknown
    }
    for (const key of ['error', 'message', 'title', 'detail'] as const) {
      const part = record[key]
      if (typeof part === 'string' && part.trim()) return part.trim()
    }
  }
  return fallback
}

export function DocumentDetailsView({
  autoOpenShare = false,
  compactActions = false,
  fileName = '',
  forceSigning = false,
  id,
  invitePreview = null,
  inviteToken = '',
  permissions,
  repositoryId,
  signatureFields: initialSignatureFieldsProp,
  signRequestId: initialSignRequestId = '',
  // onEdit,
  onAiSummary,
  onBack,
  onOpenRelatedDocument,
  onShareOpened,
  onSigningComplete,
  onWorkflow,
}: {
  /** Open the Canva-style share popover on mount (list Share action). */
  autoOpenShare?: boolean
  /** Hide AI/Share/Workflow when opened from invite. */
  compactActions?: boolean
  /** Name from search or the folder list, used when the file no longer exists. */
  fileName?: string
  /** Open directly in assigned-field signing mode (invite / pending). */
  forceSigning?: boolean
  id: string
  /** Invite preview metadata — used when workspace API is not available. */
  invitePreview?: SignRequestInvitePreview | null
  inviteToken?: string
  permissions?: {
    checkIn?: boolean
    checkOut?: boolean
    delete?: boolean
    download?: boolean
    editDocument?: boolean
    editMetadata?: boolean
    print?: boolean
    sendForSignature?: boolean
    upload?: boolean
    view?: boolean
  }
  repositoryId: string
  signatureFields?: SignRequestFieldDto[]
  signRequestId?: string
  onAiSummary?: () => void
  /** Leave the details view. Omit when there is nowhere to go back to. */
  onBack?: () => void
  onEdit?: () => void
  /** Open a related file in details (use that row's repositoryId + id). */
  onOpenRelatedDocument?: (payload: {
    id: string
    repositoryId: string
  }) => void
  onShareOpened?: () => void
  /** Signature was actually submitted (not just the signing UI closed). */
  onSigningComplete?: () => void
  onWorkflow?: () => void
}) {
  const { t } = useLingui()
  const initialSignatureFields =
    initialSignatureFieldsProp ?? EMPTY_SIGNATURE_FIELDS
  const initialFieldsKey = useMemo(
    () =>
      JSON.stringify(
        (initialSignatureFields || []).map((field) => ({
          e: field.signerEmail,
          h: field.height,
          p: field.pageNumber,
          w: field.width,
          x: field.x,
          y: field.y,
        })),
      ),
    [initialSignatureFields],
  )
  const [data, setData] = useState<WorkspaceDocumentDetail | null>(null)
  const [ticketData, setTicketData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'timeline' | 'comments' | 'relatedDocs'>(
    'timeline',
  )
  const [fileLoadFailed, setFileLoadFailed] = useState(false)

  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineLoaded, setTimelineLoaded] = useState(false)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsHasMore, setCommentsHasMore] = useState(true)
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement | null>(null)
  const commentsContainerRef = useRef<HTMLDivElement | null>(null)
  const commentsRequestIdRef = useRef(0)
  const relatedDocsRequestIdRef = useRef(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null)
  const [previewKind, setPreviewKind] = useState<DocumentPreviewKind | null>(
    null,
  )
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const previewUrlRef = useRef<string | null>(null)
  const previewRequestIdRef = useRef(0)
  const previewBlobRef = useRef<Blob | null>(null)
  const [isEditingDoc, setIsEditingDoc] = useState(false)
  /** Bump after a successful sign so the details viewer reloads the signed file. */
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  /** Bump to reload document details and metadata from the backend. */
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [isSigning, setIsSigning] = useState(Boolean(forceSigning))
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([])
  const [activeSignRequestId, setActiveSignRequestId] = useState(
    String(initialSignRequestId || ''),
  )
  const [activeInviteToken] = useState(String(inviteToken || ''))
  // Signing UI is for invite / forced sign flows only.
  // "Send for Signature" permission gates creating sign requests via Share.
  const canSign = Boolean(forceSigning || activeInviteToken)
  const canDownload = permissions ? permissions.download === true : true
  const canPrint = permissions ? permissions.print === true : true
  const canEditDocument = permissions ? permissions.editDocument === true : true
  const canSendForSignature = permissions
    ? permissions.sendForSignature === true
    : true
  const [assignedFields, setAssignedFields] = useState<SignRequestFieldDto[]>(
    () => initialSignatureFields,
  )
  const [restrictToFields, setRestrictToFields] = useState(
    Boolean(forceSigning && initialSignatureFields.length > 0),
  )
  const [signPickerKey, setSignPickerKey] = useState(0)
  const [sharedEmails, setSharedEmails] = useState<string[]>([])
  const [sharedRoles, setSharedRoles] = useState<Record<string, string>>({})
  const documentSurfaceRef = useRef<HTMLDivElement | null>(null)
  const signTriggerRef = useRef<HTMLButtonElement | null>(null)
  const signingActionRef = useRef<DocumentSigningActionRef | null>(null)
  const [signingState, setSigningState] = useState<DocumentSigningState>({
    canSave: false,
    hasPlacements: false,
    isSaving: false,
    workspaceMode: 'create',
  })
  const signingResolvedForRef = useRef('')
  const [relatedDocs, setRelatedDocs] = useState<RelatedDoc[]>([])
  const [relatedDocsLoading, setRelatedDocsLoading] = useState(false)
  const [relatedDocsTotal, setRelatedDocsTotal] = useState(0)
  const [removingRelatedKey, setRemovingRelatedKey] = useState<string | null>(
    null,
  )

  const applyRelatedDocs = useCallback(
    (response: {
      data?: Array<Parameters<typeof toRelatedDoc>[0]>
      totalCount?: number
    }) => {
      const rows = Array.isArray(response?.data) ? response.data : []
      const mapped = rows
        .map((row) => toRelatedDoc(row, t`Untitled`))
        .filter((row): row is RelatedDoc => Boolean(row))
      setRelatedDocs(mapped)
      setRelatedDocsTotal(Number(response?.totalCount || mapped.length || 0))
    },
    [t],
  )

  const loadRelatedDocs = useCallback(
    async (options?: { silent?: boolean }) => {
      if (inviteToken || !repositoryId || !id) return
      const requestId = ++relatedDocsRequestIdRef.current
      if (!options?.silent) setRelatedDocsLoading(true)
      try {
        const response = await folderApi.getRelatedDocuments(repositoryId, id, {
          page: 1,
          pageSize: 50,
        })
        if (requestId !== relatedDocsRequestIdRef.current) return
        applyRelatedDocs(response)
      } catch {
        // Keep existing related docs if the refresh fails.
      } finally {
        if (requestId === relatedDocsRequestIdRef.current && !options?.silent) {
          setRelatedDocsLoading(false)
        }
      }
    },
    [applyRelatedDocs, id, inviteToken, repositoryId],
  )

  const loadComments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (inviteToken || !repositoryId || !id) return
      const requestId = ++commentsRequestIdRef.current
      if (!options?.silent) setCommentsLoading(true)
      try {
        const response = await folderApi.getDocumentComments(repositoryId, id, {
          page: 1,
          pageSize: 50,
        })
        if (requestId !== commentsRequestIdRef.current) return
        const fetchedComments = Array.isArray(response?.comments)
          ? [...response.comments].reverse()
          : []
        setComments(fetchedComments)
        setCommentsTotal(
          Number(response?.totalCount || fetchedComments.length || 0),
        )
        setCommentsPage(1)
        setCommentsHasMore(fetchedComments.length === 50)
        if (!options?.silent) {
          window.setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'auto' })
          }, 100)
        }
      } catch {
        // Keep existing comments if the refresh fails.
      } finally {
        if (requestId === commentsRequestIdRef.current && !options?.silent) {
          setCommentsLoading(false)
        }
      }
    },
    [id, inviteToken, repositoryId],
  )

  const removeRelatedDoc = useCallback(
    async (item: RelatedDoc) => {
      const openRepoId = String(repositoryId || '').trim()
      const openItemId = String(id || '').trim()
      const relatedRepositoryId = String(
        item.relatedRepositoryId || item.repositoryId || '',
      ).trim()
      const relatedItemId = String(item.relatedItemId || item.id || '').trim()
      if (
        !openRepoId ||
        !openItemId ||
        !relatedRepositoryId ||
        !relatedItemId
      ) {
        showToast({
          message: t`This related document cannot be removed.`,
          variant: 'error',
        })
        return
      }

      const key = `${relatedRepositoryId}:${relatedItemId}`
      setRemovingRelatedKey(key)
      try {
        await folderApi.removeRelatedDocument(openRepoId, openItemId, {
          relatedItemId,
          relatedRepositoryId,
        })
        setRelatedDocs((prev) =>
          prev.filter(
            (doc) =>
              `${doc.relatedRepositoryId || doc.repositoryId}:${doc.relatedItemId || doc.id}` !==
              key,
          ),
        )
        setRelatedDocsTotal((prev) => Math.max(0, prev - 1))
        showToast({
          message: t`Removed from related`,
          variant: 'success',
        })
      } catch (exception) {
        showToast({
          message: toUiErrorMessage(
            exception instanceof Error ? exception.message : exception,
            t`Unable to remove related document`,
          ),
          variant: 'error',
        })
      } finally {
        setRemovingRelatedKey(null)
      }
    },
    [id, repositoryId, t],
  )
  const { session } = authUserStore.getState()
  const currentUserEmail = String(session?.email || '')
    .trim()
    .toLowerCase()
  const currentUserId = String(session?.id || '').trim()
  const signerName =
    [session?.firstName, session?.lastName].filter(Boolean).join(' ').trim() ||
    session?.name ||
    ''

  const [folderPiiSettings, setFolderPiiSettings] = useState<FolderPiiSettings>(
    emptyFolderPiiSettings,
  )
  const [piiRepositoryFields, setPiiRepositoryFields] = useState<
    RepositoryFieldDto[]
  >([])
  const [showUnredactedPreview, setShowUnredactedPreview] = useState(false)
  const [piiPasswordMenuOpen, setPiiPasswordMenuOpen] = useState(false)
  const [piiPasswordInput, setPiiPasswordInput] = useState('')
  const [piiPasswordError, setPiiPasswordError] = useState('')

  useEffect(() => {
    setShowUnredactedPreview(false)
    setPiiPasswordMenuOpen(false)
    setPiiPasswordInput('')
    setPiiPasswordError('')
    let cancelled = false
    const loadFolderPii = async () => {
      if (!repositoryId) {
        setFolderPiiSettings(emptyFolderPiiSettings())
        setPiiRepositoryFields([])
        return
      }
      try {
        const response = await getRepositoryById(repositoryId)
        if (cancelled) return
        const details =
          response.data && typeof response.data === 'object'
            ? (response.data as Record<string, unknown>)
            : null
        setFolderPiiSettings(resolveFolderPiiSettings(repositoryId, details))
        setPiiRepositoryFields(
          Array.isArray(details?.fields)
            ? (details.fields as RepositoryFieldDto[])
            : [],
        )
      } catch {
        if (!cancelled) {
          setFolderPiiSettings(resolveFolderPiiSettings(repositoryId, null))
          setPiiRepositoryFields([])
        }
      }
    }
    void loadFolderPii()
    return () => {
      cancelled = true
    }
  }, [repositoryId])

  const folderPiiEnabled = folderPiiSettings.enabled
  const canToggleUnredacted = userCanToggleFolderPii(
    folderPiiSettings,
    currentUserId,
  )
  const enablePiiRedaction =
    folderPiiEnabled && !(canToggleUnredacted && showUnredactedPreview)
  const usePiiNer =
    enablePiiRedaction && folderPiiSettings.fieldIds.length === 0

  useEffect(() => {
    setSavedSignatures([])
    setActiveSignRequestId(String(initialSignRequestId || ''))
    if (initialSignatureFields.length > 0) {
      setAssignedFields(initialSignatureFields)
      setRestrictToFields(Boolean(forceSigning))
    }
    if (forceSigning) setIsSigning(true)
    signingResolvedForRef.current = ''
  }, [repositoryId, id, forceSigning, initialSignRequestId, initialFieldsKey])

  useEffect(() => {
    let mounted = true
    const resolveKey = `${repositoryId}:${id}:${currentUserEmail}:${forceSigning ? 1 : 0}`
    if (signingResolvedForRef.current === resolveKey) return

    const resolveAssignedSigning = async () => {
      if (!repositoryId || !id) return

      const localFields = loadSignRequestFields({
        itemId: id,
        repositoryId,
        signRequestId: initialSignRequestId || undefined,
      })

      let fields = [
        ...(initialSignatureFields.length ? initialSignatureFields : []),
        ...localFields,
      ]
      let requestId = String(initialSignRequestId || '').trim()

      const itemRequests = await listItemSignRequests({
        itemId: id,
        repositoryId,
      })
      if (!mounted) return

      const activeRequests = (itemRequests.data || []).filter((request) => {
        const status = String(request.status || '').toUpperCase()
        return !status.includes('CANCEL') && !status.includes('COMPLETE')
      })

      const pendingForUser = currentUserEmail
        ? activeRequests.find((request) => {
            return (request.signers || []).some((signer) => {
              const email = String(signer.email || '')
                .trim()
                .toLowerCase()
              const signerStatus = String(signer.status || '').toUpperCase()
              return (
                email === currentUserEmail &&
                !signerStatus.includes('SIGNED') &&
                !signerStatus.includes('DECLINE') &&
                !signerStatus.includes('CANCEL')
              )
            })
          })
        : undefined

      // Latest active request — so the owner also sees marked places after refresh.
      const latestActive = pendingForUser || activeRequests[0]

      if (latestActive?.signRequestId) {
        requestId = latestActive.signRequestId
        let fromDto = collectSignRequestFields(latestActive)

        // Detail endpoint is more likely to include `message` (embedded places).
        const detail = await getSignRequest({
          signRequestId: requestId,
        })
        if (!mounted) return
        const detailFields = collectSignRequestFields(detail.data)
        if (detailFields.length) fromDto = detailFields

        fields = fromDto.length ? fromDto : fields

        // Prefer API/message fields; localStorage is only a same-browser fallback.
        if (!fields.length) {
          const stored = loadSignRequestFields({
            itemId: id,
            repositoryId,
            signRequestId: requestId,
          })
          if (stored.length) fields = stored
        }
      } else if (!requestId && currentUserEmail) {
        const pending = await listPendingSignRequestsForMe()
        if (!mounted) return
        const match = (pending.data || []).find(
          (request) =>
            String(request.itemId) === String(id) &&
            String(request.repositoryId) === String(repositoryId),
        )
        if (match?.signRequestId) {
          requestId = match.signRequestId
          const fromDto = collectSignRequestFields(match)
          fields = fromDto.length
            ? fromDto
            : loadSignRequestFields({
                itemId: id,
                repositoryId,
                signRequestId: requestId,
              })
        }
      } else if (requestId && !fields.length) {
        const detail = await getSignRequest({ signRequestId: requestId })
        if (!mounted) return
        const detailFields = collectSignRequestFields(detail.data)
        if (detailFields.length) fields = detailFields
      }

      fields = fields.map((field) => ({
        ...field,
        signerEmail: field.signerEmail || undefined,
      }))

      if (!mounted) return
      signingResolvedForRef.current = resolveKey

      if (requestId) {
        setActiveSignRequestId((previous) =>
          previous === requestId ? previous : requestId,
        )
      }
      if (fields.length) {
        setAssignedFields(fields)
        if (requestId) {
          saveSignRequestFields({
            fields,
            itemId: id,
            repositoryId,
            signRequestId: requestId,
          })
        }
      }

      // Signing is invite-only: the normal details view keeps the assigned
      // places visible as a read-only overlay but never enters sign mode.
      if (!canSign) return

      // Open signing when this user is a pending signer (even if fields load late).
      if (fields.length || requestId || pendingForUser) {
        setRestrictToFields(fields.length > 0)
        setIsSigning(true)
      }
    }

    void resolveAssignedSigning()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryId, id, currentUserEmail, forceSigning, initialFieldsKey])

  useEffect(() => {
    let mounted = true

    const loadDetail = async () => {
      if (!repositoryId || !id) return
      setLoading(true)
      setError('')
      setData(null)
      setTicketData(null)
      setFileLoadFailed(false)
      setTimeline([])
      setComments([])
      setRelatedDocs([])
      setTimelineLoaded(false)
      setCommentsLoading(false)
      setCommentsTotal(0)
      setRelatedDocsLoading(false)
      setRelatedDocsTotal(0)
      setRemovingRelatedKey(null)
      setTab('timeline')

      // Invite links: assignee may not have repository access — use preview meta.
      if (inviteToken) {
        if (mounted) {
          setData({
            documentId: id,
            fileName: String(invitePreview?.fileName || 'Document.pdf'),
            fileType: 'pdf',
            infoCards: [
              {
                iconKey: 'fileText',
                id: 'sign-request',
                rows: [
                  {
                    label: 'From',
                    value:
                      invitePreview?.senderName ||
                      invitePreview?.senderEmail ||
                      '-',
                  },
                  {
                    label: 'To',
                    value: invitePreview?.recipientEmail || '-',
                  },
                ],
                title: 'Sign request',
              },
            ],
          })
          setLoading(false)
        }
        return
      }

      try {
        const shareCtx = resolveShareContext(
          authUserStore.getState().shareContext,
        )
        const useShareToken =
          shareCtx &&
          String(shareCtx.sourceItemId) === String(id) &&
          String(shareCtx.sourceRepositoryId) === String(repositoryId)

        const [response, ticketRes] = await Promise.allSettled([
          folderApi.getDocumentDetail(
            repositoryId,
            id,
            useShareToken
              ? {
                  shareToken: shareCtx.shareToken,
                  tenantId: shareCtx.sourceTenantId,
                }
              : undefined,
          ),
          !useShareToken
            ? axiosV6({
                method: 'GET',
                url: `/repositories/${repositoryId}/items/${id}/ticket`,
              })
            : Promise.resolve(null),
        ])

        if (mounted) {
          if (response.status === 'fulfilled') {
            setData(response.value as WorkspaceDocumentDetail)
          } else {
            throw response.reason
          }
          if (
            ticketRes.status === 'fulfilled' &&
            ticketRes.value?.data?.hasTicket
          ) {
            setTicketData(ticketRes.value.data.ticket)
          }
        }
      } catch (exception: any) {
        if (mounted)
          setError(
            toUiErrorMessage(
              exception?.response?.data || exception?.message || exception,
              t`Unable to load document details`,
            ),
          )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDetail()
    return () => {
      mounted = false
    }
  }, [
    repositoryId,
    id,
    inviteToken,
    invitePreview?.fileName,
    t,
    detailsRefreshKey,
  ])

  useEffect(() => {
    let mounted = true
    if (!id || !repositoryId || compactActions) {
      setSharedEmails([])
      setSharedRoles({})
      return
    }

    const loadSharedPeople = async () => {
      const roles: Record<string, string> = {}
      const emails = new Set<string>()

      try {
        const shareData = await folderApi.getShareData({
          itemId: id,
          repositoryId,
        })
        for (const person of shareData.sharedWith || []) {
          const email = String(person.email || '')
            .trim()
            .toLowerCase()
          if (!email) continue
          emails.add(email)
          roles[email] = /edit/i.test(String(person.permission || ''))
            ? 'View'
            : 'View'
        }
      } catch {
        // ignore share list errors
      }

      try {
        const requests = await listItemSignRequests({
          itemId: id,
          repositoryId,
        })
        for (const request of requests.data || []) {
          const status = String(request.status || '').toUpperCase()
          if (status === 'CANCELLED' || status === 'COMPLETED') continue
          for (const signer of request.signers || []) {
            const email = String(signer.email || '')
              .trim()
              .toLowerCase()
            if (!email) continue
            emails.add(email)
            roles[email] = 'Sign'
          }
        }
      } catch {
        // ignore sign-request list errors
      }

      if (!mounted) return
      setSharedEmails([...emails])
      setSharedRoles(roles)
    }

    void loadSharedPeople()
    return () => {
      mounted = false
    }
  }, [id, repositoryId, compactActions])

  useEffect(() => {
    let mounted = true

    const loadTimeline = async () => {
      if (inviteToken) return
      if (tab !== 'timeline' || !repositoryId || !id || timelineLoaded) return
      setTimelineLoading(true)

      try {
        const response = await folderApi.getDocumentTimeline(repositoryId, id)
        if (mounted) {
          setTimeline(Array.isArray(response?.events) ? response.events : [])
          setTimelineLoaded(true)
        }
      } catch {
        if (mounted) {
          setTimeline([])
          setTimelineLoaded(true)
        }
      } finally {
        if (mounted) setTimelineLoading(false)
      }
    }

    loadTimeline()
    return () => {
      mounted = false
    }
  }, [tab, repositoryId, id, timelineLoaded])

  useEffect(() => {
    if (inviteToken || !repositoryId || !id) return
    void loadComments({ silent: true })
    void loadRelatedDocs({ silent: true })
  }, [id, inviteToken, loadComments, loadRelatedDocs, repositoryId])

  const handleCommentsScroll = async (e: any) => {
    const target = e.target as HTMLDivElement
    if (target.scrollTop === 0 && commentsHasMore && !commentsLoadingMore) {
      setCommentsLoadingMore(true)
      const previousScrollHeight = target.scrollHeight
      try {
        const nextPage = commentsPage + 1
        const response = await folderApi.getDocumentComments(repositoryId, id, {
          page: nextPage,
          pageSize: 50,
        })
        const fetchedComments = Array.isArray(response?.comments)
          ? response.comments
          : []
        if (fetchedComments.length > 0) {
          setComments((prev) => [...fetchedComments.reverse(), ...prev])
          setCommentsPage(nextPage)
          setCommentsHasMore(fetchedComments.length === 50)

          setTimeout(() => {
            if (commentsContainerRef.current) {
              commentsContainerRef.current.scrollTop =
                commentsContainerRef.current.scrollHeight - previousScrollHeight
            }
          }, 0)
        } else {
          setCommentsHasMore(false)
        }
      } catch (error) {
        console.error('Failed to load more comments:', error)
      } finally {
        setCommentsLoadingMore(false)
      }
    }
  }

  useEffect(() => {
    const requestId = ++previewRequestIdRef.current
    let cancelled = false

    const replacePreviewUrl = (nextUrl: string | null) => {
      if (previewUrlRef.current && previewUrlRef.current !== nextUrl) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      previewUrlRef.current = nextUrl
      setPreviewUrl(nextUrl)
    }

    const buildTypedBlob = async (blob: Blob, mimeType: string) => {
      if (!mimeType || mimeType === blob.type) return blob
      const buffer = await blob.arrayBuffer()
      return new Blob([buffer], { type: mimeType })
    }

    const resolveBlobMime = async (
      blob: Blob,
      fileName?: string | null,
      fileTypeHint?: string | null,
    ) => {
      let mimeType = resolvePreviewMimeType(blob.type, fileName, fileTypeHint)
      if (!mimeType || mimeType === 'application/octet-stream') {
        const sniffed = await sniffBlobMimeType(blob)
        mimeType = resolvePreviewMimeType(sniffed, fileName, fileTypeHint)
      }
      return mimeType
    }

    const loadPreview = async () => {
      if (!repositoryId || !id) return

      setIsPreviewLoading(true)
      setFileLoadFailed(false)

      try {
        if (inviteToken) {
          const inviteFile = await getSignRequestInviteFile({
            accessToken: authUserStore.getState().identity?.accessToken,
            inviteToken,
            tenantId: invitePreview?.tenantId,
          })
          if (cancelled || requestId !== previewRequestIdRef.current) return
          previewBlobRef.current = null
          if (inviteFile.error || !(inviteFile.data instanceof Blob)) {
            setFileLoadFailed(true)
            replacePreviewUrl(null)
            setPreviewKind(null)
            setPreviewMimeType(null)
            return
          }

          const mimeType =
            (await resolveBlobMime(
              inviteFile.data,
              invitePreview?.fileName,
              'pdf',
            )) || 'application/pdf'
          const typedBlob = await buildTypedBlob(inviteFile.data, mimeType)
          if (cancelled || requestId !== previewRequestIdRef.current) return

          const nextUrl = URL.createObjectURL(typedBlob)
          replacePreviewUrl(nextUrl)
          setPreviewMimeType(mimeType)
          setPreviewKind(
            resolveDocumentPreviewKind(mimeType, invitePreview?.fileName),
          )
          return
        }

        const response = await fileApi.viewBinaryV6(
          repositoryId,
          id,
          'inline',
          previewRefreshKey || undefined,
        )
        if (cancelled || requestId !== previewRequestIdRef.current) return

        if (response?.data instanceof Blob) {
          const fileNameHint = data?.fileName || null
          const fileTypeHint = data?.fileType || null
          const mimeType = await resolveBlobMime(
            response.data,
            fileNameHint,
            fileTypeHint,
          )
          const typedBlob = await buildTypedBlob(
            response.data,
            mimeType || response.data.type || '',
          )
          if (cancelled || requestId !== previewRequestIdRef.current) return

          const nextUrl = URL.createObjectURL(typedBlob)
          const kind = resolveDocumentPreviewKind(
            mimeType,
            fileNameHint || fileTypeHint,
          )
          previewBlobRef.current = typedBlob
          replacePreviewUrl(nextUrl)
          setPreviewMimeType(mimeType)
          setPreviewKind(kind === 'unsupported' && !mimeType ? null : kind)
          return
        }

        previewBlobRef.current = null
        setFileLoadFailed(true)
        replacePreviewUrl(null)
        setPreviewKind(null)
        setPreviewMimeType(null)
      } catch {
        if (!cancelled && requestId === previewRequestIdRef.current) {
          previewBlobRef.current = null
          setFileLoadFailed(true)
          replacePreviewUrl(null)
          setPreviewKind(null)
          setPreviewMimeType(null)
        }
      } finally {
        if (!cancelled && requestId === previewRequestIdRef.current) {
          setIsPreviewLoading(false)
        }
      }
    }

    // Reset kind when switching documents so we don't reuse the previous type.
    setPreviewKind(null)
    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [
    repositoryId,
    id,
    inviteToken,
    invitePreview?.tenantId,
    invitePreview?.fileName,
    previewRefreshKey,
  ])

  // When detail metadata arrives later, refine MIME/kind only if still unknown.
  useEffect(() => {
    if (!previewUrl || (!data?.fileName && !data?.fileType)) return

    setPreviewMimeType((previous) =>
      resolvePreviewMimeType(previous, data?.fileName, data?.fileType),
    )
    setPreviewKind((previous) => {
      if (previous && previous !== 'unsupported') return previous
      return resolveDocumentPreviewKind(
        resolvePreviewMimeType(previewMimeType, data?.fileName, data?.fileType),
        data?.fileName || data?.fileType,
      )
    })
  }, [previewUrl, data?.fileName, data?.fileType])

  // Revoke object URL only when leaving the document view.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [])

  const saveComment = async () => {
    const value = commentText.trim()
    if (!value || savingComment) return

    setSavingComment(true)
    try {
      await folderApi.addDocumentComment(repositoryId, id, {
        body: commentText.trim(),
      })
      setCommentText('')
      setTimelineLoaded(false)
      await loadComments({ silent: true })
    } finally {
      setSavingComment(false)
    }
  }

  const isEditableDocType = useMemo(() => {
    const ext =
      getFileExtension(data?.fileName) || getFileExtension(data?.fileType)
    return Boolean(ext && ['docx', 'xlsx', 'pptx', 'pdf'].includes(ext))
  }, [data?.fileType, data?.fileName])

  const handleCollaboraClose = () => {
    setIsEditingDoc(false)
  }

  const extractMetadataFromDetail = (
    detail: WorkspaceDocumentDetail | null,
  ): Record<string, string> => {
    const metadata: Record<string, string> = {}
    if (!detail) return metadata

    if (Array.isArray(detail.DetailsRow)) {
      for (const section of detail.DetailsRow) {
        if (Array.isArray(section.fields)) {
          for (const field of section.fields) {
            const key = field?.key || field?.label
            if (
              key &&
              field?.value !== undefined &&
              field?.value !== null &&
              field?.value !== ''
            ) {
              metadata[key] = String(field.value)
            }
          }
        }
      }
    }

    if (Object.keys(metadata).length === 0 && Array.isArray(detail.infoCards)) {
      for (const card of detail.infoCards) {
        for (const row of card.rows) {
          if (row.label && row.value && row.value !== '-') {
            metadata[row.label] = row.value
          }
        }
      }
    }

    return metadata
  }

  const repositoryFieldsRef = useRef<RepositoryFieldDto[] | null>(null)

  /**
   * The upload-archive endpoint matches a new file to an existing item (and
   * versions it) by its repository field VALUES — the same mechanism the
   * working Upload flow (Upload.tsx buildUploadMetadata) uses, keyed by each
   * field's sqlColumnName, not by the display label shown in the details
   * panel. Re-key the label/value pairs we already have against the
   * repository's real field schema so the backend can actually match them.
   */
  const buildSaveMetadata = async (): Promise<Record<string, string>> => {
    const labelValues = extractMetadataFromDetail(data)

    if (!repositoryFieldsRef.current) {
      const { data: repoData } = await getRepositoryById(repositoryId)
      repositoryFieldsRef.current = repoData?.fields || []
    }

    const fields: RepositoryFieldDto[] = repositoryFieldsRef.current || []
    if (!fields.length) return labelValues

    const normalize = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, '')

    const metadata: Record<string, string> = {}
    for (const field of fields) {
      const key = field.sqlColumnName || field.name
      if (!key) continue
      const match = Object.entries(labelValues).find(
        ([label]) => normalize(label) === normalize(field.name || ''),
      )
      if (match) {
        metadata[key] = match[1]
      }
    }

    return Object.keys(metadata).length ? metadata : labelValues
  }

  const handleOpenFile = useCallback(
    (targetItemId: string, targetRepoId: string) => {
      if (targetItemId && targetItemId !== id) {
        onOpenRelatedDocument?.({
          id: targetItemId,
          repositoryId: targetRepoId,
        })
      } else {
        setDetailsRefreshKey((prev) => prev + 1)
        setPreviewRefreshKey((prev) => prev + 1)
      }
    },
    [id, onOpenRelatedDocument],
  )

  const handleCollaboraSave = async (blob: Blob) => {
    setIsEditingDoc(false)

    // Verification logging
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer())

    console.log(
      '[verify] header:',
      String.fromCharCode(...head),
      'size:',
      blob.size,
      'type:',
      blob.type,
    )

    const metadata = await buildSaveMetadata()
    const fileName = data?.fileName || 'edited_document.pdf'

    const { data: resData, error } = await persistEditedDocumentToRepository(
      repositoryId,
      id,
      blob,
      fileName,
      metadata,
    )

    if (error) {
      const detail =
        typeof error === 'string'
          ? error
          : (error as any)?.message || t`Failed to save document edits`
      showToast({
        message: t`Error updating document: ${detail}`,
        variant: 'error',
      })
    } else {
      const responsePayload = (
        Array.isArray(resData) ? resData[0] : resData?.data || resData
      ) as UploadArchiveResponse | undefined

      const savedItemId = String(responsePayload?.itemId || id).trim()
      const savedFileName = String(responsePayload?.fileName || fileName).trim()
      const savedVersion = responsePayload?.fileVersion

      showToast({
        autoClose: 10000,
        message: (
          <div className='flex flex-col gap-1.5 py-0.5 text-[13px]'>
            <span className='leading-snug text-gray-12'>
              {savedVersion !== undefined && savedVersion !== null
                ? t`${savedFileName} created as version ${savedVersion}.`
                : t`${savedFileName} updated successfully.`}
            </span>
            <button
              className='inline-flex w-fit cursor-pointer items-center gap-1 text-[12px] font-semibold text-primary-10 transition-colors hover:text-primary-11 hover:underline'
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                handleOpenFile(savedItemId, repositoryId)
              }}
            >
              <span>{t`Open file`}</span>
              <ExternalLink className='shrink-0' size={12} />
            </button>
          </div>
        ),
        variant: 'success',
      })
    }
  }

  const infoCards = useMemo(() => {
    return buildInfoCards(data, t)
  }, [data, t])

  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null)
  const [fieldFocusRequestId, setFieldFocusRequestId] = useState(0)
  const [matchedFieldValues, setMatchedFieldValues] = useState<Set<string>>(
    () => new Set(),
  )
  const infoCardsRef = useRef(infoCards)
  infoCardsRef.current = infoCards

  const fieldProbeTerms = useMemo(() => {
    const terms: string[] = []
    const seen = new Set<string>()
    for (const card of infoCards) {
      for (const row of card.rows) {
        const value = getFieldDisplayValue(row.value)
        if (!value || seen.has(value)) continue
        seen.add(value)
        terms.push(value)
      }
    }
    return terms
  }, [infoCards])

  const fieldProbeKey = fieldProbeTerms.join('\u0001')

  useEffect(() => {
    setMatchedFieldValues(new Set())
    setActiveFieldKey(null)
  }, [fieldProbeKey])

  const handleFieldMatchProbe = useCallback((matched: string[]) => {
    const matchedSet = new Set(matched)
    setMatchedFieldValues(matchedSet)

    setActiveFieldKey((previous) => {
      const cards = infoCardsRef.current
      if (previous) {
        for (const card of cards) {
          for (const row of card.rows) {
            const rowKey = `${card.id}:${row.label}`
            if (rowKey !== previous) continue
            const value = getFieldDisplayValue(row.value)
            if (value && matchedSet.has(value)) return previous
          }
        }
      }
      return null
    })
  }, [])

  const activeHighlightTerm = useMemo(() => {
    if (!activeFieldKey) return null
    for (const card of infoCards) {
      for (const row of card.rows) {
        const rowKey = `${card.id}:${row.label}`
        if (rowKey !== activeFieldKey) continue
        const value = getFieldDisplayValue(row.value)
        return value && matchedFieldValues.has(value) ? value : null
      }
    }
    return null
  }, [activeFieldKey, infoCards, matchedFieldValues])

  const activeHighlightColor = useMemo(() => {
    if (!activeFieldKey) return undefined
    return PRIMARY_HIGHLIGHT_COLOR
  }, [activeFieldKey])

  const fieldHighlightTerms = useMemo(() => {
    if (!activeHighlightTerm) return []
    return [activeHighlightTerm]
  }, [activeHighlightTerm])

  const fieldHighlightColors = useMemo(() => {
    if (!activeHighlightTerm) return {}
    const map: Record<string, string> = {
      [activeHighlightTerm]: PRIMARY_HIGHLIGHT_COLOR,
    }
    for (const variant of getFieldSearchVariantStrings(activeHighlightTerm)) {
      map[variant] = PRIMARY_HIGHLIGHT_COLOR
    }
    return map
  }, [activeHighlightTerm])

  const piiFieldNameSet = useMemo(() => {
    const selectedIds = new Set(
      folderPiiSettings.fieldIds.map((id) => String(id)),
    )
    if (!folderPiiSettings.enabled || selectedIds.size === 0) {
      return new Set<string>()
    }
    const normalize = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, '')
    return new Set(
      piiRepositoryFields
        .filter((field) => selectedIds.has(String(field.id)))
        .map((field) => normalize(field.name || ''))
        .filter(Boolean),
    )
  }, [folderPiiSettings, piiRepositoryFields])

  const piiRedactValues = useMemo(() => {
    // Folder fields not loaded yet — still redact from visible metadata / probes.
    if (piiFieldNameSet.size === 0) {
      return collectRedactValues(fieldProbeTerms)
    }
    const normalize = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, '')
    const terms: string[] = []
    const seen = new Set<string>()
    for (const card of infoCards) {
      for (const row of card.rows) {
        if (!piiFieldNameSet.has(normalize(row.label))) continue
        const value = getFieldDisplayValue(row.value)
        if (!value || seen.has(value)) continue
        seen.add(value)
        terms.push(value)
      }
    }
    const fromFields = collectRedactValues(terms)
    // If selected fields have no values yet, fall back so viewer still greys PII.
    return fromFields.length > 0
      ? fromFields
      : collectRedactValues(fieldProbeTerms)
  }, [fieldProbeTerms, infoCards, piiFieldNameSet])

  const lineItems = Array.isArray(data?.lineItems) ? data.lineItems : []
  const hasLineItems = lineItems.length > 0
  const lineItemColumns = useMemo(
    () => (lineItems[0] ? Object.keys(lineItems[0]) : []),
    [lineItems],
  )
  const hasValidFileUrl = Boolean(previewUrl) && !fileLoadFailed
  const resolvedPreviewKind =
    previewKind ||
    resolveDocumentPreviewKind(
      previewMimeType,
      data?.fileName || data?.fileType,
    )
  const isPdfPreview = resolvedPreviewKind === 'pdf'
  const isImagePreview =
    resolvedPreviewKind === 'image' || resolvedPreviewKind === 'tiff'

  const openBlobForPrint = (blobUrl: string) => {
    const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')
    if (!printWindow) return

    const triggerPrint = () => {
      try {
        printWindow.focus()
        printWindow.print()
      } catch (exception) {
        console.error(exception)
      }
    }

    if (printWindow.document.readyState === 'complete') {
      triggerPrint()
      return
    }

    printWindow.addEventListener('load', triggerPrint, { once: true })
  }

  const handleDownload = async () => {
    if (!repositoryId || !id || isDownloading || !canDownload) return

    setIsDownloading(true)
    setDownloadError('')
    try {
      // Redacted preview → burn covers into a local file (no original API blob).
      if (
        enablePiiRedaction &&
        previewUrl &&
        (isPdfPreview || isImagePreview)
      ) {
        const redacted = await buildRedactedFileBlob({
          enableNer: usePiiNer,
          fileName: data?.fileName || 'document',
          fileUrl: previewUrl,
          knownValues: piiRedactValues,
          mode: isPdfPreview ? 'pdf' : 'image',
        })
        const downloadUrl = URL.createObjectURL(redacted.blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = redacted.fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(downloadUrl)
        return
      }

      let blob: Blob | null = null

      if (inviteToken) {
        const inviteFile = await getSignRequestInviteFile({
          accessToken: authUserStore.getState().identity?.accessToken,
          disposition: 'attachment',
          inviteToken,
          tenantId: invitePreview?.tenantId,
        })
        if (inviteFile.error || !(inviteFile.data instanceof Blob)) {
          throw new Error(
            toUiErrorMessage(inviteFile.error, t`Unable to download file`),
          )
        }
        blob = inviteFile.data
      } else {
        const response = await fileApi.viewBinaryV6(
          repositoryId,
          id,
          'attachment',
        )
        if (!(response?.data instanceof Blob)) {
          throw new Error(
            toUiErrorMessage(response?.error, t`Unable to download file`),
          )
        }
        blob = response.data
      }

      if (!blob) {
        throw new Error(t`Unable to download file`)
      }

      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = data?.fileName || 'document'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (exception: any) {
      console.error(exception)
      setDownloadError(
        toUiErrorMessage(
          exception?.message || exception,
          t`Unable to download file`,
        ),
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = async () => {
    if (!previewUrl || isDownloading) return

    // Unredacted → open the original preview URL and print.
    if (!enablePiiRedaction || !(isPdfPreview || isImagePreview)) {
      openBlobForPrint(previewUrl)
      return
    }

    setIsDownloading(true)
    setDownloadError('')
    let objectUrl: string | null = null
    try {
      const redacted = await buildRedactedFileBlob({
        enableNer: usePiiNer,
        fileName: data?.fileName || 'document',
        fileUrl: previewUrl,
        knownValues: piiRedactValues,
        mode: isPdfPreview ? 'pdf' : 'image',
      })
      objectUrl = URL.createObjectURL(redacted.blob)
      openBlobForPrint(objectUrl)
      // Keep the blob alive long enough for the print dialog to load.
      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }, 60_000)
    } catch (exception: any) {
      console.error(exception)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setDownloadError(
        toUiErrorMessage(
          exception?.message || exception,
          t`Unable to print file`,
        ),
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const tabs = useMemo(
    () =>
      [
        {
          count: timeline.length,
          icon: 'clock',
          key: 'timeline',
          label: t`Timeline`,
        },
        {
          count: commentsTotal || comments.length,
          icon: 'messageSquare',
          key: 'comments',
          label: t`Comments`,
        },
        {
          count: relatedDocsTotal || relatedDocs.length,
          icon: 'paperclip',
          key: 'relatedDocs',
          label: t`Related Docs`,
        },
      ] as const,
    [
      comments.length,
      commentsTotal,
      relatedDocs.length,
      relatedDocsTotal,
      t,
      timeline.length,
    ],
  )

  if (loading)
    return (
      <SkeletonDocumentDetails
        showMetadata={!forceSigning}
        showTabs={!forceSigning}
      />
    )

  if (error) {
    return (
      <div className='p-6'>
        {onBack ? (
          <Button
            className='mb-4 h-8 border-transparent px-3 text-[13px] shadow-none'
            onClick={onBack}
          >
            <ArrowLeft size={12} /> {t`Back`}
          </Button>
        ) : null}
        <div className='rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10'>
          {isMissingDocumentError(error)
            ? fileName.trim()
              ? t`${fileName.trim()} was deleted. Kindly try a new file.`
              : t`This file was deleted. Kindly try a new file.`
            : error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className='animate-in fade-in relative flex h-full min-h-0 flex-1 flex-col bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      {isEditingDoc && previewBlobRef.current ? (
        <div className='absolute inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-surface-secondary'>
          <CollaboraEditor
            fileBlob={previewBlobRef.current}
            fileName={data.fileName}
            fileType={
              getFileExtension(data.fileName) || getFileExtension(data.fileType)
            }
            onClose={handleCollaboraClose}
            onSave={handleCollaboraSave}
          />
        </div>
      ) : null}
      {previewUrl &&
      (isPdfPreview || isImagePreview) &&
      (isSigning || assignedFields.length > 0) ? (
        <DocumentSigningPage
          actionRef={signingActionRef}
          documentName={data.fileName}
          documentUrl={previewUrl}
          externalSurfaceRef={documentSurfaceRef}
          isImage={isImagePreview}
          isLoading={isPreviewLoading}
          isPdf={isPdfPreview}
          itemId={id}
          mode='inline'
          openPickerKey={signPickerKey}
          overlayOnly={!isSigning && assignedFields.length > 0}
          pickerAnchorRef={signTriggerRef}
          repositoryId={repositoryId}
          savedSignatures={savedSignatures}
          signatureFields={assignedFields}
          signerEmail={currentUserEmail}
          signerName={signerName}
          signRequestId={activeSignRequestId}
          restrictToFields={
            (Boolean(forceSigning) || restrictToFields) &&
            assignedFields.length > 0
          }
          onBack={() => {
            // Closing the signing UI is never a completed signature, so the
            // invite flow must stay on the document instead of reporting done.
            setIsSigning(false)
          }}
          onCompleteSigning={async (placements) => {
            if (!placements.length) {
              throw new Error('Place at least one signature before submitting.')
            }
            if (!repositoryId || !id) {
              throw new Error('Document context is missing.')
            }

            const finishSigningSuccess = () => {
              // Close the floating sign footer and drop placement overlays so
              // the refreshed PDF (with the burned-in signature) is what shows.
              setIsSigning(false)
              setRestrictToFields(false)
              setAssignedFields([])
              setActiveSignRequestId('')
              setPreviewRefreshKey((value) => value + 1)
              setTimelineLoaded(false)
              onSigningComplete?.()
            }

            // Assigned-field signing against an existing request / invite
            // Sign APIs only — never inviteToShare / share.
            if (activeSignRequestId || activeInviteToken) {
              for (const placement of placements) {
                if (activeInviteToken) {
                  const submitted = await submitInviteSignRequest({
                    accessToken: authUserStore.getState().identity?.accessToken,
                    inviteToken: activeInviteToken,
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
                  if (submitted.error) {
                    throw new Error(
                      toUiErrorMessage(
                        submitted.error,
                        'Unable to submit signature. Please try again.',
                      ),
                    )
                  }
                } else {
                  const submitted = await submitSignRequest({
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
                    signRequestId: activeSignRequestId,
                  })
                  if (submitted.error) {
                    throw new Error(
                      toUiErrorMessage(
                        submitted.error,
                        'Unable to submit signature. Please try again.',
                      ),
                    )
                  }
                }
              }
              showToast({
                message: t`Signature submitted successfully.`,
                variant: 'success',
              })
              finishSigningSuccess()
              return
            }

            // Current-user Sign Save:
            // - If a pending request already exists → submit only (`/sign`)
            // - If none (owner free-sign) → create + submit so the file is stamped
            // Share → Sign invites still own the create call for other people.
            let requestId = String(activeSignRequestId || '').trim()
            if (!requestId && currentUserEmail) {
              const itemRequests = await listItemSignRequests({
                itemId: id,
                repositoryId,
              })
              const pending = (itemRequests.data || []).find((request) => {
                const status = String(request.status || '').toUpperCase()
                if (
                  status === 'CANCELLED' ||
                  status === 'COMPLETED' ||
                  status === 'DECLINED'
                ) {
                  return false
                }
                return (request.signers || []).some((signer) => {
                  const email = String(signer.email || '')
                    .trim()
                    .toLowerCase()
                  if (email !== currentUserEmail) return false
                  const signerStatus = String(signer.status || '').toUpperCase()
                  return (
                    !signerStatus.includes('SIGNED') &&
                    !signerStatus.includes('DECLINE') &&
                    !signerStatus.includes('CANCEL')
                  )
                })
              })
              requestId = String(pending?.signRequestId || '').trim()
              if (requestId) setActiveSignRequestId(requestId)
            }

            if (!requestId) {
              if (!currentUserEmail) {
                throw new Error('Signer email is required to submit signature.')
              }
              const created = await createSignRequest({
                itemId: id,
                message: 'Please sign this document',
                repositoryId,
                signers: [
                  {
                    email: currentUserEmail,
                    name: signerName || currentUserEmail,
                    order: 1,
                  },
                ],
                signingMode: 'single',
              })
              if (created.error || !created.data?.signRequestId) {
                throw new Error(
                  String(created.error || 'Unable to create sign request'),
                )
              }
              requestId = created.data.signRequestId
              setActiveSignRequestId(requestId)
            }

            for (const placement of placements) {
              const submitted = await submitSignRequest({
                signature: {
                  height: placement.height,
                  pageNumber: placement.pageNumber,
                  signatureImageBase64: placement.imageDataUrl,
                  signedAtClientUtc: new Date().toISOString(),
                  width: placement.width,
                  x: placement.x,
                  y: placement.y,
                },
                signRequestId: requestId,
              })
              if (submitted.error) {
                throw new Error(
                  toUiErrorMessage(
                    submitted.error,
                    'Unable to submit signature. Please try again.',
                  ),
                )
              }
            }

            showToast({
              message: t`Signature submitted successfully.`,
              variant: 'success',
            })
            finishSigningSuccess()
          }}
          onDeleteSavedSignature={(signatureId) => {
            setSavedSignatures((prev) =>
              prev.filter((item) => item.id !== signatureId),
            )
            showToast({
              message: t`Saved signature removed.`,
              variant: 'success',
            })
          }}
          onSaveSignature={(signature) => {
            const next: SavedSignature = {
              ...signature,
              id: `local-${Date.now()}`,
            }
            setSavedSignatures((prev) => [next, ...prev])
            showToast({
              message: t`Signature saved for reuse.`,
              variant: 'success',
            })
          }}
          onSignRequestCreated={(payload) => {
            if (payload?.signRequestId && payload.fields?.length) {
              setActiveSignRequestId(payload.signRequestId)
              setAssignedFields(payload.fields)
              setRestrictToFields(true)
              saveSignRequestFields({
                fields: payload.fields,
                itemId: id,
                repositoryId,
                signRequestId: payload.signRequestId,
              })
            }
            showToast({
              message: t`Sign request sent. Assigned places stay visible on the document.`,
              variant: 'success',
            })
            // Close the signing toolbar but keep field overlays on the PDF.
            setIsSigning(false)
          }}
          onStateChange={setSigningState}
        />
      ) : null}

      <div className='no-print relative z-30 flex h-[60px] shrink-0 items-center justify-between gap-2 overflow-visible border-b border-gray-3 bg-surface-primary px-3 sm:px-5'>
        <div className='mr-2 flex min-w-0 flex-1 items-center gap-2 sm:mr-4 sm:gap-3'>
          {forceSigning || !onBack ? (
            <div className='h-8 w-[72px] shrink-0' aria-hidden />
          ) : (
            <Button
              className='h-8 shrink-0 border-transparent px-2.5 text-[13px] shadow-none sm:px-3'
              onClick={onBack}
            >
              <ArrowLeft size={12} /> {t`Back`}
            </Button>
          )}

          {data?.fileName && (
            <Tooltip
              className='max-w-full min-w-0'
              content={data.fileName}
              position='bottom'
              width={240}
            >
              <div className='flex max-w-full min-w-0 items-center gap-2 select-none'>
                <Icon
                  className='size-5 shrink-0 text-gray-10'
                  name={getFileIcon(data.fileName)}
                />
                <span className='xs:max-w-[200px] max-w-[140px] min-w-0 truncate text-[14px] font-semibold text-gray-12 sm:max-w-[280px] md:max-w-[360px] lg:max-w-[440px]'>
                  {data.fileName}
                </span>
              </div>
            </Tooltip>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-1 sm:gap-1.5'>
          {!compactActions ? (
            <>
              {canToggleUnredacted ? (
                showUnredactedPreview ? (
                  <Tooltip content={t`Show redacted file`} position='bottom'>
                    <button
                      aria-label={t`Show redacted file`}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95'
                      type='button'
                      onClick={() => {
                        setShowUnredactedPreview(false)
                        setPiiPasswordInput('')
                        setPiiPasswordError('')
                      }}
                    >
                      <DynamicIcon className='h-4 w-4' name='eyeOff' />
                    </button>
                  </Tooltip>
                ) : (
                  <Menu
                    closeOnItemClick={false}
                    opened={piiPasswordMenuOpen}
                    position='bottom-end'
                    width={280}
                    closeOnClickOutside
                    withinPortal
                    target={
                      <Tooltip
                        content={t`Show original file`}
                        position='bottom'
                      >
                        <button
                          aria-label={t`Show original file`}
                          className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95'
                          type='button'
                        >
                          <DynamicIcon className='h-4 w-4' name='eye' />
                        </button>
                      </Tooltip>
                    }
                    onChange={(opened) => {
                      setPiiPasswordMenuOpen(opened)
                      if (!opened) {
                        setPiiPasswordInput('')
                        setPiiPasswordError('')
                      }
                    }}
                  >
                    <div
                      className='flex flex-col gap-2.5 p-2.5'
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <div className='text-13 font-semibold text-gray-12'>
                        {t`Enter password`}
                      </div>
                      <p className='text-12 text-gray-11'>
                        {t`Enter your PII access password to view the original file.`}
                      </p>
                      <InputText
                        autoComplete='current-password'
                        error={piiPasswordError || undefined}
                        placeholder={t`Password`}
                        type='password'
                        value={piiPasswordInput}
                        autoFocus
                        onChange={(value) => {
                          setPiiPasswordInput(value)
                          if (piiPasswordError) setPiiPasswordError('')
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') return
                          event.preventDefault()
                          if (
                            verifyFolderPiiPassword(
                              folderPiiSettings,
                              currentUserId,
                              piiPasswordInput,
                            )
                          ) {
                            setShowUnredactedPreview(true)
                            setPiiPasswordMenuOpen(false)
                            setPiiPasswordInput('')
                            setPiiPasswordError('')
                          } else {
                            setPiiPasswordError(t`Incorrect password`)
                          }
                        }}
                      />
                      <Buttons
                        className='w-full'
                        label={t`Reveal original`}
                        size='sm'
                        type='button'
                        onClick={() => {
                          if (
                            verifyFolderPiiPassword(
                              folderPiiSettings,
                              currentUserId,
                              piiPasswordInput,
                            )
                          ) {
                            setShowUnredactedPreview(true)
                            setPiiPasswordMenuOpen(false)
                            setPiiPasswordInput('')
                            setPiiPasswordError('')
                          } else {
                            setPiiPasswordError(t`Incorrect password`)
                          }
                        }}
                      />
                    </div>
                  </Menu>
                )
              ) : null}

              {isEditableDocType && canEditDocument ? (
                <Tooltip content={t`Edit file`} position='bottom'>
                  <button
                    aria-label={t`Edit file`}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                    type='button'
                    disabled={
                      !previewBlobRef.current || isPreviewLoading || isSigning
                    }
                    onClick={() => setIsEditingDoc(true)}
                  >
                    <DynamicIcon className='h-4 w-4' name='edit' />
                  </button>
                </Tooltip>
              ) : null}

              {canPrint ? (
                <Tooltip
                  position='bottom'
                  content={
                    isDownloading && enablePiiRedaction
                      ? t`Preparing redacted file...`
                      : t`Print file`
                  }
                >
                  <button
                    aria-label={t`Print file`}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={!previewUrl || isPreviewLoading || isDownloading}
                    type='button'
                    onClick={() => void handlePrint()}
                  >
                    <DynamicIcon className='h-4 w-4' name='printer' />
                  </button>
                </Tooltip>
              ) : null}

              {canDownload ? (
                <Tooltip
                  content={isDownloading ? t`Downloading...` : t`Download file`}
                  position='bottom'
                >
                  <button
                    aria-label={t`Download file`}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={isDownloading || isPreviewLoading}
                    type='button'
                    onClick={handleDownload}
                  >
                    <DynamicIcon className='h-4 w-4' name='download' />
                  </button>
                </Tooltip>
              ) : null}

              {onWorkflow ? (
                <button
                  aria-label={t`Start Workflow`}
                  className='inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-surface px-2.5 text-[13px] font-semibold text-gray-11 transition-all hover:border-gray-5 hover:bg-gray-2 hover:text-gray-13 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5'
                  type='button'
                  onClick={() => onWorkflow?.()}
                >
                  <DynamicIcon className='h-4 w-4 text-blue-9' name='play' />
                  <span className='hidden sm:inline'>{t`Start Workflow`}</span>
                </button>
              ) : null}
              <button
                aria-label={t`AI Summary`}
                className='inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-surface px-2.5 text-[13px] font-semibold text-gray-11 transition-all hover:border-gray-5 hover:bg-gray-2 hover:text-gray-13 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5'
                disabled={!onAiSummary}
                type='button'
                onClick={() => onAiSummary?.()}
              >
                <DynamicIcon className='h-4 w-4 text-violet-9' name='bot' />
                <span className='hidden sm:inline'>{t`AI Summary`}</span>
              </button>
              {canSendForSignature ? (
                <button
                  aria-label={t`Sign Document`}
                  disabled={isPreviewLoading}
                  type='button'
                  className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-all hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5 ${
                    isSigning
                      ? 'border-accent-primary bg-accent-soft text-accent-primary'
                      : 'border-gray-3 bg-surface text-gray-11 hover:border-gray-5 hover:bg-gray-2 hover:text-gray-13'
                  }`}
                  onClick={() => setIsSigning((prev) => !prev)}
                >
                  <DynamicIcon
                    className='h-4 w-4 text-accent-primary'
                    name='pen-tool'
                  />
                  <span className='hidden sm:inline'>
                    {isSigning ? t`Exit Signing` : t`Sign Document`}
                  </span>
                </button>
              ) : null}
              <div>
                <FolderSharePopover
                  allowSign={canSendForSignature}
                  className='shrink-0'
                  defaultOpen={autoOpenShare}
                  sharedIds={sharedEmails}
                  sharedRoles={sharedRoles}
                  successMessage={t`Invite sent`}
                  title={t`Share`}
                  onOpenChange={(open) => {
                    if (open && autoOpenShare) onShareOpened?.()
                  }}
                  onShare={async (shares, message, meta) => {
                    if (!id || !repositoryId) {
                      showToast({
                        message: t`Missing file context for share`,
                        variant: 'error',
                      })
                      return false
                    }
                    try {
                      const viewShares = shares.filter(
                        (share) =>
                          share.permission !== 'Sign' && share.action !== 2,
                      )
                      const signShares = canSendForSignature
                        ? shares.filter(
                            (share) =>
                              share.permission === 'Sign' || share.action === 2,
                          )
                        : []

                      if (
                        !canSendForSignature &&
                        shares.some(
                          (share) =>
                            share.permission === 'Sign' || share.action === 2,
                        )
                      ) {
                        showToast({
                          message: t`You do not have permission to send for signature.`,
                          variant: 'error',
                        })
                        return false
                      }

                      // View → share API only
                      for (const share of viewShares) {
                        await folderApi.inviteToShare({
                          email: share.email,
                          itemId: id,
                          message:
                            message ||
                            (data?.fileName
                              ? t`Please review this file: ${data.fileName}`
                              : t`Please review this file`),
                          permission: 'Can View',
                          repositoryId,
                        })
                      }

                      // Sign → sign API only (no share invite)
                      if (signShares.length) {
                        const created = await createSignRequest({
                          itemId: id,
                          message:
                            message ||
                            t`Please sign this document. You can place your signature anywhere.`,
                          repositoryId,
                          signers: signShares.map((share, index) => ({
                            email: share.email.trim(),
                            name:
                              share.email.split('@')[0] || share.email.trim(),
                            order: index + 1,
                          })),
                          signingMode:
                            meta?.signingMode ||
                            (signShares.length === 1 ? 'single' : 'multiple'),
                        })
                        if (created.error || !created.data?.signRequestId) {
                          throw new Error(
                            String(
                              created.error || 'Unable to create sign request',
                            ),
                          )
                        }
                      }

                      setSharedEmails((prev) => {
                        const next = new Set(prev)
                        shares.forEach((share) =>
                          next.add(share.email.trim().toLowerCase()),
                        )
                        return [...next]
                      })
                      setSharedRoles((prev) => {
                        const next = { ...prev }
                        shares.forEach((share) => {
                          const email = share.email.trim().toLowerCase()
                          next[email] =
                            share.permission === 'Sign' || share.action === 2
                              ? 'Sign'
                              : 'View'
                        })
                        return next
                      })
                      return true
                    } catch (error) {
                      showToast({
                        message:
                          error instanceof Error
                            ? error.message
                            : t`Failed to invite`,
                        variant: 'error',
                      })
                      return false
                    }
                  }}
                />
              </div>
            </>
          ) : null}
          {canSign ? (
            <button
              aria-expanded={isSigning}
              aria-label={t`My Sign`}
              disabled={!previewUrl || isPreviewLoading}
              ref={signTriggerRef}
              type='button'
              className={`inline-flex h-8 items-center justify-center gap-2 rounded-lg border px-3.5 text-[13px] font-semibold transition-all hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSigning
                  ? 'border-primary-6 bg-primary-1 text-primary-9'
                  : 'border-gray-3 bg-surface text-gray-11 hover:border-gray-5 hover:bg-gray-2 hover:text-gray-13'
              }`}
              onClick={() => {
                // Only lock to assigned places when *this* user has a pending field.
                const hasMyAssignedPlace =
                  Boolean(currentUserEmail) &&
                  assignedFields.some((field) => {
                    const email = String(field.signerEmail || '')
                      .trim()
                      .toLowerCase()
                    return email === currentUserEmail
                  })
                setRestrictToFields(
                  Boolean(hasMyAssignedPlace && activeSignRequestId),
                )
                setSignPickerKey((value) => value + 1)
                setIsSigning(true)
              }}
            >
              <PenLine
                className={`h-4 w-4 ${isSigning ? 'text-primary-9' : 'text-violet-9'}`}
              />
              <span>{t`My Sign`}</span>
            </button>
          ) : null}
          {isSigning && (signingState.hasPlacements || signingState.canSave) ? (
            <button
              aria-label={t`Save`}
              className='inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary-9 px-3.5 text-[13px] font-semibold text-white transition-all hover:bg-primary-10 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
              type='button'
              disabled={
                !signingState.canSave ||
                signingState.isSaving ||
                isPreviewLoading
              }
              onClick={() => {
                void signingActionRef.current?.save()
              }}
            >
              {signingState.isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <CheckCircle2 className='h-4 w-4' />
              )}
              <span>
                {signingState.isSaving
                  ? t`Saving...`
                  : signingState.workspaceMode === 'assign'
                    ? t`Send`
                    : t`Save`}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden p-3 sm:p-5'>
        <div
          className={`grid h-full gap-4 sm:gap-5 ${
            forceSigning && infoCards.length === 0
              ? 'grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_400px]'
          }`}
        >
          <main className='ez-detail-scroll min-w-0 space-y-4 overflow-y-auto pr-2 pb-6'>
            {data.alert ? (
              <div className='flex items-center justify-between rounded-xl border border-orange-5 bg-orange-2 px-4 py-3'>
                <div className='flex items-start gap-3'>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-3'>
                    <DynamicIcon
                      className='h-4 w-4 text-orange-10'
                      name='clock'
                    />
                  </div>
                  <div>
                    <b className='text-[14px] font-semibold text-orange-11'>
                      {data.alert.title}
                    </b>
                    <p className='mt-0.5 text-[12px] text-orange-10'>
                      {data.alert.subtitle}
                    </p>
                  </div>
                </div>
                <div className='inline-flex h-7 min-w-[38px] items-center justify-center rounded-full bg-orange-9 px-3 text-[11px] font-bold text-white shadow-sm'>
                  {data.alert.badge}
                </div>
              </div>
            ) : null}

            <Card className='overflow-hidden p-0'>
              {downloadError ? (
                <div className='border-b border-red-4 bg-red-1 px-5 py-2 text-[12px] font-medium text-red-10'>
                  {downloadError}
                </div>
              ) : null}

              <div
                className={`ez-detail-scroll overflow-hidden bg-gray-1 ${
                  isSigning || assignedFields.length > 0
                    ? 'h-[min(72vh,820px)]'
                    : 'h-[560px]'
                }`}
              >
                {hasValidFileUrl || isPreviewLoading ? (
                  <div
                    className='relative h-full min-h-full w-full'
                    ref={documentSurfaceRef}
                  >
                    <DocumentPreviewViewer
                      activeHighlightColor={activeHighlightColor}
                      activeHighlightTerm={activeHighlightTerm}
                      className='h-full min-h-full'
                      enablePiiNer={usePiiNer}
                      enablePiiRedaction={enablePiiRedaction}
                      fileBlob={previewBlobRef.current}
                      fileName={data.fileName}
                      fileUrl={previewUrl}
                      focusRequestId={fieldFocusRequestId}
                      highlightColors={fieldHighlightColors}
                      highlightTerms={fieldHighlightTerms}
                      isImage={isImagePreview}
                      isLoading={isPreviewLoading}
                      isPdf={isPdfPreview}
                      isSigningMode={isSigning}
                      key={`pii-${enablePiiRedaction ? 'on' : 'off'}`}
                      permission={isEditingDoc ? 'edit' : 'readonly'}
                      probeTerms={fieldProbeTerms}
                      redactValues={piiRedactValues}
                      signerEmail={currentUserEmail}
                      signerName={signerName}
                      signRequestId={activeSignRequestId}
                      enableHighlight={
                        isPdfPreview && fieldHighlightTerms.length > 0
                      }
                      permissions={
                        permissions
                          ? {
                              ...permissions,
                              sendForSignature: canSendForSignature,
                            }
                          : { sendForSignature: canSendForSignature }
                      }
                      signatureFields={(assignedFields || []).map((f, i) => ({
                        height: f.height || 70,
                        id: f.fieldId || `field-${i}`,
                        page: f.pageNumber || 1,
                        signerName:
                          f.signerName ||
                          f.signerEmail ||
                          signerName ||
                          'Signer',
                        width: f.width || 200,
                        x: f.x || 100,
                        y: f.y || 150,
                      }))}
                      onCompleteSigning={async (placements) => {
                        if (!repositoryId || !id) {
                          throw new Error('Document context is missing.')
                        }
                        let requestId = String(activeSignRequestId || '').trim()
                        if (!requestId && currentUserEmail) {
                          const created = await createSignRequest({
                            itemId: id,
                            message: 'Please sign this document',
                            repositoryId,
                            signers: [
                              {
                                email: currentUserEmail,
                                name: signerName || currentUserEmail,
                                order: 1,
                              },
                            ],
                            signingMode: 'single',
                          })
                          if (created.data?.signRequestId) {
                            requestId = created.data.signRequestId
                            setActiveSignRequestId(requestId)
                          }
                        }
                        if (requestId) {
                          for (const placement of placements) {
                            await submitSignRequest({
                              signature: {
                                height: placement.height,
                                pageNumber: placement.page,
                                signatureImageBase64:
                                  placement.signatureData || '',
                                signedAtClientUtc: new Date().toISOString(),
                                width: placement.width,
                                x: placement.x,
                                y: placement.y,
                              },
                              signRequestId: requestId,
                            })
                          }
                        }
                        showToast({
                          message: t`Signature submitted successfully.`,
                          variant: 'success',
                        })
                        setIsSigning(false)
                        setPreviewRefreshKey((v) => v + 1)
                        onSigningComplete?.()
                      }}
                      onProbeComplete={handleFieldMatchProbe}
                    />
                  </div>
                ) : (
                  <DummyDocumentPreview
                    fileName={data.fileName}
                    fileType={data.fileType}
                  />
                )}
              </div>
            </Card>

            {hasLineItems ? (
              <Card className='overflow-hidden p-0'>
                <div className='border-b border-gray-3 px-5 py-4'>
                  <h3 className='text-[15px] font-semibold text-gray-13'>
                    {t`Invoice Line Items`}
                  </h3>
                </div>
                <div className='ez-scrollbar max-h-[min(42vh,360px)] overflow-auto overscroll-contain'>
                  <table className='w-max min-w-full border-separate border-spacing-0 text-[13px]'>
                    <thead>
                      <tr className='text-left text-gray-10'>
                        {lineItemColumns.map((key, index) => (
                          <th
                            key={key}
                            className={`sticky top-0 z-30 border-b border-gray-3 px-3 py-3 text-left text-[12px] font-semibold tracking-wide whitespace-nowrap text-gray-10 ${lineItemStickyClass(index, 'th')} ${
                              index < 2 ? 'z-40' : ''
                            }`}
                          >
                            {formatLineItemHeader(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((row, rowIndex) => (
                        <tr className='group text-gray-13' key={rowIndex}>
                          {lineItemColumns.map((key, index) => (
                            <td
                              className={`border-b border-gray-3 px-3 py-3 font-medium whitespace-nowrap group-last:border-b-0 ${lineItemStickyClass(index, 'td')}`}
                              key={`${rowIndex}-${key}`}
                            >
                              <span className='block truncate'>
                                {toDisplayValue(row?.[key])}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : null}

            {!forceSigning ? (
              <>
                <div className='flex w-fit gap-1 rounded-xl bg-gray-2 p-1'>
                  {tabs.map((item) => (
                    <button
                      className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-all active:scale-95 ${tab === item.key ? 'bg-surface-primary text-gray-13 shadow-sm ring-1 ring-gray-3' : 'text-gray-10 hover:bg-gray-4 hover:text-gray-12'}`}
                      key={item.key}
                      type='button'
                      onClick={() => {
                        setTab(item.key)
                        if (item.key === 'comments') {
                          void loadComments({ silent: false })
                        }
                        if (item.key === 'relatedDocs') {
                          void loadRelatedDocs({ silent: false })
                        }
                      }}
                    >
                      <DynamicIcon className='h-4 w-4' name={item.icon} />
                      {item.label} {item.count ? `(${item.count})` : ''}
                    </button>
                  ))}
                </div>

                <Card className='flex max-h-[min(52vh,480px)] min-h-[320px] flex-col overflow-hidden p-0'>
                  {tab === 'timeline' ? (
                    <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-5'>
                      {timelineLoading ? (
                        <div className='py-10 text-center text-[13px] font-semibold text-gray-10'>
                          {t`Loading timeline...`}
                        </div>
                      ) : timeline.length ? (
                        <div className='space-y-0'>
                          {timeline.map((item, index) => {
                            const isLast = index === timeline.length - 1
                            const prevItem =
                              index > 0 ? timeline[index - 1] : null
                            const isSameDate =
                              prevItem &&
                              formatDateOnly(item.createdAtUtc) ===
                                formatDateOnly(prevItem.createdAtUtc)
                            const displayTime = isSameDate
                              ? formatTimeOnly(item.createdAtUtc)
                              : formatDateTime(item.createdAtUtc)
                            const isCommentEvent =
                              String(item.eventType || '')
                                .trim()
                                .toLowerCase() === 'comment' ||
                              String(item.title || '')
                                .trim()
                                .toLowerCase()
                                .includes('comment')

                            return (
                              <div
                                className='relative flex gap-3'
                                key={`${item.id || item.title}-${index}`}
                              >
                                {/* Icon + vertical line column */}
                                <div className='flex flex-col items-center'>
                                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-3 text-blue-11'>
                                    <DynamicIcon
                                      className='h-4 w-4'
                                      name={
                                        eventIconMap[item.eventType || ''] ||
                                        'clock'
                                      }
                                    />
                                  </span>
                                  {!isLast && (
                                    <div className='w-px flex-1 bg-gray-5' />
                                  )}
                                </div>

                                {/* Content */}
                                <div className='min-w-0 pb-5'>
                                  <p className='text-[13px] text-gray-11'>
                                    <b className='font-semibold text-gray-12'>
                                      {item.title}
                                    </b>
                                    {item.description ? (
                                      isCommentEvent ? (
                                        <span>
                                          {': '}
                                          <span className='font-normal italic text-primary-11'>
                                            &ldquo;{item.description}&rdquo;
                                          </span>
                                        </span>
                                      ) : (
                                        <span className='text-gray-10'>
                                          {': '}
                                          {item.description}
                                        </span>
                                      )
                                    ) : null}
                                  </p>
                                  <p className='mt-0.5 text-[12px] text-gray-9'>
                                    {[
                                      item.actorName || item.actorType,
                                      displayTime,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <NoDataState
                          description={t`No activity timeline is available for this document.`}
                          icon='clock'
                          title={t`No timeline found`}
                        />
                      )}
                    </div>
                  ) : null}

                  {tab === 'comments' ? (
                    <div className='flex min-h-0 flex-1 flex-col'>
                      <div
                        className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-5'
                        ref={commentsContainerRef}
                        onScroll={handleCommentsScroll}
                      >
                        {commentsLoadingMore ? (
                          <div className='py-4 text-center text-[12px] font-semibold text-gray-10'>
                            {t`Loading older comments...`}
                          </div>
                        ) : null}
                        {commentsLoading && comments.length === 0 ? (
                          <div className='py-10 text-center text-[13px] font-semibold text-gray-10'>
                            {t`Loading comments...`}
                          </div>
                        ) : (
                          <>
                            {commentsLoading && comments.length > 0 ? (
                              <div className='py-2 text-center text-[12px] font-semibold text-gray-10'>
                                {t`Loading comments...`}
                              </div>
                            ) : null}
                            {comments.length ? (
                              <div className='flex flex-col gap-2'>
                                {(() => {
                                  let lastDateHeader = ''
                                  return comments.map((item, index) => {
                                    const author =
                                      item.authorName ||
                                      item.author ||
                                      item.actorName ||
                                      t`User`
                                    const message =
                                      item.body ||
                                      item.message ||
                                      item.comment ||
                                      item.text ||
                                      ''
                                    const isMine =
                                      item.authorEmail === currentUserEmail ||
                                      item.authorName === currentUserEmail ||
                                      item.authorUserId === currentUserEmail

                                    let dateHeader = ''
                                    const dateStr =
                                      item.createdAtUtc || item.date
                                    let messageTime = ''

                                    if (dateStr) {
                                      const d = new Date(
                                        dateStr.endsWith('Z')
                                          ? dateStr
                                          : dateStr + 'Z',
                                      )
                                      if (!isNaN(d.getTime())) {
                                        messageTime = d.toLocaleTimeString(
                                          undefined,
                                          {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                          },
                                        )

                                        const today = new Date()
                                        const yesterday = new Date(today)
                                        yesterday.setDate(
                                          yesterday.getDate() - 1,
                                        )

                                        const isSameDay = (
                                          d1: Date,
                                          d2: Date,
                                        ) =>
                                          d1.getFullYear() ===
                                            d2.getFullYear() &&
                                          d1.getMonth() === d2.getMonth() &&
                                          d1.getDate() === d2.getDate()

                                        if (isSameDay(d, today))
                                          dateHeader = t`Today`
                                        else if (isSameDay(d, yesterday))
                                          dateHeader = t`Yesterday`
                                        else {
                                          const diffTime = Math.abs(
                                            today.getTime() - d.getTime(),
                                          )
                                          const diffDays = Math.ceil(
                                            diffTime / (1000 * 60 * 60 * 24),
                                          )
                                          if (diffDays <= 7) {
                                            dateHeader = d.toLocaleDateString(
                                              undefined,
                                              { weekday: 'long' },
                                            )
                                          } else {
                                            dateHeader = d.toLocaleDateString(
                                              undefined,
                                              {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                              },
                                            )
                                          }
                                        }
                                      }
                                    }

                                    const showDateHeader =
                                      dateHeader &&
                                      dateHeader !== lastDateHeader
                                    if (showDateHeader) {
                                      lastDateHeader = dateHeader
                                    }

                                    return (
                                      <div
                                        key={`${item.id || author}-${index}`}
                                      >
                                        {showDateHeader && (
                                          <div className='my-4 flex justify-center'>
                                            <span className='px-3 py-1 text-[12px] font-medium text-gray-10'>
                                              {dateHeader}
                                            </span>
                                          </div>
                                        )}
                                        <div
                                          className={`mb-1.5 flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                                        >
                                          {!isMine && (
                                            <div className='flex flex-col justify-end pb-1'>
                                              <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[12px] font-semibold text-blue-11'>
                                                {author.charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                          )}

                                          <div
                                            className={`relative flex max-w-[75%] min-w-[100px] flex-col px-3 py-2 shadow-sm ${
                                              isMine
                                                ? 'rounded-2xl rounded-br-none border border-gray-3 bg-surface-primary text-gray-13'
                                                : 'rounded-2xl rounded-bl-none bg-gray-3 text-gray-13'
                                            }`}
                                          >
                                            <p className='pb-1 text-[13px] leading-5 break-words whitespace-pre-wrap'>
                                              {message}
                                            </p>

                                            <div
                                              className={`mt-0.5 flex items-end gap-2 ${!isMine ? 'justify-between' : 'justify-end'}`}
                                            >
                                              {!isMine && (
                                                <span
                                                  className='max-w-[120px] truncate text-[10px] text-gray-9'
                                                  title={author}
                                                >
                                                  {author}
                                                </span>
                                              )}

                                              <span className='shrink-0 text-[10px] text-gray-9'>
                                                {messageTime}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })
                                })()}
                                <div ref={commentsEndRef} />
                              </div>
                            ) : (
                              <NoDataState
                                description={t`No comments are available for this document. Add the first comment to start collaboration.`}
                                icon='messageSquare'
                                title={t`No comments found`}
                              />
                            )}
                          </>
                        )}
                      </div>

                      <div className='shrink-0 border-t border-[var(--gray-3)] bg-surface p-4'>
                        <div className='flex items-center gap-3'>
                          <textarea
                            className='h-12 flex-1 resize-none rounded-xl border border-[var(--gray-4)] bg-surface px-4 py-3 text-[13px] font-medium text-[var(--gray-13)] transition-all outline-none placeholder:text-[var(--gray-8)] focus:border-[var(--primary-6)] focus:ring-1 focus:ring-[var(--primary-4)]'
                            placeholder={t`Add a comment...`}
                            rows={1}
                            value={commentText}
                            onChange={(event) =>
                              setCommentText(event.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                saveComment()
                              }
                            }}
                          />

                          <Buttons
                            className='px-3 py-3'
                            color='primary'
                            icon='lucide:send'
                            size='sm'
                            variant='solid'
                            onClick={saveComment}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === 'relatedDocs' ? (
                    <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-5'>
                      <RelatedDocumentsFinder
                        documentId={id}
                        metadata={data}
                        repositoryId={repositoryId}
                        supplierName={data?.fileName}
                        attachedIds={
                          new Set(relatedDocs.map((d) => String(d.id)))
                        }
                        onLinkDocument={async (hit) => {
                          const sourceRepositoryId = String(
                            repositoryId || '',
                          ).trim()
                          const sourceItemId = String(id || '').trim()
                          const linkedRepositoryId = String(
                            hit.id?.repositoryId || repositoryId || '',
                          ).trim()
                          const linkedItemId = String(
                            hit.id?.itemId || '',
                          ).trim()
                          if (
                            !sourceRepositoryId ||
                            !sourceItemId ||
                            !linkedRepositoryId ||
                            !linkedItemId
                          ) {
                            throw new Error(
                              t`This result cannot be added to related documents.`,
                            )
                          }

                          const saved = await folderApi.saveRelatedDocuments(
                            sourceRepositoryId,
                            sourceItemId,
                            [
                              {
                                fileName: getSearchHitTitle(hit),
                                itemId: linkedItemId,
                                matchScore: (() => {
                                  const pct = (hit as { pct?: number }).pct
                                  return typeof pct === 'number' ? pct : 0
                                })(),
                                repositoryId: linkedRepositoryId,
                                repositoryName:
                                  hit.name && hit.name !== 'Main Repository'
                                    ? hit.name
                                    : '',
                              },
                            ],
                          )

                          if (
                            Array.isArray(saved.data) &&
                            saved.data.length > 0
                          ) {
                            applyRelatedDocs(saved)
                            return
                          }

                          await loadRelatedDocs({ silent: true })
                        }}
                      />
                      {relatedDocsLoading && relatedDocs.length === 0 ? (
                        <div className='py-10 text-center text-[13px] font-semibold text-gray-10'>
                          {t`Loading related documents...`}
                        </div>
                      ) : (
                        <>
                          {relatedDocsLoading && relatedDocs.length > 0 ? (
                            <div className='py-2 text-center text-[12px] font-semibold text-gray-10'>
                              {t`Loading related documents...`}
                            </div>
                          ) : null}
                          {relatedDocs.length ? (
                            <div className='space-y-2'>
                              {relatedDocs.map((item) => {
                                const sizeLabel = formatRelatedFileSize(
                                  item.fileSize,
                                )
                                const dateLabel = item.createdAtUtc
                                  ? formatUtcToLocalDateTime(
                                      item.createdAtUtc,
                                      '',
                                    )
                                  : ''
                                const repoName =
                                  item.repositoryName &&
                                  item.repositoryName !== 'Main Repository'
                                    ? item.repositoryName
                                    : 'Accounts Payable'
                                const secondary = [
                                  dateLabel,
                                  repoName || item.supplier || null,
                                ]
                                  .filter(Boolean)
                                  .join(' • ')
                                const ext = String(
                                  item.fileType ||
                                    item.fileName.split('.').pop() ||
                                    'pdf',
                                )
                                  .replace(/^\./, '')
                                  .toLowerCase()

                                return (
                                  <div
                                    className='flex items-center gap-3 rounded-xl border border-gray-3 bg-surface-primary px-3 py-2.5 transition-colors hover:border-gray-5 hover:bg-gray-1'
                                    key={`${item.repositoryId}:${item.id}`}
                                  >
                                    <button
                                      className='flex min-w-0 flex-1 items-center gap-3 text-left'
                                      type='button'
                                      onClick={() => {
                                        onOpenRelatedDocument?.({
                                          id: item.id,
                                          repositoryId: item.repositoryId,
                                        })
                                      }}
                                    >
                                      <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--gray-3)] bg-[var(--gray-2)]'>
                                        <Icon
                                          className='size-5 shrink-0'
                                          name={getFileIcon(item.fileName)}
                                        />
                                      </span>
                                      <span className='min-w-0 flex-1'>
                                        <span className='flex min-w-0 flex-wrap items-baseline gap-x-1.5'>
                                          <b className='truncate text-[13px] font-semibold text-gray-13'>
                                            {item.fileName}
                                          </b>
                                          {sizeLabel ? (
                                            <span className='shrink-0 text-[12px] text-gray-9'>
                                              ({sizeLabel})
                                            </span>
                                          ) : ext ? (
                                            <span className='shrink-0 text-[12px] text-gray-9 uppercase'>
                                              {ext}
                                            </span>
                                          ) : null}
                                        </span>
                                        {secondary ? (
                                          <span className='mt-0.5 block truncate text-[12px] text-gray-9'>
                                            {secondary}
                                          </span>
                                        ) : null}
                                      </span>
                                    </button>

                                    {canDownload ? (
                                      <Tooltip
                                        content={t`Download`}
                                        position='top'
                                      >
                                        <button
                                          aria-label={t`Download`}
                                          className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-9 transition-all hover:bg-gray-3 hover:text-gray-12 active:scale-95'
                                          type='button'
                                          onClick={async (event) => {
                                            event.stopPropagation()
                                            try {
                                              const response =
                                                await fileApi.viewBinaryV6(
                                                  item.repositoryId,
                                                  item.id,
                                                  'attachment',
                                                )
                                              if (
                                                !(
                                                  response?.data instanceof Blob
                                                )
                                              ) {
                                                throw new Error(
                                                  toUiErrorMessage(
                                                    response?.error,
                                                    t`Unable to download file`,
                                                  ),
                                                )
                                              }
                                              const downloadUrl =
                                                URL.createObjectURL(
                                                  response.data,
                                                )
                                              const link =
                                                document.createElement('a')
                                              link.href = downloadUrl
                                              link.download =
                                                item.fileName || 'document'
                                              document.body.appendChild(link)
                                              link.click()
                                              link.remove()
                                              URL.revokeObjectURL(downloadUrl)
                                            } catch (exception: any) {
                                              showToast({
                                                message: toUiErrorMessage(
                                                  exception?.message ||
                                                    exception,
                                                  t`Unable to download file`,
                                                ),
                                                variant: 'error',
                                              })
                                            }
                                          }}
                                        >
                                          <DynamicIcon
                                            className='h-4 w-4'
                                            name='download'
                                          />
                                        </button>
                                      </Tooltip>
                                    ) : null}
                                    <Tooltip
                                      content={t`Remove from related`}
                                      position='top'
                                    >
                                      <button
                                        aria-label={t`Remove from related`}
                                        className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-9 transition-all hover:bg-red-2 hover:text-red-11 active:scale-95 disabled:opacity-50'
                                        type='button'
                                        disabled={
                                          removingRelatedKey ===
                                          `${item.relatedRepositoryId || item.repositoryId}:${item.relatedItemId || item.id}`
                                        }
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          void removeRelatedDoc(item)
                                        }}
                                      >
                                        {removingRelatedKey ===
                                        `${item.relatedRepositoryId || item.repositoryId}:${item.relatedItemId || item.id}` ? (
                                          <DynamicIcon
                                            className='h-4 w-4 animate-spin'
                                            name='spinner'
                                          />
                                        ) : (
                                          <DynamicIcon
                                            className='h-4 w-4'
                                            name='trash'
                                          />
                                        )}
                                      </button>
                                    </Tooltip>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <NoDataState
                              description={t`No related documents are linked with this file yet.`}
                              icon='paperclip'
                              title={t`Related documents not found`}
                            />
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </Card>
              </>
            ) : null}
          </main>

          {infoCards.length > 0 || ticketData ? (
            <aside className='ez-detail-scroll min-w-0 space-y-4 overflow-y-auto pr-2 pb-6'>
              {ticketData ? (
                <Card className='overflow-hidden p-0' key='ticket-info'>
                  <h3 className='flex items-center gap-2 border-b border-gray-3 px-4 py-3 text-[15px] font-semibold text-gray-13'>
                    <DynamicIcon
                      className='h-4 w-4 text-blue-11'
                      name='fileText'
                    />
                    Ticket Information
                  </h3>
                  <div className='space-y-3 p-4'>
                    {ticketData.referenceNumber && (
                      <div className='flex items-center justify-between gap-4'>
                        <span className='text-[13px] text-gray-10'>
                          Reference No
                        </span>
                        <span className='truncate text-[13px] font-semibold text-gray-13'>
                          {ticketData.referenceNumber}
                        </span>
                      </div>
                    )}
                    {ticketData.ticketStatus && (
                      <div className='flex items-center justify-between gap-4'>
                        <span className='text-[13px] text-gray-10'>Status</span>
                        <StatusPill status={ticketData.ticketStatus} />
                      </div>
                    )}
                    {ticketData.assigneeEmail && (
                      <div className='flex items-center justify-between gap-4'>
                        <span className='text-[13px] text-gray-10'>
                          Assignee
                        </span>
                        <span
                          className='truncate text-[13px] font-semibold text-gray-13'
                          title={ticketData.assigneeEmail}
                        >
                          {ticketData.assigneeEmail}
                        </span>
                      </div>
                    )}

                    {ticketData.history?.length > 0 && (
                      <div className='mt-2 space-y-3 border-t border-gray-3 pt-3'>
                        <h4 className='text-[12px] font-semibold text-gray-11'>
                          Workflow History
                        </h4>
                        <div className='flex flex-col gap-3'>
                          {ticketData.history.map(
                            (hist: any, index: number) => (
                              <div
                                key={index}
                                className={`relative z-10 flex gap-3 ${
                                  index < ticketData.history.length - 1
                                    ? 'before:absolute before:top-6 before:-bottom-3 before:left-[11px] before:w-[2px] before:bg-gray-3'
                                    : ''
                                }`}
                              >
                                <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2px] border-surface-primary bg-gray-2 text-gray-10'>
                                  <DynamicIcon
                                    className='h-3 w-3 text-gray-11'
                                    name={getMilestoneIcon(hist.milestone)}
                                  />
                                </div>
                                <div className='flex-1 pb-1'>
                                  <p className='text-[13px] leading-tight font-medium text-gray-13'>
                                    {hist.title}
                                  </p>
                                  {hist.description && (
                                    <p className='mt-0.5 text-[12px] leading-tight text-gray-9'>
                                      {hist.description}
                                    </p>
                                  )}
                                  {hist.occurredAtUtc && (
                                    <p className='mt-1 text-[11px] text-gray-8'>
                                      {formatDateTime(hist.occurredAtUtc)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ) : null}
              {infoCards.map((card) => (
                <Card className='overflow-hidden p-0' key={card.id}>
                  <h3 className='flex items-center gap-2 border-b border-gray-3 px-4 py-3 text-[15px] font-semibold text-gray-13'>
                    <DynamicIcon
                      className='h-4 w-4 text-blue-11'
                      name={card.iconKey}
                    />
                    {card.title}
                  </h3>
                  <div>
                    {card.rows.map((row) => {
                      const rowKey = `${card.id}:${row.label}`
                      const fieldValue = getFieldDisplayValue(row.value)
                      const maskField =
                        enablePiiRedaction &&
                        piiFieldNameSet.has(
                          row.label.trim().toLowerCase().replace(/\s+/g, ''),
                        )
                      const hasPdfMatch =
                        !maskField &&
                        Boolean(
                          fieldValue && matchedFieldValues.has(fieldValue),
                        )
                      const isActive = activeFieldKey === rowKey
                      const plainVal = toDisplayValue(row.value)
                      const maskedTail =
                        plainVal.length <= 3 ? plainVal : plainVal.slice(-3)
                      return (
                        <button
                          key={rowKey}
                          type='button'
                          className={`group flex w-full items-start gap-2 border-b border-gray-3 px-3.5 py-2.5 text-left transition-all last:border-0 ${
                            isActive
                              ? 'z-10 bg-gray-2 ring-1 ring-primary-5/30'
                              : 'hover:bg-gray-1'
                          } ${hasPdfMatch ? '' : 'cursor-default'}`}
                          onClick={() => {
                            if (!hasPdfMatch) return
                            setActiveFieldKey(rowKey)
                            setFieldFocusRequestId((previous) => previous + 1)
                          }}
                        >
                          {/* 1. OCR Icon Only with Tooltip */}
                          <span className='flex h-5 w-5 shrink-0 items-center justify-center pt-0.5'>
                            {hasPdfMatch ? (
                              <Tooltip
                                content={t`Source: OCR Document`}
                                position='top'
                              >
                                <span className='inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--teal-3)] bg-[var(--teal-1)] text-[var(--teal-9)] shadow-2xs transition-all hover:scale-105'>
                                  <ScanText className='h-3 w-3' />
                                </span>
                              </Tooltip>
                            ) : null}
                          </span>

                          {/* 2. Label */}
                          <div className='min-w-0 flex-1 overflow-hidden pt-0.5 text-[13px] text-gray-10'>
                            <span className='block truncate text-left hover:overflow-hidden hover:break-words hover:whitespace-normal'>
                              {row.label}
                            </span>
                          </div>

                          {/* 3. Value — truncated on one line; hover wraps in this column only */}
                          <div className='ml-auto max-w-[50%] min-w-0 shrink-0 overflow-hidden pt-0.5 text-right'>
                            {maskField ? (
                              <b
                                aria-label={t`Redacted`}
                                className='block whitespace-nowrap font-mono text-[13px] font-semibold text-gray-13'
                              >
                                {`*****${maskedTail}`}
                              </b>
                            ) : (
                              <b className='block w-full min-w-0 truncate text-right text-[13px] font-semibold text-gray-13 hover:overflow-hidden hover:break-words hover:whitespace-normal'>
                                {plainVal}
                              </b>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DummyDocumentPreview({
  fileName,
  fileType,
}: {
  fileName: string
  fileType: string
}) {
  const { t } = useLingui()

  return (
    <div className='flex h-full min-h-[560px] items-center justify-center bg-blue-3/30'>
      <div className='text-center'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
          <DynamicIcon className='h-8 w-8 text-red-8' name='fileText' />
        </div>
        <p className='mt-4 text-[14px] font-semibold text-gray-10'>
          {fileName}
        </p>
        <p className='mt-2 text-[12px] text-gray-10'>{t`${fileType} Viewer`}</p>
      </div>
    </div>
  )
}

function NoDataState({
  description,
  icon = 'paperclip',
  title,
}: {
  description: string
  icon?: string
  title: string
}) {
  return (
    <div className='flex min-h-[200px] items-center justify-center px-6 py-10 text-center'>
      <div className='max-w-[520px]'>
        <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-3'>
          <div className='flex h-14 w-14 items-center justify-center rounded-full bg-surface-primary shadow-sm'>
            <DynamicIcon className='h-7 w-7 text-gray-10' name={icon} />
          </div>
        </div>
        <h3 className='mt-5 text-[16px] font-bold text-gray-13'>{title}</h3>
        <p className='mt-2 text-[14px] leading-6 text-gray-10'>{description}</p>
      </div>
    </div>
  )
}
