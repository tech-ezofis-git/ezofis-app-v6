import { useLingui } from '@lingui/react/macro'
import { DatePicker } from '@mantine/dates'
import { useEffect, useRef, useState } from 'react'
import type { Option } from '@/types/option'
import IconButton from '@/components/base/button/IconButton'
import InputText from '@/components/base/inputs/InputText'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'
import {
  type AnswerMap,
  formatAnswer,
  isAnswerFilled,
  isDateQuestion,
  isQuestionVisited,
  isSelectQuestion,
  type PortalFormQuestion,
  type PortalQuestionPanel,
} from '../helpers/portalForm'

type ChatMessage = {
  id: string
  pills?: Option[]
  selectedPill?: string
  sender: 'assistant' | 'user'
  showDatePicker?: boolean
  skipped?: boolean
  text: string
}

type PortalWizardChatProps = {
  answers: AnswerMap
  panel: PortalQuestionPanel
  onAnswer: (questionId: string, value: unknown) => void
}

const questionPrompt = (question: PortalFormQuestion) =>
  `What is the ${question.label}?`

const PortalWizardChat = ({
  answers,
  panel,
  onAnswer,
}: PortalWizardChatProps) => {
  const { t } = useLingui()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [awaiting, setAwaiting] = useState<PortalFormQuestion | null>(null)
  const [inputText, setInputText] = useState('')
  const [showAllPills, setShowAllPills] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const seeded: ChatMessage[] = []
    let nextQuestion: PortalFormQuestion | null = null

    panel.questions.forEach((question) => {
      const value = answers[question.id]
      if (isQuestionVisited(value)) {
        const skipped = !isAnswerFilled(value)
        seeded.push({
          id: `ask-${question.id}`,
          pills: isSelectQuestion(question) ? question.options : undefined,
          selectedPill: skipped ? t`Skipped` : formatAnswer(value),
          sender: 'assistant',
          text: questionPrompt(question),
        })
        seeded.push({
          id: `ans-${question.id}`,
          sender: 'user',
          skipped,
          text: skipped ? t`Skipped` : formatAnswer(value),
        })
        return
      }
      if (!nextQuestion) nextQuestion = question
    })

    if (nextQuestion) {
      seeded.push({
        id: `ask-${nextQuestion.id}`,
        pills: isSelectQuestion(nextQuestion)
          ? nextQuestion.options
          : undefined,
        sender: 'assistant',
        showDatePicker: isDateQuestion(nextQuestion),
        text: questionPrompt(nextQuestion),
      })
    } else {
      seeded.push({
        id: `done-${panel.id}`,
        sender: 'assistant',
        text: t`That's everything for this section. Continue when you're ready.`,
      })
    }

    setMessages(seeded)
    setAwaiting(nextQuestion)
    setInputText('')
    setShowAllPills(false)
    // Seed once when the panel opens — later answers update through submitAnswer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.id])

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      behavior: 'smooth',
      top: scrollerRef.current.scrollHeight,
    })
  }, [messages])

  const submitAnswer = (raw: string, skipped = false) => {
    if (!awaiting) return
    const value = skipped ? '' : raw.trim()
    if (!skipped && !value) return

    const question = awaiting
    onAnswer(question.id, value)
    setShowAllPills(false)
    setInputText('')

    const nextAnswers = { ...answers, [question.id]: value }
    const remaining =
      panel.questions.find(
        (item) => !isQuestionVisited(nextAnswers[item.id]),
      ) || null

    setMessages((prev) => {
      const next = prev.map((message) =>
        message.id === `ask-${question.id}`
          ? { ...message, selectedPill: skipped ? t`Skipped` : value }
          : message,
      )
      next.push({
        id: `ans-${question.id}-${Date.now()}`,
        sender: 'user',
        skipped,
        text: skipped ? t`Skipped` : value,
      })

      if (remaining) {
        next.push({
          id: `ask-${remaining.id}`,
          pills: isSelectQuestion(remaining) ? remaining.options : undefined,
          sender: 'assistant',
          showDatePicker: isDateQuestion(remaining),
          text: questionPrompt(remaining),
        })
      } else {
        next.push({
          id: `done-${panel.id}-${Date.now()}`,
          sender: 'assistant',
          text: t`That's everything for this section. Continue when you're ready.`,
        })
      }
      return next
    })
    setAwaiting(remaining)
  }

  const visiblePills = (pills: Option[]) =>
    showAllPills ? pills : pills.slice(0, 3)
  const hiddenCount = (pills: Option[]) => Math.max(0, pills.length - 3)

  return (
    <div className='flex flex-col gap-3'>
      <div className='border-b border-gray-4 pb-3 text-15 font-semibold text-gray-13'>
        {panel.title}
      </div>

      <div
        className='flex max-h-80 flex-col gap-3 overflow-y-auto pr-1'
        ref={scrollerRef}
      >
        {messages.map((message) => {
          if (message.sender === 'user') {
            return (
              <div className='flex justify-end' key={message.id}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-13 font-medium',
                    message.skipped
                      ? 'border border-gray-4 bg-gray-2 text-gray-9'
                      : 'bg-primary-9 text-gray-0',
                  )}
                >
                  {message.text}
                </div>
              </div>
            )
          }

          const pills = message.pills || []
          const canPick = !message.selectedPill && awaiting

          return (
            <div className='flex flex-col gap-2' key={message.id}>
              <div className='flex items-start gap-2.5'>
                <span className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary-3 bg-primary-1 text-primary-11'>
                  <AiBrandIcon className='size-3.5' />
                </span>
                <div className='rounded-2xl rounded-tl-sm border border-gray-4 bg-gray-2 px-4 py-2.5 text-13 text-gray-12'>
                  {message.text}
                </div>
              </div>

              {pills.length > 0 && (
                <div className='ml-9 flex flex-wrap gap-2'>
                  {visiblePills(pills).map((pill) => {
                    const selected =
                      message.selectedPill === pill.name ||
                      message.selectedPill === String(pill.id)
                    return (
                      <button
                        disabled={!canPick}
                        key={String(pill.id)}
                        type='button'
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-12 font-semibold transition hover:bg-primary-2 active:scale-95',
                          selected
                            ? 'border-primary-9 bg-primary-9 text-gray-0'
                            : 'border-primary-4 bg-surface text-primary-11',
                          message.selectedPill &&
                            !selected &&
                            'pointer-events-none opacity-50',
                        )}
                        onClick={() => submitAnswer(String(pill.id))}
                      >
                        {pill.name}
                      </button>
                    )
                  })}
                  {!showAllPills &&
                    hiddenCount(pills) > 0 &&
                    !message.selectedPill && (
                      <button
                        className='rounded-full border border-gray-4 bg-surface px-3 py-1.5 text-12 font-semibold text-gray-11 transition hover:border-primary-6 hover:bg-primary-2 active:scale-95'
                        type='button'
                        onClick={() => setShowAllPills(true)}
                      >
                        +{hiddenCount(pills)} {t`more`}
                      </button>
                    )}
                </div>
              )}

              {message.showDatePicker && canPick && (
                <div className='ml-9 inline-block rounded-xl border border-gray-4 bg-surface p-3'>
                  <DatePicker
                    allowDeselect
                    classNames={{
                      day: 'cursor-pointer text-13 text-gray-11 hover:bg-gray-4 data-[selected]:!bg-primary-9 data-[selected]:!text-gray-0',
                      weekday: 'text-12 text-gray-10',
                    }}
                    onChange={(value) => {
                      if (!value) return
                      const date = new Date(value)
                      if (Number.isNaN(date.getTime())) return
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const day = String(date.getDate()).padStart(2, '0')
                      submitAnswer(`${date.getFullYear()}-${month}-${day}`)
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {awaiting ? (
        <div className='flex items-center gap-2 border-t border-gray-3 pt-3'>
          <div className='min-w-0 flex-1'>
            <InputText
              placeholder={awaiting.placeholder || t`Type your answer…`}
              rightSectionPointerEvents={awaiting.required ? 'none' : 'auto'}
              rightSectionWidth={awaiting.required ? undefined : 58}
              value={inputText}
              rightSection={
                awaiting.required ? undefined : (
                  <button
                    className='text-12 font-semibold text-gray-9 transition hover:text-gray-12 active:scale-95'
                    type='button'
                    onClick={() => submitAnswer('', true)}
                  >
                    {t`Skip`}
                  </button>
                )
              }
              onChange={setInputText}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && inputText.trim()) {
                  event.preventDefault()
                  submitAnswer(inputText)
                }
              }}
            />
          </div>
          <IconButton
            ariaLabel={t`Send`}
            className='rounded-full'
            disabled={!inputText.trim()}
            icon='lucide:send'
            onClick={() => submitAnswer(inputText)}
          />
        </div>
      ) : null}
    </div>
  )
}

PortalWizardChat.displayName = 'PortalWizardChat'
export default PortalWizardChat
