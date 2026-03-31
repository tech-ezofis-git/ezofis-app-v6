import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
// import IconButton from '@/components/base/button/IconButton'
// import Icon from '@/components/base/icon/Icon'/
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import { useFormStore } from '@/pages/form-builder/store/formStore'
// import { useFormStore } from '@/pages/form-builder/store/formStore'/

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
        <IconButton
          className='bg-gray-1 text-gray-10 hover:bg-gray-3'
          color='gray'
          icon='lucide:settings'
          size='sm'
          variant='ghost'
          onClick={() => {
            useAskAIStore.getState().close() // Close AI if it's open
            const current = useFormStore.getState().isSidebarOpen
            useFormStore.getState().setSidebarOpen(!current)
            if (!current) setSelectionType('general')
          }}
        />

        <Button
          className='from-violet-600 to-indigo-600 border-none bg-gradient-to-r shadow-md transition-all hover:shadow-lg'
          color='primary'
          icon='lucide:sparkles'
          label='Ask AI'
          size='sm'
          variant='solid'
          onClick={() => {
            useFormStore.getState().setSidebarOpen(false) // Close settings if it's open
            useAskAIStore.getState().open()
          }}
        />

        <Button
          color='gray'
          icon='lucide:eye'
          label='Preview'
          size='sm'
          variant='outline'
          onClick={() => setIsPreviewOpen(true)}
        />

        <Button
          color='gray'
          icon='lucide:save'
          label='Save'
          loading={isSaving}
          size='sm'
          variant='outline'
          onClick={handleQuickSave}
        />

        <Button
          className='px-4'
          color='primary'
          icon='lucide:rocket'
          label='Publish'
          size='sm'
          variant='solid'
          onClick={() => setPublishOpen(true)}
        />
      </div>
    </header>
  )
}

Header.displayName = 'Header'
export default Header
