import { describe, expect, it } from 'vitest'
import {
  ensureSelectedOptions,
  extractFormFieldChoices,
  getColumnMasterConfig,
  getColumnOptionsSource,
  parseColumnOptionList,
  parseColumnOptions,
  buildYearOptions,
  selectColumnCellOptions,
} from './tableColumnOptions'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const col = (
  id: string,
  specific: Record<string, unknown> = {},
  lookupSettings: Record<string, unknown> = {},
) => ({
  id,
  name: id,
  type: 'SINGLE_SELECT',
  settings: { lookupSettings, specific },
})

const opts = (...names: string[]) => names.map((n) => ({ id: n, name: n }))

describe('Batch 4: static options and delimiter', () => {
  it('comma is the default and unchanged', () => {
    expect(parseColumnOptionList('A, B ,, C')).toEqual(opts('A', 'B', 'C'))
    expect(
      parseColumnOptions(col('c', { customOptions: 'Red,Green' })),
    ).toEqual(opts('Red', 'Green'))
    expect(parseColumnOptionList('')).toEqual([])
    expect(parseColumnOptionList(undefined)).toEqual([])
  })

  it('NEWLINE keeps commas inside an option and ignores blank lines', () => {
    expect(
      parseColumnOptionList('Acme, Inc.\n\nBeta, LLC\r\nGamma', 'NEWLINE'),
    ).toEqual(opts('Acme, Inc.', 'Beta, LLC', 'Gamma'))
    expect(
      parseColumnOptions(
        col('c', {
          customOptions: 'One, uno\nTwo',
          separateOptionsUsing: 'NEWLINE',
        }),
      ),
    ).toEqual(opts('One, uno', 'Two'))
  })

  it('an explicit COMMA behaves like the default; labels equal stored values', () => {
    expect(parseColumnOptionList('X\nY, Z', 'COMMA')).toEqual(opts('X\nY', 'Z'))
  })
})

describe('Batch 4: option source selection', () => {
  it('older columns (no optionsSource) are LOOKUP', () => {
    expect(getColumnOptionsSource(col('c'))).toBe('LOOKUP')
    expect(
      getColumnOptionsSource(col('c', {}, { optionsSource: 'bogus' })),
    ).toBe('LOOKUP')
    expect(getColumnOptionsSource(col('c', {}, { optionsSource: 'API' }))).toBe(
      'API',
    )
    expect(
      getColumnOptionsSource(col('c', {}, { optionsSource: 'MASTER' })),
    ).toBe('MASTER')
  })

  it('master config needs the MASTER source, a form and a column', () => {
    const master = col(
      'c',
      { masterFormColumn: 'Name', masterFormId: '12', showAllData: true },
      { optionsSource: 'MASTER' },
    )
    expect(getColumnMasterConfig(master)).toEqual({
      masterFormColumn: 'Name',
      masterFormId: '12',
      showAllData: true,
    })
    expect(
      getColumnMasterConfig(
        col('c', { masterFormId: '12' }, { optionsSource: 'MASTER' }),
      ),
    ).toBeNull()
    // stale master keys on a non-master column are ignored
    expect(
      getColumnMasterConfig(
        col('c', { masterFormColumn: 'Name', masterFormId: '12' }),
      ),
    ).toBeNull()
  })

  it('static column with no dynamic source: undefined so the static list is used', () => {
    expect(selectColumnCellOptions(col('c'), {}, {})).toBeUndefined()
  })

  it('repository lookup, plain and cascaded (existing behaviour preserved)', () => {
    const plain = col('c', {}, { repositoryId: 'r1' })
    expect(
      selectColumnCellOptions(
        plain,
        {},
        { repositoryByColumn: { c: opts('A') } },
      ),
    ).toEqual(opts('A'))
    expect(selectColumnCellOptions(plain, {}, {})).toBeUndefined()

    const cascaded = col(
      'c',
      {},
      { cascadeFromColumn: 'p', repositoryId: 'r1' },
    )
    const sources = { repositoryCascaded: { c: { X: opts('X1', 'X2') } } }
    expect(selectColumnCellOptions(cascaded, { p: 'X' }, sources)).toEqual(
      opts('X1', 'X2'),
    )
    expect(selectColumnCellOptions(cascaded, { p: '' }, sources)).toEqual([])
    expect(selectColumnCellOptions(cascaded, { p: 'Z' }, sources)).toEqual([])
  })

  it('master table source, plain and cascaded', () => {
    const base = { masterFormColumn: 'Name', masterFormId: '12' }
    const plain = col('c', base, { optionsSource: 'MASTER' })
    expect(
      selectColumnCellOptions(plain, {}, { masterByColumn: { c: opts('M') } }),
    ).toEqual(opts('M'))
    // not loaded yet: empty, never the static list
    expect(selectColumnCellOptions(plain, {}, {})).toEqual([])

    const cascaded = col('c', base, {
      cascadeFromColumn: 'p',
      optionsSource: 'MASTER',
    })
    const sources = { masterCascaded: { c: { East: opts('E1') } } }
    expect(selectColumnCellOptions(cascaded, { p: 'East' }, sources)).toEqual(
      opts('E1'),
    )
    expect(selectColumnCellOptions(cascaded, { p: null }, sources)).toEqual([])
  })

  it('incomplete master config falls back to the static list', () => {
    expect(
      selectColumnCellOptions(
        col('c', {}, { optionsSource: 'MASTER' }),
        {},
        {},
      ),
    ).toBeUndefined()
  })

  it('user list source', () => {
    const users = col('c', {}, { optionsSource: 'USER_LIST' })
    expect(
      selectColumnCellOptions(users, {}, { userList: opts('a@x.com') }),
    ).toEqual(opts('a@x.com'))
    expect(selectColumnCellOptions(users, {}, {})).toEqual([])
  })

  it('API source is handled by its own picker, so no option list is selected', () => {
    expect(
      selectColumnCellOptions(col('c', {}, { optionsSource: 'API' }), {}, {}),
    ).toBeUndefined()
  })
})

describe('Batch 4: saved selections survive option changes', () => {
  it('adds a saved value missing from the options, without duplicating', () => {
    expect(ensureSelectedOptions(opts('A', 'B'), 'C')).toEqual(
      opts('A', 'B', 'C'),
    )
    expect(ensureSelectedOptions(opts('A', 'B'), ['B', 'D'])).toEqual(
      opts('A', 'B', 'D'),
    )
    expect(ensureSelectedOptions([], 'Saved')).toEqual(opts('Saved'))
  })

  it('leaves the list untouched for empty or matching values', () => {
    const list = opts('A', 'B')
    expect(ensureSelectedOptions(list, 'A')).toBe(list)
    expect(ensureSelectedOptions(list, '')).toBe(list)
    expect(ensureSelectedOptions(list, null)).toBe(list)
    expect(ensureSelectedOptions(list, undefined)).toBe(list)
    expect(ensureSelectedOptions(list, [])).toBe(list)
  })
})

describe('Batch 4: master form field list', () => {
  it('reads fields from a form definition (object or JSON string)', () => {
    const def = {
      panels: [{ fields: [{ id: 'f1', label: 'Name' }, { id: 'f2' }] }],
    }
    const expected = [
      { id: 'f1', name: 'Name' },
      { id: 'f2', name: 'f2' },
    ]
    expect(extractFormFieldChoices({ formJson: def })).toEqual(expected)
    expect(extractFormFieldChoices({ formJson: JSON.stringify(def) })).toEqual(
      expected,
    )
    expect(extractFormFieldChoices(null)).toEqual([])
    expect(extractFormFieldChoices({ formJson: '{bad' })).toEqual([])
  })
})

describe('Batch 4: schema save / reload', () => {
  const roundTrip = (columns: unknown[]) => {
    const raw = {
      panels: [
        {
          fields: [
            {
              id: 'f_tbl',
              label: 'Items',
              type: 'TABLE',
              settings: { specific: { tableColumns: columns } },
            },
          ],
          id: 'p1',
        },
      ],
    }
    return serializeFormPayload(normalizeV5FormJson(raw)).panels[0].fields[0]
      .settings.specific.tableColumns
  }

  it('keeps delimiter, master source, user list and cascade settings', () => {
    const [master, users, staticCol] = roundTrip([
      col(
        'm',
        {
          customOptions: 'a\nb',
          masterFormColumn: 'Name',
          masterFormId: '12',
          separateOptionsUsing: 'NEWLINE',
          showAllData: true,
        },
        { cascadeFromColumn: 'p', optionsSource: 'MASTER' },
      ),
      col('u', {}, { optionsSource: 'USER_LIST' }),
      col('s', { customOptions: 'x, y' }),
    ])
    expect(master.settings.specific).toMatchObject({
      customOptions: 'a\nb',
      masterFormColumn: 'Name',
      masterFormId: '12',
      separateOptionsUsing: 'NEWLINE',
      showAllData: true,
    })
    expect(master.settings.lookupSettings).toMatchObject({
      cascadeFromColumn: 'p',
      optionsSource: 'MASTER',
    })
    expect(users.settings.lookupSettings.optionsSource).toBe('USER_LIST')
    // a plain static column is unchanged and has no delimiter or source forced on it
    expect(staticCol.settings.specific.customOptions).toBe('x, y')
    expect(staticCol.settings.specific.separateOptionsUsing).toBeUndefined()
    expect(staticCol.settings.lookupSettings.optionsSource).toBeUndefined()
    expect(parseColumnOptions(staticCol)).toEqual(opts('x', 'y'))
  })
})

describe('Year-Based choice columns', () => {
  const now = new Date(2026, 5, 1)

  it('lists calendar years newest first', () => {
    const years = buildYearOptions('CALENDER_YEAR', now)
    expect(years[0].name).toBe('2027')
    expect(years[1].name).toBe('2026')
    expect(years.at(-1)?.name).toBe('2016')
    expect(years).toHaveLength(12)
  })

  it('lists financial years as start-end', () => {
    expect(buildYearOptions('FINANCIAL_YEAR', now)[1]).toEqual({
      id: '2026-2027',
      name: '2026-2027',
    })
  })

  it('replaces a choice column’s options but ignores other types', () => {
    const settings = { specific: { yearType: 'CALENDER_YEAR' } }
    expect(
      selectColumnCellOptions({ settings, type: 'SINGLE_SELECT' }, {}, {}),
    ).toHaveLength(12)
    expect(
      selectColumnCellOptions({ settings, type: 'SHORT_TEXT' }, {}, {}),
    ).toBeUndefined()
  })
})
