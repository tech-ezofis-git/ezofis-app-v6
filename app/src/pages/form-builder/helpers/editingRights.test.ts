import { describe, expect, it } from 'vitest'
import { editingRightsPatch, getEditingRights } from './editingRights'

describe('getEditingRights', () => {
  it('is editable by default', () => {
    expect(getEditingRights(undefined)).toBe('NORMAL')
    expect(getEditingRights({})).toBe('NORMAL')
    expect(getEditingRights({ visibility: 'NORMAL' })).toBe('NORMAL')
  })

  it('reads a locked field saved either way as view only', () => {
    expect(getEditingRights({ readOnly: true })).toBe('READ_ONLY')
    expect(getEditingRights({ visibility: 'READ_ONLY' })).toBe('READ_ONLY')
    expect(getEditingRights({ visibility: 'DISABLE' })).toBe('READ_ONLY')
  })

  it('reads a hidden field saved either way as hidden', () => {
    expect(getEditingRights({ hidden: true })).toBe('HIDDEN')
    expect(getEditingRights({ visibility: 'HIDDEN' })).toBe('HIDDEN')
  })

  it('treats hidden as stronger than locked', () => {
    expect(getEditingRights({ hidden: true, readOnly: true })).toBe('HIDDEN')
  })
})

describe('editingRightsPatch', () => {
  it('sets both saved places for each choice', () => {
    expect(editingRightsPatch('NORMAL')).toEqual({
      hidden: false,
      readOnly: false,
      visibility: 'NORMAL',
    })
    expect(editingRightsPatch('READ_ONLY')).toEqual({
      hidden: false,
      readOnly: true,
      visibility: 'READ_ONLY',
    })
    expect(editingRightsPatch('HIDDEN')).toEqual({
      hidden: true,
      readOnly: false,
      visibility: 'HIDDEN',
    })
  })

  it('reads back as the choice that was saved', () => {
    for (const rights of ['NORMAL', 'READ_ONLY', 'HIDDEN'] as const) {
      expect(getEditingRights(editingRightsPatch(rights))).toBe(rights)
    }
  })

  it('clears an old locked or hidden flag when switched back to editable', () => {
    const before = { hidden: true, readOnly: true, visibility: 'HIDDEN' }
    expect(
      getEditingRights({ ...before, ...editingRightsPatch('NORMAL') }),
    ).toBe('NORMAL')
  })
})
