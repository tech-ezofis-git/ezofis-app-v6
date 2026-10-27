import { useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getUsers } from '@/api/v6/user'
import {
  createDelegation,
  deleteDelegation,
  endDelegation,
  listDelegations,
  updateDelegation,
} from '@/api/v6/workflowDelegations'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
} from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Skeleton from '@/components/base/Skeleton'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import SettingsPageHeader, {
  SettingsHeaderAddButton,
} from '../SettingsPageHeader'
import {
  countDays,
  type Delegation,
  type DelegationStatus,
  formatDay,
  formatShortDay,
  getDelegationStatus,
  STATUS_TONE,
} from './delegationHelpers'
import DelegationWizard from './DelegationWizard'

const STATUS_ORDER: Record<DelegationStatus, number> = {
  Active: 0,
  Completed: 4,
  Draft: 2,
  Ended: 3,
  Scheduled: 1,
}

const STATUS_FILTERS: Array<'all' | DelegationStatus> = [
  'all',
  'Active',
  'Scheduled',
  'Draft',
  'Completed',
  'Ended',
]

const DELEGATIONS_KEY = ['workflow-delegations']

// Avatar tones, picked from the user id so a person keeps one color.
const AVATAR_TONES = [
  'bg-green-3 text-green-11',
  'bg-primary-3 text-primary-11',
  'bg-blue-3 text-blue-11',
  'bg-orange-3 text-orange-11',
  'bg-red-3 text-red-11',
  'bg-secondary-3 text-secondary-11',
  'bg-yellow-3 text-yellow-11',
]
const avatarTone = (id: string) => {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length]
}
const initialsOf = (name: string) => {
  const parts = name
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
  return (
    (parts[0]?.[0] || '') +
    (parts.length > 1 ? parts[1][0] : parts[0]?.[1] || '')
  ).toUpperCase()
}

/**
 * Settings › Delegations: the tenant's delegations (GET /workflow-delegations)
 * and a wizard to create or edit one. Saving, ending and deleting call the
 * workflow-delegations API and refresh the list.
 */
export default function DelegationSettings({ onBack }: { onBack: () => void }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const delegationsQuery = useQuery({
    queryFn: listDelegations,
    queryKey: DELEGATIONS_KEY,
  })
  const delegations = useMemo(
    () => delegationsQuery.data || [],
    [delegationsQuery.data],
  )
  const [deleting, setDeleting] = useState<Delegation | null>(null)
  // Manual refresh shows the row skeleton until the list has reloaded.
  const [refreshing, setRefreshing] = useState(false)
  const refreshNow = async () => {
    setRefreshing(true)
    try {
      await delegationsQuery.refetch()
    } finally {
      setRefreshing(false)
    }
  }
  const [editing, setEditing] = useState<Delegation | null | undefined>(
    undefined,
  )
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('all')
  const [query, setQuery] = useState('')

  const usersQuery = useQuery({
    queryKey: ['delegation-users'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const response = await getUsers()
      if (response.error) throw new Error(response.error)
      return response.data
    },
  })
  const workflowsQuery = useQuery({
    queryKey: ['delegation-workflows'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const response = await workflowsApiV6.getWorkflows()
      if (response.error) throw new Error(String(response.error))
      return mapPublishedWorkflowListToOptions(response.data)
    },
  })

  const userName = (id: string) => {
    const user = usersQuery.data?.find((item) => item.id === id)
    return user?.displayName || user?.email || id || '-'
  }
  const userRole = (id: string) =>
    usersQuery.data?.find((item) => item.id === id)?.role || ''
  const workflowName = (id: string) =>
    workflowsQuery.data?.find((item) => String(item.id) === id)?.name || id

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return delegations
      .filter((item) => {
        if (
          statusFilter !== 'all' &&
          getDelegationStatus(item) !== statusFilter
        )
          return false
        if (!needle) return true
        const text = [
          userName(item.assigneeUserId),
          ...item.delegations.map(
            (row) =>
              `${userName(row.delegateUserId)} ${workflowName(row.workflowId)}`,
          ),
        ]
          .join(' ')
          .toLowerCase()
        return text.includes(needle)
      })
      .sort(
        (a, b) =>
          STATUS_ORDER[getDelegationStatus(a)] -
            STATUS_ORDER[getDelegationStatus(b)] ||
          (a.fromDate || '').localeCompare(b.fromDate || ''),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delegations, query, statusFilter, usersQuery.data, workflowsQuery.data])

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: DELEGATIONS_KEY })
  const showError = (error: Error) =>
    showToast({ message: error.message, variant: 'error' })

  const saveMutation = useMutation({
    mutationFn: (item: Delegation) =>
      editing?.id ? updateDelegation(editing.id, item) : createDelegation(item),
    onError: showError,
    onSuccess: (saved) => {
      void refreshList()
      setEditing(undefined)
      showToast({
        message: saved.isDraft
          ? t`Saved as draft`
          : editing?.id
            ? t`Delegation updated`
            : t`Delegation created`,
        variant: 'success',
      })
    },
  })
  const duplicateMutation = useMutation({
    mutationFn: (item: Delegation) =>
      createDelegation({ ...item, fromDate: '', isDraft: true, toDate: '' }),
    onError: showError,
    onSuccess: () => {
      void refreshList()
      showToast({
        message: t`Copied as a draft — set new dates to activate`,
        variant: 'success',
      })
    },
  })
  const endMutation = useMutation({
    mutationFn: (item: Delegation) => endDelegation(item.id),
    onError: showError,
    onSuccess: (ended) => {
      void refreshList()
      showToast({
        message: t`Delegation ended — open requests return to ${userName(ended.assigneeUserId)}`,
        variant: 'success',
      })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (item: Delegation) => deleteDelegation(item.id),
    onError: showError,
    onSuccess: () => {
      void refreshList()
      setDeleting(null)
      showToast({ message: t`Delegation deleted`, variant: 'success' })
    },
  })
  const rowBusy = (id: string) =>
    [duplicateMutation, endMutation, deleteMutation].some(
      (mutation) => mutation.isPending && mutation.variables?.id === id,
    )

  if (editing !== undefined) {
    return (
      <DelegationWizard
        existing={delegations}
        initial={editing}
        isSaving={saveMutation.isPending}
        onBackToSettings={onBack}
        onCancel={() => setEditing(undefined)}
        onSave={(item) => saveMutation.mutate(item)}
      />
    )
  }

  const count = (status: DelegationStatus) =>
    delegations.filter((item) => getDelegationStatus(item) === status).length

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-1'>
      <SettingsPageHeader
        title={t`Delegations`}
        actions={
          <SettingsHeaderAddButton
            tooltip={t`New Delegation`}
            onClick={() => setEditing(null)}
          />
        }
        leading={
          <div className='flex flex-wrap items-center gap-2'>
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type='button'
                className={cn(
                  'h-8 rounded-full border px-3.5 text-13 font-medium transition-colors active:scale-95',
                  statusFilter === status
                    ? 'border-primary-9 bg-primary-2 text-primary-11'
                    : 'border-gray-5 bg-surface text-gray-11 hover:border-primary-7',
                )}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? t`All` : status}
                {status !== 'all' && count(status) ? ` (${count(status)})` : ''}
              </button>
            ))}
          </div>
        }
        toolbar={
          <div className='flex w-full items-center gap-2 sm:w-auto'>
            <label className='flex h-9 w-full items-center gap-2 rounded-lg border border-gray-5 bg-surface px-3 focus-within:border-primary-8 sm:w-64'>
              <Icon
                className='size-4 shrink-0 text-gray-9'
                name='tabler:search'
              />
              <input
                aria-label={t`Search delegations`}
                className='min-w-0 flex-1 bg-transparent text-13 text-gray-13 outline-none placeholder:text-gray-8'
                placeholder={t`Search assignee, delegate…`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Tooltip content={t`Refresh`} position='top'>
              <button
                aria-label={t`Refresh delegations`}
                className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-5 bg-surface text-gray-11 transition-colors hover:border-primary-7 hover:text-primary-11 active:scale-95 disabled:opacity-60'
                disabled={delegationsQuery.isFetching}
                type='button'
                onClick={() => void refreshNow()}
              >
                <Icon
                  name='tabler:refresh'
                  className={cn(
                    'size-4',
                    delegationsQuery.isFetching && 'animate-spin',
                  )}
                />
              </button>
            </Tooltip>
          </div>
        }
        onBack={onBack}
      />

      <div className='flex min-h-0 flex-1 flex-col p-4'>
        {/* Fills the page; rows scroll inside under a sticky header. */}
        <div className='ez-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-gray-4 bg-surface'>
          <div className='flex min-h-full min-w-[860px] flex-col'>
            <div className='sticky top-0 z-10 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_56px] items-center gap-3 border-b border-gray-4 bg-gray-2 px-5 py-3 text-13 font-medium text-gray-11'>
              <span>{t`Assignee`}</span>
              <span>{t`Delegated To`}</span>
              <span>{t`Workflows`}</span>
              <span>{t`Absence Period`}</span>
              <span>{t`Status`}</span>
              <span />
            </div>
            {delegationsQuery.isLoading || refreshing ? (
              <div aria-busy='true' className='flex flex-col'>
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    className='grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_56px] items-center gap-3 border-b border-gray-3 px-5 py-4'
                    key={index}
                  >
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-4 w-28' />
                    <Skeleton className='h-5 w-36 rounded-md' />
                    <Skeleton className='h-4 w-28' />
                    <Skeleton className='h-5 w-20 rounded-full' />
                    <span />
                  </div>
                ))}
              </div>
            ) : delegationsQuery.isError ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center'>
                <span className='flex size-12 items-center justify-center rounded-full bg-red-2 text-red-11'>
                  <Icon className='size-5' name='tabler:alert-triangle' />
                </span>
                <p className='text-14 font-semibold text-gray-13'>
                  {t`We couldn't load delegations.`}
                </p>
                <p className='max-w-sm text-13 text-gray-10'>
                  {delegationsQuery.error?.message}
                </p>
                <Button
                  icon='tabler:refresh'
                  label={t`Retry`}
                  size='sm'
                  variant='outline'
                  onClick={() => void delegationsQuery.refetch()}
                />
              </div>
            ) : visible.length === 0 ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center'>
                <span className='flex size-12 items-center justify-center rounded-full bg-primary-2 text-primary-11'>
                  <Icon className='size-5' name='tabler:user-share' />
                </span>
                <p className='text-14 font-semibold text-gray-13'>
                  {delegations.length
                    ? t`No delegations found`
                    : t`No delegations yet`}
                </p>
                <p className='max-w-sm text-13 text-gray-10'>
                  {delegations.length
                    ? t`Try clearing the filters or search.`
                    : t`Choose backup users so workflow requests keep moving while someone is on leave.`}
                </p>
              </div>
            ) : (
              visible.map((item) => {
                const status = getDelegationStatus(item)
                const delegates = Array.from(
                  new Set(
                    item.delegations
                      .map((row) => row.delegateUserId)
                      .filter(Boolean),
                  ),
                )
                const days = countDays(item.fromDate, item.toDate)
                const finished = status === 'Completed' || status === 'Ended'
                return (
                  <div
                    className='grid cursor-pointer grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_56px] items-center gap-3 border-b border-gray-3 px-5 py-3 text-13 transition-colors hover:bg-gray-2'
                    key={item.id}
                    role='button'
                    tabIndex={0}
                    onClick={() => setEditing(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setEditing(item)
                    }}
                  >
                    <span className='flex min-w-0 items-center gap-2.5'>
                      <UserAvatar
                        id={item.assigneeUserId}
                        name={userName(item.assigneeUserId)}
                      />
                      <span className='min-w-0'>
                        <span className='block truncate font-medium text-gray-13'>
                          {userName(item.assigneeUserId)}
                        </span>
                        {userRole(item.assigneeUserId) ? (
                          <span className='block truncate text-12 text-gray-10'>
                            {userRole(item.assigneeUserId)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {delegates.length ? (
                      <span className='flex min-w-0 items-center gap-2.5'>
                        {/* Up to three overlapping avatars */}
                        <span className='flex shrink-0 -space-x-2'>
                          {delegates.slice(0, 3).map((id) => (
                            <UserAvatar id={id} key={id} name={userName(id)} />
                          ))}
                        </span>
                        <span className='min-w-0'>
                          <span className='block truncate font-medium text-gray-13'>
                            {userName(delegates[0])}
                            {delegates.length > 1
                              ? ` +${delegates.length - 1}`
                              : ''}
                          </span>
                          <span className='block truncate text-12 text-gray-10'>
                            {delegates.length > 1
                              ? delegates.slice(1).map(userName).join(', ')
                              : userRole(delegates[0])}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className='text-gray-8'>{t`Not set`}</span>
                    )}
                    <span className='flex min-w-0 gap-1.5 overflow-hidden'>
                      {item.delegations[0]?.workflowId ? (
                        <span className='truncate rounded-md bg-secondary-3 px-2 py-0.5 font-medium text-secondary-11'>
                          {workflowName(item.delegations[0].workflowId)}
                        </span>
                      ) : null}
                      {item.delegations.length > 1 ? (
                        <span className='shrink-0 rounded-md bg-gray-3 px-2 py-0.5 font-medium text-gray-11'>
                          +{item.delegations.length - 1}
                        </span>
                      ) : null}
                    </span>
                    <span className='text-gray-12'>
                      {item.fromDate ? (
                        <>
                          {formatShortDay(item.fromDate)} –{' '}
                          {formatDay(item.toDate)}
                          <span className='block text-12 text-gray-10'>
                            {t`${days.all} days · ${days.working} working`}
                          </span>
                        </>
                      ) : (
                        <span className='text-gray-8'>{t`Dates not set`}</span>
                      )}
                    </span>
                    <span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-12 font-medium',
                          STATUS_TONE[status],
                        )}
                      >
                        <span className='size-1.5 rounded-full bg-current' />
                        {status}
                      </span>
                    </span>
                    <span
                      className='flex justify-end'
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Menu
                        position='bottom-end'
                        width={200}
                        withinPortal
                        target={
                          <button
                            aria-label={t`More actions`}
                            className='flex size-8 items-center justify-center rounded-lg text-gray-11 transition-colors hover:bg-gray-3 active:scale-95 disabled:opacity-50 aria-expanded:bg-gray-4'
                            disabled={rowBusy(item.id)}
                            type='button'
                          >
                            <Icon
                              className='size-[18px]'
                              name={
                                rowBusy(item.id)
                                  ? 'tabler:loader-2'
                                  : 'tabler:dots-vertical'
                              }
                            />
                          </button>
                        }
                      >
                        <MenuItem
                          icon={finished ? 'tabler:eye' : 'tabler:edit'}
                          label={finished ? t`View details` : t`Edit`}
                          onClick={() => setEditing(item)}
                        />
                        <MenuItem
                          icon='tabler:copy'
                          label={t`Duplicate`}
                          onClick={() => duplicateMutation.mutate(item)}
                        />
                        {status === 'Active' ? (
                          <MenuItem
                            icon='tabler:player-stop'
                            label={t`End delegation now`}
                            onClick={() => endMutation.mutate(item)}
                          />
                        ) : null}
                        <MenuItem
                          className='text-red-11'
                          icon='tabler:trash'
                          iconClass='text-red-11'
                          label={t`Delete`}
                          onClick={() => setDeleting(item)}
                        />
                      </Menu>
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className='flex shrink-0 justify-between px-1 pt-3 text-12 text-gray-10'>
          <span>{t`Showing ${visible.length} of ${delegations.length}`}</span>
          <span>
            {t`${count('Active')} active · ${count('Scheduled')} scheduled`}
          </span>
        </div>
      </div>
      <ConfirmDialog
        confirmLabel={t`Delete`}
        isConfirming={deleteMutation.isPending}
        opened={Boolean(deleting)}
        title={t`Delete delegation`}
        variant='danger'
        description={
          deleting
            ? t`Delete the delegation for ${userName(deleting.assigneeUserId)}? Requests stop routing to the delegate.`
            : ''
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting)
        }}
      />
    </div>
  )
}

function UserAvatar({
  className,
  id,
  name,
}: {
  className?: string
  id: string
  name: string
}) {
  return (
    <span
      title={name}
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-11 font-semibold ring-2 ring-surface',
        avatarTone(id || name),
        className,
      )}
    >
      {initialsOf(name) || '?'}
    </span>
  )
}
