import { Modal, TextInput, Textarea, Button, Text, Group, Stack, UnstyledButton } from '@mantine/core'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

const PublishModal = () => {
    const {
        isPublishOpen,
        setPublishOpen,
        name,
        setName,
        description,
        setDescription,
        previewMode,
        setPreviewMode
    } = useFormStore()

    const layouts = [
        { id: 'typeform', name: 'Typeform', description: 'One question at a time', icon: 'tabler:square-rotated' },
        { id: 'grid', name: 'Grid', description: 'Classic multi-column layout', icon: 'tabler:layout-grid' },
        { id: 'full', name: 'Full', description: 'Single column vertical flow', icon: 'tabler:layout-list' }
    ]

    return (
        <Modal
            opened={isPublishOpen}
            onClose={() => setPublishOpen(false)}
            size="md"
            radius="lg"
            withCloseButton={false}
            padding={0}
            overlayProps={{
                blur: 3,
                opacity: 0.55
            }}
            transitionProps={{ transition: 'slide-up', duration: 300 }}
        >
            <div className="overflow-hidden font-inter">
                {/* Header */}
                <div className="p-6 bg-gradient-to-br from-accent-primary to-indigo-600 text-white relative">
                    <div className="relative z-10">
                        <Group justify="space-between" mb="xs">
                            <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Icon name="tabler:rocket" width={20} height={20} />
                            </div>
                            <UnstyledButton
                                onClick={() => setPublishOpen(false)}
                                className="size-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                            >
                                <Icon name="tabler:x" width={16} height={16} />
                            </UnstyledButton>
                        </Group>
                        <Text fw={800} size="xl" className="tracking-tight">Publish Your Form</Text>
                        <Text size="sm" className="opacity-80 mt-1">Review your settings before going live.</Text>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <Stack gap="md">
                        <TextInput
                            label="Deployment Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Q1 Customer Survey"
                            size="sm"
                        />
                        <Textarea
                            label="Form Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description for your team..."
                            autosize
                            minRows={2}
                            size="sm"
                        />
                    </Stack>

                    {/* Layout Selector */}
                    <div>
                        <Text size="sm" fw={700} className="text-gray-12 mb-3">Choose Display Layout</Text>
                        <div className="grid grid-cols-1 gap-2">
                            {layouts.map((layout) => {
                                const isActive = previewMode === layout.id
                                return (
                                    <UnstyledButton
                                        key={layout.id}
                                        onClick={() => setPreviewMode(layout.id as any)}
                                        className={cn(
                                            "flex items-center gap-4 p-3 rounded-xl border transition-all duration-200",
                                            isActive
                                                ? "bg-accent-soft/10 border-accent-primary shadow-sm"
                                                : "bg-surface-primary border-gray-2 hover:bg-gray-50 hover:border-gray-3"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-10 rounded-lg flex items-center justify-center shrink-0 border",
                                            isActive ? "bg-accent-primary text-white border-accent-primary" : "bg-gray-1 bg-opacity-50 text-gray-400 border-gray-2"
                                        )}>
                                            <Icon name={layout.icon} width={18} height={18} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <Text size="sm" fw={isActive ? 800 : 600} className={isActive ? "text-gray-13" : "text-gray-11"}>
                                                {layout.name}
                                            </Text>
                                            <Text size="11px" className="text-gray-5">
                                                {layout.description}
                                            </Text>
                                        </div>
                                        {isActive && (
                                            <Icon name="tabler:check" width={16} height={16} className="text-accent-primary mr-2" />
                                        )}
                                    </UnstyledButton>
                                )
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2">
                        <Button
                            fullWidth
                            size="md"
                            radius="xl"
                            bg="accent-primary"
                            className="hover:opacity-90 transition-all font-bold shadow-lg shadow-accent-soft/30 h-12"
                            onClick={() => setPublishOpen(false)}
                        >
                            Save & Deploy
                        </Button>
                        <Text size="10px" className="text-center text-gray-4 mt-3 uppercase tracking-widest font-black">
                            Deployment version 1.0.4
                        </Text>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default PublishModal
