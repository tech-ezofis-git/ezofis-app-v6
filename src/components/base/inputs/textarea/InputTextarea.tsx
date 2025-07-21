import { Textarea as Primitive } from '@mantine/core'
import React, { type ChangeEvent, useState } from 'react'
import { InputLabel } from '@/components/base'
import { classNames, inputWrapperOrder } from '../styles'

interface Props {
  autosize?: boolean
  className?: string
  description?: string
  error?: string
  isDisabled?: boolean
  isOptional?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  label?: string
  maxLength?: number
  maxRows?: number
  minRows?: number
  placeholder?: string
  resize?: 'none' | 'vertical' | 'both'
  rows?: number
  tooltip?: string
  tooltipWidth?: number
  value?: string
  onChange?: (value: string) => void
}

const InputTextarea = React.forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      autosize,
      className,
      description,
      error,
      isDisabled,
      isOptional,
      isReadOnly,
      isRequired,
      label,
      maxLength,
      maxRows,
      minRows = 3,
      onChange,
      placeholder,
      resize,
      rows = 3,
      tooltip,
      tooltipWidth,
      value,
    },
    ref,
  ) => {
    const [length, setLength] = useState(0)
    const getDescription = () => {
      if (maxLength) {
        return `${length}/${maxLength}`
      }
      return description
    }

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e.currentTarget.value)
      }

      if (maxLength) {
        setLength(e.currentTarget.value.length)
      }
    }

    return (
      <Primitive
        autosize={autosize}
        className={className}
        description={error ? undefined : getDescription()}
        disabled={isDisabled}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        maxRows={maxRows}
        minRows={minRows}
        placeholder={placeholder}
        readOnly={isReadOnly}
        ref={ref}
        resize={resize}
        rows={rows}
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

InputTextarea.displayName = 'InputTextarea'
export default InputTextarea
