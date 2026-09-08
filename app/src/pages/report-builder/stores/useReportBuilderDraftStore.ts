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

export interface ReportDraft {
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
  sourceFormId: string
  sourceId: string
  sourceType: ReportSourceType
  status: ReportStatus
  visibility: ReportVisibility
}

export const EMPTY_DRAFT: ReportDraft = {
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
