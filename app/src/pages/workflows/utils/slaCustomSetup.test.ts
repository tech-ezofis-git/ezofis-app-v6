import { describe, expect, it } from 'vitest'
import { findRuleForValue, readLevels, selectionStatus } from './slaCustomSetup'
import {
  createSlaSelection,
  normalizeSlaSettings,
  serializeSlaSettings,
  type SlaSelection,
  type SlaSettings,
  validateSlaSettings,
} from './slaSettings'

const rules = [
  { id: 'e1', name: 'Support' },
  { id: 'e2', name: 'AMC Plan' },
]
const selection = (patch: Partial<SlaSelection> = {}): SlaSelection => ({
  ...createSlaSelection(),
  defaultEntryId: 'e1',
  fieldId: 'req',
  ...patch,
})
const settings = (patch: Partial<SlaSettings> = {}): SlaSettings => ({
  mode: 'advanced',
  notifications: { email: true, sms: false },
  rules: [],
  slaMasterId: 'form-1',
  ...patch,
})

describe('findRuleForValue', () => {
  it('uses the rule chosen for the option, else the default', () => {
    const s = selection({
      valueRules: [{ entryId: 'e2', value: 'Hardware' }],
    })
    expect(findRuleForValue(s, ' hardware ', rules)).toEqual({
      entryId: 'e2',
      source: 'value',
    })
    expect(findRuleForValue(s, 'Other', rules)).toEqual({
      entryId: 'e1',
      source: 'default',
    })
  })

  it('matches the same name without case or extra spaces', () => {
    const s = selection({ method: 'sameName' })
    expect(findRuleForValue(s, 'amc   plan', rules).entryId).toBe('e2')
  })

  it('reads the rule from the selected record, by name or id', () => {
    const s = selection({ method: 'column' })
    const record = (value: string) =>
      ({ 'Project A': 'AMC PLAN', 'Project B': 'e1' })[value]
    expect(findRuleForValue(s, 'Project A', rules, record).source).toBe('value')
    expect(findRuleForValue(s, 'Project A', rules, record).entryId).toBe('e2')
    expect(findRuleForValue(s, 'Project B', rules, record).entryId).toBe('e1')
    expect(findRuleForValue(s, 'Project C', rules, record).source).toBe(
      'default',
    )
  })

  it('gives no rule when nothing is found and no default is set', () => {
    const s = selection({ defaultEntryId: null, method: 'sameName' })
    expect(findRuleForValue(s, 'Other', rules)).toEqual({
      entryId: null,
      source: 'none',
    })
  })
})

describe('selectionStatus', () => {
  it.each([
    [
      4,
      0,
      true,
      'No time limit rules have been selected for these 4 options. The default rule will be used for all of them.',
    ],
    [
      4,
      2,
      true,
      '2 out of 4 options have a time limit rule. The remaining 2 options will use the default rule.',
    ],
    [
      4,
      3,
      true,
      '3 out of 4 options have a time limit rule. The remaining option will use the default rule.',
    ],
    [4, 4, true, 'All 4 options have a time limit rule.'],
    [
      4,
      1,
      false,
      '1 out of 4 options has a time limit rule. The remaining 3 options will have no time limit.',
    ],
    [0, 0, true, 'This field has no options yet.'],
  ])('%i options, %i with a rule', (total, done, hasDefault, text) => {
    expect(selectionStatus(total, done, hasDefault).text).toBe(text)
  })
})

describe('readLevels', () => {
  const steps = {
    id: 't1',
    label: 'SLA Steps',
    settings: {
      specific: {
        tableColumns: [
          { id: 'c1', label: 'After' },
          { id: 'c2', label: 'Time unit' },
          { id: 'c3', label: 'Notify users' },
          { id: 'c4', label: 'Escalate user' },
        ],
      },
    },
  }

  it('reads the SLA Steps table, whether stored as text or a list', () => {
    const rows = [
      { c1: '1', c2: 'Hours', c3: ['u1'], c4: '' },
      { c1: '2', c2: 'Days', c3: [], c4: 'u2' },
    ]
    const expected = [
      { what: 'Notify Raja', when: 'After 1 hour' },
      { what: 'Escalate to u2', when: 'After 2 days' },
    ]
    const name = (id: string) => (id === 'u1' ? 'Raja' : id)
    expect(readLevels({ t1: rows }, [steps], true, name)).toEqual(expected)
    expect(
      readLevels({ t1: JSON.stringify(rows) }, [steps], true, name),
    ).toEqual(expected)
  })

  it('reads the older time columns for the right SLA', () => {
    const entry = {
      Escalate: 'lead@example.com',
      Notify: 'raja@example.com',
      Resolution_Time: '3',
      Resolution_Type: 'Days',
      Response_Time: '1',
      Response_Type: 'Hours',
    }
    expect(readLevels(entry, [], true)).toEqual([
      { what: 'Notify raja@example.com', when: 'After 1 hour' },
      { what: 'Escalate to lead@example.com', when: 'After 1 hour' },
    ])
    expect(readLevels(entry, [], false)[0].when).toBe('After 3 days')
  })
})

describe('saving Custom Setup', () => {
  it('keeps settings without the new choices exactly as they were', () => {
    const saved = serializeSlaSettings(
      settings({
        masterEntries: [
          { entryId: 'e1', escalate: false, id: 'r1', notify: true },
        ],
        masterFieldId: 'f1',
      }),
      'block',
    )
    expect(saved).not.toHaveProperty('selection')
    expect(saved).not.toHaveProperty('afterLastLevel')
    expect(saved.masterEntries).toHaveLength(1)
  })

  it('round-trips a rule per request, without fixed entries', () => {
    const value = settings({
      afterLastLevel: {
        groupId: 'g1',
        type: 'group',
        userId: null,
        wait: 2,
        waitUnit: 'hours',
      },
      masterEntries: [
        { entryId: 'e1', escalate: false, id: 'r1', notify: true },
      ],
      masterFieldId: 'f1',
      selection: selection({
        valueRules: [
          { entryId: 'e2', value: 'Hardware' },
          { entryId: null, value: 'Other' },
        ],
      }),
    })
    const saved = serializeSlaSettings(value, 'block')
    expect(saved).not.toHaveProperty('masterEntries')
    expect(saved.selection?.valueRules).toEqual([
      { entryId: 'e2', value: 'Hardware' },
    ])

    const back = normalizeSlaSettings(
      JSON.parse(JSON.stringify(saved)),
      'block',
    )
    expect(back?.selection?.fieldId).toBe('req')
    expect(back?.afterLastLevel?.groupId).toBe('g1')
    expect(back?.afterLastLevel?.wait).toBe(2)
  })

  it('leaves out "do nothing" and only the active method data', () => {
    const saved = serializeSlaSettings(
      settings({
        afterLastLevel: {
          groupId: null,
          type: 'none',
          userId: null,
          wait: 1,
          waitUnit: 'days',
        },
        selection: selection({
          method: 'sameName',
          recordFormId: 'x',
          ruleColumn: 'y',
          valueRules: [{ entryId: 'e1', value: 'a' }],
        }),
      }),
      'workflow',
    )
    expect(saved).not.toHaveProperty('afterLastLevel')
    expect(saved.selection?.recordFormId).toBeNull()
    expect(saved.selection?.valueRules).toEqual([])
  })

  it('drops the new choices in Basic Setup', () => {
    const saved = serializeSlaSettings(
      settings({ mode: 'standard', selection: selection() }),
      'block',
    )
    expect(saved).not.toHaveProperty('selection')
  })
})

describe('validating Custom Setup', () => {
  const errorsOf = (patch: Partial<SlaSettings>, scope = 'block' as const) =>
    validateSlaSettings(settings(patch), scope)

  it('needs a field, and what the method needs', () => {
    expect(
      errorsOf({ selection: selection({ fieldId: null }) })._config?.fieldId,
    ).toBeTruthy()
    expect(
      errorsOf({ selection: selection({ method: 'column' }) })._config
        ?.ruleColumn,
    ).toBeTruthy()
    expect(
      errorsOf({ selection: selection({ defaultEntryId: null }) })._config
        ?.valueRules,
    ).toBeTruthy()
    expect(errorsOf({ selection: selection() })).toEqual({})
  })

  it('needs a wait and a target after the last level', () => {
    const after = errorsOf({
      afterLastLevel: {
        groupId: null,
        type: 'group',
        userId: null,
        wait: null,
        waitUnit: 'days',
      },
      selection: selection(),
    })._after
    expect(after?.wait).toBeTruthy()
    expect(after?.groupId).toBeTruthy()
  })

  it('lets a workflow SLA only remind after the last level', () => {
    const afterLastLevel = {
      groupId: null,
      type: 'manager' as const,
      userId: null,
      wait: 1,
      waitUnit: 'days' as const,
    }
    expect(
      validateSlaSettings(
        settings({ afterLastLevel, selection: selection() }),
        'workflow',
      )._after?.type,
    ).toBeTruthy()
    expect(errorsOf({ afterLastLevel, selection: selection() })).toEqual({})
  })
})
