import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import type { ReportDomain } from '../../constants'
import type { PreviewColumn } from './FieldsPreviewTable'
import { DOMAIN_FIELDS } from '../../constants'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import { createDefaultFieldSetting } from '../../types'
import { sampleTypeForDomainFieldType } from '../../utils/previewSampleData'
import FieldSettingsPanel from './FieldSettingsPanel'
import FieldsPreviewTable from './FieldsPreviewTable'

const FIELD_TYPE_ICON: Record<string, string> = {
  Choice: 'lucide:list',
  Date: 'lucide:calendar',
  Number: 'lucide:hash',
  Text: 'lucide:type',
  User: 'lucide:user',
}

/**
 * Legacy domain-driven field picker (DOMAIN_FIELDS) — kept behaviourally
 * equivalent to the pre-revamp FieldsStep so the 5 seed reports (which have
 * no sourceFormId) keep working unchanged. Only rendered when
 * draft.sourceFormId is empty and draft.domain is set.
 */
const FieldsStepLegacyDomain = () => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)
  const [search, setSearch] = useState('')
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)

  const domainFields = DOMAIN_FIELDS[draft.domain as ReportDomain] || []
  const availableFields = domainFields.filter(
    (field) =>
      !draft.fields.includes(field.id) &&
      field.label.toLowerCase().includes(search.toLowerCase()),
  )
  const selectedFields = draft.fields
    .map((id) => domainFields.find((f) => f.id === id))
    .filter((f): f is (typeof domainFields)[number] => Boolean(f))
  const expandedField = expandedFieldId
    ? (domainFields.find((f) => f.id === expandedFieldId) ?? null)
    : null

  const addField = (fieldId: string, label: string) => {
    setDraft({
      fields: [...draft.fields, fieldId],
      fieldSettings: {
        ...draft.fieldSettings,
        [fieldId]: createDefaultFieldSetting(label),
      },
    })
  }

  const removeField = (fieldId: string) => {
    const nextSettings = { ...draft.fieldSettings }
    delete nextSettings[fieldId]
    setDraft({
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

  const changeField = (
    oldFieldId: string,
    nextField: (typeof domainFields)[number],
  ) => {
    const index = draft.fields.indexOf(oldFieldId)
    if (index === -1) return
    const nextFields = [...draft.fields]
    nextFields[index] = nextField.id
    const nextSettings = { ...draft.fieldSettings }
    delete nextSettings[oldFieldId]
    nextSettings[nextField.id] = createDefaultFieldSetting(nextField.label)
    setDraft({ fields: nextFields, fieldSettings: nextSettings })
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
      sampleType: sampleTypeForDomainFieldType(field.type),
    }
  })

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2'>
        <div className='flex h-[420px] flex-col gap-3 rounded-xl border border-gray-3 p-3'>
          <div className='flex h-8 items-center'>
            <p className='text-13 font-medium text-gray-12'>{t`Available fields`}</p>
          </div>
          <InputText
            placeholder={t`Search fields...`}
            value={search}
            clearable
            onChange={setSearch}
          />
          <div className='ez-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg border border-gray-3 p-2'>
            {availableFields.length === 0 ? (
              <p className='p-3 text-center text-12 text-gray-9'>{t`No more fields to add.`}</p>
            ) : (
              availableFields.map((field) => (
                <button
                  className='flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-13 text-gray-12 transition-colors hover:border-gray-3 hover:bg-gray-1'
                  key={field.id}
                  type='button'
                  onClick={() => addField(field.id, field.label)}
                >
                  <Icon
                    className='size-4 shrink-0 text-gray-9'
                    name={FIELD_TYPE_ICON[field.type] || 'lucide:circle'}
                  />
                  <span className='flex-1'>{field.label}</span>
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
                      name={FIELD_TYPE_ICON[field.type] || 'lucide:circle'}
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
                name={FIELD_TYPE_ICON[expandedField.type] || 'lucide:circle'}
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
            <FieldSettingsPanel
              field={expandedField}
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

FieldsStepLegacyDomain.displayName = 'FieldsStepLegacyDomain'
export default FieldsStepLegacyDomain
