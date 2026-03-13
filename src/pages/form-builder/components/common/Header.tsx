import { Button } from '@mantine/core'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import { useFormStore } from '@/pages/form-builder/store/formStore'

const Header = () => {
  const navigate = useNavigate()
  const {
    description,
    name,
    publishStatus,
    saveForm,
    setIsPreviewOpen,
    setPublishOpen,
    setSelectionType,
  } = useFormStore()

  const [isSaving, setIsSaving] = useState(false)

  const handleQuickSave = async () => {
    setIsSaving(true)
    try {
      await saveForm('DRAFT')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <header className='flex h-16 shrink-0 items-center justify-between border-b border-gray-3 bg-white px-4 font-inter'>
      {/* Left: Back + Form Name + Status */}
      <div className='flex items-center gap-4'>
        <IconButton
          color='gray'
          icon='lucide:chevron-left'
          variant='ghost'
          onClick={() => navigate({ to: '/forms' })}
        />

        <div
          className='group/name flex cursor-pointer flex-col'
          onClick={() => setSelectionType('general')}
        >
          <div className='flex items-center gap-2'>
            <h1 className='text-15/5 font-semibold text-gray-13'>{name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                publishStatus === 'PUBLISHED'
                  ? 'text-success-main bg-success-subtle'
                  : 'bg-gray-3 text-gray-11'
              }`}
            >
              {publishStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
          </div>
          <span className='max-w-[300px] truncate text-xs text-gray-10'>
            {description || 'No description provided'}
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className='flex items-center gap-3'>
        <Button
          className='text-[10px] font-bold tracking-wider text-accent-primary uppercase hover:bg-accent-soft/10'
          color='gray'
          size='xs'
          variant='subtle'
          leftSection={
            <Icon
              className='text-accent-primary'
              height={14}
              name='lucide:sparkles'
              width={14}
            />
          }
          onClick={() => useAskAIStore.getState().open()}
        >
          Ask AI
        </Button>

        <div className='mx-1 h-4 w-px bg-gray-3' />

        <IconButton
          className='bg-gray-1 text-gray-10 hover:bg-gray-3'
          color='gray'
          icon='lucide:settings'
          size='sm'
          variant='ghost'
          onClick={() => {
            const current = useFormStore.getState().isSidebarOpen
            useFormStore.getState().setSidebarOpen(!current)
            if (!current) setSelectionType('general')
          }}
        />

        <Button
          className='text-[10px] font-bold tracking-wider text-gray-11 uppercase'
          color='gray'
          size='xs'
          variant='outline'
          leftSection={
            <Icon
              className='text-gray-11'
              height={14}
              name='lucide:eye'
              width={14}
            />
          }
          onClick={() => setIsPreviewOpen(true)}
        >
          Preview
        </Button>

        <Button
          className='border-gray-3 text-[10px] font-bold tracking-wider text-gray-11 uppercase'
          color='gray'
          loading={isSaving}
          size='xs'
          variant='light'
          leftSection={
            <Icon
              className='text-gray-11'
              height={14}
              name='lucide:save'
              width={14}
            />
          }
          onClick={handleQuickSave}
        >
          Save
        </Button>

        <Button
          bg='accent-primary'
          className='px-4 text-[10px] font-bold tracking-wider uppercase shadow-md shadow-accent-soft/20 transition-all hover:opacity-90'
          size='xs'
          variant='filled'
          leftSection={
            <Icon
              className='text-white'
              height={14}
              name='lucide:rocket'
              width={14}
            />
          }
          onClick={() => setPublishOpen(true)}
        >
          Publish
        </Button>
      </div>
    </header>
  )
}

Header.displayName = 'Header'
export default Header
