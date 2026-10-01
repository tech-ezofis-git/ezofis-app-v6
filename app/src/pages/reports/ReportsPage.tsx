import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import type { Report } from '@/pages/report-builder/types'
import { AnimateFadeIn } from '@/components/common/animations'
import { openReportBuilder } from '@/pages/report-builder/navigation'
import useReportBuilderDraftStore from '@/pages/report-builder/stores/useReportBuilderDraftStore'
import useSettingsOriginBreadcrumbs from '@/pages/settings/hooks/useSettingsOriginBreadcrumbs'
import ReportsListView from './components/ReportsListView'

const ReportsPage = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  useSettingsOriginBreadcrumbs(t`Reports`)

  const loadFromReport = useReportBuilderDraftStore(
    (state) => state.loadFromReport,
  )
  const resetDraft = useReportBuilderDraftStore((state) => state.resetDraft)

  const goToBuilder = () => {
    openReportBuilder(navigate)
  }

  const handleCreate = () => {
    resetDraft()
    goToBuilder()
  }

  const handleEdit = (report: Report) => {
    loadFromReport(report)
    goToBuilder()
  }

  const handleOpen = (report: Report) => {
    void navigate({
      params: { reportId: report.id },
      to: '/reports/$reportId',
    })
  }

  const handleSchedule = (report: Report) => {
    loadFromReport(report)
    openReportBuilder(navigate, 'schedule')
  }

  return (
    <AnimateFadeIn className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
      <ReportsListView
        onCreateReport={handleCreate}
        onEditReport={handleEdit}
        onOpenReport={handleOpen}
        onScheduleReport={handleSchedule}
      />
    </AnimateFadeIn>
  )
}

ReportsPage.displayName = 'ReportsPage'
export default ReportsPage
