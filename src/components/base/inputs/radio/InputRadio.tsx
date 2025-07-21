import { Radio as Primitive } from '@mantine/core'
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

const InputRadio = React.forwardRef<HTMLInputElement, Props>(
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
        classNames={{
          description: 'mt-1 pl-2.5 text-sx text-gray-500',
          inner: 'mt-[1px]',
          label: 'pl-2.5 text-sm font-medium text-gray-800',
          radio: cn(
            'border-gray-600/30 bg-transparent checked:border-primary checked:bg-primary focus-within:outline-primary/50 disabled:bg-surface-muted',
            hasError && 'border-red',
          ),
        }}
        onChange={handleChange}
      />
    )
  },
)

InputRadio.displayName = 'InputRadio'
export default InputRadio
