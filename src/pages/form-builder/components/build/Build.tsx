import Form from './components/form/Form'
import FieldSettings from './components/settings/FieldSettings'
import PublishSidebar from './components/form/PublishSidebar'
import cn from '@/utils/cn'
import { useFormStore } from '@/pages/form-builder/store/formStore'

const Build = () => {
  const isPublishOpen = useFormStore((state) => state.isPublishOpen)

  return (
    <div className='bg-surface-muted min-h-[calc(100dvh-60px)]'>
      <div className={cn(
        'grid grid-cols-1 gap-12 max-w-[1440px] mx-auto px-8 py-10 transition-all duration-500',
        'lg:grid-cols-[1fr_340px]'
      )}>
        <div className='animate-in fade-in slide-in-from-left-4 duration-500'>
          <Form />
        </div>

        <div className='sticky top-[84px] h-[calc(100vh-130px)]'>
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
      </div>
    </div>
  )
}

Build.displayName = 'Build'
export default Build
