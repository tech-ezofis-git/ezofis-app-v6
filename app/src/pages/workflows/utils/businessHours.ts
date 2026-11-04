// Workflow Business Hours (workflow main settings). Saved in the legacy
// `settings.general.slaSettings` calendar as { workDays, workHours: { from,
// to }, timeZone }. With business hours on, SLA deadlines count working time
// only; empty `workDays` = off (calendar time). The backend validates the same
// rules (WorkflowBusinessCalendar).

export type BusinessHours = {
  /** Closing time, `HH:mm`. */
  closingTime: string
  /** Start time, `HH:mm`. */
  startTime: string
  /** IANA zone, e.g. `Asia/Kolkata`. */
  timeZone: string
  workDays: WorkDay[]
}

export type BusinessHoursErrors = Partial<
  Record<'closingTime' | 'startTime' | 'timeZone' | 'workDays', string>
>

export type WorkDay =
  | 'Friday'
  | 'Monday'
  | 'Saturday'
  | 'Sunday'
  | 'Thursday'
  | 'Tuesday'
  | 'Wednesday'

export const WORK_DAYS: { id: WorkDay; short: string }[] = [
  { id: 'Sunday', short: 'Sun' },
  { id: 'Monday', short: 'Mon' },
  { id: 'Tuesday', short: 'Tue' },
  { id: 'Wednesday', short: 'Wed' },
  { id: 'Thursday', short: 'Thu' },
  { id: 'Friday', short: 'Fri' },
  { id: 'Saturday', short: 'Sat' },
]

const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const createBusinessHours = (): BusinessHours => ({
  closingTime: '18:00',
  startTime: '09:00',
  timeZone: browserTimeZone(),
  workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
})

const toWorkDay = (value: unknown): null | WorkDay => {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (/^[0-6]$/.test(text)) return WORK_DAYS[Number(text)].id
  const lower = text.toLowerCase()
  const match = WORK_DAYS.find(
    (d) =>
      d.id.toLowerCase() === lower ||
      (lower.length >= 3 && d.id.toLowerCase().startsWith(lower)),
  )
  return match?.id ?? null
}

/** `9:00 AM`, `09:00`, `09:00:00` → `09:00`; anything else → ''. */
export const toTimeValue = (value: unknown): string => {
  const text = String(value ?? '').trim()
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?$/i.exec(text)
  if (!match) return ''
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3]?.toLowerCase()
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return ''
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Saved `general.slaSettings` → editor shape; null when business hours are off. */
export const normalizeBusinessHours = (raw: unknown): BusinessHours | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const source = raw as {
    timeZone?: unknown
    workDays?: unknown
    workHours?: { from?: unknown; to?: unknown }
  }
  const saved: unknown[] = Array.isArray(source.workDays) ? source.workDays : []
  const workDays = WORK_DAYS.map((d) => d.id).filter((id) =>
    saved.some((v) => toWorkDay(v) === id),
  )
  if (workDays.length === 0) return null
  return {
    closingTime: toTimeValue(source.workHours?.to),
    startTime: toTimeValue(source.workHours?.from),
    timeZone: String(source.timeZone ?? '').trim(),
    workDays,
  }
}

/** The calendar fields of `general.slaSettings`; off = empty, as saved before. */
export const serializeBusinessHours = (hours: BusinessHours | null) => ({
  timeZone: hours?.timeZone ?? '',
  workDays: hours
    ? WORK_DAYS.map((d) => d.id).filter((id) => hours.workDays.includes(id))
    : [],
  workHours: {
    from: hours?.startTime ?? '',
    to: hours?.closingTime ?? '',
  },
})

const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const isKnownTimeZone = (zone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export const validateBusinessHours = (
  hours: BusinessHours | null,
): BusinessHoursErrors => {
  const errors: BusinessHoursErrors = {}
  if (!hours) return errors
  if (hours.workDays.length === 0)
    errors.workDays = 'Select at least one working day'
  const start = toTimeValue(hours.startTime)
  const end = toTimeValue(hours.closingTime)
  if (!start) errors.startTime = 'Enter a start time'
  if (!end) errors.closingTime = 'Enter a closing time'
  if (start && end) {
    if (start === end)
      errors.closingTime = 'Closing time must differ from the start time'
    else if (minutesOf(end) < minutesOf(start))
      errors.closingTime = 'Closing time must be later than the start time'
  }
  if (!hours.timeZone) errors.timeZone = 'Select the work time zone'
  else if (!isKnownTimeZone(hours.timeZone))
    errors.timeZone = 'This time zone is not known'
  return errors
}

/** Working hours per day, e.g. 9:00–18:00 → "9 h". */
export const describeWorkingDay = (hours: BusinessHours) => {
  const start = toTimeValue(hours.startTime)
  const end = toTimeValue(hours.closingTime)
  if (!start || !end || minutesOf(end) <= minutesOf(start)) return ''
  const total = minutesOf(end) - minutesOf(start)
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** IANA zones known to this browser; a short fallback list for old engines. */
export const getTimeZoneOptions = (): { id: string; name: string }[] => {
  let zones: string[] = []
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: 'timeZone') => string[]
    }
    zones = intl.supportedValuesOf?.('timeZone') ?? []
  } catch {
    zones = []
  }
  if (zones.length === 0)
    zones = [
      'UTC',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Asia/Kuala_Lumpur',
      'Asia/Singapore',
      'Europe/London',
      'Europe/Paris',
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'Australia/Sydney',
    ]
  if (!zones.includes('UTC')) zones = ['UTC', ...zones]
  return zones.map((zone) => ({ id: zone, name: zone.replace(/_/g, ' ') }))
}
