import { Radio as Base } from '@mantine/core'
import { type ChangeEvent, forwardRef } from 'react'
import cn from '@/utils/cn'
import type { SelectionProps as Props } from './shared/types'

const InputRadio = forwardRef<HTMLInputElement, Props>(
  ({ className, error, onChange, ...rest }, ref) => {
    const _classNames = {
      description: 'mt-1 pl-2.5 text-sm text-gray-10',
      icon: 'text-white',
      inner: 'size-5 flex items-center justify-center',
      label: 'pl-2.5 text-sm font-medium text-gray-12',
      radio: cn(
        'border-gray-8 bg-transparent checked:border-primary-9 checked:bg-primary-9 focus-within:outline-primary-8 disabled:opacity-50',
        Boolean(error) && 'border-red-9',
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
        onChange={handleChange}
      />
    )
  },
)

InputRadio.displayName = 'InputRadio'
export default InputRadio
