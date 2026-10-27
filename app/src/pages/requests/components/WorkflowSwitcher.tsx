import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import Popover from '@/components/base/Popover'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import {
  countOverdue,
  useAllWorkflowsInbox,
} from '../hooks/useAllWorkflowsInbox'
import { workflowDotClass } from '../utils/workflowColors'

type WorkflowSwitcherProps = {
  isAllWorkflows: boolean
  value: Option | null
  workflows: Option[]
  onSelect: (workflow: Option) => void
  onSelectAll: () => void
}

/**
 * Workflow picker for the Requests page: "All Workflows" (the inbox across
 * every workflow) plus each workflow, with the user's open-request counts
 * from GET /Workflows/inbox/all-workflows.
 */
export default function WorkflowSwitcher({
  isAllWorkflows,
  value,
  workflows,
  onSelect,
  onSelectAll,
}: WorkflowSwitcherProps) {
  const { t } = useLingui()
  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const inbox = useAllWorkflowsInbox()

  const countById = useMemo(() => {
    const map = new Map<string, { overdue: number; total: number }>()
    inbox.data?.workflows.forEach((group) =>
      map.set(String(group.workflowId), {
        overdue: countOverdue(group),
        total: group.totalCount,
      }),
    )
    return map
  }, [inbox.data])
  const overdueTotal = useMemo(
    () =>
      Array.from(countById.values()).reduce(
        (sum, entry) => sum + entry.overdue,
        0,
      ),
    [countById],
  )
  const selectedOverdue = isAllWorkflows
    ? overdueTotal
    : (countById.get(String(value?.id))?.overdue ?? 0)
  const selectedTotal = isAllWorkflows
    ? (inbox.data?.totalCount ?? 0)
    : (countById.get(String(value?.id))?.total ?? 0)

  const needle = query.trim().toLowerCase()
  const visible = workflows.filter(
    (workflow) =>
      !needle ||
      String(workflow.name || '')
        .toLowerCase()
        .includes(needle),
  )
  const showAll = !needle || t`All Workflows`.toLowerCase().includes(needle)

  const close = () => {
    setOpened(false)
    setQuery('')
  }

  const countBadge = (count: number | undefined, overdue = 0) =>
    inbox.isLoading ? (
      <span className='h-3 w-5 animate-pulse rounded bg-gray-4' />
    ) : (
      <span className='flex shrink-0 items-center gap-2'>
        {overdue > 0 ? (
          <span className='rounded-full bg-orange-2 px-1.5 py-px text-[11px] font-semibold whitespace-nowrap text-orange-11'>
            {t`${overdue} earlier`}
          </span>
        ) : null}
        <span className='min-w-5 text-right text-12 font-medium text-gray-10 tabular-nums'>
          {count ?? 0}
        </span>
      </span>
    )

  return (
    <Popover
      opened={opened}
      position='bottom-end'
      width={340}
      target={
        <button
          aria-expanded={opened}
          aria-haspopup='listbox'
          type='button'
          className={cn(
            'flex h-9 w-[240px] items-center gap-2 rounded-lg border bg-surface px-3 text-13 text-gray-13 transition-colors hover:border-primary-7 active:scale-[0.99]',
            opened ? 'border-primary-8' : 'border-gray-4',
          )}
          onClick={() => (opened ? close() : setOpened(true))}
        >
          {isAllWorkflows || !value ? (
            <Icon className='size-4 shrink-0 text-gray-10' name='tabler:apps' />
          ) : (
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                workflowDotClass(value.id),
              )}
            />
          )}
          <span className='min-w-0 flex-1 truncate text-left font-medium'>
            {isAllWorkflows ? t`All Workflows` : value?.name || t`Select`}
          </span>
          {selectedTotal > 0 ? (
            <Tooltip
              position='bottom'
              content={
                selectedOverdue > 0
                  ? t`${selectedTotal} open · ${selectedOverdue} earlier — not yet actioned`
                  : t`${selectedTotal} open`
              }
            >
              <span className='shrink-0 rounded-full bg-gray-3 px-1.5 py-px text-[11px] font-bold text-gray-11 tabular-nums'>
                {selectedTotal}
              </span>
            </Tooltip>
          ) : null}
          <Icon
            name='tabler:chevron-down'
            className={cn(
              'size-4 shrink-0 text-gray-9 transition-transform',
              opened && 'rotate-180',
            )}
          />
        </button>
      }
      onChange={(next) => (next ? setOpened(true) : close())}
    >
      <div className='flex flex-col'>
        <label className='flex items-center gap-2 border-b border-gray-3 p-1.5'>
          <span className='flex size-7 items-center justify-center rounded-md bg-primary-2 text-primary-11'>
            <Icon className='size-4' name='tabler:search' />
          </span>
          <input
            aria-label={t`Search workflows`}
            className='min-w-0 flex-1 bg-transparent text-13 text-gray-13 outline-none placeholder:text-gray-8'
            placeholder={t`Search`}
            value={query}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div
          className='ez-scrollbar max-h-[360px] overflow-y-auto py-1'
          role='listbox'
        >
          {showAll ? (
            <SwitcherOption
              selected={isAllWorkflows}
              subtitle={t`My Inbox — everything waiting on you`}
              title={t`All Workflows`}
              trailing={countBadge(inbox.data?.totalCount, overdueTotal)}
              onClick={() => {
                close()
                onSelectAll()
              }}
            />
          ) : null}
          {visible.length ? (
            <>
              {showAll ? <div className='my-1 h-px bg-gray-3' /> : null}
              <p className='px-3.5 pt-1.5 pb-0.5 text-[11px] font-semibold tracking-wider text-gray-9 uppercase'>
                {t`Workflows`}
              </p>
              {visible.map((workflow) => (
                <SwitcherOption
                  dotClass={workflowDotClass(workflow.id)}
                  key={workflow.id}
                  title={String(workflow.name || '')}
                  selected={
                    !isAllWorkflows && String(value?.id) === String(workflow.id)
                  }
                  trailing={countBadge(
                    countById.get(String(workflow.id))?.total,
                    countById.get(String(workflow.id))?.overdue,
                  )}
                  onClick={() => {
                    close()
                    onSelect(workflow)
                  }}
                />
              ))}
            </>
          ) : !showAll ? (
            <p className='px-3.5 py-4 text-center text-13 text-gray-10'>
              {t`No workflows found`}
            </p>
          ) : null}
        </div>
      </div>
    </Popover>
  )
}

function SwitcherOption({
  dotClass,
  selected,
  subtitle,
  title,
  trailing,
  onClick,
}: {
  dotClass?: string
  selected: boolean
  subtitle?: string
  title: string
  trailing: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      aria-selected={selected}
      role='option'
      type='button'
      className={cn(
        'flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-primary-1 active:bg-primary-2',
        selected && 'bg-primary-1',
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]',
          selected ? 'border-primary-9 bg-primary-9' : 'border-gray-6',
        )}
      >
        {selected ? <span className='size-1.5 rounded-full bg-white' /> : null}
      </span>
      {dotClass ? (
        <span className={cn('size-2 shrink-0 rounded-full', dotClass)} />
      ) : null}
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-13 font-medium text-gray-13'>
          {title}
        </span>
        {subtitle ? (
          <span className='block truncate text-11 text-gray-10'>
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing}
    </button>
  )
}
