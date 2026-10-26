import dayjs from 'dayjs'

export type Delegation = {
  actions: {
    notifyDelegates: boolean
    redirectNewRequests: boolean
    transferCurrentRequests: boolean
  }
  assigneeUserId: string
  delegations: DelegationRow[]
  endedEarly?: boolean
  fromDate: string
  id: string
  isDraft: boolean
  modifiedAt: string
  onPeriodEnd: DelegationEndAction
  toDate: string
}

export type DelegationEndAction = 'KEEP_WITH_DELEGATE' | 'RETURN_TO_ASSIGNEE'

export type DelegationRow = {
  delegateUserId: string
  reason: string
  /** Empty = every stage of the workflow the assignee acts on. */
  stageId: string
  workflowId: string
}

export type DelegationStatus =
  | 'Active'
  | 'Completed'
  | 'Draft'
  | 'Ended'
  | 'Scheduled'

export const DATE_FORMAT = 'YYYY-MM-DD'

export const todayIso = () => dayjs().format(DATE_FORMAT)

export const getDelegationStatus = (item: Delegation): DelegationStatus => {
  if (item.isDraft) return 'Draft'
  if (item.endedEarly) return 'Ended'
  const today = todayIso()
  if (item.fromDate && today < item.fromDate) return 'Scheduled'
  if (item.toDate && today > item.toDate) return 'Completed'
  return 'Active'
}

/** Calendar days and Mon–Fri working days in [from, to]. */
export const countDays = (from: string, to: string) => {
  if (!from || !to || to < from) return { all: 0, working: 0 }
  let all = 0
  let working = 0
  for (
    let day = dayjs(from);
    !day.isAfter(dayjs(to), 'day');
    day = day.add(1, 'day')
  ) {
    all += 1
    if (day.day() !== 0 && day.day() !== 6) working += 1
  }
  return { all, working }
}

export const rangesOverlap = (
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
) => Boolean(aFrom && aTo && bFrom && bTo && aFrom <= bTo && bFrom <= aTo)

/** Delegations that still count (not draft / ended / finished). */
export const isLiveDelegation = (item: Delegation) =>
  !item.isDraft && !item.endedEarly && getDelegationStatus(item) !== 'Completed'

export const formatDay = (value: string) =>
  value ? dayjs(value).format('DD MMM YYYY') : '-'

export const formatShortDay = (value: string) =>
  value ? dayjs(value).format('DD MMM') : '-'

export const STATUS_TONE: Record<DelegationStatus, string> = {
  Active: 'border-green-6 bg-green-2 text-green-11',
  Completed: 'border-gray-5 bg-gray-2 text-gray-11',
  Draft: 'border-gray-5 bg-gray-2 text-gray-11',
  Ended: 'border-orange-6 bg-orange-2 text-orange-11',
  Scheduled: 'border-blue-6 bg-blue-2 text-blue-11',
}

/** Workflow blocks a delegate can act on (no start / end / condition). */
export const getWorkflowStageOptions = (blocks: unknown[]) =>
  blocks
    .map(
      (block) =>
        block as {
          id?: unknown
          label?: unknown
          name?: unknown
          settings?: { label?: unknown }
          type?: unknown
        },
    )
    .filter((block) => {
      const type = String(block?.type || '').toUpperCase()
      return (
        block?.id &&
        !['BRANCH', 'CONDITION', 'DECISION', 'END', 'START'].includes(type)
      )
    })
    .map((block) => ({
      id: String(block.id),
      name: String(
        block.settings?.label ||
          block.label ||
          block.name ||
          block.type ||
          'Stage',
      ),
    }))
