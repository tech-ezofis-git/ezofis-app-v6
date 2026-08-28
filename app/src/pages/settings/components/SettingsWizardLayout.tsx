import type { I18n, MessageDescriptor } from '@lingui/core'
import { useEffect, useMemo, useRef } from 'react'
import { useLingui } from '@lingui/react/macro'
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

type Translatable = string | MessageDescriptor

const resolveText = (
  value: Translatable | undefined,
  i18n: I18n,
): string | undefined => {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  return i18n._(value)
}

export type SettingsWizardLayoutProps = {
  activeStep: number
  steps: SettingsWizardStep[]
  onStepChange: (step: number) => void
  onBack?: () => void
  onNext?: () => void
  onSave?: () => void
  onCancel?: () => void
  onBackToSettings?: () => void
  isNextDisabled?: boolean
  isBackDisabled?: boolean
  isLoading?: boolean
  isSaving?: boolean
  nextLabel?: string
  saveLabel?: string
  moduleTitle?: Translatable
  setupTitle?: Translatable
  headerTitle: Translatable
  headerDescription?: Translatable
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export default function SettingsWizardLayout({
  activeStep,
  steps,
  onStepChange,
  onBack,
  onNext,
  onSave,
  onCancel,
  onBackToSettings,
  isNextDisabled = false,
  isBackDisabled = false,
  isLoading = false,
  isSaving = false,
  nextLabel,
  saveLabel,
  moduleTitle,
  setupTitle,
  headerTitle,
  headerDescription,
  children,
  className,
  contentClassName,
}: SettingsWizardLayoutProps) {
  const { i18n, t } = useLingui()
  const resolvedNextLabel = nextLabel ?? t`Continue`
  const resolvedSaveLabel = saveLabel ?? t`Save`
  const resolvedHeaderTitle = resolveText(headerTitle, i18n)
  const resolvedHeaderDescription = resolveText(headerDescription, i18n)
  const resolvedModuleTitle = resolveText(moduleTitle, i18n)
  const resolvedSetupTitle = resolveText(setupTitle, i18n)
  const isLastStep = activeStep === steps.length - 1
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const breadcrumbConfig = useMemo(() => {
    if (!resolvedModuleTitle) return { items: [] }

    const items = [
      { key: 'settings', label: t`Settings` },
      resolvedSetupTitle
        ? { key: 'module', label: resolvedModuleTitle }
        : { label: resolvedModuleTitle },
    ]
    if (resolvedSetupTitle) {
      items.push({ label: resolvedSetupTitle })
    }

    return {
      items,
      onNavigate: (key: string) => {
        if (key === 'settings') {
          if (onBackToSettings) {
            onBackToSettings()
          } else {
            onCancel?.()
          }
        } else if (key === 'module') {
          onCancel?.()
        }
      },
    }
  }, [
    resolvedModuleTitle,
    resolvedSetupTitle,
    onCancel,
    onBackToSettings,
    t,
  ])

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
  }, [steps, activeStep, i18n.locale])

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col overflow-hidden',
        className,
      )}
    >
      {/* Top Header */}
      <div
        className='mb-4 border-b border-gray-3 px-6 py-4 md:px-8'
        key={i18n.locale}
      >
        <div className='flex min-w-0 flex-col gap-1'>
          <h2 className='truncate text-18/6 font-semibold tracking-tight text-gray-13'>
            {resolvedHeaderTitle}
          </h2>
          {resolvedHeaderDescription ? (
            <p className='truncate text-13/5 text-gray-11'>
              {resolvedHeaderDescription}
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
          <div
            className={cn(
              'mx-auto w-full max-w-3xl px-6 pb-12 md:px-8 lg:px-10',
              contentClassName,
            )}
          >
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
                    label={t`Back`}
                    variant='outline'
                    onClick={onBack}
                  />
                ) : null}

                {isLastStep ? (
                  <Button
                    disabled={isNextDisabled || isSaving || isLoading}
                    label={isSaving ? t`Saving...` : resolvedSaveLabel}
                    loading={isSaving}
                    suffixIcon='tabler:arrow-right'
                    onClick={onSave}
                  />
                ) : (
                  <Button
                    disabled={isNextDisabled || isLoading || isSaving}
                    label={resolvedNextLabel}
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
