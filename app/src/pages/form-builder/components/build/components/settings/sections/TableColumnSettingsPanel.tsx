import type { Question, QuestionType } from '@/pages/form-builder/store/formStore'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'

export type TableColumn = NonNullable<
  Question['settings']['specific']['tableColumns']
>[number]

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>

interface Props {
  column: TableColumn
  onUpdate: (patch: ColumnSettingsPatch) => void
}

const OPTIONS_COLUMN_TYPES: QuestionType[] = [
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
]

const TableColumnSettingsPanel = ({ column, onUpdate }: Props) => {
  const isRequired = column.settings?.validation?.fieldRule === 'REQUIRED'
  const placeholder = column.settings?.specific?.placeholder || ''
  const customOptions = column.settings?.specific?.customOptions || ''
  const showOptions = OPTIONS_COLUMN_TYPES.includes(column.type)

  return (
    <div className='animate-in fade-in slide-in-from-top-1 space-y-3 duration-200'>
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
        <InputTextarea
          description='Comma-separated list of options shown for this column.'
          label='Options'
          placeholder='Option 1, Option 2, Option 3'
          rows={2}
          value={customOptions}
          onChange={(value: string) =>
            onUpdate({ specific: { customOptions: value } })
          }
        />
      )}
    </div>
  )
}

TableColumnSettingsPanel.displayName = 'TableColumnSettingsPanel'
export default TableColumnSettingsPanel
