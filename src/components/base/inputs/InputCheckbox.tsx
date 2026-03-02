import { Checkbox as Base } from '@mantine/core'
import { type ChangeEvent, forwardRef } from 'react'
import cn from '@/utils/cn'
import type { SelectionProps } from './shared/types'

interface Props extends SelectionProps {
  indeterminate?: boolean
  labelClassName?: string
}

const InputCheckbox = forwardRef<HTMLInputElement, Props>(
  (
    { className, error, indeterminate, labelClassName, onChange, ...rest },
    ref,
  ) => {
    const _classNames = {
      description: 'mt-1 pl-2 text-xs text-gray-10',
      icon: 'text-white w-[50%]',
      inner: 'size-5 flex items-center justify-center',
      input: cn(
        'cursor-pointer data-[indeterminate]:border-primary rounded-[3px] border-gray-8 bg-transparent checked:border-primary-9 checked:bg-primary-9 focus-within:outline-primary-8 disabled:opacity-50 data-[indeterminate]:border-primary-9 data-[indeterminate]:bg-primary-9',
        Boolean(error) && 'border-red-9',
      ),
      label: cn('cursor-pointer pl-2 text-13 font-medium text-gray-12', labelClassName),
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange?.(e.currentTarget.checked)

    return (
      <Base
        {...rest}
        className={cn(rest.disabled && 'opacity-50', className)}
        classNames={_classNames}
        indeterminate={indeterminate}
        ref={ref}
        size='xs'
        onChange={handleChange}
      />
    )
  },
)

InputCheckbox.displayName = 'InputCheckbox'
export default InputCheckbox
