import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import RichTextView from '@/components/base/inputs/RichTextView'
import { formatRuntimeFieldDisplayValue } from '@/pages/form-builder/helpers/runtimeFieldAdapter'
import { isFieldHidden } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import cn from '@/utils/cn'
import { formPanelSectionId, getFormPanelTitle } from '../helpers/portalDetail'
import {
  formatAnswer,
  type FormControl,
  type FormPanel,
  isQuestionField,
  type PortalFormQuestion,
  toFormQuestion,
} from '../helpers/portalForm'
import PortalTableField from './PortalTableField'

type PortalSubmissionDetailsProps = {
  /** The request's attachments, to resolve files stored in table cells. */
  attachments?: Record<string, unknown>[]
  formModel: Record<string, unknown>
  openIds: Set<string>
  panels: FormPanel[]
  onOpenAttachment?: (attachment: Record<string, unknown>) => void
  onToggle: (id: string) => void
}

type SectionItem =
  | { kind: 'field'; question: PortalFormQuestion }
  | { kind: 'table'; question: PortalFormQuestion }

const TABLE_TYPES = new Set(['TABLE', 'DYNAMIC_TABLE'])
const WIDE_TYPES = new Set([
  'LONG_TEXT',
  'TEXT_AREA',
  'RICH_TEXT',
  'TEXT_BUILDER',
])

const isTableField = (field: FormControl) =>
  TABLE_TYPES.has(String(field.type || '').toUpperCase()) &&
  !isFieldHidden(field)

const valueOf = (
  question: PortalFormQuestion,
  formModel: Record<string, unknown>,
) => {
  const keys = [
    question.id,
    question.field.id,
    question.field.jsonId,
    question.field.name,
    question.field.label,
  ]
  for (const key of keys) {
    if (key == null) continue
    const value = formModel[String(key)]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return formModel[question.id]
}

const displayOf = (value: unknown, field: FormControl) => {
  const formatted = formatRuntimeFieldDisplayValue(value, field)
  if (formatted && formatted !== '-') return formatted
  return formatAnswer(value)
}

const collectOcrFieldIds = (panels: FormPanel[]) => {
  const ids = new Set<string>()
  panels.forEach((panel) => {
    ;(panel.fields || []).forEach((field) => {
      const settings =
        field.settings && typeof field.settings === 'object'
          ? (field.settings as Record<string, unknown>)
          : {}
      const validation =
        settings.validation && typeof settings.validation === 'object'
          ? (settings.validation as Record<string, unknown>)
          : {}
      const assigned = validation.assignOtherControls
      if (!Array.isArray(assigned)) return
      assigned.forEach((id) => {
        if (id != null && String(id).trim()) ids.add(String(id))
      })
    })
  })
  return ids
}

const PortalSubmissionDetails = ({
  attachments,
  formModel,
  openIds,
  panels,
  onOpenAttachment,
  onToggle,
}: PortalSubmissionDetailsProps) => {
  const { t } = useLingui()

  const sections = useMemo(
    () =>
      panels
        .map((panel, index) => {
          const items: SectionItem[] = []
          ;(panel.fields || []).forEach((field, fieldIndex) => {
            if (isTableField(field)) {
              items.push({
                kind: 'table',
                question: toFormQuestion(field, fieldIndex),
              })
            } else if (isQuestionField(field)) {
              items.push({
                kind: 'field',
                question: toFormQuestion(field, fieldIndex),
              })
            }
          })
          return {
            id: formPanelSectionId(panel, index),
            items,
            title: getFormPanelTitle(panel, index),
          }
        })
        .filter((section) => section.items.length > 0),
    [panels],
  )

  const ocrFieldIds = useMemo(() => collectOcrFieldIds(panels), [panels])

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-300'>
      <h2 className='text-15 font-bold text-gray-13'>{t`Submission Details`}</h2>

      {sections.length === 0 ? (
        <div className='rounded-xl border border-gray-4 bg-surface p-5 shadow-sm'>
          <p className='text-13 text-gray-10'>{t`No form fields found for this request.`}</p>
        </div>
      ) : (
        sections.map((section) => {
          const open = openIds.has(section.id)
          const fieldItems = section.items.filter(
            (item) => item.kind === 'field',
          )
          const filledCount = fieldItems.filter(
            (item) =>
              displayOf(
                valueOf(item.question, formModel),
                item.question.field,
              ) !== '—',
          ).length
          const totalCount = fieldItems.length

          return (
            <section
              className='scroll-mt-3 overflow-hidden rounded-2xl border border-gray-3 bg-surface shadow-xs transition-shadow duration-200 hover:shadow-sm'
              id={section.id}
              key={section.id}
            >
              <button
                className='flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-gray-1 active:bg-gray-2'
                type='button'
                onClick={() => onToggle(section.id)}
              >
                <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-1 text-primary-9'>
                  <Icon className='size-4' name='lucide:file-text' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-14 font-semibold text-gray-13'>
                    {section.title}
                  </span>
                  {fieldItems.length > 0 && (
                    <span className='block text-12 text-gray-10'>
                      {t`${filledCount} of ${totalCount} fields filled`}
                    </span>
                  )}
                </span>
                <Icon
                  name='lucide:chevron-down'
                  className={cn(
                    'size-4 shrink-0 text-gray-9 transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                />
              </button>

              {open && (
                <div className='animate-in fade-in slide-in-from-top-1 grid grid-cols-1 gap-x-8 border-t border-gray-3 px-5 pt-1 pb-5 duration-200 sm:grid-cols-2 lg:grid-cols-3'>
                  {section.items.map((item) => {
                    const { question } = item
                    const value = valueOf(question, formModel)

                    if (item.kind === 'table') {
                      return (
                        <PortalTableField
                          attachments={attachments}
                          field={question.field}
                          key={question.id}
                          label={question.label}
                          value={value}
                          onOpenAttachment={onOpenAttachment}
                        />
                      )
                    }

                    const display = displayOf(value, question.field)
                    const filled = display !== '—'
                    // Only fields an upload's OCR mapping actually fills get
                    // the badge; a form with no mapping shows none.
                    const showOcr =
                      filled &&
                      (ocrFieldIds.has(question.id) ||
                        ocrFieldIds.has(String(question.field.id || '')) ||
                        ocrFieldIds.has(String(question.field.jsonId || '')))
                    const wide = WIDE_TYPES.has(
                      String(question.type || '').toUpperCase(),
                    )
                    // Text Builder is saved as HTML: show it formatted, not as tags.
                    const isRichText =
                      String(question.type || '').toUpperCase() ===
                        'TEXT_BUILDER' && typeof value === 'string'

                    return (
                      <div
                        key={question.id}
                        className={cn(
                          'min-w-0 border-b border-gray-3 py-3',
                          wide && 'sm:col-span-2 lg:col-span-3',
                        )}
                      >
                        <div className='mb-0.5 flex min-w-0 items-center gap-1.5'>
                          <span className='truncate text-12 font-medium text-gray-10'>
                            {question.label}
                          </span>
                          {showOcr && (
                            <span
                              className='inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--teal-2)] px-1.5 py-px text-[10px] font-semibold text-[var(--teal-11)]'
                              title={t`Filled from the uploaded document`}
                            >
                              <Icon
                                className='size-2.5'
                                name='lucide:scan-text'
                              />
                              OCR
                            </span>
                          )}
                        </div>
                        {filled && isRichText ? (
                          <RichTextView html={String(value)} />
                        ) : (
                          <p
                            className={cn(
                              'text-14 break-words',
                              filled
                                ? 'font-semibold text-gray-13'
                                : 'text-gray-8',
                              wide && 'whitespace-pre-wrap',
                            )}
                          >
                            {filled ? display : t`Not provided`}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}

PortalSubmissionDetails.displayName = 'PortalSubmissionDetails'
export default PortalSubmissionDetails
