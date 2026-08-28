import { useLingui } from '@lingui/react/macro'
import FormsPage from '@/pages/forms/FormsPage'
import SettingsPageHeader from './SettingsPageHeader'

type FormConfigurationProps = {
  onBack?: () => void
}

export default function FormConfiguration({ onBack }: FormConfigurationProps) {
  const { t } = useLingui()

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden bg-surface'>
      <SettingsPageHeader title={t`Form Configuration`} onBack={onBack} />
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <FormsPage />
      </div>
    </div>
  )
}
