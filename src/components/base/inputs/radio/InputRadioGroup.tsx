import { Radio as Primitive } from '@mantine/core'
import React from 'react'
import type { IListItem, TOptionsPerLine } from '@/components/base/types'
import { InputLabel } from '@/components/base'
import { OptionsPerLineClass } from '@/components/base/constants'
import { cn } from '@/utils'
import { classNames, inputWrapperOrder } from '../styles'
import InputRadio from './InputRadio'

interface Props {
  options: IListItem[]
  className?: string
  description?: string
  error?: string
  isDisabled?: boolean
  isOptional?: boolean
  isRequired?: boolean
  label?: string
  tooltip?: string
  tooltipWidth?: number
  TOptionsPerLine?: TOptionsPerLine
  value?: number
  onChange?: (value: number) => void
}

const InputRadioGroup = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      description,
      error,
      isDisabled,
      isOptional,
      isRequired,
      label,
      onChange,
      options,
      tooltip,
      tooltipWidth,
      TOptionsPerLine = 1,
      value,
    },
    ref,
  ) => {
    const optionsPerLineClass = OptionsPerLineClass[TOptionsPerLine]
    const normalizedValue = value ? String(value) : undefined

    const handleChange = (value: string) => {
      if (onChange) {
        onChange(Number(value))
      }
    }

    return (
      <Primitive.Group
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
              isOptional={isOptional}
              isRequired={isRequired}
              label={label}
              tooltip={tooltip}
              tooltipWidth={tooltipWidth}
            />
          ) : undefined
        }
        onChange={handleChange}
      >
        <div className={cn('grid gap-x-4 gap-y-3', optionsPerLineClass)}>
          {options.map((option) => (
            <InputRadio
              description={option.description}
              error={error}
              isDisabled={isDisabled || option.isDisabled}
              key={option.id}
              label={option.label}
              value={option.id}
            />
          ))}
        </div>
      </Primitive.Group>
    )
  },
)

InputRadioGroup.displayName = 'InputRadioGroup'
export default InputRadioGroup
