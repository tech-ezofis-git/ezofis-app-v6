import { useLingui } from '@lingui/react/macro'
import WorkflowsPage from '@/pages/workflows/WorkflowsPage'
import SettingsPageHeader from './SettingsPageHeader'

type WorkflowConfigurationProps = {
  onBack?: () => void
}

export default function WorkflowConfiguration({
  onBack,
}: WorkflowConfigurationProps) {
  const { t } = useLingui()

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden bg-surface'>
      <SettingsPageHeader title={t`Workflow Configuration`} onBack={onBack} />
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <WorkflowsPage />
      </div>
    </div>
  )
}
