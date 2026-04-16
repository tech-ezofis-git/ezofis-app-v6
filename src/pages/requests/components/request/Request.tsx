import { useMemo, useState, useEffect } from 'react';
import requestStore from '../../stores/useRequestStore';

// import Footer from './components/Footer';
import Overview from './components/sections/overview/Overview';

// import Tabs from '@/components/base/tabs/Tabs';
// import Tab from '@/components/base/tabs/Tab';

import { useRequestDetail } from '../../hooks/useRequestDetails';

// import Attachments from './components/sections/attachment/Attachments';
// import Comments from './components/sections/comment/Comments';
// import History from './components/sections/history/History';

// Import your custom animation components
import {
  // AnimateSlideUp,
  AnimateFadeIn,
  // AnimateSlideLeft,
  // AnimateStagger,
} from '@/components/common/animations';
// import IconButton from '@/components/base/button/IconButton';
// import Icon from '@/components/base/icon/Icon';
import workflowApi from "../../../../api/workflow/workflow"
import Header from './components/Header'

const Request = ({
  onPrev,
  onNext,
  item,
  workflowId,
  onBack,
  hideActions
}: {
  onPrev?: () => void;
  onNext?: () => void,
  item?: any,
  workflowId?: number | string,
  onBack?: () => void,
  hideActions?: boolean
}) => {
  const {
    closeRequest,
    selectedItem: storeSelectedItem,
    selectedWorkflowId,
    activeTabValue,
    rawWorkflowData,
    workflowRefresh,
    requestListTab
  } = requestStore((state) => state);

  const selectedItem = item || storeSelectedItem;
  const resolvedWorkflowId = workflowId ? Number(workflowId) : selectedWorkflowId;

  const [activeTab, setActiveTab] = useState<string>(activeTabValue ? activeTabValue : 'Overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [rightView, setRightView] = useState<'analysis' | 'comments' | 'attachments' | 'forms'>('analysis');

  const actions = storeSelectedItem?._actions || [];
  const { data: request, isLoading } = useRequestDetail(
    resolvedWorkflowId,
    selectedItem?.processId,
    selectedItem?.transactionId
  );

  const agentDataList = request?._agentData || [];
  const hasAgentData = agentDataList.length > 0;

  const [formModel, setFormModel] = useState<any>({})

  console.log("=== REQUEST COMPONENT DEBUG LOGS ===");
  console.log("Prop item:", item);
  console.log("Store SelectedItem:", storeSelectedItem);
  console.log("Resolved SelectedItem:", selectedItem);
  console.log("Process ID:", selectedItem?.processId);
  console.log("Transaction ID:", selectedItem?.transactionId);
  console.log("Selected Workflow ID:", resolvedWorkflowId);
  console.log("UseRequestDetail Data:", request);
  console.log("Agent Data List:", agentDataList);

  useEffect(() => {
    if (hasAgentData && activeTab === 'Form') {
      setActiveTab('Overview');
      if (!selectedAgentId) setSelectedAgentId(agentDataList[0].id);
    }
    if (activeTabValue) {
      setActiveTab(activeTabValue);
    }
  }, [hasAgentData, activeTabValue]);

  useEffect(() => {
    if (hasAgentData && agentDataList.length > 0) {
      setSelectedAgentId(agentDataList[0].id);
    } else {
      setSelectedAgentId(null);
    }
  }, [request?._agentData, hasAgentData]);

  const currentAgentData = useMemo(() => {
    return agentDataList.find((a: any) => a.id === selectedAgentId) || {};
  }, [agentDataList, selectedAgentId]);

  console.log(currentAgentData, "currentAgentData")
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
        workflowId: rawWorkflowData?.id,
        transactionId: selectedItem?.transactionId,
        review: action === "Save" ? "" : action,
        formData: {
          formId: rawWorkflowData?.wFormId,
          formEntryId: selectedItem?.formData?.formEntryId,
          fields: Object.keys(formModel).length > 0 ? formModel : (selectedItem?.formData?.fields || {})
        },
      }
      console.log("Submit Payload:", payload, "formModel:", formModel)

      const response = await workflowApi?.createProcessTransaction(payload)
      console.log(response)
      workflowRefresh()
      closeRequest()

    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`flex flex-col p-0 w-full ${hideActions ? 'h-full p-4 bg-grey-2' : 'h-[calc(100vh-85px)]'}`}>
      {/* Combined Sticky Wrapper: 
        Keeps both Header and Tabs pinned to the top.
        Added z-20 and bg-white (or bg-surface) to ensure content scrolls behind it.
      */}
      <div className="sticky top-0 z-20 bg-white ">
        <Header
          requestNo={currentAgentData?.reqNo ? currentAgentData.reqNo : selectedItem?.requestNo}
          raisedAt={request?.createdAt}
          isLoading={isLoading}
          onPrev={onPrev}
          onNext={onNext}
          onBack={onBack || closeRequest}
          approveLoading={submitting}
          onApprove={handleVerifier}
          rightView={rightView}
          setRightView={setRightView}
          hideActions={hideActions}
          showApprove={requestListTab === 'Inbox'}
          attachmentCount={selectedItem?.attachmentCount || 0}
          commentsCount={selectedItem?.commentsCount || 0}
          actions={actions}
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

      <AnimateFadeIn delay={0.6} className=" h-full overflow-hidden">
        <Overview
          agentData={currentAgentData}
          rightView={rightView}
          setRightView={setRightView}
          workflowId={Number(resolvedWorkflowId)}
          processId={Number(selectedItem?.processId)}
          transactionId={Number(selectedItem?.transactionId)}
          repositoryId={Number(rawWorkflowData?.repositoryId)}
          formModel={formModel}
          setFormModel={setFormModel} />
      </AnimateFadeIn>



      {/* Sticky Footer */}

      {/* <div className="fixed bottom-0 right-0 z-50 w-full border-t border-gray-3 bg-white">
        <Footer onSubmit={handleVerifier} submitting={submitting} />
      </div> */}

    </div>
  );
};

Request.displayName = 'Request';
export default Request;