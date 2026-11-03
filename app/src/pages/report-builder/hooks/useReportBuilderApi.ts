import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ReportSpecHighlight } from '@/api/v6/reportAgent'
import type {
  ReportBuilderPayloadSource,
  ReportRunResult,
} from '@/api/v6/reportBuilder'
import {
  deleteReportAiReport,
  getReportAiReport,
  isLegacyReportSpec,
  listReportAiReports,
  runReportAiReport,
  saveReportAiReport,
  updateReportAiHighlights,
} from '@/api/v6/reportAgent'
import {
  createReportBuilderReport,
  deleteReportBuilderReport,
  getReportBuilderReportById,
  getReportBuilderReportData,
  listReportBuilderReports,
  previewReportBuilderReport,
  publishReportBuilderReport,
  updateReportBuilderReport,
} from '@/api/v6/reportBuilder'
import type {
  Report,
  ReportAgentConfig,
  ReportStatus,
  ReportVisibility,
} from '../types'
import {
  agentRunToReportRunResult,
  aiListItemToReport,
  aiRecordToReport,
  hasGenericAiDomain,
  runResultFieldSettings,
} from '../utils/agentReport'

export const reportBuilderKeys = {
  all: ['report-builder'] as const,
  data: (id: string) => [...reportBuilderKeys.all, 'data', id] as const,
  detail: (id: string) => [...reportBuilderKeys.all, 'detail', id] as const,
  list: () => [...reportBuilderKeys.all, 'list'] as const,
}

/**
 * Manual (/report-builder) and AI (Report Agent v2) reports in one list,
 * newest first. A failing AI list doesn't hide the manual reports.
 */
export const useReportBuilderListQuery = () =>
  useQuery({
    queryKey: reportBuilderKeys.list(),
    queryFn: async () => {
      const [manual, ai] = await Promise.all([
        listReportBuilderReports(),
        listReportAiReports(),
      ])
      if (manual.error && ai.error) throw new Error(manual.error)
      return [...manual.data, ...ai.data.map(aiListItemToReport)].sort(
        (a, b) => Date.parse(b.modified) - Date.parse(a.modified),
      )
    },
  })

/**
 * Loads a report by id from /report-builder, falling back to Report Agent v2
 * (AI report ids aren't known to the manual builder).
 */
export const getAnyReportById = async (
  id: string,
): Promise<{ data: Report | null; error: string }> => {
  const manual = await getReportBuilderReportById(id)
  if (manual.data) return { data: manual.data, error: '' }
  const ai = await getReportAiReport(id)
  if (ai.data) return { data: aiRecordToReport(ai.data), error: '' }
  if (manual.notFound || ai.notFound) return { data: null, error: '' }
  return { data: null, error: ai.error || manual.error }
}

export const useReportBuilderByIdQuery = (id: string | null | undefined) =>
  useQuery({
    enabled: Boolean(id),
    queryKey: reportBuilderKeys.detail(id || ''),
    queryFn: async () => {
      const { data, error } = await getAnyReportById(id as string)
      if (error) throw new Error(error)
      return data
    },
  })

// Module-level so useQueries can memoize the combined result.
const toSourceNames = (results: { data?: Report | null }[]) => {
  const names: Record<string, string> = {}
  results.forEach((result) => {
    if (result.data?.domain) names[result.data.id] = result.data.domain
  })
  return names
}

/**
 * Workflow/folder names for AI reports whose list row only carries a scope
 * label ("Workflow"/"Folder"), keyed by report id. Loads each report's detail
 * (shared with the report page's cache).
 */
export const useAiReportSourceNames = (reports: Report[]) => {
  const pending = reports.filter(hasGenericAiDomain)
  return useQueries({
    combine: toSourceNames,
    queries: pending.map((report) => ({
      queryKey: reportBuilderKeys.detail(report.id),
      staleTime: 5 * 60 * 1000,
      queryFn: async () => {
        const { data } = await getReportAiReport(report.id)
        return data ? aiRecordToReport(data) : null
      },
    })),
  })
}

export const useReportBuilderDataQuery = (id: string | null | undefined) =>
  useQuery({
    enabled: Boolean(id),
    queryKey: reportBuilderKeys.data(id || ''),
    queryFn: async () => {
      const { data, error } = await getReportBuilderReportData(id as string)
      if (error) throw new Error(error)
      return data as ReportRunResult
    },
  })

/** Rows fetched per agent run on the report page; filtering/paging is client-side. */
const AGENT_REPORT_PAGE_SIZE = 500

/**
 * Runs a saved AI report by id (Report Agent v2 /reports/{id}/execute, the
 * saved definition as-is) and adapts the result to the same `ReportRunResult`
 * shape `/data` returns. Disabled for reports without an agent config.
 */
export const useReportAgentDataQuery = (report: Report | null | undefined) => {
  const agent = report?.agentConfig
  return useQuery({
    enabled: Boolean(agent),
    queryKey: [
      ...reportBuilderKeys.all,
      'agent-data',
      report?.id ?? '',
      report?.modified ?? '',
    ],
    retry: false,
    queryFn: async () => {
      const { data, error } = await runReportAiReport(agent!.id, {
        legacy: isLegacyReportSpec(agent!.reportSpec),
        page: 1,
        pageSize: AGENT_REPORT_PAGE_SIZE,
      })
      if (error || !data) throw new Error(error || 'Failed to run report')
      return {
        fieldSettings: runResultFieldSettings(data),
        result: agentRunToReportRunResult(data, {
          domain: report!.domain,
          name: report!.name,
          reportId: report!.id,
        }),
        warnings: data.warnings ?? [],
      }
    },
  })
}

export const useReportBuilderPreviewMutation = () =>
  useMutation({
    mutationFn: (report: ReportBuilderPayloadSource) =>
      previewReportBuilderReport(report),
  })

/** Creates when the payload has no id yet, updates otherwise. */
export const useSaveReportBuilderReportMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (report: Report) => {
      const result = report.id
        ? await updateReportBuilderReport(report.id, report)
        : await createReportBuilderReport(report)
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to save report')
      }
      return result.data
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: reportBuilderKeys.list() })
      void queryClient.invalidateQueries({
        queryKey: reportBuilderKeys.detail(saved.id),
      })
    },
  })
}

export const usePublishReportBuilderReportMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await publishReportBuilderReport(id)
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to publish report')
      }
      return result.data
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: reportBuilderKeys.list() })
      void queryClient.invalidateQueries({
        queryKey: reportBuilderKeys.detail(saved.id),
      })
    },
  })
}

export const useDeleteReportBuilderReportMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    // AI reports live under /report-ai-builder, manual ones under /report-builder.
    mutationFn: async (report: Report) => {
      const result = report.isAiReport
        ? await deleteReportAiReport(report.id)
        : await deleteReportBuilderReport(report.id)
      if (result.error) throw new Error(result.error)
      return report.id
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: reportBuilderKeys.list() })
      queryClient.removeQueries({ queryKey: reportBuilderKeys.detail(id) })
    },
  })
}

/**
 * Saves an AI report exactly as edited in the wizard (name, description,
 * columns, labels, filters, highlights, sharing, status) with Report Agent v2
 * /definitions/save: creates it when it has no id yet (a previewed report),
 * updates it otherwise. No LLM call.
 */
export const useSaveReportAiMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      agent: ReportAgentConfig
      description: string
      name: string
      prompt?: string
      sharedGroups: string[]
      sharedUsers: string[]
      status?: ReportStatus
      visibility: ReportVisibility
    }) => {
      const result = await saveReportAiReport(payload.agent.id || null, {
        description: payload.description,
        name: payload.name,
        prompt: payload.prompt,
        reportPrompt: payload.agent.reportPrompt,
        reportSpec: payload.agent.reportSpec,
        sharedGroups: payload.sharedGroups,
        sharedUsers: payload.sharedUsers,
        status: payload.status,
        visibility: payload.visibility,
      })
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to save the AI report')
      }
      return aiRecordToReport(result.data)
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: reportBuilderKeys.list() })
      void queryClient.invalidateQueries({
        queryKey: reportBuilderKeys.detail(saved.id),
      })
    },
  })
}

/**
 * Saves column highlight rules on a saved AI report (default reports
 * included) and reloads it, so the report table shows them.
 */
export const useSaveReportHighlightsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      columns: Record<string, ReportSpecHighlight | null>
      id: string
    }) => {
      const result = await updateReportAiHighlights(payload.id, payload.columns)
      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to save the highlights')
      }
      return aiRecordToReport(result.data)
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: reportBuilderKeys.list() })
      void queryClient.invalidateQueries({
        queryKey: reportBuilderKeys.detail(saved.id),
      })
    },
  })
}
