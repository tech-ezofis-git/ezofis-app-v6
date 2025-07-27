import { Switch as Base } from '@mantine/core'
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

const InputSwitch = React.forwardRef<HTMLInputElement, Props>(
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
    const _classNames = {
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
        label={label}
        ref={ref}
        size='xs'
        value={normalizedValue}
        withThumbIndicator={false}
        onChange={handleChange}
      />
    )
  },
)

InputSwitch.displayName = 'InputSwitch'
export default InputSwitch
