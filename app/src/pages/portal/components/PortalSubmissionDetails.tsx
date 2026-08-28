import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
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
  panels: FormPanel[]
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
  panels,
}: PortalSubmissionDetailsProps) => {
  const { t } = useLingui()
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

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

  const toggleSection = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-gray-4 bg-surface p-5 shadow-sm duration-300'>
      <h2 className='mb-4 text-15 font-bold text-gray-13'>{t`Submission Details`}</h2>

      {sections.length === 0 ? (
        <p className='text-13 text-gray-10'>{t`No form fields found for this request.`}</p>
      ) : (
        <div className='flex flex-col gap-5'>
          {sections.map((section) => {
            const collapsed = collapsedIds.has(section.id)

            return (
              <section className='scroll-mt-3' id={section.id} key={section.id}>
                <button
                  className='flex w-full items-center gap-1.5 rounded-md py-1 text-left transition-all duration-200 hover:opacity-80 active:scale-[0.99]'
                  type='button'
                  onClick={() => toggleSection(section.id)}
                >
                  <Icon
                    name='lucide:chevron-right'
                    className={cn(
                      'size-3.5 shrink-0 text-primary-9 transition-transform duration-200',
                      !collapsed && 'rotate-90',
                    )}
                  />
                  <span className='text-12 font-semibold tracking-wider text-primary-9 uppercase'>
                    {section.title}
                  </span>
                </button>

                {!collapsed && (
                  <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
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
          })}
        </div>
      )}
    </div>
  )
}

PortalSubmissionDetails.displayName = 'PortalSubmissionDetails'
export default PortalSubmissionDetails
