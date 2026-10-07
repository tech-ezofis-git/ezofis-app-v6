import { useLingui } from '@lingui/react/macro'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import BaseButton from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputText from '@/components/base/inputs/InputText'
import Tooltip from '@/components/base/Tooltip'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import cn from '@/utils/cn'
import PdfThumbnail from './PdfThumbnail'
import type { QueuedUploadFile } from './uploadQueueTypes'
import { formatCreatedAt } from './UploadQueueFileCard'

type DraftFilesMediaLibraryProps = {
  allSelected: boolean
  entries: QueuedUploadFile[]
  exportableSelectedCount?: number
  fullPage?: boolean
  isBulkDeleting?: boolean
  isBulkExporting?: boolean
  missingMandatoryById: Record<string, boolean>
  selectedIds: string[]
  someSelected: boolean
  title?: string
  onBack?: () => void
  onBulkDelete: () => void
  onBulkExport: () => void
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onSelectAll: (checked: boolean) => void
  onToggleSelect: (id: string, checked: boolean) => void
}

const isImageFile = (fileName: string) =>
  /\.(bmp|jpeg|jpg|png|svg|tif|tiff|webp)$/i.test(fileName)

const isPdfFile = (fileName: string) => /\.pdf$/i.test(fileName)

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
  fullPage = false,
  isBulkDeleting = false,
  isBulkExporting = false,
  missingMandatoryById,
  selectedIds,
  someSelected,
  title,
  onBack,
  onBulkDelete,
  onBulkExport,
  onOpen,
  onRemove,
  onSelectAll,
  onToggleSelect,
}: DraftFilesMediaLibraryProps) {
  const { t } = useLingui()
  const [search, setSearch] = useState('')
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

  const selectedCount = selectedIds.length

  const gridClassName = cn(
    'grid gap-3',
    fullPage
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
  )

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
          {exportableSelectedCount > 1 ? (
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
        leftSection={<Icon className='size-4' name='lucide:search' />}
        placeholder={t`Search media`}
        value={search}
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

      <div
        className={cn(
          'ez-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface',
          fullPage ? 'p-4' : 'rounded-xl border border-gray-3 p-3',
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
              const needsFields = Boolean(missingMandatoryById[entry.id])
              const fileUrl = entry.previewUrl
              const previewFailed = failedPreviewIds.has(entry.id)
              const showImage = Boolean(
                fileUrl && isImageFile(entry.fileName) && !previewFailed,
              )
              const showPdfThumb = Boolean(
                fileUrl && isPdfFile(entry.fileName) && !previewFailed,
              )
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
                    'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-surface text-left transition-[border-color,box-shadow] duration-150',
                    selected
                      ? 'border-[var(--primary-9)] shadow-[0_4px_16px_color-mix(in_srgb,var(--primary-9)_35%,transparent)]'
                      : 'border-gray-3 hover:border-gray-5',
                  )}
                  onClick={() => {
                    if (entry.status !== 'indexing') onOpen(entry.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      if (entry.status !== 'indexing') onOpen(entry.id)
                    }
                  }}
                >
                  <div
                    className='flex items-center justify-between gap-1 border-b border-gray-3 px-2 py-1'
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <InputCheckbox
                      aria-label={t`Select file`}
                      checked={selected}
                      disabled={!canSelect}
                      onChange={(checked) =>
                        onToggleSelect(entry.id, checked)
                      }
                    />
                    <div className='flex items-center gap-0.5'>
                      {entry.status === 'ready' ? (
                        needsFields ? (
                          <Tooltip content={t`Mandatory Fields Missing`}>
                            <span className='flex size-7 items-center justify-center text-[var(--orange-9)]'>
                              <Icon
                                className='size-4'
                                name='lucide:alert-circle'
                              />
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip content={t`Ready To Export`}>
                            <span className='flex size-7 items-center justify-center text-[var(--green-9)]'>
                              <Icon
                                className='size-4'
                                name='lucide:circle-check'
                              />
                            </span>
                          </Tooltip>
                        )
                      ) : null}
                      <IconButton
                        ariaLabel={t`Remove file`}
                        color='red'
                        disabled={entry.status === 'indexed'}
                        icon='lucide:trash-2'
                        size='xs'
                        variant='ghost'
                        onClick={() => onRemove(entry.id)}
                      />
                    </div>
                  </div>

                  <div className='relative aspect-square w-full overflow-hidden bg-gray-2'>
                    {showImage ? (
                      <img
                        alt={entry.fileName}
                        className='h-full w-full object-cover'
                        src={fileUrl || undefined}
                        onError={() => markPreviewFailed(entry.id)}
                      />
                    ) : showPdfThumb && fileUrl ? (
                      <PdfThumbnail
                        fileName={entry.fileName}
                        fileUrl={fileUrl}
                        fallback={fileTypeFallback}
                      />
                    ) : (
                      fileTypeFallback
                    )}
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
                                className='min-w-0 flex-1 truncate text-12 font-semibold leading-snug text-gray-12 group-hover:whitespace-normal group-hover:break-all'
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
                              className='min-w-0 flex-1 truncate text-12 font-semibold leading-snug text-gray-12 group-hover:whitespace-normal group-hover:break-all'
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
    </div>
  )
}
