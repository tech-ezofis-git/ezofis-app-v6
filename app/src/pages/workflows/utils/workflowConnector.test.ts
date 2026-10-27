import type { Node } from '@xyflow/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { exportWorkflow } from './exportWorkflow'
import { importWorkflow } from './importWorkflow'
import { NODE_TOOL_TYPE } from './nodeToolTypes'
import {
  getConnectorSaveBlock,
  getWorkflowConnectorErrors,
  getWorkflowInitiatorErrors,
} from './workflowConnector'

// Sub-workflow is localhost-only for now; run these as on a dev host.
beforeAll(() => vi.stubGlobal('location', { hostname: 'localhost' }))
afterAll(() => vi.unstubAllGlobals())

const node = (id: string, data: Record<string, unknown>, y = 0): Node => ({
  data,
  id,
  position: { x: 0, y },
  type: 'custom',
})

const connector = (data: Record<string, unknown> = {}) =>
  node(
    'wc1',
    {
      label: 'Workflow Connector 1',
      toolType: NODE_TOOL_TYPE.WORKFLOW_CONNECTOR,
      ...data,
    },
    250,
  )

describe('Workflow Connector JSON', () => {
  it('exports as a V5 WORKFLOW_CONNECTOR block and imports back', () => {
    const nodes = [
      node('s', { label: 'Manual User', toolType: NODE_TOOL_TYPE.MANUAL_USER }),
      connector({ subWorkflowId: '42', subWorkflowName: 'Vendor Onboarding' }),
    ]
    const json: any = exportWorkflow(nodes, [])
    const block = json.blocks.find((b: any) => b.id === 'wc1')
    expect(block.type).toBe('WORKFLOW_CONNECTOR')
    expect(block.settings.subWorkflowId).toBe('42')
    expect(block.settings.label).toBe('Workflow Connector 1')
    expect(block.settings).not.toHaveProperty('subLabel')

    const { nodes: imported } = importWorkflow(json)
    const back = imported.find((n) => n.id === 'wc1')!
    expect(back.data.toolType).toBe(NODE_TOOL_TYPE.WORKFLOW_CONNECTOR)
    expect(back.data.subWorkflowId).toBe('42')
    expect(back.data.subLabel).toBe('Starts Vendor Onboarding')
    expect(back.data.warning).toBe(false)
  })

  it('imports a block saved by V5', () => {
    const { nodes } = importWorkflow({
      blocks: [
        { id: 's', type: 'START', settings: { label: 'Start' } },
        {
          id: 'wc',
          type: 'WORKFLOW_CONNECTOR',
          settings: { label: 'Workflow Connector 1', subWorkflowId: 42 },
        },
      ],
      rules: [],
    })
    const wc = nodes.find((n) => n.id === 'wc')!
    expect(wc.data.toolType).toBe(NODE_TOOL_TYPE.WORKFLOW_CONNECTOR)
    expect(wc.data.subWorkflowId).toBe(42)
    expect(wc.data.icon).toBe('lucide:workflow')
  })
})

describe('getWorkflowConnectorErrors', () => {
  it('requires a target and blocks self-connection', () => {
    expect(getWorkflowConnectorErrors([connector()], '10')).toHaveLength(1)
    expect(
      getWorkflowConnectorErrors([connector({ subWorkflowId: 10 })], '10'),
    ).toEqual(["Workflow Connector 1: a workflow can't connect to itself"])
    expect(
      getWorkflowConnectorErrors([connector({ subWorkflowId: 42 })], '10'),
    ).toEqual([])
  })
})

describe('Workflow Initiator JSON', () => {
  const manual = (id: string, data: Record<string, unknown>, y: number) =>
    node(id, { label: id, toolType: NODE_TOOL_TYPE.MANUAL_USER, ...data }, y)

  it('writes both keys on START / INTERNAL_ACTOR and reads them back', () => {
    const json: any = exportWorkflow(
      [
        manual('start', {}, 0),
        manual(
          'review',
          {
            subWorkflowId: '42',
            subWorkflowName: 'Vendor Onboarding',
            workflowInitiator: true,
          },
          250,
        ),
      ],
      [],
    )
    const start = json.blocks.find((b: any) => b.id === 'start')
    const review = json.blocks.find((b: any) => b.id === 'review')
    expect(start.type).toBe('START')
    expect(start.settings).toMatchObject({
      subWorkflowId: 0,
      workflowInitiator: false,
    })
    expect(review.type).toBe('INTERNAL_ACTOR')
    expect(review.settings).toMatchObject({
      subWorkflowId: '42',
      subWorkflowName: 'Vendor Onboarding',
      workflowInitiator: true,
    })

    const { nodes } = importWorkflow(json)
    expect(nodes.find((n) => n.id === 'review')!.data).toMatchObject({
      subWorkflowId: '42',
      subWorkflowName: 'Vendor Onboarding',
      workflowInitiator: true,
    })
  })

  it('saves "on but no workflow" as off', () => {
    const json: any = exportWorkflow(
      [
        manual(
          'start',
          { subWorkflowId: 0, subWorkflowName: 'x', workflowInitiator: true },
          0,
        ),
      ],
      [],
    )
    const start = json.blocks.find((b: any) => b.id === 'start')
    expect(start.settings.workflowInitiator).toBe(false)
    expect(start.settings.subWorkflowId).toBe(0)
    expect(start.settings).not.toHaveProperty('subWorkflowName')
  })

  it('imports the V5 stale-true case as off', () => {
    const { nodes } = importWorkflow({
      blocks: [
        {
          id: 's',
          type: 'START',
          settings: {
            label: 'Start',
            subWorkflowId: 0,
            workflowInitiator: true,
          },
        },
      ],
      rules: [],
    })
    expect(nodes[0].data.workflowInitiator).toBe(false)
  })

  it('flags an initiator with no target or pointing at itself', () => {
    const on = (subWorkflowId: unknown) =>
      manual('Review', { subWorkflowId, workflowInitiator: true }, 0)
    expect(getWorkflowInitiatorErrors([on(0)], '10')).toEqual([
      'Review: select the workflow to initiate',
    ])
    expect(getWorkflowInitiatorErrors([on('10')], '10')).toEqual([
      "Review: a workflow can't initiate itself",
    ])
    expect(getWorkflowInitiatorErrors([on('42')], '10')).toEqual([])
    expect(
      getWorkflowInitiatorErrors(
        [manual('Off', { subWorkflowId: 0, workflowInitiator: false }, 0)],
        '10',
      ),
    ).toEqual([])
  })
})

describe('off localhost', () => {
  it('saves workflows without the initiator keys', () => {
    vi.stubGlobal('location', { hostname: 'cloud.ezofis.com' })
    try {
      const json: any = exportWorkflow(
        [
          node('start', {
            label: 'start',
            subWorkflowId: '42',
            toolType: NODE_TOOL_TYPE.MANUAL_USER,
            workflowInitiator: true,
          }),
        ],
        [],
      )
      const start = json.blocks.find((b: any) => b.id === 'start')
      // Node data passes through untouched; nothing is normalised or added.
      expect(start.settings.workflowInitiator).toBe(true)
      const plain: any = exportWorkflow(
        [node('s', { label: 's', toolType: NODE_TOOL_TYPE.MANUAL_USER })],
        [],
      )
      expect(plain.blocks[0].settings).not.toHaveProperty('workflowInitiator')
      expect(plain.blocks[0].settings).not.toHaveProperty('subWorkflowId')
    } finally {
      vi.stubGlobal('location', { hostname: 'localhost' })
    }
  })
})

describe('getConnectorSaveBlock', () => {
  const manual = node('m', { label: 'm', toolType: NODE_TOOL_TYPE.MANUAL_USER })

  it('blocks saving a connector until the backend supports it', () => {
    expect(getConnectorSaveBlock([manual, connector()], false)).toMatch(
      /can't be saved yet/,
    )
    expect(getConnectorSaveBlock([manual], false)).toBeNull()
    expect(getConnectorSaveBlock([manual, connector()], true)).toBeNull()
  })
})
