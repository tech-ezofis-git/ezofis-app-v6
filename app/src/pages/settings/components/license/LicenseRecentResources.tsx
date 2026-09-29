import { useLingui } from '@lingui/react/macro'
import {
  ChevronRight,
  FileText,
  FolderOpen,
  GitFork,
  MoreVertical,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { LicenseSummaryResponse } from '@/api/v6/license'
import type { V6UserListItem } from '@/api/v6/user'
import cn from '@/utils/cn'
import {
  type FileResourceItem,
  type FolderResourceItem,
  type LicenseResourceCategory,
  type UserResourceItem,
  type WorkflowResourceItem,
  mockFilesList,
  mockFoldersList,
  mockUsersList,
  mockWorkflowsList,
} from '../../data/licenseMockData'

type Props = {
  onSelectCategory?: (category: LicenseResourceCategory) => void
  repositoriesData?: any[]
  selectedCategory: LicenseResourceCategory
  summary: LicenseSummaryResponse
  usersData?: V6UserListItem[]
  workflowsData?: any[]
}

const avatarPalette = [
  'bg-teal-9',
  'bg-primary-9',
  'bg-cyan-9',
  'bg-violet-9',
  'bg-orange-9',
]

function formatDate(iso?: string) {
  if (!iso) return 'Recently'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return String(iso)
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusLabel(r: any) {
  const statusStr = String(r.status || r.repositoryStatus || '').toLowerCase()
  if (statusStr === 'draft' || r.isDraft === true) return 'Draft'
  return 'Active'
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
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function LicenseRecentResources({
  repositoriesData,
  selectedCategory,
  summary,
  usersData,
  workflowsData,
}: Props) {
  const { t } = useLingui()

  const realUsersList: UserResourceItem[] =
    usersData && usersData.length > 0
      ? usersData.map((u: any, i: number) => ({
          createdDate: formatDate(u.createdAtUtc || u.createdAt),
          department: u.department || u['Bussiness Unit'] || '—',
          email: u.email || u.userName || 'user@ezofis.com',
          group: u.department || u.role || 'Member',
          id: u.id || `u-${i}`,
          lastActive: u.lastLogin || u.createdAtUtc ? formatDate(u.createdAtUtc) : 'Active recently',
          name: u.displayName || u.firstName || u.userName || 'User',
          role: u.role || 'TenantUser',
          status: 'active' as const,
        }))
      : mockUsersList

  const realFoldersList: FolderResourceItem[] =
    repositoriesData && repositoriesData.length > 0
      ? repositoriesData.map((r: any, i: number) => ({
          createdBy: r.createdByName || r.createdBy || r.ownerName || 'admin@ezofis.com',
          description: r.description || '—',
          documentsCount: Number(r.documents ?? r.documentsCount ?? r.fileCount ?? 0),
          id: r.id || `f-${i}`,
          level: r.storageProviderCode ? String(r.storageProviderCode) : 'Default',
          name: r.name || r.title || r.value || 'Untitled folder',
          status: getStatusLabel(r),
          updatedAtLabel: formatDate(r.createdAtUtc || r.createdAt || r.created),
        }))
      : mockFoldersList

  const realWorkflowsList: WorkflowResourceItem[] =
    workflowsData && workflowsData.length > 0
      ? workflowsData.map((w: any, i: number) => ({
          id: w.id || w.workflowId || `wf-${i}`,
          owner:
            w.createdByName ||
            w.modifiedByName ||
            w.createdBy ||
            w.owner ||
            'admin@ezofis.com',
          status:
            String(w.flowStatus || w.status || '').toUpperCase() ===
              'PUBLISHED' ||
            w.isPublished === true ||
            w.status === 1
              ? 'Published'
              : 'Draft',
          title: w.name || w.title || w.workflowName || 'Untitled Workflow',
          updatedAtLabel: formatDate(
            w.modifiedAt || w.createdAt || w.updatedAtUtc || w.updatedAt,
          ),
        }))
      : mockWorkflowsList

  const realFilesList: FileResourceItem[] =
    repositoriesData && repositoriesData.length > 0
      ? repositoriesData.map((r: any, i: number) => {
          const docCount = Number(r.documents ?? r.documentsCount ?? r.fileCount ?? 0)
          return {
            id: r.id || `file-${i}`,
            name: r.name || r.title || r.value || 'Untitled Repository',
            size: `${docCount} doc${docCount === 1 ? '' : 's'}`,
            type: 'Document Repository',
            updatedAtLabel: formatDate(r.createdAtUtc || r.createdAt || r.created),
            uploadedBy: r.createdByName || r.createdBy || r.ownerName || 'admin@ezofis.com',
          }
        })
      : mockFilesList

  const categoryInfo = {
    users: {
      count: summary.usersCount,
      icon: Users,
      title: t`Users List`,
      viewAllText: t`View all ${summary.usersCount} users`,
    },
    workflows: {
      count: summary.workflowsCount,
      icon: GitFork,
      title: t`Workflows List`,
      viewAllText: t`View all ${summary.workflowsCount} workflows`,
    },
    folders: {
      count: summary.foldersCount,
      icon: FolderOpen,
      title: t`Folders List`,
      viewAllText: t`View all ${summary.foldersCount} folders`,
    },
    files: {
      count: summary.filesCount,
      icon: FileText,
      title: t`Files & Storage`,
      viewAllText: t`View all ${summary.filesCount} files`,
    },
  }[selectedCategory]

  const IconComponent = categoryInfo.icon

  return (
    <div className='overflow-hidden rounded-xl border border-gray-3 bg-surface shadow-[var(--shadow-sm)] transition-all duration-200'>
      {/* Table Section Header */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-3 px-5 py-3.5 bg-surface-secondary/40'>
        <div className='flex items-center gap-2.5'>
          <span className='flex size-7 items-center justify-center rounded-md bg-primary-3 text-primary-10'>
            <IconComponent size={15} strokeWidth={2} />
          </span>
          <span className='font-poppins text-14 font-semibold text-text-primary'>
            {categoryInfo.title}
          </span>
          <span className='rounded-full bg-primary-3 px-2 py-0.5 text-11 font-bold text-primary-11'>
            {categoryInfo.count}
          </span>
        </div>

        <span className='flex shrink-0 items-center gap-1 text-12 font-semibold text-primary-10 cursor-pointer hover:underline'>
          {categoryInfo.viewAllText}
          <ChevronRight size={14} strokeWidth={2.2} />
        </span>
      </div>

      {/* Table Column Headers */}
      <div className='hidden grid-cols-12 gap-3 border-b border-gray-3 bg-gray-1 px-5 py-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase sm:grid'>
        {selectedCategory === 'users' ? (
          <>
            <div className='col-span-5'>{t`User / Email`}</div>
            <div className='col-span-2'>{t`Status`}</div>
            <div className='col-span-3'>{t`Role & Unit`}</div>
            <div className='col-span-2 text-right'>{t`Created`}</div>
          </>
        ) : selectedCategory === 'workflows' ? (
          <>
            <div className='col-span-5'>{t`Workflow Name`}</div>
            <div className='col-span-2'>{t`Status`}</div>
            <div className='col-span-3'>{t`Owner`}</div>
            <div className='col-span-2 text-right'>{t`Modified`}</div>
          </>
        ) : selectedCategory === 'folders' ? (
          <>
            <div className='col-span-5'>{t`Folder Name`}</div>
            <div className='col-span-2'>{t`Status`}</div>
            <div className='col-span-3'>{t`Creator & Storage`}</div>
            <div className='col-span-2 text-right'>{t`Documents`}</div>
          </>
        ) : (
          <>
            <div className='col-span-5'>{t`File Name`}</div>
            <div className='col-span-2'>{t`Size`}</div>
            <div className='col-span-3'>{t`Uploader`}</div>
            <div className='col-span-2 text-right'>{t`Uploaded`}</div>
          </>
        )}
      </div>

      {/* Table Rows */}
      <div className='flex flex-col animate-in fade-in duration-200'>
        {selectedCategory === 'users' ? (
          realUsersList.map((user) => <UserRow key={user.id} user={user} />)
        ) : null}

        {selectedCategory === 'workflows' ? (
          realWorkflowsList.map((wf) => <WorkflowRow key={wf.id} workflow={wf} />)
        ) : null}

        {selectedCategory === 'folders' ? (
          realFoldersList.map((fold) => <FolderRow folder={fold} key={fold.id} />)
        ) : null}

        {selectedCategory === 'files' ? (
          realFilesList.map((file) => <FileRow file={file} key={file.id} />)
        ) : null}
      </div>
    </div>
  )
}

function UserRow({ user }: { user: UserResourceItem & { createdDate?: string; department?: string } }) {
  const { t } = useLingui()
  const initials = getInitials(user.name)
  const avatarColor = getAvatarColor(user.name)

  return (
    <div className='grid grid-cols-1 sm:grid-cols-12 items-center gap-3 border-b border-gray-2 px-5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-gray-1/70'>
      <div className='col-span-5 flex items-center gap-3 min-w-0'>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-11 font-bold text-white uppercase ${avatarColor}`}
        >
          {initials}
        </span>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-13 font-semibold text-text-primary'>
            {user.name}
          </div>
          <div className='truncate text-11 text-text-muted'>{user.email}</div>
        </div>
      </div>

      <div className='col-span-2 hidden sm:block'>
        <span className='rounded-full border border-green-6 bg-green-3 px-2 py-0.5 text-[10px] font-bold text-green-11 uppercase'>
          {user.status === 'active' ? t`Active` : t`Invited`}
        </span>
      </div>

      <div className='col-span-3 hidden sm:flex items-center gap-2 min-w-0'>
        <span className='inline-flex items-center gap-1 rounded-md border border-teal-6/40 bg-teal-3/40 px-2 py-0.5 text-11 font-medium text-teal-11 truncate'>
          <ShieldCheck size={12} className='shrink-0' />
          {user.role}
        </span>
        {user.department && user.department !== '—' ? (
          <span className='text-11 text-text-muted font-medium truncate'>
            · {user.department}
          </span>
        ) : null}
      </div>

      <div className='col-span-2 flex items-center justify-end gap-2 text-right text-11 text-text-muted'>
        <span>{user.createdDate || user.lastActive}</span>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-gray-2 cursor-pointer'>
          <MoreVertical size={15} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

function WorkflowRow({ workflow }: { workflow: WorkflowResourceItem }) {
  const { t } = useLingui()

  return (
    <div className='grid grid-cols-1 sm:grid-cols-12 items-center gap-3 border-b border-gray-2 px-5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-gray-1/70'>
      <div className='col-span-5 flex items-center gap-3 min-w-0'>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-3 text-primary-10'>
          <GitFork size={16} strokeWidth={2} />
        </span>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-13 font-semibold text-text-primary'>
            {workflow.title}
          </div>
          <div className='truncate text-11 text-text-muted sm:hidden'>
            {workflow.owner}
          </div>
        </div>
      </div>

      <div className='col-span-2 hidden sm:block'>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
            workflow.status === 'Published'
              ? 'border-green-6 bg-green-3 text-green-11'
              : 'border-orange-6 bg-orange-3 text-orange-11',
          )}
        >
          {workflow.status === 'Published' ? t`Published` : t`Draft`}
        </span>
      </div>

      <div className='col-span-3 hidden sm:block truncate text-12 text-text-secondary font-medium'>
        {workflow.owner}
      </div>

      <div className='col-span-2 flex items-center justify-end gap-2 text-right text-11 text-text-muted'>
        <span>{workflow.updatedAtLabel}</span>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-gray-2 cursor-pointer'>
          <MoreVertical size={15} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

function FolderRow({
  folder,
}: {
  folder: FolderResourceItem & {
    description?: string
    documentsCount?: number
    status?: string
  }
}) {
  const { t } = useLingui()
  const isDraft = folder.status === 'Draft'

  return (
    <div className='grid grid-cols-1 sm:grid-cols-12 items-center gap-3 border-b border-gray-2 px-5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-gray-1/70'>
      <div className='col-span-5 flex items-center gap-3 min-w-0'>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-3 text-cyan-11'>
          <FolderOpen size={16} strokeWidth={2} />
        </span>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-13 font-semibold text-text-primary'>
            {folder.name}
          </div>
          <div className='truncate text-11 text-text-muted sm:hidden'>
            {folder.createdBy}
          </div>
        </div>
      </div>

      <div className='col-span-2 hidden sm:block'>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
            isDraft
              ? 'border-orange-6 bg-orange-3 text-orange-11'
              : 'border-green-6 bg-green-3 text-green-11',
          )}
        >
          {isDraft ? t`Draft` : t`Active`}
        </span>
      </div>

      <div className='col-span-3 hidden sm:block truncate text-12 text-text-secondary font-medium'>
        {folder.createdBy}
      </div>

      <div className='col-span-2 flex items-center justify-end gap-2 text-right text-11 text-text-muted'>
        <span className='rounded-full border border-gray-4 bg-gray-2 px-2 py-0.5 text-[10px] font-semibold text-text-secondary'>
          {folder.documentsCount ?? 0} {t`docs`}
        </span>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-gray-2 cursor-pointer'>
          <MoreVertical size={15} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

function FileRow({ file }: { file: FileResourceItem }) {
  const { t } = useLingui()

  return (
    <div className='grid grid-cols-1 sm:grid-cols-12 items-center gap-3 border-b border-gray-2 px-5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-gray-1/70'>
      <div className='col-span-5 flex items-center gap-3 min-w-0'>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-3 text-violet-11'>
          <FileText size={16} strokeWidth={2} />
        </span>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-13 font-semibold text-text-primary'>
            {file.name}
          </div>
          <div className='truncate text-11 text-text-muted sm:hidden'>
            {file.uploadedBy}
          </div>
        </div>
      </div>

      <div className='col-span-2 hidden sm:block'>
        <span className='rounded-full border border-violet-6/50 bg-violet-2 px-2 py-0.5 text-[10px] font-bold text-violet-11'>
          {file.size}
        </span>
      </div>

      <div className='col-span-3 hidden sm:block truncate text-12 text-text-secondary font-medium'>
        {file.uploadedBy}
      </div>

      <div className='col-span-2 flex items-center justify-end gap-2 text-right text-11 text-text-muted'>
        <span>{file.updatedAtLabel}</span>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-gray-2 cursor-pointer'>
          <MoreVertical size={15} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}
