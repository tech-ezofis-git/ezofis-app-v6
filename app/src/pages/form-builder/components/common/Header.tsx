import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

const Header = () => {
  const {
    description,
    name,
    publishStatus,
    saveForm,
    setIsPreviewOpen,
    setName,
    setPublishOpen,
    setSelectionType,
  } = useFormStore()

  const { formId } = useParams({ strict: false }) as { formId?: string }
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)

  const handleQuickSave = async () => {
    setIsSaving(true)
    try {
      const { createdFormId } = await saveForm(publishStatus, formId)
      if (createdFormId) {
        navigate({
          params: { formId: createdFormId },
          to: '/form-builder/$formId',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <header className='relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-3 bg-gradient-to-r from-gray-1 via-white to-gray-2 px-4 font-inter shadow-xs'>
      {/* Left: Navigation & Metadata */}
      <div className='flex min-w-0 items-center gap-3'>
        <IconButton
          color='gray'
          icon='lucide:arrow-left'
          size='sm'
          variant='ghost'
          onClick={() => globalThis.history.back()}
        />

        <div className='flex min-w-0 flex-col justify-center'>
          <div className='flex items-center gap-2'>
            {/* Name Input Styled as H1 */}
            <div className='inline-grid w-max max-w-full shrink-0 items-center'>
              <span className='pointer-events-none invisible col-start-1 row-start-1 px-1 py-0.5 text-15/5 font-semibold whitespace-pre'>
                {name || 'Untitled Form'}
              </span>
              <input
                className='col-start-1 row-start-1 w-full min-w-0 cursor-text rounded-md border border-transparent bg-transparent px-1 py-0.5 text-15/5 font-semibold text-gray-13 transition-all placeholder:text-gray-5 hover:bg-gray-1 focus:border-gray-2 focus:bg-surface focus:shadow-sm focus:outline-none'
                placeholder='Untitled Form'
                style={{ fieldSizing: 'content' } as any}
                type='text'
                value={name}
                onBlur={() => {
                  if (!name.trim()) setName('Untitled Form')
                }}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
              />
            </div>

            <span
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-2xs',
                publishStatus === 'PUBLISHED'
                  ? 'border-green-4 bg-green-3 text-green-11'
                  : 'border-gray-4 bg-gray-2 text-gray-11',
              )}
            >
              {publishStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
          </div>

          {description && (
            <span className='max-w-[400px] truncate px-1 text-xs text-gray-10'>
              {description}
            </span>
          )}
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
          className='flex cursor-pointer items-center gap-1.5 border border-purple-4/60 bg-purple-3/80 font-medium text-purple-11 shadow-2xs transition-all hover:border-purple-5 hover:bg-purple-4'
          color='primary'
          size='sm'
          variant='subtle'
          onClick={() => {
            useFormStore.getState().setSidebarOpen(false)
            const { close, isOpen, open } = useAskAIStore.getState()
            if (isOpen) close()
            else open()
          }}
        >
          <AiBrandIcon className='size-4' variant='outline-purple' />
          <span className='font-semibold'>Ask AI</span>
        </Button>

        <Button
          className='cursor-pointer font-medium'
          color='gray'
          icon='lucide:eye'
          label='Preview'
          size='sm'
          variant='ghost'
          onClick={() => setIsPreviewOpen(true)}
        />

        <Button
          className='cursor-pointer font-medium'
          color='gray'
          icon='lucide:check-circle'
          label='Save'
          loading={isSaving}
          size='sm'
          variant='outline'
          onClick={handleQuickSave}
        />
      </div>
    </header>
  )
}

export default Header
