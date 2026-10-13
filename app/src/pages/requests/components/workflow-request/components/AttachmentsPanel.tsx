import { useLingui } from '@lingui/react/macro'
import { useRef } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import {
  getFileIcon,
  getFileIconClasses,
} from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'
import { formatFileSize, getFileExtension } from '../utils/fieldRendering'
import CompactDropzone from './CompactDropzone'

export interface AttachmentEntry {
  fileName: string
  localId: string
  repositoryId: string
  // Set once the file is actually staged (uploadWithOcr) — deferred to
  // submit time, after mandatory-field validation passes. Until then this
  // carries `rawFile` instead: OCR has already run against it (via
  // uploadForOcr), but nothing's been persisted to the stage table yet.
  fileId?: string
  // False from the moment the file is added until uploadForOcr (phase 1)
  // resolves (success or failure). stagePendingFiles' auto-trigger gates on
  // this so it never fires uploadWithOcr — and builds its `metadata` — before
  // phase 1 has had a chance to fill in the extracted fields.
  ocrChecked?: boolean
  // The uploadForOcr response, carried along so stagePendingFiles can
  // forward the already-extracted data to uploadWithOcr instead of the
  // backend re-running OCR (and getting an empty/blank result) a second
  // time.
  ocrFieldList?: { name?: string; type?: string | null; value?: string }[]
  ocrJson?: string
  rawFile?: File
  size?: number
}

interface Props {
  attachments: AttachmentEntry[]
  isUploading: boolean
  onAdd: (files: FileList | null) => void
  onRemove: (localId: string) => void
  onClose?: () => void
}

// General, request-level attachments (not tied to a specific form field) —
// visually matches the existing request-detail Attachments section
// (same file-type icon/color mapping), but is local-only until submit:
// there's no instanceId yet to attach files to on the backend.
const AttachmentsPanel = ({
  attachments,
  isUploading,
  onAdd,
  onClose,
  onRemove,
}: Props) => {
  const { t } = useLingui()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const session = authUserStore((state) => state.session)
  const uploadedBy = session?.email || session?.name || ''

  if (onClose) {
    return (
      <div className='flex h-full min-h-0 w-full flex-col'>
        <input
          className='hidden'
          ref={fileInputRef}
          type='file'
          multiple
          onChange={(event) => {
            onAdd(event.target.files)
            event.target.value = ''
          }}
        />
        <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
          <span className='text-xs font-semibold text-gray-12'>
            {t`Attachments`} ({attachments.length})
          </span>
          <div className='flex items-center gap-1'>
            <Button
              disabled={isUploading}
              icon='tabler:upload'
              label={isUploading ? t`Uploading...` : t`Upload`}
              loading={isUploading}
              size='sm'
              type='button'
              onClick={() => fileInputRef.current?.click()}
            />
            <IconButton
              ariaLabel={t`Close`}
              icon='tabler:x'
              size='sm'
              variant='ghost'
              onClick={onClose}
            />
          </div>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
          {attachments.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-10 text-gray-8'>
              <div className='mb-3 flex size-12 items-center justify-center rounded-full bg-gray-2'>
                <Icon className='size-6 text-gray-7' name='tabler:file-off' />
              </div>
              <span className='text-13 font-medium text-gray-10'>
                {t`No attachments found`}
              </span>
            </div>
          ) : (
            <div className='flex flex-col gap-2'>
              {attachments.map((file) => {
                const ext = getFileExtension(file.fileName)
                const icon = getFileIcon(ext)
                const styles = getFileIconClasses(ext)
                const sizeStr = formatFileSize(file.size)
                return (
                  <div
                    className='group flex items-start gap-3 rounded-xl border border-gray-1 bg-surface p-3'
                    key={file.localId}
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${styles.wrap}`}
                    >
                      <Icon className='size-5' name={icon} />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-baseline gap-1.5'>
                        <span
                          className='line-clamp-1 text-13 font-semibold break-all text-gray-12'
                          title={file.fileName}
                        >
                          {file.fileName}
                        </span>
                        {sizeStr ? (
                          <span className='shrink-0 text-[11px] font-normal text-gray-8'>
                            ({sizeStr})
                          </span>
                        ) : null}
                      </div>
                      <div className='mt-0.5 flex min-w-0 items-center gap-2'>
                        <span className='shrink-0 text-[11px] text-gray-8'>
                          {formatDatetime(new Date().toISOString(), 'DD-MMM-YYYY')}
                        </span>
                        {uploadedBy ? (
                          <>
                            <span className='size-0.5 shrink-0 rounded-full bg-gray-4' />
                            <span className='min-w-0 truncate text-[11px] font-medium text-gray-9'>
                              {uploadedBy}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <button
                      aria-label={t`Remove attachment`}
                      className='flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-8 opacity-0 transition-colors group-hover:opacity-100 hover:bg-gray-2 hover:text-red-9'
                      type='button'
                      onClick={() => onRemove(file.localId)}
                    >
                      <Icon className='size-4' name='tabler:x' />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='rounded-xl border border-gray-3 bg-gray-0 p-4 shadow-2xs'>
      <div className='mb-3 flex items-center justify-between gap-2.5'>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-8 items-center justify-center rounded-lg bg-primary-1'>
            <Icon className='size-4 text-primary-9' name='tabler:paperclip' />
          </div>
          <div>
            <h3 className='text-14 font-bold text-gray-13'>{t`Attachments`}</h3>
            <p className='text-11 text-gray-9'>{t`Optional supporting documents`}</p>
          </div>
        </div>
        {attachments.length > 0 && (
          <span className='rounded-full bg-gray-2 px-2 py-0.5 text-11 font-semibold text-gray-10'>
            {attachments.length}
          </span>
        )}
      </div>

      <CompactDropzone
        helperText={t`Any file type`}
        isLoading={isUploading}
        loadingText={t`Extracting data from the document…`}
        multiple
        onFiles={onAdd}
      />

      <div className='mt-3 flex flex-col gap-2'>
        {attachments.length === 0 ? (
          <div className='flex items-center gap-2 rounded-lg border border-dashed border-gray-3 px-3 py-2.5 text-12 text-gray-8'>
            <Icon className='size-3.5 shrink-0' name='tabler:file-off' />
            {t`No files added yet`}
          </div>
        ) : (
          attachments.map((file) => {
            const ext = getFileExtension(file.fileName)
            const icon = getFileIcon(ext)
            const styles = getFileIconClasses(ext)
            const sizeStr = formatFileSize(file.size)

            return (
              <div
                className='group flex items-center gap-2.5 rounded-lg border border-gray-2 bg-surface p-2 transition-colors hover:border-gray-4'
                key={file.localId}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styles.wrap}`}
                >
                  <Icon className='size-4' name={icon} />
                </div>
                <div className='min-w-0 flex-1'>
                  <div
                    className='truncate text-12 font-semibold text-gray-12'
                    title={file.fileName}
                  >
                    {file.fileName}
                  </div>
                  {sizeStr && (
                    <div className='text-11 text-gray-8'>{sizeStr}</div>
                  )}
                </div>
                <button
                  aria-label={t`Remove attachment`}
                  className='flex size-6 shrink-0 items-center justify-center rounded-md text-gray-8 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-2 hover:text-red-9 active:scale-90'
                  type='button'
                  onClick={() => onRemove(file.localId)}
                >
                  <Icon className='size-3.5' name='tabler:x' />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

AttachmentsPanel.displayName = 'AttachmentsPanel'
export default AttachmentsPanel
