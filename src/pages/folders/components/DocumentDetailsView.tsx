import { ArrowLeft, CheckCircle2, Loader2, PenLine, ScanText } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import {
  collectSignRequestFields,
  createSignRequest,
  getSignRequest,
  getSignRequestInviteFile,
  listItemSignRequests,
  listPendingSignRequestsForMe,
  submitInviteSignRequest,
  submitSignRequest,
  type SignRequestFieldDto,
  type SignRequestInvitePreview,
} from '@/api/v6/folder/signRequest'
import Modal from '@/components/base/Modal'
import Tooltip from '@/components/base/Tooltip'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import { SkeletonDocumentDetails } from '@/components/common/skeletons'
import showToast from '@/components/base/toast/showToast'
import {
  getRepositoryById,
  persistEditedDocumentToRepository,
  type RepositoryFieldDto,
} from '@/api/v6/folder/folder'
import CollaboraEditor from './CollaboraEditor'
import authUserStore from '@/stores/authUserStore'
import { formatUtcToLocalDate, formatUtcToLocalDateTime } from '@/utils/utcDate'
import { folderApi } from '../api/folderApi'
import {
  getFileExtension,
  resolveDocumentPreviewKind,
  resolvePreviewMimeType,
  sniffBlobMimeType,
  type DocumentPreviewKind,
} from '../utils/documentDetailsUtils'
import { resolveShareContext } from '../utils/shareContextStorage'
import { getFieldDisplayValue, getFieldSearchVariantStrings } from '../utils/fieldPdfSearch'
import {
  loadSignRequestFields,
  saveSignRequestFields,
} from '../utils/signRequestFieldsStorage'
import {
  DocumentSigningPage,
  type DocumentSigningActionRef,
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
  repositoryId: string
  repositoryName?: string | null
  supplier?: string | null
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

const toUiErrorMessage = (value: unknown, fallback: string) => {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (value instanceof Error) return value.message || fallback
  if (typeof value === 'object') {
    const record = value as {
      error?: unknown
      message?: unknown
      title?: unknown
      detail?: unknown
    }
    for (const key of ['error', 'message', 'title', 'detail'] as const) {
      const part = record[key]
      if (typeof part === 'string' && part.trim()) return part.trim()
    }
  }
  return fallback
}

export function DocumentDetailsView({
  id,
  repositoryId,
  // onEdit,
  onAiSummary,
  onBack,
  onSigningComplete,
  onWorkflow,
  forceSigning = false,
  inviteToken = '',
  invitePreview = null,
  signRequestId: initialSignRequestId = '',
  signatureFields: initialSignatureFieldsProp,
  compactActions = false,
  autoOpenShare = false,
  onShareOpened,
  onOpenRelatedDocument,
}: {
  id: string
  repositoryId: string
  onAiSummary?: () => void
  /** Leave the details view. Omit when there is nowhere to go back to. */
  onBack?: () => void
  /** Signature was actually submitted (not just the signing UI closed). */
  onSigningComplete?: () => void
  onEdit?: () => void
  onWorkflow?: () => void
  /** Open a related file in details (use that row's repositoryId + id). */
  onOpenRelatedDocument?: (payload: {
    id: string
    repositoryId: string
  }) => void
  /** Open directly in assigned-field signing mode (invite / pending). */
  forceSigning?: boolean
  inviteToken?: string
  /** Invite preview metadata — used when workspace API is not available. */
  invitePreview?: SignRequestInvitePreview | null
  signRequestId?: string
  signatureFields?: SignRequestFieldDto[]
  /** Hide AI/Share/Workflow when opened from invite. */
  compactActions?: boolean
  /** Open the Canva-style share popover on mount (list Share action). */
  autoOpenShare?: boolean
  onShareOpened?: () => void
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
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)
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
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [isSigning, setIsSigning] = useState(Boolean(forceSigning))
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([])
  const [activeSignRequestId, setActiveSignRequestId] = useState(
    String(initialSignRequestId || ''),
  )
  const [activeInviteToken] = useState(String(inviteToken || ''))
  // Signing is offered only through a sign request invite link.
  const canSign = Boolean(forceSigning || activeInviteToken || true)
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
    isSaving: false,
    hasPlacements: false,
    workspaceMode: 'create',
  })
  const signingResolvedForRef = useRef('')
  const [relatedDocs, setRelatedDocs] = useState<RelatedDoc[]>([])
  const [relatedDocsLoading, setRelatedDocsLoading] = useState(false)
  const [relatedDocsLoaded, setRelatedDocsLoaded] = useState(false)
  const [relatedDocsTotal, setRelatedDocsTotal] = useState(0)
  const { session } = authUserStore.getState()
  const currentUserEmail = String(session?.email || '')
    .trim()
    .toLowerCase()
  const signerName = [session?.firstName, session?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || session?.name || ''

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

      const itemRequests = await listItemSignRequests({ itemId: id, repositoryId })
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
      setFileLoadFailed(false)
      setTimeline([])
      setComments([])
      setRelatedDocs([])
      setTimelineLoaded(false)
      setCommentsLoaded(false)
      setRelatedDocsLoaded(false)
      setRelatedDocsTotal(0)
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

        const response = await folderApi.getDocumentDetail(
          repositoryId,
          id,
          useShareToken
            ? {
                shareToken: shareCtx.shareToken,
                tenantId: shareCtx.sourceTenantId,
              }
            : undefined,
        )
        if (mounted) setData(response as WorkspaceDocumentDetail)
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
  }, [repositoryId, id, inviteToken, invitePreview?.fileName, t])

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
        const requests = await listItemSignRequests({ itemId: id, repositoryId })
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
    let mounted = true

    const loadComments = async () => {
      if (inviteToken) return
      if (tab !== 'comments' || !repositoryId || !id || commentsLoaded) return
      setCommentsLoading(true)

      try {
        const response = await folderApi.getDocumentComments(repositoryId, id, {
          page: 1,
          pageSize: 50,
        })
        if (mounted) {
          setComments(
            Array.isArray(response?.comments) ? response.comments : [],
          )
          setCommentsLoaded(true)
        }
      } catch {
        if (mounted) {
          setComments([])
          setCommentsLoaded(true)
        }
      } finally {
        if (mounted) setCommentsLoading(false)
      }
    }

    loadComments()
    return () => {
      mounted = false
    }
  }, [tab, repositoryId, id, commentsLoaded])

  useEffect(() => {
    let mounted = true

    const loadRelatedDocs = async () => {
      if (inviteToken) return
      if (tab !== 'relatedDocs' || !repositoryId || !id || relatedDocsLoaded)
        return
      setRelatedDocsLoading(true)

      try {
        const response = await folderApi.getRelatedDocuments(repositoryId, id, {
          page: 1,
          pageSize: 50,
        })
        if (!mounted) return
        const rows = Array.isArray(response?.data) ? response.data : []
        setRelatedDocs(
          rows
            .filter((row) => row?.id && row?.repositoryId)
            .map((row) => ({
              createdAtUtc: row.createdAtUtc,
              documentType: row.documentType,
              fileName: String(row.fileName || t`Untitled`),
              fileSize: row.fileSize,
              fileType: row.fileType,
              id: String(row.id),
              matchCount: row.matchCount,
              matchedFields: Array.isArray(row.matchedFields)
                ? row.matchedFields
                : [],
              matchScore: row.matchScore,
              repositoryId: String(row.repositoryId),
              repositoryName: row.repositoryName,
              supplier: row.supplier,
            })),
        )
        setRelatedDocsTotal(Number(response?.totalCount || rows.length || 0))
        setRelatedDocsLoaded(true)
      } catch {
        if (mounted) {
          setRelatedDocs([])
          setRelatedDocsTotal(0)
          setRelatedDocsLoaded(true)
        }
      } finally {
        if (mounted) setRelatedDocsLoading(false)
      }
    }

    void loadRelatedDocs()
    return () => {
      mounted = false
    }
  }, [tab, repositoryId, id, relatedDocsLoaded, inviteToken, t])

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
        resolvePreviewMimeType(
          previewMimeType,
          data?.fileName,
          data?.fileType,
        ),
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
      setCommentsLoaded(false)
      setTab('comments')
    } finally {
      setSavingComment(false)
    }
  }

  const handleDownload = async () => {
    if (!repositoryId || !id || isDownloading) return

    setIsDownloading(true)
    setDownloadError('')
    try {
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
            toUiErrorMessage(
              inviteFile.error,
              t`Unable to download file`,
            ),
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
            toUiErrorMessage(
              response?.error,
              t`Unable to download file`,
            ),
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
        toUiErrorMessage(exception?.message || exception, t`Unable to download file`),
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = () => {
    if (!previewUrl) return

    const printWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer')
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

  const isEditableDocType = useMemo(() => {
    const ext =
      getFileExtension(data?.fileName) || getFileExtension(data?.fileType)
    return Boolean(ext && ['docx', 'xlsx', 'pptx', 'pdf'].includes(ext))
  }, [data?.fileType, data?.fileName])

  const handleCollaboraClose = () => {
    setIsEditingDoc(false)
  }

  const extractMetadataFromDetail = (detail: WorkspaceDocumentDetail | null): Record<string, string> => {
    const metadata: Record<string, string> = {}
    if (!detail) return metadata

    if (Array.isArray(detail.DetailsRow)) {
      for (const section of detail.DetailsRow) {
        if (Array.isArray(section.fields)) {
          for (const field of section.fields) {
            const key = field?.key || field?.label
            if (key && field?.value !== undefined && field?.value !== null && field?.value !== '') {
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

  const handleCollaboraSave = async (blob: Blob) => {
    setIsEditingDoc(false)

    // Verification logging
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
    // eslint-disable-next-line no-console
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
      showToast({
        message: t`Document updated successfully.`,
        variant: 'success',
      })
      setPreviewRefreshKey((previous) => previous + 1)
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
          count: comments.length,
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
    [comments.length, relatedDocs.length, relatedDocsTotal, t, timeline.length],
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
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      {previewUrl && (isSigning || assignedFields.length > 0) ? (
        <DocumentSigningPage
          mode='inline'
          overlayOnly={!isSigning && assignedFields.length > 0}
          openPickerKey={signPickerKey}
          pickerAnchorRef={signTriggerRef}
          externalSurfaceRef={documentSurfaceRef}
          actionRef={signingActionRef}
          onStateChange={setSigningState}
          documentUrl={previewUrl}
          documentName={data.fileName}
          isImage={isImagePreview}
          isLoading={isPreviewLoading}
          isPdf={isPdfPreview}
          itemId={id}
          repositoryId={repositoryId}
          restrictToFields={
            (Boolean(forceSigning) || restrictToFields) &&
            assignedFields.length > 0
          }
          signatureFields={assignedFields}
          signRequestId={activeSignRequestId}
          signerEmail={currentUserEmail}
          signerName={signerName}
          savedSignatures={savedSignatures}
          onBack={() => {
            // Closing the signing UI is never a completed signature, so the
            // invite flow must stay on the document instead of reporting done.
            setIsSigning(false)
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
          onDeleteSavedSignature={(signatureId) => {
            setSavedSignatures((prev) =>
              prev.filter((item) => item.id !== signatureId),
            )
            showToast({
              message: t`Saved signature removed.`,
              variant: 'success',
            })
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
              onSigningComplete?.()
            }

            // Assigned-field signing against an existing request / invite
            // Sign APIs only — never inviteToShare / share.
            if (activeSignRequestId || activeInviteToken) {
              for (const placement of placements) {
                if (activeInviteToken) {
                  const submitted = await submitInviteSignRequest({
                    accessToken:
                      authUserStore.getState().identity?.accessToken,
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
                    signRequestId: activeSignRequestId,
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
                signRequestId: requestId,
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
        />
      ) : null}

      <div className='no-print relative z-30 flex h-[60px] shrink-0 items-center justify-between gap-2 overflow-visible border-b border-gray-3 bg-surface-primary px-5'>
        {forceSigning || !onBack ? (
          <div className='h-8 w-[72px]' aria-hidden />
        ) : (
          <Button
            className='h-8 border-transparent px-3 text-[13px] shadow-none'
            onClick={onBack}
          >
            <ArrowLeft size={12} /> {t`Back`}
          </Button>
        )}

        <div className='flex items-center gap-1.5'>
          {!compactActions ? (
            <>
              <button
                aria-label={t`AI Summary`}
                className='inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-gray-3 bg-surface px-3.5 text-[13px] font-semibold text-gray-11 transition-all hover:border-gray-5 hover:bg-gray-2 hover:text-gray-13 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                disabled={!onAiSummary}
                type='button'
                onClick={() => onAiSummary?.()}
              >
                <DynamicIcon className='h-4 w-4 text-violet-9' name='bot' />
                <span>{t`AI Summary`}</span>
              </button>
              <div>
                <FolderSharePopover
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
                        const signShares = shares.filter(
                          (share) =>
                            share.permission === 'Sign' || share.action === 2,
                        )

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
                              (signShares.length === 1
                                ? 'single'
                                : 'multiple'),
                          })
                          if (created.error || !created.data?.signRequestId) {
                            throw new Error(
                              String(
                                created.error ||
                                  'Unable to create sign request',
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
              ref={signTriggerRef}
              aria-label={t`Sign`}
              aria-expanded={isSigning}
              className={`inline-flex h-8 items-center justify-center gap-2 rounded-lg border px-3.5 text-[13px] font-semibold transition-all hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSigning
                  ? 'border-primary-6 bg-primary-1 text-primary-9'
                  : 'border-gray-3 bg-surface text-gray-11 hover:border-gray-5 hover:bg-gray-2 hover:text-gray-13'
              }`}
              disabled={!previewUrl || isPreviewLoading}
              type='button'
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
              <span>{t`Sign`}</span>
            </button>
          ) : null}
          {isSigning && (signingState.hasPlacements || signingState.canSave) ? (
            <button
              type='button'
              aria-label={t`Submit`}
              className='inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary-9 px-3.5 text-[13px] font-semibold text-white transition-all hover:bg-primary-10 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
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
                  ? t`Submitting...`
                  : signingState.workspaceMode === 'assign'
                    ? t`Send`
                    : t`Submit`}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div className='ez-detail-scroll min-h-0 flex-1 overflow-y-auto p-5'>
        <div
          className={`grid gap-5 ${
            forceSigning && infoCards.length === 0
              ? 'grid-cols-1'
              : 'grid-cols-[minmax(0,1fr)_400px]'
          }`}
        >
          <main className='min-w-0 space-y-4'>
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

            <Card className='overflow-hidden'>
              <div className='flex items-center justify-between gap-3 border-b border-gray-3 px-5 py-4'>
                <div className='flex min-w-0 items-center gap-3'>
                  <DynamicIcon
                    className='h-5 w-5 shrink-0 text-red-8'
                    name='fileText'
                  />
                  <b className='truncate text-[16px] font-semibold text-gray-13'>
                    {data.fileName}
                  </b>
                </div>

                <div className='flex shrink-0 items-center gap-1.5'>
                  {isEditableDocType ? (
                    <Tooltip content={t`Edit`} position='top'>
                      <button
                        aria-label={t`Edit`}
                        className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={
                          !previewBlobRef.current ||
                          isPreviewLoading ||
                          isSigning
                        }
                        type='button'
                        onClick={() => setIsEditingDoc(true)}
                      >
                        <DynamicIcon className='h-4 w-4' name='edit' />
                      </button>
                    </Tooltip>
                  ) : null}

                  <Tooltip content={t`Print`} position='top'>
                    <button
                      aria-label={t`Print`}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                      disabled={!previewUrl || isPreviewLoading}
                      type='button'
                      onClick={handlePrint}
                    >
                      <DynamicIcon className='h-4 w-4' name='printer' />
                    </button>
                  </Tooltip>

                  <Tooltip
                    content={isDownloading ? t`Downloading...` : t`Download`}
                    position='top'
                  >
                    <button
                      aria-label={t`Download`}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                      disabled={isDownloading || isPreviewLoading}
                      type='button'
                      onClick={handleDownload}
                    >
                      <DynamicIcon className='h-4 w-4' name='download' />
                    </button>
                  </Tooltip>
                </div>
              </div>

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
                    ref={documentSurfaceRef}
                    className='relative h-full min-h-full w-full'
                  >
                    <DocumentPreviewViewer
                      activeHighlightColor={activeHighlightColor}
                      activeHighlightTerm={activeHighlightTerm}
                      className='h-full min-h-full'
                      enableHighlight={
                        isPdfPreview && fieldHighlightTerms.length > 0
                      }
                      fileName={data.fileName}
                      fileUrl={previewUrl}
                      focusRequestId={fieldFocusRequestId}
                      highlightColors={fieldHighlightColors}
                      highlightTerms={fieldHighlightTerms}
                      isImage={isImagePreview}
                      isLoading={isPreviewLoading}
                      isPdf={isPdfPreview}
                      onProbeComplete={handleFieldMatchProbe}
                      probeTerms={fieldProbeTerms}
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
                            className={`sticky top-0 z-30 whitespace-nowrap border-b border-gray-3 px-3 py-3 text-left text-[12px] font-semibold tracking-wide text-gray-10 ${lineItemStickyClass(index, 'th')} ${
                              index < 2 ? 'z-40' : ''
                            }`}
                            key={key}
                          >
                            {formatLineItemHeader(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((row, rowIndex) => (
                        <tr
                          className='group text-gray-13'
                          key={rowIndex}
                        >
                          {lineItemColumns.map((key, index) => (
                            <td
                              className={`whitespace-nowrap border-b border-gray-3 px-3 py-3 font-medium group-last:border-b-0 ${lineItemStickyClass(index, 'td')}`}
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
                  onClick={() => setTab(item.key)}
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
                  <div className='space-y-4'>
                    {timeline.map((item, index) => (
                      <div
                        className='flex gap-3'
                        key={`${item.id || item.title}-${index}`}
                      >
                        <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-3 text-blue-11'>
                          <DynamicIcon
                            className='h-4 w-4'
                            name={eventIconMap[item.eventType || ''] || 'clock'}
                          />
                        </span>
                        <div>
                          <b className='text-[13px] font-semibold text-gray-13'>
                            {item.title}
                          </b>
                          <p className='mt-0.5 text-[12px] text-gray-10'>
                            {[
                              item.actorName || item.actorType,
                              formatDateTime(item.createdAtUtc),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          {item.description ? (
                            <p className='mt-1 text-[13px] text-gray-10'>
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
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
                  <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-5'>
                    {commentsLoading ? (
                      <div className='py-10 text-center text-[13px] font-semibold text-gray-10'>
                        {t`Loading comments...`}
                      </div>
                    ) : comments.length ? (
                      <div className='space-y-4'>
                        {comments.map((item, index) => {
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
                          const isMine = item.authorUserId === currentUserEmail

                          return (
                            <div
                              className={`flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                              key={`${item.id || author}-${index}`}
                            >
                              {!isMine && (
                                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[12px] font-semibold text-blue-11'>
                                  {author.charAt(0).toUpperCase()}
                                </span>
                              )}

                              <div
                                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                                  isMine
                                    ? 'bg-violet-9 text-white'
                                    : 'bg-gray-2 text-gray-13'
                                }`}
                              >
                                <div className='flex items-center gap-3'>
                                  <b className='text-[13px] font-semibold'>
                                    {isMine ? t`You` : author}
                                  </b>

                                  <span
                                    className={`text-[11px] ${isMine ? 'text-violet-1' : 'text-gray-10'}`}
                                  >
                                    {formatDateTime(
                                      item.createdAtUtc || item.date,
                                    )}
                                  </span>
                                </div>

                                <p className='mt-1 text-[13px] leading-5 whitespace-pre-wrap'>
                                  {message}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <NoDataState
                        description={t`No comments are available for this document. Add the first comment to start collaboration.`}
                        icon='messageSquare'
                        title={t`No comments found`}
                      />
                    )}
                  </div>

                  <div className='shrink-0 border-t border-gray-3 bg-surface-primary p-4'>
                    <div className='flex items-center gap-3'>
                      <textarea
                        className='h-12 flex-1 resize-none rounded-lg border border-gray-3 bg-white px-4 py-3 text-[13px] text-gray-13 outline-none focus:border-blue-7'
                        placeholder={t`Add a comment...`}
                        rows={1}
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                      />

                      <PrimaryButton
                        className='h-12 shrink-0 px-6 text-[13px]'
                        disabled={!commentText.trim() || savingComment}
                        onClick={saveComment}
                      >
                        {savingComment ? t`Posting...` : t`Post`}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'relatedDocs' ? (
                <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-5'>
                {relatedDocsLoading ? (
                  <div className='py-10 text-center text-[13px] font-semibold text-gray-10'>
                    {t`Loading related documents...`}
                  </div>
                ) : relatedDocs.length ? (
                  <div className='space-y-2'>
                    {relatedDocs.map((item) => {
                      const sizeLabel = formatRelatedFileSize(item.fileSize)
                      const dateLabel = item.createdAtUtc
                        ? formatUtcToLocalDate(item.createdAtUtc, '')
                        : ''
                      const secondary = [
                        dateLabel,
                        item.repositoryName || item.supplier || null,
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
                          key={`${item.repositoryId}:${item.id}`}
                          className='flex items-center gap-3 rounded-xl border border-gray-3 bg-surface-primary px-3 py-2.5 transition-colors hover:border-gray-5 hover:bg-gray-1'
                        >
                          <button
                            type='button'
                            className='flex min-w-0 flex-1 items-center gap-3 text-left'
                            onClick={() => {
                              onOpenRelatedDocument?.({
                                id: item.id,
                                repositoryId: item.repositoryId,
                              })
                            }}
                          >
                            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-2'>
                              <DynamicIcon
                                className='h-4 w-4 text-red-9'
                                name='fileText'
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
                                  <span className='shrink-0 text-[12px] uppercase text-gray-9'>
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

                          <Tooltip content={t`Download`} position='top'>
                            <button
                              type='button'
                              aria-label={t`Download`}
                              className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-9 transition-all hover:bg-gray-3 hover:text-gray-12 active:scale-95'
                              onClick={async (event) => {
                                event.stopPropagation()
                                try {
                                  const response = await fileApi.viewBinaryV6(
                                    item.repositoryId,
                                    item.id,
                                    'attachment',
                                  )
                                  if (!(response?.data instanceof Blob)) {
                                    throw new Error(
                                      toUiErrorMessage(
                                        response?.error,
                                        t`Unable to download file`,
                                      ),
                                    )
                                  }
                                  const downloadUrl = URL.createObjectURL(
                                    response.data,
                                  )
                                  const link = document.createElement('a')
                                  link.href = downloadUrl
                                  link.download = item.fileName || 'document'
                                  document.body.appendChild(link)
                                  link.click()
                                  link.remove()
                                  URL.revokeObjectURL(downloadUrl)
                                } catch (exception: any) {
                                  showToast({
                                    message: toUiErrorMessage(
                                      exception?.message || exception,
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
                </div>
              ) : null}
            </Card>
              </>
            ) : null}
          </main>

          {infoCards.length > 0 ? (
            <aside className='min-w-0 space-y-4'>
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
                      const hasPdfMatch = Boolean(
                        fieldValue && matchedFieldValues.has(fieldValue),
                      )
                      const isActive = activeFieldKey === rowKey
                      const displayVal = toDisplayValue(row.value)
                      return (
                        <button
                          type='button'
                          className={`group flex w-full items-start gap-2 border-b border-gray-3 px-3.5 py-2.5 text-left transition-all last:border-0 ${
                            isActive ? 'bg-gray-2 ring-1 ring-primary-5/30 z-10' : 'hover:bg-gray-1'
                          } ${hasPdfMatch ? '' : 'cursor-default'}`}
                          key={rowKey}
                          onClick={() => {
                            if (!hasPdfMatch) return
                            setActiveFieldKey(rowKey)
                            setFieldFocusRequestId((previous) => previous + 1)
                          }}
                        >
                          {/* 1. OCR Icon Only with Tooltip */}
                          <span className='flex h-5 w-5 shrink-0 items-center justify-center pt-0.5'>
                            {hasPdfMatch ? (
                              <Tooltip content={t`Source: OCR Document`} position='top'>
                                <span
                                  className='inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--teal-3)] bg-[var(--teal-1)] text-[var(--teal-9)] shadow-2xs transition-all hover:scale-105'
                                >
                                  <ScanText className='h-3 w-3' />
                                </span>
                              </Tooltip>
                            ) : null}
                          </span>

                          {/* 2. Label */}
                          <div className='min-w-0 flex-1 overflow-hidden pt-0.5 text-[13px] text-gray-10'>
                            <span
                              className='block truncate text-left group-hover:whitespace-normal group-hover:overflow-visible group-hover:break-words'
                              title={row.label}
                            >
                              {row.label}
                            </span>
                          </div>

                          {/* 3. Value (1 line truncated default, expands inline to next lines on hover) */}
                          <div className='ml-auto max-w-[50%] min-w-0 shrink-0 text-right overflow-hidden group-hover:max-w-[65%] group-hover:overflow-visible transition-all pt-0.5'>
                            <b
                              className='block w-full min-w-0 truncate text-right text-[13px] font-semibold text-gray-13 group-hover:whitespace-normal group-hover:overflow-visible group-hover:break-words group-hover:text-left'
                              title={displayVal}
                            >
                              {displayVal}
                            </b>
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

      <Modal fullScreen opened={isEditingDoc} onClose={handleCollaboraClose}>
        {isEditingDoc && previewBlobRef.current ? (
          <CollaboraEditor
            fileBlob={previewBlobRef.current}
            fileName={data.fileName}
            fileType={
              getFileExtension(data.fileName) ||
              getFileExtension(data.fileType)
            }
            onClose={handleCollaboraClose}
            onSave={handleCollaboraSave}
          />
        ) : null}
      </Modal>
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
