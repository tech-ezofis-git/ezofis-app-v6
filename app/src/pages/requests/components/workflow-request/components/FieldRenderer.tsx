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
import CalculatedFieldInput from '@/pages/form-builder/components/common/CalculatedFieldInput'
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

import { Button } from '@mantine/core'
import cn from '@/utils/cn'

interface ChoiceFieldProps {
  error?: string
  field: any
  readOnly?: boolean
  required?: boolean
  value: any
  onChange: (val: any) => void
}

const ChoiceRadioGroupField = ({
  error,
  field,
  readOnly,
  required,
  value,
  onChange,
}: ChoiceFieldProps) => {
  const general = field?.settings?.general || {}
  const specific = field?.settings?.specific || {}
  const [customList, setCustomList] = useState<string[]>([])
  const [newOptionText, setNewOptionText] = useState('')
  const [isAddingOption, setIsAddingOption] = useState(false)

  const baseOptions = getFieldOptions(field).map((o) => o.name)
  const allOptions = [...baseOptions, ...customList]

  const optionsPerLine = specific.optionsPerLine ?? 3
  const isAutoFlex = optionsPerLine === 0
  const selectedValue =
    value !== undefined && value !== null ? String(value) : ''

  const handleAddCustom = () => {
    const trimmed = newOptionText.trim()
    if (!trimmed || allOptions.includes(trimmed)) return
    setCustomList((prev) => [...prev, trimmed])
    onChange(trimmed)
    setNewOptionText('')
    setIsAddingOption(false)
  }

  return (
    <div className='w-full space-y-1.5'>
      {!general.hideLabel && (
        <div className='flex items-center justify-between'>
          <label className='block text-13 font-medium text-gray-12'>
            {field.label}
            {required && <span className='text-red-9'> *</span>}
          </label>

          {specific.qrCodeEnabled && !readOnly && (
            <button
              type='button'
              className='flex items-center gap-1 rounded-md border border-gray-3 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-8 shadow-2xs transition-colors hover:border-primary-5 hover:text-primary-9 cursor-pointer'
              onClick={() => {
                if (allOptions.length > 0) {
                  const randomOpt =
                    allOptions[Math.floor(Math.random() * allOptions.length)]
                  onChange(randomOpt)
                }
              }}
              title='Scan QR code to select'
            >
              <Icon height={12} name='lucide:qr-code' width={12} />
              <span>Scan QR</span>
            </button>
          )}
        </div>
      )}

      {general.description && (
        <p className='text-12 font-normal text-gray-9'>{general.description}</p>
      )}

      <div
        className={cn(
          'w-full space-y-2',
          specific.showOptionsWrapper &&
          'rounded-xl border border-gray-3 bg-gray-1/40 p-3 shadow-2xs',
        )}
      >
        <div
          className={cn(
            'gap-2',
            isAutoFlex ? 'flex flex-wrap items-center' : 'grid',
          )}
          style={
            !isAutoFlex
              ? {
                gridTemplateColumns: `repeat(${optionsPerLine}, minmax(0, 1fr))`,
              }
              : undefined
          }
        >
          {allOptions.map((opt, i) => {
            const isSelected = selectedValue === opt
            return (
              <div
                key={i}
                className={cn(
                  'flex min-h-[38px] items-center gap-2.5 rounded-lg border px-3 py-2 text-13 transition-all',
                  isAutoFlex ? 'flex-shrink-0' : '',
                  readOnly
                    ? 'cursor-default opacity-85'
                    : 'cursor-pointer active:scale-[0.99]',
                  isSelected
                    ? 'border-primary-9 bg-primary-1 font-semibold text-primary-9 shadow-2xs'
                    : readOnly
                      ? 'border-gray-2 bg-gray-1 text-gray-10'
                      : 'border-gray-3 bg-white text-gray-12 hover:border-gray-4 hover:bg-gray-2',
                )}
                onClick={() => !readOnly && onChange(opt)}
              >
                <div
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                    isSelected
                      ? 'border-primary-9 bg-primary-9 text-white'
                      : 'border-gray-4 bg-white',
                  )}
                >
                  {isSelected && (
                    <Icon height={10} name='lucide:circle' width={10} />
                  )}
                </div>
                <span className='truncate'>{opt}</span>
              </div>
            )
          })}
        </div>

        {!readOnly &&
          (specific.allowCustomEntries || specific.allowToAddNewOptions) && (
            <div className='pt-1'>
              {isAddingOption ? (
                <div className='flex items-center gap-2'>
                  <input
                    type='text'
                    className='h-8 flex-1 rounded-lg border border-gray-3 bg-white px-2.5 text-xs text-gray-12 outline-none focus:border-primary-9 focus:ring-1 focus:ring-primary-3'
                    placeholder='Type custom option...'
                    value={newOptionText}
                    autoFocus
                    onChange={(e) => setNewOptionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustom()
                      if (e.key === 'Escape') setIsAddingOption(false)
                    }}
                  />
                  <Button
                    size='xs'
                    className='h-8 rounded-lg cursor-pointer'
                    onClick={handleAddCustom}
                  >
                    Add
                  </Button>
                  <Button
                    size='xs'
                    variant='subtle'
                    color='gray'
                    className='h-8 rounded-lg cursor-pointer'
                    onClick={() => setIsAddingOption(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type='button'
                  className='flex items-center gap-1 text-xs font-semibold text-primary-9 hover:underline cursor-pointer'
                  onClick={() => setIsAddingOption(true)}
                >
                  <Icon height={12} name='lucide:plus' width={12} />
                  <span>Add custom option</span>
                </button>
              )}
            </div>
          )}
      </div>

      {error && <p className='mt-1 text-12 font-medium text-red-9'>{error}</p>}
    </div>
  )
}

const ChoiceCheckboxGroupField = ({
  error,
  field,
  readOnly,
  required,
  value,
  onChange,
}: ChoiceFieldProps) => {
  const general = field?.settings?.general || {}
  const specific = field?.settings?.specific || {}
  const validation = field?.settings?.validation || {}
  const [customList, setCustomList] = useState<string[]>([])
  const [newOptionText, setNewOptionText] = useState('')
  const [isAddingOption, setIsAddingOption] = useState(false)

  const baseOptions = getFieldOptions(field).map((o) => o.name)
  const allOptions = [...baseOptions, ...customList]

  const optionsPerLine = specific.optionsPerLine ?? 3
  const isAutoFlex = optionsPerLine === 0
  const selectedList = Array.isArray(value)
    ? value
    : value
      ? [String(value)]
      : []

  const handleToggle = (opt: string) => {
    if (readOnly) return
    const next = selectedList.includes(opt)
      ? selectedList.filter((item) => item !== opt)
      : [...selectedList, opt]
    onChange(next)
  }

  const handleAddCustom = () => {
    const trimmed = newOptionText.trim()
    if (!trimmed || allOptions.includes(trimmed)) return
    setCustomList((prev) => [...prev, trimmed])
    onChange([...selectedList, trimmed])
    setNewOptionText('')
    setIsAddingOption(false)
  }

  return (
    <div className='w-full space-y-1.5'>
      {!general.hideLabel && (
        <div className='flex items-center justify-between'>
          <label className='block text-13 font-medium text-gray-12'>
            {field.label}
            {required && <span className='text-red-9'> *</span>}
          </label>

          {specific.bulkActionsEnabled && !readOnly && (
            <div className='flex items-center gap-2'>
              <button
                type='button'
                className='cursor-pointer text-[11px] font-semibold text-primary-9 hover:underline'
                onClick={() => onChange(allOptions)}
              >
                Select All
              </button>
              <span className='text-gray-4 text-xs'>•</span>
              <button
                type='button'
                className='cursor-pointer text-[11px] font-semibold text-gray-7 hover:underline'
                onClick={() => onChange([])}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {general.description && (
        <p className='text-12 font-normal text-gray-9'>{general.description}</p>
      )}

      <div
        className={cn(
          'w-full space-y-2',
          specific.showOptionsWrapper &&
          'rounded-xl border border-gray-3 bg-gray-1/40 p-3 shadow-2xs',
        )}
      >
        <div
          className={cn(
            'gap-2',
            isAutoFlex ? 'flex flex-wrap items-center' : 'grid',
          )}
          style={
            !isAutoFlex
              ? {
                gridTemplateColumns: `repeat(${optionsPerLine}, minmax(0, 1fr))`,
              }
              : undefined
          }
        >
          {allOptions.map((opt, i) => {
            const isSelected = selectedList.includes(opt)
            return (
              <div
                key={i}
                className={cn(
                  'flex min-h-[38px] items-center gap-2.5 rounded-lg border px-3 py-2 text-13 transition-all',
                  isAutoFlex ? 'flex-shrink-0' : '',
                  readOnly
                    ? 'cursor-default opacity-85'
                    : 'cursor-pointer active:scale-[0.99]',
                  isSelected
                    ? 'border-primary-9 bg-primary-1 font-semibold text-primary-9 shadow-2xs'
                    : readOnly
                      ? 'border-gray-2 bg-gray-1 text-gray-10'
                      : 'border-gray-3 bg-white text-gray-12 hover:border-gray-4 hover:bg-gray-2',
                )}
                onClick={() => handleToggle(opt)}
              >
                <div
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-md border transition-colors',
                    isSelected
                      ? 'border-primary-9 bg-primary-9 text-white'
                      : 'border-gray-4 bg-white',
                  )}
                >
                  {isSelected && (
                    <Icon height={10} name='lucide:check' width={10} />
                  )}
                </div>
                <span className='truncate'>{opt}</span>
              </div>
            )
          })}
        </div>

        {!readOnly &&
          (specific.allowCustomEntries || specific.allowToAddNewOptions) && (
            <div className='pt-1'>
              {isAddingOption ? (
                <div className='flex items-center gap-2'>
                  <input
                    type='text'
                    className='h-8 flex-1 rounded-lg border border-gray-3 bg-white px-2.5 text-xs text-gray-12 outline-none focus:border-primary-9 focus:ring-1 focus:ring-primary-3'
                    placeholder='Type custom option...'
                    value={newOptionText}
                    autoFocus
                    onChange={(e) => setNewOptionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustom()
                      if (e.key === 'Escape') setIsAddingOption(false)
                    }}
                  />
                  <Button
                    size='xs'
                    className='h-8 rounded-lg cursor-pointer'
                    onClick={handleAddCustom}
                  >
                    Add
                  </Button>
                  <Button
                    size='xs'
                    variant='subtle'
                    color='gray'
                    className='h-8 rounded-lg cursor-pointer'
                    onClick={() => setIsAddingOption(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type='button'
                  className='flex items-center gap-1 text-xs font-semibold text-primary-9 hover:underline cursor-pointer'
                  onClick={() => setIsAddingOption(true)}
                >
                  <Icon height={12} name='lucide:plus' width={12} />
                  <span>Add custom option</span>
                </button>
              )}
            </div>
          )}
      </div>

      {validation.fieldRule === 'REQUIRED' &&
        validation.requiredValidation === 'ALL' && (
          <div className='flex items-center gap-1 pt-0.5 text-[11px] font-medium text-amber-7'>
            <Icon height={12} name='lucide:alert-circle' width={12} />
            <span>All options must be checked to fulfill requirements.</span>
          </div>
        )}

      {error && <p className='mt-1 text-12 font-medium text-red-9'>{error}</p>}
    </div>
  )
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

    case 'CALCULATED':
      return (
        <CalculatedFieldInput
          error={error}
          hideLabel={general.hideLabel}
          label={field.label}
          required={required}
          tooltip={general.tooltip}
          value={value}
        />
      )

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
      return (
        <ChoiceRadioGroupField
          error={error}
          field={field}
          readOnly={readOnly}
          required={required}
          value={value}
          onChange={onChange}
        />
      )

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
      return (
        <ChoiceCheckboxGroupField
          error={error}
          field={field}
          readOnly={readOnly}
          required={required}
          value={value}
          onChange={onChange}
        />
      )

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
              className={`mt-2 flex items-center gap-2.5 rounded-lg border border-gray-2 bg-surface p-2 ${staged.fileId && onOpenAttachment
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
                className={`min-w-0 flex-1 truncate text-12 font-semibold text-gray-12 ${staged.fileId && onOpenAttachment ? 'hover:underline' : ''
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
