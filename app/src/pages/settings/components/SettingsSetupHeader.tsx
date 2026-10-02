import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import IconButton from '@/components/base/button/IconButton'
import { createSettingsSetupBreadcrumbs } from '../helpers/settingsBreadcrumbs'
import useSettingsTopbar from '../hooks/useSettingsTopbar'
import SetupProgressBar from './SetupProgressBar'

type SettingsSetupHeaderProps = {
  moduleTitle: string
  progress?: number
  setupTitle: string
  showBackButton?: boolean
  showProgress?: boolean
  stepDescription: string
  stepTitle: string
  onBackToSettings?: () => void
  onCancelSetup: () => void
}

export default function SettingsSetupHeader({
  moduleTitle,
  progress = 0,
  showBackButton = true,
  showProgress = true,
  stepDescription,
  stepTitle,
  setupTitle,
  onBackToSettings,
  onCancelSetup,
}: SettingsSetupHeaderProps) {
  const { i18n, t } = useLingui()
  const breadcrumbConfig = useMemo(
    () =>
      createSettingsSetupBreadcrumbs(
        moduleTitle,
        setupTitle,
        {
          onBackToSettings,
          onCancelSetup,
        },
        t`Settings`,
      ),
    [i18n.locale, moduleTitle, onBackToSettings, onCancelSetup, setupTitle, t],
  )

  useSettingsTopbar(breadcrumbConfig)

  return (
    <header className='mb-4 flex items-center justify-between border-b border-gray-3 px-4 py-4'>
      <div className='flex min-w-0 items-start gap-3'>
        {showBackButton ? (
          <IconButton
            ariaLabel={t`Back`}
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onCancelSetup}
          />
        ) : null}

        <div className='flex min-w-0 flex-col gap-1'>
          <h2 className='truncate text-18/6 font-semibold tracking-tight text-gray-13'>
            {stepTitle}
          </h2>
          <p className='truncate text-13/5 text-gray-11'>{stepDescription}</p>
        </div>
      </div>

      {showProgress ? <SetupProgressBar progress={progress} /> : null}
    </header>
  )
}
