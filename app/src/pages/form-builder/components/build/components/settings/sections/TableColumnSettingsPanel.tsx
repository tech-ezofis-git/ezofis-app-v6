import { useQuery } from '@tanstack/react-query'
import type {
  Question,
  QuestionType,
} from '@/pages/form-builder/store/formStore'
import { getRepositoryItemFilterFields } from '@/api/v6/folder/folder'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'

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

const NUMERIC_COLUMN_TYPES: QuestionType[] = [
  'NUMBER',
  'COUNTER',
  'CURRENCY_AMOUNT',
]

const OPERATORS: { label: string; value: string }[] = [
  { label: '+', value: '+' },
  { label: '−', value: '-' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
]

const TableColumnSettingsPanel = ({
  column,
  repositories = [],
  siblingColumns = [],
  onUpdate,
}: Props) => {
  const isRequired = column.settings?.validation?.fieldRule === 'REQUIRED'
  const placeholder = column.settings?.specific?.placeholder || ''
  const customOptions = column.settings?.specific?.customOptions || ''
  const showOptions = OPTIONS_COLUMN_TYPES.includes(column.type)
  const isCalculated = column.type === 'CALCULATED'

  const repositoryId = column.settings?.lookupSettings?.repositoryId || ''
  const repositoryField = column.settings?.lookupSettings?.repositoryField || ''

  const { data: repositoryFields = [] } = useQuery({
    enabled: showOptions && !!repositoryId,
    queryKey: ['tableColumnRepositoryFields', repositoryId],
    queryFn: async () => {
      if (!repositoryId) return []
      const res = await getRepositoryItemFilterFields(repositoryId)
      return res.data?.fields || []
    },
  })

  const formulaTokens = column.settings?.specific?.formulaTokens || []
  const numericSiblings = siblingColumns.filter((c) =>
    NUMERIC_COLUMN_TYPES.includes(c.type),
  )

  const setFormulaTokens = (tokens: typeof formulaTokens) =>
    onUpdate({ specific: { formulaTokens: tokens } })

  const appendToken = (token: {
    type: 'FIELD' | 'OPERATOR' | 'NUMBER' | 'FUNCTION'
    value: string
  }) => setFormulaTokens([...formulaTokens, token])

  const removeToken = (index: number) =>
    setFormulaTokens(formulaTokens.filter((_, i) => i !== index))

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
        <>
          <InputTextarea
            description='Comma-separated list of options shown for this column. Ignored when a lookup is configured below.'
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
              Lookup (optional)
            </label>
            <InputSelect
              options={repositories}
              placeholder='Select a repository'
              value={repositories.find((r) => r.id === repositoryId) || null}
              onChange={(opt) =>
                onUpdate({
                  lookupSettings: {
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
                repositoryId ? 'Select a field' : 'Select a repository first'
              }
              value={
                repositoryFields.find((f: any) => f.name === repositoryField)
                  ? { id: repositoryField, name: repositoryField }
                  : null
              }
              onChange={(opt) =>
                onUpdate({
                  lookupSettings: {
                    repositoryField: opt?.id != null ? String(opt.id) : '',
                  },
                })
              }
            />
          </div>
        </>
      )}

      {isCalculated && (
        <div className='space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5'>
          <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
            Formula (uses this row's other columns)
          </label>
          <div className='flex min-h-[36px] flex-wrap gap-1.5 rounded-lg border border-gray-3 bg-white p-2'>
            {formulaTokens.length === 0 && (
              <span className='self-center text-[11px] text-gray-7 italic'>
                Add columns and operators to build a formula
              </span>
            )}
            {formulaTokens.map((token, index) => (
              <div
                className='flex items-center gap-1 rounded-md border border-gray-3 bg-gray-1 px-2 py-1 text-[11px] font-bold text-gray-12'
                key={`${token.type}-${token.value}-${index}`}
              >
                {token.type === 'FIELD'
                  ? siblingColumns.find((c) => c.id === token.value)?.name ||
                    'Deleted column'
                  : token.value}
                <button
                  className='text-gray-8 hover:text-error-main'
                  type='button'
                  onClick={() => removeToken(index)}
                >
                  <Icon height={10} name='lucide:x' width={10} />
                </button>
              </div>
            ))}
          </div>
          <div className='grid grid-cols-4 gap-1.5'>
            {OPERATORS.map((op) => (
              <button
                className='h-7 rounded-md border border-gray-3 bg-white text-12 font-bold text-gray-12 hover:border-accent-primary hover:text-accent-primary'
                key={op.value}
                type='button'
                onClick={() =>
                  appendToken({ type: 'OPERATOR', value: op.value })
                }
              >
                {op.label}
              </button>
            ))}
          </div>
          <InputSelect
            options={numericSiblings.map((c) => ({ id: c.id, name: c.name }))}
            value={null}
            placeholder={
              numericSiblings.length
                ? 'Add a column'
                : 'No number/currency/counter columns yet'
            }
            onChange={(opt) =>
              opt && appendToken({ type: 'FIELD', value: String(opt.id) })
            }
          />
        </div>
      )}
    </div>
  )
}

TableColumnSettingsPanel.displayName = 'TableColumnSettingsPanel'
export default TableColumnSettingsPanel
