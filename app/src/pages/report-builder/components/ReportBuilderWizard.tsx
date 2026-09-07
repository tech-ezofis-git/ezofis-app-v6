import { useLingui } from '@lingui/react/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { SettingsWizardStep } from '@/pages/settings/components/SettingsWizardLayout'
import showToast from '@/components/base/toast/showToast'
import SettingsWizardLayout from '@/pages/settings/components/SettingsWizardLayout'
import type { Report, ReportStatus } from '../types'
import useReportBuilderDraftStore from '../stores/useReportBuilderDraftStore'
import useReportsStore, { createReportId } from '../stores/useReportsStore'
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
  const addReport = useReportsStore((state) => state.addReport)
  const updateReport = useReportsStore((state) => state.updateReport)

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

  const steps: SettingsWizardStep[] = useMemo(
    () =>
      stepIds.map((stepId, index) => ({
        description: stepDefinitions[stepId].description,
        id: index,
        label: stepDefinitions[stepId].label,
      })),
    [stepIds, stepDefinitions],
  )

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
    if (stepIds[activeIndex] === 'details') {
      return !draft.name.trim() || !draft.domain.trim()
    }
    if (stepIds[activeIndex] === 'fields') {
      return draft.fields.length === 0
    }
    return false
  }, [activeIndex, draft.domain, draft.fields.length, draft.name, stepIds])

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
      id: draft.editingReportId || createReportId(),
      modified: now,
      name: draft.name || t`Untitled Report`,
      owner: 'You',
      runs: 0,
      schedule: draft.schedule,
      scheduled: draft.scheduled,
      sharedGroups: draft.sharedGroups,
      sharedUsers: draft.sharedUsers,
      sourceFormId: draft.sourceFormId,
      sourceType: draft.sourceType,
      status,
      visibility: draft.visibility,
    }
  }

  const persistAndExit = (status: ReportStatus) => {
    setIsSaving(true)
    const report = buildReportFromDraft(status)
    if (draft.editingReportId) {
      updateReport(draft.editingReportId, report)
    } else {
      addReport(report)
    }
    resetDraft()
    setIsSaving(false)
    showToast({
      message:
        status === 'Published' ? t`Report published` : t`Report saved as draft`,
      variant: 'success',
    })
    void navigate({ to: '/reports' })
  }

  const handleCancel = () => {
    resetDraft()
    onBack()
  }

  const renderStep = () => {
    switch (stepIds[activeIndex]) {
      case 'ask-ai':
        return <AskAiStep />
      case 'details':
        return <DetailsStep />
      case 'fields':
        return <FieldsStep />
      case 'filters':
        return <FiltersStep />
      case 'schedule':
        return <ScheduleStep />
      default:
        return null
    }
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
      onSave={() => persistAndExit('Draft')}
      onStepChange={goToStep}
    >
      {renderStep()}
      {activeIndex === steps.length - 1 && (
        <div className='flex justify-end border-t border-gray-3 pt-4'>
          <button
            className='text-13 font-medium text-primary-10 underline-offset-2 hover:underline'
            type='button'
            onClick={() => persistAndExit('Published')}
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
