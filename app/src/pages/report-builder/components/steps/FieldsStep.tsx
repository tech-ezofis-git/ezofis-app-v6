import { useLingui } from '@lingui/react/macro'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import FieldsStepFormSource from './FieldsStepFormSource'
import FieldsStepLegacyDomain from './FieldsStepLegacyDomain'

/**
 * Field source is dual-path: a report built against a selected source form
 * (requirements 6-10) drives fields from that form's real schema, while the
 * 5 pre-existing seed reports (no sourceFormId) fall back to the original
 * domain-driven field list unchanged.
 */
const FieldsStep = () => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h3 className='mb-1 text-15 font-semibold text-gray-13'>{t`Choose fields`}</h3>
        <p className='text-13 text-gray-10'>{t`Pick which fields appear in this report, then configure column labels, calculations, and computed status.`}</p>
      </div>

      {draft.sourceFormId || draft.sourceId || draft.sourceType ? (
        <FieldsStepFormSource />
      ) : draft.domain ? (
        <FieldsStepLegacyDomain />
      ) : (
        <div className='rounded-xl border border-dashed border-gray-4 py-16 text-center text-13 text-gray-10'>
          {t`Select a source in the Details step first.`}
        </div>
      )}
    </div>
  )
}

FieldsStep.displayName = 'FieldsStep'
export default FieldsStep
