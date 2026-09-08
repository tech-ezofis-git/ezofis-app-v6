import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import { useReportBuilderByIdQuery } from '@/pages/report-builder/hooks/useReportBuilderApi'
import { AnimateFadeIn } from '@/components/common/animations'
import OverviewTab from './components/OverviewTab'
import ReportKpiCards from './components/ReportKpiCards'

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
    <AnimateFadeIn className='flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-3 px-4'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <IconButton
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={() => navigate({ to: '/reports' })}
          />
          <h1 className='truncate text-15 font-semibold text-gray-13'>
            {report.name}
          </h1>
          <span className='hidden items-center gap-1 text-12 text-gray-9 sm:inline-flex'>
            <Icon className='size-3.5' name='lucide:database' />
            {report.domain}
          </span>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        {/* <ReportKpiCards report={report} /> */}
        <OverviewTab report={report} />
      </div>
    </AnimateFadeIn>
  )
}

ReportDetailPage.displayName = 'ReportDetailPage'
export default ReportDetailPage

