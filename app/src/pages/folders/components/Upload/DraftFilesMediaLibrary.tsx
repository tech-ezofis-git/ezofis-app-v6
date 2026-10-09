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
  onToggleSelect: (id: string, checked: boolean) => void
}

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

/** Date only (no time) for card footers. */
function formatCreatedDateOnly(value?: string) {
  const full = formatCreatedAt(value)
  if (!full) return ''
  return full
    .replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?$/, '')
    .trim()
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
  onToggleSelect,
}: DraftFilesMediaLibraryProps) {
  const { t } = useLingui()
  const didSelectFirstRef = useRef(false)
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

  useEffect(() => {
    if (!filtered.length) return
    if (skipAutoFocusRef.current) return

    if (!didSelectFirstRef.current) {
      didSelectFirstRef.current = true
      const preferred =
        filtered.find((entry) => entry.id === focusedId) ||
        filtered.find((entry) => selectedIds.includes(entry.id)) ||
        filtered[0]
      if (!preferred) return
      lastRequestedFocusRef.current = preferred.id
      onFocusRef.current?.(preferred.id)
      if (!selectedIds.includes(preferred.id)) {
        onToggleSelectRef.current(preferred.id, true)
      }
      return
    }

    if (focusedId && entries.some((entry) => entry.id === focusedId)) return
    const nextId = filtered[0].id
    if (lastRequestedFocusRef.current === nextId) return
    lastRequestedFocusRef.current = nextId
    onFocusRef.current?.(nextId)
    // entryIdsKey tracks membership; `entries` is read for the latest row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryIdsKey, focusedId])

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
        {filtered.length === 0 ? (
          <p className='px-3 py-10 text-center text-13 font-medium text-gray-10'>
            {entries.length === 0
              ? t`No draft files yet.`
              : t`No files match your search.`}
          </p>
        ) : (
          <div className={gridClassName}>
            {filtered.map((entry) => {
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
              const requiredDone =
                requiredFields.length === 0 ||
                requiredFilled === requiredFields.length
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
              const isUploadInProgress =
                entry.status === 'queued' ||
                entry.status === 'analyzing' ||
                entry.status === 'indexing'
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
                    <div className='flex items-center gap-0.5'>
                      {entry.status === 'ready' && requiredFields.length > 0 ? (
                        requiredDone ? (
                          <Tooltip
                            content={t`All ${requiredFields.length} Mandatory Fields Filled.`}
                            position='top'
                          >
                            <span className='flex size-7 items-center justify-center text-green-9'>
                              <Icon
                                className='size-4'
                                name='lucide:circle-check'
                              />
                            </span>
                          </Tooltip>
                        ) : (
                          <RequiredProgressPie
                            filled={requiredFilled}
                            total={requiredFields.length}
                          />
                        )
                      ) : null}
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
                        stageFileId={pdfSourceId || undefined}
                      />
                    ) : showWordThumb ? (
                      <WordThumbnail
                        fallback={fileTypeFallback}
                        fileName={entry.fileName}
                        fileUrl={fileUrl || undefined}
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
                  </div>

                  <div className='border-t border-gray-3 px-3 py-2.5'>
                    {(() => {
                      const sizeLabel =
                        entry.fileSize > 0 ? formatBytes(entry.fileSize) : '—'
                      const createdLabel =
                        formatCreatedDateOnly(entry.createdAt) || '—'
                      const extIcon = getFileIcon(entry.fileName)

                      if (isUploadInProgress) {
                        return (
                          <div
                            aria-busy='true'
                            aria-label={
                              entry.status === 'indexing'
                                ? t`Indexing…`
                                : entry.status === 'analyzing'
                                  ? t`Analyzing…`
                                  : t`Uploading…`
                            }
                            className='flex flex-col gap-1.5'
                          >
                            <div className='flex min-w-0 items-center gap-1.5'>
                              <Icon
                                className='size-4 shrink-0'
                                name={extIcon}
                              />
                              <p
                                className='min-w-0 flex-1 truncate text-12 font-semibold leading-snug text-gray-12 group-hover/card:whitespace-normal group-hover/card:break-all'
                                title={entry.fileName}
                              >
                                {entry.fileName}
                              </p>
                            </div>
                            <div className='flex items-center justify-between gap-2 text-11 text-gray-10'>
                              <span className='min-w-0 truncate'>
                                {sizeLabel}
                              </span>
                              <span className='shrink-0'>{createdLabel}</span>
                            </div>
                            <div className='relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--blue-3)]'>
                              <motion.div
                                animate={{ x: ['-10%', '160%'] }}
                                className='absolute inset-y-0 w-2/5 rounded-full bg-[var(--blue-9)]'
                                transition={{
                                  duration: 1.15,
                                  ease: 'easeInOut',
                                  repeat: Infinity,
                                }}
                              />
                            </div>
                          </div>
                        )
                      }

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
            })}
          </div>
        )}
      </div>
      {focused ? (
        <aside className='flex w-[340px] shrink-0 flex-col border-l border-gray-3 bg-surface xl:w-[380px]'>
          {!focused ? (
            <p className='px-4 py-10 text-center text-13 text-gray-10'>
              {t`Select a file to view extracted data.`}
            </p>
          ) : (
            <DraftAttachmentFields
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
