import Form from './components/form/Form'
import LivePreview from './components/preview/LivePreview'
import { useFormStore } from '../../store/formStore'
import cn from '@/utils/cn'

const Build = () => {
  const {
    hidePreview
  } = useFormStore()

  return (
    <div className='bg-surface-muted min-h-[calc(100dvh-56px)]'>
      <div className={cn(
        'grid grid-cols-1 gap-8 max-w-[1400px] mx-auto px-6 py-8 transition-all duration-500',
        !hidePreview ? 'lg:grid-cols-[1fr_420px]' : 'lg:grid-cols-1 max-w-[900px]'
      )}>
        <div className='animate-in fade-in slide-in-from-left-4 duration-500'>
          <Form />
        </div>

        {!hidePreview && (
          <div className='sticky top-24 h-fit animate-in fade-in slide-in-from-right-4 duration-500'>
            <LivePreview />
          </div>
        )}
      </div>
    </div>
  )
}

Build.displayName = 'Build'
export default Build
