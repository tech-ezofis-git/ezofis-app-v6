import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildMasterConditions,
  fetchMasterFormColumnOptions,
} from './fieldRendering'
import formApi from '@/api/form/form'

vi.mock('@/api/form/form', () => ({
  default: {
    getFormDataById: vi.fn(),
    getFormEntries: vi.fn(),
    getFormEntriesByColumn: vi.fn(),
    searchFormEntries: vi.fn(),
  },
}))

describe('Chained Cascading Master Dropdown Filtering', () => {
  const allFields = [
    {
      id: 'field-company-unit',
      label: 'Company Unit',
      type: 'SINGLE_SELECT',
      settings: {
        specific: {
          masterFormColumn: 'Company Unit',
        },
      },
    },
    {
      id: 'field-material-code',
      label: 'Existing Product Code',
      type: 'SINGLE_SELECT',
      settings: {
        specific: {
          optionsType: 'MASTER',
          masterFormId: 'master-1',
          masterFormColumn: 'Material Code ',
          masterFormParentColumn: 'field-company-unit',
          showAllData: false,
        },
      },
    },
    {
      id: 'field-brand',
      label: 'Brand',
      type: 'SINGLE_SELECT',
      settings: {
        specific: {
          optionsType: 'MASTER',
          masterFormId: 'master-1',
          masterFormColumn: 'Brand ',
          masterFormParentColumn: 'field-material-code',
          showAllData: true,
        },
      },
    },
    {
      id: 'field-variant',
      label: 'Variant',
      type: 'SINGLE_SELECT',
      settings: {
        specific: {
          optionsType: 'MASTER',
          masterFormId: 'master-1',
          masterFormColumn: 'Varient',
          masterFormParentColumn: 'field-brand',
          showAllData: true,
        },
      },
    },
  ]

  describe('buildMasterConditions', () => {
    it('traverses the parent chain and extracts ancestor conditions with values', () => {
      const model = {
        'field-company-unit': 'Amlion Toothpaste',
        // field-material-code is empty
      }

      const conditions = buildMasterConditions(
        allFields[2], // Brand
        model,
        allFields,
      )

      expect(conditions).toEqual([
        {
          masterColumn: 'Company Unit',
          value: 'Amlion Toothpaste',
        },
      ])
    })

    it('collects multiple ancestor conditions in deep chains (e.g., Variant -> Brand -> Product Code -> Company Unit)', () => {
      const model = {
        'field-company-unit': 'Amlion Toothpaste',
        'field-brand': 'Fresh Dental',
        // field-material-code is empty
      }

      const conditions = buildMasterConditions(
        allFields[3], // Variant
        model,
        allFields,
      )

      expect(conditions).toEqual([
        {
          masterColumn: 'Brand',
          value: 'Fresh Dental',
        },
        {
          masterColumn: 'Company Unit',
          value: 'Amlion Toothpaste',
        },
      ])
    })

    it('safely handles circular parent references without infinite looping', () => {
      const circularFields = [
        {
          id: 'f1',
          label: 'F1',
          settings: { specific: { masterFormParentColumn: 'f2', masterFormColumn: 'Col1' } },
        },
        {
          id: 'f2',
          label: 'F2',
          settings: { specific: { masterFormParentColumn: 'f1', masterFormColumn: 'Col2' } },
        },
      ]

      const conditions = buildMasterConditions(
        circularFields[0],
        { f1: 'Val1', f2: 'Val2' },
        circularFields,
      )

      expect(conditions).toEqual([
        {
          masterColumn: 'Col2',
          value: 'Val2',
        },
      ])
    })
  })

  describe('fetchMasterFormColumnOptions with chained ancestor filter', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      ;(formApi.getFormDataById as any).mockResolvedValue({
        data: {
          formJson: {
            panels: [
              {
                fields: [
                  { id: 'col-cu', label: 'Company Unit' },
                  { id: 'col-mc', label: 'Material Code ' },
                  { id: 'col-br', label: 'Brand ' },
                ],
              },
            ],
          },
        },
      })
      const entries = [
        {
          formData: {
            'Company Unit': 'Amlion Toothpaste',
            'Material Code ': 'TUB-101',
            'Brand ': 'Toothpaste Brand A',
          },
        },
        {
          formData: {
            'Company Unit': 'Amlion Toothpaste',
            'Material Code ': 'PMC001',
            'Brand ': 'Toothpaste Brand B',
          },
        },
        {
          formData: {
            'Company Unit': 'Amlion Personal Care',
            'Material Code ': 'APC-001',
            'Brand ': 'Personal Care Brand X',
          },
        },
      ]
      ;(formApi.getFormEntries as any).mockResolvedValue({ data: entries })
      // Mirrors the by-column endpoint: no entries, just the requested
      // column's distinct `values` among the entries matching every filter.
      const cell = (e: (typeof entries)[number], column: string) =>
        (e.formData as Record<string, string>)[
          Object.keys(e.formData).find((k) => k.trim() === column.trim()) ||
            ''
        ]
      ;(formApi.getFormEntriesByColumn as any).mockImplementation(
        async (
          _formId: string,
          columnName: string,
          filters: { columnName: string; columnValue: string }[] = [],
        ) => ({
          data: {
            entries: null,
            values: [
              ...new Set(
                entries
                  .filter((e) =>
                    filters.every(
                      (f) => cell(e, f.columnName) === f.columnValue,
                    ),
                  )
                  .map((e) => cell(e, columnName)),
              ),
            ],
          },
          error: '',
        }),
      )
    })

    it('filters Brand options by Company Unit when immediate parent (Material Code) is empty and showAllData is true', async () => {
      const conditions = [
        {
          masterColumn: 'Company Unit',
          value: 'Amlion Toothpaste',
        },
      ]

      const options = await fetchMasterFormColumnOptions(
        'master-1',
        'Brand ',
        undefined, // immediate parent value is empty
        'Material Code ',
        true, // showAllData
        conditions,
      )

      expect(options).toEqual([
        { id: 'Toothpaste Brand A', name: 'Toothpaste Brand A' },
        { id: 'Toothpaste Brand B', name: 'Toothpaste Brand B' },
      ])
      // Personal Care Brand X should NOT be present!
      expect(options.some((o) => o.id === 'Personal Care Brand X')).toBe(false)
      // No parent value: the column, filtered by the condition mapping only
      expect(formApi.getFormEntriesByColumn).toHaveBeenCalledWith(
        'master-1',
        'Brand',
        [{ columnName: 'Company Unit', columnValue: 'Amlion Toothpaste' }],
      )
      expect(formApi.getFormEntries).not.toHaveBeenCalled()
    })

    it('further filters Brand options when immediate parent (Material Code) has a value', async () => {
      const conditions = [
        {
          masterColumn: 'Company Unit',
          value: 'Amlion Toothpaste',
        },
      ]

      const options = await fetchMasterFormColumnOptions(
        'master-1',
        'Brand ',
        'PMC001', // immediate parent value selected
        'Material Code ',
        true,
        conditions,
      )

      expect(options).toEqual([
        { id: 'Toothpaste Brand B', name: 'Toothpaste Brand B' },
      ])
      // Parent has a value: the field's column, filtered by parent = value
      // and by the condition mapping
      expect(formApi.getFormEntriesByColumn).toHaveBeenCalledWith(
        'master-1',
        'Brand',
        [
          { columnName: 'Material Code', columnValue: 'PMC001' },
          { columnName: 'Company Unit', columnValue: 'Amlion Toothpaste' },
        ],
      )
      expect(formApi.getFormEntries).not.toHaveBeenCalled()
    })

    it('returns empty list when parent is empty and showAllData is false', async () => {
      const options = await fetchMasterFormColumnOptions(
        'master-1',
        'Material Code ',
        undefined, // parent empty
        'Company Unit',
        false, // showAllData false
        [],
      )

      expect(options).toEqual([])
    })
  })
})
