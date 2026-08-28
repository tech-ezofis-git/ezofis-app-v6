import { useLingui } from '@lingui/react/macro'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import { AnimateSlideUp, AnimateStagger } from '@/components/common/animations'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import type {
  PortalSubmission,
  PortalSubmissionStatus,
} from '../helpers/portalSubmissions'
import {
  portalWorkflowIcon,
  portalWorkflowKind,
  type PortalWorkflowSummary,
  workflowDescriptionFallback,
} from '../helpers/portalWorkflows'
import {
  PortalStatCardsSkeleton,
  PortalSubmissionsTableSkeleton,
  PortalWorkflowCardsSkeleton,
} from './PortalLayoutSkeleton'

type PortalHomeProps = {
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
}

const STATUS_TONE: Record<PortalSubmissionStatus, { className: string }> = {
  'Action Required': { className: 'bg-orange-3 text-orange-11' },
  'Approved': { className: 'bg-green-3 text-green-11' },
  'Pending': { className: 'bg-yellow-3 text-yellow-11' },
  'Rejected': { className: 'bg-red-3 text-red-11' },
}

const StatusPill = ({ status }: { status: PortalSubmissionStatus }) => (
  <span
    className={cn(
      'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-12 font-medium',
      STATUS_TONE[status].className,
    )}
  >
    <span className='size-1.5 rounded-full bg-current' />
    {status}
  </span>
)

export default function PortalHome({
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
}: PortalHomeProps) {
  const { t } = useLingui()
  const [query, setQuery] = useState('')
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
      return { actionRequired, approved, pending, total }
    }
    return {
      actionRequired: submissions.filter(
        (row) => row.status === 'Action Required' || row.status === 'Rejected',
      ).length,
      approved: submissions.filter((row) => row.status === 'Approved').length,
      pending: submissions.filter((row) => row.status === 'Pending').length,
      total: submissions.length,
    }
  }, [showingWorkflows, submissions, workflows])

  const statCards = [
    {
      icon: 'lucide:file-text',
      iconClass: 'bg-primary-3 text-primary-11',
      label: t`Total submitted`,
      value: String(stats.total),
    },
    {
      icon: 'lucide:check-circle',
      iconClass: 'bg-green-3 text-green-11',
      label: t`Approved`,
      value: String(stats.approved),
    },
    {
      icon: 'lucide:clock',
      iconClass: 'bg-yellow-3 text-yellow-11',
      label: t`Pending`,
      value: String(stats.pending),
    },
    {
      icon: 'lucide:alert-circle',
      iconClass: 'bg-orange-3 text-orange-11',
      label: t`Action Required`,
      value: String(stats.actionRequired),
    },
  ]

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
      return [
        row.title,
        row.requestNo,
        row.status,
        row.amount,
        row.workflowName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [query, statusFilter, submissions])

  return (
    <div className='flex flex-col gap-5 sm:gap-6'>
      <AnimateSlideUp className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='min-w-0'>
          <p className='text-12 text-gray-9'>
            {t`Welcome back, ${displayName}.`}
          </p>
          <h1 className='mt-1 text-xl font-semibold text-gray-13 sm:text-2xl'>
            {t`My Submissions`}
          </h1>
          {/* <p className='mt-1 text-13 text-gray-10'>
            {t`Track the status of everything you've submitted.`}
          </p> */}
        </div>
        <Button
          className='w-full sm:w-auto'
          color='primary'
          icon='lucide:plus'
          label={t`New Submission`}
          size='lg'
          variant='solid'
          onClick={onNewSubmission}
        />
      </AnimateSlideUp>

      {loadingWorkflows || (loadingSubmissions && !showingWorkflows) ? (
        <PortalStatCardsSkeleton />
      ) : (
        <AnimateStagger
          className='grid grid-cols-2 gap-3 lg:grid-cols-4'
          staggerDelay={0.05}
        >
          {statCards.map((stat) => (
            <div
              className='flex items-center gap-3 rounded-xl border border-gray-4 bg-surface p-3.5 sm:p-4'
              key={stat.label}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg',
                  stat.iconClass,
                )}
              >
                <Icon className='size-4.5' name={stat.icon} />
              </span>
              <div className='min-w-0'>
                <div className='text-lg font-semibold text-gray-13'>
                  {stat.value}
                </div>
                <div className='truncate text-12 text-gray-10'>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
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
            <div className='w-full sm:max-w-64'>
              <InputText
                placeholder={t`Search workflows…`}
                value={query}
                leftSection={
                  <Icon className='size-4 text-gray-9' name='lucide:search' />
                }
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
                const kind = portalWorkflowKind(workflow.name)

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
                            {workflow.name}
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
                        workflowDescriptionFallback(workflow.name)}
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
          className='rounded-xl border border-gray-4 bg-surface p-4 sm:p-5'
          delay={0.1}
        >
          <div className='mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex min-w-0 items-start gap-2'>
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
            </div>
            <div className='flex w-full flex-col gap-2 sm:flex-row lg:max-w-md'>
              <div className='min-w-0 flex-1'>
                <InputText
                  placeholder={t`Search submissions…`}
                  value={query}
                  leftSection={
                    <Icon className='size-4 text-gray-9' name='lucide:search' />
                  }
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
            </div>
          </div>

          {loadingSubmissions ? (
            <PortalSubmissionsTableSkeleton />
          ) : filteredSubmissions.length === 0 ? (
            <div className='py-12 text-center text-13 text-gray-9'>
              {submissions.length
                ? t`No submissions match your search.`
                : t`No submissions yet. Start a new submission to see it here.`}
            </div>
          ) : (
            <div className='-mx-4 mt-4 overflow-x-auto sm:mx-0 sm:mt-0'>
              <table className='w-full min-w-[720px] border-collapse'>
                <thead>
                  <tr className='text-left text-11 font-semibold tracking-wide text-gray-9 uppercase'>
                    <th className='px-4 pb-3'>{t`Submission`}</th>
                    <th className='px-3 pb-3'>{t`Status`}</th>
                    <th className='px-3 pb-3'>{t`Submitted`}</th>
                    <th className='px-3 pb-3 text-right'>{t`Amount`}</th>
                    <th className='px-4 pb-3' />
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((row, index) => (
                    <motion.tr
                      animate={{ opacity: 1, y: 0 }}
                      className='cursor-pointer border-t border-gray-3 transition hover:bg-gray-2 active:bg-gray-3'
                      initial={{ opacity: 0, y: 8 }}
                      key={`${row.workflowId}-${row.id}`}
                      transition={{
                        delay: Math.min(index, 12) * 0.03,
                        duration: 0.3,
                      }}
                      onClick={() => onOpenSubmission(row)}
                    >
                      <td className='px-4 py-3.5'>
                        <div className='flex items-center gap-3'>
                          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-3 text-primary-11'>
                            <Icon className='size-4' name='lucide:file-text' />
                          </span>
                          <div className='min-w-0'>
                            <div className='truncate text-13 font-semibold text-gray-13'>
                              {row.title || row.requestNo}
                            </div>
                            {row.title && row.title !== row.requestNo ? (
                              <div className='truncate font-mono text-11 text-gray-9'>
                                {row.requestNo}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className='px-3 py-3.5'>
                        <StatusPill status={row.status} />
                      </td>
                      <td className='px-3 py-3.5 text-13 text-gray-10'>
                        {row.submittedAt
                          ? formatDatetime(row.submittedAt, 'D MMM YYYY')
                          : '—'}
                      </td>
                      <td className='px-3 py-3.5 text-right text-13 font-semibold text-gray-13'>
                        {row.amount}
                      </td>
                      <td className='px-4 py-3.5 text-gray-8'>
                        <Icon className='size-4' name='lucide:chevron-right' />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnimateSlideUp>
      )}
    </div>
  )
}
