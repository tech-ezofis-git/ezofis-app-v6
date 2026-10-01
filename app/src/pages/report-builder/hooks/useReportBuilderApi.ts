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
import type { Report } from '../types'

export const reportBuilderKeys = {
  all: ['report-builder'] as const,
  data: (id: string) => [...reportBuilderKeys.all, 'data', id] as const,
  detail: (id: string) => [...reportBuilderKeys.all, 'detail', id] as const,
  list: () => [...reportBuilderKeys.all, 'list'] as const,
}

export const useReportBuilderListQuery = () =>
  useQuery({
    queryKey: reportBuilderKeys.list(),
    queryFn: async () => {
      const { data, error } = await listReportBuilderReports()
      if (error) throw new Error(error)
      return data
    },
  })

export const useReportBuilderByIdQuery = (id: string | null | undefined) =>
  useQuery({
    enabled: Boolean(id),
    queryKey: reportBuilderKeys.detail(id || ''),
    queryFn: async () => {
      const { data, error, notFound } = await getReportBuilderReportById(
        id as string,
      )
      if (notFound) return null
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
