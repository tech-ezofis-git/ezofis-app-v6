import { TimePicker as Primitive } from '@mantine/dates'
import React from 'react'
import { Icon } from '@/components/base'
import { InputLabel } from '@/components/base'
import { cn } from '@/utils'
import { classNames, inputWrapperOrder } from '../styles'

interface Props {
  className?: string
  description?: string
  error?: string
  format?: '12h' | '24h'
  isDisabled?: boolean
  isOptional?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  label?: string
  maxTime?: string
  minTime?: string
  tooltip?: string
  tooltipWidth?: number
  value?: string
  onChange?: (value: string) => void
}

const InputTime = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      description,
      error,
      format,
      isDisabled,
      isOptional,
      isReadOnly,
      isRequired,
      label,
      maxTime,
      minTime,
      onChange,
      tooltip,
      tooltipWidth,
      value,
    },
    ref,
  ) => {
    const rightSection = <Icon className='text-gray-500' name='tabler:clock' />

    return (
      <Primitive
        className={className}
        description={error ? undefined : description}
        disabled={isDisabled}
        error={error}
        format={format}
        inputWrapperOrder={inputWrapperOrder}
        max={maxTime}
        min={minTime}
        readOnly={isReadOnly}
        ref={ref}
        rightSection={rightSection}
        rightSectionPointerEvents='none'
        value={value}
        withDropdown
        classNames={{
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

InputTime.displayName = 'InputTime'
export default InputTime
