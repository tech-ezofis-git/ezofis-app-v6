import { forwardRef } from 'react'
import type { InputProps } from './shared/types'
import InputDate from './InputDate'
import InputLabel from './InputLabel'
import InputTime from './InputTime'
import { classNames } from './shared/constants'

interface Props extends Omit<InputProps, 'placeholder'> {
  value: string | null
  format?: '12h' | '24h'
  maxDate?: string
  minDate?: string
  onChange: (value: string | null) => void
}

// Value contract: 'YYYY-MM-DD HH:mm' (space-separated date + 24h time), or
// null. Splitting/combining happens here so InputDate/InputTime each keep
// their own simpler single-value contract.
const splitValue = (value: string | null | undefined) => {
  if (!value) return { datePart: null as string | null, timePart: '' }
  const [datePart, timePart = ''] = value.split(' ')
  return { datePart: datePart || null, timePart }
}

const InputDateTime = forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      clearable,
      description,
      disabled,
      error,
      format,
      label,
      maxDate,
      minDate,
      optional,
      readOnly,
      required,
      tooltip,
      tooltipWidth,
      value,
      onChange,
    },
    ref,
  ) => {
    const { datePart, timePart } = splitValue(value)

    const handleDateChange = (nextDate: string | null) => {
      if (!nextDate) {
        onChange(null)
        return
      }
      onChange(`${nextDate} ${timePart || '00:00'}`)
    }

    const handleTimeChange = (nextTime: string) => {
      if (!datePart) return
      onChange(`${datePart} ${nextTime || '00:00'}`)
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

    return (
      <div className={className}>
        {_label && <div className='mb-2'>{_label}</div>}
        <div className='flex items-start gap-2'>
          <InputDate
            className='flex-1'
            clearable={clearable}
            disabled={disabled}
            maxDate={maxDate}
            minDate={minDate}
            readOnly={readOnly}
            ref={ref}
            value={datePart}
            onChange={handleDateChange}
          />
          <InputTime
            className='flex-1'
            disabled={disabled || !datePart}
            format={format}
            readOnly={readOnly}
            value={timePart}
            onChange={handleTimeChange}
          />
        </div>
        {error ? (
          <p className={classNames.error}>{error}</p>
        ) : description ? (
          <p className={classNames.description}>{description}</p>
        ) : null}
      </div>
    )
  },
)

InputDateTime.displayName = 'InputDateTime'
export default InputDateTime
