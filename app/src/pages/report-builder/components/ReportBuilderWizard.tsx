import { useLingui } from '@lingui/react/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { SettingsWizardStep } from '@/pages/settings/components/SettingsWizardLayout'
import showToast from '@/components/base/toast/showToast'
import SettingsWizardLayout from '@/pages/settings/components/SettingsWizardLayout'
import { isDemoAppOrigin } from '@/utils/origin'
import type { Report, ReportStatus } from '../types'
import {
  usePublishReportBuilderReportMutation,
  useSaveReportBuilderReportMutation,
} from '../hooks/useReportBuilderApi'
import useReportBuilderDraftStore from '../stores/useReportBuilderDraftStore'
import { AnimateFadeIn } from '@/components/common/animations'
import AskAiStep from './steps/AskAiStep'
import DetailsStep from './steps/DetailsStep'
import FieldsStep from './steps/FieldsStep'
import FiltersStep from './steps/FiltersStep'
import ScheduleStep from './steps/ScheduleStep'

// Creating a new report (default) starts with the optional Ask AI step;
// clicking "Build manually", or editing an existing report (Ask AI never
// makes sense there), drops it entirely rather than just skipping past it.
const AI_STEP_IDS = [
  'ask-ai',
  'details',
  'fields',
  'filters',
  'schedule',
] as const
const MANUAL_STEP_IDS = ['details', 'fields', 'filters', 'schedule'] as const

interface Props {
  onBack: () => void
}

type StepId = (typeof AI_STEP_IDS)[number]

const ReportBuilderWizard = ({ onBack }: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const search = useSearch({ from: '/_app/settings' }) as { step?: string }

  const draft = useReportBuilderDraftStore((state) => state.draft)
  const resetDraft = useReportBuilderDraftStore((state) => state.resetDraft)
  const saveReportMutation = useSaveReportBuilderReportMutation()
  const publishReportMutation = usePublishReportBuilderReportMutation()

  const isEditing = Boolean(draft.editingReportId)
  const [isManualMode, setIsManualMode] = useState(isEditing)
  const stepIds: readonly StepId[] = isManualMode
    ? MANUAL_STEP_IDS
    : AI_STEP_IDS

  const initialIndex = Math.max(
    0,
    stepIds.indexOf((search.step as StepId) || 'ask-ai'),
  )
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [isSaving, setIsSaving] = useState(false)

  const stepDefinitions: Record<
    StepId,
    { description: string; label: string }
  > = useMemo(
    () => ({
      'ask-ai': {
        description: t`Optional AI head start`,
        label: t`Build with AI`,
      },
      'details': { description: t`Name, domain & sharing`, label: t`Details` },
      'fields': { description: t`Choose columns`, label: t`Fields` },
      'filters': { description: t`Narrow down rows`, label: t`Filters` },
      'schedule': { description: t`Automated delivery`, label: t`Schedule` },
    }),
    [t],
  )

  const steps: SettingsWizardStep[] = useMemo(() => {
    const allowAnyStep = isDemoAppOrigin()
    return stepIds.map((stepId, index) => ({
      clickable: allowAnyStep ? true : undefined,
      description: stepDefinitions[stepId].description,
      disabled: allowAnyStep ? false : undefined,
      id: index,
      label: stepDefinitions[stepId].label,
    }))
  }, [stepIds, stepDefinitions])

  const goToStep = (index: number) => {
    setActiveIndex(index)
    void navigate({
      to: '/settings',
      search: (prev: { step?: string }) => ({ ...prev, step: stepIds[index] }),
    })
  }

  const switchToManualMode = () => {
    setIsManualMode(true)
    goToStep(0)
  }

  const isNextDisabled = useMemo(() => {
    if (isDemoAppOrigin()) return false
    if (stepIds[activeIndex] === 'details') {
      return (
        !draft.name.trim() ||
        !draft.sourceType ||
        (!draft.sourceId && !draft.domain.trim())
      )
    }
    if (stepIds[activeIndex] === 'fields') {
      return draft.fields.length === 0
    }
    return false
  }, [
    activeIndex,
    draft.domain,
    draft.fields.length,
    draft.name,
    draft.sourceId,
    draft.sourceType,
    stepIds,
  ])

  const buildReportFromDraft = (status: ReportStatus): Report => {
    const now = new Date().toISOString()
    return {
      createdAt: now,
      customFields: draft.customFields,
      description: draft.description,
      domain: draft.domain,
      fields: draft.fields,
      fieldSettings: draft.fieldSettings,
      filters: draft.filters,
      id: draft.editingReportId || '',
      modified: now,
      name: draft.name || t`Untitled Report`,
      owner: 'You',
      runs: 0,
      schedule: draft.schedule,
      scheduled: draft.scheduled,
      sharedGroups:
        draft.visibility === 'Selected Groups' ? draft.sharedGroups : [],
      sharedUsers:
        draft.visibility === 'Selected Users' ? draft.sharedUsers : [],
      ...(draft.sourceType === 'Workflow' && draft.sourceFormId
        ? { sourceFormId: draft.sourceFormId }
        : {}),
      sourceId: draft.sourceId,
      sourceType: draft.sourceType,
      status,
      visibility: draft.visibility,
    }
  }

  const persistAndExit = async (status: ReportStatus) => {
    setIsSaving(true)
    const report = buildReportFromDraft(status)

    try {
      const saved = await saveReportMutation.mutateAsync(report)
      if (status === 'Published') {
        await publishReportMutation.mutateAsync(saved.id)
      }
      resetDraft()
      showToast({
        message:
          status === 'Published'
            ? t`Report published`
            : t`Report saved as draft`,
        variant: 'success',
      })
      void navigate({ to: '/reports' })
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : t`Failed to save report`,
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    resetDraft()
    onBack()
  }

  const renderStep = () => {
    let content: React.ReactNode = null
    switch (stepIds[activeIndex]) {
      case 'ask-ai':
        content = <AskAiStep />
        break
      case 'details':
        content = <DetailsStep />
        break
      case 'fields':
        content = <FieldsStep />
        break
      case 'filters':
        content = <FiltersStep />
        break
      case 'schedule':
        content = <ScheduleStep />
        break
      default:
        content = null
    }

    return (
      <AnimateFadeIn key={stepIds[activeIndex]} className='flex flex-col gap-6 md:gap-7'>
        {content}
      </AnimateFadeIn>
    )
  }

  return (
    <SettingsWizardLayout
      activeStep={activeIndex}
      headerDescription={t`Build a custom report from any of your organization's data domains.`}
      headerTitle={draft.editingReportId ? t`Edit Report` : t`Report Builder`}
      isNextDisabled={isNextDisabled}
      isSaving={isSaving}
      moduleTitle={t`Reports`}
      saveLabel={t`Save as Draft`}
      steps={steps}
      headerAction={
        stepIds[activeIndex] === 'ask-ai' ? (
          <button
            className='text-13 font-medium text-primary-10 underline-offset-2 hover:underline'
            type='button'
            onClick={switchToManualMode}
          >
            {t`Build manually`}
          </button>
        ) : null
      }
      setupTitle={t`Report Builder`}
      onBack={() => goToStep(Math.max(0, activeIndex - 1))}
      onBackToSettings={handleCancel}
      onCancel={handleCancel}
      onNext={() => goToStep(Math.min(steps.length - 1, activeIndex + 1))}
      onSave={() => void persistAndExit('Draft')}
      onStepChange={goToStep}
    >
      {renderStep()}
      {activeIndex === steps.length - 1 && (
        <div className='flex justify-end border-t border-gray-3 pt-4'>
          <button
            className='text-13 font-medium text-primary-10 underline-offset-2 hover:underline'
            type='button'
            onClick={() => void persistAndExit('Published')}
          >
            {t`Save & Publish instead`}
          </button>
        </div>
      )}
    </SettingsWizardLayout>
  )
}

ReportBuilderWizard.displayName = 'ReportBuilderWizard'
export default ReportBuilderWizard
