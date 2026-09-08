import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import type { ReportDomain } from '../../constants'
import type { ReportFilterOperator } from '../../types'
import { DOMAIN_FIELDS, FILTER_OPERATORS } from '../../constants'
import useReportSourceFields from '../../hooks/useReportSourceFields'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'

const uid = () => Math.random().toString(36).slice(2, 9)

const FiltersStep = () => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)
  const { fields: sourceFields, isLoading } = useReportSourceFields(
    draft.sourceFormId,
    draft.sourceType,
    draft.sourceId,
  )

  const hasDynamicSource = Boolean(
    draft.sourceType || draft.sourceId || draft.sourceFormId,
  )

  const fieldOptions =
    hasDynamicSource || sourceFields.length > 0
      ? [...sourceFields, ...draft.customFields].map((f) => ({
          id: f.id,
          name: f.label || f.id,
        }))
      : (DOMAIN_FIELDS[draft.domain as ReportDomain] || []).map((f) => ({
          id: f.id,
          name: f.label,
        }))

  const addFilter = () => {
    setDraft({
      filters: [
        ...draft.filters,
        {
          field: fieldOptions[0]?.id || '',
          id: uid(),
          operator: 'equals',
          value: '',
        },
      ],
    })
  }

  const removeFilter = (id: string) => {
    setDraft({ filters: draft.filters.filter((f) => f.id !== id) })
  }

  const updateFilter = (
    id: string,
    patch: Partial<(typeof draft.filters)[number]>,
  ) => {
    setDraft({
      filters: draft.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='mb-1 text-15 font-semibold text-gray-13'>{t`Filters`}</h3>
          <p className='text-13 text-gray-10'>{t`Narrow down which rows this report includes. Leave empty to include every row.`}</p>
        </div>
        <Button
          color='primary'
          icon='lucide:plus'
          label={t`Add filter`}
          variant='outline'
          onClick={addFilter}
        />
      </div>

      {draft.filters.length === 0 ? (
        <div className='rounded-xl border border-dashed border-gray-4 py-12 text-center text-13 text-gray-10'>
          {t`No filters added. This report will include all rows.`}
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {draft.filters.map((filter) => {
            const showValue =
              filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty'
            return (
              <div
                className='grid grid-cols-1 items-end gap-2 rounded-lg border border-gray-3 p-3 sm:grid-cols-[1.2fr_1.2fr_1.2fr_auto]'
                key={filter.id}
              >
                <InputSelect
                  description={
                    isLoading && fieldOptions.length === 0
                      ? t`Loading fields...`
                      : undefined
                  }
                  label={t`Field`}
                  options={fieldOptions}
                  value={
                    fieldOptions.find((o) => o.id === filter.field) ||
                    (filter.field
                      ? { id: filter.field, name: filter.field }
                      : null)
                  }
                  onChange={(option) =>
                    updateFilter(filter.id, { field: String(option?.id || '') })
                  }
                />
                <InputSelect
                  label={t`Operator`}
                  options={FILTER_OPERATORS.map((o) => ({
                    id: o.value,
                    name: o.label,
                  }))}
                  value={
                    FILTER_OPERATORS.find((o) => o.value === filter.operator)
                      ? {
                          id: filter.operator,
                          name:
                            FILTER_OPERATORS.find(
                              (o) => o.value === filter.operator,
                            )?.label || filter.operator,
                        }
                      : null
                  }
                  onChange={(option) =>
                    updateFilter(filter.id, {
                      operator:
                        (option?.id as ReportFilterOperator) || 'equals',
                    })
                  }
                />
                {showValue ? (
                  <InputText
                    label={t`Value`}
                    placeholder={t`Enter value`}
                    value={filter.value}
                    onChange={(value) => updateFilter(filter.id, { value })}
                  />
                ) : (
                  <div />
                )}
                <IconButton
                  color='red'
                  icon='lucide:trash-2'
                  variant='ghost'
                  onClick={() => removeFilter(filter.id)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

FiltersStep.displayName = 'FiltersStep'
export default FiltersStep
