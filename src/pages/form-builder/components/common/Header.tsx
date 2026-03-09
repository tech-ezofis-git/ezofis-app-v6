import Button from '@/components/base/button/Button'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import IconButton from '@/components/base/button/IconButton'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

const Header = () => {
  const navigate = useNavigate()
  const {
    name,
    description,
    setSelectionType,
    setPublishOpen,
    setIsPreviewOpen,
    publishStatus,
    saveForm
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
    <header className='flex h-16 items-center justify-between border-b border-gray-3 bg-white px-4 shrink-0 font-inter'>
      {/* Left: Back + Form Name + Status */}
      <div className='flex items-center gap-4'>
        <IconButton
          color='gray'
          icon='lucide:chevron-left'
          variant='ghost'
          onClick={() => navigate({ to: '/forms' })}
        />

        <div className='flex flex-col group/name cursor-pointer' onClick={() => setSelectionType('general')}>
          <div className='flex items-center gap-2'>
            <h1 className='text-15/5 font-semibold text-gray-13'>
              {name}
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${publishStatus === 'PUBLISHED'
              ? 'bg-success-subtle text-success-main'
              : 'bg-gray-3 text-gray-11'
              }`}>
              {publishStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
          </div>
          <span className='text-xs text-gray-10 truncate max-w-[300px]'>
            {description || 'No description provided'}
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className='flex items-center gap-3'>
        <IconButton
          icon="lucide:settings"
          size="sm"
          variant="ghost"
          color="gray"
          className="text-gray-10 bg-gray-1 hover:bg-gray-3"
          onClick={() => {
            const current = useFormStore.getState().isSidebarOpen
            useFormStore.getState().setSidebarOpen(!current)
            if (!current) setSelectionType('general')
          }}
        />

        <Button
          variant="outline"
          color="gray"
          size="sm"
          icon="lucide:eye"
          label="Preview"
          onClick={() => setIsPreviewOpen(true)}
        />

        <Button
          variant="outline"
          color="gray"
          size="sm"
          loading={isSaving}
          icon="lucide:save"
          label="Save"
          onClick={handleQuickSave}
        />

        <Button
          variant="solid"
          color="primary"
          size="sm"
          icon="lucide:rocket"
          label="Publish"
          onClick={() => setPublishOpen(true)}
          className="px-4"
        />
      </div>

    </header>
  )
}

Header.displayName = 'Header'
export default Header
