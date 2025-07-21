import { Switch as Primitive } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import { cn } from '@/utils'

interface Props {
  label: string
  checked?: boolean
  className?: string
  description?: string
  error?: string
  isDisabled?: boolean
  value?: number
  onChange?: (value: boolean) => void
}

const InputSwitch = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      checked,
      className,
      description,
      error,
      isDisabled,
      label,
      onChange,
      value,
    },
    ref,
  ) => {
    const hasError = Boolean(error)
    const normalizedValue = value ? String(value) : undefined

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.currentTarget.checked)
      }
    }

    return (
      <Primitive
        checked={checked}
        className={cn(isDisabled && 'opacity-50', className)}
        description={description}
        disabled={isDisabled}
        label={label}
        ref={ref}
        size='xs'
        value={normalizedValue}
        withThumbIndicator={false}
        classNames={{
          body: 'inline-flex',
          description: 'mt-1 pl-2.5 text-sx text-gray-500',
          input: 'peer',
          label: 'pl-2.5 text-sm font-medium text-gray-800',
          labelWrapper: 'data-[disabled]:opacity-50',
          thumb: 'bg-gray-0',
          track: cn(
            'mt-0.5 bg-gray-600/30 peer-checked:bg-primary focus-within:outline-primary/50',
            hasError && 'border border-red',
          ),
        }}
        onChange={handleChange}
      />
    )
  },
)

InputSwitch.displayName = 'InputSwitch'
export default InputSwitch
