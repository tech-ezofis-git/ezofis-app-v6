import { describe, expect, it } from 'vitest'
import { canReinitiateFromBlock, getReprocessStageOptions } from './reprocess'

describe('getReprocessStageOptions', () => {
  it('lists every stage except the End block and marks the start', () => {
    const options = getReprocessStageOptions([
      { data: { label: 'Manual User', type: 'trigger' }, id: 'a' },
      { data: { label: 'Review' }, id: 'b' },
      { data: { label: 'Workflow Success', type: 'end' }, id: 'c' },
    ])

    expect(options).toEqual([
      { id: 'a', name: 'Manual User (Start)' },
      { id: 'b', name: 'Review' },
    ])
  })
})

describe('canReinitiateFromBlock', () => {
  it('needs an End block with the setting on', () => {
    const reprocess = { enabled: true, targetBlockId: null }

    expect(
      canReinitiateFromBlock({ type: 'END', settings: { reprocess } }),
    ).toBe(true)
    expect(
      canReinitiateFromBlock({
        type: 'END',
        settings: { reprocess: { enabled: false } },
      }),
    ).toBe(false)
    expect(canReinitiateFromBlock({ type: 'END', settings: {} })).toBe(false)
    expect(
      canReinitiateFromBlock({
        type: 'INTERNAL_ACTOR',
        settings: { reprocess },
      }),
    ).toBe(false)
    expect(canReinitiateFromBlock(null)).toBe(false)
  })
})
