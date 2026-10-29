import type { Edge, Node } from '@xyflow/react'
import { beforeEach, describe, expect, it } from 'vitest'
import useWorkflowStore from '../stores/useWorkflowStore'
import { exportWorkflow } from './exportWorkflow'
import { importWorkflow } from './importWorkflow'
import {
  createSlaRule,
  createSlaSettings,
  diffSlaSettings,
  getWorkflowSlaError,
  isEndNode,
  isSlaEscalationTarget,
  normalizeSlaSettings,
  serializeSlaSettings,
  setEscalationType,
  type SlaSettings,
  validateSlaSettings,
} from './slaSettings'

const verifier = (id: string, data: Record<string, any> = {}): Node => ({
  data: { label: id, toolType: 'manual_user', type: 'INTERNAL_ACTOR', ...data },
  id,
  position: { x: 0, y: 0 },
})

const blockSla: SlaSettings = {
  mode: 'standard',
  notifications: { email: true, sms: false },
  rules: [
    {
      channels: { email: true, sms: false },
      duration: 30,
      durationUnit: 'minutes',
      escalateTo: { stageId: null, type: 'user', userId: 'user-205' },
      id: 'sla-001',
      initiator: false,
      name: 'First Escalation',
      notifyUserIds: ['user-101'],
    },
    {
      channels: { email: false, sms: true },
      duration: 2,
      durationUnit: 'hours',
      escalateTo: { stageId: 'approver', type: 'stage', userId: null },
      id: 'sla-002',
      initiator: true,
      name: 'Second Escalation',
      notifyUserIds: ['user-102'],
    },
  ],
  slaMasterId: null,
}

describe('SLA settings', () => {
  beforeEach(() => useWorkflowStore.getState().resetWorkflow())

  it('switching escalation type drops the stale id', () => {
    const toStage = setEscalationType(
      { stageId: null, type: 'user', userId: 'u-1' },
      'stage',
    )
    expect(toStage).toEqual({ stageId: null, type: 'stage', userId: null })
    const toUser = setEscalationType(
      { stageId: 's-1', type: 'stage', userId: null },
      'user',
    )
    expect(toUser).toEqual({ stageId: null, type: 'user', userId: null })
  })

  it('serializes only the active mode and strips stale escalation ids', () => {
    const stale: SlaSettings = {
      ...blockSla,
      rules: [
        {
          ...blockSla.rules[0],
          escalateTo: { stageId: 'leftover', type: 'user', userId: 'u-1' },
        },
      ],
      slaMasterId: 'm-1',
    }
    const standard = serializeSlaSettings(stale, 'block')
    expect(standard.slaMasterId).toBeNull()
    expect(standard.rules[0].escalateTo).toEqual({
      stageId: null,
      type: 'user',
      userId: 'u-1',
    })

    const advanced = serializeSlaSettings(
      { ...stale, mode: 'advanced' },
      'block',
    )
    expect(advanced.rules).toEqual([])
    expect(advanced.slaMasterId).toBe('m-1')

    const workflow = serializeSlaSettings(stale, 'workflow')
    expect(workflow.rules[0]).not.toHaveProperty('escalateTo')
  })

  it('validates rules, advanced master and stage references', () => {
    const rule = { ...createSlaRule('block'), duration: 0 }
    const errors = validateSlaSettings(
      { ...createSlaSettings(), rules: [rule] },
      'block',
    )
    expect(errors[rule.id]).toMatchObject({
      duration: expect.any(String),
      name: expect.any(String),
    })

    expect(
      validateSlaSettings({ ...createSlaSettings(), mode: 'advanced' }, 'block')
        ._config?.slaMasterId,
    ).toBeDefined()

    expect(validateSlaSettings(blockSla, 'block', ['approver'])).toEqual({})
    expect(
      validateSlaSettings(blockSla, 'block', ['someone-else'])['sla-002']
        ?.escalateTo,
    ).toBeDefined()
  })

  it('normalizes missing/invalid saved values without throwing', () => {
    expect(normalizeSlaSettings(undefined, 'block')).toBeNull()
    expect(normalizeSlaSettings('nope', 'block')).toBeNull()
    const normalized = normalizeSlaSettings(
      { mode: 'ADVANCED', slaMasterId: 7 },
      'workflow',
    )
    expect(normalized).toMatchObject({
      mode: 'advanced',
      notifications: { email: true, sms: false },
      rules: [],
      slaMasterId: '7',
    })
  })

  it('round-trips block and workflow SLA through export/import independently', () => {
    const globalSla: SlaSettings = {
      mode: 'standard',
      notifications: { email: false, sms: true },
      rules: [
        {
          channels: { email: true, sms: true },
          duration: 3,
          durationUnit: 'days',
          id: 'g-1',
          initiator: true,
          name: 'Resolve',
          notifyUserIds: ['user-1'],
        },
      ],
      slaMasterId: null,
    }
    useWorkflowStore.getState().setSlaSettings(globalSla)

    const advancedSla: SlaSettings = {
      ...createSlaSettings(),
      mode: 'advanced',
      slaMasterId: 'master-001',
    }
    const nodes = [
      verifier('verifier', { SlaSettings: blockSla }),
      verifier('approver', { SlaSettings: advancedSla }),
      verifier('plain'),
    ]
    const json: any = exportWorkflow(nodes, [] as Edge[])

    expect(json.settings.SlaSettings).toEqual(globalSla)
    expect(json.settings.general.slaSettings.slaType).toBe('STANDARD')
    const byId = (id: string) => json.blocks.find((b: any) => b.id === id)
    expect(byId('verifier').settings.SlaSettings).toEqual(blockSla)
    expect(byId('approver').settings.SlaSettings).toEqual(advancedSla)
    expect(byId('plain').settings).not.toHaveProperty('SlaSettings')

    const { nodes: imported } = importWorkflow(JSON.parse(JSON.stringify(json)))
    const data = (id: string) =>
      imported.find((n) => n.id === id)?.data as Record<string, any>
    expect(data('verifier').SlaSettings).toEqual(blockSla)
    expect(data('approver').SlaSettings).toEqual(advancedSla)
    expect(data('plain').SlaSettings).toBeUndefined()

    useWorkflowStore.getState().loadLegacyWorkflow(json)
    expect(useWorkflowStore.getState().slaSettings).toEqual(globalSla)

    expect(diffSlaSettings(json, JSON.parse(JSON.stringify(json)))).toEqual([])
    const tampered = JSON.parse(JSON.stringify(json))
    tampered.blocks.find((b: any) => b.id === 'verifier').settings.SlaSettings =
      undefined
    expect(diffSlaSettings(json, tampered)).toEqual(['block:verifier'])
  })

  it('gives rules saved without channels the configuration notifications', () => {
    const normalized = normalizeSlaSettings(
      {
        mode: 'standard',
        notifications: { email: false, sms: true },
        rules: [
          { duration: 5, durationUnit: 'minutes', id: 'a', name: 'A' },
          {
            channels: { email: true, sms: false },
            duration: 9,
            durationUnit: 'minutes',
            id: 'b',
            name: 'B',
          },
        ],
      },
      'block',
    )
    expect(normalized?.rules[0].channels).toEqual({ email: false, sms: true })
    expect(normalized?.rules[1].channels).toEqual({ email: true, sms: false })
  })

  it('requires a rule to notify someone or escalate', () => {
    const rule = { ...createSlaRule('block'), duration: 5, name: 'Idle' }
    const errors = validateSlaSettings(
      { ...createSlaSettings(), rules: [rule] },
      'block',
    )
    expect(errors[rule.id]?.action).toBeDefined()
    const escalating = {
      ...rule,
      escalateTo: { stageId: null, type: 'user' as const, userId: 'u-1' },
    }
    expect(
      validateSlaSettings(
        { ...createSlaSettings(), rules: [escalating] },
        'block',
      )[rule.id],
    ).toBeUndefined()
  })

  it('treats END as an escalation target that closes the ticket', () => {
    const end = { label: 'Workflow Success', toolType: 'end', type: 'END' }
    expect(isEndNode(end)).toBe(true)
    expect(isSlaEscalationTarget(end)).toBe(true)
    expect(isSlaEscalationTarget({ toolType: 'manual_user' })).toBe(true)
    expect(isSlaEscalationTarget({ toolType: 'gmail' })).toBe(false)

    const toEnd = {
      ...blockSla,
      rules: [
        {
          ...blockSla.rules[1],
          escalateTo: {
            stageId: 'end-1',
            type: 'stage' as const,
            userId: null,
          },
        },
      ],
    }
    const error = getWorkflowSlaError(
      [
        { data: verifier('a', { SlaSettings: toEnd }).data, id: 'a' },
        { data: end, id: 'end-1' },
      ],
      null,
    )
    expect(error).toBeNull()
  })

  it('loads a workflow without SlaSettings as empty', () => {
    useWorkflowStore
      .getState()
      .loadLegacyWorkflow({ blocks: [], rules: [], settings: { general: {} } })
    expect(useWorkflowStore.getState().slaSettings).toBeNull()
  })

  it('reports the first blocking SLA problem with its block', () => {
    const broken = {
      ...blockSla,
      rules: [{ ...blockSla.rules[0], name: '' }],
    }
    const error = getWorkflowSlaError(
      [
        { data: verifier('a', { SlaSettings: broken }).data, id: 'a' },
        { data: verifier('approver').data, id: 'approver' },
      ],
      null,
    )
    expect(error?.nodeId).toBe('a')
    expect(getWorkflowSlaError([], null)).toBeNull()
  })
})
