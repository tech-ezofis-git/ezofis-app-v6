import { useFormStore } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import { Text, ActionIcon } from '@mantine/core'
import cn from '@/utils/cn'

const LeftSidebar = () => {
    const { panels, activeQuestionId, setActiveQuestionId, name } = useFormStore()

    const scrollToPanel = (id: string) => {
        // Clear active question so we don't highlight a specific field when jumping to a panel
        if (activeQuestionId) {
            setActiveQuestionId(null)
        }
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <div className="w-[280px] shrink-0 border-r border-gray-2 bg-gray-1/30 flex flex-col h-full animate-in slide-in-from-left duration-300 font-inter">
            <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-gray-2 h-16 bg-white shrink-0">
                <Text size="11px" fw={800} className="text-gray-10 tracking-[0.1em] uppercase">Explorer</Text>
                <div className="flex gap-1">
                    <ActionIcon variant="subtle" color="gray" size="sm" className="hover:bg-gray-2" onClick={() => useFormStore.getState().addPanel()}>
                        <Icon name="lucide:plus" width={14} height={14} />
                    </ActionIcon>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 mb-1 group cursor-pointer hover:bg-gray-2 rounded-lg transition-colors">
                        <Icon name="lucide:chevron-down" width={14} height={14} className="text-gray-5 group-hover:text-gray-9 transition-colors" />
                        <Icon name="lucide:file-text" width={14} height={14} className="text-gray-4 group-hover:text-accent-primary transition-colors" />
                        <Text size="11px" fw={800} className="text-gray-8 group-hover:text-gray-12 tracking-widest transition-colors truncate">{(name as string) || 'Untitled Form'}</Text>
                    </div>

                    <div className="space-y-0.5 ml-2 border-l border-gray-2 pl-3">
                        {panels.map((p) => {
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => scrollToPanel(p.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all border border-transparent group relative",
                                        "hover:bg-accent-soft/5 hover:text-accent-primary hover:border-accent-soft/20 text-gray-10"
                                    )}
                                >
                                    <Icon name={p.id === panels[0]?.id ? "lucide:shield-check" : "lucide:layout"} width={14} height={14} className="shrink-0 group-hover:text-accent-primary opacity-60 group-hover:opacity-100" />
                                    <Text size="13px" fw={500} className="truncate tracking-tight">{p.settings.title}</Text>
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-gray-2 shrink-0 bg-white">
                <div className="flex items-center gap-2 text-gray-5">
                    <Icon name="lucide:check-circle-2" width={14} height={14} className="text-green-500" />
                    <Text size="10px" fw={600} className="uppercase tracking-widest">Auto-saved just now</Text>
                </div>
            </div>
        </div>
    )
}

export default LeftSidebar
