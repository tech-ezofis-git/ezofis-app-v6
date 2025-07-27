import { NumberInput as Base } from '@mantine/core'
import React from 'react'
import ClearButton from './ClearButton'
import { classNames, inputWrapperOrder } from './constants'
import InputLabel from './InputLabel'

interface Props {
  allowDecimal?: boolean
  className?: string
  clearable?: boolean
  decimalScale?: number
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  optional?: boolean
  placeholder?: string
  prefix?: string
  readOnly?: boolean
  required?: boolean
  suffix?: string
  thousandSeparator?: string | boolean
  thousandsGroupStyle?: 'none' | 'thousand' | 'lakh' | 'wan'
  tooltip?: string
  tooltipWidth?: number
  value?: string | number
  withControls?: boolean
  onChange?: (value: string | number) => void
}

const InputNumber = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      allowDecimal,
      className,
      clearable,
      decimalScale,
      description,
      disabled,
      error,
      label,
      optional,
      placeholder,
      prefix,
      readOnly,
      required,
      suffix,
      thousandSeparator,
      thousandsGroupStyle,
      tooltip,
      tooltipWidth,
      value,
      withControls,
      onChange,
    },
    ref,
  ) => {
    const rightSection = clearable && value && (
      <ClearButton className='mr-2' onClick={() => onChange?.('')} />
    )

    return (
      <Base
        allowDecimal={allowDecimal}
        className={className}
        decimalScale={decimalScale}
        description={error ? undefined : description}
        disabled={disabled}
        error={error}
        hideControls={!withControls}
        inputWrapperOrder={inputWrapperOrder}
        placeholder={placeholder}
        prefix={prefix}
        readOnly={readOnly}
        ref={ref}
        rightSection={rightSection}
        rightSectionPointerEvents={rightSection ? 'auto' : 'none'}
        suffix={suffix}
        thousandSeparator={thousandSeparator}
        thousandsGroupStyle={thousandsGroupStyle}
        value={value}
        classNames={{
          control: 'border-gray-600/25 text-gray-500 hover:bg-gray-600/10',
          description: classNames.description,
          error: classNames.error,
          input: classNames.input,
          label: classNames.label,
          wrapper: classNames.wrapper,
        }}
        label={
          label ? (
            <InputLabel
              label={label}
              optional={optional}
              required={required}
              tooltip={tooltip}
              tooltipWidth={tooltipWidth}
            />
          ) : undefined
        }
        onChange={onChange}
      />
    )
  },
)

InputNumber.displayName = 'InputNumber'
export default InputNumber
