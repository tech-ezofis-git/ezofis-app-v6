import { PinInput as Base } from '@mantine/core'
import React from 'react'
import { classNames } from './constants'

interface Props {
  className?: string
  disabled?: boolean
  error?: boolean
  length?: number
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

const InputPin = React.forwardRef<HTMLInputElement, Props>(
  (
    { className, disabled, error, length, placeholder = '', value, onChange },
    ref,
  ) => {
    return (
      <Base
        className={className}
        disabled={disabled}
        error={error}
        length={length}
        placeholder={placeholder}
        ref={ref}
        value={value}
        classNames={{
          input: classNames.input,
        }}
        onChange={onChange}
      />
    )
  },
)

InputPin.displayName = 'InputPin'
export default InputPin
