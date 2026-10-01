import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { FileText, FolderOpen, GitFork, Users } from 'lucide-react'
import type { LicenseSummaryResponse } from '@/api/v6/license'
import cn from '@/utils/cn'
import type { LicenseResourceCategory } from '../../data/licenseMockData'

type Props = {
  selectedCategory?: LicenseResourceCategory
  summary: LicenseSummaryResponse
  onSelectCategory?: (category: LicenseResourceCategory) => void
}

export default function LicenseStatsRow({
  selectedCategory,
  summary,
  onSelectCategory,
}: Props) {
  const { t } = useLingui()
  const storageUsedGb = (summary.storageUsedBytes / 1024 ** 3).toFixed(1)

  // Calculations for percent used & limits
  const usersPct = Math.min(
    100,
    Math.round((summary.usersCount / Math.max(1, summary.usersLimit)) * 100),
  )
  const workflowsPct = Math.min(
    100,
    Math.round(
      (summary.workflowsCount / Math.max(1, summary.workflowsLimit)) * 100,
    ),
  )
  const foldersPct = Math.min(
    100,
    Math.round(
      (summary.foldersCount / Math.max(1, summary.foldersLimit)) * 100,
    ),
  )
  const filesPct = Math.min(
    100,
    Math.round((summary.filesCount / Math.max(1, summary.filesLimit)) * 100),
  )

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard
        badgeLabel={t`${usersPct}% limit`}
        category='users'
        footer={t`${summary.groupsCount ?? 0} user groups`}
        icon={<Users size={18} strokeWidth={2} />}
        isSelected={selectedCategory === 'users'}
        label={t`Users`}
        percent={usersPct}
        value={`${summary.usersCount} / ${summary.usersLimit}`}
        onClick={() => onSelectCategory?.('users')}
      />
      <StatCard
        badgeLabel={t`${workflowsPct}% limit`}
        category='workflows'
        footer={t`Automated processes`}
        icon={<GitFork size={18} strokeWidth={2} />}
        isSelected={selectedCategory === 'workflows'}
        label={t`Workflows`}
        percent={workflowsPct}
        value={`${summary.workflowsCount} / ${summary.workflowsLimit}`}
        onClick={() => onSelectCategory?.('workflows')}
      />
      <StatCard
        badgeLabel={t`${foldersPct}% limit`}
        category='folders'
        footer={t`Hierarchy structure`}
        icon={<FolderOpen size={18} strokeWidth={2} />}
        isSelected={selectedCategory === 'folders'}
        label={t`Folders`}
        percent={foldersPct}
        value={`${summary.foldersCount} / ${summary.foldersLimit}`}
        onClick={() => onSelectCategory?.('folders')}
      />
      <StatCard
        badgeLabel={t`${storageUsedGb} GB used`}
        category='files'
        footer={t`${filesPct}% file capacity`}
        icon={<FileText size={18} strokeWidth={2} />}
        isSelected={selectedCategory === 'files'}
        label={t`Files & Storage`}
        percent={filesPct}
        value={`${summary.filesCount.toLocaleString()} / ${summary.filesLimit.toLocaleString()}`}
        onClick={() => onSelectCategory?.('files')}
      />
    </div>
  )
}

function getProgressColorClass(percent: number) {
  if (percent > 85) return 'bg-red-9'
  if (percent > 60) return 'bg-orange-9'
  return 'bg-primary-9'
}

function StatCard({
  badgeLabel,
  category,
  footer,
  icon,
  isSelected,
  label,
  percent,
  value,
  onClick,
}: {
  badgeLabel: string
  category: LicenseResourceCategory
  footer: string
  icon: ReactNode
  isSelected?: boolean
  label: string
  percent: number
  value: string
  onClick?: () => void
}) {
  const barColor = getProgressColorClass(percent)

  return (
    <button
      aria-pressed={isSelected}
      type='button'
      className={cn(
        'group relative flex cursor-pointer flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.98]',
        isSelected
          ? '-translate-y-0.5 border-2 border-primary-9 bg-primary-1/60 shadow-md ring-2 ring-primary-9/20'
          : 'border-gray-3 bg-surface hover:border-primary-6 hover:bg-primary-1/30 hover:shadow-[var(--shadow-md)]',
      )}
      onClick={onClick}
    >
      <div>
        <div className='flex items-start justify-between gap-2'>
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
              isSelected
                ? 'bg-primary-9 text-white shadow-sm'
                : 'bg-primary-3 text-primary-10 group-hover:bg-primary-9 group-hover:text-white',
            )}
          >
            {icon}
          </span>
          <div className='flex items-center gap-1.5'>
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-colors duration-200',
                isSelected
                  ? 'border-primary-4 bg-primary-3 text-primary-11'
                  : 'border-gray-4 bg-gray-2 text-text-secondary',
              )}
            >
              {badgeLabel}
            </span>
          </div>
        </div>

        <div className='mt-3'>
          <div className='font-poppins text-[22px] font-bold tracking-tight text-text-primary'>
            {value}
          </div>
          <div className='mt-0.5 text-12 font-semibold text-text-secondary'>
            {label}
          </div>
        </div>
      </div>

      <div>
        <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-2'>
          <div
            style={{ width: `${Math.max(4, percent)}%` }}
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              barColor,
            )}
          />
        </div>
        <div className='mt-2 flex items-center justify-between text-11 font-medium text-text-muted'>
          <span>{footer}</span>
          {isSelected ? (
            <span className='size-2 animate-pulse rounded-full bg-primary-9' />
          ) : null}
        </div>
      </div>
    </button>
  )
}
