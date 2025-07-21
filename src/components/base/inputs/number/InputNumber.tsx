import { NumberInput as Primitive } from '@mantine/core'
import React from 'react'
import { InputLabel } from '@/components/base'
import { classNames, inputWrapperOrder } from '../styles'

interface Props {
  allowDecimal?: boolean
  className?: string
  decimalScale?: number
  description?: string
  error?: string
  isDisabled?: boolean
  isOptional?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  label?: string
  placeholder?: string
  prefix?: string
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
      decimalScale,
      description,
      error,
      isDisabled,
      isOptional,
      isReadOnly,
      isRequired,
      label,
      onChange,
      placeholder,
      prefix,
      suffix,
      thousandSeparator,
      thousandsGroupStyle,
      tooltip,
      tooltipWidth,
      value,
      withControls,
    },
    ref,
  ) => {
    return (
      <Primitive
        allowDecimal={allowDecimal}
        className={className}
        decimalScale={decimalScale}
        description={error ? undefined : description}
        disabled={isDisabled}
        error={error}
        hideControls={!withControls}
        inputWrapperOrder={inputWrapperOrder}
        placeholder={placeholder}
        prefix={prefix}
        readOnly={isReadOnly}
        ref={ref}
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
              isOptional={isOptional}
              isRequired={isRequired}
              label={label}
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
