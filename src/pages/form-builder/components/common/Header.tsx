import { ActionIcon, Button, Group, Box, TextInput, Text, Badge } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import IconButton from '@/components/base/button/IconButton'
import { useNavigate } from '@tanstack/react-router'

interface HeaderProps {
  setTab: (value: string | null) => void
}

const Header = ({ setTab }: HeaderProps) => {
  const navigate = useNavigate()
  const {
    name,
    setName,
    isBuilderMode,
    setIsBuilderMode
  } = useFormStore()

  const handleSave = () => {
    //setName('New Form')
  }

  return (
    <header className='flex h-16 items-center justify-between border-b border-gray-3 bg-white px-4 shrink-0'>
      {/* Left: Back + Form Name + Status */}
      <div className='flex items-center gap-4'>
        <IconButton
          color='gray'
          icon='lucide:chevron-left'
          variant='ghost'
          onClick={() => navigate({ to: '/forms' })}
        />

        <div className='flex flex-col group/name cursor-pointer' onClick={() => setTab('Settings')}>
          <div className='flex items-center gap-2'>
            <input
              value={name}
              readOnly
              className='text-base font-semibold text-gray-13 p-0 h-auto min-w-[120px] bg-transparent border-none focus:outline-none pointer-events-none'
            />
            <Icon
              name="lucide:pencil"
              width={12} height={12}
              className="text-gray-5 opacity-0 group-hover/name:opacity-100 transition-opacity"
            />
            <span className='rounded-full bg-gray-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-11'>
              Draft
            </span>
          </div>
          <span className='text-xs text-gray-10'>
            Last saved 2m ago · {isBuilderMode ? 'Editor' : 'Preview'} Mode
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className='flex items-center gap-2'>
        <Button
          // variant="subtle"
          color="gray"
          size="xs"
          leftSection={<Icon name="lucide:sparkles" width={14} height={14} />}
          className="bg-blue-10 hover:bg-blue-9 text-white font-bold uppercase tracking-wider text-[10px]"
          onClick={() => useAskAIStore.getState().open()}
        >
          Ask AI
        </Button>

        <Box className="h-6 w-px bg-gray-2 mx-2" />

        <Button
          variant="outline"
          color="gray"
          size="xs"
          leftSection={<Icon name="lucide:eye" width={14} height={14} />}
          className="border-gray-3 text-gray-11 font-bold uppercase tracking-wider text-[10px]"
          onClick={() => useFormStore.getState().setIsPreviewOpen(true)}
        >
          Preview
        </Button>

        <Button
          variant="filled"
          bg="accent-primary"
          size="xs"
          leftSection={<Icon name="lucide:rocket" width={14} height={14} />}
          className="hover:opacity-90 transition-all font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-accent-soft/20"
          onClick={() => setTab('Publish')}
        >
          Publish
        </Button>
      </div>
    </header>
  )
}

Header.displayName = 'Header'
export default Header
