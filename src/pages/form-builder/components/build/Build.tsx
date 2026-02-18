import Form from './components/form/Form'
import LivePreview from './components/preview/LivePreview'
import FieldSettings from './components/settings/FieldSettings'
import { useFormStore } from '../../store/formStore'
import cn from '@/utils/cn'

const Build = () => {
  const {
    hidePreview,
    activeQuestionId
  } = useFormStore()

  // Logic: If a question is selected, show settings. If not (or separate toggle), show preview?
  // Current plan: Replace duplicate columns logic with a fixed sidebar for settings.
  // The user requirement said: "while the preview it needs to be run as a separate page... on the type form it needs to ask the one question at a time"
  // This implies the inline preview might be removed or moved.
  // I will replace the right column with `FieldSettings`.

  return (
    <div className='bg-surface-muted min-h-[calc(100dvh-60px)]'>
      <div className={cn(
        'grid grid-cols-1 gap-12 max-w-[1440px] mx-auto px-8 py-10 transition-all duration-500',
        'lg:grid-cols-[1fr_340px]' // Optimized sidebar width per reference
      )}>
        <div className='animate-in fade-in slide-in-from-left-4 duration-500'>
          <Form />
        </div>

        <div className='sticky top-[84px] h-[calc(100vh-130px)] animate-in fade-in slide-in-from-right-4 duration-500'>
          <FieldSettings />
        </div>
      </div>
    </div>
  )
}

Build.displayName = 'Build'
export default Build
