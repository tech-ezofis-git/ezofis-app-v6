import { describe, expect, it } from 'vitest'
import { mapOcrToRowPatch, normalizeOcrValue } from './tableColumnFiles'

const col = (id: string, type: string) => ({
  id,
  label: id,
  name: id,
  type,
  settings: {},
})

describe('extracted values are written in the format each column stores', () => {
  it('DATE is stored as YYYY-MM-DD, whatever way the document wrote it', () => {
    const date = col('d', 'DATE')
    expect(normalizeOcrValue(date, '2026-10-14')).toBe('2026-10-14')
    expect(normalizeOcrValue(date, '14/10/2026')).toBe('2026-10-14')
    expect(normalizeOcrValue(date, '14-10-2026')).toBe('2026-10-14')
    expect(normalizeOcrValue(date, '14.10.2026')).toBe('2026-10-14')
    expect(normalizeOcrValue(date, '14 Oct 2026')).toBe('2026-10-14')
    expect(normalizeOcrValue(date, '14-Oct-2026')).toBe('2026-10-14')
    expect(normalizeOcrValue(date, 'October 14, 2026')).toBe('2026-10-14')
    expect(normalizeOcrValue(date, '2026/10/14')).toBe('2026-10-14')
  })

  it('an unreadable date is left out instead of written as text', () => {
    expect(normalizeOcrValue(col('d', 'DATE'), 'next Tuesday')).toBeUndefined()
    expect(normalizeOcrValue(col('d', 'DATE'), '31/02/2026')).toBeUndefined()
    expect(normalizeOcrValue(col('d', 'DATE'), '')).toBeUndefined()
  })

  it('TIME is stored as 24-hour HH:mm', () => {
    const time = col('t', 'TIME')
    expect(normalizeOcrValue(time, '14:30')).toBe('14:30')
    expect(normalizeOcrValue(time, '14:30:15')).toBe('14:30')
    expect(normalizeOcrValue(time, '2:30 PM')).toBe('14:30')
    expect(normalizeOcrValue(time, '9:05 am')).toBe('09:05')
    expect(normalizeOcrValue(time, 'noon')).toBeUndefined()
  })

  it('DATE_TIME is stored as "YYYY-MM-DD HH:mm"', () => {
    const dt = col('x', 'DATE_TIME')
    expect(normalizeOcrValue(dt, '2026-10-14 14:30')).toBe('2026-10-14 14:30')
    expect(normalizeOcrValue(dt, '14/10/2026 2:30 PM')).toBe('2026-10-14 14:30')
    expect(normalizeOcrValue(dt, '14/10/2026')).toBe('2026-10-14 00:00')
    expect(normalizeOcrValue(dt, 'garbage')).toBeUndefined()
  })

  it('numbers and currency ignore symbols and thousands commas', () => {
    expect(normalizeOcrValue(col('n', 'NUMBER'), '1,234.50')).toBe(1234.5)
    expect(normalizeOcrValue(col('n', 'NUMBER'), '$ 99')).toBe(99)
    expect(normalizeOcrValue(col('n', 'CURRENCY_AMOUNT'), 'INR 2,500.00')).toBe(
      2500,
    )
    expect(normalizeOcrValue(col('n', 'COUNTER'), '-3')).toBe(-3)
    expect(normalizeOcrValue(col('n', 'NUMBER'), 'n/a')).toBeUndefined()
  })

  it('text columns keep the text as extracted', () => {
    expect(normalizeOcrValue(col('s', 'SHORT_TEXT'), '  Acme Stores ')).toBe(
      'Acme Stores',
    )
  })

  it('the row patch uses these formats and skips values that cannot be read', () => {
    const targets = [
      col('billed', 'DATE'),
      col('at', 'TIME'),
      col('amt', 'NUMBER'),
      col('shop', 'SHORT_TEXT'),
      col('due', 'DATE'),
    ]
    const patch = mapOcrToRowPatch(
      targets,
      [
        { name: 'billed', value: '14/10/2026' },
        { name: 'at', value: '2:30 PM' },
        { name: 'amt', value: '1,200.50' },
        { name: 'shop', value: 'Acme' },
        { name: 'due', value: 'soon' },
      ],
      {},
      true,
    )
    expect(patch).toEqual({
      amt: 1200.5,
      at: '14:30',
      billed: '2026-10-14',
      shop: 'Acme',
    })
  })
})
