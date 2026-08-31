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
  buildMergedOcrFieldHints,
  facetsToFieldOptions,
  findFieldOption,
  getConfiguredFieldOptions,
  getDateTimeLimits,
  getDropdownFacetSource,
  getFieldOptions,
  getFileExtension,
  isFieldReadOnly,
  isFieldRequired,
  normalizeStoredMultiSelectValue,
  selectOptionStoredValue,
  withExtraFieldOptions,
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
  isPreparing?: boolean
  panels?: any[]
  preparePhase?: 'extracting' | 'uploading' | null
  repoFieldHints?: string[]
  viewOnly?: boolean
  onChange: (value: any) => void
  onOcrFieldList?: (
    list: { name?: string; value?: string }[] | undefined,
  ) => void
  // Clicking an already-uploaded file below this field opens it in the
  // owning screen's full-screen preview.
  onOpenAttachment?: (attachment: any) => void
  onRequestUpload?: (file: File) => void | Promise<void>
}

interface StagedFileValue {
  fileName: string
  fileId?: string
  itemId?: string
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
  const { t } = useLingui()
  const general = field?.settings?.general || {}
  const specific = field?.settings?.specific || {}
  const [customList, setCustomList] = useState<string[]>([])
  const [newOptionText, setNewOptionText] = useState('')
  const [isAddingOption, setIsAddingOption] = useState(false)

  const baseOptions = getFieldOptions(field).map((o) => o.name)
  const allOptions = [...baseOptions, ...customList]

  const optionsPerLine = specific.optionsPerLine ?? 0
  const isAutoFlex = optionsPerLine === 0
  const effectiveCols = isAutoFlex
    ? 0
    : Math.min(optionsPerLine, Math.max(allOptions.length, 1))
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
              title={t`Scan QR code to select`}
            >
              <Icon height={12} name='lucide:qr-code' width={12} />
              <span>{t`Scan QR`}</span>
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
            'gap-2 w-full',
            isAutoFlex ? 'flex flex-wrap items-center' : 'grid',
          )}
          style={
            !isAutoFlex
              ? {
                gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
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
                  'flex min-h-[38px] flex-1 min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-13 transition-all',
                  isAutoFlex ? 'min-w-[100px]' : '',
                  readOnly
                    ? 'cursor-not-allowed bg-gray-3 text-gray-10 opacity-100'
                    : 'cursor-pointer active:scale-[0.99]',
                  isSelected
                    ? readOnly
                      ? 'border-gray-4 bg-gray-3 font-semibold text-gray-11'
                      : 'border-primary-9 bg-primary-1 font-semibold text-primary-9 shadow-2xs'
                    : readOnly
                      ? 'border-gray-3 bg-gray-3 text-gray-10'
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
                    placeholder={t`Type custom option...`}
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
                    {t`Add`}
                  </Button>
                  <Button
                    size='xs'
                    variant='subtle'
                    color='gray'
                    className='h-8 rounded-lg cursor-pointer'
                    onClick={() => setIsAddingOption(false)}
                  >
                    {t`Cancel`}
                  </Button>
                </div>
              ) : (
                <button
                  type='button'
                  className='flex items-center gap-1 text-xs font-semibold text-primary-9 hover:underline cursor-pointer'
                  onClick={() => setIsAddingOption(true)}
                >
                  <Icon height={12} name='lucide:plus' width={12} />
                  <span>{t`Add custom option`}</span>
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
  const { t } = useLingui()
  const general = field?.settings?.general || {}
  const specific = field?.settings?.specific || {}
  const validation = field?.settings?.validation || {}
  const [customList, setCustomList] = useState<string[]>([])
  const [newOptionText, setNewOptionText] = useState('')
  const [isAddingOption, setIsAddingOption] = useState(false)

  const baseOptions = getFieldOptions(field).map((o) => o.name)
  const allOptions = [...baseOptions, ...customList]

  const optionsPerLine = specific.optionsPerLine ?? 0
  const isAutoFlex = optionsPerLine === 0
  const effectiveCols = isAutoFlex
    ? 0
    : Math.min(optionsPerLine, Math.max(allOptions.length, 1))
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
            'gap-2 w-full',
            isAutoFlex ? 'flex flex-wrap items-center' : 'grid',
          )}
          style={
            !isAutoFlex
              ? {
                gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
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
                  'flex min-h-[38px] flex-1 min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-13 transition-all',
                  isAutoFlex ? 'min-w-[100px]' : '',
                  readOnly
                    ? 'cursor-not-allowed bg-gray-3 text-gray-10 opacity-100'
                    : 'cursor-pointer active:scale-[0.99]',
                  isSelected
                    ? readOnly
                      ? 'border-gray-4 bg-gray-3 font-semibold text-gray-11'
                      : 'border-primary-9 bg-primary-9 text-white font-semibold shadow-2xs'
                    : readOnly
                      ? 'border-gray-3 bg-gray-3 text-gray-10'
                      : 'border-gray-3 bg-white text-gray-12 hover:border-gray-4 hover:bg-gray-2',
                )}
                onClick={() => handleToggle(opt)}
              >
                <div
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
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
                    placeholder={t`Type custom option...`}
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
                    {t`Add`}
                  </Button>
                  <Button
                    size='xs'
                    variant='subtle'
                    color='gray'
                    className='h-8 rounded-lg cursor-pointer'
                    onClick={() => setIsAddingOption(false)}
                  >
                    {t`Cancel`}
                  </Button>
                </div>
              ) : (
                <button
                  type='button'
                  className='flex items-center gap-1 text-xs font-semibold text-primary-9 hover:underline cursor-pointer'
                  onClick={() => setIsAddingOption(true)}
                >
                  <Icon height={12} name='lucide:plus' width={12} />
                  <span>{t`Add custom option`}</span>
                </button>
              )}
            </div>
          )}
      </div>

      {validation.fieldRule === 'REQUIRED' &&
        validation.requiredValidation === 'ALL' && (
          <div className='flex items-center gap-1 pt-0.5 text-[11px] font-medium text-amber-7'>
            <Icon height={12} name='lucide:alert-circle' width={12} />
            <span>{t`All options must be checked to fulfill requirements.`}</span>
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
  isPreparing,
  panels,
  preparePhase,
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
  const [clearedAttachmentKeys, setClearedAttachmentKeys] = useState<string[]>(
    [],
  )
  const general = field?.settings?.general || {}
  const required = isFieldRequired(field)
  const readOnly = viewOnly || isFieldReadOnly(field)

  const optionsType = field.settings?.specific?.optionsType || 'CUSTOM'
  const facetSource = getDropdownFacetSource(field, repositoryId)

  const { data: uniqueFieldOptions = [] } = useQuery({
    queryKey: [
      'repositoryItemFacets',
      facetSource.repositoryId,
      facetSource.fieldName,
    ],
    queryFn: async () => {
      const res = await getRepositoryItemFacets({
        fieldName: facetSource.fieldName,
        limit: 1000,
        repositoryId: facetSource.repositoryId,
      })
      return facetsToFieldOptions(res.data, {
        splitArrayValues: field.type === 'MULTI_SELECT',
      })
    },
    enabled: facetSource.enabled,
  })

  const selectOptions = withExtraFieldOptions(
    optionsType === 'DYNAMIC'
      ? getFieldOptions(field)
      : getConfiguredFieldOptions(field),
    uniqueFieldOptions,
  )

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
      const selected = findFieldOption(selectOptions, value)
      return (
        <InputSelect
          {...common}
          creatable
          searchable
          createOptionLabel={(query) => t`Add "${query}"`}
          options={withExtraFieldOptions(
            selectOptions,
            selected ? [selected] : [],
          )}
          value={selected}
          onChange={(opt: Option | null) =>
            onChange(opt ? selectOptionStoredValue(opt, selectOptions) : null)
          }
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
      const seen = new Set<string>()
      const selected = normalizeStoredMultiSelectValue(value).flatMap((id) => {
        const opt = findFieldOption(selectOptions, id)
        if (!opt) return []
        const key = String(opt.id).toLowerCase()
        if (seen.has(key)) return []
        seen.add(key)
        return [opt]
      })
      return (
        <InputSelectMultiple
          {...common}
          creatable
          searchable
          createOptionLabel={(query) => t`Add "${query}"`}
          options={withExtraFieldOptions(selectOptions, selected)}
          value={selected}
          onChange={(opts: Option[]) =>
            onChange(opts.map((opt) => selectOptionStoredValue(opt, selectOptions)))
          }
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
      const storedItemId = String(value?.itemId || value?.fileId || '').trim()
      const staged: StagedFileValue | null =
        value?.fileName && (value.ocrChecked || storedItemId)
          ? {
              ...value,
              fileId: value.fileId || storedItemId,
              fileName: value.fileName,
              itemId: value.itemId || storedItemId,
              repositoryId: value.repositoryId,
            }
          : null
      const stagedKey = String(staged?.itemId || staged?.fileId || '')
      // A FILE_UPLOAD field holds one file. Extra process/email attachments
      // belong in the Attachments panel, not stacked under this control.
      const extraFallbacks = staged
        ? []
        : (fallbackAttachments || [])
            .filter((attachment) => {
              const key = String(
                attachment.itemId ?? attachment.id ?? attachment.fileId ?? '',
              )
              if (!key || clearedAttachmentKeys.includes(key)) return false
              return !stagedKey || key !== stagedKey
            })
            .slice(0, 1)

      const clearFile = (attachmentKey?: string) => {
        if (attachmentKey) {
          setClearedAttachmentKeys((keys) =>
            keys.includes(attachmentKey) ? keys : [...keys, attachmentKey],
          )
        }
        onChange(null)
      }

      const ext = staged ? getFileExtension(staged.fileName) : ''
      const icon = staged ? getFileIcon(ext) : ''
      const styles = staged ? getFileIconClasses(ext) : null
      const canOpenStaged = Boolean(
        (staged?.itemId || staged?.fileId) && onOpenAttachment,
      )

      const stagedChip =
        staged && styles ? (
          <div
            className={`mt-2 flex items-center gap-2.5 rounded-lg border border-gray-2 bg-surface p-2 ${
              canOpenStaged
                ? 'cursor-pointer transition-all hover:border-primary-5 hover:bg-primary-1/30'
                : ''
            }`}
            onClick={() =>
              canOpenStaged &&
              onOpenAttachment?.({
                fileName: staged.fileName,
                id: staged.itemId || staged.fileId,
                itemId: staged.itemId || staged.fileId,
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
              className='flex min-w-0 flex-1 items-center gap-1'
              title={staged.fileName}
            >
              <span
                className={`min-w-0 truncate text-12 font-semibold text-gray-12 ${
                  canOpenStaged ? 'hover:underline' : ''
                }`}
              >
                {staged.fileName}
              </span>
              {!readOnly && (
                <button
                  aria-label={t`Remove file`}
                  className='flex size-6 shrink-0 items-center justify-center rounded-md text-gray-8 transition-all hover:bg-red-2 hover:text-red-9 active:scale-90'
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile(stagedKey)
                  }}
                >
                  <Icon className='size-3.5' name='tabler:x' />
                </button>
              )}
            </div>
          </div>
        ) : null

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
          setIsUploading(true)
          try {
            await onRequestUpload(file)
          } finally {
            setIsUploading(false)
          }
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
        const ocrHints = buildMergedOcrFieldHints(
          repoFieldHints,
          panels || [],
          field,
        )
        const { data, error } = await uploadForOcr(
          repositoryId,
          file,
          ocrHints,
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

      return (
        <div>
          {!general.hideLabel && (
            <label className='mb-1.5 block text-13 font-medium text-gray-12'>
              {field.label}
              {required && <span className='text-red-9'> *</span>}
            </label>
          )}
          {!readOnly && (
            <CompactDropzone
              accept={field.type === 'IMAGE_UPLOAD' ? 'image/*' : '*/*'}
              disabled={readOnly}
              isLoading={isUploading || Boolean(isPreparing)}
              loadingText={
                preparePhase === 'uploading'
                  ? t`Uploading the document…`
                  : t`Extracting data from the document…`
              }
              onFiles={handleFiles}
            />
          )}
          {readOnly && !stagedChip && extraFallbacks.length === 0 && (
            <div className='rounded-lg border border-dashed border-gray-3 bg-gray-1 px-3 py-2.5 text-12 text-gray-8'>
              {t`See the Attachments section for uploaded files.`}
            </div>
          )}
          {stagedChip}
          {extraFallbacks.map((attachment) => {
            const attName = attachment.name || attachment.fileName || ''
            const attExt = getFileExtension(attName)
            const attStyles = getFileIconClasses(attExt)
            const attKey = String(
              attachment.itemId ?? attachment.id ?? attachment.fileId ?? '',
            )
            return (
              <div
                className={`mt-2 flex w-full items-center gap-2.5 rounded-lg border border-gray-2 bg-surface p-2 ${
                  onOpenAttachment
                    ? 'cursor-pointer transition-all hover:border-primary-5 hover:bg-primary-1/30'
                    : ''
                }`}
                key={attachment.id ?? attName}
                onClick={() => onOpenAttachment?.(attachment)}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${attStyles.wrap}`}
                >
                  <Icon className='size-4' name={getFileIcon(attExt)} />
                </div>
                <div className='flex min-w-0 flex-1 items-center gap-1' title={attName}>
                  <span className='min-w-0 truncate text-12 font-semibold text-gray-12'>
                    {attName}
                  </span>
                  {!readOnly && (
                    <button
                      aria-label={t`Remove file`}
                      className='flex size-6 shrink-0 items-center justify-center rounded-md text-gray-8 transition-all hover:bg-red-2 hover:text-red-9 active:scale-90'
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation()
                        clearFile(attKey)
                      }}
                    >
                      <Icon className='size-3.5' name='tabler:x' />
                    </button>
                  )}
                </div>
              </div>
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
