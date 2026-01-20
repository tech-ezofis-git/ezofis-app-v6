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

const Request = ({ onPrev, onNext }: { onPrev?: () => void; onNext?: () => void }) => {
  const {
    closeRequest,
    selectedItem,
    selectedWorkflowId,
    activeTabValue,
    rawWorkflowData,
    workflowRefresh
  } = requestStore((state) => state);

  const [activeTab, setActiveTab] = useState<string>(activeTabValue ? activeTabValue : 'Overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const { data: request, isLoading } = useRequestDetail(
    selectedWorkflowId,
    selectedItem?.processId,
    selectedItem?.transactionId
  );

  const agentDataList = request?._agentData || [];
  const hasAgentData = agentDataList.length > 0;

  console.log(selectedItem, "this is from the request")

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

  const handleVerifier = async () => {
    try {
      setSubmitting(true)
      console.log(rawWorkflowData)
      const payload = {
        workflowId: rawWorkflowData?.id,
        transactionId: selectedItem?.transactionId,
        review: selectedItem?.activityId == "tGLZHXsPrkiaMWWWm4hhQ" ? "Verified" : "Approved",
        formData: {
          formId: rawWorkflowData?.wFormId,
          formEntryId: selectedItem?.formData.formEntryId,
          fields: selectedItem?.formData?.fields
        },
      }

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
    <div className="flex flex-col h-[calc(100vh-85px)] p-0 w-full ">
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
          onBack={closeRequest}
          approveLoading={submitting}
          onApprove={handleVerifier}
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
        <Overview agentData={currentAgentData}

          workflowId={Number(selectedWorkflowId)}
          processId={Number(selectedItem?.processId)}
          transactionId={Number(selectedItem?.transactionId)}
          repositoryId={Number(rawWorkflowData?.repositoryId)} />
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