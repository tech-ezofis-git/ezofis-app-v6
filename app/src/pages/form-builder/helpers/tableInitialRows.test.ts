import { describe, expect, it } from 'vitest'
import {
  buildInitialFormModel,
  isFieldFilled,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { hydrateFormModel } from './runtimeFieldAdapter'
import { isRuntimeValueEmpty, validateFieldValue } from './runtimeValidation'

const seqCol = {
  id: 'c_seq',
  name: 'No',
  type: 'COUNTER',
  settings: { specific: { defaultValueType: 'AUTO_SEQUENCE' } },
}
const noteCol = {
  id: 'c_note',
  name: 'Note',
  type: 'SHORT_TEXT',
  settings: {
    specific: { customDefaultValue: 'n/a', defaultValueType: 'CUSTOM' },
  },
}
const itemCol = { id: 'c_item', name: 'Item', type: 'SHORT_TEXT', settings: {} }

const makeTable = (specific: Record<string, unknown>, validation = {}) => ({
  id: 'f_tbl',
  label: 'Items',
  type: 'TABLE',
  settings: { specific, validation },
})
const panelsOf = (field: unknown) => [{ fields: [field], id: 'p1' }]

describe('initial table rows seed column defaults (new forms)', () => {
  it('ON_DEMAND: seeds a single row carrying the configured defaults', () => {
    const table = makeTable({ tableColumns: [seqCol, noteCol, itemCol] })
    const model = buildInitialFormModel(panelsOf(table))
    expect(model.f_tbl).toEqual([{ c_note: 'n/a', c_seq: 1 }])
  })

  it('ON_DEMAND: a table without defaults still seeds [{}]', () => {
    const table = makeTable({ tableColumns: [itemCol] })
    expect(buildInitialFormModel(panelsOf(table)).f_tbl).toEqual([{}])
  })

  it('FIXED: keeps labels and row count, adds defaults and advances AUTO_SEQUENCE', () => {
    const labelCol = {
      id: 'c_label',
      name: 'Label',
      type: 'LABEL',
      settings: {},
    }
    const table = makeTable({
      fixedRowCount: 3,
      rowsType: 'FIXED',
      tableColumns: [labelCol, seqCol, itemCol],
      tableFixedRowLabels: ['A', 'B', 'C'],
    })
    const rows = buildInitialFormModel(panelsOf(table)).f_tbl
    expect(rows).toHaveLength(3)
    expect(rows.map((r: Record<string, unknown>) => r.c_label)).toEqual([
      'A',
      'B',
      'C',
    ])
    expect(rows.map((r: Record<string, unknown>) => r.c_seq)).toEqual([1, 2, 3])
    expect(rows[0]).not.toHaveProperty('c_item')
  })

  it('FIXED: a table without defaults is unchanged (labels only)', () => {
    const labelCol = {
      id: 'c_label',
      name: 'Label',
      type: 'LABEL',
      settings: {},
    }
    const table = makeTable({
      fixedRowCount: 2,
      rowsType: 'FIXED',
      tableColumns: [labelCol, itemCol],
      tableFixedRowLabels: ['A', 'B'],
    })
    expect(buildInitialFormModel(panelsOf(table)).f_tbl).toEqual([
      { c_label: 'A' },
      { c_label: 'B' },
    ])
  })
})

describe('saved entries are not overwritten by initialization', () => {
  const table = makeTable({ tableColumns: [seqCol, noteCol, itemCol] })
  const panels = panelsOf(table)

  it('saved rows win over seeded defaults', () => {
    const saved = [{ c_item: 'Widget', c_note: 'mine', c_seq: 7 }]
    const model = hydrateFormModel(
      panels,
      { f_tbl: JSON.stringify(saved) },
      { initialDefaults: buildInitialFormModel(panels) },
    )
    expect(model.f_tbl).toEqual(saved)
  })

  it('an empty saved table stays empty (no defaults injected)', () => {
    const model = hydrateFormModel(
      panels,
      { f_tbl: '[]' },
      { initialDefaults: buildInitialFormModel(panels) },
    )
    expect(model.f_tbl).toEqual([])
  })
})

describe('required tables are not satisfied by auto-filled defaults alone', () => {
  const table = makeTable(
    { tableColumns: [seqCol, noteCol, itemCol] },
    { fieldRule: 'REQUIRED' },
  )
  const seeded = [{ c_note: 'n/a', c_seq: 1 }]

  it('validateFieldValue: default-only table still fails the required check', () => {
    const res = validateFieldValue(table, seeded)
    expect(res.isValid).toBe(false)
    expect(res.error).toContain('should not be empty')
    expect(isRuntimeValueEmpty(seeded, table)).toBe(true)
  })

  it('validateFieldValue: passes once the user enters real data', () => {
    expect(
      validateFieldValue(table, [{ c_item: 'Widget', c_note: 'n/a', c_seq: 1 }])
        .isValid,
    ).toBe(true)
  })

  it('isFieldFilled (mandatory-fields indicator) agrees', () => {
    expect(isFieldFilled(table, seeded)).toBe(false)
    expect(isFieldFilled(table, [{ ...seeded[0], c_item: 'Widget' }])).toBe(
      true,
    )
  })

  it('a table with no configured defaults behaves as before', () => {
    const plain = makeTable(
      { tableColumns: [itemCol] },
      { fieldRule: 'REQUIRED' },
    )
    expect(isRuntimeValueEmpty([{}], plain)).toBe(true)
    expect(isRuntimeValueEmpty([{ c_item: 'x' }], plain)).toBe(false)
  })

  it('fixed-row label values still count as filled (existing behaviour)', () => {
    const labelCol = {
      id: 'c_label',
      name: 'Label',
      type: 'LABEL',
      settings: {},
    }
    const fixed = makeTable({ tableColumns: [labelCol, seqCol] })
    expect(isRuntimeValueEmpty([{ c_label: 'A', c_seq: 1 }], fixed)).toBe(false)
  })
})
