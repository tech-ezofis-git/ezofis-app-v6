import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Option } from '@/types/option'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import InputTime from '@/components/base/inputs/InputTime'
import showToast from '@/components/base/toast/showToast'
import FileUpload from '@/components/common/file-upload/FIleUpload'
import {
  getFieldOptions,
  isFieldReadOnly,
  isFieldRequired,
} from '../utils/fieldRendering'

interface Props {
  field: any
  repositoryId: string | undefined
  value: any
  onChange: (value: any) => void
}

interface StagedFileValue {
  fileId: string
  fileName: string
  repositoryId: string
}

// Renders a single form-builder field using the app's existing
// @/components/base input components. Field types outside the MVP set
// (TABLE, MATRIX, SIGNATURE, ADDRESS, RATING, ...) render a labeled
// placeholder instead of silently disappearing.
const FieldRenderer = ({ field, repositoryId, value, onChange }: Props) => {
  const { t } = useLingui()
  const [isUploading, setIsUploading] = useState(false)
  const general = field?.settings?.general || {}
  const required = isFieldRequired(field)
  const readOnly = isFieldReadOnly(field)

  const common = {
    disabled: readOnly,
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
        <InputSwitch
          checked={Boolean(value)}
          description={general.tooltip}
          disabled={readOnly}
          label={field.label}
          onChange={onChange}
        />
      )

    case 'IMAGE_UPLOAD':
    case 'FILE_UPLOAD': {
      const staged: StagedFileValue | null = value || null

      // Per the "Normal Workflow — Frontend Integration Guide": a file
      // isn't sent with the request at submit time. It's uploaded up front
      // via uploadAndIndex.uploadWithOcr (which stages it + runs OCR), and
      // only the resulting { fileId, repositoryId } is kept here — that
      // pair is what actually goes on the request as `stagedFiles`.
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

        setIsUploading(true)
        const { data, error } = await uploadAndIndexApi.uploadWithOcr({
          file,
          repositoryId,
        })
        setIsUploading(false)

        if (error || !data) {
          const fileName = file.name
          showToast({
            message: error || t`Failed to upload ${fileName}.`,
            variant: 'error',
          })
          return
        }

        onChange({
          fileId: data.fileId,
          fileName: data.fileName || file.name,
          repositoryId: data.repositoryId || repositoryId,
        })
      }

      return (
        <div>
          {!general.hideLabel && (
            <label className='mb-1.5 block text-13 font-medium text-gray-12'>
              {field.label}
              {required && <span className='text-red-9'> *</span>}
            </label>
          )}
          <FileUpload
            accept={field.type === 'IMAGE_UPLOAD' ? 'image/*' : '*/*'}
            disabled={readOnly}
            heightClassName='h-[140px]'
            isLoading={isUploading}
            loadingText={t`Uploading…`}
            selectedFileName={staged?.fileName || null}
            subtitle={t`or click to browse`}
            title={staged ? staged.fileName : t`Drag & drop a file here`}
            onFiles={handleFiles}
          />
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
