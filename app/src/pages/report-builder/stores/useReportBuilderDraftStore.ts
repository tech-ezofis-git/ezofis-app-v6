import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Question } from '@/pages/form-builder/store/formStore'
import type {
  Report,
  ReportFieldSetting,
  ReportFilter,
  ReportSchedule,
  ReportSourceType,
  ReportStatus,
  ReportVisibility,
} from '../types'
import { DEFAULT_SCHEDULE } from '../types'

export interface ReportDraftAiSuggestion {
  fieldIds: string[]
  name: string
  summary: string
}

export interface ReportDraft {
  aiPrompt?: string
  aiSuggestion?: ReportDraftAiSuggestion | null
  customFields: Question[]
  description: string
  domain: string
  editingReportId: string | null
  fields: string[]
  fieldSettings: Record<string, ReportFieldSetting>
  filters: ReportFilter[]
  name: string
  schedule: ReportSchedule
  scheduled: boolean
  sharedGroups: string[]
  sharedUsers: string[]
  showAiBuilder?: boolean
  sourceFormId: string
  sourceId: string
  sourceType: ReportSourceType
  status: ReportStatus
  visibility: ReportVisibility
}

export const EMPTY_DRAFT: ReportDraft = {
  aiPrompt: '',
  aiSuggestion: null,
  customFields: [],
  description: '',
  domain: '',
  editingReportId: null,
  fields: [],
  fieldSettings: {},
  filters: [],
  name: '',
  schedule: DEFAULT_SCHEDULE,
  scheduled: false,
  sharedGroups: [],
  sharedUsers: [],
  showAiBuilder: false,
  sourceFormId: '',
  sourceId: '',
  sourceType: 'Workflow',
  status: 'Draft',
  visibility: 'Private',
}

interface ReportBuilderDraftState {
  draft: ReportDraft
  loadFromReport: (report: Report) => void
  resetDraft: () => void
  setDraft: (patch: Partial<ReportDraft>) => void
}

const useReportBuilderDraftStore = create<ReportBuilderDraftState>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT,

      loadFromReport: (report) =>
        set({
          draft: {
            aiPrompt: '',
            aiSuggestion: null,
            customFields: report.customFields ?? [],
            description: report.description,
            domain: report.domain,
            editingReportId: report.id,
            fields: report.fields,
            fieldSettings: report.fieldSettings,
            filters: report.filters,
            name: report.name,
            schedule: report.schedule,
            scheduled: report.scheduled,
            sharedGroups: report.sharedGroups,
            sharedUsers: report.sharedUsers,
            showAiBuilder: false,
            sourceFormId: report.sourceFormId ?? '',
            sourceId: report.sourceId ?? '',
            sourceType: report.sourceType ?? '',
            status: report.status,
            visibility: report.visibility,
          },
        }),

      resetDraft: () => set({ draft: EMPTY_DRAFT }),

      setDraft: (patch) =>
        set((state) => ({ draft: { ...state.draft, ...patch } })),
    }),
    {
      name: 'ezofis_report_builder_draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

export default useReportBuilderDraftStore
