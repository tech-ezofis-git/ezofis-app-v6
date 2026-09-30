import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import { formPanelSectionId, getFormPanelTitle } from '../helpers/portalDetail'
import {
  formatAnswer,
  type FormPanel,
  isQuestionField,
  type PortalFormQuestion,
  toFormQuestion,
} from '../helpers/portalForm'
import PortalMetaRow from './PortalMetaRow'

type PortalSubmissionDetailsProps = {
  formModel: Record<string, unknown>
  openIds: Set<string>
  panels: FormPanel[]
  onToggle: (id: string) => void
}

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
  formModel,
  openIds,
  panels,
  onToggle,
}: PortalSubmissionDetailsProps) => {
  const { t } = useLingui()

  const sections = useMemo(
    () =>
      panels
        .map((panel, index) => {
          const questions = (panel.fields || [])
            .filter(isQuestionField)
            .map(toFormQuestion)
          return {
            id: formPanelSectionId(panel, index),
            questions,
            title: getFormPanelTitle(panel, index),
          }
        })
        .filter((section) => section.questions.length > 0),
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

          return (
            <section
              className='scroll-mt-3 overflow-hidden rounded-xl border border-gray-4 bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md'
              id={section.id}
              key={section.id}
            >
              <button
                type='button'
                className={cn(
                  'flex w-full items-center gap-2 px-5 py-4 text-left transition-colors duration-200 hover:bg-gray-1 active:scale-[0.99]',
                  open && 'bg-gray-1',
                )}
                onClick={() => onToggle(section.id)}
              >
                <Icon
                  name='lucide:chevron-right'
                  className={cn(
                    'size-3.5 shrink-0 text-primary-9 transition-transform duration-200',
                    open && 'rotate-90',
                  )}
                />
                <span className='min-w-0 flex-1 text-12 font-semibold tracking-wider text-primary-9 uppercase'>
                  {section.title}
                </span>
              </button>

              {open && (
                <div className='animate-in fade-in slide-in-from-top-1 border-t border-gray-4 px-5 py-4 duration-200'>
                  {section.questions.map((question) => {
                    const value = valueOf(question, formModel)
                    const filled = formatAnswer(value) !== '—'
                    const showOcr =
                      filled &&
                      (ocrFieldIds.size === 0 ||
                        ocrFieldIds.has(question.id) ||
                        ocrFieldIds.has(String(question.field.id || '')))

                    return (
                      <PortalMetaRow
                        badge={showOcr ? 'ocr' : undefined}
                        key={question.id}
                        label={question.label}
                        padded={false}
                        value={formatAnswer(value)}
                      />
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
