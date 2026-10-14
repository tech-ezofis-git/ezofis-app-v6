import { type ComponentProps } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import { parseColumnOptions } from '@/pages/form-builder/helpers/tableColumnOptions'
import { generateId } from '@/pages/form-builder/store/formStore'
import type { TableColumn } from './TableColumnSettingsPanel'

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>

interface Props {
  column: TableColumn
  siblingColumns?: TableColumn[]
  onUpdate: (patch: ColumnSettingsPatch) => void
}

interface Rule {
  controls: string[]
  id: string
  value: string
  notEqual?: boolean
}

interface RuleListProps {
  description: string
  rules: Rule[]
  siblingColumns: TableColumn[]
  targetLabel: string
  title: string
  valueOptions: { id: string; name: string }[]
  allowNotEqual?: boolean
  onChange: (rules: Rule[]) => void
}

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

const RuleList = ({
  allowNotEqual,
  description,
  rules,
  siblingColumns,
  targetLabel,
  title,
  valueOptions,
  onChange,
}: RuleListProps) => {
  const patch = (idx: number, next: Partial<Rule>) =>
    onChange(rules.map((r, i) => (i === idx ? { ...r, ...next } : r)))

  return (
    <div className='space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <div className='text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
            {title}
          </div>
          <div className='text-[10px] text-gray-6'>{description}</div>
        </div>
        <button
          className='flex shrink-0 cursor-pointer items-center gap-1 text-11 font-medium text-primary-9 hover:text-primary-10 hover:underline'
          type='button'
          onClick={() =>
            onChange([...rules, { controls: [], id: generateId(), value: '' }])
          }
        >
          <Icon height={12} name='lucide:plus' width={12} />
          Add Rule
        </button>
      </div>

      {rules.length === 0 && (
        <div className='text-11 text-gray-9 italic'>No rules configured.</div>
      )}

      {rules.map((rule, idx) => (
        <div
          className='animate-in fade-in space-y-2 rounded-lg border border-gray-2 bg-surface p-2 duration-200'
          key={rule.id || idx}
        >
          <div className='flex items-center justify-between'>
            <span className='text-[10px] font-medium tracking-wider text-gray-9 uppercase'>
              If this column equals:
            </span>
            <IconButton
              color='red'
              icon='lucide:trash-2'
              size='xs'
              variant='ghost'
              onClick={() => onChange(rules.filter((_, i) => i !== idx))}
            />
          </div>
          {valueOptions.length > 0 ? (
            <InputSelect
              placeholder='Select or type a value'
              value={rule.value ? { id: rule.value, name: rule.value } : null}
              creatable
              options={
                rule.value && !valueOptions.some((o) => o.id === rule.value)
                  ? [...valueOptions, { id: rule.value, name: rule.value }]
                  : valueOptions
              }
              onChange={(opt) =>
                patch(idx, { value: String(opt?.id || opt?.name || '') })
              }
            />
          ) : (
            <InputText
              placeholder='Value'
              value={rule.value || ''}
              onChange={(value: string) => patch(idx, { value })}
            />
          )}
          {allowNotEqual && (
            <InputSwitch
              checked={rule.notEqual || false}
              label='Lock when the value does NOT match'
              onChange={(checked) => patch(idx, { notEqual: checked })}
            />
          )}
          <div>
            <label className='mb-1 block text-[11px] font-medium text-gray-11'>
              {targetLabel}
            </label>
            <InputSelectMultiple
              placeholder='Select columns in this table'
              options={siblingColumns.map((c) => ({
                id: c.id,
                name: c.name || 'Column',
              }))}
              value={siblingColumns
                .filter((c) => (rule.controls || []).includes(c.id))
                .map((c) => ({ id: c.id, name: c.name || 'Column' }))}
              onChange={(vals) =>
                patch(idx, { controls: vals.map((v) => String(v.id)) })
              }
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Row-level conditional rules for a table column. The column being edited is
 * the SOURCE: when its value in a row matches, the chosen sibling columns of
 * that row become required / read-only. Same rule shape as top-level
 * `validation.mandatorySettings` / `validation.readonlySettings`.
 */
const TableColumnRuleSettings = ({
  column,
  siblingColumns = [],
  onUpdate,
}: Props) => {
  if (siblingColumns.length === 0) return null
  const validation = column.settings?.validation
  const mandatory = (
    Array.isArray(validation?.mandatorySettings)
      ? validation.mandatorySettings
      : []
  ) as Rule[]
  const readonly = (
    Array.isArray(validation?.readonlySettings)
      ? validation.readonlySettings
      : []
  ) as Rule[]
  const valueOptions = parseColumnOptions(column)

  return (
    <div className='space-y-2'>
      <RuleList
        description='Make other columns in the same row required when this column matches a value.'
        rules={mandatory}
        siblingColumns={siblingColumns}
        targetLabel='Make these columns REQUIRED:'
        title='Conditional Mandatory Rules'
        valueOptions={valueOptions}
        onChange={(rules) =>
          onUpdate({ validation: { mandatorySettings: rules } })
        }
      />
      <RuleList
        description='Lock other columns in the same row based on this column’s value.'
        rules={readonly}
        siblingColumns={siblingColumns}
        targetLabel='Make these columns READ-ONLY:'
        title='Conditional Read-Only Rules'
        valueOptions={valueOptions}
        allowNotEqual
        onChange={(rules) =>
          onUpdate({ validation: { readonlySettings: rules } })
        }
      />
    </div>
  )
}

export default TableColumnRuleSettings
