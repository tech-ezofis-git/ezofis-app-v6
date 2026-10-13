import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { getDateTimeLimits } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { computeTableColumnTotals } from './runtimeFieldAdapter'
import { validateFieldValue } from './runtimeValidation'
import {
  getColumnCurrencyCode,
  getColumnCurrencyOptions,
} from './tableColumnDefaults'
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

describe('Batch 3: currency column', () => {
  const restricted = col('amt', 'CURRENCY_AMOUNT', {
    currencyOptionsType: 'SPECIFIC',
    specificCurrencies: ['usd', 'EUR', 'eur', ' '],
  })

  it('restricted list is normalised; ALL / unset gives no list', () => {
    expect(getColumnCurrencyOptions(restricted)).toEqual(['USD', 'EUR'])
    expect(
      getColumnCurrencyOptions(
        col('a', 'CURRENCY_AMOUNT', {
          currencyOptionsType: 'ALL',
          specificCurrencies: ['USD'],
        }),
      ),
    ).toEqual([])
    expect(getColumnCurrencyOptions(col('a', 'CURRENCY_AMOUNT'))).toEqual([])
  })

  it('currency shown: stored code, else default, else first restricted, else none', () => {
    expect(
      getColumnCurrencyCode(restricted, { currency: 'eur', value: 5 }),
    ).toBe('EUR')
    expect(getColumnCurrencyCode(restricted, 5)).toBe('USD')
    expect(
      getColumnCurrencyCode(
        col('a', 'CURRENCY_AMOUNT', { defaultCurrency: 'gbp' }),
        undefined,
      ),
    ).toBe('GBP')
    // nothing configured: undefined, so the cell keeps its original $ prefix
    expect(
      getColumnCurrencyCode(col('a', 'CURRENCY_AMOUNT'), 5),
    ).toBeUndefined()
  })

  it('submit rejects a currency outside the restricted list only', () => {
    const t = table([restricted])
    expect(
      validateFieldValue(t, [{ amt: { currency: 'JPY', value: 5 } }]).error,
    ).toBe('Row 1: amt currency should be one of USD, EUR')
    expect(
      validateFieldValue(t, [{ amt: { currency: 'EUR', value: 5 } }]).isValid,
    ).toBe(true)
    const open = table([col('amt', 'CURRENCY_AMOUNT')])
    expect(
      validateFieldValue(open, [{ amt: { currency: 'JPY', value: 5 } }])
        .isValid,
    ).toBe(true)
    expect(validateFieldValue(open, [{ amt: 12.5 }]).isValid).toBe(true)
  })

  it('totals keep using the raw numeric amount', () => {
    const t = table([
      col('amt', 'CURRENCY_AMOUNT', {
        currencyOptionsType: 'SPECIFIC',
        showColumnTotal: true,
        specificCurrencies: ['USD', 'EUR'],
      }),
    ])
    expect(
      computeTableColumnTotals(t, [
        { amt: { currency: 'USD', value: 10 } },
        { amt: 5.5 },
      ]),
    ).toEqual({ amt: 15.5 })
  })
})

describe('Batch 3: date column limits', () => {
  it('fixed range: rejects dates outside, accepts inside the range', () => {
    const t = table([
      col(
        'd',
        'DATE',
        {},
        {
          dateLimitType: 'RANGE',
          fixedEndDate: '2026-12-31',
          fixedStartDate: '2026-01-01',
        },
      ),
    ])
    expect(validateFieldValue(t, [{ d: '2025-12-31' }]).error).toBe(
      'Row 1: d should be greater than or equal to 2026-01-01',
    )
    expect(validateFieldValue(t, [{ d: '2027-01-01' }]).error).toBe(
      'Row 1: d should be lesser than or equal to 2026-12-31',
    )
    expect(validateFieldValue(t, [{ d: '2026-06-15' }]).isValid).toBe(true)
    expect(validateFieldValue(t, [{ d: '2026-01-01' }]).isValid).toBe(true)
    expect(validateFieldValue(t, [{ d: '2026-12-31' }]).isValid).toBe(true)
  })

  it('min date relative to today (no past dates) and max date (no future dates)', () => {
    const noPast = table([col('d', 'DATE', {}, { dateLimitType: 'MIN_DATE' })])
    expect(validateFieldValue(noPast, [{ d: '2000-01-01' }]).isValid).toBe(
      false,
    )
    expect(
      validateFieldValue(noPast, [
        { d: dayjs().add(3, 'day').format('YYYY-MM-DD') },
      ]).isValid,
    ).toBe(true)
    const noFuture = table([
      col('d', 'DATE', {}, { dateLimitType: 'MAX_DATE' }),
    ])
    expect(validateFieldValue(noFuture, [{ d: '2999-01-01' }]).isValid).toBe(
      false,
    )
    expect(validateFieldValue(noFuture, [{ d: '2000-01-01' }]).isValid).toBe(
      true,
    )
  })

  it('unset or NONE limits accept any date; empty cells are skipped', () => {
    expect(
      validateFieldValue(table([col('d', 'DATE')]), [{ d: '1900-01-01' }])
        .isValid,
    ).toBe(true)
    expect(
      validateFieldValue(
        table([col('d', 'DATE', {}, { dateLimitType: 'NONE' })]),
        [{ d: '2999-01-01' }],
      ).isValid,
    ).toBe(true)
    const t = table([
      col(
        'd',
        'DATE',
        {},
        { dateLimitType: 'RANGE', fixedStartDate: '2026-01-01' },
      ),
    ])
    expect(validateFieldValue(t, [{ d: '' }]).isValid).toBe(true)
  })

  it('the cell receives the same bounds the validator uses', () => {
    expect(
      getDateTimeLimits(
        col(
          'd',
          'DATE',
          {},
          {
            dateLimitType: 'RANGE',
            fixedEndDate: '2026-12-31',
            fixedStartDate: '2026-01-01',
          },
        ),
      ),
    ).toEqual({ maxDate: '2026-12-31', minDate: '2026-01-01' })
    expect(getDateTimeLimits(col('d', 'DATE'))).toEqual({})
  })
})

describe('Batch 3: time column limits', () => {
  const range = table([
    col(
      't',
      'TIME',
      {},
      {
        fixedEndTime: '17:00',
        fixedStartTime: '09:00',
        timeFormat: '24',
        timeLimitType: 'RANGE',
      },
    ),
  ])

  it('fixed range: rejects times outside, accepts inside (with or without seconds)', () => {
    expect(validateFieldValue(range, [{ t: '08:30' }]).error).toBe(
      'Row 1: t should be at or after 09:00',
    )
    expect(validateFieldValue(range, [{ t: '17:30:00' }]).error).toBe(
      'Row 1: t should be at or before 17:00',
    )
    expect(validateFieldValue(range, [{ t: '12:00' }]).isValid).toBe(true)
    expect(validateFieldValue(range, [{ t: '09:00:00' }]).isValid).toBe(true)
    expect(validateFieldValue(range, [{ t: '17:00' }]).isValid).toBe(true)
  })

  it('unset limits accept any time', () => {
    const t = table([col('t', 'TIME')])
    expect(validateFieldValue(t, [{ t: '03:15' }]).isValid).toBe(true)
  })
})

describe('Batch 3: schema save / reload', () => {
  it('keeps currency, date and time settings through load and save', () => {
    const raw = {
      panels: [
        {
          fields: [
            table([
              col('amt', 'CURRENCY_AMOUNT', {
                currencyOptionsType: 'SPECIFIC',
                defaultCurrency: 'USD',
                specificCurrencies: ['USD', 'EUR'],
              }),
              col(
                'd',
                'DATE',
                {},
                {
                  dateLimitType: 'RANGE',
                  fixedEndDate: '2026-12-31',
                  fixedStartDate: '2026-01-01',
                },
              ),
              col(
                't',
                'TIME',
                {},
                {
                  fixedEndTime: '17:00',
                  fixedStartTime: '09:00',
                  timeFormat: '24',
                  timeLimitType: 'RANGE',
                },
              ),
            ]),
          ],
          id: 'p1',
        },
      ],
    }
    const saved = serializeFormPayload(normalizeV5FormJson(raw))
    const [amt, d, t] = saved.panels[0].fields[0].settings.specific.tableColumns
    expect(amt.settings.specific).toMatchObject({
      currencyOptionsType: 'SPECIFIC',
      defaultCurrency: 'USD',
      specificCurrencies: ['USD', 'EUR'],
    })
    expect(d.settings.validation).toMatchObject({
      dateLimitType: 'RANGE',
      fixedEndDate: '2026-12-31',
      fixedStartDate: '2026-01-01',
    })
    expect(t.settings.validation).toMatchObject({
      fixedEndTime: '17:00',
      fixedStartTime: '09:00',
      timeFormat: '24',
      timeLimitType: 'RANGE',
    })
  })
})
