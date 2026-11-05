import { describe, expect, it } from 'vitest'
import {
  describeWorkingDay,
  normalizeBusinessHours,
  serializeBusinessHours,
  toTimeValue,
  validateBusinessHours,
} from './businessHours'

const hours = {
  closingTime: '18:00',
  startTime: '09:00',
  timeZone: 'Asia/Kolkata',
  workDays: ['Monday', 'Friday'] as const,
}

describe('business hours', () => {
  it('treats an empty saved calendar as off', () => {
    expect(normalizeBusinessHours(undefined)).toBeNull()
    expect(
      normalizeBusinessHours({
        timeZone: '',
        workDays: [],
        workHours: { from: '', to: '' },
      }),
    ).toBeNull()
    expect(serializeBusinessHours(null)).toEqual({
      timeZone: '',
      workDays: [],
      workHours: { from: '', to: '' },
    })
  })

  it('round-trips and reads legacy day / time formats', () => {
    const loaded = normalizeBusinessHours({
      timeZone: 'Asia/Kolkata',
      workDays: ['FRI', '1', 'monday'],
      workHours: { from: '9:00 AM', to: '06:00 PM' },
    })
    expect(loaded).toEqual({ ...hours, workDays: ['Monday', 'Friday'] })
    expect(serializeBusinessHours(loaded)).toEqual({
      timeZone: 'Asia/Kolkata',
      workDays: ['Monday', 'Friday'],
      workHours: { from: '09:00', to: '18:00' },
    })
  })

  it('validates the schedule', () => {
    const base = { ...hours, workDays: [...hours.workDays] }
    expect(validateBusinessHours(base)).toEqual({})
    expect(validateBusinessHours({ ...base, workDays: [] }).workDays).toBe(
      'Select at least one working day',
    )
    expect(
      validateBusinessHours({ ...base, closingTime: '09:00' }).closingTime,
    ).toMatch(/differ/)
    expect(
      validateBusinessHours({ ...base, closingTime: '08:00' }).closingTime,
    ).toMatch(/later/)
    expect(validateBusinessHours({ ...base, timeZone: '' }).timeZone).toBe(
      'Select the work time zone',
    )
    expect(
      validateBusinessHours({ ...base, timeZone: 'Mars/Olympus' }).timeZone,
    ).toBe('This time zone is not known')
  })

  it('formats times and the working day length', () => {
    expect(toTimeValue('12:30 AM')).toBe('00:30')
    expect(toTimeValue('25:00')).toBe('')
    expect(
      describeWorkingDay({ ...hours, workDays: [...hours.workDays] }),
    ).toBe('9 h')
    expect(
      describeWorkingDay({
        ...hours,
        closingTime: '17:30',
        workDays: [],
      }),
    ).toBe('8 h 30 min')
  })
})
