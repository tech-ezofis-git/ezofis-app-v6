import { DateInput as Primitive } from '@mantine/dates'
import React from 'react'
import { Icon } from '@/components/base'
import { InputLabel } from '@/components/base'
import { classNames, inputWrapperOrder } from '../styles'

interface Props {
  className?: string
  description?: string
  error?: string
  isDisabled?: boolean
  isOptional?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  label?: string
  maxDate?: string
  minDate?: string
  placeholder?: string
  tooltip?: string
  tooltipWidth?: number
  value?: string | null
  valueFormat?: string
  onChange?: (value: string | null) => void
}

const InputDate = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      description,
      error,
      isDisabled,
      isOptional,
      isReadOnly,
      isRequired,
      label,
      maxDate,
      minDate,
      onChange,
      placeholder = 'mmm dd, yyyy',
      tooltip,
      tooltipWidth,
      value,
      valueFormat = 'MMM DD, YYYY',
    },
    ref,
  ) => {
    const rightSection = (
      <Icon className='text-gray-500' name='tabler:calendar' />
    )
    const previousIcon = <Icon name='tabler:chevron-left' />
    const nextIcon = <Icon name='tabler:chevron-right' />

    return (
      <Primitive
        className={className}
        description={error ? undefined : description}
        disabled={isDisabled}
        error={error}
        firstDayOfWeek={0}
        inputWrapperOrder={inputWrapperOrder}
        maxDate={maxDate}
        minDate={minDate}
        nextIcon={nextIcon}
        placeholder={placeholder}
        previousIcon={previousIcon}
        readOnly={isReadOnly}
        ref={ref}
        rightSection={rightSection}
        rightSectionPointerEvents='none'
        type='default'
        value={value}
        valueFormat={valueFormat}
        allowDeselect
        clearable
        classNames={{
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
        }}
        label={
          label ? (
            <InputLabel
              isOptional={isOptional}
              isRequired={isRequired}
              label={label}
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
