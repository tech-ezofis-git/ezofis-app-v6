import { useEffect, useMemo, useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputText from '@/components/base/inputs/InputText'
import InputRadioIndicator from '@/components/base/inputs/InputRadioIndicator'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import { Button, Card, PrimaryButton } from './Ui'
import { DynamicIcon } from './icons'

type MetadataRow = Record<string, any>

type SelectOption = {
  id: string | number
  name: string
  description?: string
  disabled?: boolean
  value?: string
}

type EditMetadataViewProps = {
  onBack: () => void
  fileColumns: DynamicRepositoryColumn[]
  fileData?: MetadataRow
  onSave?: (values: Record<string, any>) => void | Promise<void>
}

const normalizeType = (dataType?: string) => String(dataType || 'text').toLowerCase()

const normalizeDateForInput = (value: any) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

const getRawValue = (row: MetadataRow | undefined, sqlColumnName: string) => {
  if (!row || !sqlColumnName) return ''

  const matchedKey = Object.keys(row).find(
    (key) => key.toLowerCase() === sqlColumnName.toLowerCase(),
  )

  return matchedKey ? row[matchedKey] : ''
}

const getFileTitle = (row?: MetadataRow) =>
  String(
    row?.fileName ??
      row?.FileName ??
      row?.name ??
      row?.Name ??
      row?.id ??
      row?.Id ??
      row?.itemId ??
      row?.ItemId ??
      row?.documentId ??
      row?.DocumentId ??
      'Selected Document',
  )

const toTextValue = (value: any) => {
  if (value === undefined || value === null) return ''
  return String(value)
}

const toBooleanValue = (value: any) => {
  if (typeof value === 'boolean') return value
  const text = String(value ?? '').toLowerCase()
  return text === 'true' || text === '1' || text === 'yes'
}

const getSelectOptions = (field: DynamicRepositoryColumn): SelectOption[] => {
  const rawOptions =
    (field as any).options ||
    (field as any).values ||
    (field as any).lookupValues ||
    (field as any).allowedValues ||
    []

  if (!Array.isArray(rawOptions)) return []

  return rawOptions.map((option: any, index: number): SelectOption => {
    if (
      typeof option === 'string' ||
      typeof option === 'number' ||
      typeof option === 'boolean'
    ) {
      const optionText = String(option)

      return {
        id: optionText,
        name: optionText,
        value: optionText,
      }
    }

    const optionId =
      option?.id ??
      option?.value ??
      option?.name ??
      option?.label ??
      `option-${index}`

    const optionName =
      option?.name ??
      option?.label ??
      option?.value ??
      option?.id ??
      `Option ${index + 1}`

    return {
      id: String(optionId),
      name: String(optionName),
      value: String(option?.value ?? optionName),
      description: option?.description,
      disabled: Boolean(option?.disabled),
    }
  })
}

const findSelectedOption = (options: SelectOption[], value: string): SelectOption | null => {
  if (!value) return null

  const normalizedValue = value.toLowerCase()

  return (
    options.find(
      (option) =>
        String(option.value ?? '').toLowerCase() === normalizedValue ||
        String(option.name).toLowerCase() === normalizedValue ||
        String(option.id).toLowerCase() === normalizedValue,
    ) || null
  )
}

export function EditMetadataView({
  onBack,
  fileColumns,
  fileData,
  onSave,
}: EditMetadataViewProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  const editableFields = useMemo(
    () => fileColumns.filter((field) => field.key),
    [fileColumns],
  )

  useEffect(() => {
    const nextValues: Record<string, any> = {}

    editableFields.forEach((field) => {
      const rawValue = getRawValue(fileData, field.key)
      const fieldType = normalizeType(field.dataType)

      if (fieldType === 'date' || fieldType === 'datetime') {
        nextValues[field.key] = normalizeDateForInput(rawValue)
        return
      }

      if (fieldType === 'boolean' || fieldType === 'bool' || fieldType === 'checkbox') {
        nextValues[field.key] = toBooleanValue(rawValue)
        return
      }

      nextValues[field.key] = toTextValue(rawValue)
    })

    setFormValues(nextValues)
  }, [editableFields, fileData])

  const updateFieldValue = (fieldKey: string, value: any) => {
    setFormValues((previous) => ({ ...previous, [fieldKey]: value }))
  }

  const resetValues = () => {
    const nextValues: Record<string, any> = {}

    editableFields.forEach((field) => {
      const rawValue = getRawValue(fileData, field.key)
      const fieldType = normalizeType(field.dataType)

      if (fieldType === 'date' || fieldType === 'datetime') {
        nextValues[field.key] = normalizeDateForInput(rawValue)
        return
      }

      if (fieldType === 'boolean' || fieldType === 'bool' || fieldType === 'checkbox') {
        nextValues[field.key] = toBooleanValue(rawValue)
        return
      }

      nextValues[field.key] = toTextValue(rawValue)
    })

    setFormValues(nextValues)
  }

  const saveValues = async () => {
    if (!onSave) return

    setSaving(true)
    try {
      await onSave(formValues)
    } finally {
      setSaving(false)
    }
  }

  const renderFieldControl = (field: DynamicRepositoryColumn) => {
    const fieldType = normalizeType(field.dataType)
    const value = formValues[field.key]
    const label = field.label || field.key
    const required = Boolean(field.isMandatory)
    const options = getSelectOptions(field)

    if (fieldType === 'date' || fieldType === 'datetime') {
      return (
        <InputDate
          className='w-full'
          label={label}
          value={value || ''}
          onChange={(nextValue: any) => updateFieldValue(field.key, nextValue || '')}
        />
      )
    }

    if (fieldType === 'select' || fieldType === 'dropdown' || options.length > 0) {
      return (
        <InputSelect
          label={label}
          options={options}
          value={findSelectedOption(options, toTextValue(value))}
          onChange={(selected: SelectOption | null) =>
            updateFieldValue(
              field.key,
              selected?.value ?? selected?.name ?? selected?.id ?? '',
            )
          }
        />
      )
    }

    if (fieldType === 'boolean' || fieldType === 'bool' || fieldType === 'checkbox') {
      return (
        <div className='rounded-xl border border-gray-2 bg-white px-4 py-3'>
          <div className='mb-2 text-xs font-bold tracking-wider text-gray-9 uppercase'>
            {label}
            {required ? <span className='ml-1 text-red-9'>*</span> : null}
          </div>
          <InputCheckbox
            checked={Boolean(value)}
            indeterminate={false}
            onChange={(event: any) => updateFieldValue(field.key, Boolean(event?.target?.checked ?? !value))}
          />
        </div>
      )
    }

    if (fieldType === 'radio') {
      return (
        <div className='rounded-xl border border-gray-2 bg-white px-4 py-3'>
          <div className='mb-3 text-xs font-bold tracking-wider text-gray-9 uppercase'>
            {label}
            {required ? <span className='ml-1 text-red-9'>*</span> : null}
          </div>
          <div className='flex flex-wrap gap-4'>
            {options.map((option) => {
              const optionValue = String(option.value ?? option.name ?? option.id)
              return (
                <button
                  key={optionValue}
                  type='button'
                  onClick={() => updateFieldValue(field.key, optionValue)}
                  className='inline-flex items-center gap-2 text-sm font-semibold text-gray-12'
                >
                  <InputRadioIndicator
                    aria-label={option.name}
                    checked={toTextValue(value) === optionValue}
                  />
                  {option.name}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <InputText
        className='w-full'
        label={label}
        placeholder={`Enter ${label}`}
        value={toTextValue(value)}
        required={required}
        type={
          fieldType === 'decimal' ||
          fieldType === 'number' ||
          fieldType === 'int' ||
          fieldType === 'integer'
            ? 'number'
            : 'text'
        }
        onChange={(event: any) => updateFieldValue(field.key, event?.target?.value ?? event ?? '')}
      />
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary animate-in fade-in duration-300'>
      <div className='flex h-[72px] shrink-0 items-center justify-between border-b border-gray-3 bg-white px-6'>
        <div className='flex min-w-0 items-center gap-4'>
          <button
            type='button'
            onClick={onBack}
            className='inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-[14px] font-semibold text-gray-13 hover:bg-gray-2'
          >
            <DynamicIcon name='arrowLeft' className='h-4 w-4' />
            Back
          </button>

          <div className='h-8 w-px bg-gray-4' />

          <div className='min-w-0'>
            <h1 className='truncate text-[16px] font-bold text-gray-13'>
              Edit Metadata
            </h1>
            <p className='truncate text-[12px] font-semibold text-gray-9'>
              {getFileTitle(fileData)}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Button
            type='button'
            onClick={resetValues}
            className='h-10 px-4 text-[14px] font-semibold'
          >
            <DynamicIcon name='refresh' className='h-4 w-4' />
            Reset
          </Button>

          <PrimaryButton
            type='button'
            disabled={saving || !onSave}
            onClick={saveValues}
            className='h-10 px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50'
          >
            <DynamicIcon name='save' className='h-4 w-4' />
            {saving ? 'Saving...' : 'Save Changes'}
          </PrimaryButton>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-[1120px] space-y-5 px-6 py-6'>
          <div className='flex items-center justify-between gap-4 rounded-xl border border-violet-5 bg-violet-3 p-4 text-violet-11'>
            <p className='text-[13px] leading-5'>
              <b>Metadata Workspace:</b> Controls are generated from repository
              field definitions only. Empty or missing values remain blank in edit
              mode and display as “-” in grid/list view.
            </p>
          </div>

          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-5 shadow-sm'>
            <div className='flex items-center justify-between border-b border-gray-3 pb-3'>
              <h2 className='text-[15px] font-semibold text-gray-13'>
                Repository Fields
              </h2>
              <span className='rounded-full bg-gray-2 px-3 py-1 text-[12px] font-semibold text-gray-10'>
                {editableFields.length} fields
              </span>
            </div>

            {editableFields.length ? (
              <div className='mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
                {editableFields.map((field) => (
                  <div key={field.key} className='block'>
                    {renderFieldControl(field)}
                    {/* <span className='mt-1 block text-[11px] font-medium text-gray-8'>
                      Column: {field.key}
                      {field.dataType ? ` · ${field.dataType}` : ''}
                    </span> */}
                  </div>
                ))}
              </div>
            ) : (
              <div className='flex min-h-[260px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
                <DynamicIcon name='fileText' className='h-8 w-8 text-gray-8' />
                <b className='text-gray-13'>No metadata fields available</b>
                <p className='max-w-[480px] text-sm text-gray-10'>
                  The selected repository did not return editable metadata
                  fields. Please confirm the repository field configuration from
                  the backend response.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
