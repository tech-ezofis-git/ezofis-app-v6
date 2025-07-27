import { DateInput as Base } from '@mantine/dates'
import React from 'react'
import Icon from '@/components/base/Icon'
import ClearButton from './ClearButton'
import { classNames, inputWrapperOrder } from './constants'
import InputLabel from './InputLabel'

interface Props {
  className?: string
  clearable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  maxDate?: string
  minDate?: string
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
  value?: string | null
  valueFormat?: string
  onChange?: (value: string | null) => void
}

const _classNames = {
  calendarHeaderControl:
    'text-gray-500 hover:bg-surface-raised-hover hover:text-gray-600 hover:transition-colors data-[disabled]:opacity-40',
  calendarHeaderLevel:
    'text-sm font-semibold text-gray-700 hover:bg-surface-raised-hover hover:text-gray-750 hover:transition-colors',
  day: 'text-sx text-gray-800 hover:bg-surface-raised-hover hover:text-gray-850 hover:transition-colors data-[outside]:opacity-40 hover:data-[outside]:opacity-100 data-[selected]:!bg-primary data-[selected]:!font-medium data-[selected]:!text-gray-0 data-[today]:bg-primary/10 data-[today]:font-medium data-[today]:text-primary',
  description: classNames.description,
  error: classNames.error,
  input: classNames.input,
  label: classNames.label,
  monthsListControl:
    'text-gray-700 hover:bg-surface-raised-hover hover:text-gray-750 hover:transition-colors data-[disabled]:opacity-40',
  weekday: 'p-2 text-sx font-medium text-gray-600',
  wrapper: classNames.wrapper,
  yearsListControl:
    'text-gray-700 hover:bg-surface-raised-hover hover:text-gray-750 hover:transition-colors data-[disabled]:opacity-40',
}

const InputDate = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      clearable,
      description,
      disabled,
      error,
      label,
      maxDate,
      minDate,
      optional,
      placeholder = 'dd-mmm-yyyy',
      readOnly,
      required,
      tooltip,
      tooltipWidth,
      value,
      valueFormat = 'DD-MMM-YYYY',
      onChange,
    },
    ref,
  ) => {
    const rightSection =
      clearable && value ? (
        <ClearButton onClick={() => onChange?.('')} />
      ) : (
        <Icon className='text-gray-500' name='tabler:calendar' />
      )
    const previousIcon = <Icon name='tabler:chevron-left' />
    const nextIcon = <Icon name='tabler:chevron-right' />

    return (
      <Base
        className={className}
        classNames={_classNames}
        description={error ? undefined : description}
        disabled={disabled}
        error={error}
        firstDayOfWeek={0}
        inputWrapperOrder={inputWrapperOrder}
        maxDate={maxDate}
        minDate={minDate}
        nextIcon={nextIcon}
        placeholder={placeholder}
        previousIcon={previousIcon}
        readOnly={readOnly}
        ref={ref}
        rightSection={rightSection}
        rightSectionPointerEvents={clearable ? 'auto' : 'none'}
        type='default'
        value={value}
        valueFormat={valueFormat}
        allowDeselect
        clearable
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
        popoverProps={{
          classNames: {
            dropdown: 'border-0 bg-surface-raised p-3 ring-1 ring-gray-600/10',
          },
        }}
        onChange={onChange}
      />
    )
  },
)

InputDate.displayName = 'InputDate'
export default InputDate
