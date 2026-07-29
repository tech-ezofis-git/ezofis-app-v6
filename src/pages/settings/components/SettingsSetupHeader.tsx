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
    <header className='border-b border-[var(--border-default)] bg-surface px-4 py-3'>
      <div className='flex items-start justify-between gap-5'>
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

          <div className='min-w-0'>
            <p className='text-15/6 font-semibold text-gray-13'>{stepTitle}</p>
            <p className='mt-1 text-13/5 text-gray-11'>{stepDescription}</p>
          </div>
        </div>

        {showProgress ? <SetupProgressBar progress={progress} /> : null}
      </div>
    </header>
  )
}
