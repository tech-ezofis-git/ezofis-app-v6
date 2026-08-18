import { useEffect } from 'react'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import FormAIPanel from '../common/FormAIPanel'
import Form from './components/form/Form'
import PublishSidebar from './components/form/PublishSidebar'
import LeftSidebar from './components/left-sidebar/LeftSidebar'
import FieldSettings from './components/settings/FieldSettings'

const Build = () => {
  const isPublishOpen = useFormStore((state) => state.isPublishOpen)
  const isSidebarOpen = useFormStore((state) => state.isSidebarOpen)
  const panels = useFormStore((state) => state.panels)
  const addPanel = useFormStore((state) => state.addPanel)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)

  useEffect(() => {
    useFormStore.getState().setSidebarOpen(false)
    if (panels.length === 0) {
      addPanel()
    }
  }, [panels.length, addPanel])

  return (
    <div className='flex h-full w-full overflow-hidden bg-white'>
      <LeftSidebar />
      <div className='flex-1 overflow-auto bg-gray-1/70 px-4 pt-14 pb-12 shadow-inner'>
        <div className='animate-in fade-in slide-in-from-left-4 mx-auto w-full max-w-[1200px] duration-500'>
          <Form />
        </div>
      </div>

      {(isSidebarOpen || isPublishOpen || isAskAIOpen) && (
        <div className='animate-in slide-in-from-right relative z-20 h-full w-[400px] shrink-0 border-l border-gray-2 bg-white shadow-xl duration-300'>
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
              key='ask-ai'
            >
              <FormAIPanel />
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
