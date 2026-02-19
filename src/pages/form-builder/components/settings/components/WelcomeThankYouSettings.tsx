import { TextInput, Textarea, Stack, Box, Group, Switch, Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'

interface Props {
    type: 'welcome' | 'thank_you'
}

const WelcomeThankYouSettings = ({ type }: Props) => {
    const {
        welcomePage, setWelcomePage,
        thankYouPage, setThankYouPage
    } = useFormStore()

    const isWelcome = type === 'welcome'
    const data = isWelcome ? welcomePage : thankYouPage
    const setter = isWelcome ? setWelcomePage : setThankYouPage

    return (
        <Box className="max-w-[1000px] mx-auto py-10 px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-inter">
            <Stack gap={32}>
                {/* Toggle Section */}
                <Group align="flex-start" gap="xl" wrap="nowrap">
                    <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
                        <Icon
                            name={isWelcome ? "lucide:megaphone" : "lucide:party-popper"}
                            className="text-accent-primary"
                            width={20} height={20}
                        />
                    </div>
                    <Box className="flex-1">
                        <Group justify="space-between">
                            <Box>
                                <h2 className="text-xl font-bold text-gray-13">
                                    {isWelcome ? 'Welcome Page' : 'Thank You Page'}
                                </h2>
                                <p className="text-sm text-gray-9 mt-1">
                                    {isWelcome
                                        ? 'Display a landing page before the first question'
                                        : 'Display a custom message after the form is submitted'}
                                </p>
                            </Box>
                            <Switch
                                checked={data.enabled}
                                onChange={(e) => setter({ enabled: e.currentTarget.checked })}
                                size="md"
                                color="accent-primary"
                            />
                        </Group>
                    </Box>
                </Group>

                <div className="h-px bg-gray-1" />

                {/* Content Section */}
                {data.enabled ? (
                    <Group align="flex-start" gap="xl" wrap="nowrap">
                        <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
                            <Icon name="lucide:text-cursor-input" className="text-accent-primary" width={20} height={20} />
                        </div>
                        <Box className="w-[200px] shrink-0">
                            <h3 className="text-sm font-bold text-gray-900">Page Content</h3>
                            <p className="text-xs text-gray-500 mt-1">Configure titles and text</p>
                        </Box>

                        <Stack gap="lg" className="flex-1">
                            <TextInput
                                label="Title"
                                placeholder="Page Title"
                                value={data.title}
                                onChange={(e) => setter({ title: e.target.value })}
                                classNames={{
                                    label: 'text-xs font-bold text-gray-900 mb-2',
                                    input: 'focus:border-accent-primary transition-all rounded-lg bg-white border-gray-2'
                                }}
                            />

                            <Textarea
                                label="Description"
                                placeholder="Write a message for your respondents"
                                value={data.description}
                                onChange={(e) => setter({ description: e.target.value })}
                                minRows={4}
                                classNames={{
                                    label: 'text-xs font-bold text-gray-900 mb-2',
                                    input: 'focus:border-accent-primary transition-all rounded-lg bg-white border-gray-2'
                                }}
                            />

                            {isWelcome && (
                                <TextInput
                                    label="Button Text"
                                    placeholder="e.g., Start, Let's go!"
                                    value={(data as any).buttonText}
                                    onChange={(e) => setter({ buttonText: e.target.value })}
                                    classNames={{
                                        label: 'text-xs font-bold text-gray-900 mb-2',
                                        input: 'focus:border-accent-primary transition-all rounded-lg bg-white border-gray-2'
                                    }}
                                />
                            )}
                        </Stack>
                    </Group>
                ) : (
                    <Box className="py-24 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-3 border-opacity-60">
                        <Icon name="lucide:eye-off" width={32} height={32} className="text-gray-3 mb-2" />
                        <Text className="text-sm font-semibold text-gray-500">Page is currently disabled</Text>
                        <Text className="text-xs text-gray-400 mt-1">Enable it using the toggle above to customize the content.</Text>
                    </Box>
                )}
            </Stack>
        </Box>
    )
}

WelcomeThankYouSettings.displayName = 'WelcomeThankYouSettings'
export default WelcomeThankYouSettings
