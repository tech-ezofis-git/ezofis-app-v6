import { useEffect, useMemo, useState } from 'react'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputDate from '@/components/base/inputs/InputDate'
import InputRadioIndicator from '@/components/base/inputs/InputRadioIndicator'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import type { DynamicRepositoryColumn } from '../api/folderApi'

export type SelectOption = {
  description?: string
  disabled?: boolean
  id: string | number
  name: string
  value?: string
}

type MetadataRow = Record<string, any>

export const normalizeType = (dataType?: string) =>
  String(dataType || 'text').toLowerCase()

export const normalizeDateForInput = (value: any) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

export const getRawValue = (
  row: MetadataRow | undefined,
  sqlColumnName: string,
) => {
  if (!row || !sqlColumnName) return ''
  const matchedKey = Object.keys(row).find(
    (key) => key.toLowerCase() === sqlColumnName.toLowerCase(),
  )
  return matchedKey ? row[matchedKey] : ''
}

export const getFileTitle = (row?: MetadataRow) =>
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

export const toTextValue = (value: any) => {
  if (value === undefined || value === null) return ''
  return String(value)
}

export const toBooleanValue = (value: any) => {
  if (typeof value === 'boolean') return value
  const text = String(value ?? '').toLowerCase()
  return text === 'true' || text === '1' || text === 'yes'
}

export const getSelectOptions = (
  field: DynamicRepositoryColumn,
): SelectOption[] => {
  let rawOptions =
    (field as any).options ||
    (field as any).values ||
    (field as any).lookupValues ||
    (field as any).allowedValues ||
    (field as any).optionsJson ||
    []

  if (typeof rawOptions === 'string') {
    try {
      rawOptions = JSON.parse(rawOptions)
      if (typeof rawOptions === 'string') {
        try {
          rawOptions = JSON.parse(rawOptions)
        } catch {
          // not double JSON
        }
      }
    } catch {
      // not JSON string
    }
  }

  if (
    rawOptions &&
    typeof rawOptions === 'object' &&
    !Array.isArray(rawOptions)
  ) {
    if (Array.isArray((rawOptions as any).values)) {
      rawOptions = (rawOptions as any).values
    } else if (Array.isArray((rawOptions as any).options)) {
      rawOptions = (rawOptions as any).options
    }
  }

  if (!Array.isArray(rawOptions)) return []

  return rawOptions.map((option: any, index: number): SelectOption => {
    if (
      typeof option === 'string' ||
      typeof option === 'number' ||
      typeof option === 'boolean'
    ) {
      const optionText = String(option)
      return { id: optionText, name: optionText, value: optionText }
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
      description: option?.description,
      disabled: Boolean(option?.disabled),
      id: String(optionId),
      name: String(optionName),
      value: String(option?.value ?? optionName),
    }
  })
}

export const findSelectedOption = (
  options: SelectOption[],
  value: string,
): SelectOption | null => {
  if (!value) return null
  const normalizedValue = value.toLowerCase()
  const found = options.find(
    (option) =>
      String(option.value ?? '').toLowerCase() === normalizedValue ||
      String(option.name).toLowerCase() === normalizedValue ||
      String(option.id).toLowerCase() === normalizedValue,
  )
  if (found) return found
  return {
    id: value,
    name: value,
    value: value,
  }
}

export function renderMetadataFieldControl(
  field: DynamicRepositoryColumn,
  formValues: Record<string, any>,
  updateFieldValue: (key: string, value: any) => void,
) {
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
        onChange={(nextValue: any) =>
          updateFieldValue(field.key, nextValue || '')
        }
      />
    )
  }

  if (
    fieldType === 'select' ||
    fieldType === 'dropdown' ||
    fieldType === 'single_select' ||
    fieldType === 'multi_select' ||
    fieldType === 'single_choice' ||
    fieldType === 'multiple_choice' ||
    options.length > 0
  ) {
    const textVal = toTextValue(value)
    const selectedOption = findSelectedOption(options, textVal)
    const effectiveOptions =
      selectedOption &&
      !options.some(
        (o) =>
          String(o.value ?? '').toLowerCase() ===
            String(selectedOption.value ?? '').toLowerCase() ||
          String(o.name).toLowerCase() ===
            selectedOption.name.toLowerCase() ||
          String(o.id).toLowerCase() === String(selectedOption.id).toLowerCase(),
      )
        ? [...options, selectedOption]
        : options

    return (
      <InputSelect
        label={label}
        options={effectiveOptions}
        searchable
        creatable
        value={selectedOption}
        onChange={(selected: SelectOption | null) =>
          updateFieldValue(
            field.key,
            selected?.value ?? selected?.name ?? selected?.id ?? '',
          )
        }
      />
    )
  }

  if (
    fieldType === 'boolean' ||
    fieldType === 'bool' ||
    fieldType === 'checkbox'
  ) {
    return (
      <div className='rounded-xl border border-gray-3 bg-surface px-4 py-3'>
        <div className='mb-2 text-xs font-semibold tracking-wide text-gray-9 uppercase'>
          {label}
          {required ? <span className='ml-1 text-red-9'>*</span> : null}
        </div>
        <InputCheckbox
          checked={Boolean(value)}
          indeterminate={false}
          onChange={(event: any) =>
            updateFieldValue(
              field.key,
              Boolean(event?.target?.checked ?? !value),
            )
          }
        />
      </div>
    )
  }

  if (fieldType === 'radio') {
    return (
      <div className='rounded-xl border border-gray-3 bg-surface px-4 py-3'>
        <div className='mb-3 text-xs font-semibold tracking-wide text-gray-9 uppercase'>
          {label}
          {required ? <span className='ml-1 text-red-9'>*</span> : null}
        </div>
        <div className='flex flex-col gap-3'>
          {options.map((option) => {
            const optionValue = String(option.value ?? option.name ?? option.id)
            return (
              <button
                className='inline-flex items-center gap-2 text-sm font-medium text-gray-12'
                key={optionValue}
                type='button'
                onClick={() => updateFieldValue(field.key, optionValue)}
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
      required={required}
      value={toTextValue(value)}
      type={
        fieldType === 'decimal' ||
        fieldType === 'number' ||
        fieldType === 'int' ||
        fieldType === 'integer'
          ? 'number'
          : 'text'
      }
      onChange={(event: any) =>
        updateFieldValue(field.key, event?.target?.value ?? event ?? '')
      }
    />
  )
}

export function useEditMetadataForm(
  fileColumns: DynamicRepositoryColumn[],
  fileData?: MetadataRow,
) {
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  const editableFields = useMemo(
    () => fileColumns.filter((field) => field.key),
    [fileColumns],
  )

  const buildInitialValues = () => {
    const nextValues: Record<string, any> = {}
    editableFields.forEach((field) => {
      const rawValue = getRawValue(fileData, field.key)
      const fieldType = normalizeType(field.dataType)

      if (fieldType === 'date' || fieldType === 'datetime') {
        nextValues[field.key] = normalizeDateForInput(rawValue)
        return
      }
      if (
        fieldType === 'boolean' ||
        fieldType === 'bool' ||
        fieldType === 'checkbox'
      ) {
        nextValues[field.key] = toBooleanValue(rawValue)
        return
      }
      nextValues[field.key] = toTextValue(rawValue)
    })
    return nextValues
  }

  useEffect(() => {
    setFormValues(buildInitialValues())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableFields, fileData])

  const updateFieldValue = (fieldKey: string, value: any) => {
    setFormValues((previous) => ({ ...previous, [fieldKey]: value }))
  }

  const resetValues = () => setFormValues(buildInitialValues())

  const saveValues = async (
    onSave?: (values: Record<string, any>) => void | Promise<void>,
  ) => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(formValues)
    } finally {
      setSaving(false)
    }
  }

  return {
    editableFields,
    formValues,
    resetValues,
    saveValues,
    saving,
    updateFieldValue,
  }
}
