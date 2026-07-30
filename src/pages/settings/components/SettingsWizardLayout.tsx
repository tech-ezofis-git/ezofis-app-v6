import { useMemo } from 'react'
import Stepper from '@/components/base/Stepper'
import Button from '@/components/base/button/Button'
import useSettingsTopbar from '../hooks/useSettingsTopbar'
import cn from '@/utils/cn'

export type SettingsWizardStep = {
  id: number
  label: string
  description?: string
  icon?: string
  clickable?: boolean
  disabled?: boolean
}

export type SettingsWizardLayoutProps = {
  activeStep: number
  steps: SettingsWizardStep[]
  onStepChange: (step: number) => void
  onBack?: () => void
  onNext?: () => void
  onSave?: () => void
  onCancel?: () => void
  isNextDisabled?: boolean
  isBackDisabled?: boolean
  isLoading?: boolean
  isSaving?: boolean
  nextLabel?: string
  saveLabel?: string
  moduleTitle?: string
  setupTitle?: string
  headerTitle: string
  headerDescription?: string
  children: React.ReactNode
  className?: string
}

export default function SettingsWizardLayout({
  activeStep,
  steps,
  onStepChange,
  onBack,
  onNext,
  onSave,
  onCancel,
  isNextDisabled = false,
  isBackDisabled = false,
  isLoading = false,
  isSaving = false,
  nextLabel = 'Continue',
  saveLabel = 'Save',
  moduleTitle,
  setupTitle,
  headerTitle,
  headerDescription,
  children,
  className,
}: SettingsWizardLayoutProps) {
  const isLastStep = activeStep === steps.length - 1

  const breadcrumbConfig = useMemo(() => {
    if (!moduleTitle || !setupTitle) return { items: [] }
    return {
      items: [
        { key: 'settings', label: 'Settings' },
        { key: 'module', label: moduleTitle },
        { label: setupTitle },
      ],
      onNavigate: (key: string) => {
        if (key === 'settings' || key === 'module') {
          onCancel?.() || onBack?.()
        }
      },
    }
  }, [moduleTitle, setupTitle, onCancel, onBack])

  useSettingsTopbar(breadcrumbConfig)

  const formattedSteps = useMemo(() => {
    return steps.map((s, idx) => ({
      ...s,
      clickable: s.clickable !== undefined ? s.clickable : idx <= activeStep,
      disabled: s.disabled !== undefined ? s.disabled : idx > activeStep,
    }))
  }, [steps, activeStep])

  return (
    <div className={cn('flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-1', className)}>
      {/* Top Header */}
      <div className='mb-2 flex items-center justify-between border-b border-[var(--border-default)] px-6 py-3 md:px-8'>
        <div className='flex flex-col gap-0.5 min-w-0'>
          <h2 className='text-15 font-semibold tracking-tight text-gray-13 truncate'>
            {headerTitle}
          </h2>
          {headerDescription ? (
            <p className='text-xs text-gray-11 truncate'>{headerDescription}</p>
          ) : null}
        </div>
      </div>

      {/* Main Grid */}
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]'>
        {/* Sidebar Stepper */}
        <aside className='hidden h-full border-r border-[var(--border-default)] bg-gray-1/30 pt-4 pr-3 pb-4 pl-4 xl:block'>
          <Stepper
            active={activeStep}
            orientation='vertical'
            steps={formattedSteps}
            setActive={(stepIdx) => onStepChange(stepIdx as number)}
          />
        </aside>

        {/* Content Area */}
        <div className='col-span-1 h-full w-full overflow-y-auto'>
          <div className='mx-auto w-full max-w-3xl px-6 py-5 pb-10 md:px-8 lg:px-10'>
            {children}

            {/* Footer Navigation */}
            <div className='mt-6 flex items-center justify-between border-t border-[var(--border-default)] pt-4'>
              <Button
                color='gray'
                disabled={isBackDisabled || activeStep === 0 || isLoading || isSaving}
                icon='lucide:arrow-left'
                label='Back'
                size='sm'
                variant='outline'
                onClick={onBack}
              />

              {isLastStep ? (
                <Button
                  disabled={isNextDisabled || isSaving || isLoading}
                  label={isSaving ? 'Saving...' : saveLabel}
                  loading={isSaving}
                  size='sm'
                  suffixIcon='tabler:arrow-right'
                  onClick={onSave}
                />
              ) : (
                <Button
                  disabled={isNextDisabled || isLoading || isSaving}
                  label={nextLabel}
                  size='sm'
                  suffixIcon='tabler:arrow-right'
                  onClick={onNext}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
