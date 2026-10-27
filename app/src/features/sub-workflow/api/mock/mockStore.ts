import type {
  Id,
  MainProcessDetails,
  SubProcessRow,
  SubWorkflowHistoryRow,
  SubWorkflowLink,
} from '../../types'
import seed from './subWorkflowMock.json'

// Local stand-in for the sub-workflow backend until the V6 API is ready.
// Seed data comes from subWorkflowMock.json; links and child processes
// created in the UI are kept in localStorage so they survive a reload.

export interface MockProcess {
  flowStatus: number | string
  processId: Id
  requestNo: string
  workflowId: Id
  workflowName: string
  duration?: number
  lastAction?: string
  raisedAt?: string
  raisedBy?: string
  stage?: string
}

interface MockDb {
  history: Record<
    string,
    { stage: string; subWorkflowHistory: SubWorkflowHistoryRow[] }[]
  >
  links: SubWorkflowLink[]
  processes: MockProcess[]
}

const STORAGE_KEY = 'v6_mock_sub_workflow_db'
const LATENCY_MS = 300

const same = (a: Id, b: Id) => String(a) === String(b)

// In-memory copy so writes still stick when localStorage is unavailable.
let memoryDb: MockDb | null = null

const readDb = (): MockDb => {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to memory / the seed
  }
  return structuredClone(memoryDb ?? (seed as MockDb))
}

const writeDb = (db: MockDb) => {
  memoryDb = db
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // storage unavailable (private mode / tests): keep in-memory only
  }
}

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

const toRow = (link: SubWorkflowLink, db: MockDb): SubProcessRow => {
  const process = db.processes.find(
    (p) =>
      same(p.processId, link.subProcessId) &&
      same(p.workflowId, link.subWorkflowId),
  )
  return {
    duration: process?.duration,
    flowStatus: process?.flowStatus ?? 0,
    lastAction: process?.lastAction,
    processId: link.subProcessId,
    raisedAt: process?.raisedAt,
    raisedBy: process?.raisedBy,
    requestNo: process?.requestNo ?? `#${link.subProcessId}`,
    stage: process?.stage,
    subWorkflowId: link.subWorkflowId,
    subWorkflowName: process?.workflowName ?? '',
  }
}

export const mockSubWorkflowBackend = {
  /** Records a link; `child` registers display data for a child made in the UI. */
  link: (link: SubWorkflowLink, child?: MockProcess, parent?: MockProcess) => {
    const db = readDb()
    const exists = db.links.some(
      (l) =>
        same(l.mainProcessId, link.mainProcessId) &&
        same(l.subProcessId, link.subProcessId) &&
        same(l.subWorkflowId, link.subWorkflowId),
    )
    if (!exists) db.links.push(link)
    for (const process of [child, parent]) {
      if (!process) continue
      db.processes = db.processes.filter(
        (p) =>
          !(
            same(p.processId, process.processId) &&
            same(p.workflowId, process.workflowId)
          ),
      )
      db.processes.push(process)
    }
    writeDb(db)
    return delay(link)
  },

  reset: () => {
    memoryDb = null
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY)
    } catch {
      // nothing to clear
    }
  },

  getHistory: (workflowId: Id, processId: Id) =>
    delay(readDb().history[`${workflowId}:${processId}`] ?? []),

  getMainProcess: (
    subWorkflowId: Id,
    subProcessId: Id,
  ): Promise<MainProcessDetails | null> => {
    const db = readDb()
    const link = db.links.find(
      (l) =>
        same(l.subWorkflowId, subWorkflowId) &&
        same(l.subProcessId, subProcessId),
    )
    if (!link) return delay(null)
    const parent = db.processes.find(
      (p) =>
        same(p.processId, link.mainProcessId) &&
        same(p.workflowId, link.mainWorkflowId),
    )
    return delay({
      flowStatus: parent?.flowStatus ?? 0,
      processId: link.mainProcessId,
      requestNo: parent?.requestNo ?? `#${link.mainProcessId}`,
      workflowId: link.mainWorkflowId,
      workflowName: parent?.workflowName,
    })
  },

  getSubProcesses: (workflowId: Id, processId: Id) => {
    const db = readDb()
    return delay(
      db.links
        .filter(
          (l) =>
            same(l.mainWorkflowId, workflowId) &&
            same(l.mainProcessId, processId),
        )
        .map((l) => toRow(l, db)),
    )
  },

  /** All children of every request in a workflow, keyed by parent process id. */
  getSubProcessesForWorkflow: (workflowId: Id) => {
    const db = readDb()
    const byParent: Record<string, SubProcessRow[]> = {}
    for (const link of db.links) {
      if (!same(link.mainWorkflowId, workflowId)) continue
      const key = String(link.mainProcessId)
      ;(byParent[key] ??= []).push(toRow(link, db))
    }
    return delay(byParent)
  },
}
