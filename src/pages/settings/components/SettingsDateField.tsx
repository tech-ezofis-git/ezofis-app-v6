import InputDate from '@/components/base/inputs/InputDate'

type SettingsDateFieldProps = {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
}

export default function SettingsDateField({
  label,
  required,
  value,
  onChange,
}: SettingsDateFieldProps) {
  return (
    <InputDate
      clearable
      label={label}
      required={required}
      value={value || null}
      onChange={(nextValue) => onChange(nextValue || '')}
    />
  )
}
