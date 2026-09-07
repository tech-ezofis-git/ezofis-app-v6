import { useLingui } from '@lingui/react/macro'
import { DynamicIcon } from '@/pages/folders/components/icons'
import { Card } from '@/pages/folders/components/Ui'
import {
  buildSyntheticField,
  getRepoFieldValue,
  isFieldFilled,
  type RepoFieldDescriptor,
} from '../utils/fieldRendering'
import FieldRenderer from './FieldRenderer'

interface Props {
  descriptors: RepoFieldDescriptor[]
  formModel: Record<string, any>
  hasAttemptedSubmit?: boolean
  missingMandatoryFieldIds?: Set<string>
  repoFieldHints?: string[]
  repositoryId?: string
  onFieldChange: (fieldId: string, value: any) => void
  // Clicking a field highlights its current value in the file preview next
  // to it — see WorkflowRequest's handleFieldFocus.
  onFieldFocus?: (value: any) => void
  onOcrFieldList?: (
    list: { name?: string; value?: string }[] | undefined,
  ) => void
}

const FILE_FIELD_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD'])

// Column-wise list of every repository field — driven by the REPOSITORY's
// own field definitions, not the form's, even when a form field happens to
// share the same name (the repository is the source of truth here, per
// buildRepoFieldHints' rationale elsewhere in this feature). A matching
// form field's already-entered value still carries over (getRepoFieldValue),
// and edits here are mirrored back onto that form field's own slot so
// anything still reading formModel by the real form field id stays correct.
// Order is mandatory-first by folder `level`, then optional by level —
// same as inbox Document Info / folder indexing.
const RepoFieldsPanel = ({
  descriptors,
  formModel,
  hasAttemptedSubmit,
  missingMandatoryFieldIds,
  repoFieldHints,
  repositoryId,
  onFieldChange,
  onFieldFocus,
  onOcrFieldList,
}: Props) => {
  const { t } = useLingui()

  const rows = descriptors.filter(
    (d) => !FILE_FIELD_TYPES.has(d.matchedFieldType || ''),
  )

  if (rows.length === 0) return null

  const filledCount = rows.filter((descriptor) =>
    isFieldFilled(
      buildSyntheticField(descriptor.repoField),
      getRepoFieldValue(descriptor, formModel),
    ),
  ).length
  const totalCount = rows.length

  return (
    <Card className='overflow-hidden p-0'>
      <div className='flex items-center justify-between gap-3 border-b border-gray-3 px-4 py-3'>
        <h3 className='flex min-w-0 items-center gap-2 text-[15px] font-semibold text-gray-13'>
          <DynamicIcon
            className='h-4 w-4 shrink-0 text-blue-11'
            name='fileText'
          />
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
        {rows.map((descriptor) => {
          const { fieldId, repoField } = descriptor
          const value = getRepoFieldValue(descriptor, formModel)
          return (
            <div
              data-field-id={fieldId}
              key={fieldId}
              onClick={() => onFieldFocus?.(value)}
            >
              <FieldRenderer
                field={buildSyntheticField(repoField)}
                repoFieldHints={repoFieldHints}
                repositoryId={repositoryId}
                value={value}
                error={
                  hasAttemptedSubmit && missingMandatoryFieldIds?.has(fieldId)
                    ? t`This field is required.`
                    : undefined
                }
                onChange={(next) => onFieldChange(fieldId, next)}
                onOcrFieldList={onOcrFieldList}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}

RepoFieldsPanel.displayName = 'RepoFieldsPanel'
export default RepoFieldsPanel
