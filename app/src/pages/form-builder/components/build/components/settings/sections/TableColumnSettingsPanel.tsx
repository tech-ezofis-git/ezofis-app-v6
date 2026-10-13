import type { ComponentProps } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  Question,
  QuestionType,
} from '@/pages/form-builder/store/formStore'
import { getRepositoryItemFilterFields } from '@/api/v6/folder/folder'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import FormulaBuilder from './FormulaBuilder'

const SUMMABLE_COLUMN_TYPES: QuestionType[] = [
  'NUMBER',
  'COUNTER',
  'CURRENCY_AMOUNT',
  'CALCULATED',
]

const CONTENT_RULE_OPTIONS = [
  { id: 'TEXT', name: 'Text' },
  { id: 'ALPHA', name: 'Alpha' },
  { id: 'ALPHA_SPACES', name: 'Alpha Spaces' },
  { id: 'ALPHA_DASH', name: 'Alpha Dash' },
  { id: 'ALPHA_NUMERIC', name: 'Alpha Numeric' },
  { id: 'EMAIL', name: 'Email' },
  { id: 'WEB', name: 'Web' },
  { id: 'INTEGER', name: 'Integer' },
  { id: 'DECIMAL', name: 'Decimal' },
]

const VALIDATABLE_COLUMN_TYPES: QuestionType[] = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'COUNTER',
]

const DEFAULT_VALUE_TYPE_OPTIONS = [
  { id: 'CUSTOM', name: 'Static Value' },
  { id: 'USER_EMAIL', name: "Logged in user's email" },
  { id: 'CURRENT_DATE', name: 'Current date' },
  { id: 'AUTO_SEQUENCE', name: 'Auto-generated sequence (1, 2, 3...)' },
]

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

const OPTIONS_SOURCE = {
  API: 2,
  LOOKUP: 1,
} as const

const optionsSourceRadio = [
  {
    description: 'Load options from a repository field',
    id: OPTIONS_SOURCE.LOOKUP,
    name: 'Lookup',
  },
  {
    description: 'Load DATA From API',
    id: OPTIONS_SOURCE.API,
    name: 'API',
  },
]

export type TableColumn = NonNullable<
  Question['settings']['specific']['tableColumns']
>[number]

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>

interface Props {
  column: TableColumn
  repositories?: { id: string; name: string }[]
  siblingColumns?: TableColumn[]
  onUpdate: (patch: ColumnSettingsPatch) => void
}

const OPTIONS_COLUMN_TYPES: QuestionType[] = [
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
]

// Builds a minimal Question-shaped stand-in so the shared FormulaBuilder
// (designed for top-level fields) can be reused as-is for a table column —
// it only ever reads id/label/type/settings.specific.formulaTokens off what
// it's given.
const toPseudoQuestion = (col: TableColumn): Question =>
  ({
    id: col.id,
    label: col.name,
    type: col.type,
    settings: {
      general: { hideLabel: false, size: 'col-6', visibility: 'NORMAL' },
      lookupSettings: {},
      specific: { formulaTokens: col.settings?.specific?.formulaTokens || [] },
      validation: { fieldRule: 'OPTIONAL' },
    },
  }) as unknown as Question

const TableColumnSettingsPanel = ({
  column,
  repositories = [],
  siblingColumns = [],
  onUpdate,
}: Props) => {
  const isRequired = column.settings?.validation?.fieldRule === 'REQUIRED'
  const displayLabel = column.settings?.general?.displayLabel || ''
  const tooltip = column.settings?.general?.tooltip || ''
  const visibility = column.settings?.general?.visibility || 'NORMAL'
  const placeholder = column.settings?.specific?.placeholder || ''
  const customOptions = column.settings?.specific?.customOptions || ''
  const showOptions = OPTIONS_COLUMN_TYPES.includes(column.type)
  const isCalculated = column.type === 'CALCULATED'
  const isSummable = SUMMABLE_COLUMN_TYPES.includes(column.type)
  const isValidatable = VALIDATABLE_COLUMN_TYPES.includes(column.type)
  const customDefaultValue = column.settings?.specific?.customDefaultValue || ''
  const defaultValueType = column.settings?.specific?.defaultValueType || 'CUSTOM'
  const showColumnTotal = Boolean(column.settings?.specific?.showColumnTotal)
  const contentRule = column.settings?.validation?.contentRule || 'TEXT'
  const minimum = column.settings?.validation?.minimum ?? ''
  const maximum = column.settings?.validation?.maximum ?? ''

  const repositoryId = column.settings?.lookupSettings?.repositoryId || ''
  const repositoryField = column.settings?.lookupSettings?.repositoryField || ''
  const cascadeFromColumn =
    column.settings?.lookupSettings?.cascadeFromColumn || ''
  const optionsSource =
    column.settings?.lookupSettings?.optionsSource === 'API' ? 'API' : 'LOOKUP'
  const optionsSourceId =
    optionsSource === 'API' ? OPTIONS_SOURCE.API : OPTIONS_SOURCE.LOOKUP

  const { data: repositoryFields = [] } = useQuery({
    enabled: showOptions && optionsSource === 'LOOKUP' && !!repositoryId,
    queryKey: ['tableColumnRepositoryFields', repositoryId],
    queryFn: async () => {
      if (!repositoryId) return []
      const res = await getRepositoryItemFilterFields(repositoryId)
      return res.data?.fields || []
    },
  })

  const pseudoQuestion = toPseudoQuestion(column)
  const pseudoSiblingFields = siblingColumns.map(toPseudoQuestion)

  return (
    <div className='animate-in fade-in slide-in-from-top-1 space-y-3 duration-200'>
      <InputText
        label='Display Label'
        placeholder='Alternative header shown to end-users'
        value={displayLabel}
        onChange={(value: string) =>
          onUpdate({ general: { displayLabel: value } })
        }
      />

      <InputSelect
        label='Visibility'
        options={[
          { id: 'NORMAL', name: 'Normal (Editable)' },
          { id: 'READ_ONLY', name: 'Read Only (Visible but locked)' },
          { id: 'DISABLE', name: 'Disable (Grayed out)' },
          { id: 'HIDDEN', name: 'Hidden (Not shown in table)' },
        ]}
        value={
          {
            NORMAL: { id: 'NORMAL', name: 'Normal (Editable)' },
            READ_ONLY: { id: 'READ_ONLY', name: 'Read Only (Visible but locked)' },
            DISABLE: { id: 'DISABLE', name: 'Disable (Grayed out)' },
            HIDDEN: { id: 'HIDDEN', name: 'Hidden (Not shown in table)' },
          }[visibility] || { id: 'NORMAL', name: 'Normal (Editable)' }
        }
        onChange={(opt) =>
          onUpdate({
            general: { visibility: (opt?.id || 'NORMAL') as any },
          })
        }
      />

      <InputText
        label='Tooltip'
        placeholder='Info shown beside the column header'
        value={tooltip}
        onChange={(value: string) => onUpdate({ general: { tooltip: value } })}
      />

      <InputSwitch
        checked={isRequired}
        label='Required'
        onChange={(checked) =>
          onUpdate({
            validation: { fieldRule: checked ? 'REQUIRED' : 'OPTIONAL' },
          })
        }
      />

      <InputText
        label='Placeholder'
        placeholder='e.g. Enter value...'
        value={placeholder}
        onChange={(value: string) =>
          onUpdate({ specific: { placeholder: value } })
        }
      />

      {showOptions && (
        <>
          <InputTextarea
            description='Comma-separated list of options shown for this column. Ignored when Lookup or API is configured below.'
            label='Options'
            placeholder='Option 1, Option 2, Option 3'
            rows={2}
            value={customOptions}
            onChange={(value: string) =>
              onUpdate({ specific: { customOptions: value } })
            }
          />

          <div className='space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5'>
            <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
              Options Source
            </label>
            <InputRadioGroup
              options={optionsSourceRadio}
              optionsPerLine={2}
              value={optionsSourceId}
              onChange={(id) =>
                onUpdate({
                  lookupSettings: {
                    optionsSource: id === OPTIONS_SOURCE.API ? 'API' : 'LOOKUP',
                    ...(id === OPTIONS_SOURCE.API
                      ? { repositoryField: '', repositoryId: '' }
                      : {}),
                  },
                })
              }
            />

            {optionsSource === 'LOOKUP' ? (
              <>
                <label className='mt-1 block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
                  Lookup
                </label>
                <InputSelect
                  options={repositories}
                  placeholder='Select a repository'
                  value={
                    repositories.find((r) => r.id === repositoryId) || null
                  }
                  onChange={(opt) =>
                    onUpdate({
                      lookupSettings: {
                        optionsSource: 'LOOKUP',
                        repositoryField: '',
                        repositoryId: opt?.id != null ? String(opt.id) : '',
                      },
                    })
                  }
                />
                <InputSelect
                  disabled={!repositoryId}
                  options={repositoryFields.map((f: any) => ({
                    id: f.name,
                    name: f.name,
                  }))}
                  placeholder={
                    repositoryId
                      ? 'Select a field'
                      : 'Select a repository first'
                  }
                  value={
                    repositoryFields.find(
                      (f: any) => f.name === repositoryField,
                    )
                      ? { id: repositoryField, name: repositoryField }
                      : null
                  }
                  onChange={(opt) =>
                    onUpdate({
                      lookupSettings: {
                        optionsSource: 'LOOKUP',
                        repositoryField: opt?.id != null ? String(opt.id) : '',
                      },
                    })
                  }
                />

                <label className='mt-1 block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
                  Filter by column (cascade, optional)
                </label>
                <InputSelect
                  clearable
                  options={siblingColumns.map((c) => ({
                    id: c.id,
                    name: c.name || 'Column',
                  }))}
                  placeholder='No cascade — show all options'
                  value={
                    siblingColumns
                      .map((c) => ({ id: c.id, name: c.name || 'Column' }))
                      .find((c) => c.id === cascadeFromColumn) || null
                  }
                  onChange={(opt) =>
                    onUpdate({
                      lookupSettings: {
                        cascadeFromColumn: opt?.id ? String(opt.id) : '',
                      },
                    })
                  }
                />
                <div className='text-[10px] text-gray-6 italic'>
                  When set, this column only shows options matching the
                  selected row&apos;s value in that other column.
                </div>
              </>
            ) : (
              <p className='text-11 leading-relaxed text-gray-9'>
                On focus, loads Data from API
              </p>
            )}
          </div>
        </>
      )}

      {isCalculated && (
        <div className='space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5'>
          <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
            Formula (uses this row&apos;s other columns)
          </label>
          <FormulaBuilder
            activeQuestion={pseudoQuestion}
            fields={pseudoSiblingFields}
            onChange={(tokens) =>
              onUpdate({ specific: { formulaTokens: tokens } })
            }
          />
        </div>
      )}

      {!isCalculated && !showOptions && (
        <div className='space-y-2'>
          <InputSelect
            label='Default Value'
            options={DEFAULT_VALUE_TYPE_OPTIONS}
            value={
              DEFAULT_VALUE_TYPE_OPTIONS.find(
                (o) => o.id === defaultValueType,
              ) || DEFAULT_VALUE_TYPE_OPTIONS[0]
            }
            onChange={(opt) =>
              onUpdate({
                specific: { defaultValueType: (opt?.id || 'CUSTOM') as any },
              })
            }
          />
          {defaultValueType === 'CUSTOM' && (
            <InputText
              placeholder='Static value pre-filled on new rows'
              value={customDefaultValue}
              onChange={(value: string) =>
                onUpdate({ specific: { customDefaultValue: value } })
              }
            />
          )}
          {defaultValueType !== 'CUSTOM' && (
            <div className='text-[10px] text-gray-6 italic'>
              {
                DEFAULT_VALUE_TYPE_OPTIONS.find(
                  (o) => o.id === defaultValueType,
                )?.name
              }{' '}
              is filled in automatically when a new row is added.
            </div>
          )}
        </div>
      )}

      {isSummable && (
        <InputSwitch
          checked={showColumnTotal}
          description='Include this column in the table footer sum (when the table-level "Show Totals" setting is on)'
          label='Show column total'
          onChange={(checked) =>
            onUpdate({ specific: { showColumnTotal: checked } })
          }
        />
      )}

      {isValidatable && (
        <div className='space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5'>
          <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
            Validation
          </label>
          <InputSelect
            label='Content Rule'
            options={
              column.type === 'NUMBER' || column.type === 'COUNTER'
                ? CONTENT_RULE_OPTIONS.filter((o) =>
                    ['INTEGER', 'DECIMAL'].includes(o.id),
                  )
                : CONTENT_RULE_OPTIONS.filter(
                    (o) => !['INTEGER', 'DECIMAL'].includes(o.id),
                  )
            }
            value={
              CONTENT_RULE_OPTIONS.find((o) => o.id === contentRule) || null
            }
            onChange={(opt) =>
              onUpdate({ validation: { contentRule: String(opt?.id || '') } })
            }
          />
          <div className='grid grid-cols-2 gap-2'>
            <InputNumber
              value={minimum}
              label={
                column.type === 'NUMBER' || column.type === 'COUNTER'
                  ? 'Min Value'
                  : 'Min Length'
              }
              onChange={(v) => onUpdate({ validation: { minimum: v } })}
            />
            <InputNumber
              value={maximum}
              label={
                column.type === 'NUMBER' || column.type === 'COUNTER'
                  ? 'Max Value'
                  : 'Max Length'
              }
              onChange={(v) => onUpdate({ validation: { maximum: v } })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

TableColumnSettingsPanel.displayName = 'TableColumnSettingsPanel'
export default TableColumnSettingsPanel
