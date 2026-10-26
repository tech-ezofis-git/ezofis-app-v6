import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import { useReportBuilderByIdQuery } from '@/pages/report-builder/hooks/useReportBuilderApi'
import OverviewTab from './components/OverviewTab'
import ReportKpiCards from './components/ReportKpiCards'
import ReportShareButton from './components/ReportShareButton'

interface Props {
  reportId: string
}

const ReportDetailPage = ({ reportId }: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()

  const { data: report, isLoading } = useReportBuilderByIdQuery(reportId)

  if (isLoading) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 p-6 text-center'>
        <Icon
          className='size-6 animate-spin text-gray-8'
          name='lucide:loader-2'
        />
        <p className='text-14 text-gray-10'>{t`Loading report...`}</p>
      </div>
    )
  }

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
    // The report name lives in the top bar breadcrumb (PageTitle), leaving
    // this page's height to the table / opened request or file.
    <AnimateFadeIn className='flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        {/* <ReportKpiCards report={report} /> */}
        <OverviewTab
          report={report}
          toolbarActions={
            report.isAiReport ? undefined : (
              <ReportShareButton reportId={report.id} />
            )
          }
        />
      </div>
    </AnimateFadeIn>
  )
}

ReportDetailPage.displayName = 'ReportDetailPage'
export default ReportDetailPage
