import Form from './components/form/Form'
import FieldSettings from './components/settings/FieldSettings'
import PublishSidebar from './components/form/PublishSidebar'
import { useFormStore } from '@/pages/form-builder/store/formStore'

const Build = () => {
  const isPublishOpen = useFormStore((state) => state.isPublishOpen)
  const isSidebarOpen = useFormStore((state) => state.isSidebarOpen)

  return (
    <div className='bg-surface-muted h-full w-full overflow-hidden flex'>
      <div className='flex-1 overflow-auto px-8 py-10'>
        <div className='max-w-[1000px] mx-auto animate-in fade-in slide-in-from-left-4 duration-500'>
          <Form />
        </div>
      </div>

      {(isSidebarOpen || isPublishOpen) && (
        <div className='shrink-0 h-full border-l border-gray-3 bg-white animate-in slide-in-from-right duration-300'>
          {isPublishOpen ? (
            <div key="publish" className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
              <PublishSidebar />
            </div>
          ) : (
            <div key="settings" className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
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
