import { useEffect, useMemo, useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
// Import your custom animation components
import { AnimateFadeIn } from '@/components/common/animations'
import authUserStore from '@/stores/authUserStore'
import workflowApi from '../../../../api/workflow/workflow'
import { useRequestDetail } from '../../hooks/useRequestDetails'
import requestStore from '../../stores/useRequestStore'
import {
  isDecorativeFieldType,
  isMatrixFieldType,
  isTableType,
} from '../../utils/dynamicTable.utils'
import Header from './components/Header'
import Overview from './components/sections/overview/Overview'

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
    message: jobData.message || '',
    percent,
    stage,
    isCompleted,
  })

  // Sync to global store
  const jobKey = `job-${apAgentJobId}`
  requestStore.getState().setJobStatus(jobKey, {
    stage,
    message,
    percent,
    isCompleted,
    apAgentJobId,
  })

  if (jobData.instanceId) {
    requestStore.getState().setJobMapping(apAgentJobId, jobData.instanceId)
    requestStore.getState().setJobStatus(String(jobData.instanceId), {
      stage,
      message,
      percent,
      isCompleted,
      apAgentJobId,
    })
  }

  requestStore
    .getState()
    .updateProcessingProcess(String(`job-${apAgentJobId}`), {
      percent,
      stage: jobData.stage || 'Initiating...',
    })

  if (isCompleted) {
    stopPolling()
    if (jobData.instanceId) {
      updateProcessInStore(apAgentJobId, jobData)
    }
  }
}

const useJobPolling = (apAgentJobId: string | number | undefined) => {
  const [jobStatus, setJobStatus] = useState<{
    hangfireStatus: string
    message: string
    percent?: number
    stage: string
    isCompleted?: boolean
  } | null>(null)

  useEffect(() => {
    if (!apAgentJobId) return

    let intervalId: any = null

    const pollJob = async () => {
      try {
        const res = await workflowsApiV6.getApAgentJobStatus(
          String(apAgentJobId),
        )
        if (res.data) {
          handleJobData(apAgentJobId, res.data, setJobStatus, () => {
            if (intervalId) clearInterval(intervalId)
          })
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
  }, [apAgentJobId])

  return jobStatus
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
  item,
  workflowId,
  onBack,
  onNext,
  onPrev,
  isFourthItem,
  isThirdItem,
}: {
  hideActions?: boolean
  item?: any
  workflowId?: number | string
  onBack?: () => void
  onNext?: () => void
  onPrev?: () => void
  isFourthItem?: boolean
  isThirdItem?: boolean
}) => {
  const {
    activeTabValue,
    closeRequest,
    processingProcesses,
    rawWorkflowData,
    requestListTab,
    selectedItem: storeSelectedItem,
    selectedWorkflow,
    selectedWorkflowId,
    workflowRefresh,
    jobMappings,
    jobStatuses,
  } = requestStore((state) => state)

  const selectedItem = item || storeSelectedItem
  const resolvedWorkflowId =
    selectedWorkflow?.id || workflowId || selectedWorkflowId

  const [activeTab, setActiveTab] = useState<string>(
    activeTabValue || 'Overview',
  )
  const rowId = selectedItem?.processId || selectedItem?.id
  let apAgentJobId = selectedItem?.apAgentJobId
  if (!apAgentJobId && rowId) {
    const mappedJobId = Object.keys(jobMappings || {}).find(
      (key) => String(jobMappings[key]) === String(rowId)
    )
    if (mappedJobId) {
      apAgentJobId = mappedJobId
    } else {
      const statusObj = Object.values(jobStatuses || {}).find(
        (status: any) =>
          String(status?.apAgentJobId) === String(rowId) ||
          String(status?.instanceId) === String(rowId)
      ) as any
      if (statusObj?.apAgentJobId) {
        apAgentJobId = statusObj.apAgentJobId
      }
    }
  }
  const jobStatus = useJobPolling(apAgentJobId)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [rightView, setRightView] = useState<
    'analysis' | 'comments' | 'attachments' | 'forms'
  >('analysis')
  const [isEditing, setIsEditing] = useState<boolean>(false)

  // Determine if it was known to be processing initially
  const initialProcessing =
    processingProcesses.some(
      (p) =>
        String(p.processId || p.id) ===
        String(selectedItem?.processId || selectedItem?.id),
    ) || selectedItem?.isProcessing

  const { data: request, isLoading } = useRequestDetail(
    resolvedWorkflowId,
    selectedItem?.processId,
    selectedItem?.transactionId,
    initialProcessing,
  )

  const hasAgentDecision = request
    ? !!(
        request.review ||
        request._agentData?.[0]?.decision ||
        request.completedAtUtc
      )
    : false
  const isCurrentlyProcessing = !hasAgentDecision && initialProcessing && !jobStatus?.isCompleted
  const actions =
    request?._actions ||
    selectedItem?._actions ||
    storeSelectedItem?._actions ||
    []

  const dynamicRules = useMemo(() => {
    const rules = rawWorkflowData?.workflowJson?.rules || []
    const currentActivityId = selectedItem?.activityId
    if (!currentActivityId) return []
    return rules.filter((rule: any) => rule.fromBlockId === currentActivityId)
  }, [rawWorkflowData, selectedItem?.activityId])

  const ruleActions = useMemo(() => {
    return dynamicRules.map((rule: any) => {
      const actionName = rule.proceedAction || rule.action || 'Submit'
      return {
        label: actionName,
        value: actionName,
      }
    })
  }, [dynamicRules])

  const headerActions = useMemo(() => {
    return ruleActions.length > 0 ? ruleActions : actions
  }, [ruleActions, actions])

  const agentDataList = request?._agentData || selectedItem?._agentData || []
  const hasAgentData = agentDataList.length > 0

  const [formModel, setFormModel] = useState<any>({})

  const allowedLabels = useMemo(() => {
    const activeItem = request || selectedItem
    if (!activeItem) return new Set<string>()
    const metaMap = buildFieldMetaMap(
      selectedWorkflow,
      request?._formDefinition,
    )

    const fieldsSource = parseFieldsSource(activeItem.formData)
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
    selectedWorkflow,
    request?._formDefinition,
    request?.formData,
    request,
  ])

  useEffect(() => {
    if (hasAgentData && agentDataList.length > 0) {
      setSelectedAgentId(agentDataList[0].id)
    } else {
      setSelectedAgentId(null)
    }
  }, [request?._agentData, hasAgentData])

  const currentAgentData = useMemo(() => {
    return agentDataList.find((a: any) => a.id === selectedAgentId) || {}
  }, [agentDataList, selectedAgentId])

  const invoiceHeader =
    currentAgentData?.['Extracted Invoice JSON']?.invoice_header

  useEffect(() => {
    const activeItem = request || selectedItem
    if (activeItem) {
      const cleanFields = parseCleanFields(
        activeItem,
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
    try {
      setSubmitting(true)

      let fields: any = {}
      if (Object.keys(formModel).length > 0) {
        fields = mapFormModelToPayloadFields(
          formModel,
          selectedWorkflow,
          request?._formDefinition,
        )
      } else if (typeof selectedItem?.formData === 'string') {
        fields = JSON.parse(selectedItem.formData || '{}')
      } else {
        fields = selectedItem?.formData?.fields || selectedItem?.formData || {}
      }

      const formDataStr = JSON.stringify(fields)

      const payload = {
        activityid: selectedItem?.activityId || '',
        activityUserId:
          selectedItem?.userId || authUserStore.getState().session?.id || null,
        AIAGENTHtml: selectedItem?.agentHtml || '',
        AIAGENTResponse:
          typeof selectedItem?.agentResponse === 'string'
            ? selectedItem.agentResponse
            : JSON.stringify(selectedItem?.agentResponse || {}),
        comments: '',
        formData: formDataStr,
        formEntryId: Number(selectedItem?.formEntryId || 0),
        formId:
          selectedItem?.formId ||
          rawWorkflowData?.formId ||
          rawWorkflowData?.wFormId ||
          null,
        instanceId: selectedItem?.workflowInstanceId || null,
        isItemTable: true,
        itemId: selectedItem?.itemId || null,
        processId: selectedItem?.processId || selectedItem?.id || null,
        repositoryId:
          selectedItem?.repositoryId || rawWorkflowData?.repositoryId || null,
        review: action,
        transactionId: selectedItem?.transactionId || null,
        workflowId: selectedItem?.workflowId || rawWorkflowData?.id || null,
      }

      console.log('MoveNext Payload:', payload)

      const instanceId = selectedItem?.workflowInstanceId
      if (!instanceId) {
        throw new Error('Instance ID is missing')
      }

      const response = await workflowsApiV6.moveNext(instanceId, payload)
      console.log('MoveNext Response:', response)

      workflowRefresh()
      closeRequest()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifier = async (action: string) => {
    if (action !== 'Save' && ruleActions.length > 0) {
      await handleMoveNext(action)
      return
    }

    try {
      setSubmitting(true)
      console.log(rawWorkflowData)
      const payload = {
        formData: {
          fields:
            Object.keys(formModel).length > 0
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
      workflowRefresh()
      closeRequest()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const totalAmount =
    formModel?.['Invoice Amount'] ||
    formModel?.['Total Due'] ||
    formModel?.['Total'] ||
    formModel?.['invoice_amount'] ||
    formModel?.['total_amount'] ||
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

  const agentDecision = currentAgentData?.decision || selectedItem?.decision

  let finalStatusBadge = ''
  if (agentDecision) {
    const decUpper = String(agentDecision).toUpperCase()
    if (decUpper === 'APPROVED') {
      finalStatusBadge = 'Approved'
    } else if (
      decUpper === 'PARTIALLY APPROVED' ||
      decUpper === 'PARTIALLY_APPROVED'
    ) {
      finalStatusBadge = 'Partially Approved'
    } else if (decUpper === 'REJECTED') {
      finalStatusBadge = 'Rejected'
    } else {
      finalStatusBadge = String(agentDecision)
    }
  } else {
    finalStatusBadge = selectedItem?.stage || selectedItem?.status || ''
  }

  let displayMessage = jobStatus?.message || jobStatus?.hangfireStatus || ''
  if (displayMessage === 'AP Agent finished') {
    displayMessage = 'AP Agent'
  }

  let statusBadge = ''
  if (apAgentJobId && jobStatus && !jobStatus.isCompleted) {
    statusBadge = jobStatus.stage
    if (displayMessage) {
      statusBadge += ` - ${displayMessage}`
    }
  } else if (apAgentJobId && (!jobStatus || !jobStatus.isCompleted)) {
    statusBadge = 'Initiating...'
  } else {
    statusBadge = finalStatusBadge
  }

  return (
    <div
      className={`flex w-full flex-col p-0 ${hideActions ? 'bg-grey-2 h-full p-4' : 'h-[calc(100vh-85px)]'}`}
    >
      <div className='sticky top-0 z-20 border-b border-[var(--gray-3)] px-2'>
        <Header
          actions={headerActions}
          agentData={currentAgentData}
          approveLoading={submitting}
          attachmentCount={selectedItem?.attachmentCount || 0}
          commentsCount={selectedItem?.commentsCount || 0}
          currency={currency}
          enableAIInsights={requestListTab !== 'Processed'}
          hideActions={hideActions}
          isEditing={isEditing}
          isLoading={isLoading}
          isProcessing={isCurrentlyProcessing}
          percent={jobStatus?.percent}
          poNumber={poVal}
          poValue={poValue}
          raisedAt={request?.createdAt}
          rightView={rightView}
          showApprove={requestListTab === 'Inbox'}
          status={statusBadge}
          totalAmount={totalAmount}
          requestNo={
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
          setRightView={setRightView}
          onApprove={handleVerifier}
          onBack={onBack || closeRequest}
          onManualCorrection={() => setIsEditing(!isEditing)}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>

      {/* Tab Content */}

      <AnimateFadeIn
        className='mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0'
        delay={0.6}
      >
        <Overview
          agentData={currentAgentData}
          allowedLabels={allowedLabels}
          formDefinition={request?._formDefinition}
          formModel={formModel}
          isProcessing={isCurrentlyProcessing || isLoading}
          processId={Number(selectedItem?.processId)}
          repositoryId={Number(rawWorkflowData?.repositoryId)}
          rightView={rightView}
          selectedItem={request || selectedItem}
          selectedWorkflow={selectedWorkflow}
          transactionId={Number(selectedItem?.transactionId)}
          workflowId={resolvedWorkflowId}
          setFormModel={setFormModel}
          setRightView={setRightView}
          isFourthItem={isFourthItem}
          isThirdItem={isThirdItem}
        />
      </AnimateFadeIn>
    </div>
  )
}

Request.displayName = 'Request'
export default Request
