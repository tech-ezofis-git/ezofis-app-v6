import { useLingui } from '@lingui/react/macro'
import { DynamicIcon } from '@/pages/folders/components/icons'
import { Card } from '@/pages/folders/components/Ui'
import FieldRenderer from '@/pages/requests/components/workflow-request/components/FieldRenderer'
import { SUPPORTED_TYPES } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import {
  isIndexingFieldRequired,
  parseFieldOptionValues,
  sortIndexingFields,
  type RepositoryFieldSchema,
} from '@/pages/requests/utils/repoFolderMetadata'

const toIndexingValue = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(', ')
  if (typeof value === 'object') return ''
  return String(value).trim()
}

const toIndexingField = (
  repoField: RepositoryFieldSchema,
  required: boolean,
) => {
  const dataType = String(repoField.dataType || 'SHORT_TEXT').toUpperCase()
  const options = parseFieldOptionValues(repoField)
  let type = dataType
  if (dataType === 'BOOLEAN') type = 'YES_NO_TOGGLE'
  else if (dataType === 'SINGLE_CHOICE' || dataType === 'SINGLE_SELECT') type = 'SINGLE_SELECT'
  else if (dataType === 'MULTIPLE_CHOICE' || dataType === 'MULTI_SELECT') type = 'MULTI_SELECT'
  else if (!SUPPORTED_TYPES.has(dataType)) type = 'SHORT_TEXT'

  return {
    id: repoField.sqlColumnName,
    label: repoField.name,
    settings: {
      general: {},
      specific: {
        customOptions: options.join('\n'),
        optionsType: 'CUSTOM',
        separateOptionsUsing: 'NEWLINE',
      },
      validation: {
        fieldRule: required ? 'REQUIRED' : 'OPTIONAL',
      },
    },
    type,
  }
}

interface Props {
  folderFields: RepositoryFieldSchema[]
  values: Record<string, string>
  attemptedSubmit?: boolean
  repositoryId?: string | number
  onChange: (sqlColumnName: string, value: string) => void
}

const IndexingFieldsForm = ({
  attemptedSubmit,
  folderFields,
  repositoryId,
  values,
  onChange,
}: Props) => {
  const { t } = useLingui()
  const orderedFields = sortIndexingFields(folderFields)
  const filledCount = orderedFields.filter((field) =>
    String(values[field.sqlColumnName] || '').trim(),
  ).length
  const totalCount = orderedFields.length

  return (
    <Card className='overflow-hidden p-0'>
      <div className='flex items-center justify-between gap-3 border-b border-gray-3 px-4 py-3'>
        <h3 className='flex min-w-0 items-center gap-2 text-[15px] font-semibold text-gray-13'>
          <DynamicIcon className='h-4 w-4 shrink-0 text-blue-11' name='fileText' />
          {t`Document Info`}
        </h3>
        {totalCount > 0 && (
          <span
            className={`shrink-0 text-11 font-medium whitespace-nowrap ${
              filledCount === totalCount ? 'text-green-9' : 'text-gray-9'
            }`}
          >
            {t`${filledCount} of ${totalCount} fields ready`}
          </span>
        )}
      </div>
      <div className='space-y-4 p-4'>
        {orderedFields.length === 0 ? (
          <p className='text-center text-13 text-gray-9'>
            {t`No field data available for this document.`}
          </p>
        ) : (
          orderedFields.map((repoField) => {
            const required = isIndexingFieldRequired(repoField)
            const value = values[repoField.sqlColumnName] ?? ''
            const missing = attemptedSubmit && required && !String(value).trim()
            return (
              <FieldRenderer
                error={missing ? t`This field is required.` : undefined}
                field={toIndexingField(repoField, required)}
                key={repoField.id || repoField.sqlColumnName}
                repositoryId={repositoryId ? String(repositoryId) : undefined}
                value={value}
                onChange={(next) =>
                  onChange(repoField.sqlColumnName, toIndexingValue(next))
                }
              />
            )
          })
        )}
      </div>
    </Card>
  )
}

IndexingFieldsForm.displayName = 'IndexingFieldsForm'
export default IndexingFieldsForm
