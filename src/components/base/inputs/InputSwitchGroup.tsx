import { Switch as Base } from '@mantine/core'
import { forwardRef } from 'react'
import cn from '@/utils/cn'
import type { SelectionGroupProps } from './shared/types'
import InputLabel from './InputLabel'
import InputSwitch from './InputSwitch'
import { OptionsPerLineClass } from './shared/constants'
import { classNames, inputWrapperOrder } from './shared/constants'

interface Props extends SelectionGroupProps {
  value: number[]
  onChange: (value: number[]) => void
}

const _classNames = {
  description: classNames.description,
  error: classNames.error,
  label: classNames.label,
}

const InputSwitchGroup = forwardRef<HTMLInputElement, Props>(
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
    const optionsPerLineClass = OptionsPerLineClass[optionsPerLine ?? 1]
    const normalizedValue = value.map((item) => String(item))

    const _label = label ? (
      <InputLabel
        label={label}
        optional={optional}
        required={required}
        tooltip={tooltip}
        tooltipWidth={tooltipWidth}
      />
    ) : undefined

    const handleChange = (selected: string[]) => {
      const parsedValue = selected.map((item) => Number(item))
      onChange(parsedValue)
    }

    return (
      <Base.Group
        className={className}
        classNames={_classNames}
        description={error ? undefined : description}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        ref={ref}
        size='xs'
        value={normalizedValue}
        onChange={handleChange}
      >
        <div className={cn('grid gap-x-4 gap-y-3 py-2', optionsPerLineClass)}>
          {options.map((option) => (
            <InputSwitch
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

InputSwitchGroup.displayName = 'InputSwitchGroup'
export default InputSwitchGroup
