import { describe, expect, it } from 'vitest'
import {
  applyDateFieldDefaults,
  getDateFieldDefault,
  type RepositoryFieldSchema,
} from './repoFolderMetadata'

const now = new Date(2026, 10, 2)

const field = (
  name: string,
  extra: Partial<RepositoryFieldSchema> = {},
): RepositoryFieldSchema => ({
  id: name,
  name,
  sqlColumnName: name.toLowerCase().replace(/\s+/g, '_'),
  ...extra,
})

describe('getDateFieldDefault', () => {
  it('gives the current year for a Year field', () => {
    expect(getDateFieldDefault(field('Year'), now)).toBe('2026')
    expect(
      getDateFieldDefault(field('Year', { dataType: 'NUMBER' }), now),
    ).toBe('2026')
  })

  it('gives the month number for a numeric Month field, else its name', () => {
    expect(
      getDateFieldDefault(field('Month', { dataType: 'NUMBER' }), now),
    ).toBe('11')
    expect(getDateFieldDefault(field('Month'), now)).toBe('November')
  })

  it('respects a select field whose options lack the value', () => {
    const options = JSON.stringify(['2024', '2025'])
    expect(
      getDateFieldDefault(field('Year', { optionsJson: options }), now),
    ).toBe('')
    expect(
      getDateFieldDefault(
        field('Year', { optionsJson: JSON.stringify(['2025', '2026']) }),
        now,
      ),
    ).toBe('2026')
  })

  it('leaves other fields alone', () => {
    expect(getDateFieldDefault(field('Year End Date'), now)).toBe('')
    expect(getDateFieldDefault(field('Supplier'), now)).toBe('')
  })
})

describe('applyDateFieldDefaults', () => {
  const fields = [field('Year'), field('Supplier')]

  it('fills an empty Year field', () => {
    expect(
      applyDateFieldDefaults({ supplier: 'Acme', year: '' }, fields, now),
    ).toEqual({ supplier: 'Acme', year: '2026' })
  })

  it('keeps a Year the user or OCR already set', () => {
    const values = { supplier: '', year: '2024' }
    expect(applyDateFieldDefaults(values, fields, now)).toBe(values)
  })
})
