import InputDate from '@/components/base/inputs/InputDate'

type SettingsDateFieldProps = {
  disabled?: boolean
  label: string
  minDate?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
}

export default function SettingsDateField({
  disabled,
  label,
  minDate,
  required,
  value,
  onChange,
}: SettingsDateFieldProps) {
  return (
    <InputDate
      disabled={disabled}
      label={label}
      minDate={minDate}
      required={required}
      value={value || null}
      clearable={!disabled}
      onChange={(nextValue) => onChange(nextValue || '')}
    />
  )
}
