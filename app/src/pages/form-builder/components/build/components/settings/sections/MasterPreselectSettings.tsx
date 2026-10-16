import { useQuery } from '@tanstack/react-query'
import type { Question } from '@/pages/form-builder/store/formStore'
import formApi from '@/api/form/form'
import { getMasterFormInfo } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'

interface Props {
  activeQuestion: Question
  allQuestions: Question[]
  onUpdate: (updates: Record<string, unknown>) => void
}

/**
 * "Pre-select from master" for multi-choice fields: when the chosen source
 * field (a master-driven select, e.g. "Existing Product Code") has a value,
 * the master rows matching it are looked up and the values of the chosen
 * master column are ticked in this field.
 */
const MasterPreselectSettings = ({
  activeQuestion,
  allQuestions,
  onUpdate,
}: Props) => {
  const specific = activeQuestion.settings.specific
  const enabled = Boolean(specific.masterPreselectEnabled)
  const sourceId = specific.masterPreselectSourceFieldId || ''

  const sourceOptions = allQuestions
    .filter((q) => q.id !== activeQuestion.id && getMasterFormInfo(q).enabled)
    .map((q) => ({ id: q.id, name: q.label || 'Untitled Field' }))

  const sourceField = allQuestions.find((q) => q.id === sourceId)
  const masterFormId = sourceField
    ? getMasterFormInfo(sourceField).masterFormId
    : ''

  const { data: masterForm } = useQuery({
    enabled: enabled && Boolean(masterFormId),
    queryKey: ['masterFormDetails', masterFormId],
    queryFn: async () => (await formApi.getFormDataById(masterFormId)).data,
  })

  const masterColumns = (() => {
    if (!masterForm) return []
    let raw =
      masterForm.formJson ||
      masterForm.data?.formJson ||
      masterForm.data ||
      masterForm
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw)
      } catch {
        return []
      }
    }
    return ((raw?.panels || []) as any[])
      .flatMap((p) => p.fields || [])
      .map((f: any) => ({
        id: String(f.id || f.label || ''),
        name: String(f.label || f.name || f.displayLabel || f.id || ''),
      }))
      .filter((c) => Boolean(c.id))
  })()

  return (
    <div className='space-y-3 rounded-xl border border-gray-1 bg-surface-muted/50 p-3'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='text-xs font-bold text-gray-13'>
            Pre-select from Master
          </div>
          <div className='text-[10px] text-gray-6'>
            Tick options automatically based on another field's master record
          </div>
        </div>
        <InputSwitch
          checked={enabled}
          onChange={(checked) => onUpdate({ masterPreselectEnabled: checked })}
        />
      </div>

      {enabled && (
        <div className='animate-in fade-in slide-in-from-top-1 space-y-3 duration-200'>
          <div>
            <label className='mb-1 block text-xs font-medium text-gray-11'>
              Source Field
            </label>
            <InputSelect
              options={sourceOptions}
              placeholder='e.g. Existing Product Code'
              value={sourceOptions.find((o) => o.id === sourceId) || null}
              onChange={(val) =>
                onUpdate({
                  masterPreselectColumn: '',
                  masterPreselectSourceFieldId: val?.id || '',
                })
              }
            />
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-gray-11'>
              Master Column holding the values
            </label>
            <InputSelect
              options={masterColumns}
              placeholder='e.g. Packaging components'
              value={
                masterColumns.find(
                  (c) => c.id === specific.masterPreselectColumn,
                ) || null
              }
              onChange={(val) =>
                onUpdate({ masterPreselectColumn: val?.id || '' })
              }
            />
            <div className='mt-1 text-[10px] text-gray-6 italic'>
              Values in that column (comma separated) are matched to this
              field's options.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MasterPreselectSettings
