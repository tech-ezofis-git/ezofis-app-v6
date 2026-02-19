import { useEffect } from 'react'
import {
    Box,
    Divider,
    Group,
    Stack,
    Switch,
    Text,
    TextInput,
    Textarea,
    Button,
    Badge,
    // rem
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { Dropzone } from '@mantine/dropzone'
import { t } from '@lingui/macro'
import { useFormStore, type Field } from '../store'
import Icon from '@/components/base/icon/Icon'

const FieldSidebar = () => {
    const { pages, activeFieldId, updateField, deleteField } = useFormStore()

    const activeField = pages
        .flatMap(p => p.fields)
        .find(f => f.id === activeFieldId)

    const form = useForm<Partial<Field>>({
        initialValues: {
            title: '',
            description: '',
            placeholder: '',
            required: false,
            hidden: false,
            readOnly: false,
        },
    })

    // Sync form with active field
    useEffect(() => {
        if (activeField) {
            form.setValues({
                title: activeField.title,
                description: activeField.description || '',
                placeholder: activeField.placeholder || '',
                required: activeField.required,
                hidden: activeField.hidden,
                readOnly: activeField.readOnly,
            })
        }
    }, [activeFieldId])

    // Handle updates
    const handleUpdate = (values: Partial<Field>) => {
        if (activeFieldId) {
            updateField(activeFieldId, values)
        }
    }

    if (!activeField) return null

    return (
        <Box className="h-full flex flex-col bg-white border-l border-slate-200 shadow-xl animate-in slide-in-from-right-4 duration-300">
            {/* Sidebar Header */}
            <Box className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <Group gap="xs">
                    <Icon name="tabler:adjustments-horizontal" className="size-[18px]" />
                    <Text fw={800} size="sm" className="uppercase tracking-widest text-slate-700">
                        {t`Field Settings`}
                    </Text>
                </Group>
                <Badge variant="outline" color="indigo" radius="sm" size="xs">
                    {activeField.type.replace('_', ' ')}
                </Badge>
            </Box>

            {/* Sidebar Scrollable Body */}
            <Box className="flex-1 overflow-y-auto p-6">
                <Stack gap="xl">
                    {/* Content Section */}
                    <Stack gap="md">
                        <Text size="xs" fw={800} className="text-slate-400 uppercase tracking-widest">{t`Content`}</Text>

                        <TextInput
                            label={t`Label`}
                            placeholder={t`e.g. What is your name?`}
                            {...form.getInputProps('title')}
                            onBlur={() => handleUpdate({ title: form.values.title })}
                            classNames={{ label: 'text-xs font-bold text-slate-800 mb-1' }}
                        />

                        <Textarea
                            label={t`Description`}
                            placeholder={t`Add extra instructions for the user...`}
                            {...form.getInputProps('description')}
                            onBlur={() => handleUpdate({ description: form.values.description })}
                            minRows={2}
                            autosize
                            classNames={{ label: 'text-xs font-bold text-slate-800 mb-1' }}
                        />

                        <TextInput
                            label={t`Placeholder`}
                            placeholder={t`e.g. Type here...`}
                            {...form.getInputProps('placeholder')}
                            onBlur={() => handleUpdate({ placeholder: form.values.placeholder })}
                            classNames={{ label: 'text-xs font-bold text-slate-800 mb-1' }}
                        />
                    </Stack>

                    <Divider color="slate.1" />

                    {/* Logic & Validation */}
                    <Stack gap="md">
                        <Text size="xs" fw={800} className="text-slate-400 uppercase tracking-widest">{t`Settings & Logic`}</Text>

                        <Box className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                            <Group justify="space-between">
                                <Box>
                                    <Text size="sm" fw={700} className="text-slate-700">{t`Required`}</Text>
                                    <Text size="10px" className="text-slate-500">{t`Form cannot be submitted without this.`}</Text>
                                </Box>
                                <Switch
                                    color="indigo"
                                    checked={form.values.required}
                                    onChange={(e) => {
                                        const val = e.currentTarget.checked
                                        form.setFieldValue('required', val)
                                        handleUpdate({ required: val })
                                    }}
                                />
                            </Group>

                            <Group justify="space-between">
                                <Box>
                                    <Text size="sm" fw={700} className="text-slate-700">{t`Hidden`}</Text>
                                    <Text size="10px" className="text-slate-500">{t`Hide this field from the end user.`}</Text>
                                </Box>
                                <Switch
                                    color="indigo"
                                    checked={form.values.hidden}
                                    onChange={(e) => {
                                        const val = e.currentTarget.checked
                                        form.setFieldValue('hidden', val)
                                        handleUpdate({ hidden: val })
                                    }}
                                />
                            </Group>

                            <Group justify="space-between">
                                <Box>
                                    <Text size="sm" fw={700} className="text-slate-700">{t`Read Only`}</Text>
                                    <Text size="10px" className="text-slate-500">{t`User can see but not edit data.`}</Text>
                                </Box>
                                <Switch
                                    color="indigo"
                                    checked={form.values.readOnly}
                                    onChange={(e) => {
                                        const val = e.currentTarget.checked
                                        form.setFieldValue('readOnly', val)
                                        handleUpdate({ readOnly: val })
                                    }}
                                />
                            </Group>
                        </Box>
                    </Stack>

                    {/* Specialized Type Logic: Upload Po */}
                    {activeField.type === 'upload_po' && (
                        <>
                            <Divider color="slate.1" />
                            <Stack gap="md">
                                <Text size="xs" fw={800} className="text-slate-400 uppercase tracking-widest">{t`Upload Configuration`}</Text>
                                <Dropzone
                                    onDrop={() => { }}
                                    onReject={() => { }}
                                    maxSize={5 * 1024 ** 2}
                                    className="border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-slate-50 transition-all py-8"
                                >
                                    <Group justify="center" gap="sm" mih={80} style={{ pointerEvents: 'none' }}>
                                        <Dropzone.Accept>
                                            <Icon
                                                name="tabler:upload"
                                                className="size-[52px] text-blue-600"
                                            />
                                        </Dropzone.Accept>
                                        <Dropzone.Reject>
                                            <Icon
                                                name="tabler:x"
                                                className="size-[52px] text-red-600"
                                            />
                                        </Dropzone.Reject>
                                        <Dropzone.Idle>
                                            <Icon
                                                name="tabler:upload"
                                                className="size-[52px] text-slate-400"
                                            />
                                        </Dropzone.Idle>

                                        <div className="text-center">
                                            <Text size="sm" fw={700} inline>
                                                {t`Drop images here or click to select files`}
                                            </Text>
                                            <Text size="xs" color="dimmed" inline mt={7}>
                                                {t`Attach professional documents, each should not exceed 5mb`}
                                            </Text>
                                        </div>
                                    </Group>
                                </Dropzone>
                            </Stack>
                        </>
                    )}
                </Stack>
            </Box>

            {/* Sidebar Footer */}
            <Box className="p-6 border-t border-slate-100 bg-white">
                <Button
                    fullWidth
                    variant="light"
                    color="red"
                    leftSection={<Icon name="tabler:trash" className="size-4" />}
                    className="rounded-xl border border-red-100 hover:bg-red-50"
                    onClick={() => deleteField(activeField.id)}
                >
                    {t`Delete This Field`}
                </Button>
            </Box>
        </Box>
    )
}

export default FieldSidebar
