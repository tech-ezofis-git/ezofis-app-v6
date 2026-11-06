import type { SubProcessRow } from '../types'
import { useSubProcessesForWorkflow } from '../api/queries'
import { toSubProcessRow } from '../api/subWorkflowApi'

const EMPTY: SubProcessRow[] = []

/** Process id a list row is linked under (same id the request view uses). */
export const getRowProcessId = (row: any): string =>
  String(row?.workflowInstanceId || row?.processId || row?.id || '')

/**
 * Child requests of one inbox row. Live list rows carry them as
 * `subworkflowTransaction` (V5); in mock mode they come from one query per
 * workflow that every row on the page shares.
 */
const useRowSubProcesses = (
  workflowId: number | string | null | undefined,
  row: any,
): SubProcessRow[] => {
  const { data } = useSubProcessesForWorkflow(workflowId ?? undefined)
  const fromRow = row?.subworkflowTransaction
  if (Array.isArray(fromRow) && fromRow.length > 0)
    return fromRow.map(toSubProcessRow)
  return data?.[getRowProcessId(row)] ?? EMPTY
}

export default useRowSubProcesses
