import AskAI from '@/components/common/ask-ai/AskAI'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import Build from './components/build/Build'
import Header from './components/common/Header'
import LivePreview from './components/build/components/preview/LivePreview'

const FormBuilderPage = () => {
  const isOpen = useAskAIStore((state) => state.isOpen)

  return (
    <div className='flex h-dvh flex-col overflow-hidden'>
      <Header />
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex-1 overflow-auto'>
          <Build />
        </div>

        {isOpen && (
          <div className='w-[25%] min-w-[320px] border-l border-surface-secondary bg-surface-primary animate-in slide-in-from-right-4 duration-300'>
            <AskAI />
          </div>
        )}
      </div>

      <LivePreview />
    </div>
  )
}

FormBuilderPage.displayName = 'FormBuilderPage'
export default FormBuilderPage
