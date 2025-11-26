import { Switch as Base } from '@mantine/core'
import { type ChangeEvent, forwardRef } from 'react'
import cn from '@/utils/cn'
import type { SelectionProps as Props } from './shared/types'

const InputSwitch = forwardRef<HTMLInputElement, Props>(
  ({ className, error, onChange, ...rest }, ref) => {
    const _classNames = {
      body: 'inline-flex',
      description: 'mt-1 pl-2 text-12 text-gray-10',
      input: 'peer',
      label: 'pl-2 text-13 font-medium text-gray-12',
      labelWrapper: 'data-[disabled]:opacity-50',
      thumb: 'bg-white shadow-sm',
      track: cn(
        'mt-0.5 bg-gray-6 peer-checked:bg-primary-9 focus-within:outline-primary-8',
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
