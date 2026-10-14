import { afterEach, describe, expect, it } from 'vitest'
import { buildInitialFormModel } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import authUserStore from '@/stores/authUserStore'
import { validateFieldValue } from './runtimeValidation'
import {
  buildTableRowDefaults,
  isDefaultOnlyRow,
  resolveTableColumnDefault,
} from './tableColumnDefaults'
import {
  applyScannedValue,
  getColumnOptionsSource,
  getColumnPredefinedType,
  selectColumnCellOptions,
  toStoredOptionValue,
} from './tableColumnOptions'
import { getSessionTableUser } from './tableColumnUser'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
  lookupSettings: Record<string, unknown> = {},
) => ({
  id,
  label: id,
  name: id,
  type,
  settings: { lookupSettings, specific, validation },
})

const opts = (...names: string[]) => names.map((n) => ({ id: n, name: n }))

const user = { email: 'a@x.com', firstName: 'Asha', name: 'Asha Rao' }

const table = (columns: unknown[]) => ({
  id: 'f_tbl',
  label: 'Items',
  type: 'TABLE',
  settings: { specific: { tableColumns: columns } },
})

afterEach(() => authUserStore.setState({ session: null }))

describe('Fill Value: logged-in user details', () => {
  const email = col('c', 'SINGLE_SELECT', { defaultValueType: 'USER_EMAIL' })
  const first = col('f', 'SINGLE_SELECT', {
    defaultValueType: 'USER_FIRST_NAME',
  })
  const full = col('n', 'SINGLE_SELECT', { defaultValueType: 'USER_NAME' })

  it('resolves email, first name and full name', () => {
    expect(resolveTableColumnDefault(email, [], user)).toBe('a@x.com')
    expect(resolveTableColumnDefault(first, [], user)).toBe('Asha')
    expect(resolveTableColumnDefault(full, [], user)).toBe('Asha Rao')
  })

  it('a plain email string still works (older callers)', () => {
    expect(resolveTableColumnDefault(email, [], 'old@x.com')).toBe('old@x.com')
    expect(resolveTableColumnDefault(first, [], 'old@x.com')).toBe('')
  })

  it('new rows get the value; an empty value is left out', () => {
    expect(buildTableRowDefaults([first, full], [], user)).toEqual({
      f: 'Asha',
      n: 'Asha Rao',
    })
    expect(
      buildTableRowDefaults([first], [], {
        email: '',
        firstName: '',
        name: '',
      }),
    ).toEqual({})
  })

  it('a row holding only the filled value counts as untouched', () => {
    expect(isDefaultOnlyRow({ f: 'Asha' }, [first], user)).toBe(true)
    expect(isDefaultOnlyRow({ f: 'Other' }, [first], user)).toBe(false)
  })

  it('reads the signed-in user, and the new-form first row uses it', () => {
    authUserStore.setState({
      session: {
        email: 'me@x.com',
        firstName: 'Mira',
        lastName: 'Das',
      } as never,
    })
    expect(getSessionTableUser()).toEqual({
      email: 'me@x.com',
      firstName: 'Mira',
      name: 'Mira Das',
    })
    const model = buildInitialFormModel([
      { fields: [table([first, full])], id: 'p1' },
    ])
    expect(model.f_tbl).toEqual([{ f: 'Mira', n: 'Mira Das' }])
  })

  it('no session gives empty details and no defaults', () => {
    expect(getSessionTableUser()).toEqual({
      email: '',
      firstName: '',
      name: '',
    })
  })
})

describe('Read Values From QR / Allow Users To Add New Options', () => {
  const list = opts('Acme', 'Beta Corp')

  it('a scanned code picks the matching option (id or label, any case)', () => {
    const s = { allowNew: false, multi: false }
    expect(applyScannedValue(list, '', 'acme', s)).toBe('Acme')
    expect(applyScannedValue(list, '', ' BETA CORP ', s)).toBe('Beta Corp')
  })

  it('an unknown code is ignored unless new options are allowed', () => {
    expect(
      applyScannedValue(list, 'Acme', 'ZZZ', { allowNew: false, multi: false }),
    ).toBe('Acme')
    expect(
      applyScannedValue(list, 'Acme', 'ZZZ', { allowNew: true, multi: false }),
    ).toBe('ZZZ')
  })

  it('multi columns append once and keep earlier picks', () => {
    const s = { allowNew: true, multi: true }
    expect(applyScannedValue(list, ['Acme'], 'beta corp', s)).toEqual([
      'Acme',
      'Beta Corp',
    ])
    expect(applyScannedValue(list, ['Acme'], 'acme', s)).toEqual(['Acme'])
    expect(applyScannedValue(list, undefined, 'New', s)).toEqual(['New'])
  })

  it('a blank scan changes nothing', () => {
    expect(
      applyScannedValue(list, 'Acme', '   ', { allowNew: true, multi: false }),
    ).toBe('Acme')
  })

  it('stores listed options by id and typed-in options by their text', () => {
    expect(toStoredOptionValue({ id: 'Acme', name: 'Acme' }, list)).toBe('Acme')
    // a created option arrives with a generated numeric id
    expect(
      toStoredOptionValue(
        { id: 1760000000000, name: 'Gamma', value: 'Gamma' },
        list,
      ),
    ).toBe('Gamma')
    expect(toStoredOptionValue({ id: 5, name: 'Delta' }, list)).toBe('Delta')
  })
})

describe('Predefined list source', () => {
  it('older columns are unaffected; PREDEFINED is recognised', () => {
    expect(getColumnOptionsSource(col('c', 'SINGLE_SELECT'))).toBe('LOOKUP')
    expect(
      getColumnOptionsSource(
        col('c', 'SINGLE_SELECT', {}, {}, { optionsSource: 'PREDEFINED' }),
      ),
    ).toBe('PREDEFINED')
  })

  it('predefined type defaults to users', () => {
    expect(getColumnPredefinedType(col('c', 'SINGLE_SELECT'))).toBe('USER')
    expect(
      getColumnPredefinedType(
        col('c', 'SINGLE_SELECT', { predefinedType: 'FOLDER' }),
      ),
    ).toBe('FOLDER')
  })

  it('serves the options resolved for the column, empty until loaded', () => {
    const c = col('c', 'SINGLE_SELECT', {}, {}, { optionsSource: 'PREDEFINED' })
    expect(
      selectColumnCellOptions(
        c,
        {},
        { predefinedByColumn: { c: opts('Docs') } },
      ),
    ).toEqual(opts('Docs'))
    expect(selectColumnCellOptions(c, {}, {})).toEqual([])
  })
})

describe('Choice column content rule (Alpha / Integer)', () => {
  const tbl = (rule: string, type = 'SINGLE_SELECT') =>
    table([col('c', type, {}, { contentRule: rule }), col('n', 'SHORT_TEXT')])

  it('Alpha rejects non-letter values and accepts letters', () => {
    expect(
      validateFieldValue(tbl('ALPHA'), [{ c: 'Acme1', n: 'x' }]).error,
    ).toBe('Row 1: c should contain only letters')
    expect(
      validateFieldValue(tbl('ALPHA'), [{ c: 'Acme', n: 'x' }]).isValid,
    ).toBe(true)
  })

  it('Integer rejects decimals and text, accepts whole numbers', () => {
    expect(
      validateFieldValue(tbl('INTEGER'), [{ c: '1.5', n: 'x' }]).error,
    ).toBe('Row 1: c should be a number without decimals')
    expect(
      validateFieldValue(tbl('INTEGER'), [{ c: '12', n: 'x' }]).isValid,
    ).toBe(true)
  })

  it('multi-value columns check every selected value', () => {
    const multi = tbl('INTEGER', 'MULTI_SELECT')
    expect(validateFieldValue(multi, [{ c: ['1', 'x'], n: 'x' }]).isValid).toBe(
      false,
    )
    expect(validateFieldValue(multi, [{ c: ['1', '2'], n: 'x' }]).isValid).toBe(
      true,
    )
  })

  it('no rule means no check (legacy behaviour)', () => {
    expect(
      validateFieldValue(tbl(''), [{ c: 'Acme 1.5!', n: 'x' }]).isValid,
    ).toBe(true)
  })
})

describe('Schema save / reload of the choice settings', () => {
  it('keeps every new setting; plain choice columns are unchanged', () => {
    const [full, plain] = serializeFormPayload(
      normalizeV5FormJson({
        panels: [
          {
            fields: [
              table([
                col(
                  'c',
                  'SINGLE_SELECT',
                  {
                    allowToAddNewOptions: true,
                    defaultValueType: 'USER_FIRST_NAME',
                    isSameMaster: true,
                    predefinedType: 'FOLDER',
                    qrValue: true,
                    yearType: 'FINANCIAL_YEAR',
                  },
                  { contentRule: 'ALPHA' },
                  { optionsSource: 'PREDEFINED' },
                ),
                col('d', 'SINGLE_SELECT'),
              ]),
            ],
            id: 'p1',
          },
        ],
      }),
    ).panels[0].fields[0].settings.specific.tableColumns
    expect(full.settings.specific).toMatchObject({
      allowToAddNewOptions: true,
      defaultValueType: 'USER_FIRST_NAME',
      isSameMaster: true,
      predefinedType: 'FOLDER',
      qrValue: true,
      yearType: 'FINANCIAL_YEAR',
    })
    expect(full.settings.validation.contentRule).toBe('ALPHA')
    expect(full.settings.lookupSettings.optionsSource).toBe('PREDEFINED')
    expect(plain.settings.specific.allowToAddNewOptions).toBeUndefined()
    expect(plain.settings.specific.qrValue).toBeUndefined()
  })
})
