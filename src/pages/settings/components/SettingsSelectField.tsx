import InputSelect from '@/components/base/inputs/InputSelect'

type SelectOptionLike = {
  description?: string
  id: string | number
  name: string
  value?: string
}

type SettingsSelectFieldProps = {
  clearable?: boolean
  error?: string
  label: string
  options: SelectOptionLike[] | string[]
  placeholder?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
}

const toSelectOptions = (options: SelectOptionLike[] | string[]): SelectOptionLike[] => {
  if (!options.length) return []

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
  error,
  label,
  options,
  placeholder = 'Select',
  required,
  value,
  onChange,
}: SettingsSelectFieldProps) {
  const selectOptions = toSelectOptions(options)

  const selectedOption =
    selectOptions.find(
      (option) => option.value === value || option.name === value,
    ) || null

  return (
    <InputSelect
      clearable={clearable}
      error={error}
      label={required ? `${label} *` : label}
      options={selectOptions}
      placeholder={placeholder}
      value={selectedOption}
      onChange={(selected: SelectOptionLike | null) => {
        onChange(selected?.value || selected?.name || '')
      }}
    />
  )
}
