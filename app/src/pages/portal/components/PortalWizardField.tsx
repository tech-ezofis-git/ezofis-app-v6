import type { Option } from '@/types/option'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import InputTime from '@/components/base/inputs/InputTime'
import {
  getQuestionOptions,
  type PortalFormQuestion,
} from '../helpers/portalForm'

type PortalWizardFieldProps = {
  question: PortalFormQuestion
  value: unknown
  onChange: (value: unknown) => void
}

const asText = (value: unknown) =>
  value === undefined || value === null ? '' : String(value)

const PortalWizardField = ({
  question,
  value,
  onChange,
}: PortalWizardFieldProps) => {
  const type = String(question.type || '').toUpperCase()
  const placeholder = question.placeholder || undefined
  const options = getQuestionOptions(question.field)

  if (
    type === 'LONG_TEXT' ||
    type === 'TEXT_BUILDER' ||
    type.includes('LONG_TEXT')
  ) {
    return (
      <InputTextarea
        minRows={4}
        placeholder={placeholder}
        rows={4}
        value={asText(value)}
        onChange={onChange}
      />
    )
  }

  if (type === 'DATE' || type === 'DATE_TIME' || type.includes('DATE')) {
    return (
      <InputDate
        placeholder={placeholder}
        value={typeof value === 'string' ? value : null}
        onChange={onChange}
      />
    )
  }

  if (type === 'TIME') {
    return <InputTime value={asText(value)} onChange={onChange} />
  }

  if (type === 'SINGLE_SELECT' || type === 'SINGLE_CHOICE') {
    return (
      <InputSelect
        options={options}
        placeholder={placeholder}
        value={
          options.find((option) => String(option.id) === String(value)) || null
        }
        onChange={(option: Option | null) =>
          onChange(option ? option.id : null)
        }
      />
    )
  }

  if (type === 'MULTI_SELECT' || type === 'MULTIPLE_CHOICE') {
    const selectedIds = Array.isArray(value)
      ? value.map((item) => String(item))
      : []
    return (
      <InputSelectMultiple
        options={options}
        placeholder={placeholder}
        value={options.filter((option) =>
          selectedIds.includes(String(option.id)),
        )}
        onChange={(selected: Option[]) =>
          onChange(selected.map((option) => option.id))
        }
      />
    )
  }

  if (type === 'YES_NO_TOGGLE' || type === 'CONSENT') {
    return (
      <InputSwitch
        checked={Boolean(value)}
        label={question.label}
        onChange={onChange}
      />
    )
  }

  if (type === 'NUMBER' || type === 'CURRENCY_AMOUNT' || type === 'COUNTER') {
    return (
      <InputNumber
        placeholder={placeholder}
        withControls={false}
        value={
          typeof value === 'number' || typeof value === 'string' ? value : ''
        }
        onChange={onChange}
      />
    )
  }

  if (type === 'EMAIL') {
    return (
      <InputText
        placeholder={placeholder}
        type='email'
        value={asText(value)}
        onChange={onChange}
      />
    )
  }

  if (type === 'URL') {
    return (
      <InputText
        placeholder={placeholder}
        type='url'
        value={asText(value)}
        onChange={onChange}
      />
    )
  }

  if (type === 'PHONE_NUMBER') {
    return (
      <InputText
        placeholder={placeholder}
        type='tel'
        value={asText(value)}
        onChange={onChange}
      />
    )
  }

  return (
    <InputText
      placeholder={placeholder}
      value={asText(value)}
      onChange={onChange}
    />
  )
}

PortalWizardField.displayName = 'PortalWizardField'
export default PortalWizardField
