import { useEffect, useMemo, useState } from 'react'
import type { RepositoryFieldDto } from '@/api/v6/folder/folder'
import formApi from '@/api/form/form'
import { uploadForOcr } from '@/api/v6/folder/folder'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import workflowsApiV6 from '@/api/v6/workflows'
import folderApi from '@/pages/folders/api/folderApi'
import type { AttachmentEntry } from '../components/AttachmentsPanel'
import type { LocalComment } from '../components/CommentsPanel'
import { buildStartWorkflowPayload } from '../utils/buildStartWorkflowPayload'
import {
  buildRepoFieldHints,
  getMissingMandatoryFields,
  mapOcrFieldsToModel,
} from '../utils/fieldRendering'

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
//
// File uploads are two-phase, per the repository's own field rules (which
// carry a real isMandatory flag — the form's own fields don't):
//  1. On selection: uploadForOcr (OCR-only, nothing persisted) against the
//     REPOSITORY's field names, auto-filling matching form fields.
//  2. On submit: block if any repository-mandatory field is still empty;
//     otherwise uploadWithOcr each pending file (this is what actually
//     stages it) to get the real fileId used in `stagedFiles`.
export const useWorkflowForm = (workflow: any) => {
  const [form, setForm] = useState<FormRecord | null>(null)
  const [isLoadingForm, setIsLoadingForm] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formModel, setFormModel] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [comments, setComments] = useState<LocalComment[]>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [repositoryFields, setRepositoryFields] = useState<
    RepositoryFieldDto[]
  >([])

  const repositoryId = workflow?.repositoryId

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

  useEffect(() => {
    if (!repositoryId) {
      setRepositoryFields([])
      return
    }
    let cancelled = false
    folderApi
      .getRepositoryFullData(String(repositoryId))
      .then((repo) => {
        if (!cancelled) setRepositoryFields(repo?.fields || [])
      })
      .catch(() => {
        if (!cancelled) setRepositoryFields([])
      })
    return () => {
      cancelled = true
    }
  }, [repositoryId])

  const panels = useMemo(() => form?.formJson?.panels || [], [form])
  const repoFieldHints = useMemo(
    () => buildRepoFieldHints(repositoryFields),
    [repositoryFields],
  )
  const mandatoryFieldNames = useMemo(
    () =>
      repositoryFields
        .filter((f) => f.isMandatory)
        .map((f) => f.name)
        .filter(Boolean),
    [repositoryFields],
  )

  const setFieldValue = (fieldId: string, value: any) => {
    setFormModel((prev) => ({ ...prev, [fieldId]: value }))
  }

  // Auto-fills any form fields an OCR pass recognized (matched by label),
  // without clobbering values the user already typed. Shared by both the
  // sidebar Attachments upload and any field-level FILE_UPLOAD's own OCR
  // pass, so results from either land the same way.
  const applyOcrFieldList = (
    ocrFieldList: { name?: string; value?: string }[] | undefined,
  ) => {
    const ocrPatch = mapOcrFieldsToModel(panels, ocrFieldList)
    if (Object.keys(ocrPatch).length > 0) {
      setFormModel((prev) => ({ ...ocrPatch, ...prev }))
    }
  }

  // Phase 1: OCR-only peek, nothing staged yet. Adds the file to the list
  // immediately (optimistic) and fills in whatever OCR recognizes.
  const addAttachment = async (files: FileList | null) => {
    const list = files ? Array.from(files) : []
    if (list.length === 0 || !repositoryId) return

    setIsUploadingAttachment(true)
    for (const file of list) {
      const localId = crypto.randomUUID()
      setAttachments((prev) => [
        ...prev,
        {
          fileName: file.name,
          localId,
          rawFile: file,
          repositoryId: String(repositoryId),
          size: file.size,
        },
      ])

      const { data, error } = await uploadForOcr(
        String(repositoryId),
        file,
        repoFieldHints,
      )
      if (!error && data) {
        applyOcrFieldList(data.ocrFieldList)
      }
    }
    setIsUploadingAttachment(false)
  }

  const removeAttachment = (localId: string) => {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId))
  }

  const addComment = () => {
    const text = commentDraft.trim()
    if (!text) return
    setComments((prev) => [
      ...prev,
      { createdAt: new Date().toISOString(), id: crypto.randomUUID(), text },
    ])
    setCommentDraft('')
  }

  // Phase 2: actually stage every pending file (uploadWithOcr) so it has a
  // real fileId for `stagedFiles`. Only called from submit(), after the
  // mandatory-field check passes.
  const stagePendingFiles = async (): Promise<{
    attachments: AttachmentEntry[]
    formModel: Record<string, any>
  }> => {
    const stagedAttachments: AttachmentEntry[] = []
    for (const attachment of attachments) {
      if (attachment.fileId || !attachment.rawFile) {
        stagedAttachments.push(attachment)
        continue
      }
      const { data, error } = await uploadAndIndexApi.uploadWithOcr({
        fields: repoFieldHints,
        file: attachment.rawFile,
        repositoryId: attachment.repositoryId,
      })
      if (error || !data) {
        throw new Error(error || `Failed to upload ${attachment.fileName}.`)
      }
      stagedAttachments.push({
        ...attachment,
        fileId: data.fileId,
        repositoryId: data.repositoryId || attachment.repositoryId,
      })
    }

    const nextFormModel = { ...formModel }
    for (const panel of panels) {
      for (const field of panel.fields || []) {
        if (field.type !== 'FILE_UPLOAD' && field.type !== 'IMAGE_UPLOAD')
          continue
        const value = nextFormModel[field.id]
        if (!value || value.fileId || !value.rawFile) continue

        const { data, error } = await uploadAndIndexApi.uploadWithOcr({
          fields: repoFieldHints,
          file: value.rawFile,
          repositoryId: value.repositoryId || repositoryId,
        })
        if (error || !data) {
          throw new Error(error || `Failed to upload ${value.fileName}.`)
        }
        nextFormModel[field.id] = {
          fileId: data.fileId,
          fileName: value.fileName,
          repositoryId: data.repositoryId || value.repositoryId,
        }
      }
    }

    return { attachments: stagedAttachments, formModel: nextFormModel }
  }

  const submit = async () => {
    if (!workflow?.id) {
      setSubmitError('Workflow ID is missing. Cannot start workflow.')
      return { success: false }
    }

    const missing = getMissingMandatoryFields(
      panels,
      formModel,
      mandatoryFieldNames,
    )
    if (missing.length > 0) {
      setSubmitError(`Please fill in required field(s): ${missing.join(', ')}`)
      return { success: false }
    }

    setIsSubmitting(true)
    setSubmitError(null)

    let staged: {
      attachments: AttachmentEntry[]
      formModel: Record<string, any>
    }
    try {
      staged = await stagePendingFiles()
    } catch (e: unknown) {
      setIsSubmitting(false)
      const message =
        e instanceof Error ? e.message : 'Failed to upload attachment(s).'
      setSubmitError(message)
      return { success: false }
    }
    setAttachments(staged.attachments)
    setFormModel(staged.formModel)

    // The start payload only has one free-text `context` field — fold the
    // locally composed comments into it, in order. Every attachment is
    // staged by this point (stagePendingFiles threw above otherwise), but
    // the type is still Optional<fileId> — filter defensively rather than
    // assert.
    const context = comments.map((c) => c.text).join('\n\n')
    const stagedAttachmentFiles = staged.attachments
      .filter((a): a is AttachmentEntry & { fileId: string } => !!a.fileId)
      .map((a) => ({
        fileId: a.fileId,
        fileName: a.fileName,
        repositoryId: a.repositoryId,
      }))
    const payload = buildStartWorkflowPayload(
      panels,
      staged.formModel,
      stagedAttachmentFiles,
      context,
    )
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
    addAttachment,
    addComment,
    applyOcrFieldList,
    attachments,
    commentDraft,
    comments,
    form,
    formModel,
    isLoadingForm,
    isSubmitting,
    isUploadingAttachment,
    loadError,
    panels,
    removeAttachment,
    repoFieldHints,
    submit,
    submitError,
    setCommentDraft,
    setFieldValue,
  }
}
