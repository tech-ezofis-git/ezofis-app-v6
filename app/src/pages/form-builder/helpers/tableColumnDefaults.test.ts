import { describe, expect, it } from 'vitest'
import {
  buildTableRowDefaults,
  canReplaceUntouchedRow,
  clampTextToMaxLength,
  getColumnDecimalDigits,
  getNumberCellProps,
  hasMeaningfulTableRows,
  isDefaultOnlyRow,
  resolveTableColumnDefault,
} from './tableColumnDefaults'

const col = (
  id: string,
  specific: Record<string, unknown> = {},
  extra = {},
) => ({
  id,
  name: id,
  type: 'SHORT_TEXT',
  settings: { specific },
  ...extra,
})

const columns = [
  col('seq', { defaultValueType: 'AUTO_SEQUENCE' }),
  col('mail', { defaultValueType: 'USER_EMAIL' }),
  col('note', { customDefaultValue: 'n/a', defaultValueType: 'CUSTOM' }),
  col('plain'),
]

describe('Batch 2A: table column defaults', () => {
  it('applies configured defaults to the initial blank row (no existing rows)', () => {
    expect(buildTableRowDefaults(columns, [], 'me@x.com')).toEqual({
      mail: 'me@x.com',
      note: 'n/a',
      seq: 1,
    })
  })

  it('applies defaults to the replacement row after the last row / all rows are deleted', () => {
    // delete-last-row and bulk-delete both rebuild the blank row from []
    const afterDelete = buildTableRowDefaults(columns, [], 'me@x.com')
    expect(afterDelete.seq).toBe(1)
    expect(afterDelete.note).toBe('n/a')
  })

  it('leaves columns without a default out of the row', () => {
    const d = buildTableRowDefaults([col('plain')], [], 'me@x.com')
    expect(d).toEqual({})
  })

  it('never overwrites a value that is already present in the row', () => {
    const d = buildTableRowDefaults(columns, [], 'me@x.com', {
      mail: 'typed@x.com',
      note: 'mine',
    })
    expect(d).toEqual({ seq: 1 })
  })

  it('AUTO_SEQUENCE continues after the highest existing value, so a middle delete cannot duplicate', () => {
    const seq = col('seq', { defaultValueType: 'AUTO_SEQUENCE' })
    // rows 1,2,3 -> delete 2 -> remaining 1,3 -> next must be 4, not 3
    expect(resolveTableColumnDefault(seq, [{ seq: 1 }, { seq: 3 }], '')).toBe(4)
    expect(resolveTableColumnDefault(seq, [{ seq: 1 }, { seq: 2 }], '')).toBe(3)
    // non-numeric / blank cells are ignored
    expect(
      resolveTableColumnDefault(seq, [{ seq: '' }, { seq: 'x' }], ''),
    ).toBe(1)
  })

  it('omits USER_EMAIL when there is no session email', () => {
    expect(
      buildTableRowDefaults(
        [col('mail', { defaultValueType: 'USER_EMAIL' })],
        [],
        '',
      ),
    ).toEqual({})
  })

  it('CURRENT_DATE uses the ISO date', () => {
    expect(
      resolveTableColumnDefault(
        col('d', { defaultValueType: 'CURRENT_DATE' }),
        [],
        '',
        new Date('2026-10-13T08:00:00Z'),
      ),
    ).toBe('2026-10-13')
  })
})

describe('Batch 2A: number cell props', () => {
  it('INTEGER content rule disables decimal input', () => {
    expect(
      getNumberCellProps({
        settings: { validation: { contentRule: 'INTEGER' } },
      }).allowDecimal,
    ).toBe(false)
  })

  it('DECIMAL, other rules and no rule keep decimal input', () => {
    expect(
      getNumberCellProps({
        settings: { validation: { contentRule: 'DECIMAL' } },
      }).allowDecimal,
    ).toBe(true)
    expect(getNumberCellProps({ settings: {} }).allowDecimal).toBe(true)
    expect(getNumberCellProps({}).allowDecimal).toBe(true)
  })

  it('uses the configured placeholder and falls back to 0', () => {
    expect(
      getNumberCellProps({ settings: { specific: { placeholder: 'Qty' } } })
        .placeholder,
    ).toBe('Qty')
    expect(
      getNumberCellProps({ settings: { specific: { placeholder: '' } } })
        .placeholder,
    ).toBe('0')
    expect(getNumberCellProps({}).placeholder).toBe('0')
  })
})

describe('default-only row detection (appendRows / required table)', () => {
  const cols = [
    col('seq', { defaultValueType: 'AUTO_SEQUENCE' }),
    col('mail', { defaultValueType: 'USER_EMAIL' }),
    col('note', { customDefaultValue: 'n/a', defaultValueType: 'CUSTOM' }),
    col('item'),
  ]

  it('treats empty and generated-default rows as blank', () => {
    expect(isDefaultOnlyRow({}, cols, 'me@x.com')).toBe(true)
    expect(isDefaultOnlyRow({ _rowId: 'r1' }, cols, 'me@x.com')).toBe(true)
    expect(
      isDefaultOnlyRow(
        { _rowId: 'r1', mail: 'me@x.com', note: 'n/a', seq: 1 },
        cols,
        'me@x.com',
      ),
    ).toBe(true)
  })

  it('does not treat a row with user-entered data as blank', () => {
    expect(isDefaultOnlyRow({ item: 'Widget', seq: 1 }, cols, 'me@x.com')).toBe(
      false,
    )
    // a value that differs from the generated default is user data
    expect(isDefaultOnlyRow({ note: 'custom text' }, cols, 'me@x.com')).toBe(
      false,
    )
    expect(isDefaultOnlyRow({ mail: 'other@x.com' }, cols, 'me@x.com')).toBe(
      false,
    )
    // unknown column keys are user data
    expect(isDefaultOnlyRow({ stray: 'x' }, cols, 'me@x.com')).toBe(false)
  })

  it('columns without a configured default never count as generated', () => {
    expect(isDefaultOnlyRow({ item: '5' }, cols, 'me@x.com')).toBe(false)
  })

  it('hasMeaningfulTableRows ignores default-only rows', () => {
    expect(hasMeaningfulTableRows([{ seq: 1 }], cols, 'me@x.com')).toBe(false)
    expect(hasMeaningfulTableRows([{}], cols, 'me@x.com')).toBe(false)
    expect(
      hasMeaningfulTableRows(
        [{ seq: 1 }, { item: 'a', seq: 2 }],
        cols,
        'me@x.com',
      ),
    ).toBe(true)
    expect(hasMeaningfulTableRows(undefined, cols, 'me@x.com')).toBe(false)
  })
})

describe('AUTO_SEQUENCE detection is position-exact', () => {
  const cols = [col('seq', { defaultValueType: 'AUTO_SEQUENCE' }), col('item')]

  it('a manually entered number that differs from the generated one is user data', () => {
    expect(isDefaultOnlyRow({ seq: 5 }, cols, '')).toBe(false)
    expect(isDefaultOnlyRow({ seq: 42 }, cols, '')).toBe(false)
    expect(isDefaultOnlyRow({ seq: 2 }, cols, '')).toBe(false) // first row expects 1
    expect(isDefaultOnlyRow({ seq: 1 }, cols, '')).toBe(true) // exactly generated
  })

  it('expects the next number after the rows above it', () => {
    const above = [{ seq: 1 }]
    expect(isDefaultOnlyRow({ seq: 2 }, cols, '', above)).toBe(true)
    expect(isDefaultOnlyRow({ seq: 7 }, cols, '', above)).toBe(false)
  })

  it('required-table check: a typed sequence number counts as data, generated ones do not', () => {
    expect(hasMeaningfulTableRows([{ seq: 1 }, { seq: 2 }], cols, '')).toBe(
      false,
    )
    expect(hasMeaningfulTableRows([{ seq: 9 }], cols, '')).toBe(true)
  })
})

describe('canReplaceUntouchedRow (QR / OCR / file import)', () => {
  const cols = [
    col('seq', { defaultValueType: 'AUTO_SEQUENCE' }),
    col('note', { customDefaultValue: 'n/a', defaultValueType: 'CUSTOM' }),
    col('item'),
  ]

  it('replaces an untouched empty or default-only row', () => {
    expect(canReplaceUntouchedRow({}, cols, '', false)).toBe(true)
    expect(
      canReplaceUntouchedRow({ note: 'n/a', seq: 1 }, cols, '', false),
    ).toBe(true)
  })

  it('never replaces a row with a manually entered number', () => {
    expect(canReplaceUntouchedRow({ seq: 5 }, cols, '', false)).toBe(false)
  })

  it('never replaces a row the user edited, even if the value equals the default', () => {
    expect(
      canReplaceUntouchedRow({ note: 'n/a', seq: 1 }, cols, '', true),
    ).toBe(false)
    expect(canReplaceUntouchedRow({}, cols, '', true)).toBe(false)
  })

  it('never replaces a row holding other user data', () => {
    expect(
      canReplaceUntouchedRow({ item: 'Widget', seq: 1 }, cols, '', false),
    ).toBe(false)
  })
})

describe('Batch 2B: text length, decimals, step, prefix/suffix helpers', () => {
  const num = (specific = {}, validation = {}) => ({
    type: 'NUMBER',
    settings: { specific, validation },
  })

  it('clampTextToMaxLength trims SHORT_TEXT / LONG_TEXT to the configured maximum', () => {
    const short = {
      type: 'SHORT_TEXT',
      settings: { validation: { maximum: 4 } },
    }
    const long = {
      type: 'LONG_TEXT',
      settings: { validation: { maximum: '3' } },
    }
    expect(clampTextToMaxLength('abcdefgh', short)).toBe('abcd')
    expect(clampTextToMaxLength('abcdefgh', long)).toBe('abc')
    expect(clampTextToMaxLength('abc', short)).toBe('abc')
  })

  it('clampTextToMaxLength is a no-op without a positive maximum or for other types', () => {
    expect(clampTextToMaxLength('abcdefgh', { type: 'SHORT_TEXT' })).toBe(
      'abcdefgh',
    )
    expect(
      clampTextToMaxLength('abcdefgh', {
        type: 'SHORT_TEXT',
        settings: { validation: { maximum: '' } },
      }),
    ).toBe('abcdefgh')
    expect(
      clampTextToMaxLength('abcdefgh', {
        type: 'SHORT_TEXT',
        settings: { validation: { maximum: 0 } },
      }),
    ).toBe('abcdefgh')
    expect(
      clampTextToMaxLength('abcdefgh', {
        type: 'NUMBER',
        settings: { validation: { maximum: 2 } },
      }),
    ).toBe('abcdefgh')
  })

  it('decimal digits apply only with the DECIMAL rule', () => {
    expect(
      getColumnDecimalDigits(
        num({}, { contentRule: 'DECIMAL', decimalDigits: 2 }),
      ),
    ).toBe(2)
    expect(
      getColumnDecimalDigits(
        num({}, { contentRule: 'DECIMAL', decimalValue: '3' }),
      ),
    ).toBe(3)
    expect(
      getColumnDecimalDigits(
        num({}, { contentRule: 'INTEGER', decimalDigits: 2 }),
      ),
    ).toBeUndefined()
    expect(
      getColumnDecimalDigits(num({}, { decimalDigits: 2 })),
    ).toBeUndefined()
    expect(
      getColumnDecimalDigits(
        num({}, { contentRule: 'DECIMAL', decimalDigits: '' }),
      ),
    ).toBeUndefined()
  })

  it('getNumberCellProps maps decimals, step, prefix and suffix', () => {
    const props = getNumberCellProps(
      num(
        { prefixLabel: '$', step: '0.5', suffixLabel: 'kg' },
        { contentRule: 'DECIMAL', decimalDigits: 2 },
      ),
    )
    expect(props).toMatchObject({
      allowDecimal: true,
      decimalScale: 2,
      prefix: '$',
      step: 0.5,
      suffix: 'kg',
    })
  })

  it('INTEGER keeps integer-only input and ignores decimal digits', () => {
    const props = getNumberCellProps(
      num({}, { contentRule: 'INTEGER', decimalDigits: 2 }),
    )
    expect(props.allowDecimal).toBe(false)
    expect(props.decimalScale).toBeUndefined()
  })

  it('unset settings leave the cell unchanged (backwards compatible)', () => {
    expect(getNumberCellProps(num())).toEqual({
      allowDecimal: true,
      decimalScale: undefined,
      placeholder: '0',
      prefix: undefined,
      step: undefined,
      suffix: undefined,
    })
    // zero / negative / junk step is ignored
    expect(getNumberCellProps(num({ step: 0 })).step).toBeUndefined()
    expect(getNumberCellProps(num({ step: -1 })).step).toBeUndefined()
    expect(getNumberCellProps(num({ step: 'x' })).step).toBeUndefined()
  })
})
