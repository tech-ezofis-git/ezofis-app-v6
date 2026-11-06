import { describe, expect, it } from 'vitest'
import {
  applyPanelSelection,
  type PanelOption,
  selectedPanelIds,
} from './securityPanels'

const panels: PanelOption[] = [
  { fieldIds: ['a', 'b'], id: 'p1', name: 'Customer' },
  { fieldIds: ['c', 'd', 'e'], id: 'p2', name: 'Pricing' },
  { fieldIds: [], id: 'p3', name: 'Empty' },
]

describe('selectedPanelIds', () => {
  it('counts a panel only when all of its fields are picked', () => {
    expect(selectedPanelIds(panels, ['a', 'b', 'c'])).toEqual(['p1'])
    expect(selectedPanelIds(panels, ['a'])).toEqual([])
    expect(selectedPanelIds(panels, [])).toEqual([])
  })

  it('never selects a panel with no fields', () => {
    expect(selectedPanelIds(panels, ['a', 'b', 'c', 'd', 'e'])).toEqual([
      'p1',
      'p2',
    ])
  })
})

describe('applyPanelSelection', () => {
  it('adds every field of a newly picked panel', () => {
    expect(applyPanelSelection(panels, [], ['p2']).sort()).toEqual([
      'c',
      'd',
      'e',
    ])
  })

  it('keeps fields picked on their own', () => {
    expect(applyPanelSelection(panels, ['a'], ['p2']).sort()).toEqual([
      'a',
      'c',
      'd',
      'e',
    ])
  })

  it('drops all fields of a removed panel but keeps the others', () => {
    expect(
      applyPanelSelection(panels, ['a', 'b', 'c', 'd', 'e'], ['p1']).sort(),
    ).toEqual(['a', 'b'])
  })

  it('does not change fields when the picked panels are the same', () => {
    expect(applyPanelSelection(panels, ['a', 'b'], ['p1']).sort()).toEqual([
      'a',
      'b',
    ])
  })

  it('completes a half-picked panel when it is picked', () => {
    // 'c' alone does not make p2 selected, so picking p2 adds d and e too.
    expect(applyPanelSelection(panels, ['c'], ['p2']).sort()).toEqual([
      'c',
      'd',
      'e',
    ])
  })
})
