import type { ComponentProps } from 'react'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import type { TableColumn } from './TableColumnSettingsPanel'

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>

interface Props {
  column: TableColumn
  siblingColumns?: TableColumn[]
  onUpdate: (patch: ColumnSettingsPatch) => void
}

// Radio ids are numbers (0 reads as "empty"), so each mode keeps its stored
// value next to a 1-based id.
const RANGE_MODES = [
  {
    description:
      'Set the minimum value directly and take the maximum from another column in the row',
    id: 1,
    key: 'MIN_FIXED_MAX_FLEX',
    name: 'Minimum Fixed, Maximum Flexible',
  },
  {
    description:
      'Set the maximum value directly and take the minimum from another column in the row',
    id: 2,
    key: 'MIN_FLEX_MAX_FIXED',
    name: 'Minimum Flexible, Maximum Fixed',
  },
  {
    description: 'Set the minimum value and maximum directly',
    id: 3,
    key: 'CUSTOM',
    name: 'Custom Both Minimum and Maximum',
  },
] as const

// Columns whose value in the same row can act as a bound
const NUMERIC_TYPES = ['CALCULATED', 'COUNTER', 'CURRENCY_AMOUNT', 'NUMBER']

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

/**
 * Range for NUMBER / COUNTER columns, as in V5: both bounds fixed, or one
 * fixed and the other taken from another column of the same row. Uses the
 * top-level keys `rangeType`, `minimum`, `maximum`, `minimumNumberField` and
 * `maximumNumberField`; with no range type set the column behaves as before
 * (both fixed).
 */
const TableColumnNumberRange = ({
  column,
  siblingColumns = [],
  onUpdate,
}: Props) => {
  const validation = column.settings?.validation
  const mode =
    RANGE_MODES.find((m) => m.key === validation?.rangeType) ?? RANGE_MODES[2]
  const numericColumns = siblingColumns
    .filter((c) => NUMERIC_TYPES.includes(String(c.type)))
    .map((c) => ({ id: c.id, name: c.name || 'Column' }))

  const minimum = (
    <InputNumber
      label='Minimum'
      value={validation?.minimum ?? ''}
      onChange={(v) => onUpdate({ validation: { minimum: v } })}
    />
  )
  const maximum = (
    <InputNumber
      label='Maximum'
      value={validation?.maximum ?? ''}
      onChange={(v) => onUpdate({ validation: { maximum: v } })}
    />
  )

  return (
    <div className='space-y-2'>
      <InputRadioGroup
        label='Range'
        options={RANGE_MODES.map((m) => ({ ...m }))}
        value={mode.id}
        onChange={(id) =>
          onUpdate({
            validation: {
              rangeType: RANGE_MODES.find((m) => m.id === id)?.key ?? 'CUSTOM',
            },
          })
        }
      />
      {mode.key === 'CUSTOM' && (
        <div className='grid grid-cols-2 gap-2'>
          {minimum}
          {maximum}
        </div>
      )}
      {mode.key === 'MIN_FIXED_MAX_FLEX' && (
        <div className='space-y-2'>
          {minimum}
          <InputSelect
            description='Checked against this column’s value in the same row; skipped while it is empty.'
            label='Maximum from column'
            options={numericColumns}
            placeholder='Select a column'
            clearable
            value={
              numericColumns.find(
                (c) => c.id === validation?.maximumNumberField,
              ) || null
            }
            onChange={(opt) =>
              onUpdate({
                validation: {
                  maximumNumberField: opt?.id ? String(opt.id) : '',
                },
              })
            }
          />
        </div>
      )}
      {mode.key === 'MIN_FLEX_MAX_FIXED' && (
        <div className='space-y-2'>
          {maximum}
          <InputSelect
            description='Checked against this column’s value in the same row; skipped while it is empty.'
            label='Minimum from column'
            options={numericColumns}
            placeholder='Select a column'
            clearable
            value={
              numericColumns.find(
                (c) => c.id === validation?.minimumNumberField,
              ) || null
            }
            onChange={(opt) =>
              onUpdate({
                validation: {
                  minimumNumberField: opt?.id ? String(opt.id) : '',
                },
              })
            }
          />
        </div>
      )}
    </div>
  )
}

export default TableColumnNumberRange
