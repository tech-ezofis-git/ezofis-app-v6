import { Badge } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import GeneralSettings from './sections/GeneralSettings'
import QuestionSettings from './sections/QuestionSettings'

const FIELD_ICONS: Record<string, string> = {
  ADDRESS: 'lucide:map-pin',
  ADDRESS_INFO: 'lucide:home',
  CALCULATED: 'lucide:calculator',
  CONTACT_INFO: 'lucide:contact',
  COUNTER: 'tabler:circle-dot',
  COUNTRY_CODE: 'lucide:globe',
  CURRENCY_AMOUNT: 'lucide:dollar-sign',
  DATE: 'lucide:calendar',
  DATE_TIME: 'lucide:calendar-clock',
  DIVIDER: 'lucide:minus',
  DYNAMIC_TABLE: 'lucide:table-2',
  EMAIL: 'lucide:mail',
  FILE_UPLOAD: 'lucide:file-up',
  FULL_NAME: 'lucide:user',
  HEADING: 'lucide:heading',
  LABEL: 'lucide:type',
  MATRIX: 'lucide:grid-3x3',
  MULTI_SELECT: 'lucide:list-checks',
  MULTIPLE_CHOICE: 'lucide:square-check',
  PASSWORD: 'lucide:lock',
  PHONE_NUMBER: 'lucide:phone',
  RATING: 'lucide:star',
  SHORT_TEXT: 'mdi:form-textbox',
  SINGLE_CHOICE: 'mdi:radiobox-marked',
  SINGLE_SELECT: 'lucide:list-todo',
  TABLE: 'lucide:table',
  TEXT_BUILDER: 'lucide:pilcrow',
  TIME: 'lucide:clock',
}

const FieldSettings = () => {
  const panels = useFormStore((state) => state.panels)
  const activeQuestionId = useFormStore((state) => state.activeQuestionId)
  const updateQuestion = useFormStore((state) => state.updateQuestion)
  const selectionType = useFormStore((state) => state.selectionType)
  const setSidebarOpen = useFormStore((state) => state.setSidebarOpen)

  const activeQuestion = panels
    .flatMap((p) => p.fields)
    .find((q) => q.id === activeQuestionId)

  const [headerLabel, setHeaderLabel] = useState('')
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeQuestion) {
      setHeaderLabel(activeQuestion.label || '')
    }
  }, [activeQuestion?.id])

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditingLabel])

  const handleLabelSave = () => {
    if (activeQuestion && headerLabel.trim() !== '') {
      updateQuestion(activeQuestion.id, { label: headerLabel })
    }
    setIsEditingLabel(false)
  }

  const renderContent = () => {
    switch (selectionType) {
      case 'general':
        return <GeneralSettings />
      case 'question':
        return activeQuestion ? (
          <QuestionSettings activeQuestion={activeQuestion} />
        ) : null
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (selectionType) {
      case 'general':
        return 'General Settings'
      default:
        return 'Field Settings'
    }
  }

  const getIcon = () => {
    switch (selectionType) {
      case 'general':
        return 'tabler:settings'
      default:
        return 'tabler:adjustments-horizontal'
    }
  }

  if (selectionType === 'question' && !activeQuestion) return null

  return (
    <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white font-inter shadow-xl transition-all duration-300'>
      <SettingsHeader
        activeQuestion={activeQuestion}
        handleLabelSave={handleLabelSave}
        headerLabel={headerLabel}
        icon={getIcon()}
        inputRef={inputRef}
        isEditingLabel={isEditingLabel}
        selectionType={selectionType}
        title={getTitle()}
        setHeaderLabel={setHeaderLabel}
        setIsEditingLabel={setIsEditingLabel}
        setSidebarOpen={setSidebarOpen}
      />

      {renderContent()}

      <SettingsFooter />
    </div>
  )
}

const SettingsHeader = ({
  activeQuestion,
  handleLabelSave,
  headerLabel,
  icon,
  inputRef,
  isEditingLabel,
  selectionType,
  title,
  setHeaderLabel,
  setIsEditingLabel,
  setSidebarOpen,
}: any) => {
  const headerIcon =
    selectionType === 'question' && activeQuestion
      ? FIELD_ICONS[activeQuestion.type] || 'lucide:settings-2'
      : icon

  return (
    <div className='flex shrink-0 items-center justify-between gap-2 border-b border-gray-2 bg-white px-5 py-4'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/10 text-accent-primary'>
          <Icon height={20} name={headerIcon} width={20} />
        </div>

        {selectionType === 'question' && activeQuestion ? (
          isEditingLabel ? (
            <input
              className='min-w-0 flex-1 border-b-2 border-accent-primary bg-white px-1 py-1 text-sm font-bold text-gray-13 focus:outline-none'
              ref={inputRef}
              type='text'
              value={headerLabel}
              onBlur={handleLabelSave}
              onChange={(e) => setHeaderLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLabelSave()}
            />
          ) : (
            <div
              className='group/title flex min-w-0 flex-1 cursor-pointer items-center gap-2'
              onClick={() => setIsEditingLabel(true)}
            >
              <div className='flex min-w-0 flex-1 flex-col'>
                <h2 className='truncate text-15/5 font-bold text-gray-13 transition-colors group-hover/title:text-accent-primary'>
                  {activeQuestion.label || 'Untitled Field'}
                </h2>
                <Badge
                  className='h-auto self-start bg-gray-2 px-1.5 py-0.5 text-[9px] tracking-wider text-gray-7 uppercase'
                  radius='sm'
                  size='xs'
                  variant='filled'
                >
                  {activeQuestion.type.replace(/_/g, ' ')}
                </Badge>
              </div>
              <Icon
                className='text-gray-4 opacity-0 transition-opacity group-hover/title:opacity-100'
                height={14}
                name='lucide:pencil'
                width={14}
              />
            </div>
          )
        ) : (
          <h2 className='truncate text-15/5 font-semibold text-gray-13'>
            {title}
          </h2>
        )}
      </div>

      <IconButton
        className='rounded-xl text-gray-6 transition-colors hover:bg-gray-2 hover:text-gray-9'
        color='gray'
        icon='lucide:x'
        size='md'
        variant='ghost'
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  )
}

const SettingsFooter = () => (
  <div className='bg-gray-50/50 flex items-center gap-2 border-t border-gray-2 px-6 py-3'>
    <Icon
      className='shrink-0 text-gray-6'
      height={13}
      name='lucide:zap'
      width={13}
    />
    <span className='text-[11px] text-gray-8'>
      Changes apply instantly. Use{' '}
      <span className='font-semibold text-gray-11'>Save</span> or{' '}
      <span className='font-semibold text-gray-11'>Publish</span> in the header
      to sync this form to the server.
    </span>
  </div>
)

export default FieldSettings
