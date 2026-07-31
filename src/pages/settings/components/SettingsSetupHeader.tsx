import { useMemo } from 'react'
import IconButton from '@/components/base/button/IconButton'
import { createSettingsSetupBreadcrumbs } from '../helpers/settingsBreadcrumbs'
import useSettingsTopbar from '../hooks/useSettingsTopbar'
import SetupProgressBar from './SetupProgressBar'

type SettingsSetupHeaderProps = {
  moduleTitle: string
  progress?: number
  showBackButton?: boolean
  showProgress?: boolean
  setupTitle: string
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
  const breadcrumbConfig = useMemo(
    () =>
      createSettingsSetupBreadcrumbs(moduleTitle, setupTitle, {
        onBackToSettings,
        onCancelSetup,
      }),
    [moduleTitle, onBackToSettings, onCancelSetup, setupTitle],
  )

  useSettingsTopbar(breadcrumbConfig)

  return (
    <header className='mb-4 flex items-center justify-between border-b border-gray-3 px-6 py-4 md:px-8'>
      <div className='flex min-w-0 items-start gap-3'>
        {showBackButton ? (
          <IconButton
            ariaLabel='Back'
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
