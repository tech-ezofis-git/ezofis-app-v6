import dayjs from 'dayjs'
import { parseUtcDate } from './utcDate'

const formatDatetime = (
  date: string | Date,
  format: 'date' | 'datetime' | 'time' | string = 'date',
) => {
  const parsed = parseUtcDate(date)
  const value = parsed ?? date

  if (format === 'date') return dayjs(value).format('DD-MMM-YYYY')
  if (format === 'time') return dayjs(value).format('hh:mm A')
  if (format === 'datetime') return dayjs(value).format('DD-MMM-YYYY hh:mm A')

  return dayjs(value).format(format || 'DD-MMM-YYYY hh:mm A')
}

export { formatDatetime }
