import { describe, expect, it } from 'vitest'
import { resolveAgentFreight } from './quoteVariants'

const result = {
  'Freight': 375,
  'Freight Estimate': 375,
  'Freight Note': '',
  'Hst': 969.16,
}

describe('agent freight', () => {
  it('applies while the form still holds the agent HST', () => {
    expect(resolveAgentFreight(result, 969.16)).toBe(375)
  })

  it('is not overridden by a blank or text freight key', () => {
    expect(
      resolveAgentFreight(
        { 'Freight': '375.00', 'Freight Note': 'Toronto', 'Hst': 969.16 },
        969.16,
      ),
    ).toBe(375)
  })

  it('stays 0 once a user has changed freight and HST', () => {
    expect(resolveAgentFreight(result, 920.41)).toBe(0)
  })

  it('is 0 when the agent has no freight', () => {
    expect(resolveAgentFreight({ Freight: 0, Hst: 920.41 }, 920.41)).toBe(0)
    expect(resolveAgentFreight(null, 0)).toBe(0)
  })
})
