import { Combobox as Base, Input, InputBase } from '@mantine/core'
import { forwardRef, type ReactNode, useMemo } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { InputProps, InputSize, SelectVariant } from '../shared/types'
import ClearButton from '../ClearButton'
import InputLabel from '../InputLabel'
import {
  classNames,
  inputWrapperOrder,
  sizeClassName,
} from '../shared/constants'

interface Props extends InputProps {
  value: Option[]
  leftSection?: ReactNode
  loading?: boolean
  size?: InputSize
  variant?: SelectVariant
  onChange: (value: Option[]) => void
  onClick: () => void
}

const ComboboxTarget = forwardRef<HTMLButtonElement, Props>(
  (
    {
      clearable,
      description,
      label,
      loading,
      optional,
      placeholder,
      readOnly,
      required,
      size = 'md',
      tooltip,
      tooltipWidth,
      value,
      variant = 'single',
      onChange,
      onClick,
      ...rest
    },
    ref,
  ) => {
    const [firstValue, counter] = useMemo(() => {
      const first = value[0] || null
      const count = value.length > 1 ? value.length - 1 : null
      return [first, count]
    }, [value])

    const _classNames = {
      description: classNames.description,
      error: classNames.error,
      input: cn(
        classNames.input,
        readOnly && 'border-dashed',
        sizeClassName[size],
      ),
      label: classNames.label,
      wrapper: classNames.wrapper,
    }

    const _label = label ? (
      <InputLabel
        label={label}
        optional={optional}
        required={required}
        tooltip={tooltip}
        tooltipWidth={tooltipWidth}
      />
    ) : undefined

    const _rightSection = loading ? (
      <Icon className='animate-spin text-gray-9' name='gg:spinner' />
    ) : clearable && value.length ? (
      <ClearButton onClick={() => onChange([])} />
    ) : (
      <Icon className='text-gray-9' name='tabler:chevron-down' />
    )

    const children = useMemo(() => {
      if (!value.length) {
        return (
          <Input.Placeholder className='font-normal text-gray-8'>
            {placeholder || 'Select'}
          </Input.Placeholder>
        )
      }

      if (variant === 'single') {
        return (
          <div className='text-small font-medium text-gray-12'>
            {firstValue?.name}
          </div>
        )
      }

      return (
        <div className='flex items-center gap-1 py-1'>
          <div className='truncate rounded bg-gray-4 px-2 py-0.5 text-small font-medium whitespace-nowrap text-gray-12'>
            {firstValue?.name}
          </div>
          {counter && (
            <div className='rounded bg-gray-4 px-2 py-0.5 text-small font-medium whitespace-nowrap text-gray-12'>
              +{counter}
            </div>
          )}
        </div>
      )
    }, [value, variant, firstValue, counter, placeholder])

    return (
      <Base.Target>
        <InputBase
          {...rest}
          classNames={_classNames}
          component='button'
          description={rest.error ? undefined : description}
          inputWrapperOrder={inputWrapperOrder}
          label={_label}
          ref={ref}
          rightSection={_rightSection}
          rightSectionPointerEvents={clearable ? 'auto' : 'none'}
          type='button'
          pointer
          onClick={readOnly ? undefined : onClick}
        >
          {children}
        </InputBase>
      </Base.Target>
    )
  },
)

ComboboxTarget.displayName = 'ComboboxTarget'
export default ComboboxTarget
