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
        <div className="px-8 pt-4 pb-3 flex flex-col gap-1 rounded-t-2xl group/header transition-all bg-white relative border-b border-gray-3/30">
            
            {/* Visual Indicator Line (Optional based on design, matching purple branding) */}
            <div className="absolute top-0 left-8 right-8 h-1 rounded-b-md bg-accent-soft/20" />

            {/* Compact Header: Title + Actions */}
            <div className="flex items-center justify-between w-full h-10 group/desc -ml-2">
                <div className="flex items-center flex-1 min-w-0">
                    {/* Hover Actions: Drag handles and collapse */}
                    <div className="flex items-center w-8 shrink-0 justify-center">
                         <Tooltip label={isCollapsed ? "Expand" : "Collapse"} position="top" withArrow>
                             <ActionIcon
                                 variant="subtle"
                                 color="gray"
                                 size="sm"
                                 onClick={onToggleCollapse}
                                 className="hover:bg-gray-1 rounded-md transition-all active:scale-95 text-gray-10 hover:text-gray-13"
                             >
                                 <Icon name={isCollapsed ? "lucide:chevron-down" : "lucide:chevron-up"} width={16} height={16} />
                             </ActionIcon>
                         </Tooltip>
                    </div>

                    <input
                        type="text"
                        value={panel.settings.title}
                        onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                        placeholder="Section Title"
                        className="flex-1 bg-transparent text-lg font-semibold text-gray-13 placeholder:text-gray-4 focus:outline-none tracking-tight py-1 px-1 rounded-md hover:bg-gray-50 focus:bg-white transition-colors"
                    />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200 shrink-0">
                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-2 p-0.5">
                        {panelIndex > 0 && (
                            <Tooltip label="Move Up" position="top" withArrow>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={() => movePanel(panel.id, 'up')}
                                    className="hover:bg-white active:scale-95 transition-all rounded-md text-gray-10 hover:text-gray-13"
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
                                    className="hover:bg-white active:scale-95 transition-all rounded-md text-gray-10 hover:text-gray-13"
                                >
                                    <Icon name="lucide:arrow-down" width={14} height={14} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </div>
                    
                    <Divider orientation="vertical" mx={2} className="h-4 border-gray-2" />

                    <Tooltip label="Delete Section" position="top" withArrow>
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => deletePanel(panel.id)}
                            className="hover:bg-red-50 rounded-lg active:scale-95 transition-all text-red-500 hover:text-red-600"
                        >
                            <Icon name="lucide:trash-2" width={14} height={14} />
                        </ActionIcon>
                    </Tooltip>
                </div>
            </div>

             {/* Description Input (with mocked variable detection for visual) */}
            <div className="relative flex items-center w-full group/desc mt-1">
                <input
                    type="text"
                    value={panel.settings.description}
                    onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
                    placeholder="Please provide details..."
                    className="w-full bg-transparent text-13 font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 focus:outline-none px-1"
                />
                
                {fieldCount > 0 && (
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-2 shrink-0 opacity-0 group-hover/desc:opacity-100 transition-opacity pointer-events-none">
                        <Text size="10px" fw={700} className="text-gray-4 whitespace-nowrap uppercase tracking-widest">
                            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                        </Text>
                    </div>
                )}
            </div>
            
            <div className="h-px w-full bg-gray-1 mt-4" />
        </div>
    )
}

export default SectionHeader
