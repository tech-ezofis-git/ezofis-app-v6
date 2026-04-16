import Button from '@/components/base/button/Button'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import IconButton from '@/components/base/button/IconButton'
import { useState } from 'react'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import cn from '@/utils/cn'

const Header = () => {
  const {
    name,
    description,
    publishStatus,
    saveForm,
    setIsPreviewOpen,
    setPublishOpen,
    setSelectionType,
    setName,
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
    <header className='flex h-16 shrink-0 items-center justify-between border-b border-gray-3 bg-white px-4 font-inter relative z-10'>
      {/* Left: Navigation & Metadata */}
      <div className='flex items-center gap-4 min-w-0 flex-1'>
        <IconButton
          icon='lucide:chevron-left'
          variant='ghost'
          color='gray'
          size='sm'
          onClick={() => window.history.back()}
        />

        <div className='flex flex-col min-w-0'>
          <div className='flex items-center gap-2'>
            {/* Name Input Styled as H1 */}
            <div className="relative flex items-center min-w-0">
              <div className="inline-grid items-center min-w-0">
                <span className="invisible whitespace-pre px-1 py-0.5 text-15/5 font-semibold pointer-events-none row-start-1 col-start-1">
                  {name || "Untitled Form"}
                </span>
                <input
                  type="text"
                  className='row-start-1 col-start-1 w-full text-15/5 font-semibold text-gray-13 bg-transparent border-transparent hover:bg-gray-1 focus:bg-white focus:outline-none transition-all px-1 py-0.5 rounded-md placeholder:text-gray-5 cursor-text focus:shadow-sm focus:border-gray-2 border'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Untitled Form"
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (!name.trim()) setName('Untitled Form')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                />
              </div>
            </div>

            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shrink-0",
              publishStatus === 'PUBLISHED' ? "text-success-main bg-success-subtle" : "bg-gray-3 text-gray-11"
            )}>
              {publishStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
          </div>

          <span className='text-xs text-gray-10 truncate max-w-[400px] px-1'>
            {description || 'No description'}
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className='flex items-center gap-2'>
        <IconButton
          className='cursor-pointer'
          color='gray'
          icon='lucide:settings'
          size='sm'
          variant='ghost'
          onClick={() => {
            useAskAIStore.getState().close()
            const current = useFormStore.getState().isSidebarOpen
            useFormStore.getState().setSidebarOpen(!current)
            if (!current) setSelectionType('general')
          }}
        />

        <div className='mx-1 h-6 w-px bg-gray-3' />

        <Button
          className='cursor-pointer font-medium'
          color='primary'
          icon='lucide:sparkles'
          label="Ask AI"
          onClick={() => {
            useFormStore.getState().setSidebarOpen(false)
            const { isOpen, open, close } = useAskAIStore.getState()
            if (isOpen) close()
            else open()
          }}
          size='sm'
          variant='ghost'
        />

        <Button
          className='cursor-pointer font-medium'
          color='gray'
          icon='lucide:eye'
          label="Preview"
          onClick={() => setIsPreviewOpen(true)}
          size='sm'
          variant='ghost'
        />

        <Button
          className='cursor-pointer font-medium'
          color='gray'
          icon='lucide:check-circle'
          label="Save"
          loading={isSaving}
          onClick={handleQuickSave}
          size='sm'
          variant='outline'
        />

        <Button
          className='cursor-pointer font-medium'
          color='primary'
          icon='lucide:send'
          label="Publish"
          onClick={() => setPublishOpen(true)}
          size='sm'
          variant='solid'
        />
      </div>
    </header>
  )
}

export default Header
