import { TextInput as Primitive } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import { InputLabel } from '@/components/base'
import { classNames, inputWrapperOrder } from '../styles'

interface Props {
  className?: string
  description?: string
  error?: string
  isDisabled?: boolean
  isOptional?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  label?: string
  leftSection?: React.ReactNode
  leftSectionPointerEvents?: 'auto' | 'none'
  placeholder?: string
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
      description,
      error,
      isDisabled,
      isOptional,
      isReadOnly,
      isRequired,
      label,
      leftSection,
      leftSectionPointerEvents = 'none',
      onChange,
      placeholder,
      rightSection,
      rightSectionPointerEvents = 'none',
      tooltip,
      tooltipWidth,
      value,
    },
    ref,
  ) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.currentTarget.value)
      }
    }

    return (
      <Primitive
        className={className}
        description={error ? undefined : description}
        disabled={isDisabled}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        leftSection={leftSection}
        leftSectionPointerEvents={leftSectionPointerEvents}
        placeholder={placeholder}
        readOnly={isReadOnly}
        ref={ref}
        rightSection={rightSection}
        rightSectionPointerEvents={rightSectionPointerEvents}
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
              isOptional={isOptional}
              isRequired={isRequired}
              label={label}
              tooltip={tooltip}
              tooltipWidth={tooltipWidth}
            />
          ) : undefined
        }
        onChange={handleChange}
      />
    )
  },
)

InputText.displayName = 'InputText'
export default InputText
