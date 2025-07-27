import { TimePicker as Base } from '@mantine/dates'
import React from 'react'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'
import ClearButton from './ClearButton'
import { classNames, inputWrapperOrder } from './constants'
import InputLabel from './InputLabel'

interface Props {
  className?: string
  clearable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  format?: '12h' | '24h'
  label?: string
  maxTime?: string
  minTime?: string
  optional?: boolean
  readOnly?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
  value?: string
  onChange?: (value: string) => void
}

const InputTime = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      clearable,
      description,
      disabled,
      error,
      format,
      label,
      maxTime,
      minTime,
      optional,
      readOnly,
      required,
      tooltip,
      tooltipWidth,
      value,
      onChange,
    },
    ref,
  ) => {
    const _classNames = {
      control:
        'text-gray-700 hover:bg-surface-raised-hover hover:text-gray-750 hover:transition-colors data-[active]:!bg-primary data-[active]:!font-medium data-[active]:!text-gray-0',
      description: classNames.description,
      dropdown: 'border-0 bg-surface-raised ring-1 ring-gray-600/10',
      error: classNames.error,
      field: cn(
        'placeholder:text-gray-400 focus:bg-primary focus:text-gray-0 focus:placeholder:text-gray-0',
      ),
      fieldsGroup: value ? 'text-gray-900' : 'text-gray-400',
      input: classNames.input,
      label: classNames.label,
      wrapper: classNames.wrapper,
    }
    const rightSection =
      clearable && value ? (
        <ClearButton onClick={() => onChange?.('')} />
      ) : (
        <Icon className='text-gray-500' name='tabler:clock' />
      )

    return (
      <Base
        className={className}
        classNames={_classNames}
        description={error ? undefined : description}
        disabled={disabled}
        error={error}
        format={format}
        inputWrapperOrder={inputWrapperOrder}
        max={maxTime}
        min={minTime}
        readOnly={readOnly}
        ref={ref}
        rightSection={rightSection}
        rightSectionPointerEvents={clearable ? 'auto' : 'none'}
        value={value}
        withDropdown
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

InputTime.displayName = 'InputTime'
export default InputTime
