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
  const [isEditing, setIsEditing] = useState<boolean>(false);

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

  const invoiceHeader = currentAgentData?.['Extracted Invoice JSON']?.invoice_header as any;
  const totalAmount = invoiceHeader?.['Invoice Amount'] ||
    invoiceHeader?.['Total Due'] ||
    invoiceHeader?.['Total'] ||
    invoiceHeader?.['invoice_amount'] ||
    invoiceHeader?.['total_amount'] ||
    selectedItem?.totalAmount;
  // Robust check for PO Value
  const poValueFromMatching = (() => {
    const fieldMatching = currentAgentData?.debug?.['Side-by-side Field Matching'] || [];
    const totalField = fieldMatching.find((f: any) =>
      f && f.Field && (
        f.Field.toLowerCase().includes('total') ||
        f.Field.toLowerCase().includes('amount')
      )
    );
    return totalField ? totalField['PO Value'] : undefined;
  })();

  const poValue = currentAgentData?.po_matching?.total ||
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
    '0.00';
  const currency = invoiceHeader?.['Currency'] || selectedItem?.currency;
  const statusBadge = currentAgentData?.decision === 'APPROVED' ? 'Verified' : currentAgentData?.decision === 'REJECTED' ? 'Rejected' : 'Pending Review';

  const findPONumberInObject = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null;

    const extractStringValue = (val: any): string | null => {
      if (val == null) return null;
      if (typeof val === 'object') {
        const inner = val['Invoice Value'] ?? val.value ?? val['PO Value'] ?? val.val ?? val.text;
        if (inner && typeof inner !== 'object') {
          const str = String(inner).trim();
          return (str !== '' && str !== '-' && str.toUpperCase() !== 'N/A') ? str : null;
        }
        for (const k of Object.keys(val)) {
          if (val[k] && typeof val[k] !== 'object') {
            const str = String(val[k]).trim();
            if (str !== '' && str !== '-' && str.toUpperCase() !== 'N/A') {
              return str;
            }
          }
        }
        return null;
      }
      const str = String(val).trim();
      return (str !== '' && str !== '-' && str.toUpperCase() !== 'N/A') ? str : null;
    };

    // 1. Direct exact matches first
    const exactKeys = [
      'PO Number', 'po_number', 'poNumber', 'PO #', 'PO No', 'PO No.',
      'Purchase Order', 'Purchase Order Number', 'purchase_order_number', 'purchaseOrderNumber',
      'RXwLGHILLrreMmRqlk9mj'
    ];
    for (const key of exactKeys) {
      const extracted = extractStringValue(obj[key]);
      if (extracted && extracted !== '-' && extracted !== '') {
        return extracted;
      }
    }

    // 2. Case-insensitive strict matching
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lowerKey === 'ponumber' || lowerKey === 'pono' || lowerKey === 'ponum' || lowerKey === 'purchaseordernumber' || lowerKey === 'purchaseorder' || lowerKey === 'rxwlghillrremmrqlk9mj') {
        const extracted = extractStringValue(obj[key]);
        if (extracted && extracted !== '-' && extracted !== '') {
          return extracted;
        }
      }
    }

    // 3. Extremely strict substring/contains matching (to avoid matching positions/postal codes/port/etc)
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      const isFalsePositive =
        lowerKey.includes('position') ||
        lowerKey.includes('postal') ||
        lowerKey.includes('postcode') ||
        lowerKey.includes('port') ||
        lowerKey.includes('sponsor') ||
        lowerKey.includes('component') ||
        lowerKey.includes('policy') ||
        lowerKey.includes('process');

      if (isFalsePositive) continue;

      const isStrictPOKey =
        lowerKey === 'po' ||
        lowerKey === 'purchase order' ||
        lowerKey.startsWith('po ') ||
        lowerKey.startsWith('po_') ||
        lowerKey.startsWith('po-') ||
        lowerKey.includes('po number') ||
        lowerKey.includes('po ref') ||
        lowerKey.includes('purchase order');

      if (isStrictPOKey) {
        // Exclude po value or amount keys to avoid wrong match
        if (!lowerKey.includes('value') && !lowerKey.includes('amount') && !lowerKey.includes('total') && !lowerKey.includes('date') && !lowerKey.includes('price')) {
          const extracted = extractStringValue(obj[key]);
          if (extracted && extracted !== '-' && extracted !== '') {
            return extracted;
          }
        }
      }
    }

    return null;
  };

  const poNumber = (() => {
    // 1. Check formModel first (highest priority: holds corrected and active tab state values)
    const fromForm = findPONumberInObject(formModel);
    if (fromForm) return fromForm;

    // 2. Check Extracted Invoice JSON header
    const fromAgentHeader = findPONumberInObject(currentAgentData?.['Extracted Invoice JSON']?.invoice_header);
    if (fromAgentHeader) return fromAgentHeader;

    // 3. Check PO matching structure
    const fromPOMatching = findPONumberInObject(currentAgentData?.po_matching);
    if (fromPOMatching) return fromPOMatching;

    // 4. Check general currentAgentData
    const fromAgent = findPONumberInObject(currentAgentData);
    if (fromAgent) return fromAgent;

    // 5. Check selectedItem and request fields
    const fromSelected = findPONumberInObject(selectedItem) ||
      findPONumberInObject(selectedItem?.formData?.fields);
    if (fromSelected) return fromSelected;

    const fromRequest = findPONumberInObject(request) ||
      findPONumberInObject(request?.formData?.fields);
    if (fromRequest) return fromRequest;

    return 'N/A';
  })();

  return (
    <div className={`flex flex-col p-0 w-full ${hideActions ? 'h-full p-4 bg-grey-2' : 'h-[calc(100vh-85px)]'}`}>
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--gray-3)] px-2">
        <Header
          requestNo={currentAgentData?.['kvcYuknkDumkTenjvrVLj'] || selectedItem?.reqNo || selectedItem?.['kvcYuknkDumkTenjvrVLj'] || selectedItem?.invoiceNumber || selectedItem?.requestNo || 'REQ - ...'}
          totalAmount={totalAmount}
          poValue={poValue}
          currency={currency}
          status={statusBadge}
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
          isEditing={isEditing}
          onManualCorrection={() => setIsEditing(!isEditing)}
          agentData={currentAgentData}
          poNumber={poNumber}
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

      <AnimateFadeIn delay={0.6} className="flex-1 min-h-0 flex flex-col overflow-hidden mt-0 px-0 pb-0">
        <Overview
          agentData={currentAgentData}
          rightView={rightView}
          setRightView={setRightView}
          workflowId={Number(resolvedWorkflowId)}
          processId={Number(selectedItem?.processId)}
          transactionId={Number(selectedItem?.transactionId)}
          repositoryId={Number(rawWorkflowData?.repositoryId)}
          selectedItem={selectedItem}
          formModel={formModel}
          setFormModel={setFormModel} />
      </AnimateFadeIn>



    </div>
  );
};

Request.displayName = 'Request';
export default Request;