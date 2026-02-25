import { Card, TextInput, ActionIcon, Menu, Tooltip } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { type Question, useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

interface Props {
    question: Question
    isActive: boolean
    onSelect: () => void
    onUpdate: (updates: Partial<Question>) => void
    onDelete: () => void
    isBuilderMode?: boolean
    dragListeners?: any
}

const QuestionCard = ({ question, isActive, onSelect, onUpdate, onDelete, dragListeners }: Props) => {
    const isRequired = question.settings.validation.fieldRule === 'REQUIRED'

    return (
        <Card
            onClick={onSelect}
            className={cn(
                "group relative border transition-all duration-200 cursor-pointer overflow-visible animate-in fade-in zoom-in-[0.98] duration-500 bg-white",
                isActive
                    ? "border-accent-primary shadow-sm bg-accent-soft/10 ring-1 ring-accent-primary"
                    : "border-gray-3 hover:border-gray-5 hover:shadow-sm"
            )}
            style={{
                padding: 0,
                borderRadius: '8px'
            }}
        >
            <div className="flex items-center gap-3 py-2 px-3 h-12">
                {/* 1. Drag Handle */}
                <div
                    className={cn(
                        "flex items-center justify-center size-6 rounded hover:bg-gray-1 transition-colors cursor-grab active:cursor-grabbing shrink-0",
                        isActive ? "text-accent-primary" : "text-gray-4 group-hover:text-gray-8"
                    )}
                    {...dragListeners}
                >
                    <Icon name="tabler:grip-vertical" width={16} height={16} />
                </div>

                {/* 2. Field Icon (Specific to type) */}
                <div className={cn(
                    "flex items-center justify-center size-7 rounded-md shrink-0 transition-colors",
                    isActive ? "bg-accent-soft/40 text-accent-primary" : "bg-gray-1 text-gray-8"
                )}>
                    <Icon
                        name={TYPE_ICONS[question.type] || 'tabler:circle-dot'}
                        width={16} height={16}
                    />
                </div>

                {/* 3. Label (Editable TextInput) */}
                <div className="flex-1 min-w-0 flex items-center h-full">
                    <Tooltip
                        label={question.label || "Field label..."}
                        position="top-start"
                        withArrow
                        disabled={!question.label || question.label.length < 20}
                        openDelay={400}
                    >
                        <div className="inline-grid items-center max-w-[80%] relative">
                            <span className="invisible whitespace-pre text-sm font-semibold tracking-tight h-0 overflow-hidden px-0">
                                {question.label || "Field label..."}
                            </span>
                            <TextInput
                                value={question.label}
                                onChange={(e) => onUpdate({ label: e.target.value })}
                                placeholder="Field label..."
                                variant="unstyled"
                                classNames={{
                                    input: cn(
                                        "text-sm font-semibold p-0 min-h-0 placeholder:text-gray-4 tracking-tight truncate h-auto focus:overflow-visible focus:whitespace-nowrap",
                                        isActive ? "text-accent-primary" : "text-gray-13"
                                    )
                                }}
                                onClick={(e) => e.stopPropagation()}
                                styles={{
                                    root: { gridArea: '1/1/2/2', width: '100%', display: 'flex' },
                                    input: { width: '100%', minWidth: '40px' }
                                }}
                            />
                        </div>
                    </Tooltip>
                </div>

                {/* 4. Required Indicator */}
                {isRequired && (
                    <div title="Required field" className="shrink-0 flex items-center mx-1">
                        <div className="size-2 rounded-full bg-error-main" />
                    </div>
                )}

                {/* 5. Actions (Dots Menu) */}
                <div className={cn(
                    "shrink-0 transition-opacity duration-200 ml-1",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    <Menu shadow="sm" width={180} position="bottom-end" withinPortal={false} transitionProps={{ transition: 'pop-top-right' }}>
                        <Menu.Target>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="md"
                                className="hover:bg-gray-2 active:scale-95 transition-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Icon name="tabler:dots-vertical" width={18} height={18} />
                            </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                            <Menu.Item
                                leftSection={<Icon name="tabler:copy" width={14} height={14} />}
                                onClick={() => {
                                    const { setCopiedQuestion, duplicateQuestion } = useFormStore.getState();
                                    setCopiedQuestion(question);
                                    duplicateQuestion(question.id);
                                }}
                            >
                                Duplicate Field
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<Icon name="tabler:sparkles" width={14} height={14} />}
                                color="violet"
                            >
                                AI Settings
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                                leftSection={<Icon name="tabler:trash" width={14} height={14} />}
                                color="red"
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
    SHORT_TEXT: 'mdi:form-textbox',
    LONG_TEXT: 'mdi:form-textarea',
    EMAIL: 'lucide:mail',
    PHONE_NUMBER: 'lucide:phone',
    SINGLE_CHOICE: 'mdi:radiobox-marked',
    MULTIPLE_CHOICE: 'lucide:square-check',
    SINGLE_SELECT: 'lucide:list-todo',
    MULTI_SELECT: 'lucide:list-todo',
    PASSWORD: 'lucide:lock',
    FILE_UPLOAD: 'lucide:file-up',
    TEXT_BUILDER: 'tabler:type',
    TABLE: 'lucide:table',
    DIVIDER: 'lucide:minus',
    HEADING: 'lucide:heading',
    LABEL: 'lucide:heading',
    DATE: 'lucide:calendar',
    TIME: 'lucide:clock',
    DATE_TIME: 'lucide:calendar-time',
    RATING: 'lucide:star',
    COUNTER: 'tabler:number-123',
    CALCULATED: 'tabler:calculator',
    COUNTRY_CODE: 'lucide:globe',
    ADDRESS: 'lucide:home',
}

export default QuestionCard
