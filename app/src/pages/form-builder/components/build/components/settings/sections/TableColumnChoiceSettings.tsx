import type { ComponentProps } from 'react'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import type { TableColumn } from './TableColumnSettingsPanel'

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>
type DefaultValueType = NonNullable<
  NonNullable<TableColumn['settings']>['specific']
>['defaultValueType']

interface Props {
  column: TableColumn
  onUpdate: (patch: ColumnSettingsPatch) => void
}

const CHOICE_TYPES = [
  'MULTI_SELECT',
  'MULTIPLE_CHOICE',
  'SINGLE_CHOICE',
  'SINGLE_SELECT',
]

// "None" keeps the column's static default; the others fill the signed-in
// user's details into new rows.
const FILL_VALUE_OPTIONS = [
  { id: 'CUSTOM', name: 'None' },
  { id: 'USER_EMAIL', name: "Logged in user's email" },
  { id: 'USER_FIRST_NAME', name: "Logged in user's first name" },
  { id: 'USER_NAME', name: "Logged in user's name" },
]

const CONTENT_RULE_OPTIONS = [
  { id: '', name: 'Any value' },
  { id: 'ALPHA', name: 'Alpha (letters only)' },
  { id: 'INTEGER', name: 'Integer (no decimals)' },
]

const YEAR_TYPE_OPTIONS = [
  { id: 'CALENDER_YEAR', name: 'Calendar year' },
  { id: 'FINANCIAL_YEAR', name: 'Financial year' },
]

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

const sectionClass =
  'animate-in fade-in slide-in-from-top-1 space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5 duration-200'

/**
 * Choice-column settings shown in V5 for Single Select and friends: fill
 * value, adding new options, year-based options, QR reading and a content
 * rule. They use the top-level keys (`allowToAddNewOptions`, `yearType`,
 * `qrValue`, `validation.contentRule`); the fill value uses the column
 * `defaultValueType`.
 *
 * Year-Based replaces the option list with generated years (see
 * buildYearOptions).
 */
const TableColumnChoiceSettings = ({ column, onUpdate }: Props) => {
  if (!CHOICE_TYPES.includes(String(column.type))) return null
  const specific = column.settings?.specific
  const fillValue = FILL_VALUE_OPTIONS.some(
    (o) => o.id === specific?.defaultValueType,
  )
    ? specific?.defaultValueType
    : 'CUSTOM'
  const contentRule = column.settings?.validation?.contentRule || ''
  const yearBased = Boolean(specific?.yearType)

  return (
    <div className={sectionClass}>
      <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
        Choice Settings
      </label>
      <InputSelect
        description='Pre-fills new rows with the signed-in user’s details.'
        label='Fill Value'
        options={FILL_VALUE_OPTIONS}
        value={FILL_VALUE_OPTIONS.find((o) => o.id === fillValue) || null}
        onChange={(opt) =>
          onUpdate({
            specific: {
              defaultValueType: (opt?.id || 'CUSTOM') as DefaultValueType,
            },
          })
        }
      />
      <InputSwitch
        checked={specific?.allowToAddNewOptions === true}
        description='Let users type a value that is not in the list.'
        label='Allow Users To Add New Options'
        onChange={(checked) =>
          onUpdate({ specific: { allowToAddNewOptions: checked } })
        }
      />
      <InputSwitch
        checked={specific?.qrValue === true}
        description='Show a scan button that picks the option matching a QR code or barcode.'
        label='Read Values From QR'
        onChange={(checked) => onUpdate({ specific: { qrValue: checked } })}
      />
      <InputSwitch
        checked={yearBased}
        description='Replaces the option list with years: the last 10, this year and next.'
        label='Option Type: Year-Based'
        onChange={(checked) =>
          onUpdate({
            specific: {
              yearType: checked
                ? specific?.yearType || 'CALENDER_YEAR'
                : undefined,
            },
          })
        }
      />
      {yearBased && (
        <InputSelect
          options={YEAR_TYPE_OPTIONS}
          value={
            YEAR_TYPE_OPTIONS.find((o) => o.id === specific?.yearType) || null
          }
          onChange={(opt) =>
            onUpdate({
              specific: {
                yearType:
                  opt?.id === 'FINANCIAL_YEAR'
                    ? 'FINANCIAL_YEAR'
                    : 'CALENDER_YEAR',
              },
            })
          }
        />
      )}
      <InputSelect
        label='Content Rule'
        options={CONTENT_RULE_OPTIONS}
        value={CONTENT_RULE_OPTIONS.find((o) => o.id === contentRule) || null}
        onChange={(opt) =>
          onUpdate({ validation: { contentRule: String(opt?.id || '') } })
        }
      />
    </div>
  )
}

export default TableColumnChoiceSettings
