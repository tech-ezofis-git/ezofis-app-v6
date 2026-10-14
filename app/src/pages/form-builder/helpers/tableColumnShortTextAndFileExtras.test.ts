import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTextFillableColumn } from './tableColumnFiles'
import {
  addressPartValue,
  buildAddressPatch,
  fetchAddressSuggestions,
  formatAddressSuggestion,
  getAddressMatchingRows,
  isAddressColumn,
  isQrColumn,
  setAddressTargets,
} from './tableColumnShortText'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
  aiSettings: Record<string, unknown> = {},
) => ({
  id,
  label: id,
  name: id,
  type,
  settings: { aiSettings, specific, validation },
})

const feature = {
  properties: {
    city: 'Chennai',
    country: 'India',
    name: 'Anna Salai',
    postcode: '600002',
    state: 'Tamil Nadu',
  },
}

afterEach(() => vi.unstubAllGlobals())

describe('Short Text column: QR and address flags', () => {
  it('only SHORT_TEXT columns with the flag on enable each feature', () => {
    expect(isQrColumn(col('a', 'SHORT_TEXT', { qrValue: true }))).toBe(true)
    expect(isQrColumn(col('a', 'SHORT_TEXT', { qrValue: false }))).toBe(false)
    expect(isQrColumn(col('a', 'SHORT_TEXT'))).toBe(false)
    expect(isQrColumn(col('a', 'LONG_TEXT', { qrValue: true }))).toBe(false)
    expect(
      isAddressColumn(col('a', 'SHORT_TEXT', { isAddressField: true })),
    ).toBe(true)
    expect(isAddressColumn(col('a', 'SHORT_TEXT'))).toBe(false)
    expect(isAddressColumn(col('a', 'NUMBER', { isAddressField: true }))).toBe(
      false,
    )
  })

  it('text-capable columns exclude calculated, label, serial and file columns', () => {
    expect(isTextFillableColumn(col('a', 'SHORT_TEXT'))).toBe(true)
    expect(isTextFillableColumn(col('a', 'NUMBER'))).toBe(true)
    for (const type of [
      'CALCULATED',
      'LABEL',
      'SERIAL_NUMBER',
      'FILE_UPLOAD',
      'IMAGE',
    ]) {
      expect(isTextFillableColumn(col('a', type))).toBe(false)
    }
  })
})

describe('Short Text column: address pieces', () => {
  it('maps a Photon result to city / state / country / postal code', () => {
    expect(addressPartValue(feature.properties, 'CITY')).toBe('Chennai')
    expect(addressPartValue({ county: 'Kent' }, 'CITY')).toBe('Kent')
    expect(addressPartValue(feature.properties, 'STATE')).toBe('Tamil Nadu')
    expect(addressPartValue(feature.properties, 'COUNTRY')).toBe('India')
    expect(addressPartValue(feature.properties, 'POSTALCODE')).toBe('600002')
    expect(addressPartValue(feature.properties, 'OTHER')).toBe('')
    expect(addressPartValue(undefined, 'CITY')).toBe('')
  })

  const address = col('addr', 'SHORT_TEXT', {
    addressMatchingFields: [
      { addressColumn: 'CITY', id: '1', selectFieldColumn: ['city', 'ghost'] },
      { addressColumn: 'STATE', id: '2', selectFieldColumn: ['state'] },
      {
        addressColumn: 'COUNTRY',
        id: '3',
        selectFieldColumn: ['calc', 'addr'],
      },
      { addressColumn: 'POSTALCODE', id: '4', selectFieldColumn: [] },
    ],
    isAddressField: true,
  })
  const siblings = [
    col('city', 'SHORT_TEXT'),
    col('state', 'SHORT_TEXT'),
    col('calc', 'CALCULATED'),
    address,
  ]

  it('fills only the chosen, existing, text-capable sibling columns', () => {
    expect(buildAddressPatch(address, siblings, feature)).toEqual({
      city: 'Chennai',
      state: 'Tamil Nadu',
    })
  })

  it('skips pieces the result does not contain, and works without any mapping', () => {
    expect(
      buildAddressPatch(address, siblings, { properties: { city: 'X' } }),
    ).toEqual({ city: 'X' })
    expect(
      buildAddressPatch(col('a', 'SHORT_TEXT'), siblings, feature),
    ).toEqual({})
    expect(buildAddressPatch(address, siblings, undefined)).toEqual({})
  })

  it('reads mapping rows defensively', () => {
    expect(getAddressMatchingRows(col('a', 'SHORT_TEXT'))).toEqual([])
    expect(
      getAddressMatchingRows(
        col('a', 'SHORT_TEXT', {
          addressMatchingFields: [null, { addressColumn: 'CITY' }, { foo: 1 }],
        }),
      ),
    ).toEqual([{ addressColumn: 'CITY', id: 'CITY', selectFieldColumn: [] }])
  })

  it('builder helper adds, replaces and drops a piece and keeps a stable order', () => {
    const start = col('a', 'SHORT_TEXT')
    const withState = setAddressTargets(start, 'STATE', ['s1'])
    expect(withState.map((r) => r.addressColumn)).toEqual(['STATE'])
    const both = setAddressTargets(
      col('a', 'SHORT_TEXT', { addressMatchingFields: withState }),
      'CITY',
      ['c1'],
    )
    expect(both.map((r) => r.addressColumn)).toEqual(['CITY', 'STATE'])
    const replaced = setAddressTargets(
      col('a', 'SHORT_TEXT', { addressMatchingFields: both }),
      'CITY',
      ['c2', 'c3'],
    )
    expect(replaced[0].selectFieldColumn).toEqual(['c2', 'c3'])
    const dropped = setAddressTargets(
      col('a', 'SHORT_TEXT', { addressMatchingFields: both }),
      'STATE',
      [],
    )
    expect(dropped.map((r) => r.addressColumn)).toEqual(['CITY'])
  })

  it('formats suggestions like the top-level field and searches Photon', async () => {
    expect(formatAddressSuggestion(feature).label).toBe(
      'Anna Salai, Chennai, Tamil Nadu, India',
    )
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ features: [feature] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchAddressSuggestions('anna salai')
    expect(result).toHaveLength(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://photon.komoot.io/api/?q=anna%20salai&limit=5',
    )
  })
})

describe('Schema save / reload of the new column settings', () => {
  const roundTrip = (columns: unknown[]) =>
    serializeFormPayload(
      normalizeV5FormJson({
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
      }),
    ).panels[0].fields[0].settings.specific.tableColumns

  it('keeps file-column extras, AI settings and remaps their column references', () => {
    const [date, text, upload] = roundTrip([
      col('expiry', 'DATE'),
      col('note', 'SHORT_TEXT'),
      col(
        'upload',
        'FILE_UPLOAD',
        { fileInStageOnly: true },
        {
          answerIndicator: 'YES',
          expiryFieldId: 'expiry',
          verificationRequired: true,
        },
        {
          fileDataValidate: ['PREDEFINED_DATE', 'DOCUMENT_TYPE'],
          formControlValidate: {
            existingFormFields: ['note'],
            masterFormColumn: [],
            masterFormId: 0,
            optionsType: 'EXISTING',
          },
          imageFileValidate: { formFields: ['note'], optionsType: 'DATA' },
          validateTypeKeyword: 'Invoice',
        },
      ),
    ])
    expect(upload.settings.specific.fileInStageOnly).toBe(true)
    expect(upload.settings.validation).toMatchObject({
      answerIndicator: 'YES',
      expiryFieldId: date.id,
      verificationRequired: true,
    })
    // the V5 name of the same setting stays in sync
    expect(upload.settings.validation.documentExpiryField).toBe(date.id)
    expect(upload.settings.aiSettings).toMatchObject({
      fileDataValidate: ['PREDEFINED_DATE', 'DOCUMENT_TYPE'],
      validateTypeKeyword: 'Invoice',
    })
    expect(upload.settings.aiSettings.formControlValidate).toMatchObject({
      existingFormFields: [text.id],
      optionsType: 'EXISTING',
    })
    expect(upload.settings.aiSettings.imageFileValidate).toMatchObject({
      formFields: [text.id],
      optionsType: 'DATA',
    })
  })

  it('keeps address and QR settings and remaps the address targets', () => {
    const [city, addr] = roundTrip([
      col('city', 'SHORT_TEXT'),
      col('addr', 'SHORT_TEXT', {
        addressMatchingFields: [
          { addressColumn: 'CITY', id: 'x', selectFieldColumn: ['city'] },
        ],
        isAddressField: true,
        qrValue: true,
      }),
    ])
    expect(addr.settings.specific.isAddressField).toBe(true)
    expect(addr.settings.specific.qrValue).toBe(true)
    expect(addr.settings.specific.addressMatchingFields[0]).toMatchObject({
      addressColumn: 'CITY',
      selectFieldColumn: [city.id],
    })
  })

  it('columns without the new settings are unchanged', () => {
    const [plain] = roundTrip([col('a', 'SHORT_TEXT')])
    expect(plain.settings.specific.isAddressField).toBeUndefined()
    expect(plain.settings.specific.qrValue).toBeUndefined()
    expect(plain.settings.specific.fileInStageOnly).toBeUndefined()
  })
})
