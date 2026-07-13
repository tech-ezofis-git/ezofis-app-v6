import { useMemo } from 'react'
import IconButton from '@/components/base/button/IconButton'
import { createSettingsSetupBreadcrumbs } from '../helpers/settingsBreadcrumbs'
import useSettingsTopbar from '../hooks/useSettingsTopbar'
import SetupProgressBar from './SetupProgressBar'

type SettingsSetupHeaderProps = {
  moduleTitle: string
  progress: number
  setupTitle: string
  stepDescription: string
  stepTitle: string
  onBackToSettings?: () => void
  onCancelSetup: () => void
}

export default function SettingsSetupHeader({
  moduleTitle,
  onBackToSettings,
  onCancelSetup,
  progress,
  setupTitle,
  stepDescription,
  stepTitle,
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
    <header className='border-b border-[var(--border-default)] bg-surface px-6 py-4 md:px-8'>
      <div className='flex items-start justify-between gap-5'>
        <div className='flex min-w-0 items-start gap-3'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onCancelSetup}
          />

          <div className='min-w-0'>
            <p className='text-15/6 font-semibold text-gray-13'>{stepTitle}</p>
            <p className='mt-1 text-13/5 text-gray-11'>{stepDescription}</p>
          </div>
        </div>

        <SetupProgressBar progress={progress} />
      </div>
    </header>
  )
}
