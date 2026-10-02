import { useQuery } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import type {
  Question,
  QuestionType,
} from '@/pages/form-builder/store/formStore'
import { getRepositoryItemFilterFields } from '@/api/v6/folder/folder'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import FormulaBuilder from './FormulaBuilder'

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
  const placeholder = column.settings?.specific?.placeholder || ''
  const customOptions = column.settings?.specific?.customOptions || ''
  const showOptions = OPTIONS_COLUMN_TYPES.includes(column.type)
  const isCalculated = column.type === 'CALCULATED'

  const repositoryId = column.settings?.lookupSettings?.repositoryId || ''
  const repositoryField = column.settings?.lookupSettings?.repositoryField || ''
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
    </div>
  )
}

TableColumnSettingsPanel.displayName = 'TableColumnSettingsPanel'
export default TableColumnSettingsPanel
