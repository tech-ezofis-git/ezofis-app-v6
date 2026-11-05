import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { sheetRowsToRecords } from './sheetRows'

describe('sheetRowsToRecords', () => {
  it('keys values by the trimmed header so padded headers keep their data', () => {
    const { headers, rows } = sheetRowsToRecords([
      ['Material', 'Material Code ', ' Brand\n', 'Weight'],
      ['Plastic', 'MC-001', 'Acme', 12],
    ])

    expect(headers).toEqual(['Material', 'Material Code', 'Brand', 'Weight'])
    expect(rows).toEqual([
      {
        'Brand': 'Acme',
        'Material': 'Plastic',
        'Material Code': 'MC-001',
        'Weight': 12,
      },
    ])
  })

  it('keeps repeated headers apart and skips blank header columns', () => {
    const { headers, rows } = sheetRowsToRecords([
      ['Brand', '', 'Brand'],
      ['A', 'ignored', 'B'],
    ])

    expect(headers).toEqual(['Brand', 'Brand (2)'])
    expect(rows).toEqual([{ 'Brand': 'A', 'Brand (2)': 'B' }])
  })

  it('drops rows with no values in mapped columns', () => {
    const { rows } = sheetRowsToRecords([['Brand'], [], [null], ['X']])
    expect(rows).toEqual([{ Brand: 'X' }])
  })

  it('reads a real worksheet whose header cells carry trailing spaces', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Material', 'Material Code ', 'Brand '],
      ['Glass', 'MC-9', 'Zen'],
    ])
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
    const { headers, rows } = sheetRowsToRecords(raw)

    expect(rows[0]?.[headers[1]!]).toBe('MC-9')
    expect(rows[0]?.[headers[2]!]).toBe('Zen')
  })
})
