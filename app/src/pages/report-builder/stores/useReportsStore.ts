import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Report, ReportExecution } from '../types'
import { SEED_REPORTS } from '../constants'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const buildMockExecutions = (report: Report): ReportExecution[] => {
  if (report.runs === 0) return []
  const count = Math.min(6, Math.max(1, Math.round(report.runs / 20) || 1))
  return Array.from({ length: count }).map((_, index) => ({
    durationMs: 800 + index * 137,
    format: report.schedule.format,
    id: `${report.id}-exec-${index}`,
    rowCount: 10 + index * 4,
    runAt: new Date(Date.now() - index * 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: index === 1 && report.status === 'Draft' ? 'Failed' : 'Success',
    triggeredBy: report.owner,
  }))
}

interface ReportsState {
  executions: Record<string, ReportExecution[]>
  reports: Report[]
  addReport: (report: Report) => void
  deleteReport: (id: string) => void
  duplicateReport: (id: string) => void
  runReportNow: (id: string) => void
  updateReport: (id: string, patch: Partial<Report>) => void
  getReportById: (id: string) => Report | undefined
}

const useReportsStore = create<ReportsState>()(
  persist(
    (set, get) => ({
      executions: Object.fromEntries(
        SEED_REPORTS.map((r) => [r.id, buildMockExecutions(r)]),
      ),

      reports: SEED_REPORTS,

      addReport: (report) =>
        set((state) => ({ reports: [report, ...state.reports] })),

      deleteReport: (id) =>
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
        })),

      duplicateReport: (id) =>
        set((state) => {
          const source = state.reports.find((r) => r.id === id)
          if (!source) return state
          const copy: Report = {
            ...source,
            createdAt: new Date().toISOString(),
            id: uid(),
            modified: new Date().toISOString(),
            name: `${source.name} (Copy)`,
            runs: 0,
            status: 'Draft',
          }
          return { reports: [copy, ...state.reports] }
        }),

      runReportNow: (id) =>
        set((state) => {
          const report = state.reports.find((r) => r.id === id)
          if (!report) return state
          const execution: ReportExecution = {
            durationMs: 900,
            format: report.schedule.format,
            id: `${id}-exec-${Date.now()}`,
            rowCount: Math.floor(Math.random() * 40) + 5,
            runAt: new Date().toISOString(),
            status: 'Success',
            triggeredBy: report.owner,
          }
          return {
            executions: {
              ...state.executions,
              [id]: [execution, ...(state.executions[id] || [])],
            },
            reports: state.reports.map((r) =>
              r.id === id
                ? { ...r, modified: new Date().toISOString(), runs: r.runs + 1 }
                : r,
            ),
          }
        }),

      updateReport: (id, patch) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id
              ? { ...r, ...patch, modified: new Date().toISOString() }
              : r,
          ),
        })),

      getReportById: (id) => get().reports.find((r) => r.id === id),
    }),
    {
      name: 'ezofis_reports',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export const createReportId = uid

export default useReportsStore
