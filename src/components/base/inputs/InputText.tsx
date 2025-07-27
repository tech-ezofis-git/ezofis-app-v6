import { TextInput as Base } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import ClearButton from './ClearButton'
import { classNames, inputWrapperOrder } from './constants'
import InputLabel from './InputLabel'

interface Props {
  className?: string
  clearable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  leftSection?: React.ReactNode
  leftSectionPointerEvents?: 'auto' | 'none'
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  rightSection?: React.ReactNode
  rightSectionPointerEvents?: 'auto' | 'none'
  tooltip?: string
  tooltipWidth?: number
  value?: string
  onChange?: (value: string) => void
}

const InputText = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      clearable,
      description,
      disabled,
      error,
      label,
      leftSection,
      leftSectionPointerEvents = 'none',
      optional,
      placeholder,
      readOnly,
      required,
      rightSection,
      rightSectionPointerEvents = 'none',
      tooltip,
      tooltipWidth,
      value,
      onChange,
    },
    ref,
  ) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange?.(e.currentTarget.value)

    const _rightSection =
      clearable && value ? (
        <ClearButton onClick={() => onChange?.('')} />
      ) : (
        rightSection
      )

    return (
      <Base
        className={className}
        description={error ? undefined : description}
        disabled={disabled}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        leftSection={leftSection}
        leftSectionPointerEvents={leftSectionPointerEvents}
        placeholder={placeholder}
        readOnly={readOnly}
        ref={ref}
        rightSection={_rightSection}
        value={value}
        classNames={{
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
        rightSectionPointerEvents={
          clearable ? 'auto' : rightSectionPointerEvents
        }
        onChange={handleChange}
      />
    )
  },
)

InputText.displayName = 'InputText'
export default InputText
