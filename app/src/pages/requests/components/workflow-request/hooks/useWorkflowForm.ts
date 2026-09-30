import { useEffect, useMemo, useRef, useState } from 'react'
import type { RepositoryFieldDto } from '@/api/v6/folder/folder'
import formApi from '@/api/form/form'
import { uploadForOcr } from '@/api/v6/folder/folder'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import workflowsApiV6 from '@/api/v6/workflows'
import folderApi from '@/pages/folders/api/folderApi'
import { applyCalculatedFields } from '@/pages/form-builder/helpers/formula'
import type { AttachmentEntry } from '../components/AttachmentsPanel'
import type { LocalComment } from '../components/CommentsPanel'
import { buildStartWorkflowPayload } from '../utils/buildStartWorkflowPayload'
import {
  applyFilenamePreFillToFormModel,
  buildInitialFormModel,
  buildRepoFieldDescriptors,
  buildRepoFieldHints,
  buildRepoMetadata,
  extractOcrText,
  getMissingMandatoryFieldIds,
  getMissingMandatoryFields,
  mapOcrFieldsToModel,
} from '../utils/fieldRendering'

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
export interface UseWorkflowFormOptions {
  fileName?: string
  isRaiseTicket?: boolean
  viewerItemId?: string
  viewerRepositoryId?: string
}

interface FormRecord {
  description?: string
  formJson?: { panels?: any[] }
  layout?: string
  name?: string
  type?: string
}

export const useWorkflowForm = (
  workflow: any,
  options?: UseWorkflowFormOptions,
) => {
  const [form, setForm] = useState<FormRecord | null>(null)
  const [isLoadingForm, setIsLoadingForm] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formModel, setFormModel] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [comments, setComments] = useState<LocalComment[]>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [repositoryFields, setRepositoryFields] = useState<
    RepositoryFieldDto[]
  >([])

  const repositoryId = options?.viewerRepositoryId ?? workflow?.repositoryId

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
      setFormModel(
        applyCalculatedFields(
          data?.formJson?.panels || [],
          buildInitialFormModel(data?.formJson?.panels || []),
        ),
      )
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
  const repoFieldDescriptors = useMemo(
    () => buildRepoFieldDescriptors(repositoryFields, panels),
    [repositoryFields, panels],
  )
  // Every file the user has uploaded so far — sidebar attachments and
  // field-level FILE_UPLOAD/IMAGE_UPLOAD values alike — used to drive the
  // split-view file preview and to decide whether to show it at all.
  const uploadedFiles = useMemo(() => {
    const fromAttachments = attachments
      .filter((a) => a.rawFile || a.fileId)
      .map((a) => ({
        fileName: a.fileName,
        key: `attachment:${a.localId}`,
        rawFile: a.rawFile,
      }))
    const fromFields = panels.flatMap((panel: any) =>
      (panel.fields || [])
        .filter(
          (field: any) =>
            (field.type === 'FILE_UPLOAD' || field.type === 'IMAGE_UPLOAD') &&
            (formModel[field.id]?.rawFile || formModel[field.id]?.fileId),
        )
        .map((field: any) => ({
          fileName: formModel[field.id].fileName,
          key: `field:${field.id}`,
          rawFile: formModel[field.id].rawFile,
        })),
    )
    return [...fromAttachments, ...fromFields]
  }, [attachments, panels, formModel])

  const hasUploadedFile = uploadedFiles.length > 0
  const pendingUploadFileName =
    uploadedFiles.find((file) => file.rawFile)?.fileName || ''

  const missingMandatoryFieldIds = useMemo(
    () =>
      getMissingMandatoryFieldIds(repoFieldDescriptors, panels, formModel, {
        hasUploadedFile,
      }),
    [repoFieldDescriptors, panels, formModel, hasUploadedFile],
  )

  // Same as folder / inbox indexing: fill empty Filename from the uploaded
  // file (without extension) so a mandatory filename field is ready in the
  // repository-field list instead of sitting blank at the bottom.
  useEffect(() => {
    if (!pendingUploadFileName || repoFieldDescriptors.length === 0) return
    setFormModel((prev) => {
      const patched = applyFilenamePreFillToFormModel(
        prev,
        repoFieldDescriptors,
        pendingUploadFileName,
      )
      if (patched === prev) return prev
      return applyCalculatedFields(panels, patched)
    })
  }, [panels, pendingUploadFileName, repoFieldDescriptors])

  // True while any pending (unstaged) file's own OCR phase-1 pass is still
  // in flight — drives the "Extracting…" loading state.
  const isExtractingOcr = useMemo(() => {
    const pendingAttachment = attachments.some(
      (a) => a.rawFile && !a.fileId && !a.ocrChecked,
    )
    if (pendingAttachment) return true
    return panels.some((panel: any) =>
      (panel.fields || []).some((field: any) => {
        if (field.type !== 'FILE_UPLOAD' && field.type !== 'IMAGE_UPLOAD')
          return false
        const value = formModel[field.id]
        return Boolean(value?.rawFile && !value?.fileId && !value?.ocrChecked)
      }),
    )
  }, [attachments, panels, formModel])

  // True once OCR has finished but couldn't fill every repo-mandatory field
  // on its own — staging is then blocked until the user fills the rest and
  // explicitly confirms via confirmUpload(), rather than firing the moment
  // the fields happen to become non-empty (see the decide-once effect below).
  const [needsManualUpload, setNeedsManualUpload] = useState(false)

  // Mirrors a value between a repo field's own slot and its matching form
  // field's slot (same name), whichever one wasn't just written to — so it
  // doesn't matter whether the edit came from RepoFieldsPanel or the plain
  // WorkflowFormRenderer, the other view stays in sync when the user
  // switches back to it.
  const setFieldValue = (fieldId: string, value: any) => {
    setFormModel((prev) => {
      const next = { ...prev, [fieldId]: value }
      const descriptor = repoFieldDescriptors.find(
        (d) => d.fieldId === fieldId || d.matchedFieldId === fieldId,
      )
      if (descriptor) {
        next[descriptor.fieldId] = value
        if (descriptor.matchedFieldId) next[descriptor.matchedFieldId] = value
      }
      return applyCalculatedFields(panels, next)
    })
  }

  // Auto-fills any form fields an OCR pass recognized (matched by label),
  // without clobbering values the user already typed. Shared by both the
  // sidebar Attachments upload and any field-level FILE_UPLOAD's own OCR
  // pass, so results from either land the same way.
  const applyOcrFieldList = (
    ocrFieldList: { name?: string; value?: string }[] | undefined,
  ) => {
    const ocrPatch = mapOcrFieldsToModel(panels, ocrFieldList)
    if (Object.keys(ocrPatch).length === 0) return
    setFormModel((prev) => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(ocrPatch)) {
        const existing = next[key]
        if (
          existing === undefined ||
          existing === null ||
          String(existing).trim() === ''
        ) {
          next[key] = value
        }
      }
      return applyCalculatedFields(panels, next)
    })
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
          ocrChecked: false,
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
      if (!error && data) applyOcrFieldList(data.ocrFieldList)
      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId
            ? {
                ...a,
                ...(!error && data
                  ? { ocrFieldList: data.ocrFieldList, ocrJson: data.ocrJson }
                  : {}),
                ocrChecked: true,
              }
            : a,
        ),
      )
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
        metadata: buildRepoMetadata(
          repositoryFields,
          panels,
          formModel,
          attachment.fileName,
        ),
        ocrFieldList: attachment.ocrFieldList,
        ocrJson: attachment.ocrJson,
        ocrText: extractOcrText(attachment.ocrJson),
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
          metadata: buildRepoMetadata(
            repositoryFields,
            panels,
            formModel,
            value.fileName,
          ),
          ocrFieldList: value.ocrFieldList,
          ocrJson: value.ocrJson,
          ocrText: extractOcrText(value.ocrJson),
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

  // Shared by the auto-stage effect below and submit()'s own fallback call,
  // so a file never gets uploadWithOcr'd twice if both fire around the same
  // render (e.g. the last mandatory field is filled right as the user hits
  // Submit).
  const stagingPromiseRef = useRef<ReturnType<typeof stagePendingFiles> | null>(
    null,
  )
  const stageAllPendingFiles = () => {
    if (!stagingPromiseRef.current) {
      stagingPromiseRef.current = stagePendingFiles().finally(() => {
        stagingPromiseRef.current = null
      })
    }
    return stagingPromiseRef.current
  }

  // Only counts a file as ready to auto-stage once its own phase-1 OCR
  // (uploadForOcr) has resolved — otherwise the auto-stage effect below can
  // fire uploadWithOcr, and build its `metadata`, off a formModel that
  // hasn't been filled in yet (see ocrChecked on AttachmentEntry).
  const hasPendingFiles = () => {
    const pendingAttachment = attachments.some(
      (a) => a.rawFile && !a.fileId && a.ocrChecked,
    )
    if (pendingAttachment) return true
    return panels.some((panel) =>
      (panel.fields || []).some((field: any) => {
        if (field.type !== 'FILE_UPLOAD' && field.type !== 'IMAGE_UPLOAD')
          return false
        const value = formModel[field.id]
        return Boolean(value?.rawFile && !value?.fileId && value?.ocrChecked)
      }),
    )
  }

  // Decides — once, right as OCR finishes for the current batch of pending
  // files — whether to auto-stage (uploadWithOcr) or hand off to the user:
  // if OCR alone filled every repo-mandatory field, stage immediately; if
  // not, flip needsManualUpload and STOP — filling in the rest by hand
  // afterward must not silently trigger staging, only the Upload button
  // (confirmUpload) does. A new pending file restarts the decision.
  const decidedForCurrentBatchRef = useRef(false)
  useEffect(() => {
    if (isExtractingOcr) {
      decidedForCurrentBatchRef.current = false
      return
    }
    if (!hasPendingFiles()) return
    if (decidedForCurrentBatchRef.current) return

    // Don't decide until Filename has been seeded from the upload — otherwise
    // a mandatory filename field looks empty and jumps the user to the
    // indexing list even though we already know the value.
    const withFilename = applyFilenamePreFillToFormModel(
      formModel,
      repoFieldDescriptors,
      pendingUploadFileName,
    )
    if (withFilename !== formModel) {
      setFormModel(applyCalculatedFields(panels, withFilename))
      return
    }

    decidedForCurrentBatchRef.current = true

    if (missingMandatoryFieldIds.size > 0) {
      setNeedsManualUpload(true)
      return
    }

    stageAllPendingFiles()
      .then((staged) => {
        setAttachments(staged.attachments)
        setFormModel(staged.formModel)
      })
      .catch((e: unknown) => {
        const message =
          e instanceof Error ? e.message : 'Failed to upload attachment(s).'
        setSubmitError(message)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExtractingOcr, missingMandatoryFieldIds, attachments, formModel])

  // Manual counterpart to the auto-stage path above — called from the
  // Upload button once the user has filled in whatever OCR missed.
  const confirmUpload = async (): Promise<{ success: boolean }> => {
    if (missingMandatoryFieldIds.size > 0) return { success: false }
    try {
      const staged = await stageAllPendingFiles()
      setAttachments(staged.attachments)
      setFormModel(staged.formModel)
      setNeedsManualUpload(false)
      return { success: true }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Failed to upload attachment(s).'
      setSubmitError(message)
      return { success: false }
    }
  }

  // Called from the Cancel button — drops every pending (unstaged) file,
  // closing out the upload attempt without touching any already-staged
  // files or values the user typed in elsewhere.
  const cancelPendingUpload = () => {
    setAttachments((prev) => prev.filter((a) => a.fileId || !a.rawFile))
    setFormModel((prev) => {
      const next = { ...prev }
      for (const panel of panels) {
        for (const field of panel.fields || []) {
          if (field.type !== 'FILE_UPLOAD' && field.type !== 'IMAGE_UPLOAD')
            continue
          const value = next[field.id]
          if (value?.rawFile && !value?.fileId) delete next[field.id]
        }
      }
      return next
    })
    setNeedsManualUpload(false)
    decidedForCurrentBatchRef.current = false
  }

  const submit = async () => {
    setHasAttemptedSubmit(true)

    if (!workflow?.id) {
      const errorMsg = 'Workflow ID is missing. Cannot start workflow.'
      setSubmitError(errorMsg)
      return { error: errorMsg, success: false }
    }

    const missing = getMissingMandatoryFields(
      repoFieldDescriptors,
      panels,
      formModel,
      { hasUploadedFile },
    )
    if (missing.length > 0) {
      const errorMsg = `Please fill in required field(s): ${missing.join(', ')}`
      setSubmitError(errorMsg)
      return { error: errorMsg, success: false }
    }

    setIsSubmitting(true)
    setSubmitError(null)

    let staged: {
      attachments: AttachmentEntry[]
      formModel: Record<string, any>
    }
    try {
      staged = await stageAllPendingFiles()
    } catch (e: unknown) {
      setIsSubmitting(false)
      const message =
        e instanceof Error ? e.message : 'Failed to upload attachment(s).'
      setSubmitError(message)
      return { error: message, success: false }
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

    let resData, resError

    if (
      options?.isRaiseTicket &&
      options.viewerRepositoryId &&
      options.viewerItemId
    ) {
      const { data, error } = await workflowsApiV6.raiseTicket(
        String(workflow.id),
        {
          context: context || null,
          envType: null,
          fileName: options.fileName,
          formData: payload.formData,
          itemId: options.viewerItemId,
          repositoryId: options.viewerRepositoryId,
        },
      )
      resData = data
      resError = error
    } else {
      const { data, error } = await workflowsApiV6.startWorkflowJson(
        String(workflow.id),
        payload,
      )
      resData = data
      resError = error
    }

    setIsSubmitting(false)

    if (resError) {
      setSubmitError(resError)
      return { error: resError, success: false }
    }

    return { data: resData, success: true }
  }

  return {
    addAttachment,
    addComment,
    applyOcrFieldList,
    attachments,
    cancelPendingUpload,
    commentDraft,
    comments,
    confirmUpload,
    form,
    formModel,
    hasAttemptedSubmit,
    hasUploadedFile,
    isExtractingOcr,
    isLoadingForm,
    isSubmitting,
    isUploadingAttachment,
    loadError,
    missingMandatoryFieldIds,
    needsManualUpload,
    panels,
    removeAttachment,
    repoFieldDescriptors,
    repoFieldHints,
    submit,
    submitError,
    uploadedFiles,
    setCommentDraft,
    setFieldValue,
  }
}
