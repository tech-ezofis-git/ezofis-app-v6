import { useLingui } from '@lingui/react/macro'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import { AnimateSlideUp, AnimateStagger } from '@/components/common/animations'
import cn from '@/utils/cn'
import {
  parseSubmissionFormData,
  type PortalSubmission,
} from '../helpers/portalSubmissions'
import {
  portalWorkflowIcon,
  portalWorkflowKind,
  portalWorkflowLabel,
  type PortalWorkflowSummary,
  workflowDescriptionFallback,
} from '../helpers/portalWorkflows'
import {
  PortalStatCardsSkeleton,
  PortalStatChipsSkeleton,
  PortalSubmissionsTableSkeleton,
  PortalWorkflowCardsSkeleton,
} from './PortalLayoutSkeleton'
import PortalSubmissionRow from './PortalSubmissionRow'

const flattenSearchableText = (value: unknown): string => {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.map(flattenSearchableText).join(' ')
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(flattenSearchableText)
      .join(' ')
  }
  return String(value)
}

type PortalHomeProps = {
  canCreateSubmission?: boolean
  displayName: string
  loadingSubmissions?: boolean
  loadingWorkflows?: boolean
  showWorkflowCards?: boolean
  submissions: PortalSubmission[]
  workflowName?: string
  workflows: PortalWorkflowSummary[]
  onBackToWorkflows?: () => void
  onNewSubmission: () => void
  onOpenSubmission: (submission: PortalSubmission) => void
  onOpenWorkflow: (workflowId: string) => void
  onRefreshSubmissions?: () => void | Promise<void>
}

export default function PortalHome({
  canCreateSubmission = true,
  displayName,
  loadingSubmissions,
  loadingWorkflows,
  showWorkflowCards,
  submissions,
  workflowName,
  workflows,
  onBackToWorkflows,
  onNewSubmission,
  onOpenSubmission,
  onOpenWorkflow,
  onRefreshSubmissions,
}: PortalHomeProps) {
  const { t } = useLingui()
  const [query, setQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (isRefreshing || !onRefreshSubmissions) return
    try {
      setIsRefreshing(true)
      await Promise.resolve(onRefreshSubmissions())
    } finally {
      setIsRefreshing(false)
    }
  }
  const showingWorkflows = Boolean(showWorkflowCards)
  const statusOptions = useMemo<Option[]>(
    () => [
      { id: 'all', name: t`All Status` },
      { id: 'Approved', name: t`Approved` },
      { id: 'Pending', name: t`Pending` },
      { id: 'Action Required', name: t`Action Required` },
      { id: 'Rejected', name: t`Rejected` },
    ],
    [t],
  )
  const [statusFilter, setStatusFilter] = useState<Option>(statusOptions[0])

  const stats = useMemo(() => {
    if (showingWorkflows) {
      const total = workflows.reduce((sum, row) => sum + row.total, 0)
      const approved = workflows.reduce(
        (sum, row) => sum + row.completedCount,
        0,
      )
      const pending = workflows.reduce((sum, row) => sum + row.sentCount, 0)
      const actionRequired = workflows.reduce(
        (sum, row) => sum + row.inboxCount,
        0,
      )
      return { actionRequired, approved, pending, rejected: null, total }
    }
    return {
      actionRequired: submissions.filter(
        (row) => row.status === 'Action Required',
      ).length,
      approved: submissions.filter((row) => row.status === 'Approved').length,
      pending: submissions.filter((row) => row.status === 'Pending').length,
      rejected: submissions.filter((row) => row.status === 'Rejected').length,
      total: submissions.length,
    }
  }, [showingWorkflows, submissions, workflows])

  const statCards = [
    {
      chipLabel: t`All`,
      dot: 'bg-primary-9',
      filterId: 'all',
      icon: 'lucide:file-text',
      iconWrap: 'bg-primary-3 text-primary-11',
      label: t`Total Submitted`,
      value: String(stats.total),
    },
    {
      chipLabel: t`Approved`,
      dot: 'bg-green-9',
      filterId: 'Approved',
      icon: 'lucide:check-circle',
      iconWrap: 'bg-green-3 text-green-11',
      label: t`Approved`,
      value: String(stats.approved),
    },
    {
      chipLabel: t`Pending`,
      dot: 'bg-yellow-9',
      filterId: 'Pending',
      icon: 'lucide:clock',
      iconWrap: 'bg-yellow-3 text-yellow-11',
      label: t`Pending`,
      value: String(stats.pending),
    },
    {
      chipLabel: t`Action Required`,
      dot: 'bg-orange-9',
      filterId: 'Action Required',
      icon: 'lucide:alert-circle',
      iconWrap: 'bg-orange-3 text-orange-11',
      label: t`Action Required`,
      value: String(stats.actionRequired),
    },
  ]
  // Phones: the stats double as the status filter chips, so Rejected (a
  // filter option without a stat card) gets a chip too
  const statChips =
    stats.rejected == null
      ? statCards
      : [
          ...statCards,
          {
            chipLabel: t`Rejected`,
            dot: 'bg-red-9',
            filterId: 'Rejected',
            icon: 'lucide:x-circle',
            iconWrap: 'bg-red-3 text-red-11',
            label: t`Rejected`,
            value: String(stats.rejected),
          },
        ]
  const loadingStats =
    loadingWorkflows || (loadingSubmissions && !showingWorkflows)

  const applyStatusFilter = (filterId: string) => {
    const next =
      statusOptions.find((option) => String(option.id) === filterId) ||
      statusOptions[0]
    setStatusFilter(next)
  }

  const filteredWorkflows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return workflows
    return workflows.filter((workflow) =>
      [workflow.name, workflow.description]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [query, workflows])

  const filteredSubmissions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const statusId = String(statusFilter.id)
    return submissions.filter((row) => {
      if (statusId !== 'all' && row.status !== statusId) return false
      if (!needle) return true
      const summaryMatch = [
        row.title,
        row.requestNo,
        row.status,
        row.amount,
        row.workflowName,
        row.raw.formEntryId,
        row.raw.stage,
        row.raw.createdByEmail,
        row.raw.transactionCreatedByEmail,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
      if (summaryMatch) return true
      return flattenSearchableText(parseSubmissionFormData(row.raw))
        .toLowerCase()
        .includes(needle)
    })
  }, [query, statusFilter, submissions])

  return (
    <div className='flex flex-col gap-[22px] max-md:gap-4 max-md:pb-24'>
      <AnimateSlideUp className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='min-w-0'>
          <p className='text-[13px] text-gray-9'>
            {t`Welcome back, ${displayName}.`}
          </p>
          <h1 className='mt-0.5 text-[22px] font-bold tracking-tight text-gray-13 sm:text-[25px]'>
            {t`My Submissions`}
          </h1>
          <p className='mt-1 text-[13px] text-gray-10 max-md:hidden sm:text-[14px]'>
            {t`Track the status of everything you've submitted.`}
          </p>
        </div>
        {canCreateSubmission ? (
          <Button
            className='max-md:hidden sm:w-auto'
            color='primary'
            icon='lucide:plus'
            label={t`New Submission`}
            size='lg'
            variant='solid'
            onClick={onNewSubmission}
          />
        ) : null}
      </AnimateSlideUp>

      {/* Phones: a sticky search bar with scrollable status chips that
          carry the stat counts, in place of the stat cards and the
          search/select row */}
      <AnimateSlideUp
        className='sticky top-14 z-20 -mx-4 flex flex-col gap-2.5 bg-gray-2/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 md:hidden'
        delay={0.05}
      >
        <InputText
          placeholder={
            showingWorkflows ? t`Search workflows…` : t`Search submissions…`
          }
          value={query}
          leftSection={<Icon className='size-4 text-gray-9' name='lucide:search' />}
          classNames={{
            input:
              '!h-11 !rounded-full !border-gray-3 !bg-surface !pl-10 !text-14 shadow-2xs transition focus:!border-primary-7',
            section: '!w-10',
          }}
          onChange={setQuery}
        />
        {loadingStats ? (
          <PortalStatChipsSkeleton />
        ) : (
          <div className='-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_80%,transparent)]'>
            {statChips.map((stat, index) => {
              const isActive = String(statusFilter.id) === stat.filterId
              return (
                <motion.button
                  animate={{ opacity: 1, x: 0 }}
                  aria-pressed={isActive}
                  initial={{ opacity: 0, x: 12 }}
                  key={stat.filterId}
                  transition={{ delay: 0.08 + index * 0.04, duration: 0.25 }}
                  type='button'
                  className={cn(
                    'inline-flex h-9 shrink-0 snap-start items-center gap-2 rounded-full border pr-1.5 pl-3 text-13 font-medium whitespace-nowrap transition-colors active:scale-95',
                    isActive
                      ? 'border-primary-9 bg-primary-9 text-text-on-accent'
                      : 'border-gray-4 bg-surface text-gray-11 hover:bg-gray-3 active:bg-gray-4',
                  )}
                  onClick={() => applyStatusFilter(stat.filterId)}
                >
                  {!isActive ? (
                    <span className={cn('size-1.5 rounded-full', stat.dot)} />
                  ) : null}
                  {stat.chipLabel}
                  <span
                    className={cn(
                      'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-12 font-semibold',
                      isActive
                        ? 'bg-surface text-primary-11'
                        : 'bg-gray-3 text-gray-12',
                    )}
                  >
                    {stat.value}
                  </span>
                </motion.button>
              )
            })}
          </div>
        )}
      </AnimateSlideUp>

      {loadingStats ? (
        <div className='max-md:hidden'>
          <PortalStatCardsSkeleton />
        </div>
      ) : (
        <AnimateStagger
          className='grid grid-cols-2 gap-2.5 max-md:hidden sm:gap-3.5 lg:grid-cols-4 [&>div]:w-full [&>div]:min-w-0'
          staggerDelay={0.05}
        >
          {statCards.map((stat) => {
            const isActive = String(statusFilter.id) === stat.filterId
            return (
              <button
                key={stat.label}
                type='button'
                className={cn(
                  'flex h-full w-full min-w-0 items-center gap-2.5 rounded-xl border bg-surface px-3 py-3 text-left transition sm:gap-3.5 sm:px-[18px] sm:py-4',
                  'hover:border-primary-6 active:scale-[0.99]',
                  isActive ? 'border-primary-7' : 'border-gray-4',
                )}
                onClick={() => applyStatusFilter(stat.filterId)}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-[10px] sm:size-[38px]',
                    stat.iconWrap,
                  )}
                >
                  <Icon className='size-[18px]' name={stat.icon} />
                </span>
                <div className='min-w-0'>
                  <div className='text-[19px] leading-none font-bold text-gray-13 sm:text-[22px]'>
                    {stat.value}
                  </div>
                  <div className='mt-[3px] truncate text-[11.5px] text-gray-10 sm:text-[12.5px]'>
                    {stat.label}
                  </div>
                </div>
              </button>
            )
          })}
        </AnimateStagger>
      )}

      {showingWorkflows ? (
        <>
          <AnimateSlideUp
            className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
            delay={0.08}
          >
            <div>
              <div className='text-15 font-semibold text-gray-13'>
                {t`Workflows`}
              </div>
              <div className='text-12 text-gray-9'>
                {t`Choose a workflow to view its submissions.`}
              </div>
            </div>
            <div className='w-full max-md:hidden sm:max-w-64'>
              <InputText
                placeholder={t`Search workflows…`}
                value={query}
                leftSection={
                  <Icon className='size-4 text-primary-11' name='lucide:search' />
                }
                leftSectionWidth={28}
                classNames={{
                  input: '!pl-8',
                  section: 'bg-primary-4 text-primary-11',
                }}
                onChange={setQuery}
              />
            </div>
          </AnimateSlideUp>

          {loadingWorkflows ? (
            <PortalWorkflowCardsSkeleton />
          ) : filteredWorkflows.length === 0 ? (
            <div className='rounded-xl border border-gray-4 bg-surface py-12 text-center text-13 text-gray-9'>
              {t`No workflows match your search.`}
            </div>
          ) : (
            <AnimateStagger
              className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
              staggerDelay={0.06}
            >
              {filteredWorkflows.map((workflow, index) => {
                const name = portalWorkflowLabel(workflow)
                const kind = portalWorkflowKind(name)

                return (
                  <button
                    key={workflow.id}
                    type='button'
                    className={cn(
                      'flex h-full w-full flex-col gap-3 rounded-xl border border-gray-4 bg-surface p-4 text-left shadow-2xs transition',
                      'hover:border-primary-6 hover:shadow-xs active:scale-[0.99]',
                    )}
                    onClick={() => {
                      setQuery('')
                      onOpenWorkflow(workflow.id)
                    }}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex min-w-0 items-start gap-3'>
                        <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-3 text-primary-11'>
                          <Icon
                            className='size-5'
                            name={portalWorkflowIcon(index)}
                          />
                        </span>
                        <div className='min-w-0 pt-1.5'>
                          <div className='truncate text-15 font-semibold text-gray-13'>
                            {name}
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-11 font-semibold tracking-wide uppercase',
                          kind === 'upload'
                            ? 'bg-green-3 text-green-11'
                            : 'bg-primary-3 text-primary-11',
                        )}
                      >
                        {kind === 'upload' ? t`Upload` : t`Form`}
                      </span>
                    </div>
                    <p className='line-clamp-2 min-h-10 text-13 text-gray-10'>
                      {workflow.description ||
                        workflowDescriptionFallback(name)}
                    </p>
                    <div className='mt-auto flex items-center justify-between border-t border-gray-3 pt-3'>
                      <span className='text-12 text-gray-9'>
                        {workflow.total} {t`submissions`}
                      </span>
                      <span className='inline-flex items-center text-13 font-semibold text-primary-11'>
                        {t`Open`}
                        <Icon
                          className='ml-1 size-4'
                          name='lucide:arrow-right'
                        />
                      </span>
                    </div>
                  </button>
                )
              })}
            </AnimateStagger>
          )}
        </>
      ) : (
        <AnimateSlideUp
          className='md:rounded-xl md:border md:border-gray-4 md:bg-surface md:p-5'
          delay={0.1}
        >
          <div className='mb-4 flex flex-col gap-3 max-md:mb-1 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex min-w-0 items-start gap-2 max-md:items-center'>
              {onBackToWorkflows ? (
                <button
                  className='mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-4 bg-surface text-gray-10 transition hover:bg-gray-3 hover:text-gray-13 active:scale-95'
                  type='button'
                  onClick={() => {
                    setQuery('')
                    setStatusFilter(statusOptions[0])
                    onBackToWorkflows()
                  }}
                >
                  <Icon className='size-4' name='lucide:arrow-left' />
                  <span className='sr-only'>{t`Back to workflows`}</span>
                </button>
              ) : null}
              <div className='min-w-0'>
                <div className='text-15 font-semibold text-gray-13'>
                  {t`All Submissions`}
                </div>
                <div className='text-12 text-gray-9'>
                  {filteredSubmissions.length} {t`of`} {submissions.length}{' '}
                  {t`submissions`}
                  {workflowName ? ` · ${workflowName}` : ''}
                </div>
              </div>
              {onRefreshSubmissions ? (
                <IconButton
                  ariaLabel={t`Refresh`}
                  className='ml-auto size-10 shrink-0 rounded-full transition active:scale-90 md:hidden'
                  color='gray'
                  disabled={loadingSubmissions || isRefreshing}
                  icon='tabler:refresh'
                  variant='ghost'
                  iconClass={
                    loadingSubmissions || isRefreshing
                      ? 'animate-spin'
                      : undefined
                  }
                  onClick={() => void handleRefresh()}
                />
              ) : null}
            </div>
            <div className='flex w-full flex-col gap-2 max-md:hidden sm:flex-row lg:max-w-md'>
              <div className='min-w-0 flex-1'>
                <InputText
                  placeholder={t`Search submissions…`}
                  value={query}
                  leftSection={
                    <Icon className='size-4 text-primary-11' name='lucide:search' />
                  }
                  leftSectionWidth={28}
                  classNames={{
                    input: '!pl-8',
                    section: 'bg-primary-4 text-primary-11',
                  }}
                  onChange={setQuery}
                />
              </div>
              <div className='w-full sm:w-48'>
                <InputSelect
                  options={statusOptions}
                  placeholder={t`All Status`}
                  value={statusFilter}
                  searchable
                  onChange={(selected) =>
                    setStatusFilter(selected || statusOptions[0])
                  }
                />
              </div>
              {onRefreshSubmissions ? (
                <IconButton
                  ariaLabel={t`Refresh`}
                  color='gray'
                  disabled={loadingSubmissions || isRefreshing}
                  icon='tabler:refresh'
                  size='md'
                  tooltip={t`Refresh`}
                  variant='outline'
                  iconClass={
                    loadingSubmissions || isRefreshing
                      ? 'animate-spin'
                      : undefined
                  }
                  onClick={() => void handleRefresh()}
                />
              ) : null}
            </div>
          </div>

          {loadingSubmissions ? (
            <PortalSubmissionsTableSkeleton />
          ) : filteredSubmissions.length === 0 ? (
            <div className='py-12 text-center text-13 text-gray-9'>
              {submissions.length
                ? t`No submissions match your search.`
                : canCreateSubmission
                  ? t`No submissions yet. Start a new submission to see it here.`
                  : t`No submissions yet.`}
            </div>
          ) : (
            <div className='mt-2 max-md:mt-0 max-md:flex max-md:flex-col max-md:gap-2.5'>
              {filteredSubmissions.map((row, index) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 8 }}
                  key={`${row.workflowId}-${row.id}`}
                  transition={{
                    delay: Math.min(index, 12) * 0.03,
                    duration: 0.3,
                  }}
                >
                  <PortalSubmissionRow
                    submission={row}
                    workflow={
                      workflows.find(
                        (workflow) => workflow.id === row.workflowId,
                      )?.workflow
                    }
                    onOpen={onOpenSubmission}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimateSlideUp>
      )}

      {/* Phones: New Submission as an extended floating action button */}
      {canCreateSubmission ? (
        <AnimateSlideUp
          className='fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-30 md:hidden'
          delay={0.2}
        >
          <Button
            className='h-14 rounded-full pr-6 pl-5 text-15 shadow-lg transition hover:shadow-xl active:scale-95'
            color='primary'
            icon='lucide:plus'
            label={t`New Submission`}
            size='lg'
            variant='solid'
            onClick={onNewSubmission}
          />
        </AnimateSlideUp>
      ) : null}
    </div>
  )
}
