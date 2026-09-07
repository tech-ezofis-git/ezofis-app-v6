import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import type { Question } from '@/pages/form-builder/store/formStore'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'
import type { PreviewColumn, PreviewSampleType } from './FieldsPreviewTable'
import useReportSourceFields from '../../hooks/useReportSourceFields'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import { createDefaultFieldSetting } from '../../types'
import FieldsPreviewTable from './FieldsPreviewTable'
import FormFieldSettingsPanel from './FormFieldSettingsPanel'

const uid = () => Math.random().toString(36).slice(2, 9)

const QUESTION_TYPE_ICON: Record<string, string> = {
  CALCULATED: 'lucide:calculator',
  COUNTER: 'tabler:circle-dot',
  CURRENCY_AMOUNT: 'lucide:dollar-sign',
  DATE: 'lucide:calendar',
  DATE_TIME: 'lucide:calendar-clock',
  EMAIL: 'lucide:mail',
  FILE_UPLOAD: 'lucide:file-up',
  LONG_TEXT: 'lucide:align-left',
  MULTI_SELECT: 'lucide:list-checks',
  MULTIPLE_CHOICE: 'lucide:square-check',
  NUMBER: 'lucide:hash',
  PHONE_NUMBER: 'lucide:phone',
  SHORT_TEXT: 'mdi:form-textbox',
  SINGLE_CHOICE: 'mdi:radiobox-marked',
  SINGLE_SELECT: 'lucide:list-todo',
  TABLE: 'lucide:table',
  TIME: 'lucide:clock',
}

const CHOICE_QUESTION_TYPES = new Set([
  'SINGLE_SELECT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
])

const iconFor = (type: string) => QUESTION_TYPE_ICON[type] || 'lucide:circle'

const sampleTypeFor = (field: Question): PreviewSampleType => {
  if (field.type === 'CALCULATED') return 'calculated'
  if (['NUMBER', 'CURRENCY_AMOUNT', 'COUNTER'].includes(field.type))
    return 'number'
  if (['DATE', 'DATE_TIME', 'TIME'].includes(field.type)) return 'date'
  if (CHOICE_QUESTION_TYPES.has(field.type)) return 'choice'
  return 'text'
}

/**
 * Form-driven field picker for Report Builder (requirements 6-10): fields
 * come from the selected source form's real schema, plus any calculated
 * fields the user has added, instead of a hardcoded domain field list.
 */
const FieldsStepFormSource = () => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)
  const [search, setSearch] = useState('')
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)

  const {
    fields: sourceFields,
    isError,
    isLoading,
  } = useReportSourceFields(draft.sourceFormId)
  const allFields: Question[] = [...sourceFields, ...draft.customFields]

  const availableFields = allFields.filter(
    (field) =>
      !draft.fields.includes(field.id) &&
      (field.label || '').toLowerCase().includes(search.toLowerCase()),
  )
  const selectedFields = draft.fields
    .map((id) => allFields.find((f) => f.id === id))
    .filter((f): f is Question => Boolean(f))
  const expandedField = expandedFieldId
    ? (allFields.find((f) => f.id === expandedFieldId) ?? null)
    : null

  const addField = (field: Question) => {
    setDraft({
      fields: [...draft.fields, field.id],
      fieldSettings: {
        ...draft.fieldSettings,
        [field.id]: createDefaultFieldSetting(field.label),
      },
    })
  }

  const addCalculatedField = () => {
    const [newField] = createFieldQuestions('CALCULATED')
    const id = uid()
    const calculatedField: Question = {
      ...newField,
      id,
      label: t`Calculated Field`,
    }
    setDraft({
      customFields: [...draft.customFields, calculatedField],
      fields: [...draft.fields, id],
      fieldSettings: {
        ...draft.fieldSettings,
        [id]: {
          ...createDefaultFieldSetting(calculatedField.label),
          formulaTokens: [],
          isCalculated: true,
        },
      },
    })
    setExpandedFieldId(id)
  }

  const removeField = (fieldId: string) => {
    const nextSettings = { ...draft.fieldSettings }
    delete nextSettings[fieldId]
    setDraft({
      customFields: draft.customFields.filter((f) => f.id !== fieldId),
      fields: draft.fields.filter((id) => id !== fieldId),
      fieldSettings: nextSettings,
    })
    if (expandedFieldId === fieldId) setExpandedFieldId(null)
  }

  const moveField = (fieldId: string, direction: -1 | 1) => {
    const index = draft.fields.indexOf(fieldId)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= draft.fields.length) return
    const next = [...draft.fields]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    setDraft({ fields: next })
  }

  const changeField = (oldFieldId: string, nextField: Question) => {
    const index = draft.fields.indexOf(oldFieldId)
    if (index === -1) return
    const nextFields = [...draft.fields]
    nextFields[index] = nextField.id
    const nextSettings = { ...draft.fieldSettings }
    delete nextSettings[oldFieldId]
    nextSettings[nextField.id] = createDefaultFieldSetting(nextField.label)
    setDraft({
      customFields: draft.customFields.filter((f) => f.id !== oldFieldId),
      fields: nextFields,
      fieldSettings: nextSettings,
    })
    setExpandedFieldId(nextField.id)
  }

  useEffect(() => {
    if (expandedFieldId && settingsPanelRef.current) {
      settingsPanelRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
      settingsPanelRef.current.focus({ preventScroll: true })
    }
  }, [expandedFieldId])

  const previewColumns: PreviewColumn[] = selectedFields.map((field) => {
    const setting = draft.fieldSettings[field.id]
    return {
      id: field.id,
      label: setting?.label || field.label,
      sampleType: sampleTypeFor(field),
    }
  })

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2'>
        <div className='flex h-[420px] flex-col gap-3 rounded-xl border border-gray-3 p-3'>
          <div className='flex h-8 items-center justify-between gap-2'>
            <p className='text-13 font-medium text-gray-12'>{t`Available fields`}</p>
            <Button
              color='primary'
              icon='lucide:calculator'
              label={t`Add calculated field`}
              size='xs'
              variant='outline'
              onClick={addCalculatedField}
            />
          </div>
          <InputText
            placeholder={t`Search fields...`}
            value={search}
            clearable
            onChange={setSearch}
          />
          <div className='ez-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg border border-gray-3 p-2'>
            {isLoading ? (
              <p className='p-3 text-center text-12 text-gray-9'>{t`Loading fields...`}</p>
            ) : isError ? (
              <p className='p-3 text-center text-12 text-error-main'>{t`Couldn't load fields for this form. Try again.`}</p>
            ) : availableFields.length === 0 ? (
              <p className='p-3 text-center text-12 text-gray-9'>{t`No more fields to add.`}</p>
            ) : (
              availableFields.map((field) => (
                <button
                  className='flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-13 text-gray-12 transition-colors hover:border-gray-3 hover:bg-gray-1'
                  key={field.id}
                  type='button'
                  onClick={() => addField(field)}
                >
                  <Icon
                    className='size-4 shrink-0 text-gray-9'
                    name={iconFor(field.type)}
                  />
                  <span className='flex-1 truncate'>{field.label}</span>
                  <Icon
                    className='size-4 shrink-0 text-primary-9'
                    name='lucide:plus'
                  />
                </button>
              ))
            )}
          </div>
        </div>

        <div className='flex h-[420px] flex-col gap-3 rounded-xl border border-gray-3 p-3'>
          <div className='flex h-8 items-center'>
            <p className='text-13 font-medium text-gray-12'>
              {t`Selected fields`} ({selectedFields.length})
            </p>
          </div>
          <div className='h-8 shrink-0' />
          <div className='ez-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-3 p-2'>
            {selectedFields.length === 0 ? (
              <p className='p-3 text-center text-12 text-gray-9'>{t`No fields selected yet.`}</p>
            ) : (
              selectedFields.map((field, index) => {
                const setting =
                  draft.fieldSettings[field.id] ||
                  createDefaultFieldSetting(field.label)
                const isExpanded = expandedFieldId === field.id
                return (
                  <div
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${isExpanded ? 'bg-primary-1' : 'hover:bg-gray-1'}`}
                    key={field.id}
                  >
                    <Icon
                      className='size-4 shrink-0 text-gray-9'
                      name={iconFor(field.type)}
                    />
                    <span className='flex-1 truncate text-13 text-gray-12'>
                      {setting.label}
                    </span>
                    <div className='flex shrink-0 items-center'>
                      <IconButton
                        color='gray'
                        disabled={index === 0}
                        icon='lucide:chevron-up'
                        size='xs'
                        variant='ghost'
                        onClick={() => moveField(field.id, -1)}
                      />
                      <IconButton
                        color='gray'
                        disabled={index === selectedFields.length - 1}
                        icon='lucide:chevron-down'
                        size='xs'
                        variant='ghost'
                        onClick={() => moveField(field.id, 1)}
                      />
                      <IconButton
                        color={isExpanded ? 'primary' : 'gray'}
                        icon='lucide:settings-2'
                        size='xs'
                        variant='ghost'
                        onClick={() =>
                          setExpandedFieldId(isExpanded ? null : field.id)
                        }
                      />
                      <IconButton
                        color='red'
                        icon='lucide:x'
                        size='xs'
                        variant='ghost'
                        onClick={() => removeField(field.id)}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {expandedField && (
        <div
          className='rounded-xl border border-primary-4 bg-primary-1/40 outline-none'
          ref={settingsPanelRef}
          tabIndex={-1}
        >
          <div className='flex flex-wrap items-center justify-between gap-2 border-b border-primary-4 px-4 py-2.5'>
            <div className='flex items-center gap-2'>
              <Icon
                className='size-4 text-primary-10'
                name={iconFor(expandedField.type)}
              />
              <p className='text-13 font-semibold text-gray-13'>
                {t`Field settings`} —{' '}
                {draft.fieldSettings[expandedField.id]?.label ||
                  expandedField.label}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-48'>
                <InputSelect
                  options={availableFields.map((f) => ({
                    id: f.id,
                    name: f.label,
                  }))}
                  placeholder={t`Change field...`}
                  value={null}
                  onChange={(option) => {
                    const nextField = availableFields.find(
                      (f) => f.id === option?.id,
                    )
                    if (nextField) changeField(expandedField.id, nextField)
                  }}
                />
              </div>
              <IconButton
                color='gray'
                icon='lucide:x'
                size='xs'
                variant='ghost'
                onClick={() => setExpandedFieldId(null)}
              />
            </div>
          </div>
          <div className='p-4'>
            <FormFieldSettingsPanel
              field={expandedField}
              otherFields={allFields.filter((f) => f.id !== expandedField.id)}
              setting={
                draft.fieldSettings[expandedField.id] ||
                createDefaultFieldSetting(expandedField.label)
              }
              onChange={(patch) =>
                setDraft({
                  fieldSettings: {
                    ...draft.fieldSettings,
                    [expandedField.id]: {
                      ...(draft.fieldSettings[expandedField.id] ||
                        createDefaultFieldSetting(expandedField.label)),
                      ...patch,
                    },
                  },
                })
              }
            />
          </div>
        </div>
      )}

      <div className='flex flex-col gap-2'>
        <p className='text-13 font-medium text-gray-12'>{t`Live preview`}</p>
        <FieldsPreviewTable columns={previewColumns} />
      </div>
    </div>
  )
}

FieldsStepFormSource.displayName = 'FieldsStepFormSource'
export default FieldsStepFormSource
