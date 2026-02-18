import { useState } from 'react'
import AskAI from '@/components/common/ask-ai/AskAI'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import Build from './components/build/Build'
import Header from './components/common/Header'
import Publish from './components/publish/Publish'
import Settings from './components/settings/Settings'
import LivePreview from './components/build/components/preview/LivePreview'

const FormBuilderPage = () => {
  const [tab, setTab] = useState<string | null>('Build')
  const isOpen = useAskAIStore((state) => state.isOpen)

  return (
    <div className='flex h-dvh flex-col overflow-hidden'>
      <Header setTab={setTab} />
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex-1 overflow-auto'>
          {tab === 'Build' && <Build />}
          {tab === 'Publish' && <Publish />}
          {tab === 'Settings' && <Settings setTab={setTab} />}
          {/* Design tab is currently empty in original but added in Header */}
          {tab === 'Design' && <div className='flex h-full items-center justify-center text-gray-9'>Design mode coming soon...</div>}
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
