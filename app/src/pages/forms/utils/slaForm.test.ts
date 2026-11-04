import { describe, expect, it } from 'vitest'
import {
  getColumnOptionsSource,
  getColumnPredefinedType,
  parseColumnOptions,
} from '@/pages/form-builder/helpers/tableColumnOptions'
import {
  normalizeV5FormJson,
  serializeFormPayload,
} from '@/pages/form-builder/helpers/v5SchemaAdapter'
import { buildSlaFormPayload, isSlaForm } from './slaForm'

const columnsOf = (payload: ReturnType<typeof buildSlaFormPayload>) =>
  payload.panels[0].fields[2].settings.specific.tableColumns ?? []

describe('isSlaForm', () => {
  it('reads the type from a list row or a loaded form', () => {
    expect(isSlaForm({ type: 'SLA' })).toBe(true)
    expect(isSlaForm({ type: ' sla ' })).toBe(true)
    expect(
      isSlaForm({ _json: { settings: { general: { type: 'SLA' } } } }),
    ).toBe(true)
    expect(
      isSlaForm({
        formJson: { settings: { general: { type: 'SLA' } } },
        type: 'MASTER',
      }),
    ).toBe(true)
    expect(isSlaForm({ type: 'MASTER' })).toBe(false)
    expect(isSlaForm(null)).toBe(false)
  })
})

describe('buildSlaFormPayload', () => {
  it('builds a published SLA form with Policy Name, Description and an SLA Steps table', () => {
    const payload = buildSlaFormPayload('  Support SLA ', ' For support ')

    expect(payload.settings.general).toMatchObject({
      description: 'For support',
      name: 'Support SLA',
      type: 'SLA',
    })
    expect(payload.settings.publish.publishOption).toBe('PUBLISHED')
    expect(
      payload.panels[0].fields.map((field) => [field.label, field.type]),
    ).toEqual([
      ['Policy Name', 'SHORT_TEXT'],
      ['Description', 'LONG_TEXT'],
      ['SLA Steps', 'TABLE'],
    ])
  })

  it('has the step columns: one row can notify and escalate', () => {
    const columns = columnsOf(buildSlaFormPayload('A', ''))
    expect(columns.map((c) => [c.label, c.type])).toEqual([
      ['After', 'NUMBER'],
      ['Time unit', 'SINGLE_SELECT'],
      ['Notify users', 'MULTI_SELECT'],
      ['Notify group', 'SINGLE_SELECT'],
      ['Notify initiator', 'SINGLE_SELECT'],
      ['Send by', 'MULTI_SELECT'],
      ['Escalate to', 'SINGLE_SELECT'],
      ['Escalate user', 'SINGLE_SELECT'],
      ['Escalate group', 'SINGLE_SELECT'],
      ['Escalate stage', 'SHORT_TEXT'],
    ])
    const [
      ,
      unit,
      notifyUsers,
      notifyGroup,
      initiator,
      sendBy,
      to,
      user,
      group,
    ] = columns
    expect(parseColumnOptions(unit).map((o) => o.name)).toEqual([
      'Minutes',
      'Hours',
      'Days',
    ])
    expect(parseColumnOptions(initiator).map((o) => o.name)).toEqual([
      'Yes',
      'No',
    ])
    expect(parseColumnOptions(sendBy).map((o) => o.name)).toEqual([
      'Email',
      'SMS',
    ])
    expect(parseColumnOptions(to).map((o) => o.name)).toEqual([
      'User',
      'Group',
      'Stage',
    ])
    for (const users of [notifyUsers, user]) {
      expect(getColumnOptionsSource(users)).toBe('USER_LIST')
    }
    for (const groups of [notifyGroup, group]) {
      expect(getColumnOptionsSource(groups)).toBe('PREDEFINED')
      expect(getColumnPredefinedType(groups)).toBe('GROUP')
    }
  })

  it('lets only the choice columns that may be empty stay empty', () => {
    const optional = columnsOf(buildSlaFormPayload('A', ''))
      .filter(
        (c) =>
          (c.settings.specific as { optionalChoice?: boolean }).optionalChoice,
      )
      .map((c) => c.label)
    expect(optional).toEqual([
      'Notify users',
      'Notify group',
      'Notify initiator',
      'Send by',
      'Escalate to',
      'Escalate user',
      'Escalate group',
    ])
  })

  it('keeps the table through the form save and load adapters', () => {
    const payload = buildSlaFormPayload('A', '')
    const saved = JSON.parse(
      JSON.stringify(serializeFormPayload(payload as never)),
    )
    const loaded = normalizeV5FormJson(saved) as unknown as {
      panels: {
        fields: { settings: { specific: { tableColumns: never[] } } }[]
      }[]
    }
    const columns = loaded.panels[0].fields[2].settings.specific.tableColumns
    expect(columns.map((c: { id: string }) => c.id)).toEqual([
      'after',
      'unit',
      'notifyUsers',
      'notifyGroup',
      'notifyInitiator',
      'sendBy',
      'escalateTo',
      'escalateUser',
      'escalateGroup',
      'escalateStage',
    ])
    expect(getColumnOptionsSource(columns[3])).toBe('PREDEFINED')
    expect(getColumnPredefinedType(columns[3])).toBe('GROUP')
    expect(getColumnOptionsSource(columns[2])).toBe('USER_LIST')
  })

  it('gives each form its own field ids', () => {
    const first = buildSlaFormPayload('A', '').panels[0].fields[0].id
    const second = buildSlaFormPayload('B', '').panels[0].fields[0].id

    expect(first).not.toBe(second)
  })
})
