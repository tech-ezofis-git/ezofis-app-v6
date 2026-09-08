import { useLingui } from '@lingui/react/macro'
import type { Report } from '@/pages/report-builder/types'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Kpi {
  accent: string
  icon: string
  label: string
  value: string
}

interface Props {
  report: Report
}

const ACCENTS = {
  blue: 'bg-blue-2 text-blue-11',
  gray: 'bg-gray-3 text-gray-11',
  green: 'bg-green-2 text-green-11',
  purple: 'bg-secondary-2 text-secondary-11',
}

const ReportKpiCards = ({ report }: Props) => {
  const { t } = useLingui()

  const kpis: Kpi[] = [
    {
      accent: ACCENTS.blue,
      icon: 'lucide:play',
      label: t`Total runs`,
      value: String(report.runs),
    },
    {
      accent: ACCENTS.purple,
      icon: 'lucide:table-2',
      label: t`Fields`,
      value: String(report.fields.length),
    },
    {
      accent: ACCENTS.green,
      icon: 'lucide:calendar-clock',
      label: t`Schedule`,
      value: report.scheduled ? report.schedule.recurrence : t`Not scheduled`,
    },
  ]

  return (
    <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
      {kpis.map((kpi) => (
        <div
          className='flex items-center gap-3 rounded-xl border border-gray-3 bg-surface p-3.5 transition-colors hover:border-gray-4'
          key={kpi.label}
        >
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              kpi.accent,
            )}
          >
            <Icon className='size-4.5' name={kpi.icon} />
          </div>
          <div className='min-w-0'>
            <p className='truncate text-11 font-medium tracking-wide text-gray-9 uppercase'>
              {kpi.label}
            </p>
            <p className='truncate text-17 font-semibold text-gray-13'>
              {kpi.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

ReportKpiCards.displayName = 'ReportKpiCards'
export default ReportKpiCards
