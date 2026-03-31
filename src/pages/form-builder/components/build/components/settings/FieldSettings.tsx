import Button from '@/components/base/button/Button'
import { Badge, Tooltip, ActionIcon } from '@mantine/core'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import IconButton from '@/components/base/button/IconButton'
import { useEffect, useState, useRef } from 'react'
import GeneralSettings from './sections/GeneralSettings'
import WelcomePageSettings from './sections/WelcomePageSettings'
import ThankYouPageSettings from './sections/ThankYouPageSettings'
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
  SINGLE_SELECT: 'lucide:list-todo',
  MULTI_SELECT: 'lucide:list-checks',
  SINGLE_CHOICE: 'mdi:radiobox-marked',
  MULTIPLE_CHOICE: 'lucide:square-check',
  HEADING: 'lucide:heading',
  LABEL: 'lucide:type',
  TEXT_BUILDER: 'lucide:pilcrow',
  DIVIDER: 'lucide:minus',
  RATING: 'lucide:star',
  FILE_UPLOAD: 'lucide:file-up',
  TABLE: 'lucide:table',
  DYNAMIC_TABLE: 'lucide:table-2',
  MATRIX: 'lucide:grid-3x3',
  EMAIL: 'lucide:mail',
  PASSWORD: 'lucide:lock',
  ADDRESS: 'lucide:map-pin',
  FULL_NAME: 'lucide:user',
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
  const clearSelection = useFormStore((state) => state.clearSelection)
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
      case 'welcome':
        return <WelcomePageSettings />
      case 'thank_you':
        return <ThankYouPageSettings />
      case 'question':
        return activeQuestion ? <QuestionSettings activeQuestion={activeQuestion} /> : null
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (selectionType) {
      case 'general': return 'General Settings'
      case 'welcome': return 'Welcome Screen'
      case 'thank_you': return 'Completion Screen'
      default: return 'Field Settings'
    }
  }

  const getIcon = () => {
    switch (selectionType) {
      case 'general': return 'tabler:settings'
      case 'welcome': return 'lucide:megaphone'
      case 'thank_you': return 'lucide:party-popper'
      default: return 'tabler:adjustments-horizontal'
    }
  }

  if (selectionType === 'question' && !activeQuestion) return null

  return (
    <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white font-inter shadow-xl transition-all duration-300'>
      <SettingsHeader
        title={getTitle()}
        icon={getIcon()}
        activeQuestion={activeQuestion}
        selectionType={selectionType}
        isEditingLabel={isEditingLabel}
        headerLabel={headerLabel}
        setHeaderLabel={setHeaderLabel}
        setIsEditingLabel={setIsEditingLabel}
        handleLabelSave={handleLabelSave}
        inputRef={inputRef}
        clearSelection={clearSelection}
        setSidebarOpen={setSidebarOpen}
      />

      {renderContent()}

      <SettingsFooter onCancel={() => setSidebarOpen(false)} onSave={() => setSidebarOpen(false)} />
    </div>
  )
}

const SettingsHeader = ({
  title,
  icon,
  activeQuestion,
  selectionType,
  isEditingLabel,
  headerLabel,
  setHeaderLabel,
  setIsEditingLabel,
  handleLabelSave,
  inputRef,
  clearSelection,
  setSidebarOpen
}: any) => {
  const headerIcon =
    selectionType === 'question' && activeQuestion
      ? FIELD_ICONS[activeQuestion.type] || 'lucide:settings-2'
      : icon

  return (
    <div className='flex shrink-0 items-center justify-between gap-2 border-b border-gray-2 bg-white px-5 py-4'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        {selectionType !== 'general' && selectionType !== 'question' && (
          <Tooltip label='Back to General'>
            <ActionIcon
              className='mr-1 shrink-0 hover:bg-gray-2 text-gray-8'
              size='md'
              variant='subtle'
              onClick={() => clearSelection()}
            >
              <Icon height={16} name='lucide:arrow-left' width={16} />
            </ActionIcon>
          </Tooltip>
        )}

        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/10 text-accent-primary'>
          <Icon height={20} name={headerIcon} width={20} />
        </div>

        {selectionType === 'question' && activeQuestion ? (
          isEditingLabel ? (
            <input
              ref={inputRef}
              type="text"
              value={headerLabel}
              onChange={(e) => setHeaderLabel(e.target.value)}
              onBlur={handleLabelSave}
              onKeyDown={(e) => e.key === 'Enter' && handleLabelSave()}
              className="flex-1 min-w-0 text-sm font-bold text-gray-13 border-b-2 border-accent-primary px-1 py-1 focus:outline-none bg-white"
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1 group/title cursor-pointer" onClick={() => setIsEditingLabel(true)}>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-15/5 font-bold text-gray-13 truncate group-hover/title:text-accent-primary transition-colors">
                  {activeQuestion.label || 'Untitled Field'}
                </h2>
                <Badge
                  size="xs"
                  variant="filled"
                  radius="sm"
                  className="bg-gray-2 text-gray-7 text-[9px] uppercase tracking-wider self-start h-auto py-0.5 px-1.5"
                >
                  {activeQuestion.type.replace(/_/g, ' ')}
                </Badge>
              </div>
              <Icon name="lucide:pencil" width={14} height={14} className="text-gray-4 opacity-0 group-hover/title:opacity-100 transition-opacity" />
            </div>
          )
        ) : (
          <h2 className='text-15/5 font-semibold text-gray-13 truncate'>{title}</h2>
        )}
      </div>

      <IconButton
        variant="ghost"
        color="gray"
        size="md"
        onClick={() => setSidebarOpen(false)}
        className="hover:bg-gray-2 rounded-xl transition-colors text-gray-6 hover:text-gray-9"
        icon="lucide:x"
      />
    </div>
  )
}

const SettingsFooter = ({ onCancel, onSave }: { onCancel: () => void, onSave: () => void }) => (
  <div className='flex items-center justify-end gap-3 border-t border-gray-2 bg-gray-50/50 px-6 py-4'>
    <Button color='gray' variant='outline' onClick={onCancel} className="bg-white">
      Cancel
    </Button>
    <Button className='font-semibold' icon='lucide:check-circle' onClick={onSave}>
      Save
    </Button>
  </div>
)

export default FieldSettings
