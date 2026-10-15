import { expect, it } from 'vitest'
import { resetRuleDrivenValues } from './ruleEngine'
const f = (id: string, type: string, validation: any = {}) => ({ id, label: id, type, settings: { general: { visibility: 'NORMAL' }, specific: {}, validation } })
const panels = [
  { id: 'p1', settings: {}, fields: [f('action','SINGLE_CHOICE',{ readonlySettings:[{id:'r',value:'Obsolete',controls:['pack']}] })]},
  { id: 'p2', settings: {}, fields: [f('pack','MULTI_CHOICE',{ enableSettings:[{id:'e',value:'Bottle',controls:['bottle']}] })]},
  { id: 'p3', settings: {}, fields: [f('bottle','SHORT_TEXT')]},
]
it('clears locked field and cascades', () => {
  const prev = { action: 'New', pack: ['Bottle'], bottle: 'abc' }
  const out = resetRuleDrivenValues(panels as any, prev, { ...prev, action: 'Obsolete' })
  expect(out.pack).toEqual([]); expect(out.bottle).toBe('')
  const keep = resetRuleDrivenValues(panels as any, { action:'Obsolete', pack:['Bottle'], bottle:'x' }, { action:'Obsolete', pack:['Bottle'], bottle:'x', other: 1 })
  expect(keep.pack).toEqual(['Bottle'])
})
