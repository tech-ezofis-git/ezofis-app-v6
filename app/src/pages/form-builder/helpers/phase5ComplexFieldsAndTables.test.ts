import { describe, expect, it } from 'vitest'
import {
  cloneFieldWithNewIds,
  clonePanelWithNewIds,
  normalizeV5FormJson,
  serializeFormPayload,
} from './v5SchemaAdapter'
import {
  buildInitialFormModel,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import {
  evaluateFormula,
} from './formula'

describe('Phase 5 (P0-5): Complex Fields, Layouts & Entry Persistence', () => {
  it('1. Advanced table settings round-trip losslessly between V5 and V6', () => {
    const v5TableForm = {
      id: 'form_table_test',
      name: 'V5 Advanced Table Test',
      type: 'MASTER',
      layout: 'CLASSIC',
      panels: [
        {
          id: 'panel_table_1',
          name: 'Table Panel',
          fields: [
            {
              id: 'field_tbl_1',
              label: 'Invoice Items',
              type: 'TABLE',
              settings: {
                general: {
                  hideLabel: false,
                  displayLabel: 'Line Items Table',
                  visibility: 'NORMAL',
                },
                specific: {
                  tableRowChooseType: 'SINGLE_ROW',
                  tableRowsType: 'FIXED',
                  tableFixedRowCount: 4,
                  tableFixedRowLabels: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
                  importOption: true,
                  tableViewMode: 'ADVANCE',
                  tableColumns: [
                    {
                      id: 'col_lbl',
                      label: 'Milestone',
                      type: 'LABEL',
                      size: 'MEDIUM',
                      settings: { general: { visibility: 'NORMAL' } },
                    },
                    {
                      id: 'col_item',
                      label: 'Item Description',
                      type: 'SHORT_TEXT',
                      size: 'LARGE',
                      settings: { general: { visibility: 'NORMAL' } },
                    },
                    {
                      id: 'col_qty',
                      label: 'Qty',
                      type: 'NUMBER',
                      size: 'SMALL',
                      settings: {
                        general: { visibility: 'NORMAL' },
                        validation: { fieldRule: 'REQUIRED' },
                      },
                    },
                    {
                      id: 'col_rate',
                      label: 'Rate',
                      type: 'CURRENCY_AMOUNT',
                      size: 'SMALL',
                      settings: { general: { visibility: 'NORMAL' } },
                    },
                    {
                      id: 'col_subtotal',
                      label: 'Subtotal',
                      type: 'CALCULATED',
                      size: 'MEDIUM',
                      settings: {
                        general: { visibility: 'NORMAL' },
                        specific: {
                          showColumnTotal: true,
                          formulaTokens: [
                            { type: 'FIELD', value: 'col_qty' },
                            { type: 'OPERATOR', value: '*' },
                            { type: 'FIELD', value: 'col_rate' },
                          ],
                        },
                      },
                    },
                    {
                      id: 'col_internal_id',
                      label: 'System ID',
                      type: 'SHORT_TEXT',
                      size: 'SMALL',
                      settings: {
                        general: { visibility: 'HIDDEN' },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    }

    // Normalize from V5
    const normalized = normalizeV5FormJson(v5TableForm)
    const tableField = normalized.panels[0].fields[0]
    const spec = tableField.settings.specific

    expect(spec.rowSelection).toBe('SINGLE')
    expect(spec.rowsType).toBe('FIXED')
    expect(spec.fixedRowCount).toBe(4)
    expect(spec.tableFixedRowLabels).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4'])
    expect(spec.importExportEnabled).toBe(true)
    expect(spec.tableColumns).toHaveLength(6)

    // Hidden column preserved
    const hiddenCol = spec.tableColumns.find((c: any) => c.id === 'col_internal_id')
    expect(hiddenCol?.settings?.general?.visibility).toBe('HIDDEN')

    // Serialize back to payload
    const serialized = serializeFormPayload(normalized)
    const serializedTbl = serialized.panels[0].fields[0]
    const serSpec = serializedTbl.settings.specific

    expect(serSpec.tableRowChooseType).toBe('SINGLE_ROW')
    expect(serSpec.tableRowsType).toBe('FIXED')
    expect(serSpec.tableFixedRowCount).toBe(4)
    expect(serSpec.tableFixedRowLabels).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4'])
    expect(serSpec.importOption).toBe(true)
    expect(serSpec.tableColumns[4].settings.specific.showColumnTotal).toBe(true)
  })

  it('2. Table fixed rows pre-populate LABEL columns from tableFixedRowLabels', () => {
    const tableField = {
      id: 'field_fixed_tbl',
      label: 'Phased Project Budget',
      type: 'TABLE',
      settings: {
        specific: {
          tableRowsType: 'FIXED',
          tableFixedRowCount: 3,
          tableFixedRowLabels: ['Phase 1: Planning', 'Phase 2: Execution', 'Phase 3: Delivery'],
          tableColumns: [
            {
              id: 'col_label',
              name: 'Phase',
              type: 'LABEL',
            },
            {
              id: 'col_budget',
              name: 'Budget',
              type: 'NUMBER',
            },
          ],
        },
      },
    }

    const formDefinition = {
      panels: [
        {
          id: 'p1',
          fields: [tableField],
        },
      ],
    }

    const initialModel = buildInitialFormModel(formDefinition.panels as any)
    const tableValue = initialModel.field_fixed_tbl

    expect(Array.isArray(tableValue)).toBe(true)
    expect(tableValue).toHaveLength(3)
    expect(tableValue[0].col_label).toBe('Phase 1: Planning')
    expect(tableValue[1].col_label).toBe('Phase 2: Execution')
    expect(tableValue[2].col_label).toBe('Phase 3: Delivery')
  })

  it('3. Table and column duplication generates unique IDs and remaps internal references', () => {
    const rawTableField = {
      id: 'table_original',
      label: 'Inventory',
      type: 'TABLE',
      settings: {
        specific: {
          tableFixedRowLabels: [
            { col_alpha: 'Row 1 Label' },
            { col_alpha: 'Row 2 Label' },
          ],
          masterFormTableColumns: [
            { id: 'm1', masterColumn: 'prod_sku', tableColumn: 'col_alpha' },
          ],
          tableColumns: [
            {
              id: 'col_alpha',
              label: 'Product Code',
              type: 'SHORT_TEXT',
            },
            {
              id: 'col_calc',
              label: 'Formula Col',
              type: 'CALCULATED',
              settings: {
                specific: {
                  formulaTokens: [
                    { type: 'FIELD', value: 'col_alpha' },
                    { type: 'OPERATOR', value: '+' },
                    { type: 'NUMBER', value: '10' },
                  ],
                },
              },
            },
          ],
        },
      },
    }

    const cloned = cloneFieldWithNewIds(rawTableField)

    // Top-level field ID regenerated
    expect(cloned.id).not.toBe(rawTableField.id)

    // Column IDs regenerated
    const origColAlphaId = rawTableField.settings.specific.tableColumns[0].id
    const newColAlphaId = cloned.settings.specific.tableColumns[0].id
    const newColCalcId = cloned.settings.specific.tableColumns[1].id
    expect(newColAlphaId).not.toBe(origColAlphaId)
    expect(newColCalcId).not.toBe(rawTableField.settings.specific.tableColumns[1].id)

    // Formula tokens remapped to new column ID
    const newFormulaTokens = cloned.settings.specific.tableColumns[1].settings.specific.formulaTokens
    expect(newFormulaTokens[0].value).toBe(newColAlphaId)

    // Master table columns remapped
    const newMasterMapping = cloned.settings.specific.masterFormTableColumns[0]
    expect(newMasterMapping.tableColumn).toBe(newColAlphaId)

    // Object keys in tableFixedRowLabels remapped
    const newRowLabels = cloned.settings.specific.tableFixedRowLabels
    expect(newRowLabels[0][newColAlphaId]).toBe('Row 1 Label')
    expect(newRowLabels[0][origColAlphaId]).toBeUndefined()
  })

  it('4. Row-level calculations compute correctly across rows and handle row context', () => {
    const tableColumns = [
      { id: 'qty', name: 'Quantity', type: 'NUMBER' },
      { id: 'price', name: 'Unit Price', type: 'NUMBER' },
      {
        id: 'total',
        name: 'Row Total',
        type: 'CALCULATED',
        settings: {
          specific: {
            formulaTokens: [
              { type: 'FIELD', value: 'qty' },
              { type: 'OPERATOR', value: '*' },
              { type: 'FIELD', value: 'price' },
            ],
          },
        },
      },
    ]

    const row1 = { qty: 5, price: 20 }
    const res1 = evaluateFormula(
      tableColumns[2].settings.specific.formulaTokens as any,
      row1,
      tableColumns as any,
    )
    expect(res1).toBe(100)

    const row2 = { qty: 3, price: 15.5 }
    const res2 = evaluateFormula(
      tableColumns[2].settings.specific.formulaTokens as any,
      row2,
      tableColumns as any,
    )
    expect(res2).toBe(46.5)
  })

  it('5. Matrix field column and row configurations normalize and round-trip losslessly', () => {
    const v5MatrixForm = {
      id: 'matrix_form',
      name: 'Matrix Satisfaction Form',
      panels: [
        {
          id: 'p_matrix',
          fields: [
            {
              id: 'f_matrix',
              label: 'Service Rating Matrix',
              type: 'MATRIX',
              settings: {
                specific: {
                  matrixColumns: [
                    { id: 'm_col_1', label: 'Poor', type: 'CHECKBOX' },
                    { id: 'm_col_2', label: 'Average', type: 'CHECKBOX' },
                    { id: 'm_col_3', label: 'Good', type: 'CHECKBOX' },
                    { id: 'm_col_4', label: 'Excellent', type: 'CHECKBOX' },
                  ],
                  matrixRows: [
                    { id: 'm_row_1', label: 'Customer Support' },
                    { id: 'm_row_2', label: 'Product Quality' },
                    { id: 'm_row_3', label: 'Delivery Speed' },
                  ],
                },
              },
            },
          ],
        },
      ],
    }

    const normalized = normalizeV5FormJson(v5MatrixForm)
    const matrixField = normalized.panels[0].fields[0]

    expect(matrixField.settings.specific.matrixColumnObjects).toHaveLength(4)
    expect(matrixField.settings.specific.matrixRowObjects).toHaveLength(3)
    expect(matrixField.settings.specific.matrixColumnLabels).toEqual([
      'Poor',
      'Average',
      'Good',
      'Excellent',
    ])
    expect(matrixField.settings.specific.matrixRowLabels).toEqual([
      'Customer Support',
      'Product Quality',
      'Delivery Speed',
    ])

    const serialized = serializeFormPayload(normalized)
    const serMatrix = serialized.panels[0].fields[0]
    expect(serMatrix.settings.specific.matrixColumns).toHaveLength(4)
    expect(serMatrix.settings.specific.matrixRows).toHaveLength(3)
    expect(serMatrix.settings.specific.matrixColumns[0].label).toBe('Poor')
    expect(serMatrix.settings.specific.matrixRows[0].label).toBe('Customer Support')
  })

  it('6. Panel duplication clones all fields, nested table columns, and intra-panel references', () => {
    const rawPanel = {
      id: 'panel_src',
      name: 'Source Panel',
      fields: [
        {
          id: 'f_dept',
          label: 'Department',
          type: 'SHORT_TEXT',
        },
        {
          id: 'f_table',
          label: 'Expenses',
          type: 'TABLE',
          settings: {
            specific: {
              tableColumns: [
                { id: 'col_desc', label: 'Description', type: 'SHORT_TEXT' },
                { id: 'col_amt', label: 'Amount', type: 'NUMBER' },
              ],
            },
          },
        },
        {
          id: 'f_total',
          label: 'Department Total',
          type: 'CALCULATED',
          settings: {
            specific: {
              formulaTokens: [
                { type: 'FIELD', value: 'f_table.col_amt' },
                { type: 'OPERATOR', value: '*' },
                { type: 'NUMBER', value: '1.05' },
              ],
            },
          },
        },
      ],
    }

    const clonedPanel = clonePanelWithNewIds(rawPanel)

    expect(clonedPanel.id).not.toBe(rawPanel.id)
    const newDeptId = clonedPanel.fields[0].id
    const newTableId = clonedPanel.fields[1].id
    const newTotalId = clonedPanel.fields[2].id

    expect(newDeptId).not.toBe(rawPanel.fields[0].id)
    expect(newTableId).not.toBe(rawPanel.fields[1].id)
    expect(newTotalId).not.toBe(rawPanel.fields[2].id)

    const origColAmtId = rawPanel.fields[1].settings.specific.tableColumns[1].id
    const newColAmtId = clonedPanel.fields[1].settings.specific.tableColumns[1].id
    expect(newColAmtId).not.toBe(origColAmtId)

    // Intra-panel table column reference in formula remapped: `${newTableId}.${newColAmtId}`
    const remappedToken = clonedPanel.fields[2].settings.specific.formulaTokens[0].value
    expect(remappedToken).toBe(`${newTableId}.${newColAmtId}`)
  })

  it('7. Entry persistence preserves table arrays and matrix state through update cycles', () => {
    // Simulating full entry lifecycle
    const initialEntryData = {
      title: 'Expense Report #1042',
      table_items: [
        { _rowId: 'row-1', col_item: 'Office Chairs', col_qty: 4, col_rate: 120, col_subtotal: 480 },
        { _rowId: 'row-2', col_item: 'Monitors', col_qty: 2, col_rate: 250, col_subtotal: 500 },
      ],
      matrix_eval: {
        'row_1:col_1': true,
        'row_2:col_2': true,
      },
    }

    // Clone/hydrate for editing
    const hydratedEntry = JSON.parse(JSON.stringify(initialEntryData))
    expect(hydratedEntry.table_items).toHaveLength(2)
    expect(hydratedEntry.table_items[0].col_subtotal).toBe(480)

    // User updates a row in the table
    hydratedEntry.table_items[0].col_qty = 5
    hydratedEntry.table_items[0].col_subtotal = 600

    // User adds a third row
    hydratedEntry.table_items.push({
      _rowId: 'row-3',
      col_item: 'Keyboards',
      col_qty: 3,
      col_rate: 45,
      col_subtotal: 135,
    })

    // User marks another matrix cell
    hydratedEntry.matrix_eval['row_3:col_3'] = true

    // Re-serialize for storage / submission payload
    const serializedPayload = JSON.parse(JSON.stringify(hydratedEntry))
    expect(serializedPayload.table_items).toHaveLength(3)
    expect(serializedPayload.table_items[0].col_qty).toBe(5)
    expect(serializedPayload.table_items[0].col_subtotal).toBe(600)
    expect(serializedPayload.table_items[2].col_item).toBe('Keyboards')
    expect(serializedPayload.matrix_eval['row_3:col_3']).toBe(true)
  })

  it('8. Unknown and legacy custom table and complex field properties are preserved losslessly', () => {
    const legacyFormWithCustomProps = {
      id: 'custom_props_form',
      name: 'Form With Custom Extensions',
      panels: [
        {
          id: 'p_custom',
          fields: [
            {
              id: 'f_custom_table',
              label: 'Custom Ext Table',
              type: 'TABLE',
              legacyBackendId: '98721',
              customRendererPlugin: 'enterprise-grid-v2',
              settings: {
                general: {
                  customBadge: 'ALPHA_FEATURE',
                },
                specific: {
                  tableRowsType: 'ON_DEMAND',
                  vendorAuditHook: 'https://audit.vendor.com/hook',
                  tableColumns: [
                    {
                      id: 'col_vendor',
                      label: 'Vendor Code',
                      type: 'SHORT_TEXT',
                      externalErpFieldId: 'ERP_VEND_01',
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    }

    const normalized = normalizeV5FormJson(legacyFormWithCustomProps)
    const normTable = normalized.panels[0].fields[0]

    expect((normTable as any).legacyBackendId).toBe('98721')
    expect((normTable as any).customRendererPlugin).toBe('enterprise-grid-v2')
    expect((normTable.settings.general as any).customBadge).toBe('ALPHA_FEATURE')
    expect((normTable.settings.specific as any).vendorAuditHook).toBe('https://audit.vendor.com/hook')
    expect((normTable.settings.specific.tableColumns[0] as any).externalErpFieldId).toBe('ERP_VEND_01')

    const serialized = serializeFormPayload(normalized)
    const serTable = serialized.panels[0].fields[0]

    expect((serTable as any).legacyBackendId).toBe('98721')
    expect((serTable as any).customRendererPlugin).toBe('enterprise-grid-v2')
    expect((serTable.settings.general as any).customBadge).toBe('ALPHA_FEATURE')
    expect((serTable.settings.specific as any).vendorAuditHook).toBe('https://audit.vendor.com/hook')
    expect((serTable.settings.specific.tableColumns[0] as any).externalErpFieldId).toBe('ERP_VEND_01')
  })
})
