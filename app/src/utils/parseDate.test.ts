import { describe, expect, it } from 'vitest'
import { parseFlexibleDate, toIsoDate } from './parseDate'

describe('toIsoDate', () => {
  it.each([
    ['2026-10-15', '2026-10-15'],
    ['2026-10-15T08:42:29Z', '2026-10-15'],
    ['15/10/2026', '2026-10-15'],
    ['15-10-2026', '2026-10-15'],
    ['15.10.2026', '2026-10-15'],
    ['5/1/2026', '2026-01-05'],
    ['15/10/26', '2026-10-15'],
    ['15-Oct-2026', '2026-10-15'],
    ['15 Oct 2026', '2026-10-15'],
    ['October 15th, 2026', '2026-10-15'],
    ['Oct 15, 2026', '2026-10-15'],
    ['2026/10/15', '2026-10-15'],
    ['20261015', '2026-10-15'],
  ])('reads %s', (raw, expected) => {
    expect(toIsoDate(raw)).toBe(expected)
  })

  it('reads an ambiguous numeric date day first', () => {
    expect(toIsoDate('05/10/2026')).toBe('2026-10-05')
  })

  it('falls back to month first when day first is impossible', () => {
    expect(toIsoDate('10/15/2026')).toBe('2026-10-15')
  })

  it.each(['', '-', 'N/A', 'Net 30', '30 days', 'Invalid Date', '32/13/2026'])(
    'returns null for %j',
    (raw) => {
      expect(toIsoDate(raw)).toBeNull()
    },
  )

  it('keeps the time of a date-time value', () => {
    expect(
      parseFlexibleDate('15/10/2026 14:30')?.format('YYYY-MM-DD HH:mm'),
    ).toBe('2026-10-15 14:30')
  })
})
