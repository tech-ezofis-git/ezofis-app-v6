import type { SubProcessRow, SubProcessStatus } from '../types'

export const FORCE_CLOSE_ACTION = 'Force Close'

// V5 rule: flowStatus 1 = finished; "Force Close" as the last action marks a
// forced finish. Anything else is still running.
export const getSubProcessStatus = (
  row: Pick<SubProcessRow, 'flowStatus' | 'lastAction'>,
): SubProcessStatus => {
  const finished = Number(row.flowStatus) === 1
  if (finished && row.lastAction === FORCE_CLOSE_ACTION) return 'forceClosed'
  if (finished) return 'completed'
  return 'running'
}

export const SUB_PROCESS_STATUS_META: Record<
  SubProcessStatus,
  { color: 'green' | 'orange' | 'red'; icon: string }
> = {
  completed: { color: 'green', icon: 'tabler:circle-check' },
  forceClosed: { color: 'red', icon: 'tabler:square-x' },
  running: { color: 'orange', icon: 'tabler:progress' },
}
