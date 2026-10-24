import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ReportBuilderPayloadSource,
  ReportRunResult,
} from '@/api/v6/reportBuilder'
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
import {
  getReportAiReport,
  listReportAiReports,
  runReportAiReport,
  updateReportAiReport,
} from '@/api/v6/reportAgent'
import type { Report, ReportAgentConfig } from '../types'
import {
  agentRunToReportRunResult,
  aiListItemToReport,
  aiRecordToReport,
  runResultFieldSettings,
} from '../utils/agentReport'

export const reportBuilderKeys = {
  all: ['report-builder'] as const,
  data: (id: string) => [...reportBuilderKeys.all, 'data', id] as const,
  detail: (id: string) => [...reportBuilderKeys.all, 'detail', id] as const,
  list: () => [...reportBuilderKeys.all, 'list'] as const,
}

/**
 * Manual (/report-builder) and AI (/report-ai-builder) reports in one list,
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
 * Loads a report by id from /report-builder, falling back to
 * /report-ai-builder (AI report ids aren't known to the manual builder).
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
 * Runs a saved AI report by id (/report-ai-builder/{id}/run) and adapts the
 * result to the same `ReportRunResult` shape `/data` returns. Disabled for
 * reports without an agent config.
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
    queryFn: async () => {
      const { data, error } = await runReportAiReport(agent!.id, {
        page: 1,
        pageSize: AGENT_REPORT_PAGE_SIZE,
        reportPrompt: agent!.reportPrompt,
        reportSpec: agent!.reportSpec,
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
    retry: false,
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
    mutationFn: async (id: string) => {
      const result = await deleteReportBuilderReport(id)
      if (result.error) throw new Error(result.error)
      return id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportBuilderKeys.list() })
    },
  })
}

/**
 * Saves an AI report's edits (name, description, prompt, spec incl. column
 * highlights) with PATCH /report-ai-builder/{id}. AI reports are already
 * saved at generate time, so there's no create here.
 */
export const useSaveReportAiMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      agent: ReportAgentConfig
      description: string
      name: string
    }) => {
      const result = await updateReportAiReport(payload.agent.id, {
        description: payload.description,
        name: payload.name,
        reportPrompt: payload.agent.reportPrompt,
        reportSpec: payload.agent.reportSpec,
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
