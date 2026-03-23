import { useFormStore } from '@/pages/form-builder/store/formStore'
import Form from './components/form/Form'
import PublishSidebar from './components/form/PublishSidebar'
import FieldSettings from './components/settings/FieldSettings'
import AskAI from '@/components/common/ask-ai/AskAI'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'

import LeftSidebar from './components/left-sidebar/LeftSidebar'

const Build = () => {
  const isPublishOpen = useFormStore((state) => state.isPublishOpen)
  const isSidebarOpen = useFormStore((state) => state.isSidebarOpen)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)

  return (
    <div className='flex h-full w-full overflow-hidden bg-white'>
      <LeftSidebar />
      <div className='flex-1 overflow-auto bg-gray-50/50 shadow-inner px-8 py-10'>
        <div className='animate-in fade-in slide-in-from-left-4 mx-auto max-w-[800px] duration-500'>
          <Form />
        </div>
      </div>

      {(isSidebarOpen || isPublishOpen || isAskAIOpen) && (
        <div className='animate-in slide-in-from-right h-full w-[400px] shrink-0 border-l border-gray-2 bg-white duration-300 shadow-xl relative z-20'>
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
