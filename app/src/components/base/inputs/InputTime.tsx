import { TimePicker as Base } from '@mantine/dates'
import { forwardRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { InputProps } from './shared/types'
import ClearButton from './ClearButton'
import InputLabel from './InputLabel'
import { classNames, inputWrapperOrder } from './shared/constants'

interface Props extends Omit<
  InputProps,
  | 'leftSection'
  | 'leftSectionPointerEvents'
  | 'placeholder'
  | 'rightSection'
  | 'rightSectionPointerEvents'
> {
  value: string
  format?: '12h' | '24h'
  maxTime?: string
  minTime?: string
  onChange: (value: string) => void
}

const InputTime = forwardRef<HTMLInputElement, Props>(
  (
    {
      clearable,
      description,
      error,
      label,
      maxTime,
      minTime,
      optional,
      required,
      tooltip,
      tooltipWidth,
      value,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const _classNames = {
      control:
        'text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[active]:!bg-primary-9 data-[active]:!font-medium data-[active]:!text-white',
      description: classNames.description,
      dropdown: 'border border-gray-3 bg-surface-raised shadow-md',
      error: classNames.error,
      field: cn(
        'placeholder:text-gray-8 focus:bg-primary-9 focus:text-white focus:placeholder:text-white',
        !!error && 'text-gray-12',
      ),
      fieldsGroup: value ? 'text-gray-12' : 'text-gray-8',
      input: classNames.input,
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

    const _clearable = clearable && value
    const _rightSection = _clearable ? (
      <ClearButton onClick={() => onChange('')} />
    ) : (
      <Icon className='text-gray-9' name='lucide:clock' />
    )

    return (
      <Base
        {...rest}
        classNames={_classNames}
        description={error ? undefined : description}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        max={maxTime}
        min={minTime}
        ref={ref}
        rightSection={_rightSection}
        rightSectionPointerEvents={_clearable ? 'auto' : 'none'}
        value={value}
        withDropdown
        onChange={onChange}
      />
    )
  },
)

InputTime.displayName = 'InputTime'
export default InputTime
