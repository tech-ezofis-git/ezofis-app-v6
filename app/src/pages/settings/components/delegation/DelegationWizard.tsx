import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useQueries, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { AnimatePresence } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getUsers } from '@/api/v6/user'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
} from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import { AnimateFadeIn } from '@/components/common/animations'
import { DELEGATION_GUIDES } from '@/constants/pageGuides'
import { extractWorkflowGraph } from '@/pages/requests/utils/workflow.utils'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import SettingsDateField from '../SettingsDateField'
import SettingsWizardLayout, {
  type SettingsWizardStep,
} from '../SettingsWizardLayout'
import {
  countDays,
  DATE_FORMAT,
  type Delegation,
  type DelegationEndAction,
  type DelegationRow,
  formatDay,
  formatShortDay,
  getDelegationStatus,
  getWorkflowStageOptions,
  isLiveDelegation,
  rangesOverlap,
  todayIso,
} from './delegationHelpers'

type DelegationWizardProps = {
  existing: Delegation[]
  initial?: Delegation | null
  onBackToSettings: () => void
  onCancel: () => void
  onSave: (delegation: Delegation) => void
}

const STEP_MSGS = [
  {
    description: msg`Who will be away`,
    icon: 'tabler:user',
    key: 'assignee' as const,
    title: msg`Assignee`,
  },
  {
    description: msg`Leave start and end`,
    icon: 'tabler:calendar',
    key: 'dates' as const,
    title: msg`Absence Dates`,
  },
  {
    description: msg`Backup user per workflow`,
    icon: 'tabler:users',
    key: 'delegates' as const,
    title: msg`Delegates`,
  },
  {
    description: msg`What happens to requests`,
    icon: 'tabler:route',
    key: 'actions' as const,
    title: msg`Actions`,
  },
  {
    description: msg`Confirm and save`,
    icon: 'tabler:checklist',
    key: 'review' as const,
    title: msg`Review`,
  },
]

const emptyRow = (): DelegationRow => ({
  delegateUserId: '',
  reason: '',
  stageId: '',
  workflowId: '',
})

export default function DelegationWizard({
  existing,
  initial,
  onBackToSettings,
  onCancel,
  onSave,
}: DelegationWizardProps) {
  const { i18n, t } = useLingui()
  const sessionEmail = authUserStore((state) =>
    String(state.session?.email || '').toLowerCase(),
  )
  const isEdit = Boolean(initial && !initial.isDraft)
  const readOnly = Boolean(
    initial && ['Completed', 'Ended'].includes(getDelegationStatus(initial)),
  )

  const [activeStep, setActiveStep] = useState(
    initial && !initial.isDraft ? 4 : 0,
  )
  const [showErrors, setShowErrors] = useState(false)
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeUserId || '')
  const [fromDate, setFromDate] = useState(initial?.fromDate || '')
  const [toDate, setToDate] = useState(initial?.toDate || '')
  const [rows, setRows] = useState<DelegationRow[]>(
    initial?.delegations.length
      ? initial.delegations.map((row) => ({ ...row }))
      : [emptyRow()],
  )
  const [sameDelegate, setSameDelegate] = useState(false)
  const [actions, setActions] = useState(
    initial?.actions || {
      notifyDelegates: true,
      redirectNewRequests: true,
      transferCurrentRequests: false,
    },
  )
  const [onPeriodEnd, setOnPeriodEnd] = useState<DelegationEndAction>(
    initial?.onPeriodEnd || 'RETURN_TO_ASSIGNEE',
  )

  const usersQuery = useQuery({
    queryKey: ['delegation-users'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const response = await getUsers()
      if (response.error) throw new Error(response.error)
      return response.data
    },
  })
  const users = useMemo(() => usersQuery.data || [], [usersQuery.data])

  const workflowsQuery = useQuery({
    queryKey: ['delegation-workflows'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const response = await workflowsApiV6.getWorkflows()
      if (response.error) throw new Error(String(response.error))
      return mapPublishedWorkflowListToOptions(response.data)
    },
  })
  const workflows = useMemo(
    () => workflowsQuery.data || [],
    [workflowsQuery.data],
  )

  // Default the assignee to the signed-in user once users load.
  const effectiveAssigneeId =
    assigneeId ||
    (initial
      ? ''
      : users.find((user) => user.email?.toLowerCase() === sessionEmail)?.id ||
        '')

  const userName = (id: string) => {
    const user = users.find((item) => item.id === id)
    return user?.displayName || user?.email || id
  }
  const workflowName = (id: string) =>
    workflows.find((item) => String(item.id) === id)?.name || id

  const selectedWorkflowIds = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.workflowId).filter(Boolean))),
    [rows],
  )
  const stageQueries = useQueries({
    queries: selectedWorkflowIds.map((workflowId) => ({
      queryKey: ['delegation-workflow-stages', workflowId],
      staleTime: 5 * 60_000,
      queryFn: async () => {
        const response = await workflowsApiV6.getWorkflowById(workflowId)
        return getWorkflowStageOptions(
          extractWorkflowGraph(response.data).blocks,
        )
      },
    })),
  })
  const stagesByWorkflow = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>()
    selectedWorkflowIds.forEach((id, index) => {
      map.set(id, stageQueries[index]?.data || [])
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflowIds, ...stageQueries.map((query) => query.data)])

  const otherLive = existing.filter(
    (item) => item.id !== initial?.id && isLiveDelegation(item),
  )
  const overlapping = otherLive.find(
    (item) =>
      item.assigneeUserId === effectiveAssigneeId &&
      rangesOverlap(fromDate, toDate, item.fromDate, item.toDate),
  )
  const awayLabel = (userId: string) => {
    const away = otherLive.find(
      (item) =>
        item.assigneeUserId === userId &&
        rangesOverlap(fromDate, toDate, item.fromDate, item.toDate),
    )
    return away
      ? t`On leave ${formatShortDay(away.fromDate)} – ${formatShortDay(away.toDate)}`
      : ''
  }

  const delegateOptions: Option[] = users
    .filter((user) => user.id !== effectiveAssigneeId)
    .map((user) => {
      const away = awayLabel(user.id)
      return {
        description: away || user.email,
        disabled: Boolean(away),
        id: user.id,
        name: user.displayName || user.email,
      }
    })

  const fromError =
    fromDate && !isEdit && fromDate < todayIso()
      ? t`Start date cannot be in the past.`
      : ''
  const toError =
    fromDate && toDate && toDate < fromDate
      ? t`End date must be on or after the start date.`
      : ''

  const stepValid = (step: number) => {
    if (step === 0) return Boolean(effectiveAssigneeId)
    if (step === 1) {
      return Boolean(
        fromDate && toDate && !fromError && !toError && !overlapping,
      )
    }
    if (step === 2) {
      return (
        rows.length > 0 &&
        rows.every((row) => row.workflowId && row.delegateUserId)
      )
    }
    return true
  }
  const firstInvalidStep = [0, 1, 2].find((step) => !stepValid(step))

  const buildDelegation = (isDraft: boolean): Delegation => ({
    actions,
    assigneeUserId: effectiveAssigneeId,
    delegations: rows
      .filter((row) => isDraft || (row.workflowId && row.delegateUserId))
      .map(({ delegateUserId, reason, stageId, workflowId }) => ({
        delegateUserId,
        reason: reason.trim(),
        stageId,
        workflowId,
      })),
    ...(initial?.endedEarly ? { endedEarly: true } : {}),
    fromDate,
    id: initial?.id || `${Date.now()}`,
    isDraft,
    modifiedAt: dayjs().toISOString(),
    toDate,
    onPeriodEnd,
  })

  const handleNext = () => {
    if (!stepValid(activeStep)) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    setActiveStep((step) => Math.min(step + 1, STEP_MSGS.length - 1))
  }

  const handleStepChange = (step: number) => {
    if (readOnly) {
      setActiveStep(step)
      return
    }
    const blocked = [0, 1, 2].find((index) => index < step && !stepValid(index))
    if (blocked !== undefined) {
      setActiveStep(blocked)
      setShowErrors(true)
      return
    }
    setActiveStep(step)
  }

  const handleSave = (isDraft: boolean) => {
    if (!isDraft && firstInvalidStep !== undefined) {
      setActiveStep(firstInvalidStep)
      setShowErrors(true)
      return
    }
    onSave(buildDelegation(isDraft))
  }

  const updateRow = (index: number, patch: Partial<DelegationRow>) =>
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )

  const steps: SettingsWizardStep[] = STEP_MSGS.map((step, index) => ({
    description: i18n._(step.description),
    guide: DELEGATION_GUIDES[step.key],
    icon: step.icon,
    id: index,
    label: i18n._(step.title),
  }))

  const dayCount = countDays(fromDate, toDate)
  const userOptions: Option[] = users.map((user) => ({
    description: user.email,
    id: user.id,
    name:
      user.email?.toLowerCase() === sessionEmail
        ? t`Myself — ${user.displayName || user.email}`
        : user.displayName || user.email,
  }))
  const quickRanges = [
    {
      from: dayjs().add(1, 'day'),
      label: t`Tomorrow`,
      to: dayjs().add(1, 'day'),
    },
    {
      from: dayjs().add(1, 'day'),
      label: t`Next 3 days`,
      to: dayjs().add(3, 'day'),
    },
    (() => {
      const monday = dayjs().add((8 - dayjs().day()) % 7 || 7, 'day')
      return {
        from: monday,
        label: t`Next week (Mon–Fri)`,
        to: monday.add(4, 'day'),
      }
    })(),
  ]

  const fieldError = (show: boolean, text: string) =>
    showErrors && show ? (
      <p className='mt-1 text-12 text-red-11'>{text}</p>
    ) : null

  return (
    <SettingsWizardLayout
      activeStep={activeStep}
      headerDescription={msg`Hand over workflow requests to backup users for specific dates and workflows.`}
      isNextHidden={readOnly && activeStep === STEP_MSGS.length - 1}
      moduleTitle={msg`Delegations`}
      saveLabel={isEdit ? t`Save changes` : t`Create delegation`}
      steps={steps}
      headerAction={
        !readOnly && !isEdit && activeStep === STEP_MSGS.length - 1 ? (
          <Button
            color='gray'
            label={t`Save as draft`}
            variant='outline'
            onClick={() => handleSave(true)}
          />
        ) : null
      }
      headerTitle={
        readOnly
          ? msg`Delegation Details`
          : isEdit
            ? msg`Edit Delegation`
            : msg`New Delegation`
      }
      setupTitle={
        readOnly
          ? msg`Delegation Details`
          : isEdit
            ? msg`Edit Delegation`
            : msg`New Delegation`
      }
      onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
      onBackToSettings={onBackToSettings}
      onCancel={onCancel}
      onNext={readOnly ? () => setActiveStep((step) => step + 1) : handleNext}
      onSave={() => handleSave(false)}
      onStepChange={handleStepChange}
    >
      <AnimatePresence initial={false} mode='wait'>
        {activeStep === 0 ? (
          <AnimateFadeIn className='flex flex-col gap-5' key='step-0'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <InputSelect
                  disabled={Boolean(initial)}
                  label={t`Current Assignee`}
                  loading={usersQuery.isLoading}
                  options={userOptions}
                  placeholder={t`Select a user…`}
                  required
                  searchable
                  description={
                    initial
                      ? t`The assignee cannot be changed on an existing delegation.`
                      : t`Defaults to you. Admins can set up delegation for any user.`
                  }
                  value={
                    userOptions.find(
                      (user) => user.id === effectiveAssigneeId,
                    ) || null
                  }
                  onChange={(option) => {
                    setAssigneeId(option ? String(option.id) : '')
                    setRows([emptyRow()])
                  }}
                />
                {fieldError(
                  !effectiveAssigneeId,
                  t`Select the user who will be away.`,
                )}
              </div>
            </div>
            {usersQuery.isError ? (
              <p className='text-13 text-red-11'>
                {t`We couldn't load users.`}{' '}
                <button
                  className='font-semibold underline'
                  type='button'
                  onClick={() => void usersQuery.refetch()}
                >
                  {t`Retry`}
                </button>
              </p>
            ) : null}
            {effectiveAssigneeId ? (
              <div className='flex items-center gap-3 rounded-lg border border-gray-4 bg-surface p-4'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-3 text-14 font-semibold text-primary-11 uppercase'>
                  {userName(effectiveAssigneeId).charAt(0)}
                </span>
                <div className='min-w-0'>
                  <p className='truncate text-14 font-semibold text-gray-13'>
                    {userName(effectiveAssigneeId)}
                  </p>
                  <p className='truncate text-12 text-gray-10'>
                    {
                      users.find((user) => user.id === effectiveAssigneeId)
                        ?.email
                    }
                  </p>
                </div>
              </div>
            ) : null}
            {effectiveAssigneeId &&
            otherLive.some(
              (item) => item.assigneeUserId === effectiveAssigneeId,
            ) ? (
              <WarningNote>
                {t`${userName(effectiveAssigneeId)} already has an active or scheduled delegation. New dates must not overlap it.`}
              </WarningNote>
            ) : null}
          </AnimateFadeIn>
        ) : null}

        {activeStep === 1 ? (
          <AnimateFadeIn className='flex flex-col gap-5' key='step-1'>
            {!readOnly ? (
              <div className='flex flex-wrap gap-2'>
                {quickRanges.map((range) => {
                  const from = range.from.format(DATE_FORMAT)
                  const to = range.to.format(DATE_FORMAT)
                  const active = from === fromDate && to === toDate
                  return (
                    <button
                      key={range.label}
                      type='button'
                      className={cn(
                        'h-8 rounded-full border px-3.5 text-13 font-medium transition-colors active:scale-95',
                        active
                          ? 'border-primary-9 bg-primary-2 text-primary-11'
                          : 'border-gray-5 bg-surface text-gray-11 hover:border-primary-7 hover:text-primary-11',
                      )}
                      onClick={() => {
                        setFromDate(from)
                        setToDate(to)
                      }}
                    >
                      {range.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <SettingsDateField
                  disabled={readOnly}
                  label={t`From Date`}
                  minDate={isEdit ? undefined : todayIso()}
                  value={fromDate}
                  required
                  onChange={(value) => {
                    setFromDate(value)
                    if (toDate && value && toDate < value) setToDate(value)
                  }}
                />
                {fromError ? (
                  <p className='mt-1 text-12 text-red-11'>{fromError}</p>
                ) : (
                  fieldError(!fromDate, t`Select a start date.`)
                )}
              </div>
              <div>
                <SettingsDateField
                  disabled={readOnly}
                  label={t`To Date`}
                  minDate={fromDate || (isEdit ? undefined : todayIso())}
                  value={toDate}
                  required
                  onChange={setToDate}
                />
                {toError ? (
                  <p className='mt-1 text-12 text-red-11'>{toError}</p>
                ) : (
                  fieldError(!toDate, t`Select an end date.`)
                )}
              </div>
            </div>
            {fromDate && toDate && !toError ? (
              <div className='flex items-center gap-3 rounded-lg bg-primary-2 px-4 py-3 text-13 text-primary-11'>
                <Icon className='size-4 shrink-0' name='tabler:calendar' />
                <span>
                  <b className='font-semibold'>
                    {formatDay(fromDate)} → {formatDay(toDate)}
                  </b>{' '}
                  · {t`${dayCount.all} days (${dayCount.working} working)`}
                </span>
              </div>
            ) : null}
            {overlapping ? (
              <WarningNote>
                {t`These dates overlap an existing delegation for ${userName(effectiveAssigneeId)} (${formatShortDay(overlapping.fromDate)} – ${formatDay(overlapping.toDate)}). Adjust the dates or edit that delegation instead.`}
              </WarningNote>
            ) : null}
          </AnimateFadeIn>
        ) : null}

        {activeStep === 2 ? (
          <AnimateFadeIn className='flex flex-col gap-4' key='step-2'>
            {!readOnly ? (
              <div className='flex flex-wrap items-center gap-3 rounded-lg border border-gray-4 bg-surface px-4 py-3'>
                <InputSwitch
                  checked={sameDelegate}
                  label={t`Use one delegate for all workflows`}
                  onChange={setSameDelegate}
                />
                {sameDelegate ? (
                  <div className='w-full sm:w-72'>
                    <InputSelect
                      options={delegateOptions}
                      placeholder={t`Select delegate…`}
                      searchable
                      value={
                        delegateOptions.find(
                          (user) => user.id === rows[0]?.delegateUserId,
                        ) || null
                      }
                      onChange={(option) =>
                        setRows((prev) =>
                          prev.map((row) => ({
                            ...row,
                            delegateUserId: option ? String(option.id) : '',
                          })),
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className='flex flex-col gap-3'>
              {rows.map((row, index) => {
                const stages = stagesByWorkflow.get(row.workflowId) || []
                const stageOptions: Option[] = [
                  { id: '', name: t`All stages` },
                  ...stages,
                ]
                const workflowOptions: Option[] = workflows
                  .filter(
                    (workflow) =>
                      String(workflow.id) === row.workflowId ||
                      !rows.some(
                        (other) => other.workflowId === String(workflow.id),
                      ),
                  )
                  .map((workflow) => ({
                    id: String(workflow.id),
                    name: workflow.name,
                  }))
                return (
                  <div
                    className='rounded-lg border border-gray-4 bg-surface p-4 transition-colors hover:border-gray-6'
                    key={index}
                  >
                    <div className='mb-3 flex items-center justify-between gap-2'>
                      <span className='text-12 font-semibold tracking-wide text-gray-10 uppercase'>
                        {t`Workflow ${index + 1}`}
                      </span>
                      {!readOnly && rows.length > 1 ? (
                        <IconButton
                          ariaLabel={t`Remove workflow`}
                          color='gray'
                          icon='tabler:trash'
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            setRows((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        />
                      ) : null}
                    </div>
                    <div className='grid gap-3 md:grid-cols-2'>
                      <div>
                        <InputSelect
                          disabled={readOnly}
                          label={t`Involved Workflow`}
                          loading={workflowsQuery.isLoading}
                          options={workflowOptions}
                          placeholder={t`Select workflow…`}
                          required
                          searchable
                          value={
                            workflowOptions.find(
                              (option) => option.id === row.workflowId,
                            ) || null
                          }
                          onChange={(option) =>
                            updateRow(index, {
                              stageId: '',
                              workflowId: option ? String(option.id) : '',
                            })
                          }
                        />
                        {fieldError(!row.workflowId, t`Select a workflow.`)}
                      </div>
                      <InputSelect
                        disabled={readOnly || !row.workflowId}
                        label={t`Workflow Stage`}
                        options={stageOptions}
                        searchable
                        value={
                          stageOptions.find(
                            (option) => option.id === row.stageId,
                          ) || stageOptions[0]
                        }
                        onChange={(option) =>
                          updateRow(index, {
                            stageId: option ? String(option.id) : '',
                          })
                        }
                      />
                      <div>
                        <InputSelect
                          disabled={readOnly || sameDelegate}
                          label={t`Alternative Assignee`}
                          options={delegateOptions}
                          placeholder={t`Select delegate…`}
                          required
                          searchable
                          value={
                            delegateOptions.find(
                              (option) => option.id === row.delegateUserId,
                            ) || null
                          }
                          onChange={(option) =>
                            updateRow(index, {
                              delegateUserId: option ? String(option.id) : '',
                            })
                          }
                        />
                        {fieldError(
                          !row.delegateUserId,
                          t`Select an alternative assignee.`,
                        )}
                      </div>
                      <InputText
                        disabled={readOnly}
                        label={t`Reason for Selection`}
                        placeholder={t`Optional note`}
                        value={row.reason}
                        onChange={(value) =>
                          updateRow(index, { reason: value })
                        }
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {!readOnly ? (
              <div>
                <Button
                  color='primary'
                  icon='lucide:plus'
                  label={t`Add workflow`}
                  variant='outline'
                  disabled={
                    rows.length >= workflows.length && workflows.length > 0
                  }
                  onClick={() =>
                    setRows((prev) => [
                      ...prev,
                      {
                        ...emptyRow(),
                        delegateUserId: sameDelegate
                          ? prev[0]?.delegateUserId || ''
                          : '',
                      },
                    ])
                  }
                />
              </div>
            ) : null}
            {workflowsQuery.isError ? (
              <p className='text-13 text-red-11'>
                {t`We couldn't load workflows.`}{' '}
                <button
                  className='font-semibold underline'
                  type='button'
                  onClick={() => void workflowsQuery.refetch()}
                >
                  {t`Retry`}
                </button>
              </p>
            ) : null}
          </AnimateFadeIn>
        ) : null}

        {activeStep === 3 ? (
          <AnimateFadeIn className='flex flex-col gap-6' key='step-3'>
            <div className='flex flex-col gap-2.5'>
              <h3 className='text-14 font-semibold text-gray-13'>
                {t`Workflow and request delegation action`}
              </h3>
              {(
                [
                  [
                    'redirectNewRequests',
                    t`Redirect new requests to the alternative assignee`,
                    t`Every request that arrives between ${formatShortDay(fromDate)} and ${formatShortDay(toDate)} goes straight to the delegate.`,
                  ],
                  [
                    'transferCurrentRequests',
                    t`Transfer current requests to the alternative assignee`,
                    t`Requests already in the assignee's inbox move to the delegate on ${formatShortDay(fromDate)}.`,
                  ],
                  [
                    'notifyDelegates',
                    t`Send a notification to the alternative assignee`,
                    t`Email and in-app notice with the dates and workflows they are covering.`,
                  ],
                ] as const
              ).map(([key, title, description]) => (
                <label
                  key={key}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
                    actions[key]
                      ? 'border-primary-7 bg-primary-1'
                      : 'border-gray-4 bg-surface hover:border-gray-6',
                  )}
                >
                  <InputCheckbox
                    checked={actions[key]}
                    className='mt-0.5'
                    disabled={readOnly}
                    onChange={(checked) =>
                      setActions((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                  <span className='min-w-0'>
                    <span className='block text-14 font-medium text-gray-13'>
                      {title}
                    </span>
                    <span className='block text-13 text-gray-10'>
                      {description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className='flex flex-col gap-2.5'>
              <h3 className='text-14 font-semibold text-gray-13'>
                {t`When the absence period ends`}
              </h3>
              <div className='grid gap-2.5 md:grid-cols-2'>
                {(
                  [
                    [
                      'RETURN_TO_ASSIGNEE',
                      t`Return to ${userName(effectiveAssigneeId)}`,
                      t`Unfinished requests go back to the original assignee.`,
                    ],
                    [
                      'KEEP_WITH_DELEGATE',
                      t`Keep with the delegate`,
                      t`The delegate completes anything already in progress.`,
                    ],
                  ] as const
                ).map(([value, title, description]) => (
                  <button
                    disabled={readOnly}
                    key={value}
                    type='button'
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors active:scale-[0.99]',
                      onPeriodEnd === value
                        ? 'border-primary-7 bg-primary-1'
                        : 'border-gray-4 bg-surface hover:border-gray-6',
                    )}
                    onClick={() => setOnPeriodEnd(value)}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                        onPeriodEnd === value
                          ? 'border-primary-9'
                          : 'border-gray-6',
                      )}
                    >
                      {onPeriodEnd === value ? (
                        <span className='size-1.5 rounded-full bg-primary-9' />
                      ) : null}
                    </span>
                    <span className='min-w-0'>
                      <span className='block text-14 font-medium text-gray-13'>
                        {title}
                      </span>
                      <span className='block text-13 text-gray-10'>
                        {description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </AnimateFadeIn>
        ) : null}

        {activeStep === 4 ? (
          <AnimateFadeIn className='flex flex-col gap-3' key='step-4'>
            <ReviewCard
              index={1}
              title={t`Assignee`}
              onEdit={readOnly ? undefined : () => setActiveStep(0)}
            >
              {userName(effectiveAssigneeId) || '-'}
            </ReviewCard>
            <ReviewCard
              index={2}
              title={t`Absence Dates`}
              onEdit={readOnly ? undefined : () => setActiveStep(1)}
            >
              {formatDay(fromDate)} → {formatDay(toDate)}{' '}
              <span className='text-gray-10'>
                · {t`${dayCount.all} days (${dayCount.working} working)`}
              </span>
            </ReviewCard>
            <ReviewCard
              index={3}
              title={t`Delegates`}
              onEdit={readOnly ? undefined : () => setActiveStep(2)}
            >
              <div className='flex flex-col divide-y divide-dashed divide-gray-4'>
                {rows.map((row, index) => (
                  <div
                    className='grid gap-1 py-2 first:pt-0 last:pb-0 md:grid-cols-3 md:gap-3'
                    key={index}
                  >
                    <span className='font-medium text-gray-13'>
                      {row.workflowId ? workflowName(row.workflowId) : '-'}
                      <span className='block text-12 font-normal text-gray-10'>
                        {stagesByWorkflow
                          .get(row.workflowId)
                          ?.find((stage) => stage.id === row.stageId)?.name ||
                          t`All stages`}
                      </span>
                    </span>
                    <span className='text-gray-12'>
                      {row.delegateUserId ? userName(row.delegateUserId) : '-'}
                    </span>
                    <span className='text-12 text-gray-10'>{row.reason}</span>
                  </div>
                ))}
              </div>
            </ReviewCard>
            <ReviewCard
              index={4}
              title={t`Actions`}
              onEdit={readOnly ? undefined : () => setActiveStep(3)}
            >
              <ReviewCheck on={actions.redirectNewRequests}>
                {t`Redirect new requests during leave`}
              </ReviewCheck>
              <ReviewCheck on={actions.transferCurrentRequests}>
                {t`Transfer current requests on ${formatShortDay(fromDate)}`}
              </ReviewCheck>
              <ReviewCheck on={actions.notifyDelegates}>
                {t`Notify alternative assignees`}
              </ReviewCheck>
              <ReviewCheck on>
                {onPeriodEnd === 'RETURN_TO_ASSIGNEE'
                  ? t`After leave: return unfinished requests to ${userName(effectiveAssigneeId)}`
                  : t`After leave: delegate keeps in-progress requests`}
              </ReviewCheck>
            </ReviewCard>
          </AnimateFadeIn>
        ) : null}
      </AnimatePresence>
    </SettingsWizardLayout>
  )
}

function ReviewCard({
  children,
  index,
  title,
  onEdit,
}: {
  children: React.ReactNode
  index: number
  title: string
  onEdit?: () => void
}) {
  const { t } = useLingui()
  return (
    <div className='overflow-hidden rounded-lg border border-gray-4 bg-surface'>
      <div className='flex items-center gap-2.5 border-b border-gray-4 bg-gray-2 px-4 py-2.5'>
        <span className='flex size-5 items-center justify-center rounded-full bg-primary-3 text-11 font-semibold text-primary-11'>
          {index}
        </span>
        <span className='text-14 font-semibold text-gray-13'>{title}</span>
        {onEdit ? (
          <button
            className='ml-auto text-13 font-semibold text-primary-11 hover:underline'
            type='button'
            onClick={onEdit}
          >
            {t`Edit`}
          </button>
        ) : null}
      </div>
      <div className='px-4 py-3 text-13 text-gray-12'>{children}</div>
    </div>
  )
}

function ReviewCheck({
  children,
  on,
}: {
  children: React.ReactNode
  on?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 py-0.5',
        on ? 'text-gray-12' : 'text-gray-8',
      )}
    >
      <Icon
        className={cn('size-4 shrink-0', on ? 'text-green-11' : 'text-gray-8')}
        name={on ? 'tabler:check' : 'tabler:x'}
      />
      {children}
    </div>
  )
}

function WarningNote({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex items-start gap-2.5 rounded-lg border border-orange-6 bg-orange-2 px-3.5 py-2.5 text-13 text-orange-11'>
      <Icon className='mt-0.5 size-4 shrink-0' name='tabler:alert-triangle' />
      <span>{children}</span>
    </div>
  )
}
