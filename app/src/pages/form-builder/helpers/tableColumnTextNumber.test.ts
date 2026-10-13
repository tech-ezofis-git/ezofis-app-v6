import { describe, expect, it } from 'vitest'
import { computeTableColumnTotals } from './runtimeFieldAdapter'
import { validateFieldValue } from './runtimeValidation'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
) => ({ id, label: id, name: id, type, settings: { specific, validation } })

const table = (columns: unknown[]) => ({
  id: 'f_tbl',
  label: 'Items',
  type: 'TABLE',
  settings: { specific: { tableColumns: columns } },
})

describe('Batch 2B: submission validation', () => {
  it('decimal digits: rejects too many decimals only with the DECIMAL rule', () => {
    const t = table([
      col('price', 'NUMBER', {}, { contentRule: 'DECIMAL', decimalDigits: 2 }),
    ])
    expect(validateFieldValue(t, [{ price: '1.234' }]).error).toBe(
      'Row 1: price decimal places should not exceed 2 digits',
    )
    expect(validateFieldValue(t, [{ price: '1.23' }]).isValid).toBe(true)
    expect(validateFieldValue(t, [{ price: 5 }]).isValid).toBe(true)
  })

  it('decimal digits: unset leaves DECIMAL columns unrestricted', () => {
    const t = table([col('price', 'NUMBER', {}, { contentRule: 'DECIMAL' })])
    expect(validateFieldValue(t, [{ price: '1.23456' }]).isValid).toBe(true)
  })

  it('INTEGER still rejects decimals and ignores a stale decimalDigits', () => {
    const t = table([
      col('qty', 'NUMBER', {}, { contentRule: 'INTEGER', decimalDigits: 2 }),
    ])
    expect(validateFieldValue(t, [{ qty: '1.5' }]).error).toBe(
      'Row 1: qty should be a number without decimals',
    )
    expect(validateFieldValue(t, [{ qty: '3' }]).isValid).toBe(true)
  })

  it('step, prefix and suffix never affect validation', () => {
    const t = table([
      col('w', 'NUMBER', { prefixLabel: '$', step: 5, suffixLabel: 'kg' }),
    ])
    expect(validateFieldValue(t, [{ w: 7 }]).isValid).toBe(true)
  })

  it('max length is still enforced on submit for SHORT_TEXT and LONG_TEXT', () => {
    const t = table([
      col('code', 'SHORT_TEXT', {}, { maximum: 4 }),
      col('notes', 'LONG_TEXT', {}, { maximum: 6 }),
    ])
    const res = validateFieldValue(t, [{ code: 'abcde', notes: 'abcdefg' }])
    expect(res.errors).toEqual([
      'Row 1: code should not be more than 4 characters',
      'Row 1: notes should not be more than 6 characters',
    ])
    expect(
      validateFieldValue(t, [{ code: 'abcd', notes: 'abcdef' }]).isValid,
    ).toBe(true)
  })
})

describe('Batch 2B: schema save / reload', () => {
  it('keeps decimal digits, step, prefix and suffix through load and save', () => {
    const raw = {
      panels: [
        {
          fields: [
            table([
              col(
                'price',
                'NUMBER',
                { prefixLabel: '$', step: 0.5, suffixLabel: 'kg' },
                { contentRule: 'DECIMAL', decimalDigits: 3 },
              ),
            ]),
          ],
          id: 'p1',
        },
      ],
    }
    const loaded = normalizeV5FormJson(raw)
    const loadedCol =
      loaded.panels[0].fields[0].settings.specific.tableColumns[0]
    expect(loadedCol.settings.specific).toMatchObject({
      prefixLabel: '$',
      step: 0.5,
      suffixLabel: 'kg',
    })
    expect(loadedCol.settings.validation.decimalDigits).toBe(3)

    const saved = serializeFormPayload(loaded)
    const savedCol = saved.panels[0].fields[0].settings.specific.tableColumns[0]
    expect(savedCol.settings.specific).toMatchObject({
      prefixLabel: '$',
      step: 0.5,
      suffixLabel: 'kg',
    })
    expect(savedCol.settings.validation.decimalDigits).toBe(3)
    // V5 name for the same setting is kept in sync by the generic adapter
    expect(savedCol.settings.validation.decimalValue).toBe(3)
  })
})

describe('Batch 2B: totals are not affected by prefix / suffix', () => {
  it('column totals stay plain numeric sums', () => {
    const t = table([
      col('amt', 'NUMBER', {
        prefixLabel: '$',
        showColumnTotal: true,
        suffixLabel: 'kg',
      }),
    ])
    expect(computeTableColumnTotals(t, [{ amt: 2 }, { amt: 3.5 }])).toEqual({
      amt: 5.5,
    })
  })
})
