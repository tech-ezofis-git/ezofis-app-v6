import { Radio as Base } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import cn from '@/utils/cn'

interface Props {
  label: string
  checked?: boolean
  className?: string
  description?: string
  disabled?: boolean
  error?: string
  value?: number
  onChange?: (value: boolean) => void
}

const InputRadio = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      checked,
      className,
      description,
      disabled,
      error,
      label,
      value,
      onChange,
    },
    ref,
  ) => {
    const hasError = Boolean(error)
    const normalizedValue = value ? String(value) : undefined
    const computedClassNames = {
      description: 'mt-1 pl-2.5 text-sx text-gray-500',
      inner: 'mt-[1px]',
      label: 'pl-2.5 text-sm font-medium text-gray-800',
      radio: cn(
        'border-gray-600/30 bg-transparent checked:border-primary checked:bg-primary focus-within:outline-primary/50 disabled:bg-surface-muted',
        hasError && 'border-red',
      ),
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange?.(e.currentTarget.checked)

    return (
      <Base
        checked={checked}
        className={cn(disabled && 'opacity-50', className)}
        classNames={computedClassNames}
        description={description}
        disabled={disabled}
        label={label}
        ref={ref}
        size='xs'
        value={normalizedValue}
        onChange={handleChange}
      />
    )
  },
)

InputRadio.displayName = 'InputRadio'
export default InputRadio
