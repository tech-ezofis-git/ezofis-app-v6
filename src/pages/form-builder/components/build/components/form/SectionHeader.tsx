import { ActionIcon, Tooltip } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore, type Panel } from '@/pages/form-builder/store/formStore'

interface Props {
    panel: Panel
    fieldCount: number
    isCollapsed: boolean
    isLocked?: boolean
    onToggleCollapse: () => void
}

const SectionHeader = ({ panel, fieldCount, isCollapsed, isLocked, onToggleCollapse }: Props) => {
    const { updatePanel } = useFormStore()

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
                        disabled={isLocked}
                        className="flex-1 bg-transparent text-lg font-semibold text-gray-13 placeholder:text-gray-4 focus:outline-none tracking-tight py-1 px-1 rounded-md hover:bg-gray-50 focus:bg-white transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    />
                </div>

                {/* Right Actions - Moved outside to floating bar */}
                <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200 shrink-0">
                    {/* Only keeping things that might still be useful inside if any, but the user asked for them outside. Canva keeps nothing in header except title. */}
                </div>
            </div>

             {/* Description Input (with mocked variable detection for visual) */}
            <div className="relative flex items-center w-full group/desc mt-1">
                <input
                    type="text"
                    value={panel.settings.description}
                    onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
                    placeholder="Please provide details..."
                    disabled={isLocked}
                    className="w-full bg-transparent text-13 font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 focus:outline-none px-1 disabled:cursor-not-allowed"
                />
                
                {fieldCount > 0 && (
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-2 shrink-0 opacity-0 group-hover/desc:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-[10px] font-bold text-gray-4 whitespace-nowrap uppercase tracking-widest leading-none">
                            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                        </span>
                    </div>
                )}
            </div>
            
            <div className="h-px w-full bg-gray-1 mt-4" />
        </div>
    )
}

export default SectionHeader
