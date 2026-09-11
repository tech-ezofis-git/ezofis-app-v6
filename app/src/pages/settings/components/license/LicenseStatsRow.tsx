import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { FileText, FolderOpen, GitFork, Users } from 'lucide-react'
import type { LicenseSummaryResponse } from '@/api/v6/license'

type Props = {
  summary: LicenseSummaryResponse
}

export default function LicenseStatsRow({ summary }: Props) {
  const { t } = useLingui()
  const storageUsedGb = (summary.storageUsedBytes / 1024 ** 3).toFixed(1)
  const activeWorkflows = Math.max(0, summary.workflowsCount - 4)
  const activeUsers = Math.max(0, summary.usersCount - 4)
  const groupsCount = summary.groupsCount

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard
        accent='teal'
        badgeLabel={t`All Active`}
        badgeTone='positive'
        footer={t`${activeUsers} active · ${groupsCount} groups`}
        icon={<Users size={18} strokeWidth={2} />}
        label={t`Users`}
        value={`${summary.usersCount}/${summary.usersLimit}`}
      />
      <StatCard
        accent='primary'
        badgeLabel={t`+2 this week`}
        badgeTone='positive'
        footer={t`${activeWorkflows} active`}
        icon={<GitFork size={18} strokeWidth={2} />}
        label={t`Workflows`}
        value={`${summary.workflowsCount}/${summary.workflowsLimit}`}
      />
      <StatCard
        accent='cyan'
        badgeLabel={t`Organized`}
        badgeTone='neutral'
        footer={t`5 hierarchy levels`}
        icon={<FolderOpen size={18} strokeWidth={2} />}
        label={t`Folders`}
        value={`${summary.foldersCount}/${summary.foldersLimit}`}
      />
      <StatCard
        accent='violet'
        badgeLabel={t`${storageUsedGb} GB used`}
        badgeTone='neutral'
        footer={t`Storage across all folders`}
        icon={<FileText size={18} strokeWidth={2} />}
        label={t`Files`}
        value={`${summary.filesCount.toLocaleString()}/${summary.filesLimit.toLocaleString()}`}
      />
    </div>
  )
}

const accentClass = {
  cyan: { icon: 'bg-cyan-3 text-cyan-11', top: 'border-t-cyan-9' },
  primary: { icon: 'bg-primary-3 text-primary-10', top: 'border-t-primary-9' },
  teal: { icon: 'bg-teal-3 text-teal-11', top: 'border-t-teal-9' },
  violet: { icon: 'bg-violet-3 text-violet-11', top: 'border-t-violet-9' },
} as const

const badgeToneClass = {
  neutral: 'border-gray-4 bg-gray-2 text-text-secondary',
  positive: 'border-green-6 bg-green-3 text-green-11',
} as const

function StatCard({
  accent,
  badgeLabel,
  badgeTone,
  footer,
  icon,
  label,
  value,
}: {
  accent: keyof typeof accentClass
  badgeLabel: string
  badgeTone: keyof typeof badgeToneClass
  footer: string
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-t-[3px] border-gray-3 bg-surface p-3 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${accentClass[accent].top}`}
    >
      <div className='flex items-start justify-between gap-2'>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${accentClass[accent].icon}`}
        >
          {icon}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${badgeToneClass[badgeTone]}`}
        >
          {badgeLabel}
        </span>
      </div>
      <div>
        <div className='font-poppins text-[20px] font-semibold text-text-primary'>
          {value}
        </div>
        <div className='mt-0.5 text-12 font-medium text-text-secondary'>
          {label}
        </div>
      </div>
      <div className='text-11 text-text-muted'>{footer}</div>
    </div>
  )
}
