import InputSelect from '@/components/base/inputs/InputSelect'
import { useMemo } from 'react'

type SelectOptionLike = {
  description?: string
  iconKey?: string
  id: string | number
  name: string
  value?: string
}

type SettingsSelectFieldProps = {
  clearable?: boolean
  creatable?: boolean
  error?: string
  label?: string
  options: SelectOptionLike[] | string[]
  placeholder?: string
  required?: boolean
  searchable?: boolean
  value: string
  onChange: (value: string) => void
}

const toSelectOptions = (
  options: SelectOptionLike[] | string[],
): SelectOptionLike[] => {
  if (!options?.length) return []

  if (typeof options[0] === 'string') {
    return (options as string[]).map((option) => ({
      id: option,
      name: option,
      value: option,
    }))
  }

  return options as SelectOptionLike[]
}

export default function SettingsSelectField({
  clearable,
  creatable,
  error,
  label,
  options,
  placeholder = 'Select',
  required,
  searchable,
  value,
  onChange,
}: SettingsSelectFieldProps) {
  const normalizedValue = useMemo(() => {
    const trimmed = String(value || '').trim()
    return !trimmed || trimmed === '—' ? '' : trimmed
  }, [value])

  const selectOptions = useMemo(() => {
    const baseOptions = toSelectOptions(options).filter((option) => {
      const optionValue = String(option.value || option.name || '').trim()
      return optionValue && optionValue !== '—'
    })

    if (
      !normalizedValue ||
      baseOptions.some(
        (option) =>
          option.value === normalizedValue || option.name === normalizedValue,
      )
    ) {
      return baseOptions
    }

    return [
      ...baseOptions,
      {
        id: normalizedValue,
        name: normalizedValue,
        value: normalizedValue,
      },
    ]
  }, [options, normalizedValue])

  const selectedOption =
    selectOptions.find(
      (option) =>
        option.value === normalizedValue || option.name === normalizedValue,
    ) || null

  return (
    <InputSelect
      clearable={clearable}
      creatable={creatable}
      error={error}
      label={label}
      options={selectOptions}
      placeholder={placeholder}
      required={required}
      searchable={searchable ?? creatable}
      value={selectedOption}
      onChange={(selected: SelectOptionLike | null) => {
        onChange(selected?.value || selected?.name || '')
      }}
    />
  )
}
