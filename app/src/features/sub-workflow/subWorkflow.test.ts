import { beforeEach, describe, expect, it } from 'vitest'
import { mockSubWorkflowBackend } from './api/mock/mockStore'
import {
  readInitiatorSettings,
  writeConnectorSettings,
  writeInitiatorSettings,
} from './utils/blockSettings'
import {
  canInitiateSubWorkflow,
  getInitiatorSubWorkflowId,
} from './utils/permissions'
import {
  applySubWorkflowPrefill,
  buildSubWorkflowPrefill,
} from './utils/prefill'
import { getSubProcessStatus } from './utils/status'

const workflowWithStart = (settings: any, extra: any = {}) => ({
  flowJson: JSON.stringify({ blocks: [{ id: 's', type: 'START', settings }] }),
  ...extra,
})

describe('getSubProcessStatus', () => {
  it('maps flowStatus and Force Close', () => {
    expect(getSubProcessStatus({ flowStatus: 0 })).toBe('running')
    expect(getSubProcessStatus({ flowStatus: '1' })).toBe('completed')
    expect(
      getSubProcessStatus({ flowStatus: 1, lastAction: 'Force Close' }),
    ).toBe('forceClosed')
  })
})

describe('block settings', () => {
  it('resets both initiator keys when turned off', () => {
    expect(writeInitiatorSettings(false, 42)).toEqual({
      subWorkflowId: 0,
      workflowInitiator: false,
    })
    expect(writeInitiatorSettings(true, '')).toEqual({
      subWorkflowId: 0,
      workflowInitiator: false,
    })
    expect(writeInitiatorSettings(true, 42)).toEqual({
      subWorkflowId: 42,
      workflowInitiator: true,
    })
  })

  it('treats the V5 stale-true case as off', () => {
    expect(
      readInitiatorSettings({ subWorkflowId: 0, workflowInitiator: true }),
    ).toEqual({ subWorkflowId: 0, workflowInitiator: false })
  })

  it('writes an empty connector target when unset', () => {
    expect(writeConnectorSettings(0)).toEqual({ subWorkflowId: '' })
    expect(writeConnectorSettings(7)).toEqual({ subWorkflowId: 7 })
  })
})

describe('initiator permissions', () => {
  const session = { email: 'a@acme.com', id: 5 }

  it('finds the child id on START or the current activity block', () => {
    const parent = {
      flowJson: {
        blocks: [
          { id: 's', type: 'START', settings: {} },
          {
            id: 'b2',
            type: 'INTERNAL_ACTOR',
            settings: { subWorkflowId: 42, workflowInitiator: true },
          },
        ],
      },
    }
    expect(getInitiatorSubWorkflowId(parent)).toBe(0)
    expect(getInitiatorSubWorkflowId(parent, 'b2')).toBe(42)
  })

  it('allows listed users, everyone and matching domains', () => {
    const manual = { initiateBy: ['USER'], initiateMode: 'MANUAL' }
    expect(
      canInitiateSubWorkflow(
        workflowWithStart({ ...manual, users: ['0'] }),
        session,
      ),
    ).toBe(true)
    expect(
      canInitiateSubWorkflow(
        workflowWithStart({ ...manual, users: ['5'] }),
        session,
      ),
    ).toBe(true)
    expect(
      canInitiateSubWorkflow(
        workflowWithStart({ ...manual, users: ['9'] }),
        session,
      ),
    ).toBe(false)
    expect(
      canInitiateSubWorkflow(
        workflowWithStart({
          initiateBy: ['DOMAIN_USER'],
          initiateMode: 'MANUAL',
          userDomains: ['ACME.com'],
          users: [],
        }),
        session,
      ),
    ).toBe(true)
  })

  it('blocks automatic and document-initiated children', () => {
    expect(
      canInitiateSubWorkflow(
        workflowWithStart({ initiateMode: 'AUTOMATIC', users: ['0'] }),
        session,
      ),
    ).toBe(false)
    expect(
      canInitiateSubWorkflow(
        workflowWithStart(
          { initiateMode: 'MANUAL', users: ['0'] },
          { initiatedBy: 'DOCUMENT' },
        ),
        session,
      ),
    ).toBe(false)
  })
})

describe('buildSubWorkflowPrefill', () => {
  const parentFields = [
    { id: 'p1', label: 'Vendor Name', type: 'SHORT_TEXT' },
    { id: 'p2', label: 'Amount', type: 'NUMBER' },
    {
      id: 'p3',
      label: 'Items',
      type: 'TABLE',
      settings: {
        specific: {
          tableColumns: [
            { id: 'pc1', label: 'Item' },
            { id: 'pc2', label: 'Qty' },
            { id: 'pc3', label: 'Internal' },
          ],
        },
      },
    },
  ]
  const parentModel = {
    p1: 'Acme',
    p2: 1500,
    p3: [{ pc1: 'Bolt', pc2: 4, pc3: 'x' }],
  }
  const childFields = [
    { id: 'c1', label: 'vendor name', type: 'SHORT_TEXT' },
    {
      id: 'c2',
      label: 'Amount',
      type: 'NUMBER',
      settings: { general: { visibility: 'DISABLE' } },
    },
    { id: 'c3', label: 'Vendor Name', type: 'DIVIDER' },
    {
      id: 'c4',
      label: 'Items',
      type: 'TABLE',
      settings: {
        specific: {
          tableColumns: [
            { id: 'cc1', label: 'Item' },
            { id: 'cc2', label: 'Qty' },
          ],
        },
      },
    },
  ]

  it('copies by label, skips layout/disabled, maps table columns', () => {
    const prefill = buildSubWorkflowPrefill(
      parentFields,
      parentModel,
      childFields,
    )
    expect(prefill.map((f) => f.targetId)).toEqual(['c1', 'c4'])
    expect(prefill[0].value).toBe('Acme')
    expect(prefill[1].value).toEqual([{ cc1: 'Bolt', cc2: 4 }])
  })

  it('does not overwrite values already typed', () => {
    const prefill = buildSubWorkflowPrefill(
      parentFields,
      parentModel,
      childFields,
    )
    expect(applySubWorkflowPrefill({ c1: 'Typed', c4: [{}] }, prefill)).toEqual(
      {
        c1: 'Typed',
        c4: [{ cc1: 'Bolt', cc2: 4 }],
      },
    )
  })
})

describe('mock backend', () => {
  beforeEach(() => mockSubWorkflowBackend.reset())

  it('lists seeded children and resolves the parent', async () => {
    const rows = await mockSubWorkflowBackend.getSubProcesses(10, 555)
    expect(rows.map((r) => r.requestNo)).toEqual([
      'VO-0012',
      'VO-0013',
      'BC-0004',
    ])
    const parent = await mockSubWorkflowBackend.getMainProcess(42, 1873)
    expect(parent?.requestNo).toBe('PR-0031')
  })

  it('records a new link once', async () => {
    const link = {
      mainProcessId: 600,
      mainWorkflowId: 10,
      review: '',
      subProcessId: 2000,
      subProcessStatus: 0,
      subWorkflowId: 42,
    }
    const child = {
      flowStatus: 0,
      processId: 2000,
      requestNo: 'VO-0099',
      workflowId: 42,
      workflowName: 'Vendor Onboarding',
    }
    await mockSubWorkflowBackend.link(link, child)
    await mockSubWorkflowBackend.link(link, child)
    const rows = await mockSubWorkflowBackend.getSubProcesses(10, 600)
    expect(rows).toHaveLength(1)
    expect(rows[0].requestNo).toBe('VO-0099')
  })
})

describe('initiator permissions on V6 definitions', () => {
  const session = { email: 'a@acme.com', id: 'u-1' }
  const v6 = (startSettings: any, initiateType = 'FORM') => ({
    workflowJson: {
      blocks: [{ id: 's', type: 'START', settings: startSettings }],
      settings: { general: { initiateUsing: { type: initiateType } } },
    },
  })

  it('reads blocks from workflowJson and finds the initiator', () => {
    const parent = {
      workflowJson: JSON.stringify({
        blocks: [
          {
            id: 'b2',
            type: 'INTERNAL_ACTOR',
            settings: { subWorkflowId: 'wf-42', workflowInitiator: true },
          },
        ],
      }),
    }
    expect(getInitiatorSubWorkflowId(parent, 'b2')).toBe('wf-42')
  })

  it('treats a manual V6 start as manual and checks listed users', () => {
    const start = { toolType: 'manual_user', users: ['u-1'] }
    expect(canInitiateSubWorkflow(v6(start), session)).toBe(true)
    expect(
      canInitiateSubWorkflow(v6({ ...start, users: ['u-9'] }), session),
    ).toBe(false)
  })

  it('lets anyone start when nobody is restricted', () => {
    expect(
      canInitiateSubWorkflow(
        v6({ groups: [], toolType: 'manual_user', users: [] }),
        session,
      ),
    ).toBe(true)
  })

  it('blocks email-triggered and document-only children', () => {
    expect(
      canInitiateSubWorkflow(v6({ toolType: 'gmail', users: [] }), session),
    ).toBe(false)
    expect(
      canInitiateSubWorkflow(
        v6({ toolType: 'manual_user', users: [] }, 'document'),
        session,
      ),
    ).toBe(false)
    expect(
      canInitiateSubWorkflow(
        v6({ toolType: 'manual_user', users: [] }, 'document-form'),
        session,
      ),
    ).toBe(true)
  })
})
