import { Checkbox as Base } from '@mantine/core'
import React from 'react'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'
import type { OptionsPerLine } from './types'
import { OptionsPerLineClass } from './constants'
import { classNames, inputWrapperOrder } from './constants'
import InputCheckbox from './InputCheckbox'
import InputLabel from './InputLabel'

interface Props {
  options: Option[]
  className?: string
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  optional?: boolean
  OptionsPerLine?: OptionsPerLine
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
  value?: number[]
  onChange?: (value: number[]) => void
}

const InputCheckboxGroup = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      description,
      disabled,
      error,
      label,
      optional,
      options,
      OptionsPerLine = 1,
      required,
      tooltip,
      tooltipWidth,
      value,
      onChange,
    },
    ref,
  ) => {
    const optionsPerLineClass = OptionsPerLineClass[OptionsPerLine]
    const normalizedValue = value?.map((item) => String(item))

    const handleChange = (selected: string[]) => {
      const parsedValue = selected.map((item) => Number(item))
      onChange?.(parsedValue)
    }

    return (
      <Base.Group
        className={className}
        description={error ? undefined : description}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        ref={ref}
        size='xs'
        value={normalizedValue}
        classNames={{
          description: classNames.description,
          error: classNames.error,
          label: classNames.label,
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
        onChange={handleChange}
      >
        <div className={cn('grid gap-x-4 gap-y-3', optionsPerLineClass)}>
          {options.map((option) => (
            <InputCheckbox
              description={option.description}
              disabled={disabled || option.disabled}
              error={error}
              key={option.id}
              label={option.name}
              value={option.id}
            />
          ))}
        </div>
      </Base.Group>
    )
  },
)

export default InputCheckboxGroup
InputCheckboxGroup.displayName = 'InputCheckboxGroup'
