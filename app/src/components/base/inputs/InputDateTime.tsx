import dayjs from 'dayjs'
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
// null. Handles incoming ISO/UTC strings (e.g. '2026-10-14T08:42:29.539Z'),
// seconds/milliseconds strings ('YYYY-MM-DD HH:mm:ss'), or local space-separated formats.
const splitValue = (value: string | null | undefined) => {
  if (!value) return { datePart: null as string | null, timePart: '' }

  const trimmed = String(value).trim()
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'invalid date') {
    return { datePart: null as string | null, timePart: '' }
  }

  // 1. ISO string with 'T' (e.g., 2026-10-14T08:42:29Z, 2026-10-14T14:30)
  if (trimmed.includes('T')) {
    const parsed = dayjs(trimmed)
    if (parsed.isValid()) {
      return {
        datePart: parsed.format('YYYY-MM-DD'),
        timePart: parsed.format('HH:mm'),
      }
    }
  }

  // 2. Space separated string (e.g., 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DD HH:mm' or 'DD-MMM-YYYY HH:mm')
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(' ')
    const dateStr = parts[0]
    const timeStr = parts.slice(1).join(' ')

    // If time contains seconds or extra parts (e.g., '14:30:00' or '02:30 PM')
    let normalizedTime = timeStr.trim()
    if (/^\d{1,2}:\d{2}(:\d{2})?(\.\d+)?$/.test(normalizedTime)) {
      const [h = '00', m = '00'] = normalizedTime.split(':')
      normalizedTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
    } else if (/(am|pm)$/i.test(normalizedTime)) {
      const parsedTime = dayjs(`${dateStr} ${normalizedTime}`)
      if (parsedTime.isValid()) {
        normalizedTime = parsedTime.format('HH:mm')
      }
    }

    // Ensure date part is in YYYY-MM-DD if standard parseable
    let normalizedDate = dateStr
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      normalizedDate = dateStr
    } else {
      const parsedDate = dayjs(dateStr)
      if (parsedDate.isValid()) {
        normalizedDate = parsedDate.format('YYYY-MM-DD')
      }
    }

    return {
      datePart: normalizedDate || null,
      timePart: normalizedTime || '00:00',
    }
  }

  // 3. Fallback for date-only string or other standard format
  const parsedFallback = dayjs(trimmed)
  if (parsedFallback.isValid()) {
    // If it has a non-midnight time or specific time component
    const hasTime = trimmed.length > 10
    return {
      datePart: parsedFallback.format('YYYY-MM-DD'),
      timePart: hasTime ? parsedFallback.format('HH:mm') : '',
    }
  }

  return { datePart: trimmed || null, timePart: '' }
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
