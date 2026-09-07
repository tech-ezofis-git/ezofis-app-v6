import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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

  if (view === 'builder') {
    return <ReportBuilderWizard onBack={() => setView('list')} />
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <SettingsPageHeader title={t`Report Builder`} onBack={onBack} />
      <div className='min-h-0 flex-1 overflow-hidden'>
        <ReportsListView
          onCreateReport={() => {
            resetDraft()
            openBuilder()
          }}
          onEditReport={(report: Report) => {
            loadFromReport(report)
            openBuilder()
          }}
          onOpenReport={(report: Report) => {
            loadFromReport(report)
            openBuilder()
          }}
          onScheduleReport={(report: Report) => {
            loadFromReport(report)
            openBuilder('schedule')
          }}
        />
      </div>
    </div>
  )
}

ReportBuilderSettingsPage.displayName = 'ReportBuilderSettingsPage'
export default ReportBuilderSettingsPage
