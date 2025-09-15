import { NumberInput as Base } from '@mantine/core'
import { forwardRef } from 'react'
import type { InputProps } from './shared/types'
import ClearButton from './ClearButton'
import InputLabel from './InputLabel'
import { classNames, inputWrapperOrder } from './shared/constants'

interface Props extends InputProps {
  value: string | number
  allowDecimal?: boolean
  decimalScale?: number
  prefix?: string
  suffix?: string
  thousandSeparator?: string | boolean
  thousandsGroupStyle?: 'none' | 'thousand' | 'lakh' | 'wan'
  withControls?: boolean
  onChange: (value: string | number) => void
}

const _classNames = {
  control:
    'border-gray-7 text-gray-11 hover:bg-gray-4 hover:text-gray-12 transition-colors',
  description: classNames.description,
  error: classNames.error,
  input: classNames.input,
  label: classNames.label,
  wrapper: classNames.wrapper,
}

const InputNumber = forwardRef<HTMLInputElement, Props>(
  (
    {
      clearable,
      description,
      label,
      optional,
      required,
      tooltip,
      tooltipWidth,
      value,
      withControls,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const _clearable = clearable && value
    const _rightSection = _clearable && (
      <ClearButton className='mr-2' onClick={() => onChange('')} />
    )

    const _label = label ? (
      <InputLabel
        label={label}
        optional={optional}
        required={required}
        tooltip={tooltip}
        tooltipWidth={tooltipWidth}
      />
    ) : undefined

    return (
      <Base
        {...rest}
        classNames={_classNames}
        description={rest.error ? undefined : description}
        hideControls={!withControls}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        ref={ref}
        rightSection={_rightSection}
        rightSectionPointerEvents={withControls || _clearable ? 'auto' : 'none'}
        value={value}
        onChange={onChange}
      />
    )
  },
)

InputNumber.displayName = 'InputNumber'
export default InputNumber
