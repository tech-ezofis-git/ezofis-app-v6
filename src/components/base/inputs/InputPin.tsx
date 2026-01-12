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
  ({ placeholder = '', ...rest }, ref) => {
    return (
      <Base
        {...rest}
        placeholder={placeholder}
        ref={ref}
        classNames={{
          input: cn(classNames.input, 'h-10'),
          pinInput: 'flex-1',
        }}
        oneTimeCode
      />
    )
  },
)

InputPin.displayName = 'InputPin'
export default InputPin
