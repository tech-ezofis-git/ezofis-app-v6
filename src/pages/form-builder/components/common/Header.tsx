import { ActionIcon, Button, Group, SegmentedControl, Box, TextInput, Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'

interface HeaderProps {
  setTab: (value: string | null) => void
}

const Header = ({ setTab }: HeaderProps) => {
  const {
    name,
    setName,
    isBuilderMode,
    setIsBuilderMode
  } = useFormStore()

  const handleSave = () => {
    setName('New Form')
  }

  return (
    <header className='sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-gray-3 bg-surface-primary px-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500'>
      {/* Left: Back + Form Name + Status */}
      <Group gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray"
          className="hover:bg-gray-2 transition-all active:scale-90"
          onClick={() => window.history.back()}
        >
          <Icon name="tabler:arrow-left" width={18} height={18} />
        </ActionIcon>

        <Box className="flex flex-col justify-center group">
          <Box className="flex items-center gap-1.5">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="unstyled"
              classNames={{
                input: 'text-[15px] font-bold tracking-tight text-gray-13 p-0 h-auto min-w-[100px] hover:bg-gray-1 focus:bg-gray-1 px-1.5 rounded transition-colors leading-tight'
              }}
            />
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setTab('Settings')}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-2"
            >
              <Icon name="tabler:settings" width={14} height={14} />
            </ActionIcon>
          </Box>
          {/* Auto-save status */}
          <Text size="10px" className="text-gray-7 px-1.5 leading-tight">
            Draft · Last saved 2m ago
          </Text>
        </Box>
      </Group>

      {/* Right: Controls */}
      <Group gap="md">
        <SegmentedControl
          value={isBuilderMode ? 'edit' : 'preview'}
          onChange={(v) => setIsBuilderMode(v === 'edit')}
          data={[
            { label: 'Edit', value: 'edit' },
            { label: 'Preview', value: 'preview' }
          ]}
          size="xs"
          radius="md"
          className="bg-gray-2 border border-gray-3"
        />

        <Button
          variant="gradient"
          gradient={{ from: 'indigo', to: 'violet' }}
          size="sm"
          radius="md"
          leftSection={<Icon name="tabler:sparkles" width={15} height={15} />}
          className="shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
          onClick={() => useAskAIStore.getState().open()}
        >
          Ask AI
        </Button>

        <Button
          variant="default"
          size="sm"
          leftSection={<Icon name="tabler:eye" width={15} height={15} />}
          className="border-gray-3 hover:bg-gray-2 transition-all"
          onClick={() => useFormStore.getState().setIsPreviewOpen(true)}
        >
          Preview
        </Button>

        <Box className="h-7 w-px bg-gray-3" />

        <Group gap="sm">
          <Button
            variant="outline"
            color="gray"
            size="sm"
            leftSection={<Icon name="tabler:device-floppy" width={15} height={15} />}
            className="border-gray-3 hover:bg-gray-2 transition-all active:scale-95"
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            variant="filled"
            bg="accent-primary"
            size="sm"
            leftSection={<Icon name="tabler:rocket" width={15} height={15} />}
            className="hover:opacity-90 transition-all active:scale-95 shadow-md shadow-accent-soft/20"
            onClick={() => setTab('Publish')}
          >
            Publish
          </Button>
        </Group>
      </Group>
    </header>
  )
}

Header.displayName = 'Header'
export default Header
