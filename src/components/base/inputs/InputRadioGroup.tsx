import { Radio as Base } from '@mantine/core'
import { forwardRef } from 'react'
import cn from '@/utils/cn'
import type { SelectionGroupProps } from './shared/types'
import InputLabel from './InputLabel'
import InputRadio from './InputRadio'
import { classNames, inputWrapperOrder } from './shared/constants'
import { OptionsPerLineClass } from './shared/constants'

interface Props extends SelectionGroupProps {
  value: number | null
  onChange: (value: number) => void
}

const _classNames = {
  description: classNames.description,
  error: classNames.error,
  label: classNames.label,
}

const InputRadioGroup = forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      description,
      disabled,
      error,
      label,
      optional,
      options,
      optionsPerLine,
      required,
      tooltip,
      tooltipWidth,
      value,
      onChange,
    },
    ref,
  ) => {
    const _value = value ? String(value) : ''
    const optionsPerLineClass = OptionsPerLineClass[optionsPerLine ?? 1]
    const handleChange = (value: string) => onChange(Number(value))

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
      <Base.Group
        className={className}
        classNames={_classNames}
        description={error ? undefined : description}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        ref={ref}
        size='xs'
        value={_value}
        onChange={handleChange}
      >
        <div className={cn('grid gap-x-4 gap-y-3', optionsPerLineClass)}>
          {options.map((option) => (
            <InputRadio
              description={option.description}
              disabled={disabled || option.disabled}
              error={error}
              key={option.id}
              label={option.name}
              value={String(option.id)}
            />
          ))}
        </div>
      </Base.Group>
    )
  },
)

InputRadioGroup.displayName = 'InputRadioGroup'
export default InputRadioGroup
