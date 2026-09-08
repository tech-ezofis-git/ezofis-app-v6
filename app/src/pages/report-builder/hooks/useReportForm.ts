import { useForm } from '@tanstack/react-form'
import * as z from 'zod'
import useReportBuilderDraftStore from '../stores/useReportBuilderDraftStore'

export const reportDetailsSchema = z.object({
  description: z.string().optional(),
  domain: z.string().optional(),
  name: z.string().min(1, 'Report name is required'),
})

export type ReportDetailsValues = z.infer<typeof reportDetailsSchema>

/**
 * TanStack Form + Zod wrapper around the Details step's fields. Every
 * change is mirrored straight into the sessionStorage-persisted draft store
 * so the other wizard steps (Fields/Filters/Schedule) can read the same
 * name/domain, and so a mid-wizard refresh doesn't lose it.
 */
export const useReportForm = () => {
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)

  const form = useForm({
    defaultValues: {
      description: draft.description,
      domain: draft.domain,
      name: draft.name,
    } as ReportDetailsValues,
    validators: {
      onChange: reportDetailsSchema,
    },
    onSubmit: async ({ value }) => {
      setDraft(value)
    },
  })

  const syncField = <K extends keyof ReportDetailsValues>(
    field: K,
    value: ReportDetailsValues[K],
  ) => {
    setDraft({ [field]: value } as Partial<typeof draft>)
  }

  return { form, syncField }
}

export default useReportForm
