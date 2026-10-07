import { useLingui } from '@lingui/react/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { SettingsWizardStep } from '@/pages/settings/components/SettingsWizardLayout'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import SettingsWizardLayout from '@/pages/settings/components/SettingsWizardLayout'
import type { Report, ReportStatus } from '../types'
import {
  usePublishReportBuilderReportMutation,
  useSaveReportBuilderReportMutation,
} from '../hooks/useReportBuilderApi'
import useReportBuilderDraftStore from '../stores/useReportBuilderDraftStore'
import SourceStep from './steps/SourceStep'
import DetailsStep from './steps/DetailsStep'
import FieldsStep from './steps/FieldsStep'
import FiltersStep from './steps/FiltersStep'
import ScheduleStep from './steps/ScheduleStep'

const STEP_IDS = [
  'source',
  'details',
  'fields',
  'filters',
  'schedule',
] as const

interface Props {
  onBack: () => void
}

type StepId = (typeof STEP_IDS)[number]

const ReportBuilderWizard = ({ onBack }: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const search = useSearch({ from: '/_app/settings' }) as { step?: string }

  const draft = useReportBuilderDraftStore((state) => state.draft)
  const resetDraft = useReportBuilderDraftStore((state) => state.resetDraft)
  const saveReportMutation = useSaveReportBuilderReportMutation()
  const publishReportMutation = usePublishReportBuilderReportMutation()

  const rawStep = search.step as string
  const normalizedStep = rawStep === 'ask-ai' ? 'source' : (rawStep as StepId)
  const initialIndex = Math.max(
    0,
    STEP_IDS.indexOf(normalizedStep || 'source'),
  )
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [isSaving, setIsSaving] = useState(false)
  const [hasAiPlanGenerated, setHasAiPlanGenerated] = useState(false)

  const isNextHidden = useMemo(() => {
    if (STEP_IDS[activeIndex] === 'source') {
      return !hasAiPlanGenerated && !draft.aiSuggestion
    }
    return false
  }, [activeIndex, hasAiPlanGenerated, draft.aiSuggestion])

  const stepDefinitions: Record<
    StepId,
    { description: string; label: string }
  > = useMemo(
    () => ({
      'source': {
        description: t`Choose data source`,
        label: t`Source`,
      },
      'details': { description: t`Name, description & sharing`, label: t`Details` },
      'fields': { description: t`Choose columns`, label: t`Fields` },
      'filters': { description: t`Narrow down rows`, label: t`Filters` },
      'schedule': { description: t`Automated delivery`, label: t`Schedule` },
    }),
    [t],
  )

  const steps: SettingsWizardStep[] = useMemo(() => {
    return STEP_IDS.map((stepId, index) => ({
      clickable: undefined,
      description: stepDefinitions[stepId].description,
      disabled: undefined,
      id: index,
      label: stepDefinitions[stepId].label,
    }))
  }, [stepDefinitions])

  const goToStep = (index: number) => {
    setActiveIndex(index)
    void navigate({
      to: '/settings',
      search: (prev: { step?: string }) => ({ ...prev, step: STEP_IDS[index] }),
    })
  }

  const isNextDisabled = useMemo(() => {
    if (STEP_IDS[activeIndex] === 'source') {
      return (
        !draft.sourceType ||
        (!draft.sourceId && !draft.domain.trim())
      )
    }
    if (STEP_IDS[activeIndex] === 'details') {
      return !draft.name.trim()
    }
    if (STEP_IDS[activeIndex] === 'fields') {
      return draft.fields.length === 0
    }
    if (STEP_IDS[activeIndex] === 'filters') {
      return draft.filters.length === 0
    }
    return false
  }, [
    activeIndex,
    draft.domain,
    draft.fields.length,
    draft.filters.length,
    draft.name,
    draft.sourceId,
    draft.sourceType,
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
    switch (STEP_IDS[activeIndex]) {
      case 'source':
        content = (
          <SourceStep
            onPlanGenerated={setHasAiPlanGenerated}
            onProceedManual={() => goToStep(1)}
          />
        )
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
      <AnimateFadeIn
        className='flex flex-col gap-6 md:gap-7'
        key={STEP_IDS[activeIndex]}
      >
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
      isNextHidden={isNextHidden}
      isSaving={isSaving}
      moduleTitle={t`Reports`}
      saveLabel={t`Save as Draft`}
      skipLabel={t`Skip for now`}
      steps={steps}
      setupTitle={t`Report Builder`}
      onBack={() => goToStep(Math.max(0, activeIndex - 1))}
      onBackToSettings={handleCancel}
      onCancel={handleCancel}
      onNext={() => goToStep(Math.min(steps.length - 1, activeIndex + 1))}
      onSave={() => void persistAndExit('Draft')}
      onSkip={
        STEP_IDS[activeIndex] === 'filters' && draft.filters.length === 0
          ? () => goToStep(activeIndex + 1)
          : undefined
      }
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
