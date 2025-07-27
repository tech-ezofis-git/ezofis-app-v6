import { Combobox as Base, Input, InputBase } from '@mantine/core'
import React from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'
import ClearButton from '../ClearButton'
import { classNames, inputWrapperOrder } from '../constants'
import InputLabel from '../InputLabel'

interface Props {
  children?: React.ReactNode
  className?: string
  clearable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  loading?: boolean
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
  value?: Option[] | null
  onChange?: (value: Option | null) => void
  onClick: () => void
}

const ComboboxTarget = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      className,
      clearable,
      description,
      disabled,
      error,
      label,
      loading,
      optional,
      placeholder,
      readOnly,
      required,
      tooltip,
      tooltipWidth,
      value,
      onChange,
      onClick,
    },
    ref,
  ) => {
    const rightSection = loading ? (
      <Icon className='animate-spin text-gray-500' name='gg:spinner' />
    ) : clearable && value && value.length ? (
      <ClearButton onClick={() => onChange?.(null)} />
    ) : (
      <Icon className='size-4 text-gray-500' name='tabler:selector' />
    )

    return (
      <Base.Target>
        <InputBase
          className={className}
          component='button'
          description={error ? undefined : description}
          disabled={disabled}
          error={error}
          inputWrapperOrder={inputWrapperOrder}
          ref={ref}
          rightSection={rightSection}
          rightSectionPointerEvents={clearable ? 'auto' : 'none'}
          type='button'
          pointer
          classNames={{
            description: classNames.description,
            error: classNames.error,
            input: cn(classNames.input, readOnly && 'border-dashed'),
            label: classNames.label,
            wrapper: classNames.wrapper,
          }}
          label={
            label ? (
              <InputLabel
                label={label}
                optional={optional}
                required={required}
                tooltip={tooltip}
                tooltipWidth={tooltipWidth}
              />
            ) : undefined
          }
          onClick={!readOnly ? onClick : undefined}
        >
          {children || (
            <Input.Placeholder className='font-normal text-gray-400'>
              {placeholder || 'Select'}
            </Input.Placeholder>
          )}
        </InputBase>
      </Base.Target>
    )
  },
)

ComboboxTarget.displayName = 'ComboboxTarget'
export default ComboboxTarget
