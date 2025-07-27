import { Textarea as Base } from '@mantine/core'
import React, { type ChangeEvent, useState } from 'react'
import { classNames, inputWrapperOrder } from './constants'
import InputLabel from './InputLabel'

interface Props {
  autosize?: boolean
  className?: string
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  maxLength?: number
  maxRows?: number
  minRows?: number
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
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
      disabled,
      error,
      label,
      maxLength,
      maxRows,
      minRows = 3,
      optional,
      placeholder,
      readOnly,
      required,
      resize,
      rows = 3,
      tooltip,
      tooltipWidth,
      value,
      onChange,
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
      onChange?.(e.currentTarget.value)

      if (maxLength) {
        setLength(e.currentTarget.value.length)
      }
    }

    return (
      <Base
        autosize={autosize}
        className={className}
        description={error ? undefined : getDescription()}
        disabled={disabled}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        maxRows={maxRows}
        minRows={minRows}
        placeholder={placeholder}
        readOnly={readOnly}
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
              label={label}
              optional={optional}
              required={required}
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
