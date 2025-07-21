import { PinInput as Primitive } from '@mantine/core'
import React from 'react'
import { classNames } from '../styles'

interface Props {
  className?: string
  error?: boolean
  isDisabled?: boolean
  length?: number
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

const InputPin = React.forwardRef<HTMLInputElement, Props>(
  (
    { className, error, isDisabled, length, onChange, placeholder = '', value },
    ref,
  ) => {
    return (
      <Primitive
        className={className}
        disabled={isDisabled}
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
