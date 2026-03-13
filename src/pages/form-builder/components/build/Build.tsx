import { useFormStore } from '@/pages/form-builder/store/formStore'
import Form from './components/form/Form'
import PublishSidebar from './components/form/PublishSidebar'
import FieldSettings from './components/settings/FieldSettings'
import AskAI from '@/components/common/ask-ai/AskAI'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'

const Build = () => {
  const isPublishOpen = useFormStore((state) => state.isPublishOpen)
  const isSidebarOpen = useFormStore((state) => state.isSidebarOpen)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)

  return (
    <div className='flex h-full w-full overflow-hidden bg-surface-muted'>
      <div className='flex-1 overflow-auto px-4 py-6'>
        <div className='animate-in fade-in slide-in-from-left-4 mx-auto max-w-[1600px] duration-500'>
          <Form />
        </div>
      </div>

      {(isSidebarOpen || isPublishOpen || isAskAIOpen) && (
        <div className='animate-in slide-in-from-right h-full w-[400px] shrink-0 border-l border-gray-3 bg-white duration-300 shadow-xl'>
          {isPublishOpen ? (
            <div
              className='animate-in fade-in slide-in-from-right-4 h-full duration-500'
              key='publish'
            >
              <PublishSidebar />
            </div>
          ) : isAskAIOpen ? (
            <div
              className='animate-in fade-in slide-in-from-right-4 h-full duration-500'
              key='ai'
            >
              <AskAI />
            </div>
          ) : (
            <div
              className='animate-in fade-in slide-in-from-right-4 h-full duration-500'
              key='settings'
            >
              <FieldSettings />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

Build.displayName = 'Build'
export default Build
