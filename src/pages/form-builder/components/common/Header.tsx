import { ActionIcon, Button, Group, SegmentedControl, Switch, Box, TextInput } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'

interface HeaderProps {
  setTab: (value: string | null) => void
}

const Header = ({ setTab }: HeaderProps) => {
  const {
    name,
    setName,
    previewMode,
    setPreviewMode,
    hidePreview,
    setHidePreview
  } = useFormStore()

  const handleSave = () => {
    // As per user request: rename it as New Form once the user saves the form
    setName('New Form')
  }

  return (
    <header className='sticky top-0 z-50 flex h-14 items-center justify-between border-b border-surface-secondary bg-surface-primary px-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500'>
      <Group gap="sm">
        <ActionIcon
          variant="ghost"
          color="gray"
          className="hover:bg-surface-secondary transition-all active:scale-90"
          onClick={() => window.history.back()}
        >
          <Icon name="tabler:arrow-left" width={18} height={18} />
        </ActionIcon>

        <Box className="flex items-center gap-2 group">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="unstyled"
            classNames={{
              input: 'text-16 font-bold tracking-tight text-gray-13 p-0 h-auto min-w-[100px] hover:bg-gray-1 focus:bg-gray-1 px-2 rounded transition-colors'
            }}
          />
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => setTab('Settings')}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Icon name="tabler:settings" width={16} height={16} />
          </ActionIcon>
        </Box>
      </Group>

      <Group gap="md">
        {!hidePreview && (
          <SegmentedControl
            value={previewMode}
            onChange={(value) => setPreviewMode(value as any)}
            data={[
              { label: 'Typeform', value: 'typeform' },
              { label: 'Grid', value: 'grid' },
            ]}
            size="xs"
            radius="md"
            classNames={{
              root: 'bg-gray-1 p-1 border-0',
              indicator: 'bg-surface-primary shadow-sm',
              label: 'px-4 font-medium transition-colors'
            }}
          />
        )}

        <Group gap="xs" className="mr-2">
          <Switch
            checked={hidePreview}
            onChange={(event) => setHidePreview(event.currentTarget.checked)}
            label="Hide Preview"
            labelPosition="left"
            size="sm"
            onLabel={<Icon name="tabler:eye-off" width={12} height={12} />}
            styles={{
              track: { backgroundColor: 'var(--accent-soft)' },
              thumb: { border: '1px solid var(--accent-primary)' }
            }}
          />
        </Group>

        <Box className="h-8 w-px bg-gray-2" />

        <Group gap="sm">
          <Button
            variant="outline"
            color="gray"
            size="sm"
            leftSection={<Icon name="tabler:device-floppy" width={16} height={16} />}
            className="border-gray-3 hover:bg-gray-1 transition-all active:scale-95"
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            variant="filled"
            bg="accent-primary"
            size="sm"
            leftSection={<Icon name="tabler:rocket" width={16} height={16} />}
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
