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
    'analysis' | 'comments' | 'attachments'
  >('analysis')

  const { data: request, isLoading } = useRequestDetail(
    resolvedWorkflowId,
    selectedItem?.processId,
    selectedItem?.transactionId,
  )

  const agentDataList = request?._agentData || []
  const hasAgentData = agentDataList.length > 0

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

  const handleVerifier = async () => {
    try {
      setSubmitting(true)
      console.log(rawWorkflowData)
      const payload = {
        formData: {
          fields: selectedItem?.formData?.fields,
          formEntryId: selectedItem?.formData.formEntryId,
          formId: rawWorkflowData?.wFormId,
        },
        review:
          selectedItem?.activityId == 'tGLZHXsPrkiaMWWWm4hhQ'
            ? 'Verified'
            : 'Approved',
        transactionId: selectedItem?.transactionId,
        workflowId: rawWorkflowData?.id,
      }

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

  return (
    <div
      className={`flex w-full flex-col p-0 ${hideActions ? 'bg-grey-2 h-full p-4' : 'h-[calc(100vh-85px)]'}`}
    >
      {/* Combined Sticky Wrapper: 
        Keeps both Header and Tabs pinned to the top.
        Added z-20 and bg-white (or bg-surface) to ensure content scrolls behind it.
      */}
      <div className='sticky top-0 z-20 bg-white'>
        <Header
          approveLoading={submitting}
          attachmentCount={selectedItem?.attachmentCount || 0}
          commentsCount={selectedItem?.commentsCount || 0}
          hideActions={hideActions}
          isLoading={isLoading}
          raisedAt={request?.createdAt}
          rightView={rightView}
          showApprove={requestListTab === 'Inbox'}
          requestNo={
            currentAgentData?.reqNo
              ? currentAgentData.reqNo
              : selectedItem?.requestNo
          }
          setRightView={setRightView}
          onApprove={handleVerifier}
          onBack={onBack || closeRequest}
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

      <AnimateFadeIn className='h-full overflow-hidden' delay={0.6}>
        <Overview
          agentData={currentAgentData}
          processId={Number(selectedItem?.processId)}
          repositoryId={Number(rawWorkflowData?.repositoryId)}
          rightView={rightView}
          transactionId={Number(selectedItem?.transactionId)}
          workflowId={Number(resolvedWorkflowId)}
          setRightView={setRightView}
        />
      </AnimateFadeIn>

      {/* Sticky Footer */}

      {/* <div className="fixed bottom-0 right-0 z-50 w-full border-t border-gray-3 bg-white">
        <Footer onSubmit={handleVerifier} submitting={submitting} />
      </div> */}
    </div>
  )
}

Request.displayName = 'Request'
export default Request
