import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getReportBuilderReportById } from '@/api/v6/reportBuilder'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import ReportsListView from '@/pages/reports/components/ReportsListView'
import SettingsPageHeader from '@/pages/settings/components/SettingsPageHeader'
import type { ReportBuilderStep } from '../navigation'
import type { Report } from '../types'
import { openReportBuilder } from '../navigation'
import useReportBuilderDraftStore from '../stores/useReportBuilderDraftStore'
import ReportBuilderWizard from './ReportBuilderWizard'

interface Props {
  onBack: () => void
}

type View = 'builder' | 'list'

/**
 * Settings → Report Builder entry point. Shows the reports list first
 * (reusing ReportsListView, the same body the standalone /reports route
 * renders) and switches to the wizard only when creating or editing a
 * report, keeping the standalone list/detail pages untouched.
 */
const ReportBuilderSettingsPage = ({ onBack }: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('list')

  const loadFromReport = useReportBuilderDraftStore(
    (state) => state.loadFromReport,
  )
  const resetDraft = useReportBuilderDraftStore((state) => state.resetDraft)

  const openBuilder = (step?: ReportBuilderStep) => {
    openReportBuilder(navigate, step)
    setView('builder')
  }

  // The reports list only carries summary fields — load the full saved
  // config (fields/fieldSettings/filters/schedule) before hydrating the
  // wizard draft for edit/open/schedule.
  const openReportForEdit = async (
    report: Report,
    step?: ReportBuilderStep,
  ) => {
    const { data, error } = await getReportBuilderReportById(report.id)
    if (error || !data) {
      showToast({
        message: error || t`Failed to load report`,
        variant: 'error',
      })
      return
    }
    loadFromReport(data)
    openBuilder(step)
  }

  if (view === 'builder') {
    return (
      <AnimateFadeIn className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
        <ReportBuilderWizard onBack={() => setView('list')} />
      </AnimateFadeIn>
    )
  }

  return (
    <AnimateFadeIn className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
      <SettingsPageHeader title={t`Report Builder`} onBack={onBack} />
      <div className='min-h-0 flex-1 overflow-hidden'>
        <ReportsListView
          variant='settings'
          onCreateReport={() => {
            resetDraft()
            openBuilder()
          }}
          onEditReport={(report: Report) => void openReportForEdit(report)}
          onOpenReport={(report: Report) => void openReportForEdit(report)}
          onScheduleReport={(report: Report) =>
            void openReportForEdit(report, 'schedule')
          }
        />
      </div>
    </AnimateFadeIn>
  )
}

ReportBuilderSettingsPage.displayName = 'ReportBuilderSettingsPage'
export default ReportBuilderSettingsPage
