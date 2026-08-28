import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Option } from '@/types/option'
import { uploadForOcr, getRepositoryItemFacets } from '@/api/v6/folder/folder'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputDateTime from '@/components/base/inputs/InputDateTime'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import InputTime from '@/components/base/inputs/InputTime'
import showToast from '@/components/base/toast/showToast'
import {
  getFileIcon,
  getFileIconClasses,
} from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import {
  getDateTimeLimits,
  getFieldOptions,
  getFileExtension,
  isFieldReadOnly,
  isFieldRequired,
} from '../utils/fieldRendering'
import CompactDropzone from './CompactDropzone'
import TableFieldRenderer from './TableFieldRenderer'

interface Props {
  field: any
  repositoryId: string | undefined
  value: any
  error?: string
  // Already-submitted instance attachments known to belong to THIS field
  // (see WorkflowFormRenderer's getFieldAttachmentMap) — shown below it
  // when the field has no in-session value of its own (e.g. after a page
  // reload, since FILE_UPLOAD values never round-trip through formData).
  fallbackAttachments?: any[]
  repoFieldHints?: string[]
  viewOnly?: boolean
  onChange: (value: any) => void
  onOcrFieldList?: (
    list: { name?: string; value?: string }[] | undefined,
  ) => void
  // Clicking an already-uploaded file below this field opens it in the
  // owning screen's full-screen preview.
  onOpenAttachment?: (attachment: any) => void
  // Set only on the Overview of an already-submitted request (never during
  // New Request compose): there is no later submit() to stage the file, so
  // the owning screen takes over and uploads it for real.
  onRequestUpload?: (file: File) => void
}

interface StagedFileValue {
  fileName: string
  fileId?: string
  // See AttachmentEntry.ocrChecked in AttachmentsPanel.tsx — same purpose.
  ocrChecked?: boolean
  // Carried from the uploadForOcr response so stagePendingFiles can forward
  // the already-extracted data to uploadWithOcr instead of the backend
  // re-running OCR (and getting an empty/blank result) a second time.
  ocrFieldList?: { name?: string; type?: string | null; value?: string }[]
  ocrJson?: string
  rawFile?: File
  repositoryId?: string
}

// Renders a single form-builder field using the app's existing
// @/components/base input components. Field types outside the MVP set
// (TABLE, MATRIX, SIGNATURE, ADDRESS, RATING, ...) render a labeled
// placeholder instead of silently disappearing.
const FieldRenderer = ({
  error,
  fallbackAttachments,
  field,
  repoFieldHints,
  repositoryId,
  value,
  viewOnly,
  onChange,
  onOcrFieldList,
  onOpenAttachment,
  onRequestUpload,
}: Props) => {
  const { t } = useLingui()
  const [isUploading, setIsUploading] = useState(false)
  const general = field?.settings?.general || {}
  const required = isFieldRequired(field)
  const readOnly = viewOnly || isFieldReadOnly(field)

  const isRepositoryMultiSelect =
    field.type === 'MULTI_SELECT' &&
    field.settings?.specific?.optionsType === 'REPOSITORY'

  const targetRepoId =
    field.settings?.specific?.repositoryId || repositoryId || ''
  const targetRepoField = field.settings?.specific?.repositoryField || ''

  const { data: repositoryFacetOptions = [] } = useQuery({
    queryKey: ['repositoryItemFacets', targetRepoId, targetRepoField],
    queryFn: async () => {
      if (!targetRepoId || !targetRepoField) return []
      const res = await getRepositoryItemFacets({
        repositoryId: targetRepoId,
        fieldName: targetRepoField,
        limit: 1000,
      })
      return (res.data || []).map((f) => ({ id: f.value, name: f.value }))
    },
    enabled: isRepositoryMultiSelect && !!targetRepoId && !!targetRepoField,
  })

  const common = {
    disabled: readOnly,
    error,
    label: general.hideLabel ? undefined : field.label,
    placeholder: general.placeholder,
    required,
    tooltip: general.tooltip,
  }

  switch (field.type) {
    case 'HEADING':
      return <h3 className='text-15 font-bold text-gray-13'>{field.label}</h3>
    case 'LABEL':
      return <div className='text-13 font-bold text-gray-13'>{field.label}</div>
    case 'DIVIDER':
      return <div className='h-px w-full bg-gray-3' />

    case 'EMAIL':
      return (
        <InputText
          {...common}
          type='email'
          value={value || ''}
          onChange={onChange}
        />
      )
    case 'URL':
      return (
        <InputText
          {...common}
          type='url'
          value={value || ''}
          onChange={onChange}
        />
      )
    case 'PHONE_NUMBER':
      return (
        <InputText
          {...common}
          type='tel'
          value={value || ''}
          onChange={onChange}
        />
      )
    case 'PASSWORD':
      return (
        <InputText
          {...common}
          type='password'
          value={value || ''}
          onChange={onChange}
        />
      )
    case 'FULL_NAME':
    case 'SHORT_TEXT':
      return <InputText {...common} value={value || ''} onChange={onChange} />

    case 'TEXT_BUILDER':
    case 'LONG_TEXT':
      return (
        <InputTextarea
          {...common}
          rows={3}
          value={value || ''}
          onChange={onChange}
        />
      )

    case 'CURRENCY_AMOUNT':
    case 'COUNTER':
    case 'NUMBER':
      return <InputNumber {...common} value={value ?? ''} onChange={onChange} />

    case 'DATE': {
      const { minDate, maxDate } = getDateTimeLimits(field)
      return (
        <InputDate
          {...common}
          maxDate={maxDate}
          minDate={minDate}
          value={value ?? null}
          onChange={onChange}
        />
      )
    }
    case 'DATE_TIME': {
      const { minDate, maxDate } = getDateTimeLimits(field)
      const timeFormat =
        field.settings?.validation?.timeFormat === '24' ? '24h' : '12h'
      return (
        <InputDateTime
          {...common}
          format={timeFormat}
          maxDate={maxDate}
          minDate={minDate}
          value={value ?? null}
          onChange={onChange}
        />
      )
    }
    case 'TIME': {
      const { minTime, maxTime } = getDateTimeLimits(field)
      const timeFormat =
        field.settings?.validation?.timeFormat === '24' ? '24h' : '12h'
      return (
        <InputTime
          {...common}
          format={timeFormat}
          maxTime={maxTime}
          minTime={minTime}
          value={value ?? null}
          onChange={onChange}
        />
      )
    }

    case 'SINGLE_CHOICE':
    case 'SINGLE_SELECT': {
      const options = getFieldOptions(field)
      return (
        <InputSelect
          {...common}
          options={options}
          value={options.find((opt) => opt.id === value) || null}
          onChange={(opt: Option | null) => onChange(opt ? opt.id : null)}
        />
      )
    }

    case 'MULTIPLE_CHOICE': {
      const options = getFieldOptions(field)
      const selectedIds: string[] = Array.isArray(value) ? value : []
      return (
        <InputSelectMultiple
          {...common}
          options={options}
          value={options.filter((opt) => selectedIds.includes(opt.id))}
          onChange={(opts: Option[]) => onChange(opts.map((opt) => opt.id))}
        />
      )
    }

    case 'MULTI_SELECT': {
      const isRepo = field.settings?.specific?.optionsType === 'REPOSITORY'
      const options = isRepo ? repositoryFacetOptions : getFieldOptions(field)
      const selectedIds: string[] = Array.isArray(value) ? value : []
      return (
        <InputSelectMultiple
          {...common}
          options={options}
          value={options.filter((opt) => selectedIds.includes(opt.id))}
          onChange={(opts: Option[]) => onChange(opts.map((opt) => opt.id))}
        />
      )
    }

    case 'YES_NO_TOGGLE':
    case 'CONSENT':
      return (
        <div>
          <InputSwitch
            checked={Boolean(value)}
            description={general.tooltip}
            disabled={readOnly}
            error={error}
            label={field.label}
            onChange={onChange}
          />
          {error && (
            <p className='mt-1 text-12 font-medium text-red-9'>{error}</p>
          )}
        </div>
      )

    case 'IMAGE_UPLOAD':
    case 'FILE_UPLOAD': {
      // Submitted files aren't part of formData (per the integration guide
      // they travel as stagedFiles instead), so there's nothing meaningful
      // to show inline here for an already-submitted request — point at
      // the Attachments section instead of rendering a broken dropzone.
      if (viewOnly) {
        return (
          <div>
            {!general.hideLabel && (
              <label className='mb-1.5 block text-13 font-medium text-gray-12'>
                {field.label}
              </label>
            )}
            <div className='rounded-lg border border-dashed border-gray-3 bg-gray-1 px-3 py-2.5 text-12 text-gray-8'>
              {t`See the Attachments section for uploaded files.`}
            </div>
          </div>
        )
      }

      // Shown below the dropzone once a file is attached — true once phase-1
      // OCR has resolved (compose flow) or, for an already-submitted request
      // viewed on the overview, as soon as a fileId is present (that value
      // never carries ocrChecked, since staging happens once at submit).
      const staged: StagedFileValue | null =
        value?.fileName && (value.ocrChecked || value.fileId) ? value : null

      // Two-phase, matching the repository's mandatory-field rules: this
      // is phase 1 only — an OCR-only peek (uploadForOcr, nothing
      // persisted) to auto-fill matching fields. The file itself is kept
      // as `rawFile` and only actually staged (uploadWithOcr, which is
      // what produces the fileId used in `stagedFiles`) at submit time,
      // after mandatory fields are confirmed filled — see
      // useWorkflowForm's stagePendingFiles().
      const handleFiles = async (files: FileList | null) => {
        const file = files?.[0]
        if (!file) return

        if (!repositoryId) {
          showToast({
            message: t`Can't upload: this workflow has no repository configured.`,
            variant: 'error',
          })
          return
        }

        // Overview of an already-submitted request: there's no later
        // submit() to stage the file, so hand it up to the owning screen,
        // which runs the real upload through its own split-view flow (file
        // preview left, repository fields right) — see
        // GenericAttachmentSplitView.
        if (onRequestUpload) {
          onRequestUpload(file)
          return
        }

        const fileEntry = {
          fileName: file.name,
          ocrChecked: false,
          rawFile: file,
          repositoryId,
        }
        onChange(fileEntry)

        setIsUploading(true)
        const { data, error } = await uploadForOcr(
          repositoryId,
          file,
          repoFieldHints || [],
        )
        setIsUploading(false)

        if (error || !data) {
          console.warn(
            '[uploadForOcr] OCR extraction warning:',
            error || 'OCR data unavailable',
          )
          onChange({ ...fileEntry, ocrChecked: true })
          return
        }

        onOcrFieldList?.(data.ocrFieldList)
        onChange({
          ...fileEntry,
          ocrChecked: true,
          ocrFieldList: data.ocrFieldList,
          ocrJson: data.ocrJson,
        })
      }

      const ext = staged ? getFileExtension(staged.fileName) : ''
      const icon = staged ? getFileIcon(ext) : ''
      const styles = staged ? getFileIconClasses(ext) : null

      return (
        <div>
          {!general.hideLabel && (
            <label className='mb-1.5 block text-13 font-medium text-gray-12'>
              {field.label}
              {required && <span className='text-red-9'> *</span>}
            </label>
          )}
          <CompactDropzone
            accept={field.type === 'IMAGE_UPLOAD' ? 'image/*' : '*/*'}
            disabled={readOnly}
            isLoading={isUploading}
            loadingText={t`Extracting data from the document…`}
            onFiles={handleFiles}
          />
          {staged && styles && (
            <div
              className={`mt-2 flex items-center gap-2.5 rounded-lg border border-gray-2 bg-surface p-2 ${
                staged.fileId && onOpenAttachment
                  ? 'cursor-pointer transition-all hover:border-primary-5 hover:bg-primary-1/30'
                  : ''
              }`}
              onClick={() =>
                staged.fileId &&
                onOpenAttachment?.({
                  fileName: staged.fileName,
                  id: staged.fileId,
                  itemId: staged.fileId,
                  name: staged.fileName,
                  repositoryId: staged.repositoryId,
                })
              }
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styles.wrap}`}
              >
                <Icon className='size-4' name={icon} />
              </div>
              <div
                className={`min-w-0 flex-1 truncate text-12 font-semibold text-gray-12 ${
                  staged.fileId && onOpenAttachment ? 'hover:underline' : ''
                }`}
                title={staged.fileName}
              >
                {staged.fileName}
              </div>
              {!readOnly && (
                <button
                  aria-label={t`Remove file`}
                  className='flex size-6 shrink-0 items-center justify-center rounded-md text-gray-8 transition-all hover:bg-red-2 hover:text-red-9 active:scale-90'
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                >
                  <Icon className='size-3.5' name='tabler:x' />
                </button>
              )}
            </div>
          )}
          {fallbackAttachments?.map((attachment) => {
            const attName = attachment.name || attachment.fileName || ''
            const attExt = getFileExtension(attName)
            const attStyles = getFileIconClasses(attExt)
            return (
              <button
                className='mt-2 flex w-full items-center gap-2.5 rounded-lg border border-gray-2 bg-surface p-2 text-left transition-all hover:border-primary-5 hover:bg-primary-1/30 active:scale-[0.99]'
                key={attachment.id ?? attName}
                type='button'
                onClick={() => onOpenAttachment?.(attachment)}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${attStyles.wrap}`}
                >
                  <Icon className='size-4' name={getFileIcon(attExt)} />
                </div>
                <div
                  className='min-w-0 flex-1 truncate text-12 font-semibold text-gray-12'
                  title={attName}
                >
                  {attName}
                </div>
                <Icon
                  className='size-3.5 shrink-0 text-gray-8'
                  name='tabler:eye'
                />
              </button>
            )
          })}
          {error && (
            <p className='mt-1 text-12 font-medium text-red-9'>{error}</p>
          )}
        </div>
      )
    }

    case 'TABLE':
    case 'DYNAMIC_TABLE': {
      return (
        <div className='w-full'>
          <TableFieldRenderer
            field={field}
            readOnly={readOnly}
            required={required}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
          />
          {error && (
            <p className='mt-1 text-12 font-medium text-red-9'>{error}</p>
          )}
        </div>
      )
    }

    default: {
      const fieldType = field.type
      return (
        <div>
          <label className='mb-1.5 block text-13 font-medium text-gray-12'>
            {field.label}
          </label>
          <div className='rounded-lg border border-dashed border-gray-4 bg-gray-1 px-3 py-2.5 text-12 text-gray-9'>
            {t`This field type (${fieldType}) isn't supported in this view yet.`}
          </div>
        </div>
      )
    }
  }
}

FieldRenderer.displayName = 'FieldRenderer'
export default FieldRenderer
