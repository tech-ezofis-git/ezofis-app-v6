import { ActionIcon, Card, Divider, TextInput, Tooltip } from '@mantine/core'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

interface Props {
  isActive: boolean
  question: Question
  dragListeners?: any
  isBuilderMode?: boolean
  onDelete: () => void
  onSelect: () => void
  onUpdate: (updates: Partial<Question>) => void
}

const QuestionCard = ({
  dragListeners,
  isActive,
  question,
  onDelete,
  onSelect,
  onUpdate,
}: Props) => {
  const { panels } = useFormStore()
  const allQuestions = panels.flatMap((p) => p.fields)

  // Logic Evaluation
  const checkLogic = () => {
    const rules = question.settings.logic || []
    if (rules.length === 0) return true

    // Simple evaluator: returns true if ALL rules pass (AND logic)
    // Note: For builder, we assume default values or empty
    return rules.every((rule) => {
      const target = allQuestions.find((q) => q.id === rule.fieldId)
      const val = target?.settings.specific.defaultValue || ''

      switch (rule.condition) {
        case 'IS':
          return val === rule.value
        case 'IS_NOT':
          return val !== rule.value
        case 'CONTAINS':
          return String(val).includes(rule.value)
        case 'EMPTY':
          return !val
        case 'NOT_EMPTY':
          return !!val
        default:
          return true
      }
    })
  }

  const isVisible = checkLogic()
  const isRequired = question.settings.validation.fieldRule === 'REQUIRED'
  const isNarrow = question.settings.general.size === 'col-4'

  // Answer Piping Resolution
  const resolvePiping = (text: string) => {
    if (!text) return ''
    return text.replace(/\{([^}]+)\}/g, (_match, fieldId) => {
      const target = allQuestions.find((q) => q.id === fieldId)
      return target?.settings.specific.defaultValue || _match
    })
  }

  const evaluateFormula = (formula: string) => {
    if (!formula) return '0'
    try {
      const resolved = formula.replace(/\{([^}]+)\}/g, (_, fieldId) => {
        const target = allQuestions.find((q) => q.id === fieldId)
        const val = Number(target?.settings.specific.defaultValue || 0)
        return isNaN(val) ? '0' : String(val)
      })
      // Safe-ish eval for basic math
      const cleaned = resolved.replace(/[^-()\d/*+.]/g, '')
      return Function(`'use strict'; return (${cleaned})`)()
    } catch (e) {
      return '??'
    }
  }

  const isCalculated = question.type === 'CALCULATED'
  const displayLabel = isCalculated
    ? `${question.label} = ${evaluateFormula(question.settings.specific.defaultValue || '')}`
    : resolvePiping(question.label)

  // Truncation detection
  const [isTruncated, setIsTruncated] = useState(false)
  const labelRef = useRef<HTMLInputElement>(null)

  const checkTruncation = () => {
    if (labelRef.current) {
      const { clientWidth, scrollWidth } = labelRef.current
      setIsTruncated(scrollWidth > clientWidth)
    }
  }

  useLayoutEffect(() => {
    checkTruncation()
  }, [question.label, question.settings.general.size])

  // Re-check on window resize
  useEffect(() => {
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [])

  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-visible border bg-white transition-all duration-300',
        'animate-in fade-in slide-in-from-bottom-2 duration-500',
        isActive
          ? 'scale-[1.01] border-accent-primary bg-white shadow-lg ring-1 ring-accent-primary'
          : 'border-gray-3 hover:-translate-y-1 hover:border-accent-soft hover:shadow-md active:scale-95',
      )}
      style={{
        borderRadius: '12px',
        padding: 0,
      }}
      onClick={onSelect}
    >
      <div className='flex h-14 items-center justify-between gap-3 px-4 py-3'>
        {/* Left Side: Drag, Icon, Label, Badge */}
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          {/* 1. Drag Handle */}
          <div
            className={cn(
              'flex h-7 shrink-0 cursor-grab items-center justify-center overflow-hidden rounded-lg transition-all duration-300 ease-in-out hover:bg-gray-1 active:cursor-grabbing',
              isActive
                ? 'w-7 text-accent-primary opacity-100'
                : 'w-0 text-gray-4 opacity-0 group-hover:w-7 group-hover:opacity-100 hover:text-gray-8',
            )}
            {...dragListeners}
          >
            <div className='flex w-7 shrink-0 items-center justify-center'>
              <Icon height={18} name='tabler:grip-vertical' width={18} />
            </div>
          </div>

          {/* 2. Field Icon & Badge */}
          <div className='flex min-w-0 flex-1 items-center gap-2.5'>
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors',
                isActive
                  ? 'border-accent-soft bg-accent-soft text-accent-primary'
                  : 'border-gray-2 bg-gray-1 text-gray-8',
              )}
            >
              <Icon
                height={16}
                name={TYPE_ICONS[question.type] || 'tabler:circle-dot'}
                width={16}
              />
            </div>

            {/* 3. Label (Editable TextInput) */}
            <div className='flex min-w-0 flex-1 flex-col'>
              <Tooltip
                disabled={!isTruncated}
                label={question.label}
                position='top-start'
                transitionProps={{ duration: 200, transition: 'pop' }}
                w={250}
                multiline
                withArrow
              >
                <div className='w-full'>
                  <TextInput
                    placeholder='Field label...'
                    ref={labelRef}
                    value={isActive ? question.label : displayLabel}
                    variant='unstyled'
                    classNames={{
                      input: cn(
                        'h-auto min-h-0 truncate p-0 text-15/5 font-semibold tracking-tight transition-all placeholder:text-gray-3',
                        isActive ? 'text-accent-primary' : 'text-gray-13',
                        !isVisible &&
                          'line-through decoration-gray-4 opacity-50',
                      ),
                    }}
                    rightSection={
                      !isVisible && (
                        <Tooltip label='Hidden by logic rules'>
                          <Icon
                            className='text-gray-4'
                            height={12}
                            name='lucide:eye-off'
                            width={12}
                          />
                        </Tooltip>
                      )
                    }
                    onChange={(e) => {
                      if (isActive) onUpdate({ label: e.target.value })
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Right Side Actions: Hover for Duplicate/Delete, Permanent for Required at far right */}
        <div className='flex shrink-0 items-center transition-all'>
          {/* Secondary Actions (Hover Only) */}
          <div
            className={cn(
              'flex items-center transition-all duration-500 ease-out',
              'pointer-events-none translate-x-4 opacity-0 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
            )}
          >
            {isNarrow ? (
              <div className='group/more pointer-events-auto flex items-center'>
                <div className='flex w-0 translate-x-2 items-center gap-1 overflow-hidden opacity-0 transition-all duration-300 group-hover/more:w-[72px] group-hover/more:translate-x-0 group-hover/more:opacity-100'>
                  {/* Duplicate */}
                  <Tooltip
                    label='Duplicate'
                    position='top'
                    transitionProps={{ duration: 200, transition: 'pop' }}
                    withArrow
                  >
                    <ActionIcon
                      className='shrink-0 rounded-lg transition-all hover:bg-gray-1 active:scale-95'
                      color='gray'
                      size='md'
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation()
                        const { duplicateQuestion, setCopiedQuestion } =
                          useFormStore.getState()
                        setCopiedQuestion(question)
                        duplicateQuestion(question.id)
                      }}
                    >
                      <Icon
                        className='text-gray-8'
                        height={14}
                        name='tabler:copy'
                        width={14}
                      />
                    </ActionIcon>
                  </Tooltip>

                  {/* Delete */}
                  <Tooltip
                    label='Delete'
                    position='top'
                    transitionProps={{ duration: 200, transition: 'pop' }}
                    withArrow
                  >
                    <ActionIcon
                      className='hover:bg-red-50 shrink-0 rounded-lg text-red-11 transition-all active:scale-95'
                      color='red'
                      size='md'
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                      }}
                    >
                      <Icon height={14} name='tabler:trash' width={14} />
                    </ActionIcon>
                  </Tooltip>
                </div>
                <ActionIcon
                  className='shrink-0 rounded-lg transition-all hover:bg-gray-1 active:scale-95'
                  color='gray'
                  size='md'
                  variant='subtle'
                >
                  <Icon
                    className='text-gray-8'
                    height={16}
                    name='tabler:dots-vertical'
                    width={16}
                  />
                </ActionIcon>
              </div>
            ) : (
              <>
                {/* Duplicate */}
                <Tooltip
                  label='Duplicate'
                  position='top'
                  transitionProps={{ duration: 200, transition: 'pop' }}
                  withArrow
                >
                  <ActionIcon
                    className='shrink-0 rounded-lg transition-all hover:bg-gray-1 active:scale-95'
                    color='gray'
                    size='md'
                    variant='subtle'
                    onClick={(e) => {
                      e.stopPropagation()
                      const { duplicateQuestion, setCopiedQuestion } =
                        useFormStore.getState()
                      setCopiedQuestion(question)
                      duplicateQuestion(question.id)
                    }}
                  >
                    <Icon
                      className='text-gray-8'
                      height={14}
                      name='tabler:copy'
                      width={14}
                    />
                  </ActionIcon>
                </Tooltip>

                {/* Delete */}
                <Tooltip
                  label='Delete'
                  position='top'
                  transitionProps={{ duration: 200, transition: 'pop' }}
                  withArrow
                >
                  <ActionIcon
                    className='hover:bg-red-50 shrink-0 rounded-lg text-red-11 transition-all active:scale-95'
                    color='red'
                    size='md'
                    variant='subtle'
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                  >
                    <Icon height={14} name='tabler:trash' width={14} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}

            <Divider
              className='h-4 border-gray-2'
              mx={2}
              orientation='vertical'
            />
          </div>

          {/* Required Indicator/Toggle (Permanent if isRequired, at the very end) */}
          <div
            className={cn(
              'z-10 transition-all duration-300',
              isRequired || isActive
                ? 'scale-100 opacity-100'
                : 'scale-95 opacity-0 group-hover:opacity-100',
            )}
          >
            <Tooltip
              label={isRequired ? 'Required' : 'Mark as Required'}
              position='top'
              transitionProps={{ duration: 200, transition: 'pop' }}
              withArrow
            >
              <ActionIcon
                color={isRequired ? 'red' : 'gray'}
                size='md'
                variant='subtle'
                className={cn(
                  'rounded-lg transition-all active:scale-95',
                  isRequired ? 'bg-red-50 text-red-500' : 'hover:bg-gray-1',
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdate({
                    settings: {
                      ...question.settings,
                      validation: {
                        ...question.settings.validation,
                        fieldRule: isRequired ? 'OPTIONAL' : 'REQUIRED',
                      },
                    },
                  })
                }}
              >
                <Icon
                  height={16}
                  width={16}
                  name={
                    isRequired
                      ? 'tabler:circle-check-filled'
                      : 'tabler:circle-dot'
                  }
                />
              </ActionIcon>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Bottom Width Toolbar (Hover Only) */}
      <div className='pointer-events-none absolute -bottom-[18px] left-1/2 z-50 -translate-x-1/2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:opacity-100'>
        <div className='animate-in slide-in-from-top-4 flex items-center gap-1 rounded-full border border-b-2 border-gray-2 border-b-accent-primary bg-white p-1 shadow-2xl'>
          {[
            { label: '1/3', value: 'col-4' },
            { label: '1/2', value: 'col-6' },
            { label: 'Full', value: 'col-12' },
          ].map((w) => (
            <button
              key={w.value}
              className={cn(
                'rounded-full px-3 py-1 text-[10px] font-black tracking-tighter uppercase transition-all',
                question.settings.general.size === w.value
                  ? 'bg-accent-primary text-white shadow-md shadow-accent-soft/20'
                  : 'text-gray-5 hover:bg-gray-1',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onUpdate({
                  settings: {
                    ...question.settings,
                    general: {
                      ...question.settings.general,
                      size: w.value as any,
                    },
                  },
                })
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

const TYPE_ICONS: Record<string, string> = {
  ADDRESS: 'lucide:home',
  CALCULATED: 'tabler:calculator',
  CONSENT: 'lucide:shield-check',
  COUNTER: 'tabler:number-123',
  COUNTRY_CODE: 'lucide:globe',
  DATE: 'lucide:calendar',
  DATE_TIME: 'lucide:calendar-time',
  DIVIDER: 'lucide:minus',
  EMAIL: 'lucide:mail',
  FILE_UPLOAD: 'lucide:file-up',
  HEADING: 'lucide:heading',
  IMAGE_UPLOAD: 'lucide:image',
  LABEL: 'lucide:heading',
  LONG_TEXT: 'mdi:form-textarea',
  MULTI_SELECT: 'lucide:list-todo',
  MULTIPLE_CHOICE: 'lucide:square-check',
  PASSWORD: 'lucide:lock',
  PHONE_NUMBER: 'lucide:phone',
  RATING: 'lucide:star',
  SCORE: 'lucide:hash',
  SHORT_TEXT: 'mdi:form-textbox',
  SIGNATURE: 'lucide:pen-tool',
  SINGLE_CHOICE: 'mdi:radiobox-marked',
  SINGLE_SELECT: 'lucide:list-todo',
  TABLE: 'lucide:table',
  TEXT_BUILDER: 'lucide:text',
  TIME: 'lucide:clock',
  YES_NO_TOGGLE: 'lucide:toggle-left',
}

export default QuestionCard
