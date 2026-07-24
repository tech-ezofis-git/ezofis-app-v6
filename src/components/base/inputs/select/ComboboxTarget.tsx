import { Combobox as Base, Input, InputBase } from '@mantine/core'
import { forwardRef, type ReactNode, useMemo } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { InputProps, SelectVariant } from '../shared/types'
import ClearButton from '../ClearButton'
import InputLabel from '../InputLabel'
import { classNames, inputWrapperOrder } from '../shared/constants'

interface Props extends InputProps {
  value: Option[]
  iconOnly?: boolean
  leftSection?: ReactNode
  loading?: boolean
  rightSectionIcon?: string
  variant?: SelectVariant
  onChange: (value: Option[]) => void
  onClick: () => void
}

const ComboboxTarget = forwardRef<HTMLButtonElement, Props>(
  (
    {
      clearable,
      description,
      iconOnly,
      label,
      loading,
      optional,
      placeholder,
      readOnly,
      required,
      rightSectionIcon,
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
      input: cn(classNames.input, readOnly && 'border-dashed'),
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
      <Icon className='animate-spin text-gray-10' name='fa:spinner' />
    ) : clearable && value.length ? (
      <ClearButton onClick={() => onChange([])} />
    ) : (
      <Icon
        className='text-gray-10'
        name={rightSectionIcon || 'lucide:chevron-down'}
      />
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
        if (iconOnly) {
          return firstValue ? (
            <span className='sr-only'>{firstValue.name}</span>
          ) : (
            <Input.Placeholder className='font-normal text-gray-8'>
              {placeholder || 'Select'}
            </Input.Placeholder>
          )
        }

        return (
          <div className='truncate text-13 font-normal text-gray-12'>
            {firstValue?.name}
          </div>
        )
      }

      return (
        <div className='flex items-center gap-1 py-1'>
          <div className='truncate rounded bg-gray-4 px-2 py-0.5 text-13 font-normal whitespace-nowrap text-gray-12'>
            {firstValue?.name}
          </div>
          {counter && (
            <div className='rounded bg-gray-4 px-2 py-0.5 text-13 font-normal whitespace-nowrap text-gray-12'>
              +{counter}
            </div>
          )}
        </div>
      )
    }, [value, variant, firstValue, counter, placeholder, iconOnly])

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
