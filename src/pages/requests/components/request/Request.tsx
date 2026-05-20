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
// import Footer from './components/Footer';
import Overview from './components/sections/overview/Overview'

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

  useEffect(() => {
    setFormModel({})
  }, [selectedItem?.transactionId])

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
              ? formModel
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
  const currency = invoiceHeader?.['Currency'] || selectedItem?.currency
  const statusBadge =
    currentAgentData?.decision === 'APPROVED'
      ? 'Verified'
      : currentAgentData?.decision === 'REJECTED'
        ? 'Rejected'
        : 'Pending Review'


  return (
    <div
      className={`flex w-full flex-col p-0 ${hideActions ? 'bg-grey-2 h-full p-4' : 'h-[calc(100vh-85px)]'}`}
    >
      <div className='sticky top-0 z-20 border-b border-[var(--gray-3)] bg-white px-2'>
        <Header
          actions={actions}
          agentData={currentAgentData}
          approveLoading={submitting}
          attachmentCount={selectedItem?.attachmentCount || 0}
          commentsCount={selectedItem?.commentsCount || 0}
          currency={currency}
          hideActions={hideActions}
          isEditing={isEditing}
          isLoading={isLoading}
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
          formModel={formModel}
          processId={Number(selectedItem?.processId)}
          repositoryId={Number(rawWorkflowData?.repositoryId)}
          rightView={rightView}
          selectedItem={selectedItem}
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
