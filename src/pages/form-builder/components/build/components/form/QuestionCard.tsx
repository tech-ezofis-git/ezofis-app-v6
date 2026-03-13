import { ActionIcon, Card, Menu, TextInput, Tooltip } from '@mantine/core'
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
  const isRequired = question.settings.validation.fieldRule === 'REQUIRED'

  return (
    <Card
      className={cn(
        'group animate-in fade-in zoom-in-[0.98] relative cursor-pointer overflow-visible border bg-white transition-all duration-200 duration-500',
        isActive
          ? 'border-accent-primary bg-accent-soft/10 shadow-sm ring-1 ring-accent-primary'
          : 'border-gray-3 hover:border-gray-5 hover:shadow-sm',
      )}
      style={{
        borderRadius: '8px',
        padding: 0,
      }}
      onClick={onSelect}
    >
      <div className='flex h-12 items-center gap-3 px-3 py-2'>
        {/* 1. Drag Handle */}
        <div
          className={cn(
            'flex size-6 shrink-0 cursor-grab items-center justify-center rounded transition-colors hover:bg-gray-1 active:cursor-grabbing',
            isActive
              ? 'text-accent-primary'
              : 'text-gray-4 group-hover:text-gray-8',
          )}
          {...dragListeners}
        >
          <Icon height={16} name='tabler:grip-vertical' width={16} />
        </div>

        {/* 2. Field Icon (Specific to type) */}
        <div
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
            isActive
              ? 'bg-accent-soft/40 text-accent-primary'
              : 'bg-gray-1 text-gray-8',
          )}
        >
          <Icon
            height={16}
            name={TYPE_ICONS[question.type] || 'tabler:circle-dot'}
            width={16}
          />
        </div>

        {/* 3. Label (Editable TextInput) */}
        <div className='flex h-full min-w-0 flex-1 items-center'>
          <Tooltip
            disabled={!question.label || question.label.length < 20}
            label={question.label || 'Field label...'}
            openDelay={400}
            position='top-start'
            withArrow
          >
            <div className='relative inline-grid max-w-[80%] items-center'>
              <span className='invisible h-0 overflow-hidden px-0 text-sm font-semibold tracking-tight whitespace-pre'>
                {question.label || 'Field label...'}
              </span>
              <TextInput
                placeholder='Field label...'
                value={question.label}
                variant='unstyled'
                classNames={{
                  input: cn(
                    'h-auto min-h-0 truncate p-0 text-sm font-semibold tracking-tight placeholder:text-gray-4 focus:overflow-visible focus:whitespace-nowrap',
                    isActive ? 'text-accent-primary' : 'text-gray-13',
                  ),
                }}
                styles={{
                  input: { minWidth: '40px', width: '100%' },
                  root: { display: 'flex', gridArea: '1/1/2/2', width: '100%' },
                }}
                onChange={(e) => onUpdate({ label: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </Tooltip>
        </div>

        {/* 4. Required Indicator */}
        {isRequired && (
          <div
            className='mx-1 flex shrink-0 items-center'
            title='Required field'
          >
            <div className='size-2 rounded-full bg-error-main' />
          </div>
        )}

        {/* 5. Actions (Dots Menu) */}
        <div
          className={cn(
            'ml-1 shrink-0 transition-opacity duration-200',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <Menu
            position='bottom-end'
            shadow='sm'
            transitionProps={{ transition: 'pop-top-right' }}
            width={180}
            withinPortal={true}
          >
            <Menu.Target>
              <ActionIcon
                className='transition-all hover:bg-gray-2 active:scale-95'
                color='gray'
                size='md'
                variant='subtle'
                onClick={(e) => e.stopPropagation()}
              >
                <Icon height={18} name='tabler:dots-vertical' width={18} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
              <Menu.Item
                leftSection={<Icon height={14} name='tabler:copy' width={14} />}
                onClick={() => {
                  const { duplicateQuestion, setCopiedQuestion } =
                    useFormStore.getState()
                  setCopiedQuestion(question)
                  duplicateQuestion(question.id)
                }}
              >
                Duplicate Field
              </Menu.Item>
              <Menu.Item
                color='violet'
                leftSection={
                  <Icon height={14} name='tabler:sparkles' width={14} />
                }
              >
                AI Settings
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color='red'
                leftSection={
                  <Icon height={14} name='tabler:trash' width={14} />
                }
                onClick={onDelete}
              >
                Delete Field
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>
    </Card>
  )
}

const TYPE_ICONS: Record<string, string> = {
  ADDRESS: 'lucide:home',
  CALCULATED: 'tabler:calculator',
  COUNTER: 'tabler:number-123',
  COUNTRY_CODE: 'lucide:globe',
  DATE: 'lucide:calendar',
  DATE_TIME: 'lucide:calendar-time',
  DIVIDER: 'lucide:minus',
  EMAIL: 'lucide:mail',
  FILE_UPLOAD: 'lucide:file-up',
  HEADING: 'lucide:heading',
  LABEL: 'lucide:heading',
  LONG_TEXT: 'mdi:form-textarea',
  MULTI_SELECT: 'lucide:list-todo',
  MULTIPLE_CHOICE: 'lucide:square-check',
  PASSWORD: 'lucide:lock',
  PHONE_NUMBER: 'lucide:phone',
  RATING: 'lucide:star',
  SHORT_TEXT: 'mdi:form-textbox',
  SINGLE_CHOICE: 'mdi:radiobox-marked',
  SINGLE_SELECT: 'lucide:list-todo',
  TABLE: 'lucide:table',
  TEXT_BUILDER: 'lucide:text',
  TIME: 'lucide:clock',
}

export default QuestionCard
