import type { SubWorkflowHistoryRow } from '../types'

export interface ConnectorHistoryEntry {
  stage: string
  subWorkflowHistory: SubWorkflowHistoryRow[]
}

interface HistoryLike {
  receivedOn?: unknown
  stage?: string
  status?: string
  subWorkflowHistory?: unknown
  title?: string
}

const norm = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()

/** Child steps a history row carries, or [] when it isn't a connector stage. */
export const getConnectorSteps = (row: HistoryLike): SubWorkflowHistoryRow[] =>
  Array.isArray(row.subWorkflowHistory)
    ? (row.subWorkflowHistory as SubWorkflowHistoryRow[])
    : []

/**
 * Attaches connector entries (child request steps) to a request's history:
 * onto the row whose stage/title matches, otherwise as an extra
 * "connector" row at the end. Rows that already carry
 * `subWorkflowHistory` (live V5-style history) are left as they are.
 */
export const attachConnectorHistory = <T extends HistoryLike>(
  rows: T[],
  entries: ConnectorHistoryEntry[] | undefined,
): T[] => {
  if (!entries || entries.length === 0) return rows
  const result = rows.map((row) => ({ ...row }))
  for (const entry of entries) {
    if (!entry.subWorkflowHistory?.length) continue
    const key = norm(entry.stage)
    const match = result.find(
      (row) =>
        getConnectorSteps(row).length === 0 &&
        key !== '' &&
        (norm(row.stage) === key || norm(row.title) === key),
    )
    if (match) {
      match.subWorkflowHistory = entry.subWorkflowHistory
      continue
    }
    result.push({
      receivedOn: entry.subWorkflowHistory[0]?.receivedOn,
      stage: entry.stage,
      status: 'Connector',
      subWorkflowHistory: entry.subWorkflowHistory,
      title: entry.stage,
    } as T)
  }
  return result
}
