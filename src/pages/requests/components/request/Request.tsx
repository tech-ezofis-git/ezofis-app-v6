import { useEffect, useMemo, useRef, useState } from 'react'
import formApi from '@/api/form/form'
import workflowsApiV6 from '@/api/v6/workflows'
import showToast from '@/components/base/toast/showToast'
// Import your custom animation components
import { AnimateFadeIn } from '@/components/common/animations'
import ApiPlayground, {
  type ApiPlaygroundContext,
} from '@/components/playground/ApiPlayground'
import { queryClient } from '@/lib/tanstack-query/queryClient'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
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
  const [jobStatus, setJobStatus] = useState<{
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
    'analysis' | 'comments' | 'attachments' | 'forms'
  >('analysis')
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false)
  const [playgroundContext, setPlaygroundContext] = useState<any>(null)

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

  // Fetch workflow data if rawWorkflowData is missing or mismatched
  useEffect(() => {
    if (
      resolvedWorkflowId &&
      (!rawWorkflowData ||
        String(rawWorkflowData.id) !== String(resolvedWorkflowId))
    ) {
      const fetchWorkflow = async () => {
        try {
          const res = await workflowsApiV6.getWorkflowById(
            String(resolvedWorkflowId),
          )
          if (res?.data) {
            const wf = res.data
            const wFormId =
              wf.formId ??
              wf.wFormId ??
              wf.settings?.general?.initiateUsing?.formId ??
              ''
            let formJson = wf.formJson
            if (wFormId) {
              const formRes = await formApi.getFormDataById(String(wFormId))
              if (formRes?.data) {
                formJson = formRes.data.formJson ?? formRes.data
              }
            }
            requestStore
              .getState()
              .setRawWorkflowData({ ...wf, formJson, id: resolvedWorkflowId })
          }
        } catch (e) {
          console.error(
            'Error loading raw workflow data in Request detail view:',
            e,
          )
        }
      }
      fetchWorkflow()
    }
  }, [resolvedWorkflowId, rawWorkflowData?.id])

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
          },
        })
      }
    }
  }, [request, selectedItem])

  const agentDataList = request?._agentData || selectedItem?._agentData || []
  const hasAgentData = agentDataList.length > 0

  const currentAgentData = useMemo(() => {
    return agentDataList.find((a: any) => a.id === selectedAgentId) || {}
  }, [agentDataList, selectedAgentId])

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

    if (isCompleted) {
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['request-detail', resolvedWorkflowId],
        })
        requestStore.getState().workflowRefresh()
      }, 1000)
    }
  })

  const hasAgentDecision = request
    ? !!(
      request.review ||
      request._agentData?.[0]?.decision ||
      request.completedAtUtc
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

  const dynamicRules = useMemo(() => {
    const rules = rawWorkflowData?.workflowJson?.rules || []
    const currentActivityId = request?.activityId || selectedItem?.activityId
    if (!currentActivityId) return []
    return rules.filter((rule: any) => rule.fromBlockId === currentActivityId)
  }, [rawWorkflowData, request?.activityId, selectedItem?.activityId])

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
    console.log('[RULE_ACTIONS_DEBUG] --- headerActions recalculating ---')
    console.log('[RULE_ACTIONS_DEBUG] isApAgentStage:', isApAgentStage)
    console.log('[RULE_ACTIONS_DEBUG] request activityId:', request?.activityId)
    console.log(
      '[RULE_ACTIONS_DEBUG] selectedItem activityId:',
      selectedItem?.activityId,
    )
    console.log(
      '[RULE_ACTIONS_DEBUG] rawWorkflowData rules:',
      rawWorkflowData?.workflowJson?.rules,
    )
    console.log(
      '[RULE_ACTIONS_DEBUG] dynamicRules (matching fromBlockId):',
      dynamicRules,
    )
    console.log('[RULE_ACTIONS_DEBUG] ruleActions:', ruleActions)
    console.log('[RULE_ACTIONS_DEBUG] fallback actions:', actions)
    if (isApAgentStage) return []
    return ruleActions.length > 0 ? ruleActions : actions
  }, [
    isApAgentStage,
    ruleActions,
    actions,
    request?.activityId,
    selectedItem?.activityId,
    rawWorkflowData,
  ])

  const [formModel, setFormModel] = useState<any>({})

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
    if (hasAgentData && agentDataList.length > 0) {
      setSelectedAgentId(agentDataList[0].id)
    } else {
      setSelectedAgentId(null)
    }
  }, [request?._agentData, hasAgentData])

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
        try {
          fields = JSON.parse(selectedItem.formData || '{}')
        } catch {
          fields = {}
        }
      } else {
        fields = selectedItem?.formData?.fields || selectedItem?.formData || {}
      }

      const formDataStr = JSON.stringify(fields)

      const payload = {
        activityid: selectedItem?.activityId || request?.activityId || '',
        activityUserId:
          selectedItem?.userId ||
          request?.userId ||
          authUserStore.getState().session?.id ||
          null,
        AIAGENTHtml: selectedItem?.agentHtml || request?.agentHtml || '',
        AIAGENTResponse:
          typeof selectedItem?.agentResponse === 'string'
            ? selectedItem.agentResponse
            : JSON.stringify(
              selectedItem?.agentResponse || request?.agentResponse || {},
            ),
        comments: '',
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
          message: `Failed to proceed request: ${response.error}`,
          variant: 'error',
        })
        return
      }

      showToast({
        message:
          action.toLowerCase() === 'submit'
            ? 'Request submitted successfully'
            : `Request action "${action}" completed successfully`,
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

      if (response?.error) {
        showToast({
          message:
            action === 'Save'
              ? `Failed to save request: ${response.error}`
              : `Failed to submit request: ${response.error}`,
          variant: 'error',
        })
        return
      }

      showToast({
        message:
          action === 'Save'
            ? 'Request saved successfully'
            : 'Request submitted successfully',
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
        message: `An error occurred: ${e.message || e}`,
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
          setPlaygroundContext({
            actionName: action?.label || 'Paid',
            document: docInfo,
            endpoint:
              action?.endpoint ||
              'https://ezagentplayground.onrender.com/apikey.html?id=2',
            // model: action?.model || 'gemini-2.0-flash-exp',
            // provider: action?.provider || 'gemini',
            requestPayload: docInfo,
          })
          setIsPlaygroundOpen(true)
        }
      } catch (err) {
        console.error('Error parsing autoOpenPlaygroundAction:', err)
      }
    }
  }, [selectedItem, formModel, currency, poVal])

  const handleOpenPlayground = (ctx: ApiPlaygroundContext = {}) => {
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
    const document = {
      ...docInfo,
      ...(ctx.document || {}),
    }

    setPlaygroundContext({
      ...ctx,
      document,
      requestPayload: ctx.requestPayload || ctx.payload || document,
    })
    setIsPlaygroundOpen(true)
  }

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
  }

  let statusBadge = ''
  if (apAgentJobId && jobStatus && !jobStatus.isCompleted) {
    // statusBadge = jobStatus.stage
    if (displayMessage) {
      statusBadge += `${displayMessage}`
    }
  } else if (apAgentJobId && (!jobStatus || !jobStatus.isCompleted)) {
    statusBadge = 'Fetching necessary Data...'
  } else {
    // If job completed but we don't have agentDecision yet, show a loader status
    if (apAgentJobId && jobStatus && !agentDecision) {
      statusBadge = 'Finalizing Results...'
    } else {
      statusBadge = finalStatusBadge
    }
  }
  console.log(selectedItem, "Selected Item")

  const handleShare = async (shares: { email: string; action: number }[], message: string) => {
    const instanceId =
      selectedItem?.workflowInstanceId || request?.workflowInstanceId
    const repositoryId =
      selectedItem?.repositoryId || request?.repositoryId || rawWorkflowData?.repositoryId
    const itemId =
      selectedItem?.itemId || request?.itemId || selectedItem?.fileId || request?.fileId

    if (!instanceId) {
      showToast({ message: 'No instance ID available to share', variant: 'error' })
      return false
    }

    try {
      if (shares.length > 0) {
        await Promise.all(shares.map(share => workflowsApiV6.shareFile(String(instanceId), {
          email: share.email,
          repositoryId: String(repositoryId || ''),
          itemId: String(itemId || ''),
          message,
          action: share.action,
        })))
      }
      showToast({ message: 'Request shared successfully', variant: 'success' })
      return true
    } catch (error) {
      console.error('Failed to share:', error)
      showToast({ message: 'Failed to share request', variant: 'error' })
      return false
    }
  }

  return (
    <div
      className={`flex w-full flex-col p-0 ${hideActions ? 'bg-grey-2 h-full p-4' : 'h-[calc(100vh-85px)]'}`}
    >
      <div className='sticky top-0 z-50 border-b border-[var(--gray-3)] bg-surface px-2'>
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
          ticketUserId={selectedItem?.userId || request?.userId || authUserStore.getState().session?.id || undefined}
          setRightView={setRightView}
          onApprove={handleVerifier}
          onBack={onBack || closeRequest}
          onManualCorrection={() => setIsEditing(!isEditing)}
          onNext={onNext}
          onOpenPlayground={handleOpenPlayground}
          onPrev={onPrev}
          onShare={handleShare}
        />
      </div>

      {/* Tab Content + Playground Drawer */}
      <div className='flex min-h-0 w-full flex-1 overflow-hidden'>
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out',
            isPlaygroundOpen ? 'w-full lg:w-[75%]' : 'w-full',
          )}
        >
          <AnimateFadeIn
            className='mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0'
            delay={0.6}
          >
            <Overview
              actions={headerActions}
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
              setFormModel={setFormModel}
              setRightView={setRightView}
              onOpenPlayground={handleOpenPlayground}
            />
          </AnimateFadeIn>
        </div>

        {isPlaygroundOpen && (
          <div className='animate-in slide-in-from-right flex h-full w-full min-w-[320px] shrink-0 flex-col overflow-hidden border-l border-[var(--gray-3)] bg-surface duration-300 ease-in-out lg:w-[25%]'>
            <ApiPlayground
              context={playgroundContext}
              onClose={() => setIsPlaygroundOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

Request.displayName = 'Request'
export default Request
