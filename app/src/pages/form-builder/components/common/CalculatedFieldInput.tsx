import InputText from '@/components/base/inputs/InputText'

interface Props {
  value: string | number | null | undefined
  description?: string
  error?: string
  hideLabel?: boolean
  label?: string
  required?: boolean
  tooltip?: string
}

const CalculatedFieldInput = ({
  description,
  error,
  hideLabel,
  label,
  required,
  tooltip,
  value,
}: Props) => {
  const display =
    value === null || value === undefined || value === '' ? '' : String(value)

  return (
    <InputText
      description={description}
      error={error}
      label={hideLabel ? undefined : label}
      required={required}
      tooltip={tooltip}
      value={display}
      readOnly
      classNames={{
        input: 'bg-surface-secondary text-gray-12',
      }}
      onChange={() => {}}
    />
  )
}

export default CalculatedFieldInput
