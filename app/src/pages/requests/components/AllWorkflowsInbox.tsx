import { useLingui } from '@lingui/react/macro'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { Option } from '@/types/option'
import workflowsApiV6, { type AllWorkflowsInboxGroup } from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Skeleton from '@/components/base/Skeleton'
import Tooltip from '@/components/base/Tooltip'
import { getDefaultShortName } from '@/pages/workflows/utils/workflowShortName'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import {
  ALL_WORKFLOWS_INBOX_KEY,
  countOverdue,
  useAllWorkflowsInbox,
} from '../hooks/useAllWorkflowsInbox'
import { transformProcess } from '../hooks/useInboxData'
import { loadOverviewWorkflow } from '../utils/requestOverviewLoader'
import { workflowDotClass } from '../utils/workflowColors'
import GenericGridCard from './GenericGridCard'
import WorkflowSwitcher from './WorkflowSwitcher'

type AllWorkflowsInboxProps = {
  /**
   * Open the first workflow when nothing is waiting anywhere. Off when the
   * user picked All Workflows themselves (they then see the empty page).
   */
  redirectWhenEmpty?: boolean
  workflows: Option[]
  onNewRequest: (workflow: Option) => void
  onOpenRequest: (workflowId: string, row: Record<string, any>) => void
  onOpenWorkflow: (workflow: Option) => void
}

/** When the row landed in the user's inbox. */
const receivedAt = (row: Record<string, any>) =>
  parseUtcDate(
    row.transactionCreatedAt ||
      row.createdAtUtc ||
      row.createdAt ||
      row.raisedAt ||
      row.startedAtUtc,
  )

const searchText = (row: Record<string, any>) =>
  [
    row.requestNo,
    row.referenceNumber,
    row.stage,
    row.stageName,
    row.transactionCreatedByEmail,
    row.createdByEmail,
    row.createdByName,
    typeof row.formData === 'string'
      ? row.formData
      : JSON.stringify(row.formData || ''),
  ]
    .join(' ')
    .toLowerCase()

/**
 * Requests landing page: everything waiting on the user, across every
 * workflow, grouped by workflow (GET /Workflows/inbox/all-workflows). Each
 * group splits into "New today" and "Earlier — not yet actioned"; a row opens
 * the request in its workflow.
 */
export default function AllWorkflowsInbox({
  redirectWhenEmpty = true,
  workflows,
  onNewRequest,
  onOpenRequest,
  onOpenWorkflow,
}: AllWorkflowsInboxProps) {
  const { t } = useLingui()
  const reduceMotion = useReducedMotion()
  const queryClient = useQueryClient()
  const inbox = useAllWorkflowsInbox()
  // Only the first workflow starts open; the user opens the others.
  const [expanded, setExpanded] = useState<Set<string> | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const groups = useMemo(() => inbox.data?.workflows || [], [inbox.data])
  const expandedIds = useMemo(
    () =>
      expanded ?? new Set(groups[0]?.workflowId ? [groups[0].workflowId] : []),
    [expanded, groups],
  )

  // Nothing waiting in any workflow: go straight to the first workflow.
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (
      !redirectWhenEmpty ||
      autoOpenedRef.current ||
      !inbox.isSuccess ||
      !workflows.length
    ) {
      return
    }
    if ((inbox.data?.totalCount ?? 0) > 0 || groups.length > 0) return
    autoOpenedRef.current = true
    onOpenWorkflow(workflows[0])
  }, [
    groups.length,
    inbox.data,
    inbox.isSuccess,
    onOpenWorkflow,
    redirectWhenEmpty,
    workflows,
  ])

  // "Open <short name>" uses each workflow's Short Name setting
  // (settings.general.shortName), else the first word of its name.
  const settingsQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['workflow-detail-short-name', group.workflowId],
      staleTime: 5 * 60_000,
      queryFn: async () => {
        const res = await workflowsApiV6.getWorkflowById(group.workflowId)
        const wf = res.data as {
          settings?: { general?: { shortName?: string } }
          workflowJson?: { settings?: { general?: { shortName?: string } } }
        } | null
        return String(
          wf?.settings?.general?.shortName ||
            wf?.workflowJson?.settings?.general?.shortName ||
            '',
        ).trim()
      },
    })),
  })
  const shortNameFor = (group: AllWorkflowsInboxGroup, index: number) =>
    settingsQueries[index]?.data ||
    getDefaultShortName(group.workflowName) ||
    group.workflowName
  const optionFor = (group: AllWorkflowsInboxGroup): Option =>
    workflows.find(
      (workflow) => String(workflow.id) === String(group.workflowId),
    ) || { id: group.workflowId, name: group.workflowName }

  // Workflow detail per open group, so cards show the same stage colors and
  // preview fields as the single-workflow list.
  const openGroupIds = groups
    .map((group) => group.workflowId)
    .filter((id) => expandedIds.has(id))
  const detailQueries = useQueries({
    queries: openGroupIds.map((workflowId) => ({
      queryKey: ['overview-workflow', workflowId],
      staleTime: 5 * 60_000,
      queryFn: () => loadOverviewWorkflow(workflowId),
    })),
  })
  const detailById = new Map(
    openGroupIds.map((id, index) => [
      id,
      detailQueries[index]?.data?.selectedWorkflow ?? null,
    ]),
  )

  const needle = deferredQuery.trim().toLowerCase()
  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          group,
          rows: needle
            ? group.items.filter((row) => searchText(row).includes(needle))
            : group.items,
        }))
        .filter(({ rows }) => !needle || rows.length > 0),
    [groups, needle],
  )

  const toggle = (workflowId: string) =>
    setExpanded(() => {
      const next = new Set(expandedIds)
      if (next.has(workflowId)) next.delete(workflowId)
      else next.add(workflowId)
      return next
    })

  const totalCount = inbox.data?.totalCount ?? 0

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      {/* Tabs + workflow switcher + New */}
      <div className='flex flex-wrap items-center justify-between gap-4 border-b border-gray-3 px-4'>
        <div className='-mb-px flex items-center gap-6'>
          <span className='border-b-2 border-primary-9 py-3.5 text-14 font-medium text-gray-13'>
            {inbox.isLoading ? t`Inbox` : t`Inbox (${totalCount})`}
          </span>
        </div>
        <div className='flex items-center gap-2 py-2'>
          <WorkflowSwitcher
            value={null}
            workflows={workflows}
            isAllWorkflows
            onSelect={onOpenWorkflow}
            onSelectAll={() => undefined}
          />
          <Menu
            position='bottom-end'
            width={260}
            withinPortal
            target={
              <Button
                disabled={!workflows.length}
                icon='tabler:plus'
                label={t`New`}
                size='lg'
              />
            }
          >
            <p className='px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-gray-9 uppercase'>
              {t`New request in`}
            </p>
            {workflows.map((workflow) => (
              <MenuItem
                key={workflow.id}
                label={String(workflow.name || '')}
                leftSection={
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      workflowDotClass(workflow.id),
                    )}
                  />
                }
                onClick={() => onNewRequest(workflow)}
              />
            ))}
          </Menu>
        </div>
      </div>

      <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-10'>
        {/* Search + refresh */}
        <div className='mb-4 flex items-center justify-end gap-2 rounded-xl border border-gray-3 bg-surface p-3'>
          <p className='mr-auto text-13 text-gray-10'>
            {/* {t`Everything waiting on you, grouped by workflow.`} */}
          </p>
          <AnimatePresence initial={false}>
            {searchOpen || query ? (
              <motion.label
                animate={{ opacity: 1, width: 240 }}
                className='flex h-9 items-center gap-2 overflow-hidden rounded-lg border border-gray-4 bg-surface px-2.5 focus-within:border-primary-8'
                exit={{ opacity: 0, width: 0 }}
                initial={reduceMotion ? false : { opacity: 0, width: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              >
                <Icon
                  className='size-4 shrink-0 text-gray-9'
                  name='tabler:search'
                />
                <input
                  aria-label={t`Search requests`}
                  className='min-w-0 flex-1 bg-transparent text-13 text-gray-13 outline-none placeholder:text-gray-8'
                  placeholder={t`Search requests…`}
                  value={query}
                  autoFocus
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query ? (
                  <button
                    aria-label={t`Clear search`}
                    className='text-gray-9 hover:text-gray-12'
                    type='button'
                    onClick={() => setQuery('')}
                  >
                    <Icon className='size-4' name='tabler:x' />
                  </button>
                ) : null}
              </motion.label>
            ) : null}
          </AnimatePresence>
          <Tooltip content={t`Search`} position='bottom'>
            <button
              aria-label={t`Search`}
              aria-pressed={searchOpen}
              type='button'
              className={cn(
                'flex size-9 items-center justify-center rounded-lg border bg-surface transition-colors hover:border-primary-7 active:scale-95',
                searchOpen
                  ? 'border-primary-8 text-primary-11'
                  : 'border-gray-4 text-gray-11',
              )}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Icon className='size-4' name='tabler:search' />
            </button>
          </Tooltip>
          <Tooltip content={t`Refresh`} position='bottom'>
            <button
              aria-label={t`Refresh`}
              className='flex size-9 items-center justify-center rounded-lg border border-gray-4 bg-surface text-gray-11 transition-colors hover:border-primary-7 active:scale-95 disabled:opacity-60'
              disabled={inbox.isFetching}
              type='button'
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: ALL_WORKFLOWS_INBOX_KEY,
                })
              }
            >
              <Icon
                className={cn('size-4', inbox.isFetching && 'animate-spin')}
                name='tabler:refresh'
              />
            </button>
          </Tooltip>
        </div>

        {inbox.isLoading ? (
          <div aria-busy='true' className='flex flex-col gap-4'>
            {[0, 1, 2].map((index) => (
              <div
                className='rounded-xl border border-gray-3 bg-surface p-4'
                key={index}
              >
                <div className='flex items-center gap-3'>
                  <Skeleton className='size-2.5 rounded-full' />
                  <Skeleton className='h-4 w-44' />
                  <Skeleton className='h-4 w-8 rounded-full' />
                </div>
                <div className='mt-4 space-y-2'>
                  <Skeleton className='h-16 w-full rounded-xl' />
                  <Skeleton className='h-16 w-full rounded-xl' />
                </div>
              </div>
            ))}
          </div>
        ) : inbox.isError ? (
          <div className='flex flex-col items-center gap-3 rounded-xl border border-gray-3 bg-surface px-6 py-12 text-center'>
            <span className='flex size-12 items-center justify-center rounded-full bg-red-2 text-red-11'>
              <Icon className='size-5' name='tabler:alert-triangle' />
            </span>
            <p className='text-14 font-semibold text-gray-13'>
              {t`We couldn't load your inbox.`}
            </p>
            <Button
              icon='tabler:refresh'
              label={t`Retry`}
              size='sm'
              variant='outline'
              onClick={() => void inbox.refetch()}
            />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className='flex flex-col items-center gap-2 rounded-xl border border-gray-3 bg-surface px-6 py-14 text-center'>
            <span className='flex size-12 items-center justify-center rounded-full bg-green-2 text-green-11'>
              <Icon className='size-6' name='tabler:checks' />
            </span>
            <p className='text-15 font-semibold text-gray-13'>
              {needle ? t`No requests match` : t`You're all caught up`}
            </p>
            <p className='text-13 text-gray-10'>
              {needle
                ? t`Try a different search.`
                : t`Nothing is waiting on you in any workflow.`}
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {filteredGroups.map(({ group, rows }, groupIndex) => {
              const isCollapsed = !expandedIds.has(group.workflowId)
              const sourceIndex = groups.indexOf(group)
              const overdueCount = countOverdue(group)
              const option = optionFor(group)
              const detail = detailById.get(group.workflowId) ?? null
              const cards = rows.map((raw, index) => ({
                raw,
                row: transformProcess(raw, 'Inbox', index, 'Inbox', detail),
              }))
              const today = cards.filter(({ raw }) => {
                const date = receivedAt(raw)
                return Boolean(date && dayjs(date).isSame(dayjs(), 'day'))
              })
              const earlier = cards.filter((card) => !today.includes(card))
              return (
                <motion.section
                  animate={{ opacity: 1, y: 0 }}
                  className='overflow-hidden rounded-xl border border-gray-3 bg-surface'
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  key={group.workflowId}
                  transition={{
                    delay: reduceMotion ? 0 : Math.min(groupIndex, 6) * 0.04,
                    duration: 0.2,
                  }}
                >
                  <div
                    aria-expanded={!isCollapsed}
                    role='button'
                    tabIndex={0}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 px-4 py-3 transition-colors select-none hover:bg-gray-1',
                      !isCollapsed && 'border-b border-gray-3',
                    )}
                    onClick={() => toggle(group.workflowId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggle(group.workflowId)
                      }
                    }}
                  >
                    <Icon
                      name='tabler:chevron-down'
                      className={cn(
                        'size-4 shrink-0 text-gray-9 transition-transform',
                        isCollapsed && '-rotate-90',
                      )}
                    />
                    <span
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        workflowDotClass(group.workflowId),
                      )}
                    />
                    <span className='truncate text-15 font-semibold text-gray-13'>
                      {group.workflowName || option.name}
                    </span>
                    <span className='rounded-full bg-gray-3 px-2 py-0.5 text-12 font-semibold text-gray-11'>
                      {group.totalCount}
                    </span>
                    {group.newTodayCount > 0 ? (
                      <span className='rounded-md bg-primary-2 px-2 py-0.5 text-12 font-semibold text-primary-11'>
                        {t`${group.newTodayCount} new today`}
                      </span>
                    ) : null}
                    {overdueCount > 0 ? (
                      <span className='rounded-md bg-red-2 px-2 py-0.5 text-12 font-semibold text-red-11'>
                        {t`${overdueCount} overdue`}
                      </span>
                    ) : null}
                    <button
                      className='ml-auto flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-13 font-semibold text-primary-11 transition-colors hover:bg-primary-2 active:scale-95'
                      type='button'
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenWorkflow(option)
                      }}
                    >
                      {t`${shortNameFor(group, sourceIndex)}`}
                      <Icon className='size-4' name='tabler:chevron-right' />
                    </button>
                  </div>
                  {isCollapsed ? null : (
                    <div className='bg-gray-1 px-3 pt-1 pb-3'>
                      {[
                        [t`New today`, today],
                        [t`Earlier — not yet actioned`, earlier],
                      ].map(([title, list]) =>
                        (list as typeof cards).length ? (
                          <div key={String(title)}>
                            <p className='mx-1 mt-3 mb-2 text-12 font-semibold tracking-wide text-gray-10 uppercase'>
                              {title as string}
                            </p>
                            <div className='flex flex-col gap-2'>
                              {(list as typeof cards).map(({ raw, row }) => (
                                <GenericGridCard
                                  row={row}
                                  workflow={detail}
                                  key={String(
                                    raw.transactionId ||
                                      raw.workflowInstanceId ||
                                      raw.processId ||
                                      raw.id,
                                  )}
                                  onRowClick={() =>
                                    onOpenRequest(group.workflowId, raw)
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        ) : null,
                      )}
                      {!needle && group.items.length < group.totalCount ? (
                        <div className='mt-2 flex justify-end'>
                          <button
                            className='group/more flex items-center gap-1 rounded-md px-2 py-1 text-13 font-semibold text-primary-11 transition-colors hover:bg-primary-2 active:scale-95'
                            type='button'
                            onClick={() => onOpenWorkflow(option)}
                          >
                            {t`Show more`}
                            <Icon
                              className='size-4 transition-transform duration-200 group-hover/more:translate-x-1'
                              name='tabler:arrow-right'
                            />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </motion.section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
