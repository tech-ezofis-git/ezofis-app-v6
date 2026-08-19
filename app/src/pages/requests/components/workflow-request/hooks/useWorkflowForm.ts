import { useEffect, useMemo, useState } from 'react'
import formApi from '@/api/form/form'
import workflowsApiV6 from '@/api/v6/workflows'
import { buildStartWorkflowPayload } from '../utils/buildStartWorkflowPayload'

interface FormRecord {
  description?: string
  formJson?: { panels?: any[] }
  layout?: string
  name?: string
  type?: string
}

// Resolves a workflow's form (via its formId) and drives the fill-and-submit
// lifecycle for creating a new request against it, per the "Normal
// Workflow — Frontend Integration Guide" (PR #40, Aug 2026): the button
// always maps to POST /Workflows/{id}/start/json — the backend completes
// START with a fixed review of "Submit" itself, so there's no per-workflow
// action name to surface here (that only applies later, at move-next).
export const useWorkflowForm = (workflow: any) => {
  const [form, setForm] = useState<FormRecord | null>(null)
  const [isLoadingForm, setIsLoadingForm] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formModel, setFormModel] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const formId =
    workflow?.formId ??
    workflow?.wFormId ??
    workflow?.settings?.general?.initiateUsing?.formId ??
    ''

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoadingForm(true)
      setLoadError(null)

      if (!formId) {
        if (!cancelled) {
          setLoadError('This workflow has no form configured.')
          setIsLoadingForm(false)
        }
        return
      }

      const { data, error } = await formApi.getFormDataById(String(formId))
      if (cancelled) return

      if (error || !data) {
        setLoadError(error || 'Failed to load the form for this workflow.')
        setIsLoadingForm(false)
        return
      }

      setForm(data)
      setFormModel({})
      setIsLoadingForm(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [formId])

  const panels = useMemo(() => form?.formJson?.panels || [], [form])

  const setFieldValue = (fieldId: string, value: any) => {
    setFormModel((prev) => ({ ...prev, [fieldId]: value }))
  }

  const submit = async () => {
    if (!workflow?.id) {
      setSubmitError('Workflow ID is missing. Cannot start workflow.')
      return { success: false }
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const payload = buildStartWorkflowPayload(panels, formModel)
    const { data, error } = await workflowsApiV6.startWorkflowJson(
      String(workflow.id),
      payload,
    )

    setIsSubmitting(false)

    if (error) {
      setSubmitError(error)
      return { success: false }
    }

    return { data, success: true }
  }

  return {
    form,
    formModel,
    isLoadingForm,
    isSubmitting,
    loadError,
    panels,
    submit,
    submitError,
    setFieldValue,
  }
}
