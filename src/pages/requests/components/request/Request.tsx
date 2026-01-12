import { useMemo, useState, useEffect } from 'react';
import requestStore from '../../stores/useRequestStore';

import Footer from './components/Footer';
// import Header from './components/Header';
import Overview from './components/sections/overview/Overview';
// import Form from './components/sections/Sections';

import Tabs from '@/components/base/tabs/Tabs';
import Tab from '@/components/base/tabs/Tab';

import { useRequestDetail } from '../../hooks/useRequestDetails';

import Attachments from './components/sections/attachment/Attachments';
import Comments from './components/sections/comment/Comments';
import History from './components/sections/history/History';

// Import your custom animation components
import {
  AnimateSlideUp,
  AnimateFadeIn,
  // AnimateSlideRight,
  AnimateSlideLeft,
  AnimateStagger,
} from '@/components/common/animations';
import IconButton from '@/components/base/button/IconButton';
import Icon from '@/components/base/icon/Icon';
import workflowApi from "../../../../api/workflow/workflow"
import Header from './components/Header'
const Request = ({ onPrev, onNext }: { onPrev?: () => void; onNext?: () => void }) => {
  const {
    // isMaximized,
    // isRequestOpen,
    closeRequest,
    selectedItem,
    selectedWorkflowId,
    activeTabValue,
    rawWorkflowData,
    workflowRefresh
    // selectedWorkflow,
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

  console.log(request, "this is from the request")
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

  const handleActivetab = (tabValue: string) => {
    if (tabValue === 'close') {
      closeRequest();
      return;
    }
    setActiveTab(tabValue);
  };


  const handleVerifier = async () => {
    try {
      setSubmitting(true)

      console.log(rawWorkflowData)
      selectedItem?.processId,
        selectedItem?.transactionId
      console.log(selectedItem)
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

    } finally {
      setSubmitting(false)
    }

  }
  return (
    <div className="flex flex-col p-0 w-full">
      <Header
        requestNo={currentAgentData?.reqNo}
        raisedAt={request?.createdAt}
        isLoading={isLoading}
        onPrev={onPrev}
        onNext={onNext}

      />
      {/* Sticky Tabs */}
      <div className="border-b border-gray-3  bg-surface sticky top-0 z-10">
        <Tabs color='primary' value={activeTab} onChange={(val) => handleActivetab(val as string)}>
          <Tab label={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // ✅ prevents switching tabs if your library triggers it
                handleActivetab("close");
              }}
              className="inline-flex items-center"
            >
              <IconButton aria-label="Back" variant='ghost' color='gray'>
                <Icon name="tabler:arrow-left" className="size-4 text-gray-10" />
              </IconButton>
            </button>
          } value="close" />
          {<Tab label="Overview" value="Overview" />}
          {/* <Tab label="Form" value="Form" /> */}
          <Tab label={`Attachment `} value="Attachments" />
          <Tab label={`Comment`} value="Comments" />
          <Tab label="History" value="History" />
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex h-[300px] w-full items-center justify-center">
          <div className="flex items-center gap-3">
            <div
              className="h-8 text-primary-9 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-transparent"
              aria-label="Loading"
              role="status"
            />
            <span className="text-gray-500">Setting up the Request...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Sub-tabs - Sticky if present */}
          {/* <AnimateSlideUp delay={0.5}>
            {activeTab === 'Overview' && hasAgentData && agentDataList.length > 1 && (
              <div className="px-6 pt-2 bg-gray-50 border-b sticky top-[53px] z-10">
                <Tabs
                  value={selectedAgentId}
                  onChange={(val) => setSelectedAgentId(val as string)}
                >
                  {agentDataList.map((agent: any) => (
                    <Tab key={agent.id} value={agent.id} label={agent.stage} />
                  ))}
                </Tabs>
              </div>
            )}
          </AnimateSlideUp> */}

          {/* Tab Content */}
          <AnimateStagger>
            {activeTab === 'Overview' && (
              <AnimateFadeIn delay={0.6}>
                <Overview agentData={currentAgentData} />
              </AnimateFadeIn>
            )}

            {/* {activeTab === 'Form' && (
              <AnimateSlideRight delay={0.7}>
                <Form />
              </AnimateSlideRight>
            )} */}

            {activeTab === 'Attachments' && (
              <AnimateSlideUp delay={0.8}>
                <Attachments
                  enabled={activeTab === 'Attachments'}
                  workflowId={Number(selectedWorkflowId)}
                  processId={Number(selectedItem?.processId)}
                  transactionId={Number(selectedItem?.transactionId)}
                  repositoryId={Number(rawWorkflowData?.repositoryId)}

                />
              </AnimateSlideUp>
            )}

            {activeTab === 'Comments' && (
              <AnimateSlideLeft delay={0.9}>
                <Comments
                  enabled={activeTab === 'Comments'}
                  workflowId={Number(selectedWorkflowId)}
                  processId={Number(selectedItem?.processId)}
                  transactionId={Number(selectedItem?.transactionId)}
                />
              </AnimateSlideLeft>
            )}

            {activeTab === 'History' && (
              <AnimateFadeIn delay={1}>
                <History
                  enabled={activeTab === 'History'}
                  workflowId={Number(selectedWorkflowId)}
                  processId={Number(selectedItem?.processId)}


                />
              </AnimateFadeIn>
            )}
          </AnimateStagger>
        </>
      )}

      {/* Sticky Footer */}
      {activeTab === 'Overview' && hasAgentData && <Footer onSubmit={handleVerifier} submitting={submitting} />}
    </div>
  );
};

Request.displayName = 'Request';
export default Request;