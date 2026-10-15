import type { ComponentProps } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  Question,
  QuestionType,
} from '@/pages/form-builder/store/formStore'
import formApi from '@/api/form/form'
import { getRepositoryItemFilterFields } from '@/api/v6/folder/folder'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import { FILL_SYNC_COLUMN_TYPES } from '@/pages/form-builder/helpers/tableColumnFillSync'
import {
  extractFormFieldChoices,
  getColumnOptionsSource,
} from '@/pages/form-builder/helpers/tableColumnOptions'
import FormulaBuilder from './FormulaBuilder'
import TableColumnAiSettings from './TableColumnAiSettings'
import TableColumnChoiceSettings from './TableColumnChoiceSettings'
import TableColumnFormatSettings from './TableColumnFormatSettings'
import TableColumnNumberRange from './TableColumnNumberRange'
import TableColumnRuleSettings from './TableColumnRuleSettings'

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
  { id: 'COMMAS', name: 'Commas' },
  { id: 'BOTH', name: 'Both (commas and decimals)' },
]

const NUMBER_CONTENT_RULES = ['INTEGER', 'DECIMAL', 'COMMAS', 'BOTH']

const CALCULATED_RULE_OPTIONS = [
  { id: '', name: 'Any result' },
  { id: 'INTEGER', name: 'Integer (does not accept decimals)' },
  { id: 'DECIMAL', name: 'Decimal (does accept decimals)' },
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

// NUMBER / DATE / DATE_TIME columns can also take their value from another
// column of the row, or from a master table (as the top-level fields can).
const FILL_SYNC_VALUE_TYPE_OPTIONS = [
  ...DEFAULT_VALUE_TYPE_OPTIONS,
  { id: 'ASSIGN_PARENT_FIELD', name: 'Use values from another column' },
  { id: 'MASTER', name: 'Use values from a master table' },
]

const NUMBER_SOURCE_TYPES = ['NUMBER', 'COUNTER', 'CALCULATED', 'CURRENCY_AMOUNT']
const DATE_SOURCE_TYPES = ['DATE', 'DATE_TIME']

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

const OPTIONS_SOURCE = {
  API: 2,
  LOOKUP: 1,
  MASTER: 3,
  PREDEFINED: 5,
  USER_LIST: 4,
} as const

const SEPARATOR_OPTIONS = [
  { id: 'COMMA', name: 'Comma (Option 1, Option 2)' },
  { id: 'NEWLINE', name: 'New line (one option per line)' },
]

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
  {
    description: 'Load options from a master table column',
    id: OPTIONS_SOURCE.MASTER,
    name: 'Master Table',
  },
  {
    description: 'Load system user emails',
    id: OPTIONS_SOURCE.USER_LIST,
    name: 'User List',
  },
  {
    description: 'Load names from a predefined list (users or folders)',
    id: OPTIONS_SOURCE.PREDEFINED,
    name: 'Predefined List',
  },
]

const PREDEFINED_TYPE_OPTIONS = [
  { id: 'USER', name: 'User directory (emails)' },
  { id: 'FOLDER', name: 'Folders / Repositories (names)' },
]

export type TableColumn = NonNullable<
  Question['settings']['specific']['tableColumns']
>[number]

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>

interface Props {
  column: TableColumn
  masterForms?: { id: string; name: string }[]
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
  masterForms = [],
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
  const calculatedRule = column.settings?.validation?.contentRule || ''
  const minimum = column.settings?.validation?.minimum ?? ''
  const maximum = column.settings?.validation?.maximum ?? ''
  const isNumericColumn = column.type === 'NUMBER' || column.type === 'COUNTER'
  const decimalDigits = column.settings?.validation?.decimalDigits ?? ''
  const step = column.settings?.specific?.step ?? ''
  const prefixLabel = column.settings?.specific?.prefixLabel || ''
  const suffixLabel = column.settings?.specific?.suffixLabel || ''

  const repositoryId = column.settings?.lookupSettings?.repositoryId || ''
  const repositoryField = column.settings?.lookupSettings?.repositoryField || ''
  const cascadeFromColumn =
    column.settings?.lookupSettings?.cascadeFromColumn || ''
  const optionsSource = getColumnOptionsSource(column)
  const optionsSourceId = OPTIONS_SOURCE[optionsSource]
  const separator =
    column.settings?.specific?.separateOptionsUsing === 'NEWLINE'
      ? 'NEWLINE'
      : 'COMMA'
  const masterFormId = column.settings?.specific?.masterFormId || ''
  const masterFormColumn = column.settings?.specific?.masterFormColumn || ''
  const showAllData = Boolean(column.settings?.specific?.showAllData)
  const predefinedType =
    column.settings?.specific?.predefinedType === 'FOLDER' ? 'FOLDER' : 'USER'

  const { data: masterColumns = [] } = useQuery({
    enabled: showOptions && optionsSource === 'MASTER' && !!masterFormId,
    queryKey: ['tableColumnMasterFormFields', masterFormId],
    queryFn: async () => {
      const res = await formApi.getFormDataById(String(masterFormId))
      return extractFormFieldChoices(res.data)
    },
  })

  const hasFillSync = FILL_SYNC_COLUMN_TYPES.includes(String(column.type))
  const isFillMaster = hasFillSync && defaultValueType === 'MASTER'
  const isFillCopy = hasFillSync && defaultValueType === 'ASSIGN_PARENT_FIELD'
  const parentFieldId = column.settings?.specific?.parentFieldId || ''
  const isDateColumn = column.type === 'DATE' || column.type === 'DATE_TIME'

  const { data: fillMasterColumns = [] } = useQuery({
    enabled: isFillMaster && !!masterFormId,
    queryKey: ['tableColumnFillMasterFields', masterFormId],
    queryFn: async () => {
      const res = await formApi.getFormDataById(String(masterFormId))
      return extractFormFieldChoices(res.data)
    },
  })

  const fillSourceColumns = siblingColumns
    .filter((c) => {
      if (c.id === column.id) return false
      if (!isFillCopy) return true
      return (isDateColumn ? DATE_SOURCE_TYPES : NUMBER_SOURCE_TYPES).includes(
        String(c.type),
      )
    })
    .map((c) => ({ id: c.id, name: c.name || 'Column' }))

  const fillSourceSelect = (label: string) => (
    <InputSelect
      label={label}
      options={fillSourceColumns}
      placeholder='Select a column'
      value={fillSourceColumns.find((c) => c.id === parentFieldId) || null}
      onChange={(opt) =>
        onUpdate({
          specific: { parentFieldId: opt?.id != null ? String(opt.id) : '' },
        })
      }
    />
  )

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
          <InputSelect
            label='Separate options using'
            options={SEPARATOR_OPTIONS}
            value={SEPARATOR_OPTIONS.find((o) => o.id === separator) || null}
            onChange={(opt) =>
              onUpdate({
                specific: {
                  separateOptionsUsing: opt?.id === 'NEWLINE' ? 'NEWLINE' : 'COMMA',
                },
              })
            }
          />
          <InputTextarea
            label='Options'
            rows={2}
            value={customOptions}
            description={
              separator === 'NEWLINE'
                ? 'One option per line. Ignored when a dynamic source is selected below.'
                : 'Comma-separated list of options shown for this column. Ignored when a dynamic source is selected below.'
            }
            placeholder={
              separator === 'NEWLINE'
                ? 'Option 1\nOption 2\nOption 3'
                : 'Option 1, Option 2, Option 3'
            }
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
              onChange={(id) => {
                const next =
                  id === OPTIONS_SOURCE.API
                    ? 'API'
                    : id === OPTIONS_SOURCE.MASTER
                      ? 'MASTER'
                      : id === OPTIONS_SOURCE.USER_LIST
                        ? 'USER_LIST'
                        : id === OPTIONS_SOURCE.PREDEFINED
                          ? 'PREDEFINED'
                          : 'LOOKUP'
                onUpdate({
                  lookupSettings: {
                    optionsSource: next,
                    ...(next !== 'LOOKUP'
                      ? { repositoryField: '', repositoryId: '' }
                      : {}),
                  },
                })
              }}
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
            ) : optionsSource === 'MASTER' ? (
              <>
                <label className='mt-1 block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
                  Master Table
                </label>
                <InputSelect
                  options={masterForms}
                  placeholder='Select a master table'
                  value={
                    masterForms.find((f) => String(f.id) === masterFormId) ||
                    null
                  }
                  onChange={(opt) =>
                    onUpdate({
                      specific: {
                        masterFormColumn: '',
                        masterFormId: opt?.id != null ? String(opt.id) : '',
                      },
                    })
                  }
                />
                <InputSelect
                  disabled={!masterFormId}
                  options={masterColumns}
                  placeholder={
                    masterFormId
                      ? 'Select the column to show'
                      : 'Select a master table first'
                  }
                  value={
                    masterColumns.find(
                      (c) =>
                        String(c.id) === masterFormColumn ||
                        c.name === masterFormColumn,
                    ) || null
                  }
                  onChange={(opt) =>
                    onUpdate({
                      specific: {
                        masterFormColumn: opt?.id != null ? String(opt.id) : '',
                      },
                    })
                  }
                />
                <InputSwitch
                  checked={showAllData}
                  description='When filtering by another column, show every master value if that column is empty.'
                  label='Show all data'
                  onChange={(checked) =>
                    onUpdate({ specific: { showAllData: checked } })
                  }
                />
                <InputSwitch
                  checked={column.settings?.specific?.isSameMaster === true}
                  description='Saved for V5 parity; not applied when options load yet.'
                  label='Same Master'
                  onChange={(checked) =>
                    onUpdate({ specific: { isSameMaster: checked } })
                  }
                />
                <label className='mt-1 block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
                  Filter by column (cascade, optional)
                </label>
                <InputSelect
                  placeholder='No cascade — show all options'
                  clearable
                  options={siblingColumns.map((c) => ({
                    id: c.id,
                    name: c.name || 'Column',
                  }))}
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
                  The selected column&apos;s master column is matched against
                  this row&apos;s value in that column.
                </div>
              </>
            ) : optionsSource === 'USER_LIST' ? (
              <p className='text-11 leading-relaxed text-gray-9'>
                Options are the system user emails.
              </p>
            ) : optionsSource === 'PREDEFINED' ? (
              <InputSelect
                label='Predefined list'
                options={PREDEFINED_TYPE_OPTIONS}
                value={
                  PREDEFINED_TYPE_OPTIONS.find(
                    (o) => o.id === predefinedType,
                  ) || null
                }
                onChange={(opt) =>
                  onUpdate({
                    specific: {
                      predefinedType: opt?.id === 'FOLDER' ? 'FOLDER' : 'USER',
                    },
                  })
                }
              />
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

      {isCalculated && (
        <div className='space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5'>
          <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
            Validation
          </label>
          <InputSelect
            description='Integer rounds the calculated result to a whole number; Decimal keeps decimals.'
            label='Content Rule'
            options={CALCULATED_RULE_OPTIONS}
            value={
              CALCULATED_RULE_OPTIONS.find((o) => o.id === calculatedRule) ||
              CALCULATED_RULE_OPTIONS[0]
            }
            onChange={(opt) =>
              onUpdate({ validation: { contentRule: String(opt?.id || '') } })
            }
          />
        </div>
      )}

      {!isCalculated && !showOptions && (
        <div className='space-y-2'>
          <InputSelect
            label={hasFillSync ? 'Fill Value' : 'Default Value'}
            options={
              hasFillSync
                ? FILL_SYNC_VALUE_TYPE_OPTIONS
                : DEFAULT_VALUE_TYPE_OPTIONS
            }
            value={
              (hasFillSync
                ? FILL_SYNC_VALUE_TYPE_OPTIONS
                : DEFAULT_VALUE_TYPE_OPTIONS
              ).find((o) => o.id === defaultValueType) ||
              DEFAULT_VALUE_TYPE_OPTIONS[0]
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
          {isFillCopy && fillSourceSelect('Copy value from column')}
          {isFillMaster && (
            <>
              <InputSelect
                label='Master Table'
                options={masterForms}
                placeholder='Select a master table'
                value={
                  masterForms.find((f) => String(f.id) === masterFormId) ||
                  null
                }
                onChange={(opt) =>
                  onUpdate({
                    specific: {
                      masterFormColumn: '',
                      masterFormId: opt?.id != null ? String(opt.id) : '',
                    },
                  })
                }
              />
              <InputSelect
                disabled={!masterFormId}
                label='Master column to fill'
                options={fillMasterColumns}
                placeholder={
                  masterFormId
                    ? 'Select the column'
                    : 'Select a master table first'
                }
                value={
                  fillMasterColumns.find(
                    (c) =>
                      String(c.id) === masterFormColumn ||
                      c.name === masterFormColumn,
                  ) || null
                }
                onChange={(opt) =>
                  onUpdate({
                    specific: {
                      masterFormColumn: opt?.id != null ? String(opt.id) : '',
                    },
                  })
                }
              />
              {fillSourceSelect('Match on column')}
              <div className='text-[10px] text-gray-6 italic'>
                The row of the master table whose column equals this row&apos;s
                value in the chosen column is used.
              </div>
            </>
          )}
          {isDateColumn && (
            <InputSwitch
              checked={column.settings?.specific?.qrValue === true}
              description='Show a scan button in the cell to read a date from a QR code or barcode.'
              label='Read Values From QR'
              onChange={(checked) =>
                onUpdate({ specific: { qrValue: checked } })
              }
            />
          )}
          {defaultValueType !== 'CUSTOM' &&
            defaultValueType !== 'ASSIGN_PARENT_FIELD' &&
            defaultValueType !== 'MASTER' && (
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
                    NUMBER_CONTENT_RULES.includes(o.id),
                  )
                : CONTENT_RULE_OPTIONS.filter(
                    (o) => !NUMBER_CONTENT_RULES.includes(o.id),
                  )
            }
            value={
              CONTENT_RULE_OPTIONS.find((o) => o.id === contentRule) || null
            }
            onChange={(opt) =>
              onUpdate({ validation: { contentRule: String(opt?.id || '') } })
            }
          />
          {isNumericColumn &&
            (contentRule === 'DECIMAL' || contentRule === 'BOTH') && (
            <InputNumber
              description='Maximum digits after the decimal point. Leave empty for no limit.'
              label='Decimal Digits'
              max={10}
              min={0}
              value={decimalDigits}
              onChange={(v) => onUpdate({ validation: { decimalDigits: v } })}
            />
          )}
          {isNumericColumn ? (
            <TableColumnNumberRange
              column={column}
              siblingColumns={siblingColumns}
              onUpdate={onUpdate}
            />
          ) : (
            <div className='grid grid-cols-2 gap-2'>
              <InputNumber
                label='Min Length'
                value={minimum}
                onChange={(v) => onUpdate({ validation: { minimum: v } })}
              />
              <InputNumber
                label='Max Length'
                value={maximum}
                onChange={(v) => onUpdate({ validation: { maximum: v } })}
              />
            </div>
          )}
        </div>
      )}

      {isNumericColumn && (
        <div className='space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5'>
          <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
            Number Format
          </label>
          <InputNumber
            description='Amount the up/down arrow keys change the value by. Leave empty for the default.'
            label='Step'
            min={0}
            value={step}
            onChange={(v) => onUpdate({ specific: { step: v } })}
          />
          <InputSwitch
            checked={column.settings?.specific?.qrValue === true}
            description='Show a scan button in the cell to read a number from a QR code or barcode.'
            label='Read Values From QR'
            onChange={(checked) =>
              onUpdate({ specific: { qrValue: checked } })
            }
          />
          <div className='grid grid-cols-2 gap-2'>
            <InputText
              label='Prefix'
              placeholder='e.g. $'
              value={prefixLabel}
              onChange={(value: string) =>
                onUpdate({ specific: { prefixLabel: value } })
              }
            />
            <InputText
              label='Suffix'
              placeholder='e.g. kg'
              value={suffixLabel}
              onChange={(value: string) =>
                onUpdate({ specific: { suffixLabel: value } })
              }
            />
          </div>
        </div>
      )}

      <TableColumnFormatSettings
        column={column}
        siblingColumns={siblingColumns}
        onUpdate={onUpdate}
      />

      <TableColumnChoiceSettings column={column} onUpdate={onUpdate} />

      <TableColumnAiSettings
        column={column}
        masterForms={masterForms}
        siblingColumns={siblingColumns}
        onUpdate={onUpdate}
      />

      <TableColumnRuleSettings
        column={column}
        siblingColumns={siblingColumns}
        onUpdate={onUpdate}
      />
    </div>
  )
}

TableColumnSettingsPanel.displayName = 'TableColumnSettingsPanel'
export default TableColumnSettingsPanel
