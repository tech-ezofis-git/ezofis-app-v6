import { describe, expect, it } from 'vitest'
import { isFieldFilled, mapOcrFieldsToModel } from './fieldRendering'

const dateField = { id: 'f-date', label: 'Invoice Date', type: 'DATE' }
const textField = { id: 'f-text', label: 'Supplier', type: 'SHORT_TEXT' }
const panels = [{ fields: [dateField, textField] }]

describe('mapOcrFieldsToModel dates', () => {
  it('stores a day-first OCR date as YYYY-MM-DD', () => {
    const patch = mapOcrFieldsToModel(panels, [
      { name: 'Invoice Date,DATE', value: '15/10/2026' },
    ])
    expect(patch['f-date']).toBe('2026-10-15')
    expect(Object.values(patch)).not.toContain('15/10/2026')
  })

  it('uses the form field type when OCR sends no type', () => {
    const patch = mapOcrFieldsToModel(panels, [
      { name: 'Invoice Date', value: '15.10.2026' },
    ])
    expect(patch['f-date']).toBe('2026-10-15')
  })

  it('leaves the date empty when OCR sends text that is not a date', () => {
    const patch = mapOcrFieldsToModel(panels, [
      { name: 'Invoice Date,DATE', value: 'Net 30' },
    ])
    expect(patch).toEqual({})
  })

  it('keeps non-date values as they are', () => {
    const patch = mapOcrFieldsToModel(panels, [
      { name: 'Supplier,SHORT_TEXT', value: '15/10/2026 Traders' },
    ])
    expect(patch['f-text']).toBe('15/10/2026 Traders')
  })
})

describe('isFieldFilled dates', () => {
  it('only counts a readable date as filled', () => {
    expect(isFieldFilled(dateField, '2026-10-15')).toBe(true)
    expect(isFieldFilled(dateField, '15/10/2026')).toBe(true)
    expect(isFieldFilled(dateField, 'Net 30')).toBe(false)
    expect(isFieldFilled(dateField, 'Invalid Date')).toBe(false)
  })
})
