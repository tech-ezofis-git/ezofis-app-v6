import dayjs from 'dayjs'

const formatDatetime = (
  date: string | Date,
  format: 'date' | 'datetime' | 'time' | string = 'date',
) => {
  if (format === 'date') return dayjs(date).format('DD-MMM-YYYY')
  else if (format === 'time') return dayjs(date).format('HH:mm A')
  else if (format === 'datetime')
    return dayjs(date).format('DD-MMM-YYYY HH:mm A')

  return dayjs(date).format(format || 'DD-MMM-YYYY HH:mm A')
}

export { formatDatetime }
