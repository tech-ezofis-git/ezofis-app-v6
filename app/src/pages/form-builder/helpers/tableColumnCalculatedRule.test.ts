import { describe, expect, it } from 'vitest'
import {
  computeTableColumnTotals,
  evaluateTableRows,
} from './runtimeFieldAdapter'
import { applyCalculatedContentRule } from './tableColumnDefaults'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const calc = (contentRule?: string) => ({
  id: 'total',
  label: 'Total',
  name: 'Total',
  type: 'CALCULATED',
  settings: {
    specific: {
      formulaTokens: [
        { type: 'FIELD', value: 'qty' },
        { type: 'OPERATOR', value: '*' },
        { type: 'FIELD', value: 'price' },
      ],
      showColumnTotal: true,
    },
    validation: contentRule ? { contentRule } : {},
  },
})

const field = (contentRule?: string) => ({
  id: 'f_tbl',
  label: 'Lines',
  type: 'TABLE',
  settings: {
    specific: {
      tableColumns: [
        { id: 'qty', label: 'Qty', name: 'Qty', type: 'NUMBER', settings: {} },
        {
          id: 'price',
          label: 'Price',
          name: 'Price',
          type: 'NUMBER',
          settings: {},
        },
        calc(contentRule),
      ],
    },
  },
})

const rows = [
  { price: 1.25, qty: 3 }, // 3.75
  { price: 2.1, qty: 2 }, // 4.2
]

describe('Calculated column content rule', () => {
  it('Integer rounds a result to a whole number; Decimal and no rule keep it', () => {
    const integer = calc('INTEGER')
    expect(applyCalculatedContentRule(integer, 3.75)).toBe(4)
    expect(applyCalculatedContentRule(integer, 4.2)).toBe(4)
    expect(applyCalculatedContentRule(integer, -1.6)).toBe(-2)
    expect(applyCalculatedContentRule(calc('DECIMAL'), 3.75)).toBe(3.75)
    expect(applyCalculatedContentRule(calc(), 3.75)).toBe(3.75)
  })

  it('passes through an empty or non-finite result', () => {
    expect(applyCalculatedContentRule(calc('INTEGER'), null)).toBeNull()
    expect(applyCalculatedContentRule(calc('INTEGER'), Number.NaN)).toBeNaN()
  })

  it('row evaluation applies the rule, so cells carry the whole number', () => {
    const out = evaluateTableRows(field('INTEGER'), rows)
    expect(out.map((r) => r.total)).toEqual([4, 4])
  })

  it('without the rule (or with Decimal) results are unchanged', () => {
    expect(evaluateTableRows(field(), rows).map((r) => r.total)).toEqual([
      3.75, 4.2,
    ])
    expect(
      evaluateTableRows(field('DECIMAL'), rows).map((r) => r.total),
    ).toEqual([3.75, 4.2])
  })

  it('the column total sums the rounded values', () => {
    const evaluated = evaluateTableRows(field('INTEGER'), rows)
    expect(computeTableColumnTotals(field('INTEGER'), evaluated)).toEqual({
      total: 8,
    })
    const plain = evaluateTableRows(field(), rows)
    expect(computeTableColumnTotals(field(), plain).total).toBeCloseTo(7.95, 5)
  })

  it('is saved and reloaded with the column', () => {
    const saved = serializeFormPayload(
      normalizeV5FormJson({
        panels: [{ fields: [field('INTEGER')], id: 'p1' }],
      }),
    ).panels[0].fields[0].settings.specific.tableColumns
    const total = saved.find((c: { type: string }) => c.type === 'CALCULATED')
    expect(total.settings.validation.contentRule).toBe('INTEGER')
    expect(total.settings.specific.showColumnTotal).toBe(true)
  })
})
