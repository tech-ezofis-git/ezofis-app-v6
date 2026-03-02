import { ActionIcon, Text, Tooltip, Divider } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore, type Panel } from '@/pages/form-builder/store/formStore'

interface Props {
    panel: Panel
    panelIndex: number
    fieldCount: number
    isCollapsed: boolean
    onToggleCollapse: () => void
}

const SectionHeader = ({ panel, panelIndex, fieldCount, isCollapsed, onToggleCollapse }: Props) => {
    const { updatePanel, deletePanel, movePanel, panels } = useFormStore()

    return (
        <div className="px-6 py-4 flex flex-col gap-2 border-b border-gray-1 bg-gray-0 rounded-t-2xl group/header transition-all">
            {/* Top Row: Icon, Title, Actions */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-accent-soft text-accent-primary shadow-sm">
                        <Icon name="lucide:layout" width={20} height={20} />
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={panel.settings.title}
                                onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                                placeholder="Section Title"
                                className="bg-transparent text-xl font-bold text-gray-13 placeholder:text-gray-3 focus:outline-none tracking-tight truncate py-0"
                            />
                            <div className="px-2 py-0.5 rounded-full bg-gray-2 border border-gray-3 shrink-0">
                                <Text size="xs" fw={700} className="text-gray-9 whitespace-nowrap">
                                    {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
                    {/* Move Controls */}
                    <div className="flex items-center bg-gray-1 rounded-lg border border-gray-3 p-0.5">
                        {panelIndex > 0 && (
                            <Tooltip label="Move Up" position="top" withArrow>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={() => movePanel(panel.id, 'up')}
                                    className="hover:bg-white active:scale-95 transition-all rounded-md"
                                >
                                    <Icon name="lucide:arrow-up" width={14} height={14} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                        {panelIndex < panels.length - 1 && (
                            <Tooltip label="Move Down" position="top" withArrow>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={() => movePanel(panel.id, 'down')}
                                    className="hover:bg-white active:scale-95 transition-all rounded-md"
                                >
                                    <Icon name="lucide:arrow-down" width={14} height={14} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </div>

                    <Divider orientation="vertical" mx={4} className="h-4 border-gray-3" />

                    {/* Section Actions */}
                    <div className="flex items-center gap-1">
                        <Tooltip label={isCollapsed ? "Expand" : "Collapse"} position="top" withArrow>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="md"
                                onClick={onToggleCollapse}
                                className="hover:bg-gray-2 rounded-lg transition-all active:scale-95"
                            >
                                <Icon name={isCollapsed ? "lucide:chevron-down" : "lucide:chevron-up"} width={16} height={16} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Delete Section" position="top" withArrow>
                            <ActionIcon
                                variant="subtle"
                                color="red"
                                size="md"
                                onClick={() => deletePanel(panel.id)}
                                className="hover:bg-red-50 rounded-lg active:scale-95 transition-all"
                            >
                                <Icon name="lucide:trash" width={16} height={16} />
                            </ActionIcon>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Description */}
            <div className="flex-1">
                <input
                    type="text"
                    value={panel.settings.description}
                    onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
                    placeholder="Add a description for this section..."
                    className="w-full bg-transparent text-sm text-gray-5 placeholder:text-gray-3 focus:outline-none"
                />
            </div>
        </div>
    )
}

export default SectionHeader
