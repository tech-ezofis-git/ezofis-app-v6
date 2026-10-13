/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanFormPayload, useFormStore } from '../store/formStore'
import { evaluateFormula } from './formula'
import {
  convertV5FormulaToV6Tokens,
  convertV6TokensToV5Formula,
  normalizeCurrencyEntryValue,
  normalizePhoneEntryValue,
} from './v5SchemaAdapter'

const createRepresentativeV5FormJson = () => ({
  customRootMetadata: { migratedFrom: 'v5.4.2', tenantId: 42 },
  isDeleted: false,
  panels: [
    {
      fields: [
        {
          id: 'fld_qty',
          label: 'Base Fee',
          type: 'CURRENCY_AMOUNT',
          settings: {
            aiSettings: {},
            general: {
              displayLabel: 'Base Fee (USD)',
              hideLabel: false,
              placeholder: '0.00',
              size: 'col-6',
              tooltip: 'Enter base fee',
              visibility: 'READ_ONLY',
            },
            lookupSettings: {},
            specific: {
              currencyParentField: 'fld_country',
              customDefaultValue: { currency: 'USD', value: 100 },
              defaultValue: 'CUSTOM',
              optionsType: 'SPECIFIC_CURRENCY',
              specificCurrencyOptions: ['USD', 'EUR', 'INR'],
            },
            validation: {
              decimalValue: 2,
              fieldRule: 'MANDATORY',
              hasCalculatedField: true,
              maximumNumberField: 'fld_max_limit',
              minimum: 10,
              rangeType: 'MAXIMUM',
            },
          },
        },
        {
          id: 'fld_legacy_curr',
          label: 'Legacy Currency',
          type: 'CURRENCY',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-6',
              visibility: 'NORMAL',
            },
            specific: {
              optionsType: 'ALL_CURRENCY',
            },
            validation: {
              fieldRule: 'OPTIONAL',
            },
          },
        },
        {
          id: 'fld_date',
          label: 'Invoice Date',
          type: 'DATE',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-6',
              visibility: 'NORMAL',
            },
            specific: {
              defaultValue: 'PARENT_FIELD',
              parentDateField: 'fld_base_date',
              parentFieldsDays: 7,
            },
            validation: {
              dateRange: 'FUTURE',
              fieldRule: 'OPTIONAL',
              maxiDays: 30,
              miniDays: 1,
            },
          },
        },
        {
          id: 'fld_time',
          label: 'Cutoff Time',
          type: 'TIME',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-6',
              visibility: 'NORMAL',
            },
            specific: {
              defaultValue: 'CURRENT_TIME',
            },
            validation: {
              fieldRule: 'OPTIONAL',
              timeFormat: '24',
            },
          },
        },
        {
          id: 'fld_select',
          label: 'Department',
          type: 'SINGLE_SELECT',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-6',
              visibility: 'NORMAL',
            },
            lookupSettings: {
              columnName: 'dept_name',
              columnNameInAPI: 'data.departments',
              connection: 'api',
              connectionId: 99,
              hasLookupCondition: true,
              hubName: 'ERP_HUB',
              parentField: 'fld_qty',
              salesForceSearch: { objectName: 'Account' },
              syncFieldsForAPI: [
                {
                  fieldName: 'fld_qty',
                  id: 'sync_1',
                  inputName: 'minBudget',
                },
              ],
            },
            specific: {
              allowToAddNewOptions: true,
              defaultValue: 'USER_EMAIL',
              isSameMaster: true,
              masterFormConditionColumn: [
                {
                  formColumn: 'fld_qty',
                  masterColumn: 'm_col_budget',
                },
              ],
              optionsType: 'PREDEFINED',
              predefinedTable: 'Repository',
              predefinedTableColumn: 'folder_name',
            },
            validation: {
              enableSettings: [
                {
                  compoundCondition: true,
                  condition: 'AND',
                  controls: ['fld_date'],
                  id: 'en_1',
                  otherConditions: [
                    {
                      field: 'fld_qty',
                      id: 'oc_1',
                      operator: '>',
                      value: '50',
                    },
                  ],
                  value: 'Finance',
                },
              ],
              fieldRule: 'REQUIRED',
              mandatorySettings: [
                {
                  controls: ['fld_time'],
                  id: 'man_1',
                  value: 'Finance',
                },
              ],
              readonlySettings: [
                {
                  controls: ['fld_date'],
                  id: 'ro_1',
                  notEqual: true,
                  value: 'LockedDept',
                },
              ],
            },
          },
        },
        {
          id: 'fld_file',
          label: 'Invoice Attachment',
          type: 'FILE_UPLOAD',
          settings: {
            aiSettings: {
              fileDataValidate: ['INVOICE_NO', 'TOTAL'],
              formControlValidate: {
                conditionFields: [{ formField: 'fld_qty', masterCol: 'mc_1' }],
                existingFormFields: ['fld_qty'],
                formFields: 'fld_select',
                masterFormColumn: ['mc_1'],
                masterFormId: 77,
                optionsType: 'MASTER',
              },
              imageFileValidate: {
                formFields: ['fld_qty'],
                optionsType: 'EXISTING',
              },
              validateTypeKeyword: 'INVOICE',
            },
            general: {
              hideLabel: false,
              size: 'col-12',
              visibility: 'NORMAL',
            },
            specific: {
              allowMultipleFiles: true,
              fileInStage: true,
            },
            validation: {
              allowedFileTypes: ['pdf', 'png'],
              assignOtherControls: ['fld_qty', 'fld_date'],
              documentExpiryField: 'fld_date',
              fieldRule: 'OPTIONAL',
              maxFileSize: 10,
            },
          },
        },
        {
          id: 'fld_rating',
          label: 'Vendor Rating',
          type: 'RATING',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-6',
              visibility: 'NORMAL',
            },
            specific: {
              allowHalfRating: true,
              ratingIcon: 'HEART',
              ratingIconCount: 10,
            },
            validation: {
              fieldRule: 'OPTIONAL',
            },
          },
        },
        {
          id: 'fld_divider',
          label: 'Section Divider',
          type: 'DIVIDER',
          settings: {
            general: {
              dividerType: 'DASHED',
              hideLabel: true,
              size: 'col-12',
              visibility: 'NORMAL',
            },
            specific: {},
            validation: {
              fieldRule: 'OPTIONAL',
            },
          },
        },
        {
          id: 'fld_table',
          label: 'Line Items',
          type: 'TABLE',
          settings: {
            aiSettings: {
              lineItemSourceFieldId: 'fld_file',
            },
            general: {
              hideLabel: false,
              size: 'col-12',
              visibility: 'NORMAL',
            },
            specific: {
              defaultValue: 'MASTER',
              importOption: true,
              masterFormId: 120,
              masterFormTableColumns: [
                {
                  id: 'mftc_1',
                  masterColumn: 'm_price',
                  tableColumn: 'col_price',
                },
              ],
              tableColumns: [
                {
                  id: 'col_price',
                  label: 'Unit Price',
                  size: 'MEDIUM',
                  type: 'NUMBER',
                  settings: {
                    general: {
                      displayLabel: 'Price ($)',
                      visibility: 'NORMAL',
                    },
                    lookupSettings: {},
                    specific: {
                      showColumnTotal: true,
                    },
                    validation: {
                      decimalValue: 2,
                      fieldRule: 'MANDATORY',
                    },
                  },
                },
                {
                  id: 'col_qty',
                  label: 'Quantity',
                  size: 'SMALL',
                  type: 'NUMBER',
                  settings: {
                    general: {
                      visibility: 'NORMAL',
                    },
                    lookupSettings: {
                      cascadeFromColumn: 'col_price',
                    },
                    specific: {
                      showColumnTotal: true,
                    },
                    validation: {
                      fieldRule: 'REQUIRED',
                    },
                  },
                },
                {
                  id: 'col_line_total',
                  label: 'Line Total',
                  size: 'MEDIUM',
                  type: 'CALCULATED',
                  settings: {
                    general: {
                      visibility: 'READ_ONLY',
                    },
                    specific: {
                      showColumnTotal: true,
                    },
                    validation: {
                      decimalValue: 2,
                      fieldRule: 'OPTIONAL',
                      hasCalculatedField: true,
                    },
                  },
                },
              ],
              tableFixedRowCount: 3,
              tableFixedRowLabels: {
                col_price: ['Row 1', 'Row 2', 'Row 3'],
              },
              tableRowChooseType: 'SINGLE_ROW',
              tableRowsType: 'FIXED',
            },
            validation: {
              fieldRule: 'REQUIRED',
              requiredValidation: 'ALL',
            },
          },
        },
        {
          id: 'fld_matrix',
          label: 'Quality Matrix',
          type: 'MATRIX',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-12',
              visibility: 'NORMAL',
            },
            specific: {
              matrixColumns: [
                {
                  id: 'mcol_1',
                  label: 'Pass',
                  matrixTypeSettings: { points: 10 },
                  type: 'RADIO',
                },
                {
                  id: 'mcol_2',
                  label: 'Fail',
                  matrixTypeSettings: { points: 0 },
                  type: 'RADIO',
                },
              ],
              matrixRows: [
                { id: 'mrow_1', label: 'Packaging' },
                { id: 'mrow_2', label: 'Labeling' },
              ],
            },
            validation: {
              fieldRule: 'OPTIONAL',
            },
          },
        },
        {
          id: 'fld_fib',
          label: 'Agreement Clause',
          type: 'FILL_IN_THE_BLANKS',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-12',
              visibility: 'NORMAL',
            },
            specific: {
              fibContent:
                '<p>I, <fieldplaceholder fieldid="fib_sub_1"></fieldplaceholder>, agree to pay <fieldplaceholder fieldid="fib_sub_2"></fieldplaceholder>.</p>',
              fibFields: [
                {
                  id: 'fib_sub_1',
                  label: 'Signer Name',
                  type: 'SHORT_TEXT',
                  settings: {
                    general: { placeholder: 'Full Name' },
                    validation: { fieldRule: 'REQUIRED' },
                  },
                },
                {
                  id: 'fib_sub_2',
                  label: 'Amount',
                  type: 'NUMBER',
                  settings: {
                    general: { placeholder: '0.00' },
                    validation: { fieldRule: 'REQUIRED' },
                  },
                },
              ],
            },
            validation: {
              fieldRule: 'REQUIRED',
            },
          },
        },
        {
          id: 'fld_grand_total',
          label: 'Grand Total',
          type: 'CALCULATED',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-6',
              visibility: 'READ_ONLY',
            },
            specific: {},
            validation: {
              decimalValue: 2,
              fieldRule: 'OPTIONAL',
              hasCalculatedField: true,
            },
          },
        },
        {
          id: 'fld_legacy_tabs',
          label: 'Legacy Tabs Container',
          notEditable: true,
          showSettingsOnly: true,
          type: 'TABS',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-12',
              visibility: 'NORMAL',
            },
            specific: {
              tabList: [
                { id: 'tab_1', panelId: 'sec_panel_1', title: 'Tab One' },
              ],
            },
            validation: {
              fieldRule: 'OPTIONAL',
            },
          },
        },
      ],
      id: 'panel_main',
      settings: {
        description: 'Primary invoice section',
        formEntryId: 501,
        masterFormId: 88,
        title: 'Invoice Details',
      },
    },
    {
      fields: [
        {
          id: 'fld_external_ref',
          label: 'External Approval Code',
          type: 'SHORT_TEXT',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-6',
              visibility: 'NORMAL',
            },
            specific: {
              parentFieldId: 'fld_select',
            },
            validation: {
              fieldRule: 'OPTIONAL',
            },
          },
        },
      ],
      id: 'panel_external',
      settings: {
        description: 'Second panel referencing panel_main',
        title: 'Approval Section',
      },
    },
  ],
  secondaryPanels: [
    {
      fields: [
        {
          id: 'sec_fld_1',
          label: 'Popup Inner Field',
          type: 'SHORT_TEXT',
          settings: {
            general: {
              hideLabel: false,
              size: 'col-12',
              visibility: 'NORMAL',
            },
            specific: {},
            validation: {
              fieldRule: 'MANDATORY',
            },
          },
        },
      ],
      id: 'sec_panel_1',
      settings: {
        description: 'Secondary panel for TABS/POPUP',
        title: 'Secondary Tab 1',
      },
    },
  ],
  uid: 'v5_form_uid_001',
  settings: {
    customSettingsExtension: { auditTrail: true },
    general: {
      closedMessage: 'Closed for maintenance',
      conversationalMode: false,
      description: 'V5 Enterprise Purchase Order Form',
      entryUser: ['user_10', 'user_11'],
      footerText: 'Confidential Footer',
      headerText: 'Purchase Order Header',
      layout: 'CARD',
      legacyGeneralFlag: 'keep_me',
      name: 'Enterprise PO Form',
      qrFields: ['fld_qty', 'fld_select'],
      showHeaderFooter: true,
      superUser: ['admin_1', 'admin_2'],
      type: 'MASTER',
      uniqueColumns: ['fld_select'],
    },
    hubLinkIds: [{ fieldId: 'fld_select', hubId: 'hub_99' }],
    publish: {
      legacyPublishToken: 'pub_tok_123',
      publishOption: 'PUBLISH_SCHEDULE',
      publishSchedule: '2026-11-01 09:00',
      unpublishSchedule: '2026-12-31 18:00',
    },
    rules: [
      {
        calculations: [
          {
            columnId: 'col_line_total',
            fieldId: 'fld_table',
            formula: [
              {
                id: 'tok_lp',
                label: '(',
                name: 'LEFT_PARANTHESES',
                value: '(',
              },
              {
                id: 'tok_p',
                label: 'Unit Price',
                name: 'FIELD',
                value: 'col_price',
              },
              {
                id: 'tok_mul',
                label: '*',
                name: 'MULTIPLY',
                value: '*',
              },
              {
                id: 'tok_q',
                label: 'Quantity',
                name: 'FIELD',
                value: 'col_qty',
              },
              {
                id: 'tok_rp',
                label: ')',
                name: 'RIGHT_PARANTHESES',
                value: ')',
              },
            ],
            id: 'calc_row_1',
          },
          {
            columnId: '',
            fieldId: 'fld_grand_total',
            formula: [
              {
                id: 'tok_base',
                label: 'Base Fee',
                name: 'FIELD',
                value: 'fld_qty',
              },
              {
                id: 'tok_plus',
                label: '+',
                name: 'PLUS',
                value: '+',
              },
              {
                id: 'tok_tbl_sum',
                label: 'Line Total',
                name: 'FIELD',
                value: 'col_line_total',
              },
            ],
            id: 'calc_top_1',
          },
        ],
        conditions: [],
        groupLogic: 'ANY' as const,
        id: 'rule_uncond_1',
        isConditionalRule: false,
        name: 'Standard Totals',
      },
      {
        calculations: [
          {
            columnId: '',
            fieldId: 'fld_grand_total',
            formula: [
              {
                id: 'tok_cond_num',
                label: 'Number',
                name: 'NUMBER',
                value: '0',
              },
            ],
            id: 'calc_cond_1',
          },
        ],
        conditions: [
          {
            fieldValue: false,
            id: 'cond_1',
            logic: '===',
            name: 'fld_select',
            value: 'Internal',
          },
        ],
        groupLogic: 'ALL' as const,
        id: 'rule_cond_1',
        isConditionalRule: true,
        name: 'Internal Zero Override',
      },
    ],
  },
})

describe('Phase 1 (P0-1): Lossless V5-to-V6 Schema Adapter & Store Serialization', () => {
  beforeEach(() => {
    useFormStore.getState().resetForm()
  })

  it('normalizes V5 formJson on load and preserves all root, settings, panel, field, and rule structures on save', () => {
    const rawV5 = createRepresentativeV5FormJson()

    // Load into formStore
    useFormStore.getState().loadForm({ formJson: rawV5 })
    const state = useFormStore.getState()

    // Verify store top-level hydration
    expect(state.uid).toBe('v5_form_uid_001')
    expect(state.name).toBe('Enterprise PO Form')
    expect(state.formType).toBe('MASTER')
    expect(state.layout).toBe('SINGLE') // V5 'CARD' -> V6 'SINGLE'
    expect(state.publishStatus).toBe('PUBLISH_SCHEDULE')
    expect(state.scheduleStart).toBe('2026-11-01 09:00')
    expect(state.scheduleEnd).toBe('2026-12-31 18:00')
    expect(state.superUser).toEqual(['admin_1', 'admin_2'])
    expect(state.entryUser).toEqual(['user_10', 'user_11'])
    expect(state.uniqueColumns).toEqual(['fld_select'])
    expect(state.qrFields).toEqual(['fld_qty', 'fld_select'])
    expect(state.hubLinkIds).toEqual([
      { fieldId: 'fld_select', hubId: 'hub_99' },
    ])
    expect(state.secondaryPanels).toHaveLength(1)
    expect(state.rules).toHaveLength(2)

    // Verify field-level V5 -> V6 normalization
    const mainFields = state.panels[0].fields
    const qtyField = mainFields.find((f) => f.id === 'fld_qty')!
    expect(qtyField.displayLabel).toBe('Base Fee (USD)')
    expect(qtyField.settings.general.readOnly).toBe(true)
    expect(qtyField.settings.specific.fillValueType).toBe('CUSTOM')
    expect(qtyField.settings.specific.currencyOptionsType).toBe('SPECIFIC')
    expect(qtyField.settings.specific.specificCurrencies).toEqual([
      'USD',
      'EUR',
      'INR',
    ])
    expect(qtyField.settings.specific.currencyParentFieldId).toBe('fld_country')
    expect(qtyField.settings.validation.fieldRule).toBe('REQUIRED')
    expect(qtyField.settings.validation.decimalDigits).toBe(2)
    expect(qtyField.settings.validation.rangeType).toBe('MIN_FIXED_MAX_FLEX')

    // Legacy CURRENCY normalized to CURRENCY_AMOUNT with legacyV5Type preserved
    const legacyCurr = mainFields.find((f) => f.id === 'fld_legacy_curr') as any
    expect(legacyCurr.type).toBe('CURRENCY_AMOUNT')
    expect(legacyCurr.legacyV5Type).toBe('CURRENCY')
    expect(legacyCurr.settings.specific.currencyOptionsType).toBe('ALL')

    // DATE & TIME defaults
    const dateField = mainFields.find((f) => f.id === 'fld_date')!
    expect(dateField.settings.specific.dateDefaultValueType).toBe(
      'PARENT_FIELD',
    )
    expect(dateField.settings.specific.parentDateFieldId).toBe('fld_base_date')
    expect(dateField.settings.specific.parentDateOffset).toBe(7)

    const timeField = mainFields.find((f) => f.id === 'fld_time')!
    expect(timeField.settings.specific.timeDefaultValueType).toBe('NOW')

    // SINGLE_SELECT lookup & predefined & master condition
    const selectField = mainFields.find((f) => f.id === 'fld_select')!
    expect(selectField.settings.specific.predefinedType).toBe('FOLDER')
    expect(selectField.settings.specific.predefinedColumn).toBe('folder_name')
    expect(
      selectField.settings.specific.masterFormConditionColumn?.[0]?.formField,
    ).toBe('fld_qty')
    expect(selectField.settings.lookupSettings.connectionType).toBe('API')
    expect(selectField.settings.lookupSettings.syncFieldsForAPI?.[0]).toEqual({
      apiParam: 'minBudget',
      fieldName: 'fld_qty',
      formField: 'fld_qty',
      id: 'sync_1',
      inputName: 'minBudget',
    })

    // FILE_UPLOAD & RATING & DIVIDER
    const fileField = mainFields.find((f) => f.id === 'fld_file')!
    expect(fileField.settings.specific.fileInStageOnly).toBe(true)
    expect(fileField.settings.validation.expiryFieldId).toBe('fld_date')
    expect(fileField.settings.aiSettings?.validateTypeKeyword).toBe('INVOICE')

    const ratingField = mainFields.find((f) => f.id === 'fld_rating')!
    expect(ratingField.settings.specific.iconType).toBe('HEART')
    expect(ratingField.settings.specific.iconCount).toBe(10)

    const dividerField = mainFields.find((f) => f.id === 'fld_divider')!
    expect(dividerField.settings.specific.dividerStyle).toBe('DASHED')
    expect(dividerField.settings.specific.dividerType).toBe('DASHED')

    // TABLE settings & columns + hydrated formulaTokens
    const tableField = mainFields.find((f) => f.id === 'fld_table')!
    expect(tableField.settings.specific.rowsType).toBe('FIXED')
    expect(tableField.settings.specific.fixedRowCount).toBe(3)
    expect(tableField.settings.specific.rowSelection).toBe('SINGLE')
    expect(tableField.settings.specific.importExportEnabled).toBe(true)
    expect(tableField.settings.specific.showSummaryRow).toBe(true)

    const calcCol = (tableField.settings.specific.tableColumns || []).find(
      (c) => c.id === 'col_line_total',
    )!
    expect(calcCol.name).toBe('Line Total')
    expect(calcCol.settings?.specific?.formulaTokens).toEqual([
      { type: 'OPERATOR', value: '(' },
      { type: 'FIELD', value: 'col_price' },
      { type: 'OPERATOR', value: '*' },
      { type: 'FIELD', value: 'col_qty' },
      { type: 'OPERATOR', value: ')' },
    ])

    // Top-level CALCULATED field hydrated with TABLE_SUM for table column reference
    const grandTotalField = mainFields.find((f) => f.id === 'fld_grand_total')!
    expect(grandTotalField.settings.specific.formulaTokens).toEqual([
      { type: 'FIELD', value: 'fld_qty' },
      { type: 'OPERATOR', value: '+' },
      { type: 'TABLE_SUM', value: 'fld_table::col_line_total' },
    ])

    // Serialize back to V5/V6 payload and verify lossless round-trip
    const serialized = cleanFormPayload(useFormStore.getState())

    expect(serialized.customRootMetadata).toEqual({
      migratedFrom: 'v5.4.2',
      tenantId: 42,
    })
    expect(serialized.settings.customSettingsExtension).toEqual({
      auditTrail: true,
    })
    expect(serialized.settings.general.layout).toBe('CARD')
    expect(serialized.settings.general.legacyGeneralFlag).toBe('keep_me')
    expect(serialized.settings.general.superUser).toEqual([
      'admin_1',
      'admin_2',
    ])
    expect(serialized.settings.general.entryUser).toEqual([
      'user_10',
      'user_11',
    ])
    expect(serialized.settings.general.uniqueColumns).toEqual(['fld_select'])
    expect(serialized.settings.general.qrFields).toEqual([
      'fld_qty',
      'fld_select',
    ])
    expect(serialized.settings.publish.publishOption).toBe('PUBLISH_SCHEDULE')
    expect(serialized.settings.publish.publishSchedule).toBe('2026-11-01 09:00')
    expect(serialized.settings.publish.unpublishSchedule).toBe(
      '2026-12-31 18:00',
    )
    expect(serialized.settings.publish.legacyPublishToken).toBe('pub_tok_123')
    expect(serialized.settings.hubLinkIds).toEqual([
      { fieldId: 'fld_select', hubId: 'hub_99' },
    ])
    expect(serialized.secondaryPanels).toHaveLength(1)

    // Verify V5 formula rules round-trip with LEFT_PARANTHESES / RIGHT_PARANTHESES and conditional rule intact
    expect(serialized.settings.rules).toHaveLength(2)
    const uncondRule = serialized.settings.rules.find(
      (r: any) => r.id === 'rule_uncond_1',
    )!
    expect(uncondRule.calculations[0].formula).toEqual([
      {
        id: 'tok_lp',
        label: '(',
        name: 'LEFT_PARANTHESES',
        value: '(',
      },
      {
        id: 'tok_p',
        label: 'Unit Price',
        name: 'FIELD',
        value: 'col_price',
      },
      {
        id: 'tok_mul',
        label: '*',
        name: 'MULTIPLY',
        value: '*',
      },
      {
        id: 'tok_q',
        label: 'Quantity',
        name: 'FIELD',
        value: 'col_qty',
      },
      {
        id: 'tok_rp',
        label: ')',
        name: 'RIGHT_PARANTHESES',
        value: ')',
      },
    ])
    expect(uncondRule.calculations[1].formula).toEqual([
      {
        id: 'tok_base',
        label: 'Base Fee',
        name: 'FIELD',
        value: 'fld_qty',
      },
      {
        id: 'tok_plus',
        label: '+',
        name: 'PLUS',
        value: '+',
      },
      {
        id: 'tok_tbl_sum',
        label: 'Line Total',
        name: 'FIELD',
        value: 'col_line_total',
      },
    ])

    const condRule = serialized.settings.rules.find(
      (r: any) => r.id === 'rule_cond_1',
    )!
    expect(condRule.isConditionalRule).toBe(true)
    expect(condRule.groupLogic).toBe('ALL')
    expect(condRule.conditions).toHaveLength(1)
  })

  it('propagates V6 UI edits back onto V5 properties during updateQuestion and serializeFormPayload', () => {
    const rawV5 = createRepresentativeV5FormJson()
    useFormStore.getState().loadForm({ formJson: rawV5 })

    // 1. Edit TABLE settings via V6 properties
    useFormStore.getState().updateQuestion('fld_table', (prev: any) => ({
      ...prev,
      settings: {
        ...prev.settings,
        specific: {
          ...prev.settings.specific,
          fixedRowCount: 5,
          importExportEnabled: false,
          rowSelection: 'MULTIPLE',
          rowsType: 'ON_DEMAND',
        },
      },
    }))

    // 2. Edit RATING settings via V6 properties
    useFormStore.getState().updateQuestion('fld_rating', (prev: any) => ({
      ...prev,
      settings: {
        ...prev.settings,
        specific: {
          ...prev.settings.specific,
          iconCount: 7,
          iconType: 'STAR',
        },
      },
    }))

    // 3. Edit MATRIX column labels as string[] (simulating V6 QuestionSettings textarea)
    useFormStore.getState().updateQuestion('fld_matrix', (prev: any) => ({
      ...prev,
      settings: {
        ...prev.settings,
        specific: {
          ...prev.settings.specific,
          matrixColumns: ['Approved', 'Rejected', 'Pending'],
        },
      },
    }))

    // 4. Edit formType and verify superUser/entryUser are NOT wiped (V5 Bug 5 fix)
    useFormStore.getState().setFormType('WORKFLOW')
    expect(useFormStore.getState().superUser).toEqual(['admin_1', 'admin_2'])
    expect(useFormStore.getState().entryUser).toEqual(['user_10', 'user_11'])

    const saved = cleanFormPayload(useFormStore.getState())
    const savedMainFields = saved.panels[0].fields

    const savedTable = savedMainFields.find((f: any) => f.id === 'fld_table')
    expect(savedTable.settings.specific.tableRowsType).toBe('ON_DEMAND')
    expect(savedTable.settings.specific.tableFixedRowCount).toBe(5)
    expect(savedTable.settings.specific.tableRowChooseType).toBe('MULTIPLE_ROW')
    expect(savedTable.settings.specific.importOption).toBe(false)

    const savedRating = savedMainFields.find((f: any) => f.id === 'fld_rating')
    expect(savedRating.settings.specific.ratingIcon).toBe('STAR')
    expect(savedRating.settings.specific.ratingIconCount).toBe(7)

    // Matrix columns should serialize as structured V5 objects, preserving existing IDs/metadata for indices 0 & 1
    const savedMatrix = savedMainFields.find((f: any) => f.id === 'fld_matrix')
    expect(savedMatrix.settings.specific.matrixColumns).toHaveLength(3)
    expect(savedMatrix.settings.specific.matrixColumns[0]).toEqual({
      id: 'mcol_1',
      label: 'Approved',
      matrixTypeSettings: { points: 10 },
      type: 'RADIO',
    })
    expect(savedMatrix.settings.specific.matrixColumns[1]).toEqual({
      id: 'mcol_2',
      label: 'Rejected',
      matrixTypeSettings: { points: 0 },
      type: 'RADIO',
    })
    expect(savedMatrix.settings.specific.matrixColumns[2].label).toBe('Pending')
  })

  it('regenerates all nested IDs and remaps intra-panel/intra-table references while preserving external references when duplicating a panel or field', () => {
    const rawV5 = createRepresentativeV5FormJson()
    useFormStore.getState().loadForm({ formJson: rawV5 })

    // Duplicate the main panel
    useFormStore.getState().duplicatePanel('panel_main')
    const state = useFormStore.getState()
    expect(state.panels).toHaveLength(3)

    const origPanel = state.panels[0]
    const dupPanel = state.panels[1]
    expect(dupPanel.id).not.toBe(origPanel.id)

    const origTable = origPanel.fields.find((f) => f.id === 'fld_table')!
    const dupTable = dupPanel.fields.find((f) =>
      f.label.startsWith('Line Items'),
    )!
    expect(dupTable.id).not.toBe(origTable.id)

    // Verify table column IDs were regenerated and intra-table references updated
    const origCols = origTable.settings.specific.tableColumns!
    const dupCols = dupTable.settings.specific.tableColumns!
    expect(dupCols[0].id).not.toBe(origCols[0].id)
    expect(dupCols[1].id).not.toBe(origCols[1].id)
    expect(dupCols[2].id).not.toBe(origCols[2].id)

    // cascadeFromColumn on col_qty should point to the new col_price ID
    expect(dupCols[1].settings?.lookupSettings?.cascadeFromColumn).toBe(
      dupCols[0].id,
    )

    // Row formula on col_line_total should point to the new col_price and col_qty IDs
    expect(dupCols[2].settings?.specific?.formulaTokens).toEqual([
      { type: 'OPERATOR', value: '(' },
      { type: 'FIELD', value: dupCols[0].id },
      { type: 'OPERATOR', value: '*' },
      { type: 'FIELD', value: dupCols[1].id },
      { type: 'OPERATOR', value: ')' },
    ])

    // masterFormTableColumns should point to the new col_price ID
    expect(
      dupTable.settings.specific.masterFormTableColumns?.[0]?.tableColumn,
    ).toBe(dupCols[0].id)

    // lineItemSourceFieldId on duplicated table should point to the duplicated FILE_UPLOAD field
    const dupFile = dupPanel.fields.find((f) =>
      f.label.startsWith('Invoice Attachment'),
    )!
    expect(dupTable.settings.aiSettings?.lineItemSourceFieldId).toBe(dupFile.id)

    // Duplicated Grand Total formula should reference duplicated Base Fee and duplicated Table::LineTotal
    const dupQty = dupPanel.fields.find((f) => f.label.startsWith('Base Fee'))!
    const dupGrandTotal = dupPanel.fields.find((f) =>
      f.label.startsWith('Grand Total'),
    )!
    expect(dupGrandTotal.settings.specific.formulaTokens).toEqual([
      { type: 'FIELD', value: dupQty.id },
      { type: 'OPERATOR', value: '+' },
      { type: 'TABLE_SUM', value: `${dupTable.id}::${dupCols[2].id}` },
    ])

    // External reference (fld_country is not in panel_main) must remain untouched
    expect(dupQty.settings.specific.currencyParentFieldId).toBe('fld_country')

    // Fill in the Blanks sub-fields & HTML placeholders must have new matching IDs
    const origFib = origPanel.fields.find((f) => f.id === 'fld_fib')!
    const dupFib = dupPanel.fields.find((f) =>
      f.label.startsWith('Agreement Clause'),
    )!
    const origSubIds = origFib.settings.specific.fibFields!.map(
      (s: any) => s.id,
    )
    const dupSubIds = dupFib.settings.specific.fibFields!.map((s: any) => s.id)
    expect(dupSubIds[0]).not.toBe(origSubIds[0])
    expect(dupSubIds[1]).not.toBe(origSubIds[1])
    expect((dupFib.settings.specific as any).fibContent).toContain(
      `fieldid="${dupSubIds[0]}"`,
    )
    expect((dupFib.settings.specific as any).fibContent).toContain(
      `fieldid="${dupSubIds[1]}"`,
    )
  })

  it('handles SUM OF <colId> in row-level formulas and round-trips V5/V6 entry values for CURRENCY_AMOUNT and PHONE_NUMBER', () => {
    const panels = [
      {
        fields: [
          {
            id: 'tbl_1',
            type: 'TABLE',
            settings: {
              specific: {
                tableColumns: [{ id: 'c_amount', name: 'Amount' }],
              },
            },
          },
        ],
        id: 'p_1',
      },
    ]

    const v6Tokens = convertV5FormulaToV6Tokens(
      [
        { id: '1', label: 'Amount', name: 'FIELD', value: 'c_amount' },
        { id: '2', label: '/', name: 'DIVIDE', value: '/' },
        {
          id: '3',
          label: 'SUM OF Amount',
          name: 'FIELD',
          value: 'SUM OF c_amount',
        },
      ],
      panels,
      'tbl_1',
    )

    expect(v6Tokens).toEqual([
      { type: 'FIELD', value: 'c_amount' },
      { type: 'OPERATOR', value: '/' },
      { type: 'TABLE_SUM', value: 'tbl_1::c_amount' },
    ])

    const backToV5 = convertV6TokensToV5Formula(v6Tokens, 'tbl_1', panels)
    expect(backToV5[0]).toMatchObject({ name: 'FIELD', value: 'c_amount' })
    expect(backToV5[1]).toMatchObject({ name: 'DIVIDE', value: '/' })
    expect(backToV5[2]).toMatchObject({
      label: 'SUM OF Amount',
      name: 'FIELD',
      value: 'SUM OF c_amount',
    })

    // Entry value compatibility (Decision 2)
    expect(
      normalizeCurrencyEntryValue({ currency: 'EUR', value: 250.5 }),
    ).toEqual({
      currency: 'EUR',
      value: 250.5,
    })
    expect(normalizeCurrencyEntryValue(199.99, 'USD')).toEqual({
      currency: 'USD',
      value: 199.99,
    })
    expect(normalizeCurrencyEntryValue('GBP 45.00')).toEqual({
      currency: 'GBP',
      value: '45.00',
    })

    expect(
      normalizePhoneEntryValue({
        alpha2Code: 'US',
        code: '+1',
        flag: 'us.svg',
        phoneNo: '5551234567',
        verified: true,
      }),
    ).toEqual({
      alpha2Code: 'US',
      code: '+1',
      flag: 'us.svg',
      phoneNo: '5551234567',
      verified: true,
    })
    expect(normalizePhoneEntryValue('+91 9876543210')).toEqual({
      code: '+91',
      phoneNo: '9876543210',
    })

    // Formula evaluation across V5 structured currency objects and V6 numbers
    const evalResult = evaluateFormula(
      [
        { type: 'FIELD', value: 'f_curr_v5' },
        { type: 'OPERATOR', value: '+' },
        { type: 'FIELD', value: 'f_curr_v6' },
      ],
      {
        f_curr_v5: { currency: 'USD', value: '125.50' },
        f_curr_v6: 74.5,
      },
    )
    expect(evalResult).toBe(200)
  })
})
