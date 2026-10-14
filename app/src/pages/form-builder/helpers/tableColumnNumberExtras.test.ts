import { describe, expect, it } from 'vitest'
import { validateFieldValue } from './runtimeValidation'
import {
  getColumnDecimalDigits,
  getNumberBounds,
  getNumberCellProps,
  parseScannedNumber,
} from './tableColumnDefaults'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const num = (
  id: string,
  validation: Record<string, unknown> = {},
  specific: Record<string, unknown> = {},
  type = 'NUMBER',
) => ({ id, label: id, name: id, type, settings: { specific, validation } })

const table = (columns: unknown[]) => ({
  id: 'f_tbl',
  label: 'Items',
  type: 'TABLE',
  settings: { specific: { tableColumns: columns } },
})

describe('Number content rules: Commas and Both', () => {
  it('Commas is whole numbers with thousands separators', () => {
    const props = getNumberCellProps(num('a', { contentRule: 'COMMAS' }))
    expect(props.allowDecimal).toBe(false)
    expect(props.thousandSeparator).toBe(',')
  })

  it('Both allows decimals, shows separators and honors the digit count', () => {
    const col = num('a', { contentRule: 'BOTH', decimalDigits: 2 })
    const props = getNumberCellProps(col)
    expect(props.allowDecimal).toBe(true)
    expect(props.thousandSeparator).toBe(',')
    expect(props.decimalScale).toBe(2)
    expect(getColumnDecimalDigits(col)).toBe(2)
  })

  it('Integer, Decimal and no rule are unchanged (no separator)', () => {
    expect(
      getNumberCellProps(num('a', { contentRule: 'INTEGER' })),
    ).toMatchObject({ allowDecimal: false, thousandSeparator: undefined })
    expect(
      getNumberCellProps(num('a', { contentRule: 'DECIMAL' })),
    ).toMatchObject({ allowDecimal: true, thousandSeparator: undefined })
    expect(getNumberCellProps(num('a'))).toMatchObject({
      allowDecimal: true,
      thousandSeparator: undefined,
    })
    expect(
      getColumnDecimalDigits(
        num('a', { contentRule: 'COMMAS', decimalDigits: 2 }),
      ),
    ).toBeUndefined()
  })

  it('submit: Commas rejects decimals; Both accepts them but limits the digits', () => {
    const commas = table([num('a', { contentRule: 'COMMAS' })])
    expect(validateFieldValue(commas, [{ a: '1.5' }]).error).toBe(
      'Row 1: a should be a number without decimals',
    )
    expect(validateFieldValue(commas, [{ a: 1200 }]).isValid).toBe(true)
    const both = table([num('a', { contentRule: 'BOTH', decimalDigits: 2 })])
    expect(validateFieldValue(both, [{ a: '1234.56' }]).isValid).toBe(true)
    expect(validateFieldValue(both, [{ a: '1.234' }]).error).toBe(
      'Row 1: a decimal places should not exceed 2 digits',
    )
    expect(validateFieldValue(both, [{ a: 'abc' }]).isValid).toBe(false)
  })
})

describe('Number range modes', () => {
  const maxFromOther = num('qty', {
    maximumNumberField: 'limit',
    minimum: 1,
    rangeType: 'MIN_FIXED_MAX_FLEX',
  })
  const minFromOther = num('qty', {
    maximum: 100,
    minimumNumberField: 'floor',
    rangeType: 'MIN_FLEX_MAX_FIXED',
  })

  it('both fixed is the default, and columns without a range type ignore column refs', () => {
    expect(getNumberBounds(num('a', { maximum: 9, minimum: 2 }), {})).toEqual({
      max: 9,
      min: 2,
    })
    expect(
      getNumberBounds(num('a', { maximumNumberField: 'limit', minimum: 2 }), {
        limit: 5,
      }),
    ).toEqual({ max: undefined, min: 2 })
  })

  it('minimum fixed, maximum read from another column of the row', () => {
    expect(getNumberBounds(maxFromOther, { limit: 10 })).toEqual({
      max: 10,
      min: 1,
    })
    // blank / missing / non-numeric reference: that bound is skipped
    expect(getNumberBounds(maxFromOther, { limit: '' }).max).toBeUndefined()
    expect(getNumberBounds(maxFromOther, {}).max).toBeUndefined()
    expect(getNumberBounds(maxFromOther, { limit: 'x' }).max).toBeUndefined()
    // a currency cell holds { currency, value }
    expect(
      getNumberBounds(maxFromOther, { limit: { currency: 'USD', value: 7 } })
        .max,
    ).toBe(7)
  })

  it('maximum fixed, minimum read from another column of the row', () => {
    expect(getNumberBounds(minFromOther, { floor: 20 })).toEqual({
      max: 100,
      min: 20,
    })
  })

  it('submit checks each row against its own bound', () => {
    const t = table([maxFromOther, num('limit')])
    const res = validateFieldValue(t, [
      { limit: 10, qty: 12 },
      { limit: 50, qty: 12 },
      { limit: '', qty: 999 },
      { limit: 10, qty: 0 },
    ])
    expect(res.errors).toEqual([
      'Row 1: qty should not be more than 10',
      'Row 4: qty should not be less than 1',
    ])
  })

  it('a column with only a bound read from another column is still checked', () => {
    const onlyDynamic = table([
      num('qty', {
        maximumNumberField: 'limit',
        rangeType: 'MIN_FIXED_MAX_FLEX',
      }),
      num('limit'),
    ])
    expect(validateFieldValue(onlyDynamic, [{ limit: 5, qty: 6 }]).error).toBe(
      'Row 1: qty should not be more than 5',
    )
  })

  it('minimum read from a column', () => {
    const t = table([minFromOther, num('floor')])
    expect(validateFieldValue(t, [{ floor: 20, qty: 10 }]).error).toBe(
      'Row 1: qty should not be less than 20',
    )
    expect(validateFieldValue(t, [{ floor: 20, qty: 50 }]).isValid).toBe(true)
  })
})

describe('Read values from QR on number cells', () => {
  it('reads a scanned number, ignoring spaces and thousands commas', () => {
    expect(parseScannedNumber(num('a'), ' 1,234.5 ')).toBe(1234.5)
    expect(parseScannedNumber(num('a'), '42')).toBe(42)
    expect(parseScannedNumber(num('a'), -7)).toBe(-7)
  })

  it('ignores text and blanks', () => {
    expect(parseScannedNumber(num('a'), 'INV-9')).toBeUndefined()
    expect(parseScannedNumber(num('a'), '   ')).toBeUndefined()
    expect(parseScannedNumber(num('a'), undefined)).toBeUndefined()
  })

  it('whole-number rules reject a decimal scan; decimal rules accept it', () => {
    expect(
      parseScannedNumber(num('a', { contentRule: 'INTEGER' }), '2.5'),
    ).toBeUndefined()
    expect(
      parseScannedNumber(num('a', { contentRule: 'COMMAS' }), '2.5'),
    ).toBeUndefined()
    expect(parseScannedNumber(num('a', { contentRule: 'INTEGER' }), '2')).toBe(
      2,
    )
    expect(
      parseScannedNumber(num('a', { contentRule: 'DECIMAL' }), '2.5'),
    ).toBe(2.5)
  })
})

describe('Schema save / reload of the number settings', () => {
  it('keeps range type, column references, QR and content rule', () => {
    const [limit, qty] = serializeFormPayload(
      normalizeV5FormJson({
        panels: [
          {
            fields: [
              table([
                num('limit'),
                num(
                  'qty',
                  {
                    contentRule: 'BOTH',
                    decimalDigits: 2,
                    maximumNumberField: 'limit',
                    rangeType: 'MIN_FIXED_MAX_FLEX',
                  },
                  { qrValue: true },
                ),
              ]),
            ],
            id: 'p1',
          },
        ],
      }),
    ).panels[0].fields[0].settings.specific.tableColumns
    expect(qty.settings.specific.qrValue).toBe(true)
    expect(qty.settings.validation).toMatchObject({
      contentRule: 'BOTH',
      decimalDigits: 2,
      rangeType: 'MIN_FIXED_MAX_FLEX',
    })
    // the referenced column keeps pointing at the (re-keyed) sibling
    expect(qty.settings.validation.maximumNumberField).toBe(limit.id)
  })
})
