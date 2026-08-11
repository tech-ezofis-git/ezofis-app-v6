import { Switch as Base } from '@mantine/core'
import { type ChangeEvent, forwardRef } from 'react'
import cn from '@/utils/cn'
import type { SelectionProps as Props } from './shared/types'

const InputSwitch = forwardRef<HTMLInputElement, Props>(
  ({ className, error, onChange, ...rest }, ref) => {
    const _classNames = {
      body: 'inline-flex cursor-pointer',
      description: 'mt-1 pl-2 text-xs text-gray-10',
      input: 'peer cursor-pointer',
      label: 'pl-2 text-13 font-medium text-gray-12 cursor-pointer',
      labelWrapper: 'data-[disabled]:opacity-50 cursor-pointer',
      thumb: 'bg-[var(--control-thumb)] shadow-sm pointer-events-none',
      track: cn(
        'bg-gray-200 mt-0.5 cursor-pointer ring-0 transition-all duration-300 peer-checked:bg-primary-9 peer-checked:ring-2 peer-checked:ring-primary-4 peer-checked:ring-offset-1 focus-within:outline-primary-8',
        Boolean(error) && 'border border-red-9',
      ),
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange?.(e.currentTarget.checked)

    return (
      <Base
        {...rest}
        className={cn(rest.disabled && 'opacity-50', className)}
        classNames={_classNames}
        ref={ref}
        size='xs'
        withThumbIndicator={false}
        onChange={handleChange}
      />
    )
  },
)

InputSwitch.displayName = 'InputSwitch'
export default InputSwitch
