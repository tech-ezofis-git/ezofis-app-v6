import { TextInput, Textarea, Title, Stack, Box, Paper, ActionIcon, Group } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'

interface GeneralSettingsProps {
  setTab: (value: string | null) => void
}

const GeneralSettings = ({ setTab }: GeneralSettingsProps) => {
  const { name, setName, description, setDescription } = useFormStore()

  return (
    <Box className="max-w-[800px] mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack gap="xl">
        <Group>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => setTab('Build')}
            className="hover:bg-gray-1 transition-all active:scale-95"
          >
            <Icon name="tabler:arrow-left" width={24} height={24} />
          </ActionIcon>
          <Box>
            <Title order={2} className="text-24 font-black text-gray-13 mb-2">General Settings</Title>
            <p className="text-14 text-gray-9">Manage your form's basic information and metadata.</p>
          </Box>
        </Group>

        <Paper withBorder p="xl" radius="md" className="bg-surface-primary border-surface-secondary shadow-sm">
          <Stack gap="lg">
            <TextInput
              label="Form Title"
              placeholder="e.g., Customer Feedback Survey"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="md"
              classNames={{
                label: 'text-14 font-bold text-gray-13 mb-2',
                input: 'focus:border-accent-primary transition-colors'
              }}
            />

            <Textarea
              label="Form Description"
              placeholder="Tell your respondents what this form is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="md"
              minRows={4}
              classNames={{
                label: 'text-14 font-bold text-gray-13 mb-2',
                input: 'focus:border-accent-primary transition-colors'
              }}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}

GeneralSettings.displayName = 'GeneralSettings'
export default GeneralSettings
