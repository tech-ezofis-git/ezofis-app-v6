import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Question } from '@/pages/form-builder/store/formStore'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'
import cn from '@/utils/cn'
import type { PreviewColumn } from './FieldsPreviewTable'
import { useReportBuilderPreviewMutation } from '../../hooks/useReportBuilderApi'
import useReportSourceFields from '../../hooks/useReportSourceFields'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import { createDefaultFieldSetting } from '../../types'
import { isInputControlField } from '../../utils/fieldFilter'
import { sampleTypeForQuestionType } from '../../utils/previewSampleData'
import FieldsPreviewTable from './FieldsPreviewTable'
import FormFieldSettingsPanel from './FormFieldSettingsPanel'

const uid = () => Math.random().toString(36).slice(2, 9)

const QUESTION_TYPE_ICON: Record<string, string> = {
  ADDRESS: 'lucide:map-pin',
  CALCULATED: 'lucide:calculator',
  CHIPS: 'lucide:tag',
  CONSENT: 'lucide:shield-check',
  COUNTER: 'tabler:circle-dot',
  COUNTRY_CODE: 'lucide:globe',
  CURRENCY_AMOUNT: 'lucide:dollar-sign',
  DATE: 'lucide:calendar',
  DATE_TIME: 'lucide:calendar-clock',
  DYNAMIC_TABLE: 'lucide:table',
  EMAIL: 'lucide:mail',
  FILE_UPLOAD: 'lucide:file-up',
  FILL_IN_THE_BLANKS: 'lucide:text-cursor-input',
  FULL_NAME: 'lucide:user',
  IMAGE: 'lucide:image',
  IMAGE_UPLOAD: 'lucide:image',
  LONG_TEXT: 'lucide:align-left',
  MATRIX: 'lucide:grid',
  MULTI_SELECT: 'lucide:list-checks',
  MULTIPLE_CHOICE: 'lucide:square-check',
  NUMBER: 'lucide:hash',
  OPINION_SCALE: 'lucide:bar-chart-3',
  PASSWORD: 'lucide:lock',
  PHONE_NUMBER: 'lucide:phone',
  RATING: 'lucide:star',
  SCORE: 'lucide:trophy',
  SERIAL_NUMBER: 'lucide:hash',
  SHORT_TEXT: 'mdi:form-textbox',
  SIGNATURE: 'lucide:pen-tool',
  SINGLE_CHOICE: 'mdi:radiobox-marked',
  SINGLE_SELECT: 'lucide:list-todo',
  TABLE: 'lucide:table',
  TEXT_BUILDER: 'lucide:pilcrow',
  TIME: 'lucide:clock',
  URL: 'lucide:link',
  YES_NO_TOGGLE: 'lucide:toggle-left',
}

const iconFor = (type: string) => QUESTION_TYPE_ICON[type] || 'lucide:circle'

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)

  const {
    fields: sourceFields,
    isError,
    isLoading,
  } = useReportSourceFields(
    draft.sourceFormId,
    draft.sourceType,
    draft.sourceId,
  )
  const allFields: Question[] = useMemo(
    () => [...sourceFields, ...draft.customFields].filter(isInputControlField),
    [sourceFields, draft.customFields],
  )

  const availableFields = useMemo(
    () =>
      allFields.filter(
        (field) =>
          !draft.fields.includes(field.id) &&
          (field.label || '').toLowerCase().includes(search.toLowerCase()),
      ),
    [allFields, draft.fields, search],
  )
  const selectedFields = useMemo(
    () =>
      draft.fields
        .map((id) => allFields.find((f) => f.id === id))
        .filter((f): f is Question => Boolean(f)),
    [draft.fields, allFields],
  )
  const expandedField = expandedFieldId
    ? (allFields.find((f) => f.id === expandedFieldId) ?? null)
    : null

  // Clean up any stale design field IDs from draft.fields once fields are loaded
  useEffect(() => {
    if (isLoading || sourceFields.length === 0) return
    const validFieldIds = new Set(allFields.map((f) => f.id))
    const hasInvalid = draft.fields.some((id) => !validFieldIds.has(id))
    if (hasInvalid) {
      setDraft({
        fields: draft.fields.filter((id) => validFieldIds.has(id)),
      })
    }
  }, [isLoading, sourceFields.length, allFields, draft.fields, setDraft])

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
      sampleType: sampleTypeForQuestionType(field.type),
    }
  })

  const previewMutation = useReportBuilderPreviewMutation()
  const [previewRows, setPreviewRows] = useState<
    Record<string, string>[] | null
  >(null)

  useEffect(() => {
    if (!draft.sourceFormId || draft.fields.length === 0) {
      setPreviewRows(null)
      return
    }
    const timer = setTimeout(() => {
      previewMutation.mutate(draft, {
        onError: () => setPreviewRows([]),
        onSuccess: (result) => setPreviewRows(result.data?.rows ?? []),
      })
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft.fields/fieldSettings/filters cover what preview needs; previewMutation is stable
  }, [
    draft.sourceFormId,
    draft.fields,
    draft.fieldSettings,
    draft.filters,
    draft.domain,
  ])

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2'>
        <div className='flex h-[420px] flex-col gap-2 rounded-xl border border-gray-3 p-3'>
          <div className='flex min-h-7 items-center justify-between gap-2'>
            <p className='text-13 font-medium text-gray-12'>{t`Available fields`}</p>
            <div
              className={cn(
                'flex h-7 items-center overflow-hidden rounded-md border transition-all duration-200',
                isSearchExpanded || search
                  ? 'w-48 border-primary-6 bg-surface shadow-2xs'
                  : 'w-7 cursor-pointer justify-center border-gray-4 bg-surface text-gray-10 hover:border-gray-6 hover:bg-gray-1 hover:text-gray-13 active:scale-95',
              )}
              onClick={() => {
                if (!isSearchExpanded) {
                  setIsSearchExpanded(true)
                }
                setTimeout(() => searchInputRef.current?.focus(), 40)
              }}
            >
              <button
                aria-label={t`Search fields`}
                className='flex size-7 shrink-0 cursor-pointer items-center justify-center text-gray-10 transition-colors hover:text-gray-13'
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  setIsSearchExpanded((prev) => !prev)
                  if (!isSearchExpanded) {
                    setTimeout(() => searchInputRef.current?.focus(), 40)
                  }
                }}
              >
                <Icon
                  className={cn(
                    'size-3.5 shrink-0 transition-colors',
                    isSearchExpanded || search
                      ? 'text-primary-10'
                      : 'text-gray-10',
                  )}
                  name='lucide:search'
                />
              </button>

              {(isSearchExpanded || Boolean(search)) && (
                <input
                  className='h-full min-w-0 flex-1 bg-transparent pr-1 text-12 text-gray-13 outline-none placeholder:text-gray-8'
                  placeholder={t`Search fields...`}
                  ref={searchInputRef}
                  type='text'
                  value={search}
                  onBlur={() => {
                    if (!search) {
                      setIsSearchExpanded(false)
                    }
                  }}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearch('')
                      setIsSearchExpanded(false)
                    }
                  }}
                />
              )}

              {Boolean(search) && (
                <button
                  aria-label={t`Clear search`}
                  className='mr-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-9 transition hover:bg-gray-2 hover:text-gray-12'
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    setSearch('')
                    searchInputRef.current?.focus()
                  }}
                >
                  <Icon className='size-3' name='lucide:x' />
                </button>
              )}
            </div>
          </div>
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

        <div className='flex h-[420px] flex-col gap-2 rounded-xl border border-gray-3 p-3'>
          <div className='flex min-h-7 items-center'>
            <p className='text-13 font-medium text-gray-12'>
              {t`Selected fields`} ({selectedFields.length})
            </p>
          </div>
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
                  placeholder={t`Change field...`}
                  value={null}
                  options={availableFields.map((f) => ({
                    id: f.id,
                    name: f.label,
                  }))}
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
        <p className='text-13 font-medium text-gray-12'>{t`Preview Data`}</p>
        <FieldsPreviewTable
          columns={previewColumns}
          isLive={Boolean(draft.sourceFormId)}
          isLoading={previewMutation.isPending}
          rows={previewRows ?? undefined}
        />
      </div>
    </div>
  )
}

FieldsStepFormSource.displayName = 'FieldsStepFormSource'
export default FieldsStepFormSource
