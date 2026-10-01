import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiPlaygroundContext } from '@/components/playground/ApiPlayground'
import formApi from '@/api/form/form'
import { getGroups, getUsers } from '@/api/v6/user'
import workflowsApiV6 from '@/api/v6/workflows'
import showToast from '@/components/base/toast/showToast'
// Import your custom animation components
import { AnimateFadeIn } from '@/components/common/animations'
import { queryClient } from '@/lib/tanstack-query/queryClient'
import { applyCalculatedFields } from '@/pages/form-builder/helpers/formula'
import {
  extractGenericRequestNumber,
  getFieldKeyByLabel,
} from '@/pages/requests/components/columns/useDynamicColumns'
import authUserStore from '@/stores/authUserStore'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import workflowApi from '../../../../api/workflow/workflow'
import { useAttachments } from '../../hooks/useAttachments'
import { useComments } from '../../hooks/useComments'
import { useRequestDetail } from '../../hooks/useRequestDetails'
import requestStore from '../../stores/useRequestStore'
import {
  extractApAgentJobId,
  registerApAgentJobProcessing,
} from '../../utils/registerApAgentJobProcessing'
import {
  finalizeApAgentJobIfSucceeded,
  wasApAgentJobFinalized,
} from '../../utils/finalizeApAgentJobIfSucceeded'
import {
  isDecorativeFieldType,
  isMatrixFieldType,
  isTableType,
} from '../../utils/dynamicTable.utils'
import { setFieldForAttachment } from '../../utils/fieldAttachmentMap'
import { isAccountsPayableWorkflow } from '../../utils/workflow.utils'
import {
  attachmentToFormFileValue,
  getFirstFileUploadField,
  getFirstReceivedAttachment,
  getFormPanels,
  getWorkflowRepositoryId,
  hasStoredFileValue,
  isFileUploadField,
  seedGmailFirstFileUpload,
  shouldSeedFirstFileUploadFromAttachment,
} from '../workflow-request/utils/gmailFormAttachment'
import GenericRequestOverview from './components/generic-overview/GenericRequestOverview'
import Header from './components/Header'
import Overview from './components/sections/overview/Overview'
import ForwardPopover from './ForwardPopover'

const cleanKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('number', 'no')
    .replace('num', 'no')
    .replace('amt', 'amount')
    .replace('val', 'value')

const matchKeysLoosely = (key1: string, key2: string): boolean => {
  return cleanKey(key1) === cleanKey(key2)
}

const findPONumberInObject = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null

  const extractStringValue = (val: any): string | null => {
    if (val == null) return null
    if (typeof val === 'object') {
      const innerVal =
        val['Invoice Value'] ||
        val['InvoiceValue'] ||
        val['PO Value'] ||
        val['POValue'] ||
        val['value'] ||
        val['val']
      if (innerVal !== undefined) return extractStringValue(innerVal)
      return null
    }
    const str = String(val).trim()
    return str !== '' && str !== '-' && str.toUpperCase() !== 'N/A' ? str : null
  }

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase()
    const isStrictPOKey =
      lowerKey === 'po' ||
      lowerKey === 'po_number' ||
      lowerKey === 'ponumber' ||
      lowerKey === 'po number' ||
      lowerKey === 'po_no' ||
      lowerKey === 'pono' ||
      lowerKey === 'po no' ||
      lowerKey === 'purchase_order' ||
      lowerKey === 'purchaseorder' ||
      lowerKey === 'purchase_order_number' ||
      lowerKey === 'purchaseorder_number' ||
      lowerKey === 'purchase order number' ||
      lowerKey === 'purchase_order_no' ||
      lowerKey === 'purchaseorder_no' ||
      lowerKey === 'purchase order no' ||
      lowerKey === 'rxwlghillrremmrqlk9mj' ||
      lowerKey.includes('purchase order') ||
      lowerKey.includes('purchase_order') ||
      lowerKey.includes('purchaseorder')

    if (isStrictPOKey) {
      if (
        !lowerKey.includes('value') &&
        !lowerKey.includes('amount') &&
        !lowerKey.includes('total') &&
        !lowerKey.includes('date') &&
        !lowerKey.includes('price')
      ) {
        const extracted = extractStringValue(obj[key])
        if (extracted && extracted !== '-' && extracted !== '') {
          return extracted
        }
      }
    }
  }

  return null
}

const extractPONumber = (
  row: any,
  formModel: any,
  invoiceHeader: any,
  currentAgentData: any,
): string => {
  if (!row) return ''

  const fromForm =
    findPONumberInObject(formModel) ||
    findPONumberInObject(row.formData?.fields) ||
    findPONumberInObject(row.formData)
  if (fromForm) return fromForm

  const fromAgentHeader = findPONumberInObject(invoiceHeader)
  if (fromAgentHeader) return fromAgentHeader

  const fromPOMatching = findPONumberInObject(currentAgentData?.po_matching)
  if (fromPOMatching) return fromPOMatching

  const fromAgent = findPONumberInObject(currentAgentData)
  if (fromAgent) return fromAgent

  const fromSelected = findPONumberInObject(row)
  if (fromSelected) return fromSelected

  return ''
}

const safeJsonParse = (val: any, fallback: any = null) => {
  if (typeof val === 'string' && val !== '') {
    try {
      return JSON.parse(val)
    } catch {
      return fallback
    }
  }
  return val
}

const parseFormJson = (formJson: any): any => {
  if (!formJson) return null

  let form = safeJsonParse(formJson, null)
  if (!form) return null

  if (typeof form === 'object' && 'formJson' in form) {
    const inner = safeJsonParse(form.formJson, form.formJson)
    if (inner && typeof inner === 'object') {
      form = inner
    }
  }

  return form
}

export const buildFieldMetaMap = (
  workflow: any,
  fallbackFormJson?: any,
): Map<string, { label: string; originalId?: string; type: string }> => {
  const metaMap = new Map<
    string,
    { label: string; originalId?: string; type: string }
  >()
  const formJson = workflow?.formJson || fallbackFormJson
  const form = parseFormJson(formJson)
  if (!form) return metaMap

  const addControl = (c: any) => {
    if (!c) return
    if (c.matrixTypeSettings) return

    const id = c.id
    const jsonId = c.jsonId
    const name = c.name
    const label = c.label || c.name || jsonId || id || ''
    const type = c.type || c.control || c.controlType || ''

    if (isDecorativeFieldType(type) || isMatrixFieldType(type)) return

    const originalId = jsonId || id || name || ''

    if (!jsonId && !id && !name) return

    const entry = { label, originalId, type }
    const registerKey = (key: string) => {
      if (!key) return
      metaMap.set(String(key).toLowerCase(), entry)
      metaMap.set(normalizeFieldKey(key), entry)
    }

    registerKey(jsonId)
    registerKey(id)
    registerKey(name)
    registerKey(label)
  }

  const collectFormControls = (formObj: any): any[] => {
    if (!formObj || typeof formObj !== 'object') return []

    const controls: any[] = []
    const append = (list: unknown) => {
      if (Array.isArray(list)) controls.push(...list)
    }

    append(formObj.controllist)
    append(formObj.controlList)

    const panels = [
      ...(Array.isArray(formObj.panels) ? formObj.panels : []),
      ...(Array.isArray(formObj.secondaryPanels)
        ? formObj.secondaryPanels
        : []),
    ]

    panels.forEach((panel) => {
      append(panel?.controlList)
      append(panel?.controllist)
      append(panel?.fields)
    })

    return controls
  }

  collectFormControls(form).forEach(addControl)

  return metaMap
}

export const normalizeFieldKey = (key: string): string =>
  String(key)
    .toLowerCase()
    .replace(/[\s-_]+/g, '')

export const resolveFieldMeta = (
  metaMap: Map<string, { label: string; originalId?: string; type: string }>,
  key: string,
) => {
  if (!key) return undefined

  return (
    metaMap.get(String(key).toLowerCase()) ||
    metaMap.get(normalizeFieldKey(key))
  )
}

export const getFieldValueFromSource = (
  fieldsSource: Record<string, unknown>,
  key: string,
): unknown => {
  if (!key || !fieldsSource) return undefined

  if (fieldsSource[key] !== undefined) return fieldsSource[key]

  const normalizedKey = normalizeFieldKey(key)
  for (const sourceKey of Object.keys(fieldsSource)) {
    if (normalizeFieldKey(sourceKey) === normalizedKey) {
      return fieldsSource[sourceKey]
    }
  }

  return undefined
}

const isFormScalarField = (
  meta: { label: string; originalId?: string; type: string },
  val: unknown,
) => {
  const fieldType = String(meta.type || '').toUpperCase()
  if (isDecorativeFieldType(fieldType) || isMatrixFieldType(fieldType))
    return false

  const isFileUpload = fieldType === 'FILE_UPLOAD' || fieldType === 'FILEUPLOAD'

  if (isFileUpload) return false
  return !isTableFieldValue(fieldType, val)
}

const appendMissingFormScalarFields = (
  target: Record<string, unknown>,
  fieldsSource: Record<string, unknown>,
  metaMap: Map<string, { label: string; originalId?: string; type: string }>,
) => {
  const seenOriginalIds = new Set<string>()

  metaMap.forEach((meta) => {
    const originalId = meta.originalId
    if (!originalId || seenOriginalIds.has(originalId)) return
    seenOriginalIds.add(originalId)

    const val = getFieldValueFromSource(fieldsSource, originalId)
    if (!isFormScalarField(meta, val)) return
    if (target[meta.label] !== undefined) return

    target[meta.label] = val ?? ''
  })
}

export const hasMeaningfulScalarValue = (val: unknown): boolean => {
  if (typeof val === 'string') {
    const str = val.trim()
    return str !== '' && str !== '-'
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    const str = String(val).trim()
    return str !== '' && str !== '-'
  }
  return false
}

const isTableFieldValue = (fieldType: string, val: unknown): boolean => {
  const normalizedType = fieldType.toUpperCase()
  const isTableType =
    normalizedType === 'TABLE' ||
    normalizedType === 'DYNAMIC_TABLE' ||
    normalizedType === 'DYNAMIC TABLE' ||
    normalizedType.includes('TABLE')

  if (isTableType) return true
  if (Array.isArray(val)) return true
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed.startsWith('[') && trimmed.endsWith(']')
  }
  return false
}

export const shouldIncludeExtractedField = (
  metaMap: Map<string, { label: string; originalId?: string; type: string }>,
  key: string,
  val: unknown,
): boolean => {
  const meta = resolveFieldMeta(metaMap, key)
  const fieldType = String(meta?.type || '').toUpperCase()

  if (isDecorativeFieldType(fieldType) || isMatrixFieldType(fieldType))
    return false

  const isFileUpload = fieldType === 'FILE_UPLOAD' || fieldType === 'FILEUPLOAD'

  if (isFileUpload || isTableFieldValue(fieldType, val)) return false
  if (meta) return true
  if (metaMap.size === 0) return hasMeaningfulScalarValue(val)
  return hasMeaningfulScalarValue(val)
}

export const getExtractedFieldLabel = (
  metaMap: Map<string, { label: string; originalId?: string; type: string }>,
  key: string,
): string => resolveFieldMeta(metaMap, key)?.label || key

export const parseTableFieldValue = (val: unknown): any[] => {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
  }
  return []
}

const getLineItemsTablePriority = (meta: {
  label: string
  originalId?: string
  type: string
}) => {
  const label = meta.label.toLowerCase()
  let priority = 0

  if (String(meta.type || '').toUpperCase() === 'DYNAMIC_TABLE') priority += 10
  if (label.includes('invoice') && label.includes('line')) priority += 30
  if (label.includes('extracted')) priority += 10
  if (label.includes('line item')) priority += 5

  return priority
}

export const appendTableFieldsToFormModel = (
  target: Record<string, unknown>,
  fieldsSource: Record<string, unknown>,
  metaMap: Map<string, { label: string; originalId?: string; type: string }>,
) => {
  const seenOriginalIds = new Set<string>()

  metaMap.forEach((meta) => {
    const originalId = meta.originalId
    if (!originalId || seenOriginalIds.has(originalId)) return
    if (!isTableType(meta.type)) return

    seenOriginalIds.add(originalId)

    const label = meta.label
    if (target[label] !== undefined) return

    const raw = getFieldValueFromSource(fieldsSource, originalId)
    const rows = parseTableFieldValue(raw)
    if (rows.length > 0) {
      target[label] = rows
    }
  })
}

export const findPreferredLineItemsTable = (
  metaMap: Map<string, { label: string; originalId?: string; type: string }>,
  formModel: Record<string, unknown>,
) => {
  const candidates: Array<{
    label: string
    priority: number
    rows: any[]
  }> = []

  const seenOriginalIds = new Set<string>()

  metaMap.forEach((meta) => {
    const originalId = meta.originalId
    if (!originalId || seenOriginalIds.has(originalId)) return
    if (!isTableType(meta.type)) return

    seenOriginalIds.add(originalId)

    const rows = parseTableFieldValue(formModel[meta.label])
    if (rows.length === 0) return

    candidates.push({
      label: meta.label,
      priority: getLineItemsTablePriority(meta),
      rows,
    })
  })

  candidates.sort((a, b) => b.priority - a.priority)
  return candidates[0] ?? null
}

export const buildFieldLabelMap = (
  workflow: any,
  fallbackFormJson?: any,
): Map<string, string> => {
  const labelMap = new Map<string, string>()
  const metaMap = buildFieldMetaMap(workflow, fallbackFormJson)
  metaMap.forEach((val, key) => {
    labelMap.set(key, val.label)
  })
  return labelMap
}

export const buildLabelToIdMap = (
  workflow: any,
  fallbackFormJson?: any,
): Map<string, string> => {
  const labelToIdMap = new Map<string, string>()
  const metaMap = buildFieldMetaMap(workflow, fallbackFormJson)
  metaMap.forEach((val) => {
    const label = val.label
    const originalId = val.originalId
    if (label && originalId) {
      labelToIdMap.set(label, originalId)
    }
  })
  return labelToIdMap
}

const mapFormModelToPayloadFields = (
  formModel: any,
  workflow: any,
  fallbackFormJson?: any,
) => {
  const fieldsPayload: any = {}
  const labelToIdMap = buildLabelToIdMap(workflow, fallbackFormJson)

  Object.keys(formModel).forEach((key) => {
    const val = formModel[key]
    const originalId = labelToIdMap.get(key) || key
    fieldsPayload[originalId] = val
  })

  return fieldsPayload
}

const updateProcessInStore = (apAgentJobId: string | number, jobData: any) => {
  requestStore.setState((state) => {
    if (
      state.selectedItem &&
      String(state.selectedItem.apAgentJobId) === String(apAgentJobId)
    ) {
      const jobKey = `job-${apAgentJobId}`
      const hasJobProcess = state.processingProcesses.some(
        (p) => String(p.processId || p.id) === jobKey,
      )
      const updatedProcesses = hasJobProcess
        ? state.processingProcesses.map((p) =>
            String(p.processId || p.id) === jobKey
              ? {
                  ...p,
                  apAgentJobId: null,
                  id: jobData.instanceId,
                  processId: jobData.instanceId,
                }
              : p,
          )
        : state.processingProcesses

      return {
        processingProcesses: updatedProcesses,
        selectedItem: {
          ...state.selectedItem,
          apAgentJobId: null,
          id: jobData.instanceId,
          processId: jobData.instanceId,
        },
      }
    }
    return {}
  })
}

const handleJobData = (
  apAgentJobId: string | number,
  jobData: any,
  setJobStatus: (status: any) => void,
  stopPolling: () => void,
) => {
  const percentRaw =
    jobData.percent === undefined ? jobData.Percent : jobData.percent
  const percentNum =
    percentRaw !== undefined && percentRaw !== null
      ? Number(percentRaw)
      : Number.NaN
  const percent = Number.isNaN(percentNum) ? undefined : percentNum

  const stage = jobData.stage || 'OCR Extraction'
  const message = jobData.message || jobData.hangfireStatus || ''
  const isCompleted =
    jobData.isTerminal ||
    jobData.stage === 'COMPLETED' ||
    jobData.hangfireStatus === 'Succeeded'

  setJobStatus({
    hangfireStatus: jobData.hangfireStatus || '',
    isCompleted,
    message: jobData.message || '',
    percent,
    stage,
  })

  // Sync to global store
  const jobKey = `job-${apAgentJobId}`
  requestStore.getState().setJobStatus(jobKey, {
    apAgentJobId,
    isCompleted,
    message,
    percent,
    stage,
  })

  if (jobData.instanceId) {
    requestStore.getState().setJobMapping(apAgentJobId, jobData.instanceId)
    requestStore.getState().setJobStatus(String(jobData.instanceId), {
      apAgentJobId,
      isCompleted,
      message,
      percent,
      stage,
    })
  }

  requestStore
    .getState()
    .updateProcessingProcess(String(`job-${apAgentJobId}`), {
      percent,
      stage: jobData.stage || 'Initializing....',
    })

  if (isCompleted) {
    stopPolling()
    if (jobData.instanceId) {
      updateProcessInStore(apAgentJobId, jobData)
    }
  }
}

const isFormDataEmpty = (formData: any): boolean => {
  if (!formData) return true
  if (typeof formData === 'string') {
    try {
      const parsed = JSON.parse(formData)
      const fields = parsed?.fields || parsed || {}
      return Object.keys(fields).length === 0
    } catch {
      return true
    }
  }
  if (typeof formData === 'object') {
    const fields = formData.fields || formData || {}
    return Object.keys(fields).length === 0
  }
  return true
}

const useJobPolling = (
  apAgentJobId: string | number | undefined,
  onJobData?: (jobData: any) => void,
) => {
  const { jobStatuses, processingProcesses } = requestStore()
  const [localStatus, setLocalStatus] = useState<{
    hangfireStatus: string
    isCompleted?: boolean
    message: string
    percent?: number
    stage: string
  } | null>(null)

  const onJobDataRef = useRef(onJobData)
  useEffect(() => {
    onJobDataRef.current = onJobData
  }, [onJobData])

  const isPollingExternally = useMemo(() => {
    return processingProcesses.some(
      (p) => String(p.apAgentJobId) === String(apAgentJobId),
    )
  }, [processingProcesses, apAgentJobId])

  const jobKey = apAgentJobId ? `job-${apAgentJobId}` : ''
  const globalJobStatus = jobStatuses[jobKey]
  const prevJobStatusPercentRef = useRef<number | undefined>(undefined)
  const prevJobStatusStageRef = useRef<string | undefined>(undefined)

  // Listen to external global store updates to trigger callbacks
  useEffect(() => {
    if (isPollingExternally && globalJobStatus) {
      const hasChanged =
        globalJobStatus.percent !== prevJobStatusPercentRef.current ||
        globalJobStatus.stage !== prevJobStatusStageRef.current

      if (hasChanged) {
        if (onJobDataRef.current) {
          onJobDataRef.current(globalJobStatus)
        }
        prevJobStatusPercentRef.current = globalJobStatus.percent
        prevJobStatusStageRef.current = globalJobStatus.stage
      }
    }
  }, [globalJobStatus, isPollingExternally])

  // Fallback to local polling if not handled by ProcessingBackgroundManager
  useEffect(() => {
    if (!apAgentJobId || isPollingExternally) return

    let intervalId: any = null

    const pollJob = async () => {
      try {
        if (wasApAgentJobFinalized(apAgentJobId)) {
          if (intervalId) clearInterval(intervalId)
          return
        }
        const res = await workflowsApiV6.getApAgentJobStatus(
          String(apAgentJobId),
        )
        if (res.data) {
          handleJobData(apAgentJobId, res.data, setLocalStatus, () => {
            if (intervalId) clearInterval(intervalId)
          })
          if (onJobDataRef.current) {
            onJobDataRef.current(res.data)
          }
        }
      } catch (err) {
        console.error('Error polling AP Agent job:', err)
      }
    }

    pollJob()
    intervalId = setInterval(pollJob, 5000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [apAgentJobId, isPollingExternally])

  if (isPollingExternally && globalJobStatus) {
    return {
      hangfireStatus: globalJobStatus.hangfireStatus || '',
      isCompleted: globalJobStatus.isCompleted,
      message: globalJobStatus.message || '',
      percent: globalJobStatus.percent,
      stage: globalJobStatus.stage || '',
    }
  }

  return localStatus
}

const parseFieldsSource = (formData: any): any => {
  if (!formData) return {}
  if (typeof formData === 'string') {
    try {
      const parsed = JSON.parse(formData)
      return parsed?.fields || parsed || {}
    } catch {
      return {}
    }
  }
  if (typeof formData === 'object') {
    return formData.fields || formData || {}
  }
  return {}
}

const mergeFormData = (base: any, override: any): any => {
  const baseParsed = parseFieldsSource(base)
  const overrideParsed = parseFieldsSource(override)

  const merged = { ...baseParsed }
  Object.keys(overrideParsed).forEach((key) => {
    const val = overrideParsed[key]
    if (val !== undefined && val !== null && val !== '' && val !== '-') {
      merged[key] = val
    } else if (
      merged[key] === undefined ||
      merged[key] === null ||
      merged[key] === '' ||
      merged[key] === '-'
    ) {
      merged[key] = val
    }
  })
  return merged
}

const mergeInvoiceHeader = (cleanFields: any, invoiceHeader: any) => {
  if (!invoiceHeader) return
  for (const key of Object.keys(invoiceHeader)) {
    const existingKey = Object.keys(cleanFields).find((k) =>
      matchKeysLoosely(k, key),
    )
    if (existingKey) {
      const val = cleanFields[existingKey]
      if (!val || val === '-' || val === '') {
        cleanFields[existingKey] = invoiceHeader[key]
      }
    }
  }
}

// Generic (non-Accounts-Payable) tickets keep their form data field-id-keyed
// (the shape WorkflowFormRenderer/FieldRenderer read and write, same as the
// New Request compose flow) rather than the AP flow's label-keyed formModel.
const safeParseFormData = (formData: unknown): Record<string, any> => {
  if (!formData) return {}
  if (typeof formData === 'object') {
    return (formData as any).fields || formData || {}
  }
  if (typeof formData === 'string') {
    try {
      const parsed = JSON.parse(formData)
      return parsed?.fields || parsed || {}
    } catch {
      return {}
    }
  }
  return {}
}

const parseCleanFields = (
  activeItem: any,
  selectedWorkflow: any,
  formDefinition: any,
  invoiceHeader: any,
): any => {
  if (!activeItem) return {}

  const metaMap = buildFieldMetaMap(selectedWorkflow, formDefinition)
  const cleanFields: any = {}
  const fieldsSource = parseFieldsSource(activeItem.formData)

  const parseIfJsonString = (val: any) => {
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          return JSON.parse(trimmed)
        } catch {
          // Keep original
        }
      }
    }
    return val
  }

  Object.keys(fieldsSource).forEach((key) => {
    let val = getFieldValueFromSource(fieldsSource, key) ?? fieldsSource[key]
    val = parseIfJsonString(val)

    if (!shouldIncludeExtractedField(metaMap, key, val)) return

    const label = getExtractedFieldLabel(metaMap, key)
    cleanFields[label] = val
  })

  appendMissingFormScalarFields(cleanFields, fieldsSource, metaMap)
  appendTableFieldsToFormModel(cleanFields, fieldsSource, metaMap)
  mergeInvoiceHeader(cleanFields, invoiceHeader)

  return cleanFields
}

const Request = ({
  hideActions,
  isFourthItem,
  isThirdItem,
  item,
  workflowId,
  onBack,
  onNext,
  onPrev,
}: {
  hideActions?: boolean
  isFourthItem?: boolean
  isThirdItem?: boolean
  item?: any
  workflowId?: number | string
  onBack?: () => void
  onNext?: () => void
  onPrev?: () => void
}) => {
  console.log('--- REQUEST COMPONENT IS RENDERING ---')
  const { t } = useLingui()
  const {
    activeTabValue,
    closeRequest,
    jobMappings,
    jobStatuses,
    processingProcesses,
    rawWorkflowData,
    requestListTab,
    selectedItem: storeSelectedItem,
    selectedWorkflow,
    selectedWorkflowId,
    workflowRefresh,
  } = requestStore((state) => state)

  const selectedItem = item || storeSelectedItem
  const resolvedWorkflowId =
    selectedWorkflow?.id || workflowId || selectedWorkflowId
  const isGenericWorkflow = !isAccountsPayableWorkflow(rawWorkflowData)

  const workflowFormId =
    rawWorkflowData?.formId ||
    rawWorkflowData?.wFormId ||
    rawWorkflowData?.settings?.general?.initiateUsing?.formId ||
    selectedItem?.formId ||
    null

  const hasWorkflowFormPanels = getFormPanels(rawWorkflowData).length > 0

  // Fetched once here (rather than separately inside the header badge and
  // the overview's own Attachments panel) so the header's attachment count,
  // the overview's file-field display, and the Attachments panel list all
  // agree on the same data.
  const genericInstanceId =
    selectedItem?.workflowInstanceId || selectedItem?.processId
  const { data: genericAttachments, refetch: refetchGenericAttachments } =
    useAttachments(
      resolvedWorkflowId,
      genericInstanceId,
      isGenericWorkflow && !!resolvedWorkflowId && !!genericInstanceId,
    )

  // Same idea as genericAttachments above - keep the header's comment
  // count and the Comments panel reading from the same live list instead
  // of the stale selectedItem.commentsCount from the list row.
  const { data: genericComments, refetch: refetchGenericComments } =
    useComments(
      resolvedWorkflowId,
      genericInstanceId,
      isGenericWorkflow && !!resolvedWorkflowId && !!genericInstanceId,
    )

  const [activeTab, setActiveTab] = useState<string>(
    activeTabValue || 'Overview',
  )
  const rowId = selectedItem?.processId || selectedItem?.id
  let apAgentJobId = selectedItem?.apAgentJobId
  if (!apAgentJobId && rowId) {
    const mappedJobId = Object.keys(jobMappings || {}).find(
      (key) => String(jobMappings[key]) === String(rowId),
    )
    if (mappedJobId) {
      apAgentJobId = mappedJobId
    } else {
      const statusObj = Object.values(jobStatuses || {}).find(
        (status: any) =>
          String(status?.apAgentJobId) === String(rowId) ||
          String(status?.instanceId) === String(rowId),
      ) as any
      if (statusObj?.apAgentJobId) {
        apAgentJobId = statusObj.apAgentJobId
      }
    }
  }
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [rightView, setRightView] = useState<
    'overview' | 'history' | 'attachments' | 'comments'
  >('overview')
  const [isEditing, setIsEditing] = useState<boolean>(false)

  // Ensure Hangfire job polling is registered when the open request already
  // carries an apAgentJobId (create/move/list), matching AP FileUpload.
  useEffect(() => {
    if (!apAgentJobId) return
    registerApAgentJobProcessing({
      apAgentJobId,
      processId: selectedItem?.processId || selectedItem?.id || rowId,
      requestNo: selectedItem?.requestNo || selectedItem?.reqNo,
      stage: selectedItem?.stage || selectedItem?.currentStage || 'Processing',
      transactionId: selectedItem?.transactionId,
      workflowId:
        selectedItem?.workflowId ||
        resolvedWorkflowId ||
        rawWorkflowData?.id,
    })
  }, [
    apAgentJobId,
    rawWorkflowData?.id,
    resolvedWorkflowId,
    rowId,
    selectedItem?.currentStage,
    selectedItem?.id,
    selectedItem?.processId,
    selectedItem?.reqNo,
    selectedItem?.requestNo,
    selectedItem?.stage,
    selectedItem?.transactionId,
    selectedItem?.workflowId,
  ])
  const openPlayground = usePlaygroundStore((state) => state.open)
  const setPlaygroundContext = usePlaygroundStore((state) => state.setContext)

  const initialProcessing = useMemo(() => {
    const stage = selectedItem?.stage || selectedItem?.currentStage
    const blocks = rawWorkflowData?.workflowJson?.blocks || []
    const activityBlock = blocks.find(
      (b: any) => b.id === selectedItem?.activityId,
    )
    const blockType = String(
      activityBlock?.type || selectedItem?.stageType || '',
    ).toUpperCase()
    const stageName = String(stage || '').toLowerCase()
    const currentIsAgent =
      blockType.includes('AGENT') ||
      (!activityBlock && stageName.includes('agent'))

    // Checker / maker steps still need Verify, Approve, or Submit.
    // Only the agent node itself waits on a response.
    if (!currentIsAgent) return false

    const fromStore = processingProcesses.some(
      (p) =>
        String(p.processId || p.id) ===
        String(selectedItem?.processId || selectedItem?.id),
    ) || selectedItem?.isProcessing

    if (fromStore) return true

    const isAgentStage = blocks.some(
      (b: any) => b.type?.includes('AGENT') && b.settings?.label === stage,
    )
    const hasDecision = !!(
      selectedItem?.qualifyAgentResponse?.qualifier_result ||
      selectedItem?.agentResponse ||
      selectedItem?._agentData?.length
    )

    return isAgentStage && !hasDecision
  }, [processingProcesses, selectedItem, rawWorkflowData])

  const { data: request, isLoading } = useRequestDetail(
    resolvedWorkflowId,
    selectedItem?.processId,
    selectedItem?.transactionId,
    initialProcessing,
    workflowFormId,
    // While Hangfire is running, only poll ap-agent/jobs — not inbox/sent/completed.
    Boolean(apAgentJobId) &&
      !jobStatuses?.[`job-${apAgentJobId}`]?.isCompleted,
  )

  // Fetch workflow (+ form schema) when missing, mismatched, or panels empty.
  // Opening another ticket on the same workflow used to skip the form GET,
  // leaving Qualify/Extracted Data without field labels.
  useEffect(() => {
    if (!resolvedWorkflowId) return
    const idMismatch =
      !rawWorkflowData ||
      String(rawWorkflowData.id) !== String(resolvedWorkflowId)
    if (!idMismatch && hasWorkflowFormPanels) return

    let cancelled = false
    const fetchWorkflow = async () => {
      try {
        const res = await workflowsApiV6.getWorkflowById(
          String(resolvedWorkflowId),
        )
        if (cancelled || !res?.data) return
        const wf = res.data
        const wFormId =
          wf.formId ??
          wf.wFormId ??
          wf.settings?.general?.initiateUsing?.formId ??
          workflowFormId ??
          ''
        let formJson = wf.formJson
        if (wFormId) {
          const formRes = await formApi.getFormDataById(String(wFormId))
          if (formRes?.data) {
            formJson = formRes.data.formJson ?? formRes.data
          }
        }
        if (cancelled) return
        requestStore
          .getState()
          .setRawWorkflowData({ ...wf, formJson, id: resolvedWorkflowId })
      } catch (e) {
        console.error(
          'Error loading raw workflow data in Request detail view:',
          e,
        )
      }
    }
    fetchWorkflow()
    return () => {
      cancelled = true
    }
  }, [
    resolvedWorkflowId,
    rawWorkflowData?.id,
    hasWorkflowFormPanels,
    workflowFormId,
  ])

  // When ticket detail returns a form definition and the store has no panels,
  // merge it so generic overview / agent views get field labels.
  useEffect(() => {
    const def = request?._formDefinition
    if (!def || !rawWorkflowData || hasWorkflowFormPanels) return
    const formJson = def.formJson ?? def
    if (!formJson || getFormPanels({ formJson }).length === 0) return
    requestStore.getState().setRawWorkflowData({
      ...rawWorkflowData,
      formId: request?.formId || rawWorkflowData.formId,
      formJson,
    })
  }, [
    request?._formDefinition,
    request?.formId,
    rawWorkflowData,
    hasWorkflowFormPanels,
  ])

  // Prefer ticket form definition immediately even before store merge settles.
  const overviewWorkflowData = useMemo(() => {
    if (hasWorkflowFormPanels || !rawWorkflowData) return rawWorkflowData
    const def = request?._formDefinition
    if (!def) return rawWorkflowData
    const formJson = def.formJson ?? def
    if (!formJson || getFormPanels({ formJson }).length === 0) {
      return rawWorkflowData
    }
    return { ...rawWorkflowData, formJson }
  }, [rawWorkflowData, request?._formDefinition, hasWorkflowFormPanels])
  // Synchronize store's selectedItem with the loaded request data
  useEffect(() => {
    if (request && selectedItem) {
      const keysToSync = [
        'stageType',
        'stage',
        'status',
        'decision',
        'activityId',
        'attachmentCount',
        'commentsCount',
      ] as const

      const hasChanges = keysToSync.some(
        (key) => key in request && request[key] !== selectedItem[key],
      )

      if (hasChanges) {
        requestStore.setState({
          selectedItem: {
            ...selectedItem,
            ...request,
            // Keep Hangfire job id from the in-flight create/move — detail
            // list payloads usually omit it and would wipe live job messages.
            apAgentJobId:
              selectedItem.apAgentJobId || request.apAgentJobId || null,
            isProcessing:
              selectedItem.isProcessing || request.isProcessing || false,
          },
        })
      }
    }
  }, [request, selectedItem])

  const agentDataList = request?._agentData || selectedItem?._agentData || []
  const qualifyResponse =
    request?.qualifyAgentResponse || selectedItem?.qualifyAgentResponse
  const hasAgentData =
    agentDataList.length > 0 || !!qualifyResponse?.qualifier_result

  const currentAgentData = useMemo(() => {
    // For Generic Workflows where AI Insights comes from Qualify Agent Response
    if (qualifyResponse?.qualifier_result) {
      return {
        reason:
          qualifyResponse.qualifier_result['Ai Insight'] ||
          qualifyResponse.qualifier_result['AI Insight'] ||
          qualifyResponse.qualifier_result['aiInsight'] ||
          qualifyResponse.qualifier_result['Detailed Reasoning'] ||
          qualifyResponse.qualifier_result.Reasoning ||
          qualifyResponse.qualifier_result.Decision,
        score: qualifyResponse.qualifier_result.Confidence,
        ...qualifyResponse.qualifier_result,
      }
    }
    return (
      agentDataList.find((a: any) => a.id === selectedAgentId) ||
      agentDataList[0] ||
      {}
    )
  }, [agentDataList, selectedAgentId, request, selectedItem])

  const invoiceHeader =
    currentAgentData?.['Extracted Invoice JSON']?.invoice_header

  const jobStatus = useJobPolling(apAgentJobId, (jobData) => {
    const isCompleted =
      jobData.isTerminal ||
      jobData.stage === 'COMPLETED' ||
      jobData.hangfireStatus === 'Succeeded'

    if (!isCompleted && jobData && jobData.formData) {
      const isEmpty = isFormDataEmpty(jobData.formData)
      if (!isEmpty) {
        const cleanFields = parseCleanFields(
          { formData: jobData.formData },
          selectedWorkflow,
          request?._formDefinition,
          invoiceHeader,
        )
        if (cleanFields && Object.keys(cleanFields).length > 0) {
          setFormModel(cleanFields)
        }
      }
    }

    if (isCompleted && apAgentJobId) {
      void finalizeApAgentJobIfSucceeded({
        apAgentJobId,
        jobData,
        queryClient,
        workflowId: resolvedWorkflowId,
      })
    }
  })

  const hasAgentDecision = request
    ? !!(
        request.review ||
        request._agentData?.[0]?.decision ||
        request.completedAtUtc ||
        request.qualifyAgentResponse?.qualifier_result ||
        request.agentResponse
      )
    : false
  const isCurrentlyProcessing =
    !hasAgentDecision && initialProcessing && !jobStatus?.isCompleted

  const actions = useMemo(() => {
    const list =
      request?._actions ||
      selectedItem?._actions ||
      storeSelectedItem?._actions ||
      []
    if (list.length === 0 && selectedItem?._actions) {
      return selectedItem._actions
    }
    if (list.length === 0 && storeSelectedItem?._actions) {
      return storeSelectedItem._actions
    }
    return list
  }, [request?._actions, selectedItem?._actions, storeSelectedItem?._actions])

  const isApAgentStage = request
    ? request.stageType === 'AP_AGENT'
    : selectedItem?.stageType === 'AP_AGENT'

  const currentActivityId = request?.activityId || selectedItem?.activityId

  const dynamicRules = useMemo(() => {
    const rules =
      rawWorkflowData?.workflowJson?.rules || rawWorkflowData?.rules || []
    if (!currentActivityId) return []
    return rules.filter((rule: any) => {
      const fromId = rule.fromBlockId || rule.from
      return String(fromId) === String(currentActivityId)
    })
  }, [rawWorkflowData, currentActivityId])

  const currentBlock = useMemo(() => {
    const blocks = rawWorkflowData?.workflowJson?.blocks || []
    if (!currentActivityId) {
      return blocks.find((b: any) => b.type === 'START') || null
    }
    return blocks.find((b: any) => b.id === currentActivityId) || null
  }, [rawWorkflowData, currentActivityId])

  // Agent nodes auto-route from their decision — do not surface their
  // QUALIFY / DISQUALIFY / MATCHED edges as clickable header buttons.
  const isAutoRoutedAgentStage = useMemo(() => {
    const type = String(
      currentBlock?.type ||
        request?.stageType ||
        selectedItem?.stageType ||
        '',
    ).toUpperCase()
    return type.includes('AGENT')
  }, [currentBlock?.type, request?.stageType, selectedItem?.stageType])

  const currentBlockSettings: Record<string, any> = currentBlock?.settings || {}

  // Outgoing workflow rules for the current activity are the source of truth
  // for which action buttons belong on this stage. Preferring
  // settings.actions instead pulls in stale prior-stage labels (e.g.
  // QUALIFY from the Qualify Agent) that are not edges from this block.
  const ruleActions = useMemo(() => {
    const configuredActions = currentBlockSettings?.actions || []
    const allRules =
      rawWorkflowData?.workflowJson?.rules || rawWorkflowData?.rules || []
    let derivedActions: any[] = []

    if (dynamicRules.length > 0) {
      derivedActions = dynamicRules.map((rule: any) => {
        const actionName = rule.proceedAction || rule.action || 'Submit'
        return {
          label: actionName,
          value: actionName,
        }
      })
    } else if (configuredActions.length > 0) {
      // Fallback: block settings may list every historical action name.
      // Drop labels that only appear on *incoming* edges (the prior
      // stage's proceed action), so e.g. QUALIFY does not resurface on
      // the Manual User stage after the Qualify Agent.
      const incomingActionKeys = new Set(
        allRules
          .filter(
            (rule: any) =>
              String(rule.toBlockId || rule.to || '') ===
              String(currentActivityId || ''),
          )
          .map((rule: any) =>
            String(rule.proceedAction || rule.action || '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      )

      const mapped = configuredActions.map((a: any) => ({
        label: a.actionName || 'Submit',
        value: a.actionName || 'Submit',
      }))
      const withoutIncoming = mapped.filter(
        (a: any) =>
          !incomingActionKeys.has(String(a.value || '').toLowerCase()),
      )
      derivedActions = withoutIncoming.length > 0 ? withoutIncoming : mapped
    }

    // De-dupe by action value while preserving rule order.
    const seen = new Set<string>()
    derivedActions = derivedActions.filter((a: any) => {
      const key = String(a.value || a.label || '').toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (
      currentBlockSettings?.isForwardEnabled ||
      currentBlockSettings?.isForwardUserEnabled ||
      currentBlockSettings?.forwardEnabled ||
      currentBlockSettings?.isForward ||
      currentBlockSettings?.internalForward
    ) {
      derivedActions.push({
        color: 'gray',
        label: 'Forward',
        value: 'Forward',
        variant: 'outline',
      })
    }

    return derivedActions
  }, [
    currentActivityId,
    currentBlockSettings,
    dynamicRules,
    rawWorkflowData,
  ])

  // Steps carry per-activity assignment (assignedToUserId); block
  // settings.users is the same data as authored in the workflow builder.
  // Only the user the current stage is actually assigned to should see the
  // action buttons for it.
  const assignedUserIds = useMemo(() => {
    if (!currentActivityId) return []

    const step = (rawWorkflowData?.steps || []).find(
      (s: any) => s.activityId === currentActivityId,
    )
    if (step?.assignedToUserId) return [String(step.assignedToUserId)]

    const block = (rawWorkflowData?.workflowJson?.blocks || []).find(
      (b: any) => b.id === currentActivityId,
    )
    return (block?.settings?.users || []).map(String)
  }, [rawWorkflowData, currentActivityId])

  const isAssignedToCurrentUser = useMemo(() => {
    if (assignedUserIds.length === 0) return true
    const currentUserId = authUserStore.getState().session?.id
    return !!currentUserId && assignedUserIds.includes(String(currentUserId))
  }, [assignedUserIds])

  // The current activity's block carries the Manual User (INTERNAL_ACTOR)
  // settings authored in the workflow builder - assignment mode, checklist
  // items, document/signature requirements, mandatory fields.

  const assignedGroupIds = useMemo(
    () => (currentBlockSettings.groups || []).map(String),
    [currentBlockSettings],
  )

  const { data: usersResponse } = useQuery({
    queryFn: getUsers,
    queryKey: ['v6-users'],
  })
  const allUsersForAssignee = (usersResponse as any)?.data

  const { data: groupsResponse } = useQuery({
    queryFn: getGroups,
    queryKey: ['v6-groups'],
  })
  const allGroupsForAssignee = (groupsResponse as any)?.data

  const assigneeLabel = useMemo(() => {
    if (!currentBlock) return undefined
    const names: string[] = []
    if (assignedUserIds.length && Array.isArray(allUsersForAssignee)) {
      assignedUserIds.forEach((id: string) => {
        const u = (allUsersForAssignee as any[]).find(
          (candidate) => String(candidate.id ?? candidate.value) === id,
        )
        if (u) {
          names.push(
            u.name || u.value || u.loginName || u.email || `User ${id}`,
          )
        }
      })
    }
    if (assignedGroupIds.length && Array.isArray(allGroupsForAssignee)) {
      assignedGroupIds.forEach((id: string) => {
        const g = (allGroupsForAssignee as any[]).find(
          (candidate) => String(candidate.groupId ?? candidate.id) === id,
        )
        if (g) names.push(g.groupName || g.name || `Group ${id}`)
      })
    }
    if (currentBlockSettings.isManagerEnabled) names.push('Manager')
    if (currentBlockSettings.isToRequesterEnabled) names.push('Requester')
    if (currentBlockSettings.isCoordinatorEnabled) names.push('Coordinator')
    if (currentBlockSettings.isMasterUserEnabled)
      names.push('Master table lookup')
    if (!names.length) return undefined
    return `Pending with ${names.join(', ')}`
  }, [
    currentBlock,
    currentBlockSettings,
    assignedUserIds,
    assignedGroupIds,
    allUsersForAssignee,
    allGroupsForAssignee,
  ])

  // Task-requirement gating state (Checklist / Signature), from the Manual
  // User node's Phase-1 settings - reset whenever the active stage changes.
  const [checklistChecked, setChecklistChecked] = useState<
    Record<string, boolean>
  >({})
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)
  useEffect(() => {
    setChecklistChecked({})
    setSignatureConfirmed(false)
  }, [currentActivityId, selectedItem?.transactionId])

  const headerActions = useMemo(() => {
    if (isApAgentStage || isAutoRoutedAgentStage) return []
    // Sent/Closed are read-only views of a request that has already moved
    // on to (or past) another assignee — only the Inbox view, where the
    // request is actually pending with the current user, can act on it.
    if (requestListTab !== 'Inbox') return []
    if (!isAssignedToCurrentUser) return []
    return ruleActions.length > 0 ? ruleActions : actions
  }, [
    isApAgentStage,
    isAutoRoutedAgentStage,
    requestListTab,
    isAssignedToCurrentUser,
    ruleActions,
    actions,
  ])

  const [formModel, setFormModel] = useState<any>({})
  const [genericFormModel, setGenericFormModel] = useState<Record<string, any>>(
    {},
  )

  const resolvedRequestNo = useMemo(() => {
    let raw = ''
    const titleField =
      rawWorkflowData?.settings?.general?.requestTitleField ||
      rawWorkflowData?.workflowJson?.settings?.general?.requestTitleField
    const isDocumentApproval = selectedWorkflow?.name === 'Document Approval'

    let configuredTitle = null
    if (titleField) {
      if (isDocumentApproval) {
        configuredTitle = selectedItem?.repositoryItem?.fields?.[titleField]
      }

      if (!configuredTitle) {
        const actualFieldKey =
          getFieldKeyByLabel(rawWorkflowData || selectedWorkflow, titleField) ||
          titleField
        configuredTitle = isGenericWorkflow
          ? genericFormModel?.[actualFieldKey]
          : formModel?.[actualFieldKey]
        if (!configuredTitle) {
          let parsedData = selectedItem?.formData
          if (typeof parsedData === 'string') {
            try {
              parsedData = JSON.parse(parsedData)
            } catch {}
          }
          const formDataFields = parsedData?.fields || parsedData
          configuredTitle =
            formDataFields?.[actualFieldKey] || formDataFields?.[titleField]
        }
      }
    }

    if (configuredTitle) {
      raw = configuredTitle
    } else if (isGenericWorkflow) {
      if (isDocumentApproval) {
        raw =
          selectedItem?.repositoryItem?.fileName ||
          extractGenericRequestNumber(selectedItem)
      } else {
        const genericNo = extractGenericRequestNumber(selectedItem)
        raw = genericNo === '-' ? 'REQ - ...' : genericNo
      }
    } else {
      raw =
        formModel?.['Invoice Number'] ||
        formModel?.['Invoice No'] ||
        formModel?.['invoice_number'] ||
        formModel?.['invoice_no'] ||
        currentAgentData?.['Extracted Invoice JSON']?.invoice_header?.[
          'Invoice No'
        ] ||
        currentAgentData?.['Extracted Invoice JSON']?.invoice_header?.[
          'invoice_no'
        ] ||
        currentAgentData?.['Extracted Invoice JSON']?.invoice_header?.[
          'Invoice Number'
        ] ||
        currentAgentData?.['Extracted Invoice JSON']?.invoice_header?.[
          'invoice_number'
        ] ||
        currentAgentData?.['Extracted Invoice JSON']?.invoice_header?.[
          'invoice_num'
        ] ||
        currentAgentData?.['kvcYuknkDumkTenjvrVLj'] ||
        selectedItem?.reqNo ||
        selectedItem?.['kvcYuknkDumkTenjvrVLj'] ||
        selectedItem?.invoiceNumber ||
        selectedItem?.requestNo ||
        'REQ - ...'
    }
    if (typeof raw === 'string' && raw.includes('PO Number:')) {
      return raw.replace(/\s*PO\s*(Number|No|num|#)?:?\s*\d+/gi, '').trim()
    }
    return raw
  }, [isGenericWorkflow, selectedItem, formModel, currentAgentData])

  useEffect(() => {
    if (!isGenericWorkflow) return
    const activeItem = request || selectedItem
    const parsed = safeParseFormData(activeItem?.formData)
    setGenericFormModel((prev) => {
      const next = { ...parsed }
      for (const [key, value] of Object.entries(prev)) {
        if (hasStoredFileValue(value) && !hasStoredFileValue(next[key])) {
          next[key] = value
        }
      }
      return applyCalculatedFields(
        getFormPanels(rawWorkflowData),
        seedGmailFirstFileUpload(
          next,
          rawWorkflowData,
          genericAttachments,
          activeItem?.activityId,
          rawWorkflowData?.repositoryId || activeItem?.repositoryId,
        ),
      )
    })
  }, [
    genericAttachments,
    isGenericWorkflow,
    rawWorkflowData,
    request,
    selectedItem?.activityId,
    selectedItem?.formData,
    selectedItem?.repositoryId,
    selectedItem?.transactionId,
  ])

  useEffect(() => {
    if (!isGenericWorkflow) return
    if (
      !shouldSeedFirstFileUploadFromAttachment(
        rawWorkflowData,
        (request || selectedItem)?.activityId,
      )
    ) {
      return
    }
    const firstField = getFirstFileUploadField(getFormPanels(rawWorkflowData))
    if (!isFileUploadField(firstField)) return
    const firstReceived = getFirstReceivedAttachment(genericAttachments)
    const stored = attachmentToFormFileValue(
      firstReceived,
      getWorkflowRepositoryId(
        rawWorkflowData,
        rawWorkflowData?.repositoryId ||
          selectedItem?.repositoryId ||
          request?.repositoryId,
      ),
    )
    if (!stored) return

    setGenericFormModel((prev) =>
      applyCalculatedFields(
        getFormPanels(rawWorkflowData),
        seedGmailFirstFileUpload(
          prev,
          rawWorkflowData,
          genericAttachments,
          (request || selectedItem)?.activityId,
          stored.repositoryId,
        ),
      ),
    )

    const instanceKey = String(genericInstanceId || '')
    if (instanceKey) {
      setFieldForAttachment(instanceKey, stored.itemId, firstField.id)
    }
  }, [
    genericAttachments,
    genericInstanceId,
    isGenericWorkflow,
    rawWorkflowData,
    request,
    selectedItem,
  ])

  const handleGenericFieldChange = (fieldId: string, value: any) =>
    setGenericFormModel((prev) =>
      applyCalculatedFields(getFormPanels(rawWorkflowData), {
        ...prev,
        [fieldId]: value,
      }),
    )

  const allowedLabels = useMemo(() => {
    const activeItem = request || selectedItem
    if (!activeItem) return new Set<string>()
    const metaMap = buildFieldMetaMap(
      selectedWorkflow,
      request?._formDefinition,
    )

    const fieldsSource = mergeFormData(
      request?.formData,
      selectedItem?.formData,
    )
    const labels = new Set<string>()
    const labelRecord: Record<string, unknown> = {}

    Object.keys(fieldsSource).forEach((key) => {
      const val =
        getFieldValueFromSource(fieldsSource, key) ?? fieldsSource[key]
      if (!shouldIncludeExtractedField(metaMap, key, val)) return

      const label = getExtractedFieldLabel(metaMap, key)
      labels.add(label)
      labelRecord[label] = val
    })

    appendMissingFormScalarFields(labelRecord, fieldsSource, metaMap)
    Object.keys(labelRecord).forEach((label) => labels.add(label))

    return labels
  }, [
    selectedItem,
    selectedItem?.formData,
    selectedWorkflow,
    request?._formDefinition,
    request?.formData,
    request,
  ])

  useEffect(() => {
    if (agentDataList.length > 0) {
      const exists = agentDataList.some((a: any) => a.id === selectedAgentId)
      if (!exists) {
        setSelectedAgentId(agentDataList[0].id)
      }
    } else {
      setSelectedAgentId(null)
    }
  }, [agentDataList, selectedAgentId])

  useEffect(() => {
    const activeItem = request || selectedItem
    if (activeItem) {
      const cleanFields = parseCleanFields(
        {
          ...activeItem,
          formData: mergeFormData(request?.formData, selectedItem?.formData),
        },
        selectedWorkflow,
        request?._formDefinition,
        invoiceHeader,
      )
      setFormModel(cleanFields)
    } else {
      setFormModel({})
    }
  }, [
    selectedItem?.transactionId,
    selectedItem?.formData,
    selectedWorkflow,
    request?._formDefinition,
    request?.formData,
    invoiceHeader,
    request,
  ])

  console.log('=== REQUEST COMPONENT DEBUG LOGS ===')
  console.log('Prop item:', item)
  console.log('Store SelectedItem:', storeSelectedItem)
  console.log('Resolved SelectedItem:', selectedItem)
  console.log('Process ID:', selectedItem?.processId)
  console.log('Transaction ID:', selectedItem?.transactionId)
  console.log('Selected Workflow ID:', resolvedWorkflowId)
  console.log('UseRequestDetail Data:', request)
  console.log('Agent Data List:', agentDataList)

  useEffect(() => {
    if (hasAgentData && activeTab === 'Form') {
      setActiveTab('Overview')
      if (!selectedAgentId) setSelectedAgentId(agentDataList[0].id)
    }
    if (activeTabValue) {
      setActiveTab(activeTabValue)
    }
  }, [hasAgentData, activeTabValue])

  const handleMoveNext = async (action: string) => {
    const checklistItems: { id: string; label: string; required: boolean }[] =
      Array.isArray(currentBlockSettings.checklistItems)
        ? currentBlockSettings.checklistItems
        : []
    const missingChecklistItem = checklistItems.find(
      (item) => item.required && !checklistChecked[item.id],
    )
    if (missingChecklistItem) {
      showToast({
        message: t`Please complete "${missingChecklistItem.label}" before continuing.`,
        variant: 'info',
      })
      return
    }
    if (
      currentBlockSettings.documentRequired &&
      genericAttachments.length === 0
    ) {
      showToast({
        message: t`Please attach at least one file before continuing.`,
        variant: 'info',
      })
      return
    }
    if (currentBlockSettings.userSignature && !signatureConfirmed) {
      showToast({
        message: t`Please confirm your signature before continuing.`,
        variant: 'info',
      })
      return
    }
    const mandatoryFields: string[] = Array.isArray(
      currentBlockSettings.mandatoryFields,
    )
      ? currentBlockSettings.mandatoryFields
      : []
    if (mandatoryFields.length) {
      const activeModel = isGenericWorkflow ? genericFormModel : formModel
      const missingField = mandatoryFields.find((fieldId) => {
        const val = activeModel?.[fieldId]
        return val === undefined || val === null || val === ''
      })
      if (missingField) {
        showToast({
          message: t`Please complete all required fields before continuing.`,
          variant: 'info',
        })
        return
      }
    }

    try {
      setSubmitting(true)

      let fields: any = {}
      if (isGenericWorkflow) {
        fields = genericFormModel
      } else if (Object.keys(formModel).length > 0) {
        fields = mapFormModelToPayloadFields(
          formModel,
          selectedWorkflow,
          request?._formDefinition,
        )
      } else if (typeof selectedItem?.formData === 'string') {
        try {
          fields = JSON.parse(selectedItem.formData || '{}')
        } catch {
          fields = {}
        }
      } else {
        fields = selectedItem?.formData?.fields || selectedItem?.formData || {}
      }

      const formDataStr = JSON.stringify(fields)

      let targetUserId =
        selectedItem?.userId ||
        request?.userId ||
        authUserStore.getState().session?.id ||
        null
      if (action === 'Forward' && (window as any)._selectedForwardUserId) {
        targetUserId = (window as any)._selectedForwardUserId
      }

      const payload = {
        activityid: selectedItem?.activityId || request?.activityId || '',
        activityUserId: targetUserId,
        AIAGENTHtml: selectedItem?.agentHtml || request?.agentHtml || '',
        AIAGENTResponse:
          typeof selectedItem?.agentResponse === 'string'
            ? selectedItem.agentResponse
            : JSON.stringify(
                selectedItem?.agentResponse || request?.agentResponse || {},
              ),
        comments:
          action === 'Forward' && (window as any)._forwardComments
            ? (window as any)._forwardComments
            : '',
        formData: formDataStr,
        formEntryId: Number(
          selectedItem?.formEntryId || request?.formEntryId || 0,
        ),
        formId:
          selectedItem?.formId ||
          request?.formId ||
          rawWorkflowData?.formId ||
          rawWorkflowData?.wFormId ||
          null,
        instanceId:
          selectedItem?.workflowInstanceId ||
          request?.workflowInstanceId ||
          null,
        isItemTable: true,
        itemId: selectedItem?.itemId || request?.itemId || null,
        processId:
          selectedItem?.processId ||
          selectedItem?.id ||
          request?.processId ||
          request?.id ||
          null,
        repositoryId:
          selectedItem?.repositoryId ||
          request?.repositoryId ||
          rawWorkflowData?.repositoryId ||
          null,
        review: action,
        transactionId:
          selectedItem?.transactionId || request?.transactionId || null,
        workflowId:
          selectedItem?.workflowId ||
          request?.workflowId ||
          rawWorkflowData?.id ||
          null,
      }

      if (action === 'Forward') {
        Object.assign(payload, {
          assignToUserId: (window as any)._selectedForwardUserId,
          internalForwardUserId: [(window as any)._selectedForwardUserId],
        })
      }

      console.log('MoveNext Payload:', payload)

      const instanceId =
        selectedItem?.workflowInstanceId || request?.workflowInstanceId
      if (!instanceId) {
        throw new Error('Instance ID is missing')
      }

      const response = await workflowsApiV6.moveNext(instanceId, payload)
      console.log('MoveNext Response:', response)

      if (response?.error) {
        showToast({
          message: t`Failed to proceed request: ${response.error}`,
          variant: 'error',
        })
        return
      }

      // Invalidate notifications query so new ticket notifications load immediately
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })

      const responseData = response?.data
      const nextApAgentJobId = extractApAgentJobId(responseData)
      const nextInstanceId =
        responseData?.instanceId ||
        responseData?.workflowInstanceId ||
        responseData?.processId ||
        instanceId

      if (nextApAgentJobId) {
        registerApAgentJobProcessing({
          apAgentJobId: nextApAgentJobId,
          processId: nextInstanceId,
          requestNo:
            selectedItem?.requestNo ||
            selectedItem?.reqNo ||
            resolvedRequestNo,
          stage:
            responseData?.stage ||
            selectedItem?.stage ||
            selectedItem?.currentStage ||
            'Processing',
          transactionId:
            responseData?.transactionId || selectedItem?.transactionId,
          workflowId:
            selectedItem?.workflowId ||
            request?.workflowId ||
            rawWorkflowData?.id,
        })

        showToast({
          message: t`Request ${resolvedRequestNo} is being processed.`,
          variant: 'success',
        })

        queryClient.invalidateQueries({ queryKey: ['inbox'] })
        queryClient.invalidateQueries({
          queryKey: [
            'request-detail',
            resolvedWorkflowId,
            selectedItem?.processId,
            selectedItem?.transactionId,
          ],
        })
        workflowRefresh()
        // Stay on the detail view so job polling can show live status messages.
        return
      }

      showToast({
        message:
          action.toLowerCase() === 'submit'
            ? t`Request ${resolvedRequestNo} submitted successfully`
            : t`Request ${resolvedRequestNo} action "${action}" completed successfully`,
        variant: 'success',
      })

      queryClient.invalidateQueries({
        queryKey: [
          'request-detail',
          resolvedWorkflowId,
          selectedItem?.processId,
          selectedItem?.transactionId,
        ],
      })
      workflowRefresh()
      closeRequest()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
      delete (window as any)._selectedForwardUserId
      delete (window as any)._forwardComments
    }
  }

  const handleVerifier = async (action: string) => {
    if (action === 'Forward' && !(window as any)._selectedForwardUserId) {
      return
    }

    if (action !== 'Save' && ruleActions.length > 0) {
      await handleMoveNext(action)
      return
    }

    try {
      setSubmitting(true)
      console.log(rawWorkflowData)
      const payload = {
        formData: {
          fields: isGenericWorkflow
            ? genericFormModel
            : Object.keys(formModel).length > 0
              ? mapFormModelToPayloadFields(
                  formModel,
                  selectedWorkflow,
                  request?._formDefinition,
                )
              : selectedItem?.formData?.fields || {},
          formEntryId: selectedItem?.formData?.formEntryId,
          formId: rawWorkflowData?.wFormId,
        },
        review: action === 'Save' ? '' : action,
        transactionId: selectedItem?.transactionId,
        workflowId: rawWorkflowData?.id,
      }
      console.log('Submit Payload:', payload, 'formModel:', formModel)

      const response = await workflowApi?.createProcessTransaction(payload)
      console.log(response)

      if (response?.error) {
        showToast({
          message:
            action === 'Save'
              ? t`Failed to save request: ${response.error}`
              : t`Failed to submit request: ${response.error}`,
          variant: 'error',
        })
        return
      }

      const responseData = response?.data ?? response
      const nextApAgentJobId = extractApAgentJobId(responseData)
      if (nextApAgentJobId) {
        registerApAgentJobProcessing({
          apAgentJobId: nextApAgentJobId,
          processId:
            responseData?.instanceId ||
            responseData?.processId ||
            selectedItem?.processId ||
            selectedItem?.id,
          requestNo:
            selectedItem?.requestNo ||
            selectedItem?.reqNo ||
            resolvedRequestNo,
          stage: responseData?.stage || 'Processing',
          transactionId:
            responseData?.transactionId || selectedItem?.transactionId,
          workflowId: rawWorkflowData?.id,
        })
        showToast({
          message: t`Request is being processed.`,
          variant: 'success',
        })
        queryClient.invalidateQueries({ queryKey: ['inbox'] })
        queryClient.invalidateQueries({
          queryKey: [
            'request-detail',
            resolvedWorkflowId,
            selectedItem?.processId,
            selectedItem?.transactionId,
          ],
        })
        workflowRefresh()
        return
      }

      showToast({
        message:
          action === 'Save'
            ? t`Request saved successfully`
            : t`Request submitted successfully`,
        variant: 'success',
      })

      queryClient.invalidateQueries({
        queryKey: [
          'request-detail',
          resolvedWorkflowId,
          selectedItem?.processId,
          selectedItem?.transactionId,
        ],
      })
      workflowRefresh()
      closeRequest()
    } catch (e: any) {
      console.error(e)
      showToast({
        message: t`An error occurred: ${e.message || e}`,
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const parsedFormData = useMemo(() => {
    const formData = selectedItem?.formData
    if (!formData) return {}
    if (typeof formData === 'object') return formData.fields || formData
    if (typeof formData === 'string') {
      try {
        const parsed = JSON.parse(formData)
        return parsed.fields || parsed || {}
      } catch {
        return {}
      }
    }
    return {}
  }, [selectedItem])

  const totalAmount =
    formModel?.['Invoice Amount'] ||
    formModel?.['Total Due'] ||
    formModel?.['Total'] ||
    formModel?.['invoice_amount'] ||
    formModel?.['total_amount'] ||
    parsedFormData?.['Invoice Amount'] ||
    parsedFormData?.['Total Due'] ||
    parsedFormData?.['Total'] ||
    parsedFormData?.['invoice_amount'] ||
    parsedFormData?.['total_amount'] ||
    invoiceHeader?.['Invoice Amount'] ||
    invoiceHeader?.['Total Due'] ||
    invoiceHeader?.['Total'] ||
    invoiceHeader?.['invoice_amount'] ||
    invoiceHeader?.['total_amount'] ||
    selectedItem?.totalAmount
  // Robust check for PO Value
  const poValueFromMatching = (() => {
    const fieldMatching =
      currentAgentData?.debug?.['Side-by-side Field Matching'] || []
    const totalField = fieldMatching.find(
      (f: any) =>
        f?.Field &&
        (f.Field.toLowerCase().includes('total') ||
          f.Field.toLowerCase().includes('amount')),
    )
    return totalField ? totalField['PO Value'] : undefined
  })()

  const poValue =
    currentAgentData?.po_matching?.total ||
    currentAgentData?.po_matching?.amount ||
    currentAgentData?.po_matching?.po_amount ||
    currentAgentData?.po_matching?.total_amount ||
    poValueFromMatching ||
    invoiceHeader?.['PO Value'] ||
    invoiceHeader?.['PO Amount'] ||
    invoiceHeader?.['po_value'] ||
    invoiceHeader?.['po_amount'] ||
    invoiceHeader?.['PO Total'] ||
    invoiceHeader?.['po_total'] ||
    formModel?.['PO Value'] ||
    formModel?.['PO Amount'] ||
    formModel?.['po_value'] ||
    formModel?.['po_amount'] ||
    formModel?.['PO Total'] ||
    formModel?.['po_total'] ||
    selectedItem?.poAmount ||
    selectedItem?.poValue ||
    '0.00'
  const poVal = extractPONumber(
    selectedItem,
    formModel,
    invoiceHeader,
    currentAgentData,
  )

  const currency = invoiceHeader?.['Currency'] || selectedItem?.currency

  // Auto-open API Playground if navigation request came from the plug icon in the inbox list
  useEffect(() => {
    if (sessionStorage.getItem('autoOpenPlayground') === 'true') {
      sessionStorage.removeItem('autoOpenPlayground')
      const actionStr = sessionStorage.getItem('autoOpenPlaygroundAction')
      sessionStorage.removeItem('autoOpenPlaygroundAction')

      try {
        const action = actionStr ? JSON.parse(actionStr) : null
        if (action) {
          const docInfo = {
            amount: selectedItem?.amount || formModel?.['Invoice Amount'] || 0,
            currency: currency || formModel?.['Currency'] || 'USD',
            invoiceNumber:
              formModel?.['Invoice Number'] ||
              formModel?.['Invoice No'] ||
              selectedItem?.invoiceNumber ||
              '',
            poNumber: poVal || selectedItem?.purchaseOrderNumber || '',
            requestNo: selectedItem?.requestNo || selectedItem?.reqNo || '',
            vendor:
              formModel?.['Supplier Name'] ||
              formModel?.['Vendor Name'] ||
              selectedItem?.vendor ||
              '',
          }
          const context: ApiPlaygroundContext = {
            actionName: action?.label || 'Paid',
            document: docInfo,
            endpoint: action?.endpoint || 'https://v6playground.onrender.com/',
            requestPayload: docInfo,
          }
          setPlaygroundContext(context)
          openPlayground()
        }
      } catch (err) {
        console.error('Error parsing autoOpenPlaygroundAction:', err)
      }
    }
  }, [
    selectedItem,
    formModel,
    currency,
    poVal,
    setPlaygroundContext,
    openPlayground,
  ])

  const agentDecision = currentAgentData?.decision || selectedItem?.decision

  let finalStatusBadge = ''
  if (agentDecision) {
    const decUpper = String(agentDecision).toUpperCase()
    if (decUpper === 'APPROVED') {
      finalStatusBadge = 'Approved'
    } else if (decUpper === 'MATCHED') {
      finalStatusBadge = 'Matched'
    } else if (
      decUpper === 'PARTIALLY APPROVED' ||
      decUpper === 'PARTIALLY_APPROVED'
    ) {
      finalStatusBadge = 'Partially Approved'
    } else if (
      decUpper === 'PARTIALLY MATCHED' ||
      decUpper === 'PARTIAL MATCH'
    ) {
      finalStatusBadge = 'Partially Matched'
    } else if (decUpper === 'REJECTED') {
      finalStatusBadge = 'Rejected'
    } else if (decUpper === 'NOT MATCHED') {
      finalStatusBadge = 'Not Matched'
    } else {
      finalStatusBadge = String(agentDecision)
    }
  } else {
    if (isCurrentlyProcessing || isLoading) {
      finalStatusBadge = 'Setting up...'
    } else {
      finalStatusBadge =
        selectedItem?.stage || selectedItem?.status || 'Finalizing Results...'
    }
  }

  let displayMessage = jobStatus?.message || jobStatus?.hangfireStatus || ''
  if (displayMessage === 'AP Agent finished') {
    displayMessage = 'AP Agent'
  } else if (displayMessage === 'Linking related records') {
    displayMessage = 'Linking PO Records'
  }

  let statusBadge = ''
  if (
    isCurrentlyProcessing &&
    apAgentJobId &&
    jobStatus &&
    !jobStatus.isCompleted
  ) {
    // statusBadge = jobStatus.stage
    if (displayMessage) {
      statusBadge += `${displayMessage}`
    }
  } else if (
    isCurrentlyProcessing &&
    apAgentJobId &&
    (!jobStatus || !jobStatus.isCompleted)
  ) {
    statusBadge = 'Preparing your request...'
  } else {
    // If job completed but we don't have agentDecision yet, show a loader status
    if (isCurrentlyProcessing && apAgentJobId && jobStatus && !agentDecision) {
      statusBadge = 'Finalizing Results...'
    } else {
      statusBadge = finalStatusBadge
    }
  }
  console.log(selectedItem, 'Selected Item')

  const handleShare = async (
    shares: { action: number; email: string }[],
    message: string,
  ) => {
    const instanceId =
      selectedItem?.workflowInstanceId || request?.workflowInstanceId
    const repositoryId =
      selectedItem?.repositoryId ||
      request?.repositoryId ||
      rawWorkflowData?.repositoryId
    const itemId =
      selectedItem?.itemId ||
      request?.itemId ||
      selectedItem?.fileId ||
      request?.fileId

    if (!instanceId) {
      showToast({
        message: t`No instance ID available to share`,
        variant: 'error',
      })
      return false
    }

    try {
      if (shares.length > 0) {
        await Promise.all(
          shares.map((share) =>
            workflowsApiV6.shareFile(String(instanceId), {
              action: share.action,
              email: share.email,
              itemId: String(itemId || ''),
              message,
              repositoryId: String(repositoryId || ''),
            }),
          ),
        )
      }
      showToast({ message: t`Request shared successfully`, variant: 'success' })
      return true
    } catch (error) {
      console.error('Failed to share:', error)
      showToast({ message: t`Failed to share request`, variant: 'error' })
      return false
    }
  }

  return (
    <div
      className={`flex min-h-0 w-full flex-col overflow-hidden p-0 ${hideActions ? 'bg-grey-2 h-full p-4' : 'h-full'}`}
    >
      <div className='sticky top-0 z-50 border-b border-[var(--gray-3)] bg-surface px-2'>
        <Header
          agentData={currentAgentData}
          approveLoading={submitting}
          assigneeLabel={assigneeLabel}
          currency={currency}
          enableAIInsights={hasAgentData}
          hideActions={hideActions}
          isEditing={isEditing}
          isLoading={isLoading}
          isProcessing={isCurrentlyProcessing}
          percent={jobStatus?.percent}
          poNumber={poVal}
          poValue={poValue}
          requestNo={resolvedRequestNo}
          rightView={rightView}
          showApprove={requestListTab === 'Inbox'}
          simple={isGenericWorkflow}
          status={statusBadge}
          totalAmount={totalAmount}
          actions={headerActions.map((a: any) => {
            console.log('Header action being mapped:', a.value, a.label)
            if (
              String(a.value).toLowerCase() === 'forward' ||
              String(a.label).toLowerCase() === 'forward'
            ) {
              console.log('Found Forward action!')
              return {
                ...a,
                renderWrapper: (btn: React.ReactNode) => (
                  <ForwardPopover
                    target={btn}
                    users={allUsersForAssignee || []}
                    onConfirm={(userId, comments) => {
                      ;(window as any)._selectedForwardUserId = userId
                      if (comments) (window as any)._forwardComments = comments
                      handleVerifier(a.value)
                    }}
                  />
                ),
                onClick: (e: any) => {
                  e?.preventDefault?.()
                },
              }
            }
            return {
              ...a,
              onClick: a.onClick || (() => handleVerifier(a.value)),
            }
          })}
          attachmentCount={
            isGenericWorkflow
              ? genericAttachments.length
              : selectedItem?.attachmentCount || 0
          }
          commentsCount={
            isGenericWorkflow
              ? genericComments.length
              : selectedItem?.commentsCount || 0
          }
          lastActionAt={
            selectedItem?.lastActionDate ||
            selectedItem?.lastAction?.date ||
            selectedItem?.lastAction?.createdAt ||
            selectedItem?.lastActionAt ||
            selectedItem?.updatedAt ||
            selectedItem?.actionDate ||
            selectedItem?.transactionCreatedAt ||
            selectedItem?.createdAtUtc ||
            selectedItem?.createdAt ||
            request?.updatedAt ||
            request?.transactionCreatedAt ||
            request?.createdAtUtc ||
            request?.createdAt
          }
          raisedAt={
            selectedItem?.transactionCreatedAt ||
            selectedItem?.createdAtUtc ||
            selectedItem?.createdAt ||
            selectedItem?.createdOn ||
            selectedItem?.raisedAt ||
            selectedItem?.date ||
            request?.transactionCreatedAt ||
            request?.createdAtUtc ||
            request?.createdAt
          }
          raisedBy={
            selectedItem?.transactionCreatedByEmail ||
            selectedItem?.createdByName ||
            selectedItem?.createdByEmail ||
            selectedItem?.createdBy ||
            selectedItem?.raisedBy ||
            selectedItem?.userName ||
            selectedItem?.creatorName ||
            request?.transactionCreatedByEmail ||
            request?.createdByName ||
            request?.createdBy ||
            request?.userName ||
            authUserStore.getState().session?.name
          }
          stage={
            // `lastActionStageName` is the stage the request came FROM (the
            // last completed action), not where it currently sits — so it
            // must rank behind the actual current-stage fields, only used
            // as a last-resort fallback if none of those are populated.
            selectedItem?.currentStage ||
            selectedItem?.stageName ||
            selectedItem?.stage ||
            selectedItem?.stepName ||
            request?.currentStage ||
            request?.stageName ||
            request?.stage ||
            selectedItem?.lastActionStageName ||
            request?.lastActionStageName
          }
          ticketUserId={
            selectedItem?.userId ||
            request?.userId ||
            authUserStore.getState().session?.id ||
            undefined
          }
          setRightView={setRightView}
          onApprove={handleVerifier}
          onBack={onBack || closeRequest}
          onManualCorrection={() => setIsEditing(!isEditing)}
          onNext={onNext}
          onPrev={onPrev}
          onShare={handleShare}
        />
      </div>

      {/* Tab Content */}
      <div className='flex min-h-0 w-full flex-1 overflow-hidden'>
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <AnimateFadeIn className='mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0'>
            {isGenericWorkflow ? (
              <GenericRequestOverview
                attachments={genericAttachments}
                checklistChecked={checklistChecked}
                comments={genericComments}
                documentRequired={!!currentBlockSettings.documentRequired}
                formModel={genericFormModel}
                rawWorkflowData={overviewWorkflowData}
                rightView={rightView}
                selectedItem={request || selectedItem}
                signatureConfirmed={signatureConfirmed}
                userSignatureRequired={!!currentBlockSettings.userSignature}
                viewOnly={requestListTab !== 'Inbox'}
                checklistItems={
                  Array.isArray(currentBlockSettings.checklistItems)
                    ? currentBlockSettings.checklistItems
                    : []
                }
                setRightView={setRightView}
                onAttachmentsChanged={refetchGenericAttachments}
                onChecklistToggle={(id, checked) =>
                  setChecklistChecked((prev) => ({ ...prev, [id]: checked }))
                }
                onCommentsChanged={refetchGenericComments}
                onFieldChange={handleGenericFieldChange}
                onSignatureToggle={setSignatureConfirmed}
              />
            ) : (
              <Overview
                agentData={currentAgentData}
                allowedLabels={allowedLabels}
                formDefinition={request?._formDefinition}
                formModel={formModel}
                isFourthItem={isFourthItem}
                isProcessing={isCurrentlyProcessing || isLoading}
                isThirdItem={isThirdItem}
                processId={Number(selectedItem?.processId)}
                repositoryId={Number(rawWorkflowData?.repositoryId)}
                rightView={rightView}
                selectedItem={request || selectedItem}
                selectedWorkflow={selectedWorkflow}
                transactionId={selectedItem?.transactionId as any}
                workflowId={resolvedWorkflowId}
                actions={headerActions.map((a: any) => {
                  if (
                    String(a.value).toLowerCase() === 'forward' ||
                    String(a.label).toLowerCase() === 'forward'
                  ) {
                    return {
                      ...a,
                      renderWrapper: (btn: React.ReactNode) => (
                        <ForwardPopover
                          target={btn}
                          users={allUsersForAssignee || []}
                          onConfirm={(userId, comments) => {
                            ;(window as any)._selectedForwardUserId = userId
                            if (comments)
                              (window as any)._forwardComments = comments
                            handleVerifier(a.value)
                          }}
                        />
                      ),
                      onClick: (e: any) => {
                        e?.preventDefault?.()
                      },
                    }
                  }
                  return {
                    ...a,
                    onClick: a.onClick || (() => handleVerifier(a.value)),
                  }
                })}
                setFormModel={setFormModel}
                setRightView={setRightView}
              />
            )}
          </AnimateFadeIn>
        </div>
      </div>
    </div>
  )
}

Request.displayName = 'Request'
export default Request
