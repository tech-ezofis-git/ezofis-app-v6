import { useLingui } from '@lingui/react/macro'
import {
  ChevronRight,
  FileText,
  FolderOpen,
  GitFork,
  MoreVertical,
} from 'lucide-react'
import type { LicenseSummaryResponse } from '@/api/v6/license'
import type { RecentTrialResourceDef } from '../../data/licenseMockData'
import { recentTrialResources } from '../../data/licenseMockData'

type Props = {
  summary: LicenseSummaryResponse
}

const typeIconClass = {
  document: 'bg-blue-3 text-blue-11',
  folder: 'bg-indigo-3 text-indigo-11',
  workflow: 'bg-primary-3 text-primary-10',
} as const

const typeIcon = {
  document: FileText,
  folder: FolderOpen,
  workflow: GitFork,
} as const

const avatarPalette = [
  'bg-primary-9',
  'bg-cyan-9',
  'bg-teal-9',
  'bg-orange-9',
  'bg-violet-9',
]

export default function LicenseRecentResources({ summary }: Props) {
  const { t } = useLingui()
  const totalFolders = summary.foldersCount

  return (
    <div className='overflow-hidden rounded-xl border border-gray-3 bg-surface shadow-[var(--shadow-sm)]'>
      <div className='flex items-center justify-between gap-3 border-b border-gray-3 px-5 py-4'>
        <div>
          <div className='text-14 font-semibold text-text-primary'>
            {t`Recent Trial Resources`}
          </div>
          <div className='mt-0.5 text-[11.5px] text-text-muted'>
            {t`Quickly view resources created during your evaluation`}
          </div>
        </div>
        <span className='flex shrink-0 items-center gap-1 text-12 font-semibold text-primary-10'>
          {t`View all ${totalFolders} folders`}
          <ChevronRight size={14} strokeWidth={2.2} />
        </span>
      </div>

      <div className='flex flex-col'>
        {recentTrialResources.map((resource) => (
          <ResourceRow key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  )
}

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash += name.charCodeAt(i)
  return avatarPalette[hash % avatarPalette.length]
}

function getInitials(name: string) {
  const parts = name
    .replace(/\(.*\)/, '')
    .trim()
    .split(' ')
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

function ResourceRow({ resource }: { resource: RecentTrialResourceDef }) {
  const { t } = useLingui()
  const Icon = typeIcon[resource.type]
  const initials = getInitials(resource.createdBy)
  const avatarColor = getAvatarColor(resource.createdBy)
  const typeLabel =
    resource.type === 'folder'
      ? t`Folder`
      : resource.type === 'workflow'
        ? t`Workflow`
        : t`Document`

  return (
    <div className='flex items-center gap-3 border-b border-gray-2 px-5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-gray-1'>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${typeIconClass[resource.type]}`}
      >
        <Icon size={15} strokeWidth={2} />
      </span>

      <div className='min-w-0 flex-1'>
        <div className='truncate text-13 font-medium text-text-primary'>
          {resource.name}
        </div>
        <div className='mt-0.5 text-11 text-text-muted'>{typeLabel}</div>
      </div>

      <div className='hidden shrink-0 items-center gap-2 sm:flex'>
        <span
          className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white uppercase ${avatarColor}`}
        >
          {initials}
        </span>
        <span className='text-12 text-text-secondary'>
          {resource.createdBy}
        </span>
      </div>

      <div className='hidden w-28 shrink-0 text-right text-12 text-text-muted md:block'>
        {resource.updatedAtLabel}
      </div>

      <span className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted'>
        <MoreVertical size={15} strokeWidth={2} />
      </span>
    </div>
  )
}
