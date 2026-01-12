import { DateInput as Base } from '@mantine/dates'
import { forwardRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import type { InputProps } from './shared/types'
import ClearButton from './ClearButton'
import InputLabel from './InputLabel'
import { classNames, inputWrapperOrder } from './shared/constants'

interface Props extends Omit<
  InputProps,
  | 'leftSection'
  | 'leftSectionPointerEvents'
  | 'rightSection'
  | 'rightSectionPointerEvents'
> {
  value: string | null
  maxDate?: string
  minDate?: string
  valueFormat?: string
  onChange: (value: string | null) => void
}

const InputDate = forwardRef<HTMLInputElement, Props>(
  (
    {
      clearable,
      description,
      label,
      optional,
      placeholder = 'dd-mmm-yyyy',
      required,
      tooltip,
      tooltipWidth,
      value,
      valueFormat = 'DD-MMM-YYYY',
      onChange,
      ...rest
    },
    ref,
  ) => {
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
      <ClearButton onClick={() => onChange(null)} />
    ) : (
      <Icon className='text-gray-9' name='lucide:calendar' />
    )

    const _previousIcon = <Icon name='lucide:chevron-left' />
    const _nextIcon = <Icon name='lucide:chevron-right' />

    return (
      <Base
        {...rest}
        description={rest.error ? undefined : description}
        firstDayOfWeek={0}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        nextIcon={_nextIcon}
        placeholder={placeholder}
        previousIcon={_previousIcon}
        ref={ref}
        rightSection={_rightSection}
        rightSectionPointerEvents={_clearable ? 'auto' : 'none'}
        type='default'
        value={value}
        valueFormat={valueFormat}
        allowDeselect
        classNames={{
          calendarHeaderControl:
            'text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[disabled]:opacity-50',
          calendarHeaderLevel:
            'text-13 font-semibold text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12',
          day: 'text-13 text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[outside]:text-gray-8 data-[outside]:opacity-100 data-[outside]:hover:text-gray-12 data-[selected]:!bg-primary-9 data-[selected]:!font-medium data-[selected]:!text-white data-[today]:bg-primary-4 data-[today]:font-medium data-[today]:text-primary-11',
          description: classNames.description,
          error: classNames.error,
          input: classNames.input,
          label: classNames.label,
          monthsListControl:
            'text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[disabled]:opacity-50 data-[selected]:!bg-primary-9 data-[selected]:!font-medium data-[selected]:!text-white',
          weekday: 'p-2 text-13 text-gray-10',
          wrapper: classNames.wrapper,
          yearsListControl:
            'text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[disabled]:opacity-50 data-[selected]:!bg-primary-9 data-[selected]:!font-medium data-[selected]:!text-white',
        }}
        popoverProps={{
          classNames: {
            dropdown: 'border border-gray-3 bg-surface-raised p-3 shadow-md',
          },
        }}
        onChange={onChange}
      />
    )
  },
)

InputDate.displayName = 'InputDate'
export default InputDate
