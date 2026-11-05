import { describe, expect, it } from 'vitest'
import {
  createAdvancedRule,
  createSlaRule,
  createSlaSettings,
  emptyFieldMapping,
  isNotifyOn,
  normalizeSlaSettings,
  serializeSlaSettings,
  setEscalationType,
  type SlaMasterRow,
  type SlaRule,
  type SlaSettings,
  validateSlaSettings,
} from './slaSettings'

const advanced = (patch: Partial<SlaSettings> = {}): SlaSettings => {
  const rule = {
    ...createAdvancedRule(1),
    conditions: [
      {
        fieldId: 'request_type',
        id: 'c1',
        logic: 'IS_EQUALS_TO',
        value: 'Support',
      },
    ],
    entryIds: ['entry-support'],
    id: 'r1',
    name: 'Support',
  }
  return {
    advancedRules: [rule],
    fallbackEntryId: null,
    fieldMapping: {
      ...emptyFieldMapping(),
      name: 'f_name',
      resolutionDuration: 'f_res',
      resolutionUnit: 'f_res_type',
    },
    mode: 'advanced',
    notifications: { email: true, sms: false },
    responseStageId: null,
    rules: [],
    slaMasterId: 'sla-master',
    ...patch,
  }
}

describe('Advanced SLA settings', () => {
  it('round-trips rules, mapping and stages through save / load', () => {
    const saved = serializeSlaSettings(advanced(), 'workflow')
    expect(saved.advancedRules?.[0]).toMatchObject({
      conditions: [
        { fieldId: 'request_type', logic: 'IS_EQUALS_TO', value: 'Support' },
      ],
      entryIds: ['entry-support'],
      id: 'r1',
    })
    const loaded = normalizeSlaSettings(
      JSON.parse(JSON.stringify(saved)),
      'workflow',
    )
    expect(serializeSlaSettings(loaded!, 'workflow')).toEqual(saved)
  })

  it('drops Advanced data when Standard is saved, and on stage scope', () => {
    const asStandard = serializeSlaSettings(
      { ...advanced(), mode: 'standard' },
      'workflow',
    )
    expect(asStandard).not.toHaveProperty('advancedRules')
    expect(serializeSlaSettings(advanced(), 'block')).not.toHaveProperty(
      'advancedRules',
    )
  })

  it('validates mapping, entries, conditions and breach stages', () => {
    expect(validateSlaSettings(advanced(), 'workflow')).toEqual({})

    const noMapping = advanced({ fieldMapping: emptyFieldMapping() })
    expect(validateSlaSettings(noMapping, 'workflow')._config?.mapping).toMatch(
      /Resolution/,
    )

    const rule = advanced().advancedRules![0]
    const noEntries = advanced({ advancedRules: [{ ...rule, entryIds: [] }] })
    expect(validateSlaSettings(noEntries, 'workflow').r1?.entryIds).toBe(
      'Select at least one SLA Master entry',
    )

    const emptyValue = advanced({
      advancedRules: [
        { ...rule, conditions: [{ ...rule.conditions[0], value: ' ' }] },
      ],
    })
    expect(validateSlaSettings(emptyValue, 'workflow').r1?.conditions).toMatch(
      /value/,
    )

    const goneStage = advanced({
      advancedRules: [
        {
          ...rule,
          breachAction: { on: 'resolution', stageId: 'gone', type: 'stage' },
        },
      ],
    })
    expect(
      validateSlaSettings(goneStage, 'workflow', ['reviewer']).r1?.breachAction,
    ).toMatch(/no longer/)

    const reassign = advanced({
      advancedRules: [
        {
          ...rule,
          breachAction: { on: 'both', stageId: null, type: 'reassign' },
        },
      ],
    })
    expect(validateSlaSettings(reassign, 'workflow').r1?.breachAction).toMatch(
      /Escalate/,
    )
  })

  it('asks for an entry after the SLA form, choosing the naming field itself', () => {
    const masterOnly = normalizeSlaSettings(
      { mode: 'advanced', rules: [], slaMasterId: 7 },
      'block',
    )
    expect(masterOnly).not.toHaveProperty('advancedRules')
    const errors = validateSlaSettings(masterOnly, 'block')
    expect(errors._config?.masterFieldId).toBeUndefined()
    expect(errors._config?.entryId).toBe('Add at least one SLA entry')
  })

  const rows = (): SlaMasterRow[] => [
    { entryId: 'entry-a', escalate: false, id: 'row-a', notify: true },
    { entryId: 'entry-b', escalate: true, id: 'row-b', notify: false },
    { entryId: 'entry-c', escalate: true, id: 'row-c', notify: true },
  ]

  it.each(['block', 'workflow'] as const)(
    'saves only entry ids and actions on the %s SLA',
    (scope) => {
      const chosen: SlaSettings = {
        ...advanced(),
        advancedRules: [],
        fieldMapping: undefined,
        masterEntries: rows(),
        masterFieldId: 'f1',
      }
      expect(validateSlaSettings(chosen, scope)).toEqual({})
      const saved = serializeSlaSettings(chosen, scope)
      expect(saved.masterEntries).toEqual(rows())
      // No entry values or names are copied into the workflow.
      expect(Object.keys(saved).sort()).toEqual([
        'masterEntries',
        'masterFieldId',
        'mode',
        'notifications',
        'rules',
        'slaMasterId',
      ])
      const loaded = normalizeSlaSettings(
        JSON.parse(JSON.stringify(saved)),
        scope,
      )
      expect(serializeSlaSettings(loaded!, scope)).toEqual(saved)
    },
  )

  it('loads a single saved entry as one row that notifies and escalates', () => {
    const loaded = normalizeSlaSettings(
      {
        entryId: 'entry-support',
        masterFieldId: 'f1',
        mode: 'advanced',
        slaMasterId: 'm',
      },
      'block',
    )
    // The row id stays the entry id, so timers already created still match it.
    expect(loaded?.masterEntries).toEqual([
      {
        entryId: 'entry-support',
        escalate: true,
        id: 'entry-support',
        notify: true,
      },
    ])
    expect(validateSlaSettings(loaded, 'block')).toEqual({})
  })

  it('needs an entry and an action on each row', () => {
    const errors = validateSlaSettings(
      {
        ...advanced(),
        advancedRules: [],
        masterEntries: [
          { entryId: null, escalate: false, id: 'row-1', notify: true },
          { entryId: 'e', escalate: false, id: 'row-2', notify: false },
        ],
        masterFieldId: 'f1',
      },
      'block',
    )
    expect(errors['row-1']?.entryId).toBeDefined()
    expect(errors['row-2']?.action).toBe('Tick Notify, Escalate or both')
  })

  it('replaces saved rules once an entry is chosen', () => {
    const saved = serializeSlaSettings(
      { ...advanced(), masterEntries: rows(), masterFieldId: 'f1' },
      'workflow',
    )
    expect(saved).not.toHaveProperty('advancedRules')
    expect(saved.masterEntries).toHaveLength(3)
  })
})

describe('Standard rule: Notify and Escalate', () => {
  const rule = (patch: Partial<SlaRule> = {}): SlaRule => ({
    ...createSlaRule('block'),
    duration: 5,
    id: 'r1',
    name: 'Rule',
    ...patch,
  })
  const check = (r: SlaRule) =>
    validateSlaSettings({ ...createSlaSettings(), rules: [r] }, 'block').r1

  it('loads rules with no escalation as unticked, and others from their data', () => {
    const loaded = normalizeSlaSettings(
      {
        mode: 'standard',
        rules: [
          { duration: 1, id: 'a', name: 'A', notifyUserIds: ['u'] },
          {
            duration: 1,
            escalateTo: { groupId: 'g', type: 'group' },
            id: 'b',
            name: 'B',
          },
        ],
      },
      'block',
    )!
    expect(loaded.rules[0].escalateTo?.type).toBeNull()
    expect(isNotifyOn(loaded.rules[0])).toBe(true)
    expect(loaded.rules[1].escalateTo).toMatchObject({
      groupId: 'g',
      type: 'group',
    })
    expect(isNotifyOn(loaded.rules[1])).toBe(false)
  })

  it('requires what is ticked to be complete', () => {
    expect(check(rule())?.action).toBeDefined()
    expect(check(rule({ notify: true }))?.notifyUserIds).toBeDefined()
    expect(
      check(
        rule({
          channels: { email: false, sms: false },
          notifyUserIds: ['u'],
        }),
      )?.channels,
    ).toBeDefined()
    const group = { stageId: null, type: 'group' as const, userId: null }
    expect(check(rule({ escalateTo: group }))?.escalateTo).toBe(
      'Select a group to escalate to',
    )
    expect(
      check(rule({ escalateTo: { ...group, groupId: 'g' } })),
    ).toBeUndefined()
  })

  it('does not save the people of an unticked Notify', () => {
    const saved = serializeSlaSettings(
      {
        ...createSlaSettings(),
        rules: [
          rule({
            escalateTo: {
              groupId: 'g',
              stageId: null,
              type: 'group',
              userId: null,
            },
            initiator: true,
            notify: false,
            notifyUserIds: ['u'],
          }),
        ],
      },
      'block',
    )
    expect(saved.rules[0]).toMatchObject({
      escalateTo: { groupId: 'g', type: 'group' },
      initiator: false,
      notifyUserIds: [],
    })
    expect(saved.rules[0]).not.toHaveProperty('notify')
  })

  it('switching the escalation type drops the group', () => {
    const toUser = setEscalationType(
      { groupId: 'g', stageId: null, type: 'group', userId: null },
      'user',
    )
    expect(toUser).toEqual({ stageId: null, type: 'user', userId: null })
  })
})
