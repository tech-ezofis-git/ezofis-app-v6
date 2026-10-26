import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { Question } from '@/pages/form-builder/store/formStore'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'
import cn from '@/utils/cn'
import type { ReportFieldSetting } from '../../types'
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

// Same layout as the AI fields step (FieldsStepAgent): both lists share one
// height so they line up side by side within the viewport.
const LIST_HEIGHT = 'max-h-[min(420px,50vh)] md:h-[min(420px,50vh)]'

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

  const unselectedFields = useMemo(
    () => allFields.filter((field) => !draft.fields.includes(field.id)),
    [allFields, draft.fields],
  )
  // Every search word must appear in the label, in any order.
  const availableFields = useMemo(() => {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return unselectedFields.filter((field) => {
      const label = (field.label || '').toLowerCase()
      return words.every((word) => label.includes(word))
    })
  }, [unselectedFields, search])
  const selectedFields = useMemo(
    () =>
      draft.fields
        .map((id) => allFields.find((f) => f.id === id))
        .filter((f): f is Question => Boolean(f)),
    [draft.fields, allFields],
  )
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

  const settingFor = (field: Question) =>
    draft.fieldSettings[field.id] || createDefaultFieldSetting(field.label)

  const updateSetting = (field: Question, patch: Partial<ReportFieldSetting>) =>
    setDraft({
      fieldSettings: {
        ...draft.fieldSettings,
        [field.id]: { ...settingFor(field), ...patch },
      },
    })

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

  const runPreview = () => {
    if (!draft.sourceFormId || draft.fields.length === 0) {
      setPreviewRows(null)
      return
    }
    previewMutation.mutate(draft, {
      onError: () => setPreviewRows([]),
      onSuccess: (result) => setPreviewRows(result.data?.rows ?? []),
    })
  }

  useEffect(() => {
    const timer = setTimeout(runPreview, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft.fields/fieldSettings/filters cover what preview needs; previewMutation is stable
  }, [
    draft.sourceFormId,
    draft.fields,
    draft.fieldSettings,
    draft.filters,
    draft.domain,
  ])

  const isLive = Boolean(draft.sourceFormId)
  const isPreviewPending = previewMutation.isPending
  const hasPreviewRows = Boolean(previewRows?.length)

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'>
        {/* Selected columns */}
        <section className='flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface shadow-sm'>
          <header className='flex items-center gap-2.5 border-b border-gray-3 bg-gray-1/60 px-3.5 py-2.5'>
            <span className='flex size-7 items-center justify-center rounded-lg bg-primary-3 text-primary-11'>
              <Icon className='size-4' name='lucide:columns-3' />
            </span>
            <div className='min-w-0 flex-1'>
              <p className='text-13 font-semibold text-gray-13'>{t`Selected columns`}</p>
              <p className='text-11 text-gray-9'>{t`Shown in this order in the report`}</p>
            </div>
            <span className='rounded-full bg-primary-3 px-2 py-0.5 text-11 font-semibold text-primary-11'>
              {selectedFields.length}
            </span>
          </header>

          <div className={cn('ez-scrollbar overflow-y-auto p-2', LIST_HEIGHT)}>
            {selectedFields.length === 0 ? (
              <div className='flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center'>
                <Icon
                  className='size-6 text-gray-7'
                  name='lucide:mouse-pointer-click'
                />
                <p className='text-13 text-gray-10'>{t`No columns selected yet.`}</p>
                <p className='text-12 text-gray-9'>{t`Add columns from the list.`}</p>
              </div>
            ) : (
              <ul className='flex flex-col gap-1.5'>
                <AnimatePresence initial={false}>
                  {selectedFields.map((field, index) => {
                    const setting = settingFor(field)
                    const isExpanded = expandedFieldId === field.id
                    const hasHighlight =
                      setting.colType === 'status' &&
                      Boolean(setting.statusRules?.length)

                    return (
                      <motion.li
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        initial={{ opacity: 0, y: 6 }}
                        key={field.id}
                        transition={{ duration: 0.18 }}
                        layout
                        className={cn(
                          'group rounded-lg border transition-colors',
                          isExpanded
                            ? 'border-primary-6 bg-primary-1'
                            : 'border-gray-3 bg-surface hover:border-gray-5 hover:bg-gray-1/60',
                        )}
                      >
                        <div className='flex items-center gap-2 px-2 py-1.5'>
                          <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-gray-2 text-11 font-semibold text-gray-10'>
                            {index + 1}
                          </span>
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-13 font-medium text-gray-12'>
                              {setting.label}
                            </p>
                            {setting.label !== field.label && (
                              <p className='truncate text-11 text-gray-9'>
                                {field.label}
                              </p>
                            )}
                          </div>
                          {hasHighlight && (
                            <span className='hidden shrink-0 rounded-full border border-primary-5 bg-primary-3 px-2 py-0.5 text-11 text-primary-11 sm:inline'>
                              {t`Highlighted`}
                            </span>
                          )}
                          <span className='hidden size-6 shrink-0 items-center justify-center rounded-md bg-gray-2 sm:flex'>
                            <Icon
                              className='size-3.5 text-gray-10'
                              name={iconFor(field.type)}
                            />
                          </span>
                          <div
                            className={cn(
                              'flex shrink-0 items-center transition-opacity',
                              isExpanded
                                ? 'opacity-100'
                                : 'opacity-70 group-hover:opacity-100',
                            )}
                          >
                            <IconButton
                              ariaLabel={t`Move ${setting.label} up`}
                              color='gray'
                              disabled={index === 0}
                              icon='lucide:chevron-up'
                              size='sm'
                              variant='ghost'
                              onClick={() => moveField(field.id, -1)}
                            />
                            <IconButton
                              ariaLabel={t`Move ${setting.label} down`}
                              color='gray'
                              disabled={index === selectedFields.length - 1}
                              icon='lucide:chevron-down'
                              size='sm'
                              variant='ghost'
                              onClick={() => moveField(field.id, 1)}
                            />
                            <IconButton
                              ariaLabel={t`Configure ${setting.label}`}
                              color={isExpanded ? 'primary' : 'gray'}
                              icon='lucide:settings-2'
                              size='sm'
                              variant='ghost'
                              onClick={() =>
                                setExpandedFieldId(isExpanded ? null : field.id)
                              }
                            />
                            <IconButton
                              ariaLabel={t`Remove ${setting.label}`}
                              color='red'
                              icon='lucide:x'
                              size='sm'
                              variant='ghost'
                              onClick={() => removeField(field.id)}
                            />
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              animate={{ height: 'auto', opacity: 1 }}
                              className='overflow-hidden'
                              exit={{ height: 0, opacity: 0 }}
                              initial={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className='mx-2 mb-2 flex flex-col gap-3 rounded-lg border border-gray-3 bg-surface p-3'>
                                {unselectedFields.length > 0 && (
                                  <InputSelect
                                    label={t`Change field`}
                                    placeholder={t`Change field...`}
                                    value={null}
                                    options={unselectedFields.map((f) => ({
                                      id: f.id,
                                      name: f.label,
                                    }))}
                                    onChange={(option) => {
                                      const nextField = unselectedFields.find(
                                        (f) => f.id === option?.id,
                                      )
                                      if (nextField)
                                        changeField(field.id, nextField)
                                    }}
                                  />
                                )}
                                <FormFieldSettingsPanel
                                  field={field}
                                  otherFields={allFields.filter(
                                    (f) => f.id !== field.id,
                                  )}
                                  setting={setting}
                                  onChange={(patch) =>
                                    updateSetting(field, patch)
                                  }
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </section>

        {/* Available columns */}
        <section className='flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface shadow-sm'>
          <header className='flex flex-col gap-2 border-b border-gray-3 bg-gray-1/60 px-3.5 py-2.5'>
            <div className='flex items-center gap-2.5'>
              <span className='flex size-7 items-center justify-center rounded-lg bg-blue-3 text-blue-11'>
                <Icon className='size-4' name='lucide:list-plus' />
              </span>
              <div className='min-w-0 flex-1'>
                <p className='text-13 font-semibold text-gray-13'>{t`Available columns`}</p>
                <p className='text-11 text-gray-9'>{t`Click a column to add it`}</p>
              </div>
              <span className='rounded-full bg-gray-3 px-2 py-0.5 text-11 font-semibold text-gray-11'>
                {unselectedFields.length}
              </span>
            </div>
            <InputText
              placeholder={t`Search columns...`}
              value={search}
              leftSection={
                <Icon className='size-3.5 text-gray-9' name='lucide:search' />
              }
              onChange={setSearch}
            />
          </header>

          <div className={cn('ez-scrollbar overflow-y-auto', LIST_HEIGHT)}>
            {isLoading ? (
              <div className='flex h-full min-h-40 flex-col items-center justify-center gap-2 p-4 text-center'>
                <Icon
                  className='size-6 animate-spin text-primary-10'
                  name='lucide:loader-2'
                />
                <p className='text-13 text-gray-10'>{t`Loading fields...`}</p>
              </div>
            ) : isError ? (
              <div className='flex h-full min-h-40 flex-col items-center justify-center gap-2 p-4 text-center'>
                <Icon
                  className='size-6 text-red-9'
                  name='lucide:circle-alert'
                />
                <p className='text-13 text-red-11'>{t`Couldn't load fields for this form. Try again.`}</p>
              </div>
            ) : availableFields.length === 0 ? (
              <div className='flex h-full min-h-40 flex-col items-center justify-center gap-2 p-4 text-center'>
                <Icon className='size-6 text-gray-7' name='lucide:search-x' />
                <p className='text-13 text-gray-10'>
                  {unselectedFields.length === 0
                    ? t`No more columns available.`
                    : t`No columns match "${search.trim()}".`}
                </p>
              </div>
            ) : (
              <ul className='flex flex-col gap-0.5 p-1.5'>
                {availableFields.map((field) => (
                  <li key={field.id}>
                    <button
                      className='group/add flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-primary-1 active:scale-[0.98]'
                      type='button'
                      onClick={() => addField(field)}
                    >
                      <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-2'>
                        <Icon
                          className='size-4 text-gray-10'
                          name={iconFor(field.type)}
                        />
                      </span>
                      <span className='block min-w-0 flex-1 truncate text-13 text-gray-12'>
                        {field.label}
                      </span>
                      <span className='flex size-6 shrink-0 items-center justify-center rounded-md border border-gray-4 text-gray-9 transition-colors group-hover/add:border-primary-6 group-hover/add:bg-primary-9 group-hover/add:text-text-on-accent'>
                        <Icon className='size-3.5' name='lucide:plus' />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Live preview */}
      <section className='flex flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface shadow-sm'>
        <header className='flex items-center gap-2.5 border-b border-gray-3 bg-gray-1/60 px-3.5 py-2.5'>
          <span className='flex size-7 items-center justify-center rounded-lg bg-green-3 text-green-11'>
            <Icon className='size-4' name='lucide:table-2' />
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-13 font-semibold text-gray-13'>
              {isLive ? t`Live preview` : t`Preview`}
            </p>
            <p className='text-11 text-gray-9'>
              {isPreviewPending
                ? t`Running report...`
                : t`Updates when you add or remove columns`}
            </p>
          </div>
          {isPreviewPending && (
            <Icon
              className='size-4 animate-spin text-primary-10'
              name='lucide:loader-2'
            />
          )}
          {isLive && (
            <Button
              color='gray'
              disabled={isPreviewPending || draft.fields.length === 0}
              icon='lucide:refresh-cw'
              label={t`Run again`}
              size='xs'
              variant='ghost'
              onClick={runPreview}
            />
          )}
        </header>
        <div className='p-3'>
          <div
            className={cn(
              'transition-opacity',
              isPreviewPending && hasPreviewRows && 'opacity-60',
            )}
          >
            <FieldsPreviewTable
              columns={previewColumns}
              fieldSettings={draft.fieldSettings}
              isLive={isLive}
              isLoading={isPreviewPending && !hasPreviewRows}
              rows={previewRows ?? undefined}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

FieldsStepFormSource.displayName = 'FieldsStepFormSource'
export default FieldsStepFormSource
