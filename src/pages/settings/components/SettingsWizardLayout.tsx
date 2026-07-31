import { useEffect, useMemo, useRef } from 'react'
import Stepper from '@/components/base/Stepper'
import Button from '@/components/base/button/Button'
import cn from '@/utils/cn'
import useSettingsTopbar from '../hooks/useSettingsTopbar'

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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        behavior: 'smooth',
        top: 0,
      })
    }
  }, [activeStep])

  const formattedSteps = useMemo(() => {
    return steps.map((s, idx) => ({
      ...s,
      clickable: s.clickable !== undefined ? s.clickable : idx <= activeStep,
      disabled: s.disabled !== undefined ? s.disabled : idx > activeStep,
    }))
  }, [steps, activeStep])

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col overflow-hidden',
        className,
      )}
    >
      {/* Top Header */}
      <div className='mb-4 border-b border-gray-3 px-6 py-4 md:px-8'>
        <div className='flex min-w-0 flex-col gap-1'>
          <h2 className='truncate text-18/6 font-semibold tracking-tight text-gray-13'>
            {headerTitle}
          </h2>
          {headerDescription ? (
            <p className='truncate text-13/5 text-gray-11'>
              {headerDescription}
            </p>
          ) : null}
        </div>
      </div>

      {/* Main Grid */}
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]'>
        {/* Sidebar Stepper */}
        <aside className='hidden h-full border-r border-gray-3 bg-gray-1/30 px-3.5 pt-3 pb-3 xl:block'>
          <Stepper
            active={activeStep}
            orientation='vertical'
            steps={formattedSteps}
            setActive={(stepIdx) => onStepChange(stepIdx as number)}
          />
        </aside>

        {/* Content Area */}
        <div
          className='col-span-1 h-full w-full overflow-y-auto'
          ref={scrollContainerRef}
        >
          <div className='mx-auto w-full max-w-3xl px-6 pb-12 md:px-8 lg:px-10'>
            <div className='flex min-h-full w-full flex-col gap-6 pt-3 pb-6 md:gap-7 md:pb-8'>
              <div className='flex flex-col gap-6 md:gap-7'>{children}</div>

              {/* Footer Navigation */}
              <div
                className={cn(
                  'mt-2 flex flex-wrap items-center gap-3 border-t border-gray-3 pt-6',
                  activeStep === 0 ? 'justify-end' : 'justify-between',
                )}
              >
                {activeStep > 0 ? (
                  <Button
                    color='gray'
                    disabled={isBackDisabled || isLoading || isSaving}
                    icon='lucide:arrow-left'
                    label='Back'
                    variant='outline'
                    onClick={onBack}
                  />
                ) : null}

                {isLastStep ? (
                  <Button
                    disabled={isNextDisabled || isSaving || isLoading}
                    label={isSaving ? 'Saving...' : saveLabel}
                    loading={isSaving}
                    suffixIcon='tabler:arrow-right'
                    onClick={onSave}
                  />
                ) : (
                  <Button
                    disabled={isNextDisabled || isLoading || isSaving}
                    label={nextLabel}
                    suffixIcon='tabler:arrow-right'
                    onClick={onNext}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
