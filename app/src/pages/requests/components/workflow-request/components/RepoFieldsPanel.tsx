import { useLingui } from '@lingui/react/macro'
import type { RepoFieldDescriptor } from '../utils/fieldRendering'
import { buildSyntheticField, getRepoFieldValue } from '../utils/fieldRendering'
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

  return (
    <div className='grid grid-cols-1 gap-y-4'>
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
              onChange={(value) => onFieldChange(fieldId, value)}
              onOcrFieldList={onOcrFieldList}
            />
          </div>
        )
      })}
    </div>
  )
}

RepoFieldsPanel.displayName = 'RepoFieldsPanel'
export default RepoFieldsPanel
