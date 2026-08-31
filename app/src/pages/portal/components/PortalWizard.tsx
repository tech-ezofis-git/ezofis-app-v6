import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadForOcr } from '@/api/v6/folder/folder'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import workflowsApiV6 from '@/api/v6/workflows'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import {
  getFileIcon,
  getFileIconClasses,
} from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import CompactDropzone from '@/pages/requests/components/workflow-request/components/CompactDropzone'
import { buildStartWorkflowPayload } from '@/pages/requests/components/workflow-request/utils/buildStartWorkflowPayload'
import {
  applyFilenamePreFillToFormModel,
  buildFormFieldOcrHints,
  buildRepoFieldDescriptors,
  buildRepoFieldHints,
  buildRepoMetadata,
  extractOcrText,
  getFileExtension,
  getMissingMandatoryFieldIds,
  getMissingMandatoryFields,
  isFieldFilled,
  isFieldHidden,
  isFieldRequired,
  mergeOcrFieldHints,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import cn from '@/utils/cn'
import {
  buildPortalNavSections,
  formPanelSectionId,
  getInitiateNodeLabel,
  PORTAL_SECTION_ATTACHMENTS,
  PORTAL_SECTION_DOCUMENT,
  PORTAL_SECTION_HISTORY,
} from '../helpers/portalDetail'
import {
  type AnswerMap,
  applyOcrFieldListToAnswers,
  applyRepoMandatoryToFormPanels,
  buildPortalFormModel,
  isAnswerFilled,
  mergeExtractedAnswers,
  parseInboxFormData,
} from '../helpers/portalForm'
import {
  loadPortalWizard,
  type PortalWizardSource,
} from '../helpers/portalWizardLoad'
import { getStartActionLabel } from '../helpers/portalWorkflowAccess'
import { usePortalSectionSpy } from '../hooks/usePortalSectionSpy'
import PortalDocumentUpload from './PortalDocumentUpload'
import { PortalDetailSkeleton } from './PortalLayoutSkeleton'
import PortalPanelNav from './PortalPanelNav'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const AP_POLL_ATTEMPTS = 12
const AP_POLL_MS = 10000

type PendingOcrFile = {
  file: File
  fileId?: string
  fileName: string
  ocrChecked: boolean
  ocrFieldList?: { name?: string; type?: string | null; value?: string }[]
  ocrJson?: string
  repositoryId: string
}

type PortalWizardProps = {
  workflowId: string
  workflowName?: string
  onCancel?: () => void
  onChromeChange?: (
    chrome: {
      canSubmit: boolean
      submitLabel: string
      submitting: boolean
      title: string
      onSubmit: () => void
    } | null,
  ) => void
  onSubmitted: () => void
}

const FILE_FIELD_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD'])
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const PortalWizard = ({
  workflowId,
  workflowName,
  onCancel,
  onChromeChange,
  onSubmitted,
}: PortalWizardProps) => {
  const { t } = useLingui()
  const [source, setSource] = useState<PortalWizardSource | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState('')
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [fieldError, setFieldError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [processingText, setProcessingText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [apInstanceId, setApInstanceId] = useState<string | null>(null)
  const [primaryPending, setPrimaryPending] = useState<PendingOcrFile | null>(
    null,
  )
  const [extraPending, setExtraPending] = useState<PendingOcrFile[]>([])
  const [staging, setStaging] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [preparingFieldId, setPreparingFieldId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    void loadPortalWizard(workflowId, workflowName)
      .then((result) => {
        if (cancelled) return
        setSource(result)
        setAnswers({})
        setFiles([])
        setExtraFiles([])
        setActiveId('')
        setApInstanceId(null)
        setPrimaryPending(null)
        setExtraPending([])
        setAttemptedSubmit(false)
        setPreparingFieldId(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof Error
            ? error.message
            : t`Unable to load this workflow form.`,
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [t, workflowId, workflowName])

  const panels = useMemo(() => source?.panels || [], [source])
  const needsDocumentSection = Boolean(
    source &&
      (source.isAccountsPayable ||
        source.repositoryId ||
        source.fileFields.length > 0),
  )
  const documentTitle =
    source?.fileFields[0]?.label ||
    (source?.isAccountsPayable ? t`Invoice` : t`Document`)

  const hiddenFileFieldIds = useMemo(() => {
    if (!needsDocumentSection) return undefined
    const ids = new Set<string>()
    source?.fileFields.forEach((field) => {
      if (field.id) ids.add(field.id)
    })
    panels.forEach((panel) => {
      ;(panel.fields || []).forEach(
        (field: { id?: string; jsonId?: string; type?: string }) => {
          if (!FILE_FIELD_TYPES.has(String(field.type || '').toUpperCase())) {
            return
          }
          if (field.id) ids.add(String(field.id))
          if (field.jsonId) ids.add(String(field.jsonId))
        },
      )
    })
    return ids
  }, [needsDocumentSection, panels, source?.fileFields])

  const repositoryFields = useMemo(
    () => source?.repositoryFields || [],
    [source?.repositoryFields],
  )
  const repoFieldHints = useMemo(
    () => buildRepoFieldHints(repositoryFields),
    [repositoryFields],
  )
  const ocrFieldHints = useMemo(() => {
    const fileFields = (source?.panels || []).flatMap(
      (panel: any) => panel.fields || [],
    )
    return mergeOcrFieldHints(
      repoFieldHints,
      ...fileFields.map((field: any) =>
        buildFormFieldOcrHints(
          source?.panels || [],
          field?.settings?.validation?.assignOtherControls,
        ),
      ),
    )
  }, [repoFieldHints, source?.panels])
  const repoFieldDescriptors = useMemo(
    () => buildRepoFieldDescriptors(repositoryFields, source?.panels || []),
    [repositoryFields, source?.panels],
  )
  const formPanels = useMemo(
    () => applyRepoMandatoryToFormPanels(panels, repoFieldDescriptors),
    [panels, repoFieldDescriptors],
  )
  const pendingUploadFileName =
    primaryPending?.fileName ||
    files[0]?.name ||
    extraPending.find((item) => item.fileName)?.fileName ||
    extraFiles[0]?.name ||
    ''
  const portalFormModel = useMemo(
    () =>
      applyFilenamePreFillToFormModel(
        buildPortalFormModel(source?.questions || [], answers),
        repoFieldDescriptors,
        pendingUploadFileName,
      ),
    [answers, pendingUploadFileName, repoFieldDescriptors, source?.questions],
  )
  const missingMandatoryFields = useMemo(
    () => getMissingMandatoryFields(repoFieldDescriptors, portalFormModel),
    [portalFormModel, repoFieldDescriptors],
  )
  const missingMandatoryFieldIds = useMemo(() => {
    const ids = getMissingMandatoryFieldIds(
      repoFieldDescriptors,
      portalFormModel,
    )
    repoFieldDescriptors.forEach((descriptor) => {
      if (!ids.has(descriptor.fieldId) || !descriptor.matchedFieldId) return
      ids.add(descriptor.matchedFieldId)
    })
    formPanels.forEach((panel) => {
      ;(panel.fields || []).forEach((field) => {
        const fieldId = String(field.id || '')
        const jsonId = String(field.jsonId || '')
        if (
          hiddenFileFieldIds?.has(fieldId) ||
          (jsonId && hiddenFileFieldIds?.has(jsonId)) ||
          isFieldHidden(field) ||
          !isFieldRequired(field)
        ) {
          return
        }
        const value =
          portalFormModel[fieldId] ??
          (jsonId ? portalFormModel[jsonId] : undefined)
        if (!isFieldFilled(field, value)) {
          if (fieldId) ids.add(fieldId)
          if (jsonId) ids.add(jsonId)
        }
      })
    })
    return ids
  }, [
    formPanels,
    hiddenFileFieldIds,
    portalFormModel,
    repoFieldDescriptors,
  ])

  const sections = useMemo(() => {
    const items = buildPortalNavSections(
      formPanels,
      {
        attachments: t`Attachments`,
        history: t`Activity`,
      },
      portalFormModel,
      hiddenFileFieldIds,
    ).filter((section) => section.id !== PORTAL_SECTION_HISTORY)

    const itemsWithAttachments = items.map((sec) =>
      sec.id === PORTAL_SECTION_ATTACHMENTS
        ? { ...sec, completed: extraFiles.length > 0 }
        : sec,
    )

    if (!needsDocumentSection) return itemsWithAttachments

    const isDocCompleted = Boolean(files.length > 0 || primaryPending)
    return [
      {
        completed: isDocCompleted,
        id: PORTAL_SECTION_DOCUMENT,
        title: documentTitle,
      },
      ...itemsWithAttachments,
    ]
  }, [
    documentTitle,
    extraFiles.length,
    files.length,
    formPanels,
    hiddenFileFieldIds,
    needsDocumentSection,
    portalFormModel,
    primaryPending,
    t,
  ])
  const sectionIds = useMemo(
    () => sections.map((section) => section.id),
    [sections],
  )

  useEffect(() => {
    if (!sections[0]) return
    setActiveId((current) => current || sections[0].id)
  }, [sections])

  const { scrollToSection } = usePortalSectionSpy(
    scrollEl,
    sectionIds,
    (id) => setActiveId((current) => (current === id ? current : id)),
  )

  const selectSection = (id: string) => {
    scrollToSection(id)
  }

  const jumpAfterApFill = (nextAnswers: AnswerMap) => {
    if (!source) return
    const firstEmptyPanel = source.questionPanels.findIndex((panel) =>
      panel.questions.some(
        (question) => !isAnswerFilled(nextAnswers[question.id]),
      ),
    )
    const panelIndex = firstEmptyPanel === -1 ? 0 : firstEmptyPanel
    const panel = source.panels[panelIndex]
    if (!panel) return
    selectSection(formPanelSectionId(panel, panelIndex))
  }

  const startAccountsPayable = async (file: File) => {
    if (!source) return
    setProcessing(true)
    setProcessingText(t`setting up...`)
    setFieldError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', '')
      formData.append('envType', 'trial')

      const startRes = await workflowsApiV6.startWorkflow(
        source.workflowId,
        formData,
      )
      if (startRes.error || !startRes.data) {
        throw new Error(
          String(startRes.error || t`Unable to start this workflow.`),
        )
      }

      const parsed =
        typeof startRes.data === 'string'
          ? JSON.parse(startRes.data)
          : startRes.data
      const instanceId = parsed?.instanceId
      if (instanceId) setApInstanceId(String(instanceId))

      let filledAnswers: AnswerMap | null = null
      for (let attempt = 0; attempt < AP_POLL_ATTEMPTS; attempt++) {
        setProcessingText(t`setting up...`)
        await sleep(AP_POLL_MS)
        const inboxRes = await workflowsApiV6.getInboxList(
          source.workflowId,
          1,
          5,
          instanceId,
        )
        const item = inboxRes.data?.items?.[0]
        if (!item?.formData) continue

        const extracted = parseInboxFormData(item.formData)
        let nonEmptyCount = 0
        Object.values(extracted).forEach((value) => {
          if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
          ) {
            nonEmptyCount += 1
          }
        })
        if (nonEmptyCount < 2) continue

        filledAnswers = mergeExtractedAnswers(
          source.questions,
          answers,
          extracted,
        )
        setAnswers(filledAnswers)
        break
      }

      if (filledAnswers) {
        jumpAfterApFill(filledAnswers)
      } else {
        showToast({
          message: t`Document attached. Please confirm the details on the next steps.`,
        })
      }
    } catch (error) {
      console.error(error)
      showToast({
        message:
          error instanceof Error
            ? error.message
            : t`Unable to process this document.`,
        variant: 'error',
      })
    } finally {
      setProcessing(false)
      setProcessingText('')
    }
  }

  const takeAcceptedFiles = (list: FileList | null) => {
    const incoming = Array.from(list || [])
    if (!incoming.length) return []
    const accepted = incoming.filter((file) => file.size <= MAX_FILE_SIZE)
    if (accepted.length !== incoming.length) {
      showToast({
        message: t`Each file must be 10 MB or smaller.`,
        variant: 'error',
      })
    }
    return accepted
  }

  const applyOcrToAnswers = (
    ocrFieldList: { name?: string; value?: string }[] | undefined,
  ) => {
    if (!source) return
    setAnswers((prev) => {
      const next = applyOcrFieldListToAnswers(
        source.questions,
        source.panels,
        prev,
        ocrFieldList,
      )
      repoFieldDescriptors.forEach((descriptor) => {
        const name = descriptor.repoField.name
        if (!name) return
        const folderLabel = name.trim().toLowerCase()
        const ocrItem = (ocrFieldList || []).find(
          (item) => item?.name && item.name.trim().toLowerCase() === folderLabel,
        )
        const value =
          ocrItem?.value ??
          next[descriptor.fieldId] ??
          (descriptor.matchedFieldId
            ? next[descriptor.matchedFieldId]
            : undefined)
        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ''
        ) {
          return
        }
        next[descriptor.fieldId] = value
        if (descriptor.matchedFieldId) next[descriptor.matchedFieldId] = value
        const question = source.questions.find((item) => {
          const formLabel = item.label.trim().toLowerCase()
          return (
            formLabel === folderLabel ||
            item.id === descriptor.matchedFieldId ||
            String(item.field.id) === descriptor.matchedFieldId ||
            String(item.field.jsonId) === descriptor.matchedFieldId
          )
        })
        if (!question) return
        next[question.id] = value
        if (question.field.id) next[String(question.field.id)] = value
        if (question.field.jsonId) next[String(question.field.jsonId)] = value
      })
      return next
    })
    const firstPanel = source.panels[0]
    if (firstPanel) selectSection(formPanelSectionId(firstPanel, 0))
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFieldError('')
    setAnswers((prev) => {
      const next = { ...prev, [fieldId]: value }
      const question = source?.questions.find(
        (item) =>
          item.id === fieldId ||
          String(item.field.id) === fieldId ||
          String(item.field.jsonId) === fieldId,
      )
      if (question) {
        next[question.id] = value
        if (question.field.id) next[String(question.field.id)] = value
        if (question.field.jsonId) next[String(question.field.jsonId)] = value
      }
      const descriptor = repoFieldDescriptors.find((item) => {
        if (item.fieldId === fieldId || item.matchedFieldId === fieldId) {
          return true
        }
        if (!question || !item.repoField.name) return false
        return (
          item.repoField.name.trim().toLowerCase() ===
          question.label.trim().toLowerCase()
        )
      })
      if (!descriptor) return next
      next[descriptor.fieldId] = value
      if (descriptor.matchedFieldId) next[descriptor.matchedFieldId] = value
      const matchedQuestion = source?.questions.find(
        (item) =>
          item.id === descriptor.matchedFieldId ||
          String(item.field.id) === descriptor.matchedFieldId ||
          String(item.field.jsonId) === descriptor.matchedFieldId,
      )
      if (matchedQuestion) {
        next[matchedQuestion.id] = value
        if (matchedQuestion.field.id) {
          next[String(matchedQuestion.field.id)] = value
        }
        if (matchedQuestion.field.jsonId) {
          next[String(matchedQuestion.field.jsonId)] = value
        }
      }
      return next
    })
  }

  const runOcrForPrimary = async (file: File) => {
    if (!source?.repositoryId) {
      setPrimaryPending(null)
      return
    }
    setProcessing(true)
    setProcessingText(t`Extracting data from the document…`)
    setFieldError('')
    try {
      const { data, error } = await uploadForOcr(
        String(source.repositoryId),
        file,
        ocrFieldHints,
      )
      if (error || !data) {
        console.warn(
          '[uploadForOcr] OCR extraction warning:',
          error || 'OCR data unavailable',
        )
        setPrimaryPending({
          file,
          fileName: file.name,
          ocrChecked: true,
          repositoryId: String(source.repositoryId),
        })
        return
      }
      applyOcrToAnswers(data.ocrFieldList)
      setPrimaryPending({
        file,
        fileName: file.name,
        ocrChecked: true,
        ocrFieldList: data.ocrFieldList,
        ocrJson: data.ocrJson,
        repositoryId: String(source.repositoryId),
      })
    } catch (error) {
      console.error(error)
      showToast({
        message:
          error instanceof Error
            ? error.message
            : t`Unable to process this document.`,
        variant: 'error',
      })
      setPrimaryPending({
        file,
        fileName: file.name,
        ocrChecked: true,
        repositoryId: String(source.repositoryId),
      })
    } finally {
      setProcessing(false)
      setProcessingText('')
    }
  }

  const attachStagedFileToModel = (
    formModel: Record<string, unknown>,
    pending: PendingOcrFile,
  ) => {
    if (!pending.fileId || !source) return formModel
    const value = {
      fileId: pending.fileId,
      fileName: pending.fileName,
      repositoryId: pending.repositoryId,
    }
    source.fileFields.forEach((field) => {
      formModel[field.id] = value
    })
    source.panels.forEach((panel) => {
      ;(panel.fields || []).forEach((field) => {
        if (
          FILE_FIELD_TYPES.has(String(field.type || '').toUpperCase()) &&
          field.id
        ) {
          formModel[String(field.id)] = value
        }
      })
    })
    return formModel
  }

  const stagePrimaryFile = async (pending = primaryPending) => {
    if (!source?.repositoryId || !pending || pending.fileId) return pending
    const formModel = applyFilenamePreFillToFormModel(
      buildPortalFormModel(source.questions, answers),
      repoFieldDescriptors,
      pending.fileName,
    )
    const { data, error } = await uploadAndIndexApi.uploadWithOcr({
      fields: ocrFieldHints,
      file: pending.file,
      metadata: buildRepoMetadata(
        repositoryFields,
        source.panels,
        formModel,
        pending.fileName,
      ),
      ocrFieldList: pending.ocrFieldList,
      ocrJson: pending.ocrJson,
      ocrText: extractOcrText(pending.ocrJson),
      repositoryId: pending.repositoryId || String(source.repositoryId),
    })
    if (error || !data?.fileId) {
      const fileName = pending.fileName
      throw new Error(error || t`Unable to upload ${fileName}.`)
    }
    const nextPending = {
      ...pending,
      fileId: data.fileId,
      repositoryId: data.repositoryId || pending.repositoryId,
    }
    setPrimaryPending(nextPending)
    return nextPending
  }

  const stageExtraFiles = async () => {
    const extraAttachments: { fileId: string; repositoryId: string }[] = []
    if (!source?.repositoryId) return extraAttachments
    const nextPending = [...extraPending]
    for (let index = 0; index < nextPending.length; index++) {
      const pending = nextPending[index]
      if (pending.fileId) {
        extraAttachments.push({
          fileId: pending.fileId,
          repositoryId: pending.repositoryId,
        })
        continue
      }
      const formModel = applyFilenamePreFillToFormModel(
        buildPortalFormModel(source.questions, answers),
        repoFieldDescriptors,
        pending.fileName,
      )
      const { data, error } = await uploadAndIndexApi.uploadWithOcr({
        fields: ocrFieldHints,
        file: pending.file,
        metadata: buildRepoMetadata(
          repositoryFields,
          source.panels,
          formModel,
          pending.fileName,
        ),
        ocrFieldList: pending.ocrFieldList,
        ocrJson: pending.ocrJson,
        ocrText: extractOcrText(pending.ocrJson),
        repositoryId: pending.repositoryId || String(source.repositoryId),
      })
      if (error || !data?.fileId) {
        const fileName = pending.fileName
        throw new Error(error || t`Unable to upload ${fileName}.`)
      }
      nextPending[index] = {
        ...pending,
        fileId: data.fileId,
        repositoryId: data.repositoryId || pending.repositoryId,
      }
      extraAttachments.push({
        fileId: data.fileId,
        repositoryId: data.repositoryId || pending.repositoryId,
      })
    }
    setExtraPending(nextPending)
    return extraAttachments
  }

  const handleSelectPrimaryFiles = (list: FileList | null) => {
    const accepted = takeAcceptedFiles(list)
    if (!accepted.length) return
    const file = accepted[0]
    setFiles([file])
    setFieldError('')
    setPrimaryPending(null)
    source?.fileFields.forEach((field) => {
      handleFieldChange(field.id, { fileName: file.name, rawFile: file })
    })
    if (source?.isAccountsPayable && !apInstanceId) {
      void startAccountsPayable(file)
    } else if (source?.repositoryId) {
      void runOcrForPrimary(file)
    }
  }

  const handleAnalyzeDocument = async () => {
    const file = files[0]
    if (!file) return
    if (source?.isAccountsPayable && !apInstanceId) {
      await startAccountsPayable(file)
      return
    }
    if (!source?.repositoryId) {
      showToast({
        message: t`Can't upload: this workflow has no repository configured.`,
        variant: 'error',
      })
      return
    }
    await runOcrForPrimary(file)
  }

  const handleRequestUpload = async (fieldId: string, file: File) => {
    setPreparingFieldId(fieldId)
    handleFieldChange(fieldId, { fileName: file.name, rawFile: file })
    setFiles([file])
    setFieldError('')
    setPrimaryPending(null)
    try {
      if (source?.isAccountsPayable && !apInstanceId) {
        await startAccountsPayable(file)
        return
      }
      if (!source?.repositoryId) return
      await runOcrForPrimary(file)
    } finally {
      setPreparingFieldId(null)
    }
  }

  const handleExtraFiles = async (list: FileList | null) => {
    const accepted = takeAcceptedFiles(list)
    if (!accepted.length) return
    setExtraFiles((prev) => [...prev, ...accepted])
    setFieldError('')

    if (source?.isAccountsPayable || !source?.repositoryId) {
      setExtraPending((prev) => [
        ...prev,
        ...accepted.map((file) => ({
          file,
          fileName: file.name,
          ocrChecked: true,
          repositoryId: String(source?.repositoryId || ''),
        })),
      ])
      return
    }

    setProcessing(true)
    setProcessingText(t`Extracting data from the document…`)
    try {
      for (const file of accepted) {
        const { data, error } = await uploadForOcr(
          String(source.repositoryId),
          file,
          ocrFieldHints,
        )
        if (!error && data) applyOcrToAnswers(data.ocrFieldList)
        setExtraPending((prev) => [
          ...prev,
          {
            file,
            fileName: file.name,
            ocrChecked: true,
            ocrFieldList: data?.ocrFieldList,
            ocrJson: data?.ocrJson,
            repositoryId: String(source.repositoryId),
          },
        ])
      }
    } catch (error) {
      console.error(error)
      showToast({
        message:
          error instanceof Error
            ? error.message
            : t`Unable to process this document.`,
        variant: 'error',
      })
      setExtraPending((prev) => [
        ...prev,
        ...accepted.map((file) => ({
          file,
          fileName: file.name,
          ocrChecked: true,
          repositoryId: String(source.repositoryId),
        })),
      ])
    } finally {
      setProcessing(false)
      setProcessingText('')
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
    setPrimaryPending(null)
  }

  const removeExtraFile = (index: number) => {
    setExtraFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
    setExtraPending((prev) =>
      prev.filter((_, fileIndex) => fileIndex !== index),
    )
  }

  const wizardTitle = source?.workflowName || workflowName || t`New Submission`
  const submitLabel = source ? getStartActionLabel(source.workflow) : t`Submit`
  const canSubmit =
    Boolean(source) &&
    !processing &&
    !submitting &&
    !staging &&
    !loading &&
    !loadError

  const collectMissingRequiredLabels = () => {
    const labels: string[] = []
    const seen = new Set<string>()
    const add = (label: string) => {
      const key = label.trim().toLowerCase()
      if (!key || seen.has(key)) return
      seen.add(key)
      labels.push(label)
    }
    formPanels.forEach((panel) => {
      ;(panel.fields || []).forEach((field) => {
        const fieldId = String(field.id || '')
        const jsonId = String(field.jsonId || '')
        if (
          hiddenFileFieldIds?.has(fieldId) ||
          (jsonId && hiddenFileFieldIds?.has(jsonId)) ||
          isFieldHidden(field) ||
          !isFieldRequired(field)
        ) {
          return
        }
        const value =
          portalFormModel[fieldId] ??
          (jsonId ? portalFormModel[jsonId] : undefined)
        if (!isFieldFilled(field, value)) {
          add(String(field.label || field.name || t`Required field`))
        }
      })
    })
    missingMandatoryFields.forEach((name) => add(name))
    return labels
  }

  const handleSubmit = async () => {
    setAttemptedSubmit(true)
    if (!source || processing || submitting || staging) return

    const missing = collectMissingRequiredLabels()
    if (missing.length > 0) {
      const list = missing.join(', ')
      showToast({
        message: t`Please fill in required field(s): ${list}`,
        variant: 'error',
      })
      return
    }

    setSubmitting(true)

    try {
      if (source.isAccountsPayable) {
        if (apInstanceId) {
          showToast({
            message: t`Request created. You can track it from My Submissions.`,
          })
          onSubmitted()
        }
        return
      }

      let stagedPrimary = primaryPending
      let extraAttachments: { fileId: string; repositoryId: string }[] = []
      if (source.repositoryId) {
        setStaging(true)
        const pending =
          primaryPending ||
          (files[0]
            ? {
                file: files[0],
                fileName: files[0].name,
                ocrChecked: false,
                repositoryId: String(source.repositoryId),
              }
            : null)
        if (pending) stagedPrimary = await stagePrimaryFile(pending)
        extraAttachments = await stageExtraFiles()
        setStaging(false)
      }

      const formModel = applyFilenamePreFillToFormModel(
        buildPortalFormModel(source.questions, answers),
        repoFieldDescriptors,
        stagedPrimary?.fileName || pendingUploadFileName,
      )
      if (stagedPrimary?.fileId) {
        attachStagedFileToModel(formModel, stagedPrimary)
        if (!source.fileFields.length) {
          extraAttachments.unshift({
            fileId: stagedPrimary.fileId,
            repositoryId: stagedPrimary.repositoryId,
          })
        }
      }

      const payload = buildStartWorkflowPayload(
        source.panels,
        formModel,
        extraAttachments,
      )
      const { error } = await workflowsApiV6.startWorkflowJson(
        source.workflowId,
        payload,
      )
      if (error) throw new Error(String(error))

      showToast({
        message: t`Request created. You can track it from My Submissions.`,
      })
      onSubmitted()
    } catch (error) {
      console.error(error)
      showToast({
        message:
          error instanceof Error
            ? error.message
            : t`Unable to create this request.`,
        variant: 'error',
      })
    } finally {
      setStaging(false)
      setSubmitting(false)
    }
  }

  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  const initiateNodeLabel = useMemo(() => {
    if (!source?.workflow) return ''
    return getInitiateNodeLabel(source.workflow)
  }, [source?.workflow])

  useEffect(() => {
    onChromeChange?.({
      canSubmit,
      stageLabel: initiateNodeLabel,
      submitLabel,
      submitting,
      title: wizardTitle,
      onSubmit: () => {
        void handleSubmitRef.current()
      },
    })
  }, [
    canSubmit,
    initiateNodeLabel,
    onChromeChange,
    submitLabel,
    submitting,
    wizardTitle,
  ])

  useEffect(
    () => () => {
      onChromeChange?.(null)
    },
    [onChromeChange],
  )

  const renderFileList = (list: File[], onRemove: (index: number) => void) =>
    list.length > 0 ? (
      <div className='mt-3 flex flex-col gap-2'>
        {list.map((file, fileIndex) => {
          const ext = getFileExtension(file.name)
          const styles = getFileIconClasses(ext)
          return (
            <div
              className='flex items-center gap-2.5 rounded-lg border border-gray-4 bg-surface p-2.5'
              key={`${file.name}-${fileIndex}`}
            >
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg',
                  styles.wrap,
                )}
              >
                <Icon className='size-4' name={getFileIcon(file.name)} />
              </div>
              <div className='min-w-0 flex-1 overflow-hidden'>
                <Tooltip content={file.name} position='top' width={280}>
                  <span className='block max-w-full truncate text-12 font-semibold text-gray-9'>
                    {file.name}
                  </span>
                </Tooltip>
              </div>
              <button
                className='flex size-6 items-center justify-center rounded-md text-gray-8 transition hover:bg-red-2 hover:text-red-9'
                type='button'
                onClick={() => onRemove(fileIndex)}
              >
                <Icon className='size-3.5' name='lucide:x' />
              </button>
            </div>
          )
        })}
      </div>
    ) : null

  if (loading) {
    return (
      <div className='h-full min-h-0'>
        <PortalDetailSkeleton />
      </div>
    )
  }

  if (loadError || !source) {
    return (
      <div className='rounded-xl border border-gray-4 bg-surface p-8 text-center text-13 text-gray-10'>
        {loadError || t`This workflow has no form configured.`}
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0'>
      <aside className='hidden h-full min-h-0 w-72 shrink-0 overflow-hidden border-r border-gray-4 bg-surface md:flex md:flex-col xl:w-80'>
        <PortalPanelNav
          activeId={activeId}
          sections={sections}
          onSelect={selectSection}
        />
      </aside>

      <section
        className='h-full min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5'
        ref={setScrollEl}
      >
        <div className='sticky top-0 z-10 mb-4 bg-gray-2 md:hidden'>
          <PortalPanelNav
            activeId={activeId}
            sections={sections}
            onSelect={selectSection}
          />
        </div>

        {needsDocumentSection ? (
          <div className='mb-3 scroll-mt-3' id={PORTAL_SECTION_DOCUMENT}>
            <PortalDocumentUpload
              analyzed={Boolean(primaryPending?.ocrChecked || apInstanceId)}
              analyzing={processing && preparingFieldId === null}
              analyzingText={processingText}
              file={files[0] || null}
              isInvoice={source.isAccountsPayable}
              label={documentTitle}
              stepCount={Math.max(sections.length, 1)}
              onAnalyze={() => void handleAnalyzeDocument()}
              onCancel={() => onCancel?.()}
              onFiles={handleSelectPrimaryFiles}
              onRemoveFile={() => removeFile(0)}
            />
            {fieldError ? (
              <p className='mt-3 text-12 font-medium text-red-9'>{fieldError}</p>
            ) : null}
          </div>
        ) : null}

        {formPanels.length > 0 ? (
          <WorkflowFormRenderer
            disableOwnScroll
            formModel={portalFormModel}
            hasAttemptedSubmit={attemptedSubmit}
            hiddenFieldIds={hiddenFileFieldIds}
            missingMandatoryFieldIds={missingMandatoryFieldIds}
            panels={formPanels}
            preparePhase={
              processing ? 'extracting' : staging ? 'uploading' : null
            }
            preparingFieldId={preparingFieldId}
            repoFieldHints={repoFieldHints}
            repositoryId={source.repositoryId}
            getPanelValue={(panel, index) => formPanelSectionId(panel, index)}
            onFieldChange={handleFieldChange}
            onOcrFieldList={applyOcrToAnswers}
            onRequestUpload={handleRequestUpload}
          />
        ) : (
          <div className='rounded-xl border border-gray-4 bg-surface p-5 text-13 text-gray-10'>
            {t`No form panels found for this request.`}
          </div>
        )}

        <div
          className='mt-3 scroll-mt-3 rounded-xl border border-gray-3 bg-gray-0 p-6 shadow-2xs transition-shadow hover:shadow-sm'
          id={PORTAL_SECTION_ATTACHMENTS}
        >
          <div className='mb-3 text-15 font-semibold text-gray-13'>
            {t`Attachments`}
          </div>
          {processing && extraFiles.length > 0 && preparingFieldId === null ? (
            <div className='flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-gray-4 bg-gray-1'>
              <Icon
                className='size-8 animate-spin text-primary-9'
                name='tabler:loader-2'
              />
              <p className='text-13 font-medium text-gray-11'>
                {processingText || t`Extracting data from the document…`}
              </p>
            </div>
          ) : (
            <CompactDropzone
              accept='application/pdf,image/*'
              loadingText={t`Extracting data from the document…`}
              multiple
              onFiles={handleExtraFiles}
            />
          )}
          {renderFileList(extraFiles, removeExtraFile)}
        </div>
      </section>
    </div>
  )
}

PortalWizard.displayName = 'PortalWizard'
export default PortalWizard
