import { Checkbox as Base } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import cn from '@/utils/cn'

interface Props {
  label: string
  checked?: boolean
  className?: string
  description?: string
  disabled?: boolean
  error?: string
  indeterminate?: boolean
  value?: string | number
  onChange?: (value: boolean) => void
}

const InputCheckbox = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      checked,
      className,
      description,
      disabled,
      error,
      indeterminate,
      label,
      value,
      onChange,
    },
    ref,
  ) => {
    const hasError = Boolean(error)
    const normalizedValue = value ? String(value) : undefined
    const _classNames = {
      description: 'mt-1 pl-2.5 text-sx text-gray-500',
      icon: 'text-gray-0',
      inner: 'mt-[1px]',
      input: cn(
        'rounded border-gray-600/30 bg-transparent checked:border-primary checked:bg-primary focus-within:outline-primary/50 disabled:bg-surface-muted',
        hasError && 'border-red',
      ),
      label: 'pl-2.5 text-sm font-medium text-gray-800',
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange?.(e.currentTarget.checked)

    return (
      <Base
        checked={checked}
        className={cn(disabled && 'opacity-50', className)}
        classNames={_classNames}
        description={description}
        disabled={disabled}
        indeterminate={indeterminate}
        label={label}
        ref={ref}
        size='xs'
        value={normalizedValue}
        onChange={handleChange}
      />
    )
  },
)

InputCheckbox.displayName = 'InputCheckbox'
export default InputCheckbox
