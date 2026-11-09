// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ALL_FIELDS } from '@/pages/form-builder/components/build/components/left-sidebar/FieldLibrary'
import { FIELD_TYPE_LABELS } from '@/pages/form-builder/helpers/fieldTypeConversion'
import { getFieldTypeName } from './fieldTypeNames'
import { getField } from './new-field'

describe('field type names', () => {
  it.each(ALL_FIELDS.filter((f) => f.type !== 'TEXT_BUILDER'))(
    '$type is "$label" in the library and on a newly added field',
    (field) => {
      expect(getField(field.type).label).toBe(field.label)
    },
  )

  it('calls the dropdown "Single Select" everywhere', () => {
    const dropdown = ALL_FIELDS.find((f) => f.type === 'SINGLE_SELECT')
    expect(dropdown?.label).toBe('Single Select')
    expect(getFieldTypeName('SINGLE_SELECT')).toBe('Single Select')
    expect(FIELD_TYPE_LABELS.SINGLE_SELECT).toBe('Single Select')
    expect(ALL_FIELDS.some((f) => f.label === 'Dropdown')).toBe(false)
  })

  it('uses the same names in the "Field type" setting as in the library', () => {
    for (const field of ALL_FIELDS) {
      const inSetting =
        FIELD_TYPE_LABELS[field.type as keyof typeof FIELD_TYPE_LABELS]
      if (inSetting) expect(inSetting).toBe(field.label)
    }
  })

  it('has no name for an unknown type', () => {
    expect(getFieldTypeName('NOT_A_REAL_TYPE')).toBeUndefined()
  })
})
