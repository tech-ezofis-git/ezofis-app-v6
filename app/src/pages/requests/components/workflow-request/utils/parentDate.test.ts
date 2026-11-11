import { describe, expect, it } from 'vitest'
import { shiftDateValue } from './parentDate'

describe('shiftDateValue', () => {
  it('moves a date forward', () => {
    expect(shiftDateValue('2026-11-09', 7)).toBe('2026-11-16')
  })

  it('moves a date back with a negative number', () => {
    expect(shiftDateValue('2026-11-09', -10)).toBe('2026-10-30')
  })

  it('rolls over months and years', () => {
    expect(shiftDateValue('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('handles leap years', () => {
    expect(shiftDateValue('2028-02-28', 1)).toBe('2028-02-29')
    expect(shiftDateValue('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('keeps the time of a date and time value', () => {
    expect(shiftDateValue('2026-11-09 14:30', 2)).toBe('2026-11-11 14:30')
  })

  it('leaves the date alone for zero days', () => {
    expect(shiftDateValue('2026-11-09', 0)).toBe('2026-11-09')
  })

  it('ignores a fraction of a day', () => {
    expect(shiftDateValue('2026-11-09', 2.9)).toBe('2026-11-11')
  })

  it('returns null when the value is not a date', () => {
    expect(shiftDateValue('', 1)).toBeNull()
    expect(shiftDateValue(undefined, 1)).toBeNull()
    expect(shiftDateValue('Net 30', 1)).toBeNull()
    expect(shiftDateValue('09/11/2026', 1)).toBeNull()
  })

  it('returns null for a date that does not exist', () => {
    expect(shiftDateValue('2026-02-31', 1)).toBeNull()
  })
})
