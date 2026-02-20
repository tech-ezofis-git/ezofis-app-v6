import { ActionIcon, Box, Group, SegmentedControl, Text, TextInput } from '@mantine/core'
import { t } from '@lingui/macro'
import { useFormStore } from '../store'
import Icon from '@/components/base/icon/Icon'

const BuilderHeader = () => {
    const { title, setTitle, isPreviewMode, setIsPreviewMode, undo, redo } = useFormStore()

    return (
        <Box className="flex h-full items-center justify-between px-6 bg-white border-b border-slate-200">
            <Group gap="md">
                <ActionIcon variant="subtle" color="gray" onClick={() => window.history.back()}>
                    <Icon name="tabler:arrow-left" className="size-[18px]" />
                </ActionIcon>

                <Box className="flex flex-col">
                    <Box className="flex items-center gap-2 group">
                        <TextInput
                            variant="unstyled"
                            value={title}
                            onChange={(e) => setTitle(e.currentTarget.value)}
                            className="font-black text-slate-950 h-6 leading-tight"
                            classNames={{ input: 'p-0 text-base h-6 font-black leading-tight min-h-0' }}
                        />
                        <ActionIcon variant="subtle" color="gray" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon name="tabler:settings" className="size-3.5" />
                        </ActionIcon>
                    </Box>
                    <Box className="flex items-center gap-1.5">
                        <div className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                        </div>
                        <Text size="10px" className="text-slate-500 uppercase font-bold tracking-wider">
                            {t`Draft · Last saved 2m ago`}
                        </Text>
                    </Box>
                </Box>
            </Group>

            <Group gap="lg">
                <Group gap="xs">
                    <ActionIcon variant="subtle" color="gray" onClick={undo} title={t`Undo`}>
                        <Icon name="tabler:arrow-back-up" className="size-4" />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="gray" onClick={redo} title={t`Redo`}>
                        <Icon name="tabler:arrow-forward-up" className="size-4" />
                    </ActionIcon>
                </Group>

                <SegmentedControl
                    value={isPreviewMode ? 'preview' : 'edit'}
                    onChange={(v) => setIsPreviewMode(v === 'preview')}
                    data={[
                        { label: t`Edit`, value: 'edit' },
                        { label: t`Preview`, value: 'preview' }
                    ]}
                    size="xs"
                    radius="md"
                    className="bg-slate-100"
                />

                <Group gap="sm">
                    <ActionIcon
                        variant="gradient"
                        gradient={{ from: 'indigo', to: 'violet' }}
                        radius="md"
                        size="md"
                        onClick={() => { }}
                    >
                        <Icon name="tabler:sparkles" className="size-4" />
                    </ActionIcon>

                    <ActionIcon variant="outline" color="gray" radius="md" size="md">
                        <Icon name="tabler:device-floppy" className="size-4" />
                    </ActionIcon>
                </Group>
            </Group>
        </Box>
    )
}

export default BuilderHeader
