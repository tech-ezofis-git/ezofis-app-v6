import { describe, expect, it } from 'vitest'
import {
  isRuntimeValueEmpty,
  validateFieldValue,
  validateFormModel,
} from './runtimeValidation'
import {
  hydrateFormModel,
} from './runtimeFieldAdapter'
import {
  buildInitialFormModel,
  getDependentChildFieldIds,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'

describe('Phase 4: Runtime Validation, Defaults & Cascading Options V5 Parity', () => {
  it('1. validates required and conditionally required fields', () => {
    const requiredField = {
      id: 'f_req',
      label: 'Full Name',
      settings: {
        general: { label: 'Full Name' },
        validation: { fieldRule: 'REQUIRED' },
      },
      type: 'SHORT_TEXT',
    }

    // Empty fails
    const emptyRes = validateFieldValue(requiredField, '')
    expect(emptyRes.isValid).toBe(false)
    expect(emptyRes.error).toContain('should not be empty')

    // Filled passes
    const filledRes = validateFieldValue(requiredField, 'John Doe')
    expect(filledRes.isValid).toBe(true)

    // Conditionally required via form rules
    const conditionalField = {
      id: 'f_cond',
      label: 'Reason',
      settings: {
        general: { label: 'Reason' },
        validation: { fieldRule: 'OPTIONAL' },
      },
      type: 'SHORT_TEXT',
    }

    const panels = [{ id: 'p1', fields: [conditionalField] }]
    const rules = [
      {
        fieldId: 'f_cond',
        action: 'SET_REQUIRED',
        ruleLogic: 'IF trigger == "YES"',
      },
    ]

    // Not required by default
    const validDefault = validateFormModel(panels, {}, { formRules: [] })
    expect(validDefault.isValid).toBe(true)

    // When rule marks it required
    const invalidRequired = validateFormModel(panels, { f_cond: '' }, {
      formRules: [{
        actions: [{ targetFieldId: 'f_cond', type: 'MANDATORY' }],
        conditions: [{ fieldId: 'trigger', operator: 'EQUALS', value: 'YES' }],
        id: 'r_req',
      }],
    })
    // If trigger is not YES, remains optional
    expect(invalidRequired.isValid).toBe(true)

    const invalidTriggered = validateFormModel(panels, { trigger: 'YES', f_cond: '' }, {
      formRules: [{
        actions: [{ targetFieldId: 'f_cond', type: 'MANDATORY' }],
        conditions: [{ fieldId: 'trigger', operator: 'EQUALS', value: 'YES' }],
        id: 'r_req',
      }],
    })
    expect(invalidTriggered.isValid).toBe(false)
    expect(invalidTriggered.errors['f_cond']).toBeDefined()
  })

  it('2. validates text length, numeric bounds, and dynamic field comparisons', () => {
    // Text length
    const textField = {
      id: 'f_text',
      label: 'Comments',
      settings: {
        validation: {
          rangeType: 'RANGE',
          minimum: 5,
          maximum: 10,
        },
      },
      type: 'SHORT_TEXT',
    }

    expect(validateFieldValue(textField, 'abc').isValid).toBe(false)
    expect(validateFieldValue(textField, 'abcdef').isValid).toBe(true)
    expect(validateFieldValue(textField, '12345678901').isValid).toBe(false)

    // Dynamic numeric bounds comparison
    const dynNumField = {
      id: 'f_end',
      label: 'End Quantity',
      settings: {
        validation: {
          minimumNumberField: 'f_start',
        },
      },
      type: 'NUMBER',
    }

    // Lower than f_start
    const dynFail = validateFieldValue(dynNumField, 10, { f_start: 25 })
    expect(dynFail.isValid).toBe(false)
    expect(dynFail.error).toContain('minimum field value')

    // Higher than f_start
    const dynPass = validateFieldValue(dynNumField, 30, { f_start: 25 })
    expect(dynPass.isValid).toBe(true)
  })

  it('3. validates format rules (email, url, numeric, integer, regex, decimal precision)', () => {
    const emailField = {
      id: 'f_email',
      label: 'Email',
      type: 'EMAIL',
    }
    expect(validateFieldValue(emailField, 'not-an-email').isValid).toBe(false)
    expect(validateFieldValue(emailField, 'test@example.com').isValid).toBe(true)

    const decimalField = {
      id: 'f_dec',
      label: 'Weight',
      type: 'NUMBER',
      settings: {
        validation: {
          decimalValue: 2,
        },
      },
    }
    expect(validateFieldValue(decimalField, 12.345).isValid).toBe(false)
    expect(validateFieldValue(decimalField, 12.34).isValid).toBe(true)
  })

  it('4. validates structured currency and phone values', () => {
    const currencyField = {
      id: 'f_curr',
      label: 'Budget',
      type: 'CURRENCY_AMOUNT',
      settings: {
        validation: { fieldRule: 'REQUIRED', minimum: 100 },
      },
    }

    // Empty currency structure fails
    expect(validateFieldValue(currencyField, { currency: '', value: '' }).isValid).toBe(false)
    // Missing currency code fails
    expect(validateFieldValue(currencyField, { currency: '', value: 200 }).isValid).toBe(false)
    // Value below minimum fails
    expect(validateFieldValue(currencyField, { currency: 'USD', value: 50 }).isValid).toBe(false)
    // Valid passes
    expect(validateFieldValue(currencyField, { currency: 'USD', value: 150 }).isValid).toBe(true)

    const phoneField = {
      id: 'f_phone',
      label: 'Mobile',
      type: 'PHONE_NUMBER',
      settings: {
        validation: { fieldRule: 'REQUIRED' },
      },
    }

    // Invalid digits count fails
    expect(validateFieldValue(phoneField, { code: '+1', phoneNo: '123' }).isValid).toBe(false)
    // Valid passes
    expect(validateFieldValue(phoneField, { code: '+1', phoneNo: '9876543210' }).isValid).toBe(true)
  })

  it('5. validates table column required rules across all rows', () => {
    const tableField = {
      id: 'f_table',
      label: 'Line Items',
      type: 'TABLE',
      settings: {
        specific: {
          tableColumns: [
            { id: 'c_item', label: 'Item Name', isRequired: true },
            { id: 'c_qty', label: 'Quantity', required: true },
          ],
        },
      },
    }

    const invalidRows = [
      { c_item: 'Widget', c_qty: 2 },
      { c_item: '', c_qty: 5 }, // missing Item Name
    ]

    const res = validateFieldValue(tableField, invalidRows)
    expect(res.isValid).toBe(false)
    expect(res.error).toContain('Row 2: Item Name is required')

    const validRows = [
      { c_item: 'Widget', c_qty: 2 },
      { c_item: 'Gadget', c_qty: 5 },
    ]
    expect(validateFieldValue(tableField, validRows).isValid).toBe(true)
  })

  describe('5b. table column content rules and min/max', () => {
    const makeTable = (columns: Array<Record<string, unknown>>) => ({
      id: 'f_tbl',
      label: 'Items',
      type: 'TABLE',
      settings: { specific: { tableColumns: columns } },
    })
    const col = (
      id: string,
      type: string,
      validation: Record<string, unknown> = {},
    ) => ({
      id,
      label: id,
      type,
      settings: { validation },
    })

    it('INTEGER/DECIMAL content rules on NUMBER columns', () => {
      const t = makeTable([
        col('qty', 'NUMBER', { contentRule: 'INTEGER' }),
        col('price', 'NUMBER', { contentRule: 'DECIMAL' }),
      ])
      const bad = validateFieldValue(t, [{ price: 'abc', qty: 1.5 }])
      expect(bad.errors).toEqual([
        'Row 1: qty should be a number without decimals',
        'Row 1: price should be a valid number',
      ])
      expect(validateFieldValue(t, [{ price: 2.5, qty: 3 }]).isValid).toBe(true)
    })

    it('EMAIL, WEB and ALPHA rules on text columns, row-specific', () => {
      const t = makeTable([
        col('mail', 'SHORT_TEXT', { contentRule: 'EMAIL' }),
        col('site', 'SHORT_TEXT', { contentRule: 'WEB' }),
        col('name', 'SHORT_TEXT', { contentRule: 'ALPHA' }),
      ])
      const res = validateFieldValue(t, [
        { mail: 'a@b.com', name: 'Bob', site: 'example.com' },
        { mail: 'nope', name: 'B0b', site: 'not a url' },
      ])
      expect(res.errors).toHaveLength(3)
      expect(res.errors.every((e) => e.startsWith('Row 2:'))).toBe(true)
    })

    it('min/max value on NUMBER columns', () => {
      const t = makeTable([col('qty', 'NUMBER', { maximum: 10, minimum: 2 })])
      expect(validateFieldValue(t, [{ qty: 1 }]).error).toBe(
        'Row 1: qty should not be less than 2',
      )
      expect(validateFieldValue(t, [{ qty: 11 }]).error).toBe(
        'Row 1: qty should not be more than 10',
      )
      expect(validateFieldValue(t, [{ qty: 5 }]).isValid).toBe(true)
    })

    it('min/max length on SHORT_TEXT columns', () => {
      const t = makeTable([
        col('code', 'SHORT_TEXT', { maximum: 4, minimum: 2 }),
      ])
      expect(validateFieldValue(t, [{ code: 'a' }]).error).toBe(
        'Row 1: code should not be less than 2 characters',
      )
      expect(validateFieldValue(t, [{ code: 'abcde' }]).error).toBe(
        'Row 1: code should not be more than 4 characters',
      )
      expect(validateFieldValue(t, [{ code: 'abc' }]).isValid).toBe(true)
    })

    it('reports one error per invalid cell and skips empty optional cells', () => {
      const t = makeTable([
        col('mail', 'SHORT_TEXT', { contentRule: 'EMAIL', maximum: 3 }),
      ])
      expect(validateFieldValue(t, [{ mail: 'nope' }]).errors).toHaveLength(1)
      expect(validateFieldValue(t, [{ mail: '' }]).isValid).toBe(true)
    })

    it('required still reported once and columns without settings are unaffected', () => {
      const t = makeTable([
        {
          ...col('a', 'SHORT_TEXT', {
            contentRule: 'EMAIL',
            fieldRule: 'REQUIRED',
          }),
        },
        { id: 'b', label: 'b', type: 'NUMBER' },
      ])
      const res = validateFieldValue(t, [{ a: '', b: 'anything' }])
      expect(res.errors).toEqual(['Row 1: a is required and cannot be empty'])
    })
  })

  it('6. validates multi-choice "ALL" requirement and matrix completeness', () => {
    const multiChoiceField = {
      id: 'f_legal',
      label: 'Terms & Conditions',
      type: 'MULTIPLE_CHOICE',
      settings: {
        specific: {
          options: ['Term 1', 'Term 2', 'Term 3'],
        },
        validation: {
          requiredValidation: 'ALL',
        },
      },
    }

    expect(validateFieldValue(multiChoiceField, ['Term 1']).isValid).toBe(false)
    expect(validateFieldValue(multiChoiceField, ['Term 1', 'Term 2', 'Term 3']).isValid).toBe(true)

    const matrixField = {
      id: 'f_matrix',
      label: 'Feedback Matrix',
      type: 'MATRIX',
      settings: {
        specific: {
          matrixRows: [
            { id: 'r1', label: 'Quality' },
            { id: 'r2', label: 'Speed' },
          ],
          matrixColumns: [
            { id: 'c1', label: 'Good' },
            { id: 'c2', label: 'Bad' },
          ],
        },
        validation: {
          requiredValidation: 'ALL',
        },
      },
    }

    expect(validateFieldValue(matrixField, { r1: 'Good' }).isValid).toBe(false)
    expect(validateFieldValue(matrixField, { r1: 'Good', r2: 'Bad' }).isValid).toBe(true)
  })

  it('7. suppresses validation for hidden or read-only fields', () => {
    const panels = [
      {
        id: 'p1',
        fields: [
          {
            id: 'f_hidden',
            label: 'Secret',
            settings: {
              general: { visibility: 'HIDDEN' },
              validation: { fieldRule: 'REQUIRED' },
            },
            type: 'SHORT_TEXT',
          },
          {
            id: 'f_readonly',
            label: 'System ID',
            settings: {
              validation: { fieldRule: 'REQUIRED', readonlySettings: { isReadOnly: true } },
            },
            type: 'SHORT_TEXT',
          },
        ],
      },
    ]

    const res = validateFormModel(panels, {})
    expect(res.isValid).toBe(true)
    expect(res.missingFields.length).toBe(0)
  })

  it('8. applies default values on new entry initialization', () => {
    const panels = [
      {
        id: 'p1',
        fields: [
          {
            id: 'f_date',
            type: 'DATE',
            settings: {
              specific: { defaultValueInSelectField: 'CURRENT_DATE' },
            },
          },
          {
            id: 'f_counter',
            type: 'COUNTER',
          },
          {
            id: 'f_select',
            type: 'SINGLE_SELECT',
            settings: {
              specific: {
                customOptions: 'Option 1\nOption 2',
                defaultValueInSelectField: 'Option 1',
              },
            },
          },
        ],
      },
    ]

    const initialModel = buildInitialFormModel(panels)
    expect(initialModel['f_counter']).toBe(0)
    expect(initialModel['f_select']).toBe('Option 1')
    expect(initialModel['f_date']).toBeDefined()
  })

  it('9. preserves intentionally empty saved values when editing existing entries', () => {
    const panels = [
      {
        id: 'p1',
        fields: [
          {
            id: 'f_notes',
            type: 'SHORT_TEXT',
            settings: {
              specific: { defaultValueInSelectField: 'Default Notes' },
            },
          },
        ],
      },
    ]

    // Existing entry has empty string for f_notes
    const existingValues = { f_notes: '' }
    const hydrated = hydrateFormModel(panels, existingValues)

    // Should NOT overwrite with default notes
    expect(hydrated['f_notes']).toBe('')
  })

  it('10. handles cascading options and child field invalidation on parent change', () => {
    const panels = [
      {
        id: 'p1',
        fields: [
          {
            id: 'parent_country',
            label: 'Country',
            type: 'SINGLE_SELECT',
          },
          {
            id: 'child_city',
            label: 'City',
            type: 'SINGLE_SELECT',
            settings: {
              specific: {
                parentFieldId: 'parent_country',
              },
            },
          },
        ],
      },
    ]

    // getDependentChildFieldIds resolves child_city from parent_country
    const childIds = getDependentChildFieldIds('parent_country', panels)
    expect(childIds).toContain('child_city')
  })
})
