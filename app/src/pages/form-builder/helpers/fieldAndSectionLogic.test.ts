import { describe, expect, it } from 'vitest'
import { evaluateFormRules } from './ruleEngine'

const rule = (id: string, action: string, value: string, fieldId = 'cb') =>
  ({ action, condition: 'CONTAINS', fieldId, id, value }) as any

const field = (id: string, type: string, logic: any[] = []) =>
  ({
    id,
    label: id,
    settings: { general: { visibility: 'NORMAL' }, logic, validation: {} },
    type,
  }) as any

describe('field logic (multi rules)', () => {
  const panels = [
    {
      fields: [
        field('cb', 'MULTIPLE_CHOICE'),
        field('target', 'SINGLE_SELECT', [
          rule('1', 'ENABLE', 'bag'),
          rule('2', 'ENABLE', 'cap'),
          rule('3', 'DISABLE', 'bottle'),
        ]),
      ],
      id: 'p1',
      settings: { description: '' },
    },
  ]

  it('is disabled until a matching Enable rule is met', () => {
    expect(evaluateFormRules(panels, { cb: [] }).target.disabled).toBe(true)
    expect(evaluateFormRules(panels, { cb: ['bag'] }).target.disabled).toBe(
      false,
    )
    expect(evaluateFormRules(panels, { cb: ['cap'] }).target.disabled).toBe(
      false,
    )
  })

  it('ignores Disable when an Enable rule exists on the same field', () => {
    const s = evaluateFormRules(panels, { cb: ['bag', 'bottle'] })
    expect(s.target.disabled).toBe(false)
  })
})

describe('section logic', () => {
  const panels = [
    {
      fields: [field('cb', 'MULTIPLE_CHOICE')],
      id: 'p1',
      settings: { description: '' },
    },
    {
      fields: [field('a', 'SHORT_TEXT'), field('b', 'SHORT_TEXT')],
      id: 'p2',
      settings: { description: '', logic: [rule('1', 'SHOW', 'bag')] },
    },
    {
      fields: [field('c', 'SHORT_TEXT')],
      id: 'p3',
      settings: { description: '', logic: [rule('2', 'ENABLE', 'cap')] },
    },
  ]

  it('hides a section and its fields until the rule is met', () => {
    const hidden = evaluateFormRules(panels, { cb: [] })
    expect(hidden.a.visible).toBe(false)
    expect(hidden.b.visible).toBe(false)
    const shown = evaluateFormRules(panels, { cb: ['bag'] })
    expect(shown.a.visible).toBe(true)
    expect(shown.b.visible).toBe(true)
  })

  it('disables all fields of a section until the Enable rule is met', () => {
    expect(evaluateFormRules(panels, { cb: [] }).c.disabled).toBe(true)
    expect(evaluateFormRules(panels, { cb: ['cap'] }).c.disabled).toBe(false)
  })
})
