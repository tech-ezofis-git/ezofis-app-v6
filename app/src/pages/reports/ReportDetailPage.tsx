import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import showToast from '@/components/base/toast/showToast'
import ReportStatusBadge from '@/components/common/ReportStatusBadge'
import { openReportBuilder } from '@/pages/report-builder/navigation'
import useReportBuilderDraftStore from '@/pages/report-builder/stores/useReportBuilderDraftStore'
import useReportsStore from '@/pages/report-builder/stores/useReportsStore'
import ExecutionHistoryTab from './components/ExecutionHistoryTab'
import OverviewTab from './components/OverviewTab'
import PermissionsTab from './components/PermissionsTab'

type DetailTab = 'overview' | 'history' | 'permissions'

interface Props {
  reportId: string
}

const ReportDetailPage = ({ reportId }: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  const report = useReportsStore((state) =>
    state.reports.find((r) => r.id === reportId),
  )
  const executions = useReportsStore(
    (state) => state.executions[reportId] || [],
  )
  const runReportNow = useReportsStore((state) => state.runReportNow)
  const loadFromReport = useReportBuilderDraftStore(
    (state) => state.loadFromReport,
  )

  if (!report) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 p-6 text-center'>
        <Icon className='size-8 text-gray-8' name='lucide:file-x' />
        <p className='text-14 text-gray-10'>{t`Report not found.`}</p>
        <Button
          color='gray'
          label={t`Back to Reports`}
          variant='outline'
          onClick={() => navigate({ to: '/reports' })}
        />
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='flex flex-col gap-4 border-b border-gray-3 px-6 py-4'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <IconButton
              color='gray'
              icon='lucide:arrow-left'
              variant='ghost'
              onClick={() => navigate({ to: '/reports' })}
            />
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-18 font-semibold text-gray-13'>
                  {report.name}
                </h1>
                <ReportStatusBadge status={report.status} />
              </div>
              <p className='mt-1 text-13 text-gray-10'>{report.description}</p>
              <div className='mt-2 flex flex-wrap items-center gap-3 text-12 text-gray-9'>
                <span className='inline-flex items-center gap-1'>
                  <Icon className='size-3.5' name='lucide:database' />
                  {report.domain}
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Icon className='size-3.5' name='lucide:user' />
                  {report.owner}
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Icon className='size-3.5' name='lucide:play' />
                  {(() => {
                    const runs = report.runs
                    return t`${runs} runs`
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className='flex shrink-0 items-center gap-2'>
            <Button
              color='gray'
              icon='lucide:play'
              label={t`Run now`}
              variant='outline'
              onClick={() => {
                runReportNow(report.id)
                showToast({
                  message: t`Report run started`,
                  variant: 'success',
                })
              }}
            />
            <Button
              color='primary'
              icon='lucide:edit'
              label={t`Edit`}
              onClick={() => {
                loadFromReport(report)
                openReportBuilder(navigate)
              }}
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onChange={(v) => setActiveTab((v as DetailTab) || 'overview')}
        >
          <Tab icon='lucide:table' label={t`Overview`} value='overview' />
          <Tab
            icon='lucide:history'
            label={t`Execution History`}
            value='history'
          />
          <Tab
            icon='lucide:shield-check'
            label={t`Permissions`}
            value='permissions'
          />
        </Tabs>
      </div>

      <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto p-6'>
        {activeTab === 'overview' && <OverviewTab report={report} />}
        {activeTab === 'history' && (
          <ExecutionHistoryTab executions={executions} />
        )}
        {activeTab === 'permissions' && <PermissionsTab report={report} />}
      </div>
    </div>
  )
}

ReportDetailPage.displayName = 'ReportDetailPage'
export default ReportDetailPage
