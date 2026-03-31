import Button from '@/components/base/button/Button'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import IconButton from '@/components/base/button/IconButton'
import { useState } from 'react'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import cn from '@/utils/cn'
import Logo from '@/components/common/Logo'

const Header = () => {
  const {
    name,
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
    <header className='flex h-16 shrink-0 items-center justify-between border-b border-gray-3 bg-white px-6 md:px-8 font-inter relative z-10'>
      {/* Left: Branding & Name */}
      <div className='flex items-center gap-3 min-w-0 flex-1'>
        <IconButton
          icon='lucide:chevron-left'
          variant='ghost'
          color='gray'
          size='sm'
          className='text-gray-5 hover:text-gray-9'
          onClick={() => window.history.back()}
        />

        <div className="flex items-center justify-center shrink-0">
          <Logo hideText className="scale-75 origin-left" />
        </div>

        <div className="h-4 w-px bg-[var(--gray-3)] shrink-0 mx-1" />

        <div className='flex items-center gap-1 group px-1 py-0.5 min-w-0 max-w-[500px]'>
          <div className="relative flex items-center min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-1">
              {/* Name Input/Text */}
              <div className="inline-grid items-center min-w-0 shrink-0">
                <span className="invisible whitespace-pre px-1 py-1 text-15/5 font-semibold pointer-events-none row-start-1 col-start-1">
                  {name || "Untitled Form"}
                </span>
                <input
                  type="text"
                  className='row-start-1 col-start-1 w-full text-15/5 font-semibold text-gray-13 bg-transparent border-transparent hover:bg-gray-1 focus:bg-white focus:outline-none transition-all px-1 py-1 rounded-md placeholder:text-gray-5 cursor-text focus:shadow-sm focus:border-gray-2 border shrink-0'
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

              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shrink-0 transition-colors flex-none",
                publishStatus === 'PUBLISHED' ? "text-success-main bg-success-subtle" : "bg-gray-3 text-gray-11"
              )}>
                {publishStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className='flex items-center gap-2 pt-1 pb-1'>
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
          className='cursor-pointer ml-1 font-medium'
          color='primary'
          icon='lucide:send'
          label="Publish"
          onClick={() => setPublishOpen(true)}
          size='sm'
          variant='solid'
        />

        <div className='mx-1 h-6 w-px bg-[var(--gray-3)]' />

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
      </div>
    </header>
  )
}

export default Header
