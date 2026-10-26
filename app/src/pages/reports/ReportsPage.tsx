import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import type { Report } from '@/pages/report-builder/types'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import { getAnyReportById } from '@/pages/report-builder/hooks/useReportBuilderApi'
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

  // AI list rows are summaries; load the saved prompt/spec by id first.
  const loadFull = async (report: Report) => {
    if (!report.isAiReport) return report
    const { data, error } = await getAnyReportById(report.id)
    if (!data) {
      showToast({
        message: error || t`Failed to load report`,
        variant: 'error',
      })
    }
    return data
  }

  const handleEdit = async (report: Report) => {
    const full = await loadFull(report)
    if (!full) return
    loadFromReport(full)
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
        onEditReport={(report) => void handleEdit(report)}
        onOpenReport={handleOpen}
        onScheduleReport={handleSchedule}
      />
    </AnimateFadeIn>
  )
}

ReportsPage.displayName = 'ReportsPage'
export default ReportsPage
