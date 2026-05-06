import { useFormStore } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import { ActionIcon } from '@mantine/core'
import cn from '@/utils/cn'
import { useState, useMemo } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import FieldLibrary from './FieldLibrary'
import { motion } from 'framer-motion'

interface SortableSectionProps {
    p: any;
    index: number;
    isCollapsed: boolean;
    isActive: boolean;
    onScroll: (id: string) => void;
    movePanel: (id: string, dir: 'up' | 'down') => void;
    totalPanels: number;
    isSearchActive: boolean;
}

const SortableSectionItem = ({ p, isCollapsed, onScroll, movePanel, index, totalPanels, isSearchActive, isActive }: SortableSectionProps) => {
    const { deletePanel } = useFormStore()
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: p.id, disabled: isSearchActive || isConfirmingDelete })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : undefined,
    }

    // Cancel confirmation if we stop hovering or start dragging
    const handleMouseLeave = () => setIsConfirmingDelete(false)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(isConfirmingDelete ? {} : attributes)}
            {...(isConfirmingDelete ? {} : listeners)}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "group relative select-none cursor-default",
                isDragging && "opacity-50 z-50 shadow-lg scale-102 rounded-lg bg-white"
            )}
        >
            <div
                className={cn(
                    "w-full flex items-center transition-all border border-transparent relative rounded-lg",
                    isCollapsed
                        ? "justify-center p-2 size-9"
                        : "gap-2 px-2 py-1.5 text-left",
                    "hover:bg-accent-soft/5 hover:border-accent-soft/20 text-gray-10",
                    isActive && "bg-accent-soft/10 text-accent-primary border-accent-soft/30 shadow-sm",
                    isDragging && "bg-accent-soft/15 text-accent-primary shadow-md scale-[1.02]",
                    isConfirmingDelete && "bg-red-50 border-red-200"
                )}
            >
                {isConfirmingDelete ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full flex flex-col gap-2.5 p-3.5 bg-red-5/5 border border-red-2 rounded-xl"
                    >
                        <div className="flex items-center gap-2 text-red-6">
                            <Icon name="lucide:alert-triangle" width={14} height={14} />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">Action Needed</span>
                        </div>
                        <p className="text-[11px] text-red-7/0.8 leading-relaxed font-medium">
                            Delete this section and <span className="font-bold text-red-7">{p.fields?.length || 0} fields</span>? This cannot be undone.
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    deletePanel(p.id)
                                }}
                                className="flex-1 bg-red-6 text-white text-[10px] font-bold py-2 rounded-lg hover:bg-red-9 active:scale-95 transition-all shadow-sm shadow-red-2"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsConfirmingDelete(false)
                                }}
                                className="flex-1 bg-white border border-gray-2 text-gray-6 text-[10px] font-bold py-2 rounded-lg hover:bg-gray-1 active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        <button
                            className="flex-1 flex items-center gap-2 min-w-0"
                            onClick={() => onScroll(p.id)}
                        >
                            {/* Drag Handle - Improved Arrorws */}
                            {!isCollapsed && !isSearchActive && (
                                <div className="opacity-30 group-hover:opacity-100 transition-opacity p-1 -ml-1 mr-1 text-gray-4 group-hover:text-accent-primary">
                                    <Icon name="lucide:grip-vertical" width={14} height={14} />
                                </div>
                            )}

                            <Icon
                                name={index === 0 ? "lucide:shield-check" : "lucide:layout"}
                                width={isCollapsed ? 18 : 14}
                                className={cn(
                                    "shrink-0 transition-all",
                                    isActive ? "text-accent-primary opacity-100 scale-110" : "opacity-60 group-hover:opacity-100 group-hover:text-accent-primary"
                                )}
                            />

                            {!isCollapsed && (
                                <div className={cn(
                                    "text-[13px] font-medium truncate tracking-tight animate-in fade-in duration-300 flex-1",
                                    isActive ? "text-accent-primary font-bold" : "text-gray-13 group-hover:text-gray-13"
                                )}>{p.settings.title}</div>
                            )}
                        </button>

                        {!isCollapsed && (
                            <div className="hidden group-hover:flex items-center gap-0.5 animate-in fade-in slide-in-from-right-2 duration-200">
                                <ActionIcon
                                    size="xs"
                                    variant="subtle"
                                    color="gray"
                                    disabled={index === 0}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        movePanel(p.id, 'up')
                                    }}
                                    className="hover:bg-accent-soft/10 hover:text-accent-primary disabled:opacity-30"
                                >
                                    <Icon name="lucide:arrow-up" width={12} height={12} />
                                </ActionIcon>
                                <ActionIcon
                                    size="xs"
                                    variant="subtle"
                                    color="gray"
                                    disabled={index === totalPanels - 1}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        movePanel(p.id, 'down')
                                    }}
                                    className="hover:bg-accent-soft/10 hover:text-accent-primary disabled:opacity-30"
                                >
                                    <Icon name="lucide:arrow-down" width={12} height={12} />
                                </ActionIcon>
                                <div className="w-px h-3 bg-gray-2 mx-0.5" />
                                <ActionIcon
                                    size="xs"
                                    variant="subtle"
                                    color="red"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsConfirmingDelete(true)
                                    }}
                                    className="hover:bg-red-50 text-gray-4 hover:text-red-500 transition-colors"
                                >
                                    <Icon name="lucide:trash-2" width={12} height={12} />
                                </ActionIcon>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

const LeftSidebar = () => {
    const {
        panels,
        setPanels,
        activeQuestionId,
        setActiveQuestionId,
        name,
        isLeftSidebarCollapsed,
        setLeftSidebarCollapsed,
        movePanel,
        sidebarView,
        activePanelId
    } = useFormStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [isFormExpanded, setIsFormExpanded] = useState(true)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const filteredPanels = useMemo(() => {
        if (!searchQuery.trim()) return panels
        return panels.filter(p =>
            (p.settings.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.settings.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.fields.some(f =>
                (f.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.type || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
    }, [panels, searchQuery])

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = panels.findIndex((p) => p.id === active.id)
            const newIndex = panels.findIndex((p) => p.id === over.id)
            setPanels(arrayMove(panels, oldIndex, newIndex))
        }
    }

    const scrollToPanel = (id: string) => {
        if (activeQuestionId) {
            setActiveQuestionId(null)
        }
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <div className={cn(
            "relative transition-all duration-300 border-r border-gray-2 bg-gray-1/30 flex flex-col h-full animate-in slide-in-from-left font-inter shrink-0",
            isLeftSidebarCollapsed ? "w-14" : "w-[280px]"
        )}>
            {sidebarView === 'fields' && !isLeftSidebarCollapsed ? (
                <FieldLibrary />
            ) : (
                <>
                    {/* Edge Collapse Toggle */}
                    <button
                        onClick={() => setLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                        className={cn(
                            "absolute -right-3 top-1/2 -translate-y-1/2 z-50",
                            "flex items-center justify-center size-6 rounded-full border border-gray-2 bg-white text-gray-4 shadow-sm",
                            "hover:text-accent-primary hover:border-accent-soft hover:shadow-md transition-all group active:scale-90"
                        )}
                        title={isLeftSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <Icon
                            name={isLeftSidebarCollapsed ? "lucide:chevron-right" : "lucide:chevron-left"}
                            width={14}
                            height={14}
                            className="transition-transform duration-300 group-hover:scale-110"
                        />
                    </button>

                    <div className={cn(
                        "flex items-center justify-between px-3 h-16 bg-white shrink-0 border-b border-gray-2 transition-all",
                        isLeftSidebarCollapsed ? "justify-center py-2" : "px-4 py-3"
                    )}>
                        {!isLeftSidebarCollapsed && (
                            <div className="text-[11px] font-extrabold text-gray-10 tracking-[0.1em] uppercase animate-in fade-in duration-300">Explorer</div>
                        )}

                        <div className={cn("flex items-center", isLeftSidebarCollapsed ? "flex-col gap-2" : "gap-1")}>
                            {!isLeftSidebarCollapsed && (
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    className="hover:bg-gray-2"
                                    onClick={() => useFormStore.getState().addPanel()}
                                    title="Add Section"
                                >
                                    <Icon name="lucide:plus" width={14} height={14} />
                                </ActionIcon>
                            )}
                        </div>
                    </div>

                    <div className={cn(
                        "p-3 border-b border-gray-2 bg-white/50 backdrop-blur-sm sticky top-0 z-10 transition-all",
                        isLeftSidebarCollapsed ? "px-2 py-3 flex justify-center" : "px-4 py-2.5"
                    )}>
                        {isLeftSidebarCollapsed ? (
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                                onClick={() => setLeftSidebarCollapsed(false)}
                                title="Search Sections"
                            >
                                <Icon name="lucide:search" width={16} height={16} className="text-gray-5" />
                            </ActionIcon>
                        ) : (
                            <div className="relative group animate-in slide-in-from-top-1 duration-300">
                                <Icon
                                    name="lucide:search"
                                    className={cn(
                                        "absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-4 transition-colors",
                                        searchQuery && "text-accent-primary"
                                    )}
                                    width={13}
                                    height={13}
                                />
                                <input
                                    type="text"
                                    placeholder="Search sections or fields..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-2 rounded-lg pl-8 pr-8 py-1.5 text-xs outline-none focus:bg-white focus:border-accent-primary focus:ring-2 focus:ring-accent-soft/20 transition-all placeholder:text-gray-4 font-medium"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-2 text-gray-4 hover:text-gray-6 transition-colors"
                                    >
                                        <Icon name="lucide:x" width={12} height={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar transition-all font-inter",
                        isLeftSidebarCollapsed && "px-2"
                    )}>
                        <div className="space-y-1">
                            {!isLeftSidebarCollapsed && (
                                <div
                                    className={cn(
                                        "flex items-center gap-2 mb-1 group cursor-pointer hover:bg-gray-2 rounded-lg transition-colors px-2 py-1.5"
                                    )}
                                    onClick={() => setIsFormExpanded(!isFormExpanded)}
                                >
                                    <Icon
                                        name={isFormExpanded ? "lucide:chevron-down" : "lucide:chevron-right"}
                                        width={14}
                                        height={14}
                                        className="text-gray-5 group-hover:text-gray-9 transition-colors"
                                    />
                                    <Icon name="lucide:file-text" width={14} height={14} className="text-gray-4 group-hover:text-accent-primary transition-colors" />
                                    <div className="text-[11px] font-extrabold text-gray-10 group-hover:text-gray-12 tracking-widest transition-colors truncate">{(name as string) || 'Untitled Form'}</div>
                                </div>
                            )}

                            {isFormExpanded && (
                                <div className={cn(
                                    "space-y-0.5 transition-all outline-none",
                                    isLeftSidebarCollapsed ? "ml-0 border-0 pl-0 items-center flex flex-col gap-2" : "ml-2 border-l border-gray-2 pl-3"
                                )}>
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={filteredPanels.map(p => p.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {filteredPanels.map((p, index) => (
                                                <SortableSectionItem
                                                    key={p.id}
                                                    p={p}
                                                    index={index}
                                                    totalPanels={panels.length}
                                                    isCollapsed={isLeftSidebarCollapsed}
                                                    isActive={activePanelId === p.id}
                                                    onScroll={scrollToPanel}
                                                    movePanel={movePanel}
                                                    isSearchActive={!!searchQuery.trim()}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    {filteredPanels.length === 0 && searchQuery && (
                                        <div className="py-4 text-center">
                                            <div className="text-[10px] font-semibold text-gray-4 uppercase tracking-widest">No results</div>
                                        </div>
                                    )}
                                    {isLeftSidebarCollapsed && !searchQuery && (
                                        <button
                                            onClick={() => useFormStore.getState().addPanel()}
                                            className="size-9 flex items-center justify-center rounded-lg border border-dashed border-gray-3 hover:border-accent-primary hover:text-accent-primary transition-all text-gray-4 mt-2"
                                            title="Add Section"
                                        >
                                            <Icon name="lucide:plus" width={16} height={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={cn(
                        "p-4 border-t border-gray-2 shrink-0 bg-white transition-all",
                        isLeftSidebarCollapsed && "p-3 flex justify-center"
                    )}>
                        <div className="flex items-center gap-2 text-gray-5">
                            <Icon name="lucide:check-circle-2" width={14} height={14} className="text-green-500" />
                            {!isLeftSidebarCollapsed && (
                                <div className="text-[10px] font-semibold uppercase tracking-widest animate-in fade-in duration-300">Auto-saved</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default LeftSidebar
