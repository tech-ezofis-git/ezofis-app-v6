import { useLingui } from '@lingui/react/macro'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import BaseButton from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputText from '@/components/base/inputs/InputText'
import Skeleton from '@/components/base/Skeleton'
import Tooltip from '@/components/base/Tooltip'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import cn from '@/utils/cn'
import DraftAttachmentFields, {
  type DraftRepositoryField,
  RequiredProgressPie,
} from './DraftAttachmentFields'
import PdfThumbnail from './PdfThumbnail'
import WordThumbnail from './WordThumbnail'
import type { QueuedUploadFile } from './uploadQueueTypes'
import { formatCreatedAt } from './UploadQueueFileCard'

type DraftFilesMediaLibraryProps = {
  allSelected: boolean
  entries: QueuedUploadFile[]
  exportableSelectedCount?: number
  focusedId?: string | null
  fullPage?: boolean
  isBulkDeleting?: boolean
  isBulkExporting?: boolean
  missingMandatoryById: Record<string, boolean>
  /** Older drafts below the current upload: hidden until requested. */
  otherDraftsState?: 'hidden' | 'loaded' | 'loading'
  /** Earlier drafts count shown before they are loaded. */
  otherDraftsTotal?: number
  /** Files from the current upload, shown in their own first section. */
  primaryIds?: string[]
  repositoryFields?: DraftRepositoryField[]
  selectedIds: string[]
  someSelected: boolean
  title?: string
  onBack?: () => void
  onBulkDelete: () => void
  onBulkExport: () => void
  onExport?: (id: string) => void
  onFieldChange?: (id: string, fieldKey: string, value: string) => void
  onFocus?: (id: string | null) => void
  onOpen: (id: string) => void
  onRegenerate?: (id: string) => void
  onRemove: (id: string) => void
  onSelectAll: (checked: boolean) => void
  onShowOtherDrafts?: () => void
  onToggleSelect: (id: string, checked: boolean) => void
}

type StatusTone = 'amber' | 'blue' | 'gray' | 'green' | 'red' | 'violet'

const STATUS_TONE: Record<
  StatusTone,
  { badge: string; dot: string; track: string }
> = {
  amber: {
    badge: 'bg-orange-2 text-orange-11',
    dot: 'bg-orange-9',
    track: 'bg-orange-3',
  },
  blue: { badge: 'bg-blue-2 text-blue-11', dot: 'bg-blue-9', track: 'bg-blue-3' },
  gray: { badge: 'bg-gray-3 text-gray-11', dot: 'bg-gray-8', track: 'bg-gray-4' },
  green: {
    badge: 'bg-green-2 text-green-11',
    dot: 'bg-green-9',
    track: 'bg-green-3',
  },
  red: { badge: 'bg-red-2 text-red-11', dot: 'bg-red-9', track: 'bg-red-3' },
  violet: {
    badge: 'bg-primary-2 text-primary-11',
    dot: 'bg-primary-9',
    track: 'bg-primary-3',
  },
}

type CardStatus = {
  key: string
  label: string
  /** In-progress line shown on the card preview. */
  progress?: string
  tone: StatusTone
}

/** Badge + progress for a draft card, from its upload / OCR state. */
const getCardStatus = (
  entry: QueuedUploadFile,
  requiredDone: boolean,
  t: ReturnType<typeof useLingui>['t'],
): CardStatus => {
  switch (entry.status) {
    case 'queued':
      if (entry.isSyncing || entry.stageFileId) {
        return {
          key: 'uploading',
          label: t`Uploading`,
          progress: t`Uploading…`,
          tone: 'violet',
        }
      }
      return {
        key: 'queued',
        label: t`Queued`,
        progress: t`Waiting to upload`,
        tone: 'gray',
      }
    case 'analyzing':
      return {
        key: 'extracting',
        label: t`Extracting`,
        progress: t`Extracting fields…`,
        tone: 'blue',
      }
    case 'indexing':
      return {
        key: 'exporting',
        label: t`Exporting`,
        progress: t`Exporting…`,
        tone: 'gray',
      }
    case 'indexed':
      return { key: 'exported', label: t`Exported`, tone: 'green' }
    case 'error':
      return { key: 'failed', label: t`Failed`, tone: 'red' }
    default:
      return requiredDone
        ? { key: 'ready', label: t`Ready`, tone: 'green' }
        : { key: 'needs-input', label: t`Needs input`, tone: 'amber' }
  }
}

/** "today 12:01", or a short date for earlier days. */
const formatUploadStarted = (
  value: string | undefined,
  t: ReturnType<typeof useLingui>['t'],
) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
  })
  if (date.toDateString() === new Date().toDateString()) return t`today ${time}`
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

/** Placeholder card while the upload is starting. */
const DraftCardSkeleton = () => (
  <div className='flex flex-col overflow-hidden rounded-lg border-2 border-gray-3 bg-surface'>
    <div className='flex items-center justify-between border-b border-gray-3 px-2 py-1.5'>
      <Skeleton className='size-4 rounded' />
      <Skeleton className='h-4 w-14 rounded-full' />
    </div>
    <Skeleton className='aspect-square w-full rounded-none' />
    <div className='flex flex-col gap-1.5 border-t border-gray-3 px-3 py-2.5'>
      <Skeleton className='h-3 w-3/4 rounded' />
      <div className='flex justify-between'>
        <Skeleton className='h-2.5 w-10 rounded' />
        <Skeleton className='h-2.5 w-12 rounded' />
      </div>
    </div>
  </div>
)

const isImageFile = (fileName: string) =>
  /\.(bmp|jpeg|jpg|png|svg|tif|tiff|webp)$/i.test(fileName)

const isPdfFile = (fileName: string) => /\.pdf$/i.test(fileName)

const isWordFile = (fileName: string) => /\.docx$/i.test(fileName)

const FileTypeIcon = ({ fileName }: { fileName: string }) => {
  const pdf = isPdfFile(fileName)
  const image = isImageFile(fileName)
  return (
    <div
      className={cn(
        'flex size-12 items-center justify-center rounded-xl border',
        pdf
          ? 'border-red-3 bg-red-2 text-red-9'
          : image
            ? 'border-blue-3 bg-blue-2 text-blue-9'
            : 'border-gray-3 bg-gray-1 text-gray-10',
      )}
    >
      <Icon
        className='size-6'
        name={pdf ? 'lucide:file-text' : image ? 'lucide:image' : 'lucide:file'}
      />
    </div>
  )
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/** Formats card footer date ("Today, 12:01" if today, otherwise "5-Oct-2026"). */
function formatCardDate(
  value?: string,
  t?: ReturnType<typeof useLingui>['t'],
) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const full = formatCreatedAt(value)
    return full
      ? full.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?$/, '').trim()
      : ''
  }
  const isToday = date.toDateString() === new Date().toDateString()
  if (isToday) {
    const time = date.toLocaleTimeString([], {
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
    })
    return t ? t`Today, ${time}` : `Today, ${time}`
  }
  const day = date.getDate()
  const month = date.toLocaleDateString([], { month: 'short' })
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export default function DraftFilesMediaLibrary({
  allSelected,
  entries,
  exportableSelectedCount = 0,
  focusedId = null,
  fullPage = false,
  isBulkDeleting = false,
  isBulkExporting = false,
  missingMandatoryById,
  otherDraftsState = 'loaded',
  otherDraftsTotal = 0,
  primaryIds = [],
  repositoryFields = [],
  selectedIds,
  someSelected,
  title,
  onBack,
  onBulkDelete,
  onBulkExport,
  onExport,
  onFieldChange,
  onFocus,
  onOpen,
  onRegenerate,
  onRemove,
  onSelectAll,
  onShowOtherDrafts,
  onToggleSelect,
}: DraftFilesMediaLibraryProps) {
  const { t } = useLingui()
  const [search, setSearch] = useState('')
  const [previousFocusedId, setPreviousFocusedId] = useState<string | null>(
    null,
  )
  const [failedPreviewIds, setFailedPreviewIds] = useState<Set<string>>(
    () => new Set(),
  )

  const markPreviewFailed = (id: string) => {
    setFailedPreviewIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((entry) => entry.fileName.toLowerCase().includes(q))
  }, [entries, search])

  // Current upload first; older drafts in their own section below.
  const primarySet = useMemo(() => new Set(primaryIds), [primaryIds])
  const hasPrimarySection = primaryIds.length > 0
  const primaryEntries = useMemo(
    () =>
      hasPrimarySection
        ? filtered.filter((entry) => primarySet.has(entry.id))
        : filtered,
    [filtered, hasPrimarySection, primarySet],
  )
  const otherEntries = useMemo(
    () =>
      hasPrimarySection
        ? filtered.filter((entry) => !primarySet.has(entry.id))
        : [],
    [filtered, hasPrimarySection, primarySet],
  )
  const otherCount = otherEntries.length
  const primaryCount = primaryEntries.length
  const [earlierCollapsed, setEarlierCollapsed] = useState(false)

  // Earlier drafts: total known before loading; oldest first once loaded.
  const earlierCount =
    otherDraftsState === 'loaded' ? otherCount : otherDraftsTotal
  const otherEntriesOldestFirst = useMemo(
    () =>
      [...otherEntries].sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime(),
      ),
    [otherEntries],
  )
  const olderThanWeekCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return otherEntries.filter(
      (entry) =>
        entry.createdAt && new Date(entry.createdAt).getTime() < cutoff,
    ).length
  }, [otherEntries])

  // Current upload summary bar.
  const isStartingUpload =
    primaryCount > 0 &&
    primaryEntries.every(
      (entry) => entry.status === 'queued' && !entry.stageFileId,
    )
  const statusCounts = primaryEntries.reduce(
    (acc, entry) => {
      if (entry.status === 'ready' || entry.status === 'indexed') acc.ready += 1
      else if (entry.status === 'analyzing') acc.extracting += 1
      else if (entry.status === 'queued') {
        if (entry.isSyncing || entry.stageFileId) {
          acc.uploading += 1
        } else {
          acc.queued += 1
        }
      }
      else if (entry.status === 'error') acc.failed += 1
      else acc.other += 1
      return acc
    },
    { extracting: 0, failed: 0, other: 0, queued: 0, ready: 0, uploading: 0 },
  )
  const progressSegments = (
    [
      {
        count: statusCounts.ready,
        key: 'ready',
        label: t`ready`,
        tone: 'green' as StatusTone,
      },
      {
        count: statusCounts.extracting,
        key: 'extracting',
        label: t`extracting`,
        tone: 'blue' as StatusTone,
      },
      {
        count: statusCounts.uploading,
        key: 'uploading',
        label: t`uploading`,
        tone: 'violet' as StatusTone,
      },
      {
        count: statusCounts.queued,
        key: 'queued',
        label: t`queued`,
        tone: 'gray' as StatusTone,
      },
      {
        count: statusCounts.failed,
        key: 'failed',
        label: t`failed`,
        tone: 'red' as StatusTone,
      },
      {
        count: statusCounts.other,
        key: 'other',
        label: t`other`,
        tone: 'gray' as StatusTone,
      },
    ]
  ).filter((segment) => segment.count > 0)
  const { extracting, ready, uploading } = statusCounts
  const inProgressCount = extracting + uploading
  const finishedCount = primaryCount - inProgressCount
  const finishedPercent =
    primaryCount > 0 ? Math.round((finishedCount / primaryCount) * 100) : 0
  const uploadStartedLabel = formatUploadStarted(
    primaryEntries.reduce<string | undefined>(
      (earliest, entry) =>
        entry.createdAt && (!earliest || entry.createdAt < earliest)
          ? entry.createdAt
          : earliest,
      undefined,
    ),
    t,
  )

  const focused =
    filtered.find((entry) => entry.id === focusedId) ||
    entries.find((entry) => entry.id === focusedId) ||
    null

  const entryIdsKey = useMemo(
    () => entries.map((entry) => entry.id).join('|'),
    [entries],
  )

  const onFocusRef = useRef(onFocus)
  const onToggleSelectRef = useRef(onToggleSelect)
  const lastRequestedFocusRef = useRef<string | null>(null)
  const skipAutoFocusRef = useRef(false)
  onFocusRef.current = onFocus
  onToggleSelectRef.current = onToggleSelect

  const readyIdsKey = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === 'ready')
        .map((entry) => entry.id)
        .join('|'),
    [entries],
  )

  // Default selection: the first file that has finished extracting (current
  // upload first). Files still uploading / extracting are not auto-selected,
  // so Extracted Data stays empty until there is something to show. A file
  // finishing later is picked up too, unless the user cleared the selection.
  useEffect(() => {
    if (skipAutoFocusRef.current) return
    if (focusedId && entries.some((entry) => entry.id === focusedId)) return
    const firstReady =
      primaryEntries.find((entry) => entry.status === 'ready') ||
      filtered.find((entry) => entry.status === 'ready')
    if (!firstReady || lastRequestedFocusRef.current === firstReady.id) return
    lastRequestedFocusRef.current = firstReady.id
    onFocusRef.current?.(firstReady.id)
    if (!selectedIds.includes(firstReady.id)) {
      onToggleSelectRef.current(firstReady.id, true)
    }
    // Keys track membership / readiness; arrays are read for the latest rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryIdsKey, focusedId, readyIdsKey])

  const selectedCount = selectedIds.length
  const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null

  useEffect(() => {
    if (!singleSelectedId || focusedId === singleSelectedId) return
    if (lastRequestedFocusRef.current === singleSelectedId) return
    lastRequestedFocusRef.current = singleSelectedId
    onFocusRef.current?.(singleSelectedId)
  }, [focusedId, singleSelectedId])

  const focusEntry = (id: string, alreadySelected: boolean) => {
    if (id === focusedId && alreadySelected) {
      onToggleSelect(id, false)
      const fallback =
        (previousFocusedId &&
        previousFocusedId !== id &&
        entries.some((entry) => entry.id === previousFocusedId)
          ? previousFocusedId
          : selectedIds.find((selectedId) => selectedId !== id)) || null
      setPreviousFocusedId(null)
      if (fallback) {
        skipAutoFocusRef.current = false
        lastRequestedFocusRef.current = fallback
        onFocus?.(fallback)
        return
      }
      skipAutoFocusRef.current = true
      lastRequestedFocusRef.current = null
      onFocus?.(null)
      return
    }

    skipAutoFocusRef.current = false
    if (focusedId && selectedIds.includes(focusedId)) {
      setPreviousFocusedId(focusedId)
    } else {
      setPreviousFocusedId(null)
    }
    lastRequestedFocusRef.current = id
    onFocus?.(id)
    if (!alreadySelected) onToggleSelect(id, true)
  }

  const gridClassName =
    'grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3'

  const selectAllControls = (
    <div className='flex min-w-0 items-center gap-2 ml-2'>
      <InputCheckbox
        aria-label={t`Select all files`}
        checked={allSelected}
        indeterminate={someSelected}
        onChange={onSelectAll}
      />
      <span className='text-13 font-medium whitespace-nowrap text-gray-11'>
        {selectedCount > 0 ? t`${selectedCount} selected` : t`Select all`}
      </span>
      {selectedCount > 0 ? (
        <div className='ml-1 flex items-center gap-2'>
          {exportableSelectedCount === selectedCount ? (
            <BaseButton
              color='primary'
              disabled={isBulkExporting || isBulkDeleting}
              icon='tabler:file-export'
              label={t`Export selected`}
              loading={isBulkExporting}
              size='xs'
              onClick={onBulkExport}
            />
          ) : null}
          <BaseButton
            color='red'
            disabled={isBulkDeleting || isBulkExporting}
            icon='lucide:trash-2'
            label={t`Delete selected`}
            loading={isBulkDeleting}
            size='xs'
            onClick={onBulkDelete}
          />
        </div>
      ) : null}
    </div>
  )

  const searchControl = (
    <div className='w-full max-w-xs sm:w-72'>
      <InputText
        leftSection={<Icon className='size-4 text-primary-11' name='lucide:search' />}
        leftSectionWidth={28}
        placeholder={t`Search media`}
        value={search}
        classNames={{
          input: '!pl-8',
          section: 'bg-primary-4 text-primary-11',
        }}
        onChange={(value) => setSearch(String(value ?? ''))}
      />
    </div>
  )

  const renderCard = (entry: QueuedUploadFile) => {
    const selected = selectedIds.includes(entry.id)
    const isCurrent = entry.id === focusedId
    const requiredFields = repositoryFields.filter(
      (field) => field.isMandatory,
    )
    const requiredFilled = requiredFields.filter((field) => {
      const raw = String(
        entry.fieldValues[field.sqlColumnName || field.id] ?? '',
      )
        .trim()
        .toLowerCase()
      return Boolean(raw) && raw !== 'null' && raw !== 'undefined'
    }).length
    const requiredTotal = requiredFields.length
    const requiredDone =
      requiredFields.length === 0 ||
      requiredFilled === requiredFields.length
    const status = getCardStatus(entry, requiredDone, t)
    const fileUrl = entry.previewUrl
    const previewFailed = failedPreviewIds.has(entry.id)
    const showImage = Boolean(
      fileUrl && isImageFile(entry.fileName) && !previewFailed,
    )
    const showPdfThumb = isPdfFile(entry.fileName) && !previewFailed
    const pdfSourceId = entry.stageFileId || null
    const showWordThumb =
      isWordFile(entry.fileName) && !previewFailed
    const wordSourceId = entry.stageFileId || null
    const canSelect =
      entry.status !== 'indexing' && entry.status !== 'indexed'
    const fileTypeFallback = (
      <div className='flex h-full w-full items-center justify-center px-2'>
        <FileTypeIcon fileName={entry.fileName} />
      </div>
    )

    return (
      <div
        key={entry.id}
        role='button'
        tabIndex={0}
        className={cn(
          'group/card relative flex cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-surface text-left transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-1 active:translate-y-0 active:scale-[0.99]',
          isCurrent
            ? 'border-primary-9'
            : selected
              ? 'border-secondary-9 bg-gray-2'
              : 'border-gray-3 hover:border-gray-5',
        )}
        onClick={() => {
          if (!canSelect) {
            onFocus?.(entry.id)
            return
          }
          focusEntry(entry.id, selected)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          if (!canSelect) {
            onFocus?.(entry.id)
            return
          }
          focusEntry(entry.id, selected)
        }}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-1 border-b px-2 py-1',
            isCurrent
              ? 'border-primary-5 bg-primary-4'
              : selected
                ? 'border-gray-4 bg-gray-3'
                : 'border-gray-3 bg-surface',
          )}
        >
          <span
            className='inline-flex'
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <InputCheckbox
              aria-label={t`Select file`}
              checked={selected}
              disabled={!canSelect}
              onChange={(checked) => {
                if (!checked) {
                  if (entry.id === focusedId) {
                    focusEntry(entry.id, true)
                    return
                  }
                  onToggleSelect(entry.id, false)
                  if (previousFocusedId === entry.id) {
                    setPreviousFocusedId(null)
                  }
                  return
                }
                onToggleSelect(entry.id, true)
                if (entry.id !== focusedId) focusEntry(entry.id, true)
              }}
            />
          </span>
          <div className='flex shrink-0 items-center gap-1.5'>
            {entry.status === 'ready' ? (
              requiredTotal > 0 ? (
                <RequiredProgressPie
                  filled={requiredFilled}
                  total={requiredTotal}
                />
              ) : (
                <Tooltip content={t`Ready`} position='top'>
                  <span className='inline-flex size-4 shrink-0 items-center justify-center text-green-9'>
                    <Icon className='size-4' name='lucide:circle-check' />
                  </span>
                </Tooltip>
              )
            ) : (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                  STATUS_TONE[status.tone].badge,
                )}
                title={status.label}
              >
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    STATUS_TONE[status.tone].dot,
                  )}
                />
                {status.label}
              </span>
            )}
            <IconButton
              ariaLabel={t`Remove file`}
              color='red'
              disabled={entry.status === 'indexed'}
              icon='lucide:trash-2'
              size='xs'
              variant='ghost'
              onClick={(event) => {
                event.stopPropagation()
                onRemove(entry.id)
              }}
            />
          </div>
        </div>

        <div className='relative aspect-square w-full overflow-hidden bg-gray-2'>
          <div
            className={cn(
              'h-full w-full origin-center transition-transform duration-300 ease-out group-hover/card:scale-105',
              selected &&
                !isCurrent &&
                'brightness-105 grayscale-[0.45]',
            )}
          >
          {showImage ? (
            <img
              alt={entry.fileName}
              className='h-full w-full object-cover'
              src={fileUrl || undefined}
              onError={() => markPreviewFailed(entry.id)}
            />
          ) : showPdfThumb ? (
            <PdfThumbnail
              cacheKey={entry.id}
              fallback={fileTypeFallback}
              fileName={entry.fileName}
              fileUrl={fileUrl || undefined}
              priority={primarySet.has(entry.id)}
              stageFileId={pdfSourceId || undefined}
            />
          ) : showWordThumb ? (
            <WordThumbnail
              fallback={fileTypeFallback}
              fileName={entry.fileName}
              fileUrl={fileUrl || undefined}
              priority={primarySet.has(entry.id)}
              stageFileId={wordSourceId || undefined}
            />
          ) : !fileUrl && isImageFile(entry.fileName) ? (
            <Skeleton className='h-full w-full rounded-none' />
          ) : (
            fileTypeFallback
          )}
          </div>
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-[1] transition-colors duration-200',
              selected && !isCurrent
                ? 'bg-gray-3/45'
                : 'bg-gray-12/0 group-hover/card:bg-gray-12/20',
            )}
          />
          <Tooltip
            className='absolute top-2 right-2 z-10'
            content={t`Open file`}
            offset={4}
            position='bottom'
          >
            <button
              aria-label={t`Open file`}
              className='flex size-5 items-center justify-center rounded-sm bg-gray-2 text-gray-12 opacity-0 shadow-sm transition-[opacity,background-color,transform] duration-150 group-hover/card:opacity-100 hover:bg-gray-3 active:scale-95'
              disabled={entry.status === 'indexing'}
              type='button'
              onClick={(event) => {
                event.stopPropagation()
                if (entry.status !== 'indexing') onOpen(entry.id)
              }}
            >
              <Icon className='size-3' name='lucide:expand' />
            </button>
          </Tooltip>
          {status.progress ? (
            // In-progress strip along the bottom of the preview.
            <div
              aria-busy='true'
              className='absolute inset-x-0 bottom-0 z-[2] border-t border-gray-3 bg-surface/95 px-2 py-1.5'
            >
              <p className='mb-1 truncate text-[10px] font-medium text-gray-11'>
                {status.progress}
              </p>
              <div
                className={cn(
                  'relative h-1 w-full overflow-hidden rounded-full',
                  STATUS_TONE[status.tone].track,
                )}
              >
                <motion.div
                  animate={{ x: ['-10%', '160%'] }}
                  className={cn(
                    'absolute inset-y-0 w-2/5 rounded-full',
                    STATUS_TONE[status.tone].dot,
                  )}
                  transition={{
                    duration: 1.15,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className='border-t border-gray-3 px-3 py-2.5'>
          {(() => {
            const sizeLabel =
              entry.fileSize > 0 ? formatBytes(entry.fileSize) : '—'
            const createdLabel =
              formatCardDate(entry.createdAt, t) || '—'
            const extIcon = getFileIcon(entry.fileName)

            return (
              <div className='flex flex-col gap-1.5'>
                <div className='flex min-w-0 items-center gap-1.5'>
                  <Icon className='size-4 shrink-0' name={extIcon} />
                  <p
                    className='min-w-0 flex-1 truncate text-12 font-semibold leading-snug text-gray-12 group-hover/card:whitespace-normal group-hover/card:break-all'
                    title={entry.fileName}
                  >
                    {entry.fileName}
                  </p>
                </div>
                <div className='flex items-center justify-between gap-2 text-11 text-gray-10'>
                  <span className='min-w-0 truncate'>{sizeLabel}</span>
                  <span className='shrink-0'>{createdLabel}</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {fullPage ? (
        <div className='flex shrink-0 flex-col border-b border-gray-3 bg-surface'>
          <div className='flex items-center gap-3 px-5 py-4'>
            {onBack ? (
              <IconButton
                ariaLabel={t`Back`}
                color='gray'
                icon='lucide:arrow-left'
                size='sm'
                variant='ghost'
                onClick={onBack}
              />
            ) : null}
            {title ? (
              <div className='min-w-0'>
                <p className='text-16 font-semibold tracking-tight text-gray-13'>
                  {title}
                </p>
              </div>
            ) : null}
            {onBack ? (
              <BaseButton
                className='ml-auto'
                color='gray'
                icon='lucide:upload'
                label={t`Upload`}
                size='xs'
                variant='outline'
                onClick={onBack}
              />
            ) : null}
          </div>
          <div className='flex items-center justify-between gap-4 border-t border-gray-3 px-5 py-3'>
            {selectAllControls}
            {searchControl}
          </div>
        </div>
      ) : (
        <div className='flex items-center justify-between gap-3 px-1 pb-3'>
          {selectAllControls}
          {searchControl}
        </div>
      )}

      <div className='flex min-h-0 flex-1'>
      <div
        className={cn(
          'ez-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface',
          fullPage ? 'px-5 pt-1 pb-4' : 'rounded-xl border border-gray-3 p-3',
        )}
      >
        {hasPrimarySection ? (
          <div className='flex flex-col gap-3 pt-2'>
            {/* Current upload */}
            <div className='animate-in fade-in flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-primary-3 bg-primary-1 px-4 py-2.5 duration-300'>
              <span className='text-13 font-semibold text-gray-12'>
                {t`Current upload`}
                <span className='font-normal text-gray-10'>
                  {' '}
                  · {t`${primaryCount} files`}
                  {uploadStartedLabel ? ` · ${uploadStartedLabel}` : ''}
                </span>
              </span>

              {isStartingUpload ? (
                <>
                  <div className='h-2 w-36 overflow-hidden rounded-full bg-primary-3 sm:w-44'>
                    <motion.div
                      animate={{ x: ['-40%', '260%'] }}
                      className='h-full w-2/5 rounded-full bg-primary-9'
                      transition={{
                        duration: 1.2,
                        ease: 'easeInOut',
                        repeat: Infinity,
                      }}
                    />
                  </div>
                  <span className='text-12 text-gray-11'>
                    {t`${primaryCount} queued`}
                  </span>
                </>
              ) : (
                <>
                  {/* Inline segmented progress bar */}
                  <div
                    aria-label={t`Upload status`}
                    className='flex h-2 w-36 gap-0.5 overflow-hidden rounded-full bg-gray-3 sm:w-44'
                    role='img'
                  >
                    {progressSegments.map((segment) => (
                      <motion.span
                        animate={{ flexGrow: segment.count }}
                        initial={{ flexGrow: 0 }}
                        key={segment.key}
                        title={`${segment.label}: ${segment.count}`}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={cn(
                          'relative h-full min-w-1.5 basis-0 overflow-hidden transition-opacity hover:opacity-80',
                          STATUS_TONE[segment.tone].dot,
                        )}
                      >
                        {segment.key === 'extracting' ||
                        segment.key === 'uploading' ? (
                          <motion.span
                            animate={{ x: ['-100%', '300%'] }}
                            className='absolute inset-y-0 w-1/3 bg-surface/35'
                            transition={{
                              duration: 1.4,
                              ease: 'easeInOut',
                              repeat: Infinity,
                            }}
                          />
                        ) : null}
                      </motion.span>
                    ))}
                  </div>

                  {/* Inline status breakdown: "2 ready · 1 extracting · 1 uploading · 1 queued" */}
                  <div className='flex flex-wrap items-center gap-x-2 text-12 text-gray-11'>
                    {progressSegments.map((segment, index) => (
                      <span
                        className='inline-flex items-center gap-1.5'
                        key={segment.key}
                      >
                        {index > 0 ? (
                          <span className='text-gray-7'>·</span>
                        ) : null}
                        <span>
                          <span className='font-semibold text-gray-12'>
                            {segment.count}
                          </span>{' '}
                          {segment.label}
                        </span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {isStartingUpload ? (
              <div className={gridClassName}>
                {primaryEntries.map((entry) => (
                  <DraftCardSkeleton key={entry.id} />
                ))}
              </div>
            ) : primaryEntries.length > 0 ? (
              <div className={gridClassName}>
                {primaryEntries.map(renderCard)}
              </div>
            ) : (
              <p className='px-3 py-6 text-center text-13 font-medium text-gray-10'>
                {t`No files match your search.`}
              </p>
            )}


            {/* Earlier drafts: loaded only on request, below this upload. */}
            <div className='mt-2 flex items-center gap-2 rounded-lg border border-gray-3 bg-gray-1 px-3 py-2'>
              <button
                aria-expanded={otherDraftsState === 'loaded' && !earlierCollapsed}
                className='flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left'
                type='button'
                onClick={() => {
                  if (otherDraftsState === 'hidden') onShowOtherDrafts?.()
                  else if (otherDraftsState === 'loaded')
                    setEarlierCollapsed((prev) => !prev)
                }}
              >
                <Icon
                  name='lucide:chevron-right'
                  className={cn(
                    'size-4 shrink-0 text-gray-9 transition-transform duration-200',
                    otherDraftsState === 'loaded' &&
                      !earlierCollapsed &&
                      'rotate-90',
                  )}
                />
                <span className='truncate text-13 font-semibold text-gray-12'>
                  {t`Earlier drafts`}
                  <span className='font-normal text-gray-10'>
                    {' '}
                    · {t`${earlierCount} not exported`}
                  </span>
                </span>
                {otherDraftsState === 'loaded' && olderThanWeekCount > 0 ? (
                  <span className='shrink-0 rounded-full bg-orange-2 px-2 py-0.5 text-[11px] font-semibold text-orange-11'>
                    {t`${olderThanWeekCount} older than 7 days`}
                  </span>
                ) : null}
              </button>
              {otherDraftsState === 'hidden' ? (
                <BaseButton
                  color='gray'
                  label={t`Show earlier drafts`}
                  size='xs'
                  variant='outline'
                  onClick={onShowOtherDrafts}
                />
              ) : otherDraftsState === 'loading' ? (
                <span className='inline-flex items-center gap-1.5 text-12 text-gray-10'>
                  <Icon className='size-3.5 animate-spin' name='lucide:loader-2' />
                  {t`Loading…`}
                </span>
              ) : (
                <span className='shrink-0 text-12 text-gray-9'>
                  {t`Oldest first`}
                </span>
              )}
            </div>

            {otherDraftsState === 'loaded' && !earlierCollapsed ? (
              otherEntriesOldestFirst.length > 0 ? (
                <div
                  className={cn(gridClassName, 'animate-in fade-in duration-300')}
                >
                  {otherEntriesOldestFirst.map(renderCard)}
                </div>
              ) : (
                <p className='px-3 pb-4 text-center text-13 font-medium text-gray-10'>
                  {t`No earlier draft files.`}
                </p>
              )
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <p className='px-3 py-10 text-center text-13 font-medium text-gray-10'>
            {entries.length === 0
              ? t`No draft files yet.`
              : t`No files match your search.`}
          </p>
        ) : (
          <div className={gridClassName}>
            {filtered.map(renderCard)}
          </div>
        )}
      </div>
      {focused || entries.length > 0 ? (
        <aside className='flex w-[340px] shrink-0 flex-col border-l border-gray-3 bg-surface xl:w-[380px]'>
          {!focused ? (
            <div className='animate-in fade-in flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center duration-300'>
              <span className='mb-1 flex size-10 items-center justify-center rounded-full bg-gray-2 text-gray-9'>
                <Icon className='size-5' name='lucide:scan-text' />
              </span>
              <p className='text-13 font-semibold text-gray-12'>
                {t`Extracted Data`}
              </p>
              <p className='max-w-[240px] text-12 leading-relaxed text-gray-10'>
                {readyIdsKey
                  ? t`Select a file to view its extracted data.`
                  : t`Fields appear here as soon as the first file finishes extracting.`}
              </p>
            </div>
          ) : (
            <DraftAttachmentFields
              key={focused.id}
              exportDisabled={
                focused.status !== 'ready' ||
                Boolean(missingMandatoryById[focused.id])
              }
              exportLoading={
                focused.status === 'indexing' ||
                focused.exportStatus === 'exporting'
              }
              fieldStatuses={focused.fieldStatuses}
              fieldValues={focused.fieldValues}
              fields={repositoryFields}
              fileName={focused.fileName}
              ocrExtractedValues={focused.ocrExtractedValues}
              rawOcrJson={focused.rawOcrJson}
              isAnalyzing={
                focused.status === 'analyzing' || focused.status === 'queued'
              }
              onExport={() => onExport?.(focused.id)}
              onFieldChange={(fieldKey, value) =>
                onFieldChange?.(focused.id, fieldKey, value)
              }
              onRegenerate={
                onRegenerate ? () => onRegenerate(focused.id) : undefined
              }
            />
          )}
        </aside>
      ) : null}
      </div>
    </div>
  )
}
