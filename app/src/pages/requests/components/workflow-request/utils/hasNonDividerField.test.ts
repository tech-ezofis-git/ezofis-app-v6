import { describe, expect, it } from 'vitest'
import { hasNonDividerField } from './fieldRendering'

const field = (type: string, id = type) => ({
  id,
  label: id,
  settings: { general: {}, specific: {}, validation: {} },
  type,
})

describe('hasNonDividerField', () => {
  it('is false when a section has no visible fields', () => {
    expect(hasNonDividerField([])).toBe(false)
  })

  it('is false when only dividers are left visible', () => {
    expect(
      hasNonDividerField([field('DIVIDER', 'd1'), field('DIVIDER', 'd2')]),
    ).toBe(false)
  })

  it('is true when a real field is visible next to a divider', () => {
    expect(
      hasNonDividerField([field('DIVIDER'), field('SHORT_TEXT', 'name')]),
    ).toBe(true)
  })

  it('keeps sections that hold a heading or label', () => {
    expect(hasNonDividerField([field('HEADING')])).toBe(true)
  })
})
