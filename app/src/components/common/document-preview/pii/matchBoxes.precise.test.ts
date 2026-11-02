import { describe, expect, it } from 'vitest'
import type { TextBox } from './types'
import { matchPiiToBoxes } from './matchBoxes'

const nameLine: TextBox = {
  height: 1.2,
  left: 10,
  pageIndex: 0,
  text: 'Name: MR RAJAGOPALAN',
  top: 10,
  width: 20,
}

describe('matchPiiToBoxes with exact text-layer boxes', () => {
  it('covers only the value inside a longer text item, without growing', () => {
    const [area] = matchPiiToBoxes([nameLine], ['MR RAJAGOPALAN'], 3, true)
    expect(area.precise).toBe(true)
    // "Name: " is 6 of 20 characters; the cover starts after it.
    expect(area.left).toBeCloseTo(10 + 6, 5)
    expect(area.width).toBeCloseTo(14, 5)
  })

  it('keeps the grown cover for estimated (OCR) boxes', () => {
    const [area] = matchPiiToBoxes([nameLine], ['MR RAJAGOPALAN'], 3)
    expect(area.precise).toBeFalsy()
    expect(area.width).toBeGreaterThan(nameLine.width)
  })
})
