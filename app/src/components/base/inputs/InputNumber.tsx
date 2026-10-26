import { NumberInput as Base } from '@mantine/core'
import { type NumberInputProps } from '@mantine/core'
import { forwardRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import type { InputProps } from './shared/types'
import ClearButton from './ClearButton'
import InputLabel from './InputLabel'
import { classNames, inputWrapperOrder } from './shared/constants'

interface Props
  extends
    InputProps,
    Omit<NumberInputProps, keyof InputProps | 'value' | 'onChange'> {
  value: string | number
  allowDecimal?: boolean
  decimalScale?: number
  loading?: boolean
  prefix?: string
  suffix?: string
  thousandSeparator?: string | boolean
  thousandsGroupStyle?: 'none' | 'thousand' | 'lakh' | 'wan'
  withControls?: boolean
  onChange: (value: string | number) => void
}

const InputNumber = forwardRef<HTMLInputElement, Props>(
  (
    {
      clearable,
      description,
      label,
      loading,
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
    const _clearable = !loading && clearable && value
    const _rightSection = loading ? (
      <Icon className='animate-spin text-gray-10' name='fa:spinner' />
    ) : (
      _clearable && (
        <ClearButton className='mr-2' onClick={() => onChange('')} />
      )
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
        description={rest.error ? undefined : description}
        hideControls={!withControls}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        ref={ref}
        rightSection={_rightSection}
        rightSectionPointerEvents={withControls || _clearable ? 'auto' : 'none'}
        value={value}
        classNames={{
          control:
            'border-gray-7 text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12',
          description: classNames.description,
          error: classNames.error,
          input: classNames.input,
          label: classNames.label,
          wrapper: classNames.wrapper,
        }}
        onChange={onChange}
      />
    )
  },
)

InputNumber.displayName = 'InputNumber'
export default InputNumber
