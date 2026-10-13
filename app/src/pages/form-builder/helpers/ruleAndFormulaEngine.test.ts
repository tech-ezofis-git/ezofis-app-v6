/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from 'vitest'
import { getMissingMandatoryFieldsList } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { cleanFormPayload, useFormStore } from '../store/formStore'
import {
  applyCalculatedFields,
  decodeTableSumValue,
  evaluateFormula,
} from './formula'
import {
  evaluateFormRules,
  evaluateRuleConditions,
  sanitizeHiddenFieldValues,
} from './ruleEngine'

describe('Phase 2 (P0-2): Rule Engine & Formula Engine V5 Parity', () => {
  beforeEach(() => {
    useFormStore.getState().resetForm()
  })

  it('1. executes V5 conditional visibility rules (enableSettings), including default-hidden state, compound conditions, multi-rule OR aggregation, and cascading hide', () => {
    const panels = [
      {
        fields: [
          {
            id: 'fld_type',
            label: 'Request Type',
            type: 'SINGLE_SELECT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: {
                enableSettings: [
                  {
                    controls: ['fld_capex_details', 'panel_approval'],
                    id: 'en_capex',
                    value: 'CAPEX',
                  },
                  {
                    compoundCondition: true,
                    condition: 'AND',
                    controls: ['fld_high_value_note'],
                    id: 'en_high_capex',
                    otherConditions: [
                      {
                        field: 'fld_budget',
                        id: 'oc_budget',
                        operator: 'IS_GREATER_THAN (>)',
                        value: '10000',
                      },
                    ],
                    value: 'CAPEX',
                  },
                ],
                fieldRule: 'REQUIRED',
              },
            },
          },
          {
            id: 'fld_alt_trigger',
            label: 'Emergency Override',
            type: 'SINGLE_CHOICE',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: {
                enableSettings: [
                  {
                    // Second rule targeting fld_capex_details to verify OR-aggregation
                    controls: ['fld_capex_details'],
                    id: 'en_override',
                    value: 'YES',
                  },
                ],
              },
            },
          },
          {
            id: 'fld_budget',
            label: 'Budget',
            type: 'CURRENCY_AMOUNT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: { fieldRule: 'OPTIONAL' },
            },
          },
          {
            id: 'fld_capex_details',
            label: 'Capex Justification',
            type: 'LONG_TEXT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: {
                // Cascading child rule: fld_capex_details controls fld_nested_child
                enableSettings: [
                  {
                    controls: ['fld_nested_child'],
                    id: 'en_nested',
                    value: 'NEEDS_SUB_APPROVAL',
                  },
                ],
              },
            },
          },
          {
            id: 'fld_nested_child',
            label: 'Sub-Approval Code',
            type: 'SHORT_TEXT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: { fieldRule: 'OPTIONAL' },
            },
          },
          {
            id: 'fld_high_value_note',
            label: 'CFO Sign-off Note',
            type: 'SHORT_TEXT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: { fieldRule: 'OPTIONAL' },
            },
          },
        ],
        id: 'panel_main',
        settings: { title: 'Main Section' },
      },
      {
        fields: [
          {
            id: 'fld_approver',
            label: 'Approver Email',
            type: 'EMAIL',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: { fieldRule: 'REQUIRED' },
            },
          },
        ],
        id: 'panel_approval',
        settings: { title: 'Approval Section' },
      },
    ]

    // Initially empty: any control in enableSettings.controls starts hidden (except panel 0)
    const initialStates = evaluateFormRules(panels, {})
    expect(initialStates.panel_main.visible).toBe(true)
    expect(initialStates.fld_type.visible).toBe(true)
    expect(initialStates.fld_capex_details.visible).toBe(false)
    expect(initialStates.fld_nested_child.visible).toBe(false)
    expect(initialStates.fld_high_value_note.visible).toBe(false)
    expect(initialStates.panel_approval.visible).toBe(false)
    expect(initialStates.fld_approver.visible).toBe(false)

    // Select CAPEX with budget 5000 (structured V5 currency object)
    const capexLowStates = evaluateFormRules(panels, {
      fld_budget: { currency: 'USD', value: 5000 },
      fld_capex_details: 'NEEDS_SUB_APPROVAL',
      fld_type: 'CAPEX',
    })
    expect(capexLowStates.fld_capex_details.visible).toBe(true)
    expect(capexLowStates.fld_nested_child.visible).toBe(true)
    expect(capexLowStates.panel_approval.visible).toBe(true)
    expect(capexLowStates.fld_approver.visible).toBe(true)
    // Compound condition requires budget > 10000
    expect(capexLowStates.fld_high_value_note.visible).toBe(false)

    // Increase budget to 15000 -> compound condition matches
    const capexHighStates = evaluateFormRules(panels, {
      fld_budget: { currency: 'USD', value: '15000' },
      fld_capex_details: 'NEEDS_SUB_APPROVAL',
      fld_type: 'CAPEX',
    })
    expect(capexHighStates.fld_high_value_note.visible).toBe(true)

    // Switch fld_type to OPEX: fld_capex_details hides, which must cascade-hide fld_nested_child
    // even though fld_capex_details still holds 'NEEDS_SUB_APPROVAL' in raw model
    const opexStates = evaluateFormRules(panels, {
      fld_budget: { currency: 'USD', value: '15000' },
      fld_capex_details: 'NEEDS_SUB_APPROVAL',
      fld_nested_child: 'SUB-123',
      fld_type: 'OPEX',
    })
    expect(opexStates.fld_capex_details.visible).toBe(false)
    expect(opexStates.fld_nested_child.visible).toBe(false)

    // Sanitize hidden field values resets hidden fields
    const sanitized = sanitizeHiddenFieldValues(panels, {
      fld_capex_details: 'NEEDS_SUB_APPROVAL',
      fld_nested_child: 'SUB-123',
      fld_type: 'OPEX',
    })
    expect(sanitized.fld_capex_details).toBe('')
    expect(sanitized.fld_nested_child).toBe('')
    expect(sanitized.fld_type).toBe('OPEX')

    // Multi-rule OR aggregation: if fld_alt_trigger is 'YES', fld_capex_details is visible even when fld_type is 'OPEX'
    const overrideStates = evaluateFormRules(panels, {
      fld_alt_trigger: 'YES',
      fld_type: 'OPEX',
    })
    expect(overrideStates.fld_capex_details.visible).toBe(true)
  })

  it('2. executes V5 conditional required (mandatorySettings) and read-only (readonlySettings + notEqual) rules and enforces them in mandatory validation', () => {
    const panels = [
      {
        fields: [
          {
            id: 'fld_payment_mode',
            label: 'Payment Mode',
            type: 'SINGLE_SELECT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: {
                fieldRule: 'REQUIRED',
                mandatorySettings: [
                  {
                    controls: ['fld_bank_account'],
                    id: 'man_wire',
                    value: 'WIRE',
                  },
                  {
                    // Second rule targeting the same field to verify OR-aggregation (V5 Bug 2 fix)
                    controls: ['fld_bank_account'],
                    id: 'man_ach',
                    value: 'ACH',
                  },
                ],
                readonlySettings: [
                  {
                    controls: ['fld_cheque_no'],
                    id: 'ro_cheque',
                    notEqual: true,
                    value: 'CHEQUE',
                  },
                ],
              },
            },
          },
          {
            id: 'fld_bank_account',
            label: 'Bank Account Number',
            type: 'SHORT_TEXT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: { fieldRule: 'OPTIONAL' },
            },
          },
          {
            id: 'fld_cheque_no',
            label: 'Cheque Number',
            type: 'SHORT_TEXT',
            settings: {
              general: { visibility: 'NORMAL' },
              validation: { fieldRule: 'REQUIRED' },
            },
          },
        ],
        id: 'panel_pay',
        settings: { title: 'Payment' },
      },
    ]

    // When Payment Mode is WIRE:
    // - fld_bank_account becomes required (even though second rule 'ACH' does not match!)
    // - fld_cheque_no is locked (disabled = true) because Payment Mode !== 'CHEQUE' (notEqual: true)
    const wireModel = { fld_payment_mode: 'WIRE' }
    const wireStates = evaluateFormRules(panels, wireModel)
    expect(wireStates.fld_bank_account.required).toBe(true)
    expect(wireStates.fld_cheque_no.disabled).toBe(true)

    // Observable validation: fld_bank_account is reported missing, while fld_cheque_no is skipped because it is disabled!
    const missingForWire = getMissingMandatoryFieldsList([], panels, wireModel)
    expect(missingForWire.map((m) => m.id)).toEqual(['fld_bank_account'])

    // When Payment Mode is CHEQUE:
    // - fld_bank_account is optional
    // - fld_cheque_no is enabled (disabled = false) and required
    const chequeModel = { fld_payment_mode: 'CHEQUE' }
    const chequeStates = evaluateFormRules(panels, chequeModel)
    expect(chequeStates.fld_bank_account.required).toBe(false)
    expect(chequeStates.fld_cheque_no.disabled).toBe(false)

    const missingForCheque = getMissingMandatoryFieldsList(
      [],
      panels,
      chequeModel,
    )
    expect(missingForCheque.map((m) => m.id)).toEqual(['fld_cheque_no'])
  })

  it('3. evaluates multiple conditions combined with AND/OR, nested parentheses, field-to-field comparisons, and empty/null/zero/boolean edge cases', () => {
    // Expression: (dept == 'FINANCE' AND amount >= minLimit) OR (priority == 'CRITICAL' AND (region IN ['US', 'EU'] OR override == true))
    const conditions = [
      { name: 'LEFT_PARANTHESES', value: '(' },
      {
        logic: 'IS_EQUALS_TO (=)',
        name: 'fld_dept',
        value: 'FINANCE',
      },
      {
        condition: 'AND',
        fieldValue: true,
        logic: 'IS_GREATER_THAN_OR_EQUALS_TO (>=)',
        name: 'fld_amount',
        value: 'fld_min_limit',
      },
      { name: 'RIGHT_PARANTHESES', value: ')' },
      { type: 'OR' },
      { name: 'LEFT_PARANTHESES', value: '(' },
      {
        logic: 'IS_EQUALS_TO (=)',
        name: 'fld_priority',
        value: 'CRITICAL',
      },
      { type: 'AND' },
      { name: 'LEFT_PARANTHESES', value: '(' },
      {
        logic: 'IS_ANY_OF',
        name: 'fld_region',
        value: 'US, EU',
      },
      {
        condition: 'OR',
        logic: 'IS_EQUALS_TO (=)',
        name: 'fld_override',
        value: true,
      },
      { name: 'RIGHT_PARANTHESES', value: ')' },
      { name: 'RIGHT_PARANTHESES', value: ')' },
    ]

    // Branch 1 matches: FINANCE and amount (500) >= minLimit (500)
    expect(
      evaluateRuleConditions(conditions, {
        fld_amount: { currency: 'USD', value: 500 },
        fld_dept: 'FINANCE',
        fld_min_limit: 500,
        fld_priority: 'LOW',
      }),
    ).toBe(true)

    // Branch 1 fails (amount 400 < 500), Branch 2 fails (priority LOW)
    expect(
      evaluateRuleConditions(conditions, {
        fld_amount: { currency: 'USD', value: 400 },
        fld_dept: 'FINANCE',
        fld_min_limit: 500,
        fld_priority: 'LOW',
      }),
    ).toBe(false)

    // Branch 2 matches via nested (region == 'EU')
    expect(
      evaluateRuleConditions(conditions, {
        fld_amount: 100,
        fld_dept: 'HR',
        fld_min_limit: 500,
        fld_priority: 'CRITICAL',
        fld_region: 'EU',
      }),
    ).toBe(true)

    // Branch 2 matches via nested (override == true)
    expect(
      evaluateRuleConditions(conditions, {
        fld_amount: 100,
        fld_dept: 'HR',
        fld_min_limit: 500,
        fld_override: true,
        fld_priority: 'CRITICAL',
        fld_region: 'APAC',
      }),
    ).toBe(true)

    // Edge cases: empty/null/missing must NOT satisfy LESS_THAN (<), whereas numeric 0 MUST satisfy LESS_THAN (<)
    const ltCondition = [
      {
        logic: 'IS_LESSER_THAN (<)',
        name: 'fld_score',
        value: '10',
      },
    ]
    expect(evaluateRuleConditions(ltCondition, {})).toBe(false)
    expect(evaluateRuleConditions(ltCondition, { fld_score: '' })).toBe(false)
    expect(evaluateRuleConditions(ltCondition, { fld_score: null })).toBe(false)
    expect(evaluateRuleConditions(ltCondition, { fld_score: 0 })).toBe(true)
    expect(evaluateRuleConditions(ltCondition, { fld_score: '0' })).toBe(true)
  })

  it('4. evaluates field formulas with arithmetic operator precedence and nested parentheses', () => {
    const fields = [
      { id: 'f_a', label: 'A', type: 'NUMBER' },
      { id: 'f_b', label: 'B', type: 'CURRENCY_AMOUNT' },
      { id: 'f_c', label: 'C', type: 'NUMBER' },
      { id: 'f_d', label: 'D', type: 'NUMBER' },
      { id: 'f_e', label: 'E', type: 'NUMBER' },
    ]

    // Formula: ((f_a + f_b) * (f_c - f_d)) / f_e + 10 * 2
    // With f_a=20, f_b={currency:'USD', value:'30'}, f_c=15, f_d=3, f_e=6:
    // ((20 + 30) * (15 - 3)) / 6 + 20 = (50 * 12) / 6 + 20 = 100 + 20 = 120
    const tokens = [
      { name: 'LEFT_PARANTHESES', value: '(' },
      { name: 'LEFT_PARANTHESES', value: '(' },
      { name: 'FIELD', value: 'f_a' },
      { name: 'PLUS', value: '+' },
      { name: 'FIELD', value: 'f_b' },
      { name: 'RIGHT_PARANTHESES', value: ')' },
      { name: 'MULTIPLY', value: '*' },
      { name: 'LEFT_PARANTHESES', value: '(' },
      { name: 'FIELD', value: 'f_c' },
      { name: 'MINUS', value: '-' },
      { name: 'FIELD', value: 'f_d' },
      { name: 'RIGHT_PARANTHESES', value: ')' },
      { name: 'RIGHT_PARANTHESES', value: ')' },
      { name: 'DIVIDE', value: '/' },
      { name: 'FIELD', value: 'f_e' },
      { name: 'PLUS', value: '+' },
      { name: 'NUMBER', value: '10' },
      { name: 'MULTIPLY', value: '*' },
      { name: 'NUMBER', value: '2' },
    ]

    const result = evaluateFormula(
      tokens,
      {
        f_a: 20,
        f_b: { currency: 'USD', value: '30' },
        f_c: 15,
        f_d: 3,
        f_e: 6,
      },
      fields,
    )
    expect(result).toBe(120)
  })

  it('5. evaluates a table-column sum referenced from a form-level field and recalculates when table rows change', () => {
    // Also verify decodeTableSumValue supports both '::' and ':' and 'SUM OF '
    expect(decodeTableSumValue('tbl_1::col_1')).toEqual({
      columnId: 'col_1',
      tableFieldId: 'tbl_1',
    })
    expect(decodeTableSumValue('tbl_1:col_1')).toEqual({
      columnId: 'col_1',
      tableFieldId: 'tbl_1',
    })
    expect(decodeTableSumValue('SUM OF col_1')).toEqual({
      columnId: 'col_1',
      tableFieldId: '',
    })

    const panels: any[] = [
      {
        fields: [
          {
            id: 'fld_shipping',
            label: 'Shipping',
            type: 'NUMBER',
            settings: { general: {}, specific: {}, validation: {} },
          },
          {
            id: 'fld_items',
            label: 'Items Table',
            type: 'TABLE',
            settings: {
              general: {},
              specific: {
                tableColumns: [
                  { id: 'c_price', name: 'Price', type: 'NUMBER' },
                  { id: 'c_qty', name: 'Qty', type: 'NUMBER' },
                  {
                    id: 'c_row_total',
                    name: 'Row Total',
                    type: 'CALCULATED',
                    settings: {
                      specific: {
                        formulaTokens: [
                          { type: 'FIELD', value: 'c_price' },
                          { type: 'OPERATOR', value: '*' },
                          { type: 'FIELD', value: 'c_qty' },
                        ],
                      },
                      validation: { decimalValue: 2 },
                    },
                  },
                ],
              },
              validation: {},
            },
          },
          {
            id: 'fld_invoice_total',
            label: 'Invoice Total',
            type: 'CALCULATED',
            settings: {
              general: {},
              specific: {
                formulaTokens: [
                  { type: 'FIELD', value: 'fld_shipping' },
                  { type: 'OPERATOR', value: '+' },
                  { type: 'TABLE_SUM', value: 'fld_items::c_row_total' },
                ],
              },
              validation: { decimalValue: 2 },
            },
          },
        ],
        id: 'p_main',
        settings: { title: 'Invoice' },
      },
    ]

    // Pass 1: 2 rows -> (10 * 3 = 30.00) + (25.5 * 2 = 51.00) + shipping 19 = 100.00
    const computed1 = applyCalculatedFields(panels, {
      fld_items: [
        { c_price: 10, c_qty: 3 },
        { c_price: 25.5, c_qty: 2 },
      ],
      fld_shipping: 19,
    })

    expect((computed1.fld_items as any[])[0].c_row_total).toBe('30.00')
    expect((computed1.fld_items as any[])[1].c_row_total).toBe('51.00')
    expect(computed1.fld_invoice_total).toBe('100.00')

    // Pass 2: Add a 3rd row and change shipping -> recalculates both row totals and grand total
    const computed2 = applyCalculatedFields(panels, {
      ...computed1,
      fld_items: [...(computed1.fld_items as any[]), { c_price: 50, c_qty: 1 }],
      fld_shipping: 0,
    })

    expect((computed2.fld_items as any[])[2].c_row_total).toBe('50.00')
    expect(computed2.fld_invoice_total).toBe('131.00')
  })

  it('6. evaluates a conditional formula and recalculates when its condition changes', () => {
    const panels: any[] = [
      {
        fields: [
          {
            id: 'fld_subtotal',
            label: 'Subtotal',
            type: 'NUMBER',
            settings: { general: {}, specific: {}, validation: {} },
          },
          {
            id: 'fld_tier',
            label: 'Customer Tier',
            type: 'SINGLE_SELECT',
            settings: { general: {}, specific: {}, validation: {} },
          },
          {
            id: 'fld_final_amount',
            label: 'Final Amount',
            type: 'CALCULATED',
            settings: {
              general: {},
              specific: {},
              validation: { decimalValue: 2 },
            },
          },
        ],
        id: 'p_cond',
        settings: { title: 'Pricing' },
      },
    ]

    const rules = [
      {
        calculations: [
          {
            columnId: '',
            fieldId: 'fld_final_amount',
            formula: [
              {
                id: 't1',
                label: 'Subtotal',
                name: 'FIELD',
                value: 'fld_subtotal',
              },
            ],
            id: 'c_base',
          },
        ],
        conditions: [],
        groupLogic: 'ALL',
        id: 'r_base',
        isConditionalRule: false,
        name: 'Standard Price',
      },
      {
        calculations: [
          {
            columnId: '',
            fieldId: 'fld_final_amount',
            formula: [
              {
                id: 't2',
                label: 'Subtotal',
                name: 'FIELD',
                value: 'fld_subtotal',
              },
              { id: 't3', label: '*', name: 'MULTIPLY', value: '*' },
              { id: 't4', label: 'Number', name: 'NUMBER', value: '0.8' },
            ],
            id: 'c_vip',
          },
        ],
        conditions: [
          {
            fieldValue: false,
            id: 'cond_vip',
            logic: 'IS_EQUALS_TO (=)',
            name: 'fld_tier',
            value: 'VIP',
          },
          {
            fieldValue: false,
            id: 'cond_min',
            logic: 'IS_GREATER_THAN_OR_EQUALS_TO (>=)',
            name: 'fld_subtotal',
            value: '1000',
          },
        ],
        groupLogic: 'ALL',
        id: 'r_vip',
        isConditionalRule: true,
        name: 'VIP 20% Discount',
      },
    ]

    // 1. Standard tier -> unconditional formula (1200.00)
    const state1 = applyCalculatedFields(
      panels,
      { fld_subtotal: 1200, fld_tier: 'STANDARD' },
      rules,
    )
    expect(state1.fld_final_amount).toBe('1200.00')

    // 2. Change tier to VIP with subtotal 1200 (>= 1000) -> conditional formula applies (960.00)
    const state2 = applyCalculatedFields(
      panels,
      { ...state1, fld_tier: 'VIP' },
      rules,
    )
    expect(state2.fld_final_amount).toBe('960.00')

    // 3. Lower subtotal to 500 (< 1000) -> conditional rule becomes false, falls back to base formula (500.00)
    const state3 = applyCalculatedFields(
      panels,
      { ...state2, fld_subtotal: 500 },
      rules,
    )
    expect(state3.fld_final_amount).toBe('500.00')
  })

  it('7. handles empty or invalid operands and division by zero safely without NaN or Infinity', () => {
    const fields = [
      { id: 'f_num', label: 'Numerator', type: 'NUMBER' },
      { id: 'f_den', label: 'Denominator', type: 'NUMBER' },
    ]
    const divTokens = [
      { type: 'FIELD' as const, value: 'f_num' },
      { type: 'OPERATOR' as const, value: '/' },
      { type: 'FIELD' as const, value: 'f_den' },
    ]

    // Missing / empty / null / non-numeric string operands -> null
    expect(evaluateFormula(divTokens, {}, fields)).toBeNull()
    expect(
      evaluateFormula(divTokens, { f_den: 5, f_num: '' }, fields),
    ).toBeNull()
    expect(
      evaluateFormula(divTokens, { f_den: 5, f_num: null }, fields),
    ).toBeNull()
    expect(
      evaluateFormula(divTokens, { f_den: 5, f_num: 'invalid_abc' }, fields),
    ).toBeNull()
    expect(
      evaluateFormula(divTokens, { f_den: 5, f_num: '12abc' }, fields),
    ).toBeNull()

    // Division by zero -> null
    expect(
      evaluateFormula(divTokens, { f_den: 0, f_num: 100 }, fields),
    ).toBeNull()
    expect(
      evaluateFormula(divTokens, { f_den: '0', f_num: 100 }, fields),
    ).toBeNull()

    // In applyCalculatedFields, division by zero or invalid operands produce ''
    const panels: any[] = [
      {
        fields: [
          ...fields,
          {
            id: 'f_ratio',
            label: 'Ratio',
            type: 'CALCULATED',
            settings: {
              specific: { formulaTokens: divTokens },
              validation: { decimalValue: 2 },
            },
          },
        ],
        id: 'p_div',
        settings: { title: 'Division' },
      },
    ]

    const validRes = applyCalculatedFields(panels, { f_den: 4, f_num: 10 })
    expect(validRes.f_ratio).toBe('2.50')

    const zeroDivRes = applyCalculatedFields(panels, {
      ...validRes,
      f_den: 0,
    })
    expect(zeroDivRes.f_ratio).toBe('')
  })

  it('8. preserves full rule and formula runtime behavior when a V5 form is loaded through the adapter, saved, and reloaded', () => {
    const rawV5FormJson = {
      panels: [
        {
          fields: [
            {
              id: 'fld_dept',
              label: 'Department',
              type: 'SINGLE_SELECT',
              settings: {
                general: { visibility: 'NORMAL' },
                specific: {},
                validation: {
                  enableSettings: [
                    {
                      controls: ['fld_tax_id'],
                      id: 'en_tax',
                      value: 'FINANCE',
                    },
                  ],
                  fieldRule: 'REQUIRED',
                  mandatorySettings: [
                    {
                      controls: ['fld_cost_center'],
                      id: 'man_cc',
                      value: 'FINANCE',
                    },
                  ],
                  readonlySettings: [
                    {
                      controls: ['fld_notes'],
                      id: 'ro_notes',
                      notEqual: true,
                      value: 'FINANCE',
                    },
                  ],
                },
              },
            },
            {
              id: 'fld_tax_id',
              label: 'Tax ID',
              type: 'SHORT_TEXT',
              settings: {
                general: { visibility: 'NORMAL' },
                specific: {},
                validation: { fieldRule: 'OPTIONAL' },
              },
            },
            {
              id: 'fld_cost_center',
              label: 'Cost Center',
              type: 'SHORT_TEXT',
              settings: {
                general: { visibility: 'NORMAL' },
                specific: {},
                validation: { fieldRule: 'OPTIONAL' },
              },
            },
            {
              id: 'fld_notes',
              label: 'Finance Notes',
              type: 'SHORT_TEXT',
              settings: {
                general: { visibility: 'NORMAL' },
                specific: {},
                validation: { fieldRule: 'OPTIONAL' },
              },
            },
            {
              id: 'fld_fee',
              label: 'Handling Fee',
              type: 'CURRENCY_AMOUNT',
              settings: {
                general: { visibility: 'NORMAL' },
                specific: {},
                validation: { fieldRule: 'OPTIONAL' },
              },
            },
            {
              id: 'fld_table',
              label: 'Line Items',
              type: 'TABLE',
              settings: {
                general: { visibility: 'NORMAL' },
                specific: {
                  tableColumns: [
                    {
                      id: 'col_price',
                      label: 'Price',
                      type: 'NUMBER',
                      settings: { general: {}, specific: {}, validation: {} },
                    },
                    {
                      id: 'col_qty',
                      label: 'Qty',
                      type: 'NUMBER',
                      settings: { general: {}, specific: {}, validation: {} },
                    },
                    {
                      id: 'col_total',
                      label: 'Total',
                      type: 'CALCULATED',
                      settings: {
                        general: { visibility: 'READ_ONLY' },
                        specific: {},
                        validation: { decimalValue: 2 },
                      },
                    },
                  ],
                },
                validation: { fieldRule: 'OPTIONAL' },
              },
            },
            {
              id: 'fld_grand_total',
              label: 'Grand Total',
              type: 'CALCULATED',
              settings: {
                general: { visibility: 'READ_ONLY' },
                specific: {},
                validation: { decimalValue: 2 },
              },
            },
          ],
          id: 'p_1',
          settings: { title: 'Main' },
        },
      ],
      settings: {
        general: {
          layout: 'CLASSIC',
          name: 'V5 Roundtrip Rules Form',
          type: 'WORKFLOW',
        },
        publish: { publishOption: 'IMMEDIATE' },
        rules: [
          {
            calculations: [
              {
                columnId: 'col_total',
                fieldId: 'fld_table',
                formula: [
                  {
                    id: '1',
                    label: 'Price',
                    name: 'FIELD',
                    value: 'col_price',
                  },
                  { id: '2', label: '*', name: 'MULTIPLY', value: '*' },
                  { id: '3', label: 'Qty', name: 'FIELD', value: 'col_qty' },
                ],
                id: 'calc_tbl',
              },
              {
                columnId: '',
                fieldId: 'fld_grand_total',
                formula: [
                  {
                    id: '4',
                    label: 'Handling Fee',
                    name: 'FIELD',
                    value: 'fld_fee',
                  },
                  { id: '5', label: '+', name: 'PLUS', value: '+' },
                  {
                    id: '6',
                    label: 'Total',
                    name: 'FIELD',
                    value: 'col_total',
                  },
                ],
                id: 'calc_grand',
              },
            ],
            conditions: [],
            groupLogic: 'ANY',
            id: 'rule_base',
            isConditionalRule: false,
            name: 'Base Calculations',
          },
          {
            calculations: [
              {
                columnId: '',
                fieldId: 'fld_grand_total',
                formula: [
                  { id: '7', label: 'Number', name: 'NUMBER', value: '0' },
                ],
                id: 'calc_waived',
              },
            ],
            conditions: [
              {
                fieldValue: false,
                id: 'cond_internal',
                logic: 'IS_EQUALS_TO (=)',
                name: 'fld_dept',
                value: 'INTERNAL',
              },
            ],
            groupLogic: 'ALL',
            id: 'rule_waived',
            isConditionalRule: true,
            name: 'Waive Total for Internal',
          },
        ],
      },
    }

    // 1. Load into store, serialize, reset, and reload
    useFormStore.getState().loadForm({ formJson: rawV5FormJson })
    const savedPayload = cleanFormPayload(useFormStore.getState())
    useFormStore.getState().resetForm()
    useFormStore.getState().loadForm({ formJson: savedPayload })

    const reloadedPanels = useFormStore.getState().panels

    // 2. Verify rule behavior after reload when Department = 'HR'
    const hrModel = {
      fld_dept: 'HR',
      fld_fee: { currency: 'USD', value: 25 },
      fld_table: [
        { col_price: 40, col_qty: 2 },
        { col_price: 15, col_qty: 3 },
      ],
    }
    const hrStates = evaluateFormRules(reloadedPanels, hrModel)
    expect(hrStates.fld_tax_id.visible).toBe(false)
    expect(hrStates.fld_cost_center.required).toBe(false)
    expect(hrStates.fld_notes.disabled).toBe(true)

    const hrCalculated = applyCalculatedFields(reloadedPanels, hrModel)
    expect((hrCalculated.fld_table as any[])[0].col_total).toBe('80.00')
    expect((hrCalculated.fld_table as any[])[1].col_total).toBe('45.00')
    expect(hrCalculated.fld_grand_total).toBe('150.00')

    // 3. Verify rule behavior after reload when Department = 'FINANCE'
    const finModel = { ...hrCalculated, fld_dept: 'FINANCE' }
    const finStates = evaluateFormRules(reloadedPanels, finModel)
    expect(finStates.fld_tax_id.visible).toBe(true)
    expect(finStates.fld_cost_center.required).toBe(true)
    expect(finStates.fld_notes.disabled).toBe(false)

    // 4. Verify conditional calculation override when Department = 'INTERNAL'
    const internalCalculated = applyCalculatedFields(reloadedPanels, {
      ...hrCalculated,
      fld_dept: 'INTERNAL',
    })
    expect(internalCalculated.fld_grand_total).toBe('0.00')
  })
})
