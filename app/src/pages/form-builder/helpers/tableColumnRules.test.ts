import { describe, expect, it } from 'vitest'
import { validateFieldValue } from './runtimeValidation'
import { getRowCellRuleStates } from './tableColumnRules'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const col = (
  id: string,
  validation: Record<string, unknown> = {},
  type = 'SHORT_TEXT',
) => ({ id, label: id, name: id, type, settings: { validation } })

// "Type" decides whether "Note" must be filled / can be edited
const requiredWhenTypeIsCustom = col('type', {
  mandatorySettings: [{ controls: ['note'], id: 'r1', value: 'Custom' }],
})
const lockedWhenTypeIsFixed = col('type', {
  readonlySettings: [{ controls: ['note'], id: 'r2', value: 'Fixed' }],
})
const note = col('note')

const table = (columns: unknown[]) => ({
  id: 'f_tbl',
  label: 'Items',
  type: 'TABLE',
  settings: { specific: { tableColumns: columns } },
})

describe('Batch 6: row-level rule states', () => {
  it('mandatory rule applies only in rows where the source value matches', () => {
    const cols = [requiredWhenTypeIsCustom, note]
    expect(getRowCellRuleStates(cols, { type: 'Custom' })).toEqual({
      note: { readOnly: false, required: true },
    })
    expect(getRowCellRuleStates(cols, { type: 'Standard' })).toEqual({})
    expect(getRowCellRuleStates(cols, {})).toEqual({})
  })

  it('read-only rule locks the target while the source matches', () => {
    const cols = [lockedWhenTypeIsFixed, note]
    expect(getRowCellRuleStates(cols, { type: 'Fixed' })).toEqual({
      note: { readOnly: true, required: false },
    })
    expect(getRowCellRuleStates(cols, { type: 'Other' })).toEqual({})
  })

  it('is immediate: a changed source value changes the state, and the row is not modified', () => {
    const cols = [lockedWhenTypeIsFixed, note]
    const row = { note: 'kept', type: 'Fixed' }
    const locked = getRowCellRuleStates(cols, row)
    expect(locked.note?.readOnly).toBe(true)
    expect(row).toEqual({ note: 'kept', type: 'Fixed' }) // stored value preserved
    expect(
      getRowCellRuleStates(cols, { ...row, type: 'Open' }).note,
    ).toBeUndefined()
  })

  it('notEqual locks when the value does not match, including a blank source', () => {
    const cols = [
      col('type', {
        readonlySettings: [
          { controls: ['note'], id: 'r', notEqual: true, value: 'Open' },
        ],
      }),
      note,
    ]
    expect(getRowCellRuleStates(cols, { type: 'Fixed' }).note?.readOnly).toBe(
      true,
    )
    expect(getRowCellRuleStates(cols, {}).note?.readOnly).toBe(true)
    expect(getRowCellRuleStates(cols, { type: 'Open' }).note).toBeUndefined()
  })

  it('supports the operators the form engine supports', () => {
    const cols = [
      col('qty', {
        mandatorySettings: [
          {
            controls: ['note'],
            id: 'r',
            operator: 'GREATER_THAN',
            value: '10',
          },
        ],
      }),
      note,
    ]
    expect(getRowCellRuleStates(cols, { qty: 11 }).note?.required).toBe(true)
    expect(getRowCellRuleStates(cols, { qty: 5 }).note).toBeUndefined()
  })

  it('combines mandatory and read-only on one target, across several sources', () => {
    const cols = [
      requiredWhenTypeIsCustom,
      col('flag', {
        readonlySettings: [{ controls: ['note'], id: 'r3', value: 'Yes' }],
      }),
      note,
    ]
    expect(getRowCellRuleStates(cols, { flag: 'Yes', type: 'Custom' })).toEqual(
      {
        note: { readOnly: true, required: true },
      },
    )
  })

  it('ignores unknown targets, self targets, and unsupported rule forms', () => {
    const cols = [
      col('type', {
        mandatorySettings: [
          { controls: ['ghost', 'type'], id: 'r', value: 'A' },
          {
            conditions: [{ fieldId: 'x' }],
            controls: [],
            id: 'r2',
            value: 'A',
          },
        ],
        readonlySettings: { conditions: [], readonly: true },
      }),
      note,
    ]
    expect(getRowCellRuleStates(cols, { type: 'A' })).toEqual({})
  })

  it('columns without rules produce no state', () => {
    expect(getRowCellRuleStates([note, col('other')], { note: 'x' })).toEqual(
      {},
    )
  })
})

describe('Batch 6: submission validation', () => {
  const t = table([requiredWhenTypeIsCustom, note])

  it('reports the row and column of an empty conditionally-required cell', () => {
    const res = validateFieldValue(t, [
      { note: '', type: 'Standard' },
      { note: '', type: 'Custom' },
    ])
    expect(res.isValid).toBe(false)
    expect(res.errors).toEqual(['Row 2: note is required and cannot be empty'])
  })

  it('passes when the conditionally-required cell is filled or the rule does not match', () => {
    expect(
      validateFieldValue(t, [
        { note: 'because', type: 'Custom' },
        { note: '', type: 'Standard' },
      ]).isValid,
    ).toBe(true)
  })

  it('a cell required both statically and by rule is reported once', () => {
    const both = table([
      requiredWhenTypeIsCustom,
      col('note', { fieldRule: 'REQUIRED' }),
    ])
    const res = validateFieldValue(both, [{ note: '', type: 'Custom' }])
    expect(res.errors).toEqual(['Row 1: note is required and cannot be empty'])
  })

  it('tables without rules behave exactly as before', () => {
    const plain = table([col('type'), col('note')])
    expect(
      validateFieldValue(plain, [{ note: '', type: 'Custom' }]).isValid,
    ).toBe(true)
  })
})

describe('Batch 6: schema save / reload', () => {
  it('keeps conditional mandatory and read-only rules on columns', () => {
    const raw = {
      panels: [
        {
          fields: [
            table([
              col('type', {
                mandatorySettings: [
                  { controls: ['note'], id: 'r1', value: 'Custom' },
                ],
                readonlySettings: [
                  {
                    controls: ['note'],
                    id: 'r2',
                    notEqual: true,
                    value: 'Open',
                  },
                ],
              }),
              note,
            ]),
          ],
          id: 'p1',
        },
      ],
    }
    const saved = serializeFormPayload(normalizeV5FormJson(raw))
    const [typeCol] = saved.panels[0].fields[0].settings.specific.tableColumns
    const noteId =
      saved.panels[0].fields[0].settings.specific.tableColumns[1].id
    expect(typeCol.settings.validation.mandatorySettings[0]).toMatchObject({
      controls: [noteId],
      value: 'Custom',
    })
    expect(typeCol.settings.validation.readonlySettings[0]).toMatchObject({
      controls: [noteId],
      notEqual: true,
      value: 'Open',
    })
  })
})
