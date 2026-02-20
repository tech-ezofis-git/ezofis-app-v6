import { TextInput, Stack, Box, Group, Switch, Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'

const HeaderFooterSettings = () => {
    const {
        showHeaderFooter, headerText, footerText, setHeaderFooter
    } = useFormStore()

    return (
        <Box className="max-w-[1000px] mx-auto py-10 px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-inter">
            <Stack gap={32}>
                {/* Toggle Section */}
                <Group align="flex-start" gap="xl" wrap="nowrap">
                    <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
                        <Icon name="lucide:layout-template" className="text-accent-primary" width={20} height={20} />
                    </div>
                    <Box className="flex-1">
                        <Group justify="space-between">
                            <Box>
                                <h2 className="text-xl font-bold text-gray-13">Header & Footer</h2>
                                <p className="text-sm text-gray-9 mt-1">
                                    Add persistent branding or navigation elements to every page of your form
                                </p>
                            </Box>
                            <Switch
                                checked={showHeaderFooter}
                                onChange={(e) => setHeaderFooter({ show: e.currentTarget.checked })}
                                size="md"
                                color="accent-primary"
                            />
                        </Group>
                    </Box>
                </Group>

                <div className="h-px bg-gray-1" />

                {/* Content Section */}
                {showHeaderFooter ? (
                    <Group align="flex-start" gap="xl" wrap="nowrap">
                        <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
                            <Icon name="lucide:copyright" className="text-accent-primary" width={20} height={20} />
                        </div>
                        <Box className="w-[200px] shrink-0">
                            <h3 className="text-sm font-bold text-gray-900">Branding Content</h3>
                            <p className="text-xs text-gray-500 mt-1">Global header and footer text</p>
                        </Box>

                        <Stack gap="lg" className="flex-1">
                            <TextInput
                                label="Header Text"
                                placeholder="e.g., Ezofis Survey 2024"
                                value={headerText}
                                onChange={(e) => setHeaderFooter({ header: e.target.value })}
                                classNames={{
                                    label: 'text-xs font-bold text-gray-900 mb-2',
                                    input: 'focus:border-accent-primary transition-all rounded-lg bg-white border-gray-2'
                                }}
                            />

                            <TextInput
                                label="Footer Text"
                                placeholder="e.g., © 2024 Ezofis. All rights reserved."
                                value={footerText}
                                onChange={(e) => setHeaderFooter({ footer: e.target.value })}
                                classNames={{
                                    label: 'text-xs font-bold text-gray-900 mb-2',
                                    input: 'focus:border-accent-primary transition-all rounded-lg bg-white border-gray-2'
                                }}
                            />
                        </Stack>
                    </Group>
                ) : (
                    <Box className="py-24 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-3 border-opacity-60">
                        <Icon name="lucide:eye-off" width={32} height={32} className="text-gray-3 mb-2" />
                        <Text className="text-sm font-semibold text-gray-500">Header & Footer are currently disabled</Text>
                        <Text className="text-xs text-gray-400 mt-1">Enable them using the toggle above to customize the content.</Text>
                    </Box>
                )}
            </Stack>
        </Box>
    )
}

HeaderFooterSettings.displayName = 'HeaderFooterSettings'
export default HeaderFooterSettings
