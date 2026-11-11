import type { SubProcessRow } from '../types'
import { toSubProcessRow } from '../api/subWorkflowApi'
import { useSubProcessList } from './SubProcessListContext'

const EMPTY: SubProcessRow[] = []

/** Process id a list row is linked under (same id the request view uses). */
export const getRowProcessId = (row: any): string =>
  String(row?.workflowInstanceId || row?.processId || row?.id || '')

/**
 * Child requests of one inbox row. Rows that already carry them as
 * `subworkflowTransaction` (V5) use those; otherwise they come from the
 * page-level lookup the list shares with every card.
 */
const useRowSubProcesses = (
  _workflowId: number | string | null | undefined,
  row: any,
): SubProcessRow[] => {
  const byParent = useSubProcessList()
  const fromRow = row?.subworkflowTransaction
  if (Array.isArray(fromRow) && fromRow.length > 0)
    return fromRow.map(toSubProcessRow)
  return byParent[getRowProcessId(row)] ?? EMPTY
}

export default useRowSubProcesses
