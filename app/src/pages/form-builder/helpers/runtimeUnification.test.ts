import { describe, expect, it } from 'vitest'
import {
  buildInitialFormModel,
  computeTableColumnTotals,
  ensureNormalizedRuntimeFormJson,
  evaluateTableRows,
  extractCurrencyCode,
  extractCurrencyNumericValue,
  extractPhoneInputString,
  formatRuntimeFieldDisplayValue,
  getEffectiveColumnLabel,
  getEffectiveFieldDescription,
  getEffectiveFieldLabel,
  getEffectiveFieldPlaceholder,
  getEffectiveFieldTooltip,
  getFieldOptions,
  getMatrixCellValue,
  getMissingMandatoryFieldsList,
  getNormalizedMatrixConfig,
  hydrateFormModel,
  isFieldFilled,
  isFieldHidden,
  isFieldLabelHidden,
  isFieldReadOnly,
  isFieldRequired,
  isStructuredCurrencyValue,
  isStructuredPhoneValue,
  resolveRuntimeFieldType,
  setMatrixCellValue,
  shouldShowTableSummaryRow,
  stringifyFieldValue,
  updateCurrencyFieldValue,
  updatePhoneFieldValue,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { applyCalculatedFields } from './formula'
import { evaluateFormRules } from './ruleEngine'

const MIGRATED_V5_FORM_FIXTURE = {
  layout: 'CLASSIC',
  panels: [
    {
      fields: [
        {
          id: 'fld_vendor',
          label: 'Vendor Name',
          settings: {
            general: {
              description: 'Primary supplier name',
              displayLabel: 'Supplier / Vendor',
              hideLabel: false,
              placeholder: 'Enter supplier name',
              size: 'col-6',
              tooltip: 'Official registered name',
              visibility: 'NORMAL',
            },
            specific: {
              customDefaultValue: 'Default Corp',
              defaultValue: 'CUSTOM',
            },
            validation: {
              fieldRule: 'REQUIRED',
            },
          },
          type: 'SHORT_TEXT',
        },
        {
          id: 'fld_website',
          label: 'Vendor Website',
          settings: {
            general: {
              visibility: 'NORMAL',
            },
            specific: {},
            validation: {
              contentRule: 'WEB',
              fieldRule: 'OPTIONAL',
            },
          },
          type: 'WEBSITE',
        },
        {
          id: 'fld_yes_no',
          label: 'Is Preferred Vendor?',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {},
            validation: { fieldRule: 'REQUIRED' },
          },
          type: 'YES_NO',
        },
        {
          id: 'fld_legal',
          label: 'Compliance Terms',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {},
            validation: { fieldRule: 'REQUIRED' },
          },
          type: 'LEGAL',
        },
        {
          id: 'fld_tax_id',
          label: 'Tax ID',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {},
            validation: {
              enableSettings: {
                conditions: [
                  {
                    condition: 'EQUAL',
                    field: 'fld_yes_no',
                    logical: 'IF',
                    type: 'VALUE',
                    value: 'Yes',
                  },
                ],
                enable: true,
              },
              fieldRule: 'OPTIONAL',
              mandatorySettings: {
                conditions: [
                  {
                    condition: 'EQUAL',
                    field: 'fld_yes_no',
                    logical: 'IF',
                    type: 'VALUE',
                    value: 'Yes',
                  },
                ],
                mandatory: true,
              },
            },
          },
          type: 'SHORT_TEXT',
        },
        {
          id: 'fld_approval_code',
          label: 'Approval Code',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {},
            validation: {
              fieldRule: 'OPTIONAL',
              readonlySettings: {
                conditions: [
                  {
                    condition: 'EQUAL',
                    field: 'fld_yes_no',
                    logical: 'IF',
                    type: 'VALUE',
                    value: 'No',
                  },
                ],
                notEqual: false,
                readonly: true,
              },
            },
          },
          type: 'SHORT_TEXT',
        },
        {
          id: 'fld_currency',
          label: 'Contract Value',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {
              defaultCurrency: 'EUR',
            },
            validation: { fieldRule: 'REQUIRED' },
          },
          type: 'CURRENCY',
        },
        {
          id: 'fld_phone',
          label: 'Support Phone',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {},
            validation: { fieldRule: 'REQUIRED' },
          },
          type: 'PHONE_NUMBER',
        },
        {
          id: 'fld_matrix',
          label: 'Vendor Evaluation Matrix',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {
              matrixColumns: [
                {
                  id: 'mcol_rating',
                  label: 'Quality Score',
                  matrixTypeSettings: {
                    options: 'Poor,Average,Excellent',
                    separateOptionsUsing: 'COMMA',
                  },
                  type: 'RADIO',
                },
                {
                  id: 'mcol_flags',
                  label: 'Certifications',
                  matrixTypeSettings: {
                    options: 'ISO9001,SOC2',
                    separateOptionsUsing: 'COMMA',
                  },
                  type: 'CHECKBOX',
                },
              ],
              matrixRows: [
                { id: 'mrow_hw', label: 'Hardware' },
                { id: 'mrow_sw', label: 'Software' },
              ],
            },
            validation: { fieldRule: 'REQUIRED' },
          },
          type: 'MATRIX',
        },
        {
          id: 'fld_table',
          label: 'Order Line Items',
          settings: {
            general: {
              displayLabel: 'Purchase Line Items',
              visibility: 'NORMAL',
            },
            specific: {
              tableColumns: [
                {
                  id: 'col_sno',
                  name: 'S.No',
                  settings: { general: { displayLabel: '#' } },
                  type: 'SERIAL_NUMBER',
                },
                {
                  id: 'col_qty',
                  name: 'Qty',
                  settings: {
                    general: { displayLabel: 'Quantity' },
                    specific: { showColumnTotal: true },
                  },
                  type: 'NUMBER',
                },
                {
                  id: 'col_price',
                  name: 'Unit Price',
                  settings: {
                    general: { displayLabel: 'Price' },
                    specific: { showColumnTotal: false },
                  },
                  type: 'CURRENCY_AMOUNT',
                },
                {
                  id: 'col_line_total',
                  name: 'Line Total',
                  settings: {
                    general: { displayLabel: 'Extended Total' },
                    specific: {
                      formulaTokens: [
                        { type: 'FIELD', value: 'col_qty' },
                        { type: 'OPERATOR', value: '*' },
                        { type: 'FIELD', value: 'col_price' },
                      ],
                      showColumnTotal: true,
                    },
                  },
                  type: 'CALCULATED',
                },
              ],
            },
            validation: {
              fieldRule: 'REQUIRED',
              hasCalculatedField: true,
            },
          },
          type: 'TABLE',
        },
        {
          id: 'fld_grand_total',
          label: 'Grand Total',
          settings: {
            general: { visibility: 'READ_ONLY' },
            specific: {
              formulaTokens: [
                { type: 'FIELD', value: 'fld_currency' },
                { type: 'OPERATOR', value: '+' },
                { type: 'FIELD', value: 'SUM OF col_line_total' },
              ],
            },
            validation: {
              fieldRule: 'OPTIONAL',
              hasCalculatedField: true,
            },
          },
          type: 'CALCULATED',
        },
        {
          id: 'fld_popup',
          label: 'Terms & Conditions Reference',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {
              popupContent: 'Standard procurement clauses apply.',
              popupTitle: 'Procurement Clauses',
            },
            validation: { fieldRule: 'OPTIONAL' },
          },
          type: 'POPUP',
        },
        {
          id: 'fld_tabs',
          label: 'Region Guidelines',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {
              tabList: [
                { content: 'EMEA compliance details', id: 'tab_1', label: 'EMEA' },
                { content: 'APAC compliance details', id: 'tab_2', label: 'APAC' },
              ],
            },
            validation: { fieldRule: 'OPTIONAL' },
          },
          type: 'TABS',
        },
        {
          id: 'fld_nested',
          label: 'Category Hierarchy',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: {
              nestedListItems: [
                { children: ['Laptops', 'Monitors'], label: 'IT Equipment' },
              ],
            },
            validation: { fieldRule: 'OPTIONAL' },
          },
          type: 'NESTED_LIST',
        },
        {
          id: 'fld_login_auth',
          label: 'Portal Verification',
          settings: {
            general: { visibility: 'NORMAL' },
            specific: { loginType: 'EMAIL_OTP' },
            validation: { fieldRule: 'OPTIONAL' },
          },
          type: 'LOGIN_AUTHENTICATION',
        },
      ],
      id: 'panel_main',
      settings: {
        description: 'Complete supplier onboarding details',
        title: 'Supplier Information',
      },
    },
  ],
  settings: {
    general: {
      name: 'V5 Supplier Onboarding Form',
    },
    rules: [
      {
        conditions: [
          {
            condition: 'EQUAL',
            field: 'fld_vendor',
            logical: 'IF',
            type: 'VALUE',
            value: 'Blocked Corp',
          },
        ],
        id: 'rule_disable_currency',
        then: [
          {
            action: 'DISABLE',
            field: 'fld_currency',
          },
        ],
      },
    ],
  },
}

describe('Phase 3: Core Field Renderers & Runtime Unification', () => {
  it('1. Normalizes migrated V5 forms and resolves field types, presets, labels, and metadata consistently across Preview, Workflow, and Entries', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    expect(normalized.panels).toHaveLength(1)
    expect(normalized.rules).toHaveLength(1)

    const fields = normalized.panels[0].fields
    const byId = Object.fromEntries(fields.map((f: any) => [f.id, f]))

    // Field type aliases & presets
    expect(resolveRuntimeFieldType(byId.fld_vendor)).toBe('SHORT_TEXT')
    expect(resolveRuntimeFieldType(byId.fld_website)).toBe('URL')
    expect(resolveRuntimeFieldType(byId.fld_yes_no)).toBe('SINGLE_CHOICE')
    expect(resolveRuntimeFieldType(byId.fld_legal)).toBe('MULTIPLE_CHOICE')
    expect(resolveRuntimeFieldType(byId.fld_currency)).toBe('CURRENCY_AMOUNT')
    expect(resolveRuntimeFieldType(byId.fld_phone)).toBe('PHONE_NUMBER')
    expect(resolveRuntimeFieldType(byId.fld_matrix)).toBe('MATRIX')
    expect(resolveRuntimeFieldType(byId.fld_table)).toBe('TABLE')
    expect(resolveRuntimeFieldType({ type: 'LINE_ITEM' })).toBe('TABLE')
    expect(resolveRuntimeFieldType({ type: 'DROPDOWN' })).toBe('SINGLE_SELECT')
    expect(resolveRuntimeFieldType({ type: 'CHECKBOX' })).toBe('MULTIPLE_CHOICE')
    expect(resolveRuntimeFieldType({ type: 'RADIO' })).toBe('SINGLE_CHOICE')
    expect(resolveRuntimeFieldType({ type: 'BOOLEAN' })).toBe('YES_NO_TOGGLE')
    expect(resolveRuntimeFieldType({ type: 'IMAGE' })).toBe('IMAGE_UPLOAD')

    // Effective label, description, placeholder, tooltip, hideLabel
    expect(getEffectiveFieldLabel(byId.fld_vendor)).toBe('Supplier / Vendor')
    expect(getEffectiveFieldDescription(byId.fld_vendor)).toBe(
      'Primary supplier name',
    )
    expect(getEffectiveFieldPlaceholder(byId.fld_vendor)).toBe(
      'Enter supplier name',
    )
    expect(getEffectiveFieldTooltip(byId.fld_vendor)).toBe(
      'Official registered name',
    )
    expect(isFieldLabelHidden(byId.fld_vendor)).toBe(false)

    // Preset options for YES_NO and LEGAL
    expect(getFieldOptions(byId.fld_yes_no).map((o) => o.id)).toEqual([
      'Yes',
      'No',
    ])
    expect(getFieldOptions(byId.fld_legal).map((o) => o.id)).toEqual([
      'I accept the Terms of Service',
    ])
  })

  it('2. Evaluates required, hidden, read-only, and disabled field states driven by static settings and dynamic rules consistently', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    const { panels, rules } = normalized
    const fields = panels[0].fields
    const byId = Object.fromEntries(fields.map((f: any) => [f.id, f]))

    // Static states
    expect(isFieldRequired(byId.fld_vendor)).toBe(true)
    expect(isFieldReadOnly(byId.fld_grand_total)).toBe(true)
    expect(
      isFieldReadOnly({
        settings: { general: { visibility: 'DISABLE' } },
      }),
    ).toBe(true)
    expect(
      isFieldHidden({
        settings: { general: { visibility: 'HIDDEN' } },
      }),
    ).toBe(true)

    // Initial rule evaluation when fld_yes_no is empty
    const stateInitial = evaluateFormRules(panels, {}, rules)
    expect(stateInitial.fld_tax_id.visible).toBe(false)
    expect(stateInitial.fld_tax_id.required).toBe(false)
    expect(stateInitial.fld_approval_code.disabled).toBe(false)
    expect(stateInitial.fld_currency.disabled).toBe(false)

    // When fld_yes_no = 'Yes', fld_tax_id becomes visible AND mandatory
    const modelYes = { fld_yes_no: 'Yes' }
    const stateYes = evaluateFormRules(panels, modelYes, rules)
    expect(stateYes.fld_tax_id.visible).toBe(true)
    expect(stateYes.fld_tax_id.required).toBe(true)

    const missingWhenYes = getMissingMandatoryFieldsList(
      [],
      panels,
      modelYes,
      { formRules: rules },
    )
    expect(missingWhenYes.some((m) => m.id === 'fld_tax_id')).toBe(true)

    // When fld_yes_no = 'No' and fld_vendor = 'Blocked Corp', fld_approval_code and fld_currency become disabled
    const modelNo = {
      fld_vendor: 'Blocked Corp',
      fld_yes_no: 'No',
    }
    const stateNo = evaluateFormRules(panels, modelNo, rules)
    expect(stateNo.fld_tax_id.visible).toBe(false)
    expect(stateNo.fld_approval_code.disabled).toBe(true)
    expect(stateNo.fld_currency.disabled).toBe(true)

    // Disabled fields are excluded from missing mandatory check
    const missingWhenDisabled = getMissingMandatoryFieldsList(
      [],
      panels,
      modelNo,
      { formRules: rules },
    )
    expect(missingWhenDisabled.some((m) => m.id === 'fld_currency')).toBe(false)
  })

  it('3. Updates calculated fields when referenced scalar fields or table columns change', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    const { panels, rules } = normalized

    const model1 = applyCalculatedFields(
      panels,
      {
        fld_currency: { currency: 'EUR', value: 1000 },
        fld_table: [
          { col_price: { currency: 'EUR', value: 50 }, col_qty: 2 },
          { col_price: { currency: 'EUR', value: 25 }, col_qty: 4 },
        ],
      },
      rules,
    )

    // Row 1: 2 * 50 = 100; Row 2: 4 * 25 = 100; SUM = 200; Grand Total = 1000 + 200 = 1200
    const table1 = model1.fld_table as any[]
    expect(Number(table1[0].col_line_total)).toBe(100)
    expect(Number(table1[1].col_line_total)).toBe(100)
    expect(Number(model1.fld_grand_total)).toBe(1200)

    // Update row quantity and currency value
    const model2 = applyCalculatedFields(
      panels,
      {
        ...model1,
        fld_currency: { currency: 'EUR', value: 500 },
        fld_table: [
          { col_price: { currency: 'EUR', value: 50 }, col_qty: 3 },
          { col_price: { currency: 'EUR', value: 25 }, col_qty: 4 },
        ],
      },
      rules,
    )
    const table2 = model2.fld_table as any[]
    expect(Number(table2[0].col_line_total)).toBe(150)
    expect(Number(model2.fld_grand_total)).toBe(750)
  })

  it('4. Handles table row additions, deletions, row calculations, column labels, and V5/V6 column totals', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    const tableField = normalized.panels[0].fields.find(
      (f: any) => f.id === 'fld_table',
    )!
    const cols = tableField.settings.specific.tableColumns

    // Column displayLabel priority
    expect(getEffectiveColumnLabel(cols[0])).toBe('#')
    expect(getEffectiveColumnLabel(cols[1])).toBe('Quantity')
    expect(getEffectiveColumnLabel(cols[2])).toBe('Price')
    expect(getEffectiveColumnLabel(cols[3])).toBe('Extended Total')

    // V5 table has showColumnTotal on col_qty and col_line_total (without table-level showSummaryRow)
    expect(shouldShowTableSummaryRow(tableField, cols)).toBe(true)

    // Add rows and evaluate
    const initialRows = [
      { _rowId: 'r1', col_price: { currency: 'USD', value: 12.5 }, col_qty: 4 },
      { _rowId: 'r2', col_price: 10, col_qty: 3 },
    ]
    const evaluatedAfterAdd = evaluateTableRows(tableField, initialRows)
    expect(evaluatedAfterAdd[0].col_line_total).toBe(50)
    expect(evaluatedAfterAdd[1].col_line_total).toBe(30)

    const totalsAfterAdd = computeTableColumnTotals(
      tableField,
      evaluatedAfterAdd,
      cols,
    )
    expect(totalsAfterAdd.col_qty).toBe(7)
    expect(totalsAfterAdd.col_line_total).toBe(80)
    // col_price has showColumnTotal: false
    expect(totalsAfterAdd.col_price).toBeUndefined()

    // Delete first row and re-evaluate
    const remainingRows = evaluatedAfterAdd.slice(1)
    const evaluatedAfterDelete = evaluateTableRows(tableField, remainingRows)
    const totalsAfterDelete = computeTableColumnTotals(
      tableField,
      evaluatedAfterDelete,
      cols,
    )
    expect(totalsAfterDelete.col_qty).toBe(3)
    expect(totalsAfterDelete.col_line_total).toBe(30)
  })

  it('5. Supports currency field rendering, editing, validation, and display with both V5 { currency, value } and V6 primitive values', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    const currencyField = normalized.panels[0].fields.find(
      (f: any) => f.id === 'fld_currency',
    )!

    // V5 structured value
    const v5Val = { currency: 'EUR', value: 2500.75 }
    expect(isStructuredCurrencyValue(v5Val)).toBe(true)
    expect(extractCurrencyCode(v5Val, currencyField)).toBe('EUR')
    expect(extractCurrencyNumericValue(v5Val)).toBe(2500.75)
    expect(formatRuntimeFieldDisplayValue(v5Val, currencyField)).toBe(
      'EUR 2500.75',
    )
    expect(isFieldFilled(currencyField, v5Val)).toBe(true)
    expect(isFieldFilled(currencyField, { currency: 'EUR', value: '' })).toBe(
      false,
    )

    // Updating V5 structured value preserves structure & currency code
    const updatedV5 = updateCurrencyFieldValue(v5Val, 3100, currencyField)
    expect(updatedV5).toEqual({ currency: 'EUR', value: 3100 })

    // V6 primitive value
    const v6Val = 1800
    expect(isStructuredCurrencyValue(v6Val)).toBe(false)
    expect(extractCurrencyNumericValue(v6Val)).toBe(1800)
    expect(formatRuntimeFieldDisplayValue(v6Val, currencyField)).toBe('1800')
    expect(isFieldFilled(currencyField, v6Val)).toBe(true)

    // Updating existing primitive value keeps primitive representation
    const updatedV6 = updateCurrencyFieldValue(v6Val, 1950, currencyField)
    expect(updatedV6).toBe(1950)
  })

  it('6. Supports phone field rendering, editing, validation, and display with both V5 structured objects and V6 primitive strings', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    const phoneField = normalized.panels[0].fields.find(
      (f: any) => f.id === 'fld_phone',
    )!

    // V5 structured phone object
    const v5Phone = {
      alpha2Code: 'US',
      code: '+1',
      flag: '🇺🇸',
      phoneNo: '4155552671',
      verified: true,
    }
    expect(isStructuredPhoneValue(v5Phone)).toBe(true)
    expect(extractPhoneInputString(v5Phone)).toBe('+1 4155552671')
    expect(formatRuntimeFieldDisplayValue(v5Phone, phoneField)).toBe(
      '+1 4155552671',
    )
    expect(stringifyFieldValue(v5Phone)).toBe('+1 4155552671')
    expect(isFieldFilled(phoneField, v5Phone)).toBe(true)
    expect(
      isFieldFilled(phoneField, { ...v5Phone, phoneNo: '   ' }),
    ).toBe(false)

    // Editing V5 structured phone preserves metadata (code, flag, alpha2Code, verified)
    const updatedV5Phone = updatePhoneFieldValue(
      v5Phone,
      '4155559999',
      phoneField,
    )
    expect(updatedV5Phone).toEqual({
      alpha2Code: 'US',
      code: '+1',
      flag: '🇺🇸',
      phoneNo: '4155559999',
      verified: true,
    })

    // V6 primitive phone string
    const v6Phone = '+44 20 7946 0958'
    expect(isStructuredPhoneValue(v6Phone)).toBe(false)
    expect(extractPhoneInputString(v6Phone)).toBe('+44 20 7946 0958')
    expect(formatRuntimeFieldDisplayValue(v6Phone, phoneField)).toBe(
      '+44 20 7946 0958',
    )
    expect(updatePhoneFieldValue(v6Phone, '+44 20 7946 0000', phoneField)).toBe(
      '+44 20 7946 0000',
    )
  })

  it('7. Loads existing entries without overwriting saved values with initial defaults, and parses serialized table/matrix JSON', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    const { panels, rules } = normalized

    const initialDefaults = buildInitialFormModel(panels)
    expect(initialDefaults.fld_vendor).toBe('Default Corp')

    // New entry uses initialDefaults
    const newEntryModel = hydrateFormModel(panels, null, {
      formRules: rules,
      initialDefaults,
    })
    expect(newEntryModel.fld_vendor).toBe('Default Corp')

    // Saved entry has customized vendor name AND an explicitly cleared field ("")
    const savedEntryValues = {
      fld_currency: { currency: 'USD', value: 400 },
      fld_matrix: JSON.stringify({
        mrow_hw: { mcol_flags: ['ISO9001'], mcol_rating: 'Excellent' },
      }),
      fld_phone: {
        alpha2Code: 'IN',
        code: '+91',
        phoneNo: '9876543210',
        verified: false,
      },
      fld_table: JSON.stringify([
        { _rowId: '1', col_price: 50, col_qty: 2 },
      ]),
      fld_vendor: 'Saved Custom Vendor',
      fld_website: '',
    }

    const hydratedExisting = hydrateFormModel(panels, savedEntryValues, {
      formRules: rules,
      initialDefaults,
    })

    // Saved value is preserved and NOT overwritten by 'Default Corp'
    expect(hydratedExisting.fld_vendor).toBe('Saved Custom Vendor')
    expect(hydratedExisting.fld_website).toBe('')
    expect(hydratedExisting.fld_currency).toEqual({
      currency: 'USD',
      value: 400,
    })
    expect(hydratedExisting.fld_phone).toEqual({
      alpha2Code: 'IN',
      code: '+91',
      phoneNo: '9876543210',
      verified: false,
    })
    // Stringified table JSON is parsed and row calculations + grand total are evaluated
    expect(Array.isArray(hydratedExisting.fld_table)).toBe(true)
    expect(Number(hydratedExisting.fld_table[0].col_line_total)).toBe(100)
    expect(Number(hydratedExisting.fld_grand_total)).toBe(500)
    // Stringified matrix JSON is parsed
    expect(hydratedExisting.fld_matrix).toEqual({
      mrow_hw: { mcol_flags: ['ISO9001'], mcol_rating: 'Excellent' },
    })
  })

  it('8. Supports V5 Matrix object rows/columns and legacy field types (POPUP, TABS, NESTED_LIST, LOGIN_AUTHENTICATION) without crashing or dropping data', () => {
    const normalized = ensureNormalizedRuntimeFormJson(MIGRATED_V5_FORM_FIXTURE)
    const fields = normalized.panels[0].fields
    const byId = Object.fromEntries(fields.map((f: any) => [f.id, f]))

    // Matrix config normalization from V5 objects
    const matrixCfg = getNormalizedMatrixConfig(byId.fld_matrix)
    expect(matrixCfg.rows).toEqual([
      { id: 'mrow_hw', key: 'mrow_hw', label: 'Hardware' },
      { id: 'mrow_sw', key: 'mrow_sw', label: 'Software' },
    ])
    expect(matrixCfg.columns).toHaveLength(2)
    expect(matrixCfg.columns[0]).toEqual({
      id: 'mcol_rating',
      key: 'mcol_rating',
      label: 'Quality Score',
      options: ['Poor', 'Average', 'Excellent'],
      type: 'RADIO',
    })
    expect(matrixCfg.columns[1]).toEqual({
      id: 'mcol_flags',
      key: 'mcol_flags',
      label: 'Certifications',
      options: ['ISO9001', 'SOC2'],
      type: 'CHECKBOX',
    })

    // Matrix cell get/set
    let matrixVal: any = {}
    matrixVal = setMatrixCellValue(
      matrixVal,
      matrixCfg.rows[0],
      matrixCfg.columns[0],
      'Excellent',
      false,
    )
    matrixVal = setMatrixCellValue(
      matrixVal,
      matrixCfg.rows[0],
      matrixCfg.columns[1],
      ['ISO9001', 'SOC2'],
      false,
    )
    expect(
      getMatrixCellValue(matrixVal, matrixCfg.rows[0], matrixCfg.columns[0]),
    ).toBe('Excellent')
    expect(
      getMatrixCellValue(matrixVal, matrixCfg.rows[0], matrixCfg.columns[1]),
    ).toEqual(['ISO9001', 'SOC2'])
    expect(isFieldFilled(byId.fld_matrix, matrixVal)).toBe(true)
    expect(formatRuntimeFieldDisplayValue(matrixVal, byId.fld_matrix)).toContain(
      'Hardware',
    )

    // Legacy field types preserved with all specific settings intact
    expect(resolveRuntimeFieldType(byId.fld_popup)).toBe('POPUP')
    expect(byId.fld_popup.settings.specific.popupTitle).toBe(
      'Procurement Clauses',
    )
    expect(resolveRuntimeFieldType(byId.fld_tabs)).toBe('TABS')
    expect(byId.fld_tabs.settings.specific.tabList).toHaveLength(2)
    expect(resolveRuntimeFieldType(byId.fld_nested)).toBe('NESTED_LIST')
    expect(byId.fld_nested.settings.specific.nestedListItems).toHaveLength(1)
    expect(resolveRuntimeFieldType(byId.fld_login_auth)).toBe(
      'LOGIN_AUTHENTICATION',
    )
    expect(byId.fld_login_auth.settings.specific.loginType).toBe('EMAIL_OTP')
  })

  it('9. Unpacks and normalizes forms whether provided directly, wrapped in _json, wrapped in formJson, or stringified', () => {
    // Wrapped in _json (as returned by /form/:id in V6)
    const fromUnderscoreJson = ensureNormalizedRuntimeFormJson({
      id: 'form_123',
      name: 'Packaging Form',
      _json: MIGRATED_V5_FORM_FIXTURE,
    })
    expect(fromUnderscoreJson.panels).toHaveLength(1)
    expect(fromUnderscoreJson.panels[0].fields.length).toBeGreaterThan(0)

    // Wrapped in formJson
    const fromFormJson = ensureNormalizedRuntimeFormJson({
      id: 'form_123',
      name: 'Packaging Form',
      formJson: MIGRATED_V5_FORM_FIXTURE,
    })
    expect(fromFormJson.panels).toHaveLength(1)

    // Stringified _json
    const fromStringifiedUnderscoreJson = ensureNormalizedRuntimeFormJson({
      id: 'form_123',
      _json: JSON.stringify(MIGRATED_V5_FORM_FIXTURE),
    })
    expect(fromStringifiedUnderscoreJson.panels).toHaveLength(1)

    // Entirely stringified
    const fromStringifiedRoot = ensureNormalizedRuntimeFormJson(
      JSON.stringify({ _json: MIGRATED_V5_FORM_FIXTURE }),
    )
    expect(fromStringifiedRoot.panels).toHaveLength(1)

    // Wrapped in data._json
    const fromNestedData = ensureNormalizedRuntimeFormJson({
      data: {
        _json: MIGRATED_V5_FORM_FIXTURE,
      },
    })
    expect(fromNestedData.panels).toHaveLength(1)
  })
})

