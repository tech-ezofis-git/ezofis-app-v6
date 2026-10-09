import { PinInput as Base, type PinInputProps } from '@mantine/core'
import { forwardRef } from 'react'
import cn from '@/utils/cn'
import { classNames } from './shared/constants'

interface Props extends PinInputProps {
  value: string
  className?: string
  disabled?: boolean
  error?: boolean
  length?: number
  placeholder?: string
  onChange: (value: string) => void
}

const InputPin = forwardRef<HTMLInputElement, Props>(
  ({ placeholder = '', type = 'number', onChange, ...rest }, ref) => {
    return (
      <Base
        inputMode='numeric'
        type={type}
        {...rest}
        placeholder={placeholder}
        ref={ref}
        classNames={{
          input: cn(classNames.input, 'h-10'),
          pinInput: 'flex-1',
        }}
        oneTimeCode
        onChange={(val) => {
          if (type === 'number') {
            onChange(val.replace(/\D/g, ''))
          } else {
            onChange(val)
          }
        }}
      />
    )
  },
)

InputPin.displayName = 'InputPin'
export default InputPin
