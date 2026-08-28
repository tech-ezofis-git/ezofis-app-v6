import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadForOcr } from '@/api/v6/folder/folder'
import uploadAndIndexApi from '@/api/v6/uploadAndIndex'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import { AnimateSlideUp } from '@/components/common/animations'
import {
  getFileIcon,
  getFileIconClasses,
} from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import CompactDropzone from '@/pages/requests/components/workflow-request/components/CompactDropzone'
import RepoFieldsPanel from '@/pages/requests/components/workflow-request/components/RepoFieldsPanel'
import { buildStartWorkflowPayload } from '@/pages/requests/components/workflow-request/utils/buildStartWorkflowPayload'
import {
  buildFormFieldOcrHints,
  buildRepoFieldDescriptors,
  buildRepoFieldHints,
  buildRepoMetadata,
  extractOcrText,
  getFileExtension,
  getMissingMandatoryFieldIds,
  getMissingMandatoryFields,
  mergeOcrFieldHints,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import cn from '@/utils/cn'
import {
  type AnswerMap,
  applyOcrFieldListToAnswers,
  buildPortalFormModel,
  formatAnswer,
  isAnswerFilled,
  isQuestionVisited,
  mergeExtractedAnswers,
  parseInboxFormData,
  type PortalQuestionPanel,
} from '../helpers/portalForm'
import {
  loadPortalWizard,
  type PortalWizardSource,
} from '../helpers/portalWizardLoad'
import { getStartActionLabel } from '../helpers/portalWorkflowAccess'
import { PortalWizardSkeleton } from './PortalLayoutSkeleton'
import PortalMetaRow from './PortalMetaRow'
import PortalWizardChat from './PortalWizardChat'

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

type WizardStep =
  | { kind: 'attachments'; title: string }
  | { kind: 'panel'; panel: PortalQuestionPanel; title: string }
  | { kind: 'review'; title: string }
  | { kind: 'upload'; label: string; title: string }

const FILE_FIELD_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD'])
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const PortalWizard = ({
  workflowId,
  workflowName,
  onChromeChange,
  onSubmitted,
}: PortalWizardProps) => {
  const { t } = useLingui()
  const [source, setSource] = useState<PortalWizardSource | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [maxReached, setMaxReached] = useState(0)
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
        setStepIndex(0)
        setMaxReached(0)
        setApInstanceId(null)
        setPrimaryPending(null)
        setExtraPending([])
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

  const steps = useMemo<WizardStep[]>(() => {
    const panelSteps: WizardStep[] = (source?.questionPanels || []).map(
      (panel) => ({
        kind: 'panel',
        panel,
        title: panel.title,
      }),
    )
    const uploadField = source?.fileFields[0]
    const uploadStep: WizardStep = {
      kind: 'upload',
      label:
        uploadField?.label ||
        (source?.isAccountsPayable ? t`Invoice` : t`Document`),
      title:
        uploadField?.label ||
        (source?.isAccountsPayable ? t`Invoice` : t`Document`),
    }
    const attachmentsStep: WizardStep = {
      kind: 'attachments',
      title: t`Attachments`,
    }
    const reviewStep: WizardStep = { kind: 'review', title: t`Review & Submit` }

    if (source?.isAccountsPayable) {
      return [uploadStep, ...panelSteps, attachmentsStep, reviewStep]
    }
    if (source?.repositoryId || uploadField) {
      return [uploadStep, ...panelSteps, attachmentsStep, reviewStep]
    }
    return [...panelSteps, attachmentsStep, reviewStep]
  }, [source, t])

  const totalSteps = steps.length
  const current = steps[stepIndex]
  const currentStep = stepIndex + 1
  const percent =
    totalSteps <= 1 ? 100 : Math.round((stepIndex / (totalSteps - 1)) * 100)

  const goTo = (index: number) => {
    setFieldError('')
    setStepIndex(index)
    setMaxReached((prev) => Math.max(prev, index))
  }

  const panelComplete = (panel: PortalQuestionPanel) =>
    panel.questions.every((question) =>
      question.required
        ? isAnswerFilled(answers[question.id])
        : isQuestionVisited(answers[question.id]),
    )

  const handleNext = async () => {
    if (!current) return
    if (current.kind === 'panel' && !panelComplete(current.panel)) {
      setFieldError(t`Please answer the required questions in this section.`)
      return
    }
    if (current.kind === 'upload') {
      if (files.length === 0) {
        setFieldError(t`Please attach a file to continue.`)
        return
      }
      jumpAfterApFill(answers)
      return
    }

    let nextIndex = stepIndex + 1
    while (nextIndex < steps.length) {
      const nextStep = steps[nextIndex]
      if (nextStep.kind === 'panel' && panelComplete(nextStep.panel)) {
        nextIndex += 1
        continue
      }
      break
    }
    goTo(Math.min(nextIndex, totalSteps - 1))
  }

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
  const portalFormModel = useMemo(
    () => buildPortalFormModel(source?.questions || [], answers),
    [answers, source?.questions],
  )
  const repoFieldDescriptors = useMemo(
    () => buildRepoFieldDescriptors(repositoryFields, source?.panels || []),
    [repositoryFields, source?.panels],
  )
  const missingMandatoryFields = useMemo(
    () => getMissingMandatoryFields(repoFieldDescriptors, portalFormModel),
    [portalFormModel, repoFieldDescriptors],
  )
  const missingMandatoryFieldIds = useMemo(
    () => getMissingMandatoryFieldIds(repoFieldDescriptors, portalFormModel),
    [portalFormModel, repoFieldDescriptors],
  )

  const jumpAfterApFill = (nextAnswers: AnswerMap) => {
    if (!source) return
    const firstEmptyPanel = source.questionPanels.findIndex((panel) =>
      panel.questions.some(
        (question) => !isAnswerFilled(nextAnswers[question.id]),
      ),
    )
    if (firstEmptyPanel === -1) {
      goTo(source.questionPanels.length + 1)
      return
    }
    goTo(firstEmptyPanel + 1)
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
    setAnswers((prev) =>
      applyOcrFieldListToAnswers(
        source.questions,
        source.panels,
        prev,
        ocrFieldList,
      ),
    )
  }

  const handleRepoFieldChange = (fieldId: string, value: unknown) => {
    setFieldError('')
    setAnswers((prev) => {
      const next = { ...prev, [fieldId]: value }
      const descriptor = repoFieldDescriptors.find(
        (item) => item.fieldId === fieldId || item.matchedFieldId === fieldId,
      )
      if (!descriptor) return next
      next[descriptor.fieldId] = value
      if (descriptor.matchedFieldId) next[descriptor.matchedFieldId] = value
      const question = source?.questions.find(
        (item) =>
          item.id === descriptor.matchedFieldId ||
          String(item.field.id) === descriptor.matchedFieldId ||
          String(item.field.jsonId) === descriptor.matchedFieldId,
      )
      if (question) next[question.id] = value
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
    const formModel = buildPortalFormModel(source.questions, answers)
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
    const formModel = buildPortalFormModel(source.questions, answers)
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

  const handleConfirmUpload = async () => {
    if (!source?.repositoryId) return false
    if (missingMandatoryFields.length > 0) {
      const missing = missingMandatoryFields.join(', ')
      setFieldError(t`Please fill in required field(s): ${missing}`)
      return false
    }
    setStaging(true)
    setFieldError('')
    try {
      if (current?.kind === 'attachments') {
        await stageExtraFiles()
      } else {
        await stagePrimaryFile()
      }
      showToast({ message: t`File uploaded.` })
      return true
    } catch (error) {
      console.error(error)
      showToast({
        message:
          error instanceof Error
            ? error.message
            : t`Unable to upload this file.`,
        variant: 'error',
      })
      return false
    } finally {
      setStaging(false)
    }
  }

  const handleUploadFiles = async (list: FileList | null) => {
    const accepted = takeAcceptedFiles(list)
    if (!accepted.length) return
    setFiles(accepted.slice(0, 1))
    setFieldError('')
    setPrimaryPending(null)
    if (source?.isAccountsPayable && !apInstanceId) {
      await startAccountsPayable(accepted[0])
      return
    }
    if (!source?.repositoryId) {
      showToast({
        message: t`Can't upload: this workflow has no repository configured.`,
        variant: 'error',
      })
      return
    }
    await runOcrForPrimary(accepted[0])
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
  const isFormComplete = Boolean(
    source &&
    source.questions
      .filter((question) => question.required)
      .every((question) => isAnswerFilled(answers[question.id])) &&
    (!source.isAccountsPayable || files.length > 0) &&
    (!primaryPending || Boolean(primaryPending.fileId)),
  )
  const canSubmit =
    isFormComplete &&
    !processing &&
    !submitting &&
    !staging &&
    !loading &&
    !loadError

  const handleSubmit = async () => {
    if (!source || !isFormComplete || processing || submitting || staging)
      return
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
      if (!source.isAccountsPayable && source.repositoryId) {
        if (missingMandatoryFields.length > 0) {
          const missing = missingMandatoryFields.join(', ')
          throw new Error(t`Please fill in required field(s): ${missing}`)
        }
        stagedPrimary = await stagePrimaryFile(primaryPending)
      }

      const extraAttachments = source.repositoryId
        ? await stageExtraFiles()
        : []

      const formModel = buildPortalFormModel(source.questions, answers)
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
      setSubmitting(false)
    }
  }

  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  useEffect(() => {
    onChromeChange?.({
      canSubmit,
      submitLabel,
      submitting,
      title: wizardTitle,
      onSubmit: () => {
        void handleSubmitRef.current()
      },
    })
  }, [canSubmit, onChromeChange, submitLabel, submitting, wizardTitle])

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
    return <PortalWizardSkeleton />
  }

  if (loadError || !source || !current) {
    return (
      <div className='rounded-xl border border-gray-4 bg-surface p-8 text-center text-13 text-gray-10'>
        {loadError || t`This workflow has no form configured.`}
      </div>
    )
  }

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-5'>
      <AnimateSlideUp delay={0.04}>
        <div className='flex items-end justify-between gap-3'>
          <div className='text-13 font-medium text-gray-10'>
            {t`Step ${currentStep} of ${totalSteps}`}
          </div>
          <div className='text-13 font-semibold text-primary-11'>
            {percent}% {t`complete`}
          </div>
        </div>
        <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-gray-3'>
          <div
            className='h-full rounded-full bg-gradient-to-r from-primary-9 to-cyan-8 transition-all duration-500'
            style={{ width: `${percent}%` }}
          />
        </div>
      </AnimateSlideUp>

      <div className='relative flex flex-col gap-3 pl-10'>
        <div className='absolute top-4 bottom-4 left-[13px] w-px bg-gray-4' />

        {steps.map((step, index) => {
          const isActive = index === stepIndex
          const isLocked = index > maxReached
          const isDone = !isActive && !isLocked
          const panel = step.kind === 'panel' ? step.panel : undefined
          const isUploadStaged = source.isAccountsPayable
            ? files.length > 0
            : source.repositoryId
              ? Boolean(primaryPending?.fileId)
              : files.length > 0
          const isAttachmentsStaged =
            extraPending.length === 0 ||
            (source.isAccountsPayable
              ? extraFiles.length > 0
              : extraPending.every((item) => Boolean(item.fileId)))
          const canContinueStep =
            step.kind === 'panel' && panel
              ? panelComplete(panel)
              : step.kind === 'upload'
                ? isUploadStaged && !processing && !staging
                : step.kind === 'attachments'
                  ? isAttachmentsStaged && !processing && !staging
                  : canSubmit
          const showStageUpload =
            !source.isAccountsPayable &&
            (step.kind === 'upload'
              ? Boolean(primaryPending?.ocrChecked && !primaryPending.fileId)
              : step.kind === 'attachments'
                ? extraPending.some((item) => item.ocrChecked && !item.fileId)
                : false)

          return (
            <div className='relative' key={`${step.kind}-${index}`}>
              <div
                className={cn(
                  'absolute top-4 left-[-40px] flex size-7 items-center justify-center rounded-full text-12 font-semibold',
                  isDone && 'bg-green-9 text-gray-0',
                  isActive && 'bg-primary-9 text-gray-0',
                  !isDone && !isActive && 'bg-gray-4 text-gray-9',
                )}
              >
                {isDone ? (
                  <Icon className='size-3.5' name='lucide:check' />
                ) : (
                  index + 1
                )}
              </div>

              {isDone ? (
                <div className='overflow-hidden rounded-xl border border-gray-4 bg-surface shadow-2xs transition hover:border-primary-6'>
                  <div
                    className={cn(
                      'flex items-center justify-between gap-3 px-4 py-3',
                      (step.kind === 'panel' ||
                        step.kind === 'upload' ||
                        step.kind === 'attachments') &&
                        'border-b border-gray-4',
                    )}
                  >
                    <div className='min-w-0 truncate text-13 font-semibold text-gray-13'>
                      {step.title}
                    </div>
                    <IconButton
                      ariaLabel={t`Edit`}
                      className='rounded-lg border-gray-4 bg-surface'
                      color='gray'
                      icon='lucide:pencil'
                      size='sm'
                      tooltip={t`Edit`}
                      variant='outline'
                      onClick={() => goTo(index)}
                    />
                  </div>
                  {step.kind === 'panel' && panel ? (
                    <div>
                      {panel.questions.map((question) => (
                        <PortalMetaRow
                          key={question.id}
                          label={question.label}
                          value={formatAnswer(answers[question.id])}
                        />
                      ))}
                    </div>
                  ) : null}
                  {step.kind === 'upload' ? (
                    <PortalMetaRow
                      label={step.label}
                      value={files[0]?.name || '—'}
                    />
                  ) : null}
                  {step.kind === 'attachments' ? (
                    <PortalMetaRow
                      label={t`Files`}
                      value={
                        extraFiles.length
                          ? extraFiles.map((file) => file.name).join(', ')
                          : t`None`
                      }
                    />
                  ) : null}
                </div>
              ) : isActive ? (
                <div className='rounded-xl border border-primary-7 bg-surface p-5 shadow-xs'>
                  {step.kind === 'panel' && panel && (
                    <PortalWizardChat
                      answers={answers}
                      panel={panel}
                      onAnswer={(questionId, value) => {
                        setFieldError('')
                        setAnswers((prev) => ({
                          ...prev,
                          [questionId]: value,
                        }))
                      }}
                    />
                  )}

                  {step.kind === 'upload' && (
                    <>
                      <div className='mb-4 border-b border-gray-4 pb-3 text-15 font-semibold text-gray-13'>
                        {step.label}
                      </div>
                      {processing ? (
                        <div className='flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-gray-4 bg-gray-1'>
                          <Icon
                            className='size-8 animate-spin text-primary-9'
                            name='tabler:loader-2'
                          />
                          <p className='text-13 font-medium text-gray-11'>
                            {processingText ||
                              t`Extracting data from the document…`}
                          </p>
                        </div>
                      ) : isUploadStaged ? null : (
                        <CompactDropzone
                          accept='application/pdf,image/*'
                          loadingText={t`Extracting data from the document…`}
                          onFiles={handleUploadFiles}
                        />
                      )}
                      {renderFileList(files, removeFile)}
                      {!isUploadStaged &&
                      !source.isAccountsPayable &&
                      primaryPending?.ocrChecked &&
                      repoFieldDescriptors.length > 0 ? (
                        <div className='mt-4 border-t border-gray-4 pt-4'>
                          <div className='mb-3 text-13 font-semibold text-gray-13'>
                            {t`Repository Fields`}
                          </div>
                          <RepoFieldsPanel
                            descriptors={repoFieldDescriptors}
                            formModel={portalFormModel}
                            missingMandatoryFieldIds={missingMandatoryFieldIds}
                            repoFieldHints={repoFieldHints}
                            repositoryId={source.repositoryId}
                            hasAttemptedSubmit={
                              showStageUpload &&
                              missingMandatoryFields.length > 0
                            }
                            onFieldChange={handleRepoFieldChange}
                            onOcrFieldList={applyOcrToAnswers}
                          />
                        </div>
                      ) : null}
                    </>
                  )}

                  {step.kind === 'attachments' && (
                    <>
                      <div className='mb-4 border-b border-gray-4 pb-3 text-15 font-semibold text-gray-13'>
                        {t`Attachments`}
                      </div>
                      {processing ? (
                        <div className='flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-gray-4 bg-gray-1'>
                          <Icon
                            className='size-8 animate-spin text-primary-9'
                            name='tabler:loader-2'
                          />
                          <p className='text-13 font-medium text-gray-11'>
                            {processingText ||
                              t`Extracting data from the document…`}
                          </p>
                        </div>
                      ) : extraFiles.length > 0 &&
                        isAttachmentsStaged ? null : (
                        <CompactDropzone
                          accept='application/pdf,image/*'
                          loadingText={t`Extracting data from the document…`}
                          multiple
                          onFiles={handleExtraFiles}
                        />
                      )}
                      {renderFileList(extraFiles, removeExtraFile)}
                      {!(extraFiles.length > 0 && isAttachmentsStaged) &&
                      !source.isAccountsPayable &&
                      extraPending.some((item) => item.ocrChecked) &&
                      repoFieldDescriptors.length > 0 ? (
                        <div className='mt-4 border-t border-gray-4 pt-4'>
                          <div className='mb-3 text-13 font-semibold text-gray-13'>
                            {t`Repository Fields`}
                          </div>
                          <RepoFieldsPanel
                            descriptors={repoFieldDescriptors}
                            formModel={portalFormModel}
                            missingMandatoryFieldIds={missingMandatoryFieldIds}
                            repoFieldHints={repoFieldHints}
                            repositoryId={source.repositoryId}
                            hasAttemptedSubmit={
                              showStageUpload &&
                              missingMandatoryFields.length > 0
                            }
                            onFieldChange={handleRepoFieldChange}
                            onOcrFieldList={applyOcrToAnswers}
                          />
                        </div>
                      ) : null}
                    </>
                  )}

                  {step.kind === 'review' && (
                    <>
                      <div className='mb-4 border-b border-gray-4 pb-3 text-15 font-semibold text-gray-13'>
                        {t`Review & Submit`}
                      </div>
                      <div className='overflow-hidden rounded-xl border border-gray-4'>
                        {source.questions.map((question) => (
                          <PortalMetaRow
                            key={question.id}
                            label={question.label}
                            value={formatAnswer(answers[question.id])}
                          />
                        ))}
                        {files.length > 0 && (
                          <PortalMetaRow
                            label={source.fileFields[0]?.label || t`Invoice`}
                            value={files.map((file) => file.name).join(', ')}
                          />
                        )}
                        <PortalMetaRow
                          label={t`Attachments`}
                          value={
                            extraFiles.length
                              ? extraFiles.map((file) => file.name).join(', ')
                              : t`None`
                          }
                        />
                      </div>
                    </>
                  )}

                  {fieldError && (
                    <p className='mt-3 text-12 font-medium text-red-9'>
                      {fieldError}
                    </p>
                  )}

                  {showStageUpload || canContinueStep ? (
                    <div className='mt-5 flex justify-end gap-2'>
                      {showStageUpload ? (
                        <Button
                          className='rounded-lg'
                          label={t`Upload`}
                          loading={staging}
                          disabled={
                            missingMandatoryFields.length > 0 || staging
                          }
                          onClick={() => void handleConfirmUpload()}
                        />
                      ) : null}
                      {canContinueStep ? (
                        step.kind === 'review' ? (
                          <Button
                            className='rounded-lg'
                            disabled={!canSubmit}
                            label={submitLabel}
                            loading={submitting}
                            suffixIcon='lucide:arrow-right'
                            onClick={() => void handleSubmit()}
                          />
                        ) : (
                          <Button
                            className='rounded-lg'
                            disabled={processing || staging}
                            label={t`Continue`}
                            suffixIcon='lucide:arrow-right'
                            onClick={() => void handleNext()}
                          />
                        )
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className='flex items-center gap-2 rounded-xl border border-gray-3 bg-gray-1 px-4 py-3 text-13 text-gray-8'>
                  <Icon className='size-3.5' name='lucide:lock' />
                  <span>{step.title}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

PortalWizard.displayName = 'PortalWizard'
export default PortalWizard
