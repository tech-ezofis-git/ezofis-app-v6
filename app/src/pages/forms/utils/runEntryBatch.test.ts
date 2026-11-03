import { describe, expect, it, vi } from 'vitest'
import { runEntryBatch } from './runEntryBatch'

describe('runEntryBatch', () => {
  it('splits entries into succeeded and failed', async () => {
    const task = vi.fn(async (id: number) =>
      id % 2 ? { error: 'boom', inUse: id === 3 } : { error: '' },
    )
    const { failed, succeeded } = await runEntryBatch([1, 2, 3, 4], task, 2)
    expect(succeeded).toEqual([2, 4])
    expect(failed.map((f) => f.item)).toEqual([1, 3])
    expect(failed[1].result.inUse).toBe(true)
    expect(task).toHaveBeenCalledTimes(4)
  })

  it('counts a thrown call as failed instead of stopping', async () => {
    const { failed, succeeded } = await runEntryBatch([1, 2], async (id) => {
      if (id === 1) throw new Error('network')
      return {}
    })
    expect(succeeded).toEqual([2])
    expect(failed[0].result.error).toBe('network')
  })

  it('runs no more than the batch size at once', async () => {
    let running = 0
    let peak = 0
    await runEntryBatch(
      [1, 2, 3, 4, 5, 6, 7],
      async () => {
        running += 1
        peak = Math.max(peak, running)
        await new Promise((r) => setTimeout(r, 1))
        running -= 1
        return {}
      },
      3,
    )
    expect(peak).toBe(3)
  })
})
