import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { getUsers } from '@/api/v6/user'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
} from '@/api/v6/workflows'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
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
  todayIso,
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

/**
 * Settings › Delegations: list of delegations created in this session and a
 * wizard to create one. There is no delegation API yet, so saving logs the
 * delegation JSON to the console.
 */
export default function DelegationSettings({ onBack }: { onBack: () => void }) {
  const { t } = useLingui()
  const [delegations, setDelegations] = useState<Delegation[]>([])
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

  const upsert = (item: Delegation) =>
    setDelegations((prev) =>
      prev.some((existing) => existing.id === item.id)
        ? prev.map((existing) => (existing.id === item.id ? item : existing))
        : [item, ...prev],
    )

  if (editing !== undefined) {
    return (
      <DelegationWizard
        existing={delegations}
        initial={editing}
        onBackToSettings={onBack}
        onCancel={() => setEditing(undefined)}
        onSave={(item) => {
          // No delegation API yet: the saved JSON goes to the console.
          console.log('Delegation JSON', JSON.stringify(item, null, 2))
          upsert(item)
          setEditing(undefined)
          showToast({
            message: item.isDraft
              ? t`Saved as draft`
              : editing
                ? t`Delegation updated`
                : t`Delegation created`,
            variant: 'success',
          })
        }}
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
        }
        onBack={onBack}
      />

      <div className='flex min-h-0 flex-1 flex-col p-4'>
        {/* Fills the page; rows scroll inside under a sticky header. */}
        <div className='ez-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-gray-4 bg-surface'>
          <div className='flex min-h-full min-w-[860px] flex-col'>
            <div className='sticky top-0 z-10 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_120px] items-center gap-3 border-b border-gray-4 bg-gray-2 px-5 py-3 text-13 font-medium text-gray-11'>
              <span>{t`Assignee`}</span>
              <span>{t`Delegated To`}</span>
              <span>{t`Workflows`}</span>
              <span>{t`Absence Period`}</span>
              <span>{t`Status`}</span>
              <span />
            </div>
            {visible.length === 0 ? (
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
                    className='grid cursor-pointer grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_120px] items-center gap-3 border-b border-gray-3 px-5 py-3 text-13 transition-colors last:border-b-0 hover:bg-gray-2'
                    key={item.id}
                    role='button'
                    tabIndex={0}
                    onClick={() => setEditing(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setEditing(item)
                    }}
                  >
                    <span className='truncate font-medium text-gray-13'>
                      {userName(item.assigneeUserId)}
                    </span>
                    <span className='truncate text-gray-12'>
                      {delegates.length
                        ? delegates.map(userName).join(', ')
                        : t`Not set`}
                    </span>
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
                      className='flex justify-end gap-1'
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Tooltip content={finished ? t`View` : t`Edit`}>
                        <IconButton
                          ariaLabel={finished ? t`View` : t`Edit`}
                          color='gray'
                          icon={finished ? 'tabler:eye' : 'tabler:pencil'}
                          size='sm'
                          variant='ghost'
                          onClick={() => setEditing(item)}
                        />
                      </Tooltip>
                      <Tooltip content={t`Duplicate as draft`}>
                        <IconButton
                          ariaLabel={t`Duplicate as draft`}
                          color='gray'
                          icon='tabler:copy'
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            upsert({
                              ...item,
                              delegations: item.delegations.map((row) => ({
                                ...row,
                              })),
                              endedEarly: false,
                              fromDate: '',
                              id: `${Date.now()}`,
                              isDraft: true,
                              modifiedAt: dayjs().toISOString(),
                              toDate: '',
                            })
                          }
                        />
                      </Tooltip>
                      {status === 'Active' ? (
                        <Tooltip content={t`End delegation now`}>
                          <IconButton
                            ariaLabel={t`End delegation now`}
                            color='gray'
                            icon='tabler:player-stop'
                            size='sm'
                            variant='ghost'
                            onClick={() => {
                              const ended = {
                                ...item,
                                endedEarly: true,
                                modifiedAt: dayjs().toISOString(),
                                toDate: todayIso(),
                              }
                              console.log(
                                'Delegation JSON',
                                JSON.stringify(ended, null, 2),
                              )
                              upsert(ended)
                            }}
                          />
                        </Tooltip>
                      ) : null}
                      <Tooltip content={t`Delete`}>
                        <IconButton
                          ariaLabel={t`Delete`}
                          color='red'
                          icon='tabler:trash'
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            setDelegations((prev) =>
                              prev.filter((other) => other.id !== item.id),
                            )
                          }
                        />
                      </Tooltip>
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
    </div>
  )
}
