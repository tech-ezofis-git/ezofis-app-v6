import { useEffect, useMemo, useState } from 'react'
// Import your custom animation components
import {
  // AnimateSlideUp,
  AnimateFadeIn,
  // AnimateSlideLeft,
  // AnimateStagger,
} from '@/components/common/animations'
// import IconButton from '@/components/base/button/IconButton';
// import Icon from '@/components/base/icon/Icon';
import workflowApi from '../../../../api/workflow/workflow'
// import Tabs from '@/components/base/tabs/Tabs';
// import Tab from '@/components/base/tabs/Tab';
import { useRequestDetail } from '../../hooks/useRequestDetails'
// import Attachments from './components/sections/attachment/Attachments';
// import Comments from './components/sections/comment/Comments';
// import History from './components/sections/history/History';
import requestStore from '../../stores/useRequestStore'
import Header from './components/Header'
import Overview from './components/sections/overview/Overview'

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

export const buildFieldMetaMap = (
  workflow: any,
): Map<string, { label: string; type: string }> => {
  const metaMap = new Map<string, { label: string; type: string }>()
  if (!workflow?.formJson) return metaMap

  let form = workflow.formJson
  if (typeof form === 'string' && form !== '') {
    try {
      form = JSON.parse(form)
    } catch {
      return metaMap
    }
  }

  const addControl = (c: any) => {
    if (c) {
      const key = c.jsonId || c.id || c.name
      const label = c.label || c.name || key
      const type = c.type || c.control || c.controlType || ''
      if (key) {
        metaMap.set(key, { label, type })
      }
    }
  }

  // 1. Check controllist if present
  const controllist = form.controllist
  if (Array.isArray(controllist)) {
    controllist.forEach(addControl)
  }

  // 2. Also check panels / secondaryPanels / fields
  const panels = Array.isArray(form?.panels) ? form.panels : []
  const secondaryPanels = Array.isArray(form?.secondaryPanels)
    ? form.secondaryPanels
    : []
  const formJsonList = form?.formJson || {}
  const innerPanels = Array.isArray(formJsonList?.panels)
    ? formJsonList.panels
    : []

  const allPanels = [...panels, ...secondaryPanels, ...innerPanels]

  allPanels.forEach((panel: any) => {
    if (!panel) return
    const controls =
      panel.controlList || panel.controllist || panel.fields || []
    if (Array.isArray(controls)) {
      controls.forEach(addControl)
    }
  })

  return metaMap
}

export const buildFieldLabelMap = (workflow: any): Map<string, string> => {
  const labelMap = new Map<string, string>()
  const metaMap = buildFieldMetaMap(workflow)
  metaMap.forEach((val, key) => {
    labelMap.set(key, val.label)
  })
  return labelMap
}

const mapFormModelToPayloadFields = (formModel: any, workflow: any) => {
  const fieldsPayload: any = {}
  const labelMap = buildFieldLabelMap(workflow)

  const inverseMap = new Map<string, string>()
  labelMap.forEach((label, jsonId) => {
    inverseMap.set(label, jsonId)
  })

  Object.keys(formModel).forEach((key) => {
    const val = formModel[key]
    fieldsPayload[key] = val
    const jsonId = inverseMap.get(key)
    if (jsonId) {
      fieldsPayload[jsonId] = val
    }
  })

  return fieldsPayload
}

const Request = ({
  hideActions,
  item,
  workflowId,
  onBack,
  onNext,
  onPrev,
}: {
  hideActions?: boolean
  item?: any
  workflowId?: number | string
  onBack?: () => void
  onNext?: () => void
  onPrev?: () => void
}) => {
  const {
    activeTabValue,
    closeRequest,
    rawWorkflowData,
    requestListTab,
    selectedItem: storeSelectedItem,
    selectedWorkflow,
    selectedWorkflowId,
    workflowRefresh,
  } = requestStore((state) => state)

  const selectedItem = item || storeSelectedItem
  const resolvedWorkflowId = workflowId
    ? Number(workflowId)
    : selectedWorkflowId

  const [activeTab, setActiveTab] = useState<string>(
    activeTabValue ? activeTabValue : 'Overview',
  )
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [rightView, setRightView] = useState<
    'analysis' | 'comments' | 'attachments' | 'forms'
  >('analysis')
  const [isEditing, setIsEditing] = useState<boolean>(false)

  const actions = storeSelectedItem?._actions || []
  const { data: request, isLoading } = useRequestDetail(
    resolvedWorkflowId,
    selectedItem?.processId,
    selectedItem?.transactionId,
  )

  const agentDataList = request?._agentData || []
  const hasAgentData = agentDataList.length > 0

  const [formModel, setFormModel] = useState<any>({})

  const allowedLabels = useMemo(() => {
    if (!selectedItem) return new Set<string>()
    const metaMap = buildFieldMetaMap(selectedWorkflow)
    const fieldsSource = selectedItem.formData?.fields || {}
    const labels = new Set<string>()
    Object.keys(fieldsSource).forEach((key) => {
      const meta = metaMap.get(key)
      const fieldType = String(meta?.type || '').toUpperCase()
      const isTable = fieldType === 'TABLE' || fieldType === 'DYNAMIC_TABLE'
      const isFileUpload =
        fieldType === 'FILE_UPLOAD' || fieldType === 'FILEUPLOAD'

      if (!isTable && !isFileUpload) {
        const label = meta?.label || key
        labels.add(label)
      }
    })
    return labels
  }, [selectedItem, selectedWorkflow])

  useEffect(() => {
    if (selectedItem) {
      const metaMap = buildFieldMetaMap(selectedWorkflow)
      const cleanFields: any = {}
      const fieldsSource = selectedItem.formData?.fields || {}

      Object.keys(fieldsSource).forEach((key) => {
        const val = fieldsSource[key]
        const meta = metaMap.get(key)
        const label = meta?.label || key
        cleanFields[label] = val
      })
      setFormModel(cleanFields)
    } else {
      setFormModel({})
    }
  }, [selectedItem?.transactionId, selectedWorkflow])

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

  console.log(currentAgentData, 'currentAgentData')
  // const handleActivetab = (tabValue: string) => {
  //   if (tabValue === 'close') {
  //     setActiveTab("");
  //     closeRequest();
  //     return;
  //   }
  //   setActiveTab(tabValue);
  // };

  const handleVerifier = async (action: string) => {
    try {
      setSubmitting(true)
      console.log(rawWorkflowData)
      const payload = {
        formData: {
          fields:
            Object.keys(formModel).length > 0
              ? mapFormModelToPayloadFields(formModel, selectedWorkflow)
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

  const invoiceHeader = currentAgentData?.['Extracted Invoice JSON']
    ?.invoice_header as any
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
        f &&
        f.Field &&
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

  const hasValidPO =
    poVal &&
    poVal !== '-' &&
    poVal.toUpperCase() !== 'N/A' &&
    poVal.trim() !== ''
  const matchingStatus = hasValidPO ? 'Matched' : 'Not Matched'
  const currency = invoiceHeader?.['Currency'] || selectedItem?.currency

  const rawStatus =
    currentAgentData?.decision ||
    selectedItem?.decision ||
    selectedItem?.status ||
    selectedItem?.stage ||
    'Pending Review'

  const normalizedStatus = String(rawStatus).toUpperCase()

  const statusBadge =
    normalizedStatus === 'APPROVED' ||
    normalizedStatus === 'COMPLETED' ||
    normalizedStatus === 'VERIFIER' ||
    normalizedStatus === 'MATCHED' ||
    normalizedStatus === 'VERIFIED'
      ? matchingStatus
      : normalizedStatus === 'REJECTED'
        ? 'Rejected'
        : 'Pending Review'

  return (
    <div
      className={`flex w-full flex-col p-0 ${hideActions ? 'bg-grey-2 h-full p-4' : 'h-[calc(100vh-85px)]'}`}
    >
      <div className='sticky top-0 z-20 border-b border-[var(--gray-3)] bg-surface px-2'>
        <Header
          actions={actions}
          agentData={currentAgentData}
          approveLoading={submitting}
          attachmentCount={selectedItem?.attachmentCount || 0}
          commentsCount={selectedItem?.commentsCount || 0}
          currency={currency}
          enableAIInsights={requestListTab !== 'Processed'}
          hideActions={hideActions}
          isEditing={isEditing}
          isLoading={isLoading}
          poNumber={poVal}
          poValue={poValue}
          raisedAt={request?.createdAt}
          rightView={rightView}
          showApprove={requestListTab === 'Inbox'}
          status={statusBadge}
          totalAmount={totalAmount}
          requestNo={
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

        {/* <div className="border-b border-gray-3 bg-surface">
          <Tabs color='primary' value={activeTab} onChange={(val) => handleActivetab(val as string)}>
            <Tab label={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivetab("close");
                }}
                className="inline-flex items-center"
              >
                <IconButton aria-label="Back" variant='ghost' color='gray'>
                  <Icon name="tabler:arrow-left" className="size-4 text-gray-10" />
                </IconButton>
              </button>
            } value="close" />
            <Tab label="Overview" value="Overview" />
            <Tab label={`Attachment `} value="Attachments" />
            <Tab label={`Comment`} value="Comments" />
            <Tab label="History" value="History" />
          </Tabs>
        </div> */}
      </div>

      {/* Tab Content */}

      <AnimateFadeIn
        className='mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0'
        delay={0.6}
      >
        <Overview
          agentData={currentAgentData}
          allowedLabels={allowedLabels}
          formModel={formModel}
          processId={Number(selectedItem?.processId)}
          repositoryId={Number(rawWorkflowData?.repositoryId)}
          rightView={rightView}
          selectedItem={selectedItem}
          selectedWorkflow={selectedWorkflow}
          transactionId={Number(selectedItem?.transactionId)}
          workflowId={Number(resolvedWorkflowId)}
          setFormModel={setFormModel}
          setRightView={setRightView}
        />
      </AnimateFadeIn>
    </div>
  )
}

Request.displayName = 'Request'
export default Request
