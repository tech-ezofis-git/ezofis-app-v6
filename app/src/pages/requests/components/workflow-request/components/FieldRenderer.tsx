import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Option } from '@/types/option'
import { uploadForOcr } from '@/api/v6/folder/folder'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
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
  getFieldOptions,
  getFileExtension,
  isFieldReadOnly,
  isFieldRequired,
} from '../utils/fieldRendering'
import CompactDropzone from './CompactDropzone'

interface Props {
  field: any
  repositoryId: string | undefined
  value: any
  error?: string
  repoFieldHints?: string[]
  viewOnly?: boolean
  onChange: (value: any) => void
  onOcrFieldList?: (
    list: { name?: string; value?: string }[] | undefined,
  ) => void
}

interface StagedFileValue {
  fileName: string
  fileId?: string
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
  field,
  repoFieldHints,
  repositoryId,
  value,
  viewOnly,
  onChange,
  onOcrFieldList,
}: Props) => {
  const { t } = useLingui()
  const [isUploading, setIsUploading] = useState(false)
  const general = field?.settings?.general || {}
  const required = isFieldRequired(field)
  const readOnly = viewOnly || isFieldReadOnly(field)

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

    case 'DATE':
      return <InputDate {...common} value={value ?? null} onChange={onChange} />
    case 'DATE_TIME':
      return <InputDate {...common} value={value ?? null} onChange={onChange} />
    case 'TIME':
      return <InputTime {...common} value={value ?? null} onChange={onChange} />

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

    case 'MULTIPLE_CHOICE':
    case 'MULTI_SELECT': {
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

      const staged: StagedFileValue | null = value || null

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

        const fileEntry = { fileName: file.name, rawFile: file, repositoryId }
        onChange(fileEntry)

        setIsUploading(true)
        const { data, error } = await uploadForOcr(
          repositoryId,
          file,
          repoFieldHints || [],
        )
        setIsUploading(false)

        if (error || !data) {
          console.warn('[uploadForOcr] OCR extraction warning:', error || 'OCR data unavailable')
          return
        }

        onOcrFieldList?.(data.ocrFieldList)
        onChange({
          ...fileEntry,
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
          {staged && styles ? (
            <div className='flex items-center gap-2.5 rounded-lg border border-gray-2 bg-surface p-2'>
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styles.wrap}`}
              >
                <Icon className='size-4' name={icon} />
              </div>
              <div
                className='min-w-0 flex-1 truncate text-12 font-semibold text-gray-12'
                title={staged.fileName}
              >
                {staged.fileName}
              </div>
              {!readOnly && (
                <button
                  aria-label={t`Remove file`}
                  className='flex size-6 shrink-0 items-center justify-center rounded-md text-gray-8 transition-all hover:bg-red-2 hover:text-red-9 active:scale-90'
                  type='button'
                  onClick={() => onChange(null)}
                >
                  <Icon className='size-3.5' name='tabler:x' />
                </button>
              )}
            </div>
          ) : (
            <CompactDropzone
              accept={field.type === 'IMAGE_UPLOAD' ? 'image/*' : '*/*'}
              disabled={readOnly}
              isLoading={isUploading}
              loadingText={t`Uploading…`}
              onFiles={handleFiles}
            />
          )}
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
