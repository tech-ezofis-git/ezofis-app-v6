import { describe, expect, it } from 'vitest'
import {
  describeMissingSettings,
  getMissingRequiredSettings,
} from './requiredSettings'

const field = (over: Record<string, unknown> = {}) => ({
  id: over.id ?? 'f1',
  label: over.label ?? 'Customer',
  type: over.type ?? 'SHORT_TEXT',
  settings: { specific: over.specific ?? {} },
})
// The tests only fill in the parts of a field the check reads.
const panel = (...fields: unknown[]) => [{ fields }] as never

describe('getMissingRequiredSettings', () => {
  it('finds nothing wrong with a plain form', () => {
    expect(getMissingRequiredSettings(panel(field()))).toEqual([])
    expect(getMissingRequiredSettings(undefined)).toEqual([])
  })

  it('asks for a name when a field has none', () => {
    const result = getMissingRequiredSettings(panel(field({ label: '  ' })))
    expect(result).toEqual([
      { fieldId: 'f1', fieldLabel: 'Untitled field', setting: 'Field name' },
    ])
  })

  it('counts a name shown on the form as a name', () => {
    expect(
      getMissingRequiredSettings(
        panel({ ...field({ label: '' }), displayLabel: 'Customer' }),
      ),
    ).toEqual([])
  })

  it('does not ask a divider for a name', () => {
    expect(
      getMissingRequiredSettings(panel(field({ label: '', type: 'DIVIDER' }))),
    ).toEqual([])
  })

  it('asks for fields to fill when matching against this form', () => {
    const result = getMissingRequiredSettings(
      panel(field({ specific: { formSyncField: [], isSearchField: 'YES' } })),
    )
    expect(result.map((m) => m.setting)).toEqual([
      'Fields to fill from earlier entries',
    ])
  })

  it('treats a search field without a choice as matching this form', () => {
    const result = getMissingRequiredSettings(
      panel(field({ specific: { isSearchField: 'YES' } })),
    )
    expect(result.map((m) => m.setting)).toEqual([
      'Fields to fill from earlier entries',
    ])
  })

  it('is happy once the fields to fill are picked', () => {
    expect(
      getMissingRequiredSettings(
        panel(
          field({
            specific: { formSyncField: ['a', 'b'], isSearchField: 'YES' },
          }),
        ),
      ),
    ).toEqual([])
  })

  it('asks for all three master settings when matching against a master form', () => {
    const result = getMissingRequiredSettings(
      panel(field({ specific: { hasSameForm: 'NO', isSearchField: 'YES' } })),
    )
    expect(result.map((m) => m.setting)).toEqual([
      'Master form',
      'Master field to match',
      'Fields to fill from the match',
    ])
  })

  it('wants every row of the master match filled in', () => {
    const base = {
      hasSameForm: 'NO',
      isSearchField: 'YES',
      masterSyncField: 'code',
      searchFormId: '12',
    }
    const half = getMissingRequiredSettings(
      panel(
        field({
          specific: {
            ...base,
            masterFormSyncSettings: [{ formField: 'a', masterField: '' }],
          },
        }),
      ),
    )
    expect(half.map((m) => m.setting)).toEqual([
      'Fields to fill from the match',
    ])

    const done = getMissingRequiredSettings(
      panel(
        field({
          specific: {
            ...base,
            masterFormSyncSettings: [{ formField: 'a', masterField: 'b' }],
          },
        }),
      ),
    )
    expect(done).toEqual([])
  })

  it('ignores the search settings while search is off', () => {
    expect(
      getMissingRequiredSettings(
        panel(field({ specific: { hasSameForm: 'NO', isSearchField: 'NO' } })),
      ),
    ).toEqual([])
  })

  it('asks for at least one column in a table', () => {
    const result = getMissingRequiredSettings(
      panel(field({ specific: { tableColumns: [] }, type: 'TABLE' })),
    )
    expect(result.map((m) => m.setting)).toEqual(['At least one column'])
    expect(
      getMissingRequiredSettings(
        panel(
          field({ specific: { tableColumns: [{ id: 'c' }] }, type: 'TABLE' }),
        ),
      ),
    ).toEqual([])
  })
})

describe('describeMissingSettings', () => {
  const missing = ['a', 'b', 'c', 'd', 'e'].map((x) => ({
    fieldId: x,
    fieldLabel: x.toUpperCase(),
    setting: 'Master form',
  }))

  it('lists the first few and counts the rest', () => {
    expect(describeMissingSettings(missing)).toBe(
      '"A": Master form; "B": Master form; "C": Master form; and 2 more',
    )
  })

  it('lists them all when there are few', () => {
    expect(describeMissingSettings(missing.slice(0, 2))).toBe(
      '"A": Master form; "B": Master form',
    )
  })
})
