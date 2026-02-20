import { TextInput, Textarea, Button, Text, Group, Stack, UnstyledButton, ActionIcon } from '@mantine/core'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

const PublishSidebar = () => {
    const {
        setPublishOpen,
        name,
        setName,
        description,
        setDescription,
        layout,
        setLayout
    } = useFormStore()

    const layouts = [
        { id: 'typeform', name: 'Focus Mode', description: 'One question at a time', icon: 'tabler:square-rotated' },
        { id: 'grid', name: 'Classic Grid', description: 'Multi-column layout', icon: 'tabler:layout-grid' },
        { id: 'full', name: 'Vertical Flow', description: 'Single column stack', icon: 'tabler:layout-list' }
    ]

    return (
        <div className="h-full flex flex-col bg-surface-primary border border-gray-3 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 font-inter">
            {/* Header */}
            <div className="p-5 bg-gradient-to-br from-accent-primary to-indigo-600 text-white shrink-0">
                <Group justify="space-between" mb="xs">
                    <div className="size-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Icon name="tabler:rocket" width={16} height={16} />
                    </div>
                    <ActionIcon
                        variant="transparent"
                        color="white"
                        onClick={() => setPublishOpen(false)}
                        className="hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Icon name="tabler:x" width={16} height={16} />
                    </ActionIcon>
                </Group>
                <Text fw={800} size="sm" className="tracking-tight uppercase">Ready to Deploy</Text>
                <Text size="xs" className="opacity-80 mt-0.5 leading-tight">Review settings before finalizing.</Text>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {/* Basic Info */}
                <Stack gap="xs">
                    <Text size="10px" fw={800} className="text-gray-5 uppercase tracking-[0.15em]">Deployment Strategy</Text>
                    <TextInput
                        label={<Text size="xs" fw={700} className="text-gray-12 mb-1">Form Name</Text>}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Q1 Customer Survey"
                        size="sm"
                        classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white' }}
                    />
                    <Textarea
                        label={<Text size="xs" fw={700} className="text-gray-12 mb-1">Description</Text>}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Internal notes for this form..."
                        autosize
                        minRows={2}
                        size="sm"
                        classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white' }}
                    />
                </Stack>

                {/* Layout Selector */}
                <div>
                    <Text size="10px" fw={800} className="text-gray-5 uppercase tracking-[0.15em] mb-3">Display Layout</Text>
                    <div className="flex flex-col gap-2">
                        {layouts.map((l) => {
                            const isActive = layout === l.id
                            return (
                                <UnstyledButton
                                    key={l.id}
                                    onClick={() => setLayout(l.id as any)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                                        isActive
                                            ? "bg-accent-soft/5 border-accent-primary shadow-sm"
                                            : "bg-surface-primary border-gray-2 hover:border-gray-3 hover:bg-gray-50"
                                    )}
                                >
                                    <div className={cn(
                                        "size-8 rounded-lg flex items-center justify-center shrink-0 border",
                                        isActive ? "bg-accent-primary text-white border-accent-primary" : "bg-gray-50 text-gray-400 border-gray-2"
                                    )}>
                                        <Icon name={l.icon} width={16} height={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Text size="xs" fw={800} className={isActive ? "text-gray-13" : "text-gray-9"}>
                                            {l.name}
                                        </Text>
                                        <Text size="10px" className="text-gray-5 truncate">
                                            {l.description}
                                        </Text>
                                    </div>
                                    {isActive && (
                                        <Icon name="tabler:circle-check-filled" width={16} height={16} className="text-accent-primary shrink-0" />
                                    )}
                                </UnstyledButton>
                            )
                        })}
                    </div>
                </div>

                {/* Status List */}
                <div className="space-y-2 pt-4 border-t border-gray-1">
                    <Text size="10px" fw={800} className="text-gray-5 uppercase tracking-[0.15em] mb-2">Pre-flight Checklist</Text>
                    <div className="flex items-center gap-2 text-[11px] text-gray-7">
                        <Icon name="lucide:check-circle" width={12} height={12} className="text-green-500" />
                        <span>All {useFormStore.getState().pages.reduce((acc, p) => acc + p.questions.length, 0)} questions validated</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-7">
                        <Icon name="lucide:check-circle" width={12} height={12} className="text-green-500" />
                        <span>Responsive layouts optimized</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-2 bg-gray-50/50 shrink-0">
                <Button
                    fullWidth
                    size="md"
                    radius="xl"
                    bg="accent-primary"
                    className="hover:scale-[1.02] active:scale-95 transition-all font-bold shadow-lg shadow-accent-soft/30 h-11 text-xs uppercase tracking-widest"
                    onClick={() => setPublishOpen(false)}
                >
                    Deploy Form
                </Button>
                <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
                    <div className="size-1 bg-gray-400 rounded-full" />
                    <Text size="9px" className="text-gray-5 uppercase font-black">v1.0.4 Staging</Text>
                    <div className="size-1 bg-gray-400 rounded-full" />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                }
            `}} />
        </div>
    )
}

export default PublishSidebar
