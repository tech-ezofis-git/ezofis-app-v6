import { useState } from 'react'
import AskAI from '@/components/common/ask-ai/AskAI'
import Build from './components/build/Build'
import Header from './components/common/Header'
import Publish from './components/publish/Publish'
import Settings from './components/settings/Settings'

const FormBuilderPage = () => {
  const [tab, setTab] = useState<string | null>('Build')

  return (
    <div>
      <Header tab={tab} setTab={setTab} />
      {tab === 'Build' && <Build />}
      {tab === 'Publish' && <Publish />}
      {tab === 'Settings' && <Settings />}
      <AskAI />
    </div>
  )
}

FormBuilderPage.displayName = 'FormBuilderPage'
export default FormBuilderPage
