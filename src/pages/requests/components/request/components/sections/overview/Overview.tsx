import { useState, useEffect, useRef, useMemo } from 'react';
import {
  // ArrowLeft, 
  // CheckCircle, 
  // ChevronLeft, 
  // ChevronRight, 
  // Minus, 
  // Plus, 
  FileText,
  Layers,
  // PenTool, 
  // MessageSquare, 
  // Printer, 
  // Construction,
  AlertCircle,
  AlertTriangle,
  Brain,
  Store,
  ListFilter,
  CreditCard,
  Wallet,
  Edit3,
  Paperclip,
  MessageCircle,
  HistoryIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import Attachments from '../attachment/Attachments';
import History from "../history/History";
import Comments from "../comment/Comments";
import Forms from "../form/Form";
import { useAttachments } from '@/pages/requests/hooks/useAttachments';
import authUserStore from '@/stores/authUserStore';
import Icon from '@/components/base/icon/Icon';
import { useComments } from '@/pages/requests/hooks/useComments'
import cn from '@/utils/cn';

import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import fileApi from '@/api/file/file';
import BarLoader from '@/components/base/BarLoader';

// --- Components ---

const AnalysisCard = ({ icon: Icon, title, value, status, statusType = 'success' }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-[var(--gray-3)] flex flex-col gap-3 hover:shadow-sm transition-all">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[var(--gray-11)]">
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-bold">{title}</span>
      </div>
      <span className={cn(
        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
        statusType === 'success' ? "bg-[var(--green-1)] text-[var(--green-9)] border-[var(--green-3)]" :
          statusType === 'warning' ? "bg-[var(--orange-1)] text-[var(--orange-9)] border-[var(--orange-3)]" :
            "bg-[var(--gray-1)] text-[var(--gray-11)] border-[var(--gray-3)]"
      )}>
        {status}
      </span>
    </div>
    <div className="text-[13px] font-medium text-[var(--gray-13)]">
      {value || '---'}
    </div>
  </div>
);

const SmartCard = ({ icon: Icon, title, status, active = false, onClick }: any) => (
  <motion.div
    whileHover={{ y: -2 }}
    onClick={onClick}
    className={`p-4 rounded-2xl border cursor-pointer transition-all ${active
      ? `bg-white border-[var(--primary-9)]/20 shadow-lg shadow-[var(--primary-9)]/5 border-l-4 border-l-[var(--primary-9)]`
      : 'bg-white/40 border-[var(--gray-3)] hover:border-[var(--gray-11)] opacity-60'
      }`}
  >
    <div className="flex flex-col gap-1.5">
      <Icon className={`w-5 h-5 ${active ? 'text-[var(--primary-9)]' : 'text-[var(--gray-11)]'}`} />
      <span className="text-[13px] font-bold text-[var(--gray-13)]">{title}</span>
      <div className="flex items-center gap-1">
        {status.type === 'verified' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--green-9)]" />}
        <span className={`text-[9px] font-bold ${status.type === 'missing' ? 'text-[var(--primary-9)]' : 'text-[var(--gray-10)]'
          }`}>
          {status.count} {status.label}
        </span>
      </div>
    </div>
  </motion.div>
);

const DataCard = ({ icon: Icon, label, value, highlight = false, isEditing = false, onChange }: any) => (
  <div className="bg-white/50 p-4 rounded-xl border border-transparent flex items-center gap-4 hover:bg-white hover:border-[var(--gray-3)] transition-all cursor-pointer group shadow-sm">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${highlight ? 'bg-[var(--green-9)]/10 text-[var(--green-9)]' : 'bg-[var(--gray-2)] text-[var(--gray-11)] group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]'
      }`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] text-[var(--gray-11)] font-bold uppercase tracking-wider mb-0.5">{label}</p>
      {isEditing ? (
        <input
          type="text"
          value={value === 'Pending Analysis...' || value === 'N/A' ? '' : value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={`Enter ${label}...`}
          className="w-full bg-white border border-[var(--gray-3)] rounded-md px-2 py-1 text-[13px] font-bold text-[var(--gray-13)] focus:outline-none focus:border-[var(--primary-9)] focus:ring-1 focus:ring-[var(--primary-9)] transition-all"
        />
      ) : (
        <p className={`text-[13px] font-bold truncate ${highlight ? 'text-[var(--green-9)]' : 'text-[var(--gray-13)]'}`}>{value}</p>
      )}
    </div>
  </div>
);

// --- Main App ---

const Overview = (props: any) => {
  const {
    agentData,
    workflowId,
    processId,
    transactionId,
    repositoryId,
    selectedItem,
    formModel,
    setFormModel,
    isEditing = false,
    rightView,
    setRightView
  } = props;
  console.log('Overview isEditing:', isEditing);

  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  const [selectedFile, setSelectedFile] = useState<any>(null); // Use appropriate type

  // Fetch attachments to set default
  const { data: attachmentData } = useAttachments(workflowId, processId, true);

  const { session } = authUserStore.getState();
  const tenantId = session?.tenantId;
  const userId = session?.id;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [scale, setScale] = useState(1);
  const viewerRef = useRef<any>(null);

  // Local state for editable header data
  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header as any;
  const [headerData, setHeaderData] = useState<any>({});

  useEffect(() => {
    if (invoiceHeader) {
      setHeaderData(invoiceHeader);
    }
  }, [invoiceHeader]);

  const handleHeaderChange = (key: string, value: string) => {
    setHeaderData((prev: any) => ({ ...prev, [key]: value }));
  };

  const toolbarPluginInstance = useMemo(() => ({
    install: (pluginFunctions: any) => {
      viewerRef.current = pluginFunctions;
    },
    onZoom: (e: any) => {
      setScale(e.scale);
    }
  }), []);

  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData[0]);
    }
  }, [attachmentData]);

  // Fetch File Binary for Preview
  useEffect(() => {
    const fetchFile = async () => {
      const rId = Number(repositoryId);
      if (selectedFile?.id && !isNaN(rId) && rId > 0) {
        setIsViewerLoading(true);
        const tId = tenantId ? Number(tenantId) : 2;
        const uId = userId ? String(userId) : "2";
        const type = 2; // Original file

        try {
          const response = await fileApi.viewBinary(tId, uId, rId, selectedFile.id, type);

          if (response?.data) {
            const base64 = response.data.file || response.data;
            if (typeof base64 !== 'string') return;

            let mimeType = 'application/pdf';

            if (base64.startsWith('/9j/')) mimeType = 'image/jpeg';
            else if (base64.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
            else if (base64.startsWith('JVBERi0')) mimeType = 'application/pdf';

            const url = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
            setPreviewUrl(url);
            setFileType(mimeType);
          }
        } catch (error) {
          console.error("Error fetching file:", error);
        } finally {
          setIsViewerLoading(false);
        }
      }
    };

    fetchFile();
  }, [selectedFile, repositoryId, tenantId, userId, refreshCounter]);

  const { data: data1 } = useComments(workflowId, processId, true)
  const commentsData = (data1 || []) as any[]

  const lineItemMatching = agentData?.debug?.['Side-by-side Line Item matching'] || [];

  const SummarySkeleton = () => (
    <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 animate-pulse">
      {/* Status Card Skeleton */}
      <div className="bg-white p-6 rounded-2xl shadow-sm space-y-5 border border-[var(--gray-3)]/10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--gray-2)]" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-[var(--gray-2)] rounded" />
              <div className="h-5 w-40 bg-[var(--gray-2)] rounded" />
            </div>
          </div>
          <div className="w-20 h-7 bg-[var(--gray-2)] rounded-full" />
        </div>
        <div className="h-20 w-full bg-[var(--gray-1)] rounded-xl" />
      </div>

      {/* Data Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-4 rounded-xl border border-[var(--gray-3)]/10 space-y-3">
            <div className="h-3 w-16 bg-[var(--gray-2)] rounded" />
            <div className="h-5 w-28 bg-[var(--gray-2)] rounded" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-[var(--gray-3)]/10 overflow-hidden">
        <div className="p-4 bg-[var(--gray-2)] h-10 w-full" />
        <div className="p-4 space-y-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between items-center px-1">
              <div className="h-4 w-1/2 bg-[var(--gray-2)] rounded" />
              <div className="h-4 w-12 bg-[var(--gray-2)] rounded" />
              <div className="h-4 w-12 bg-[var(--gray-2)] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden font-sans">
      {/* Header */}

      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Section: Document Preview */}
        <section className="flex-1 min-h-0 border-r border-[var(--gray-3)] flex flex-col bg-white overflow-hidden">
          {selectedFile ? (
            <>
              {/* Viewer Area */}
              <div className="flex-1 relative bg-white overflow-hidden">
                {isViewerLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--gray-1)] z-10">
                    <BarLoader />
                    <p className="text-xs font-bold text-[var(--gray-10)] tracking-widest uppercase">Loading Preview...</p>
                  </div>
                ) : null}

                {previewUrl ? (
                  fileType === 'application/pdf' ? (
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                      <div className="h-full w-full overflow-hidden relative group">
                        <Viewer
                          fileUrl={previewUrl}
                          defaultScale={SpecialZoomLevel.PageWidth}
                          plugins={[toolbarPluginInstance]}
                        />

                        {/* Floating Zoom Controls at Bottom Center */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl border border-[var(--gray-3)] shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                          <button
                            onClick={() => viewerRef.current?.zoom(scale - 0.1)}
                            className="text-[var(--gray-11)] hover:text-[var(--primary-9)] transition-colors active:scale-90 p-1"
                            title="Zoom Out"
                          >
                            <Icon name="lucide:zoom-out" className="size-5" />
                          </button>
                          <div className="w-px h-4 bg-[var(--gray-3)]" />
                          <span className="text-[12px] font-bold text-[var(--gray-13)] min-w-[40px] text-center">
                            {Math.round(scale * 100)}%
                          </span>
                          <div className="w-px h-4 bg-[var(--gray-3)]" />
                          <button
                            onClick={() => viewerRef.current?.zoom(scale + 0.1)}
                            className="text-[var(--gray-11)] hover:text-[var(--primary-9)] transition-colors active:scale-90 p-1"
                            title="Zoom In"
                          >
                            <Icon name="lucide:zoom-in" className="size-5" />
                          </button>
                        </div>
                      </div>
                    </Worker>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center p-8">
                      <img
                        src={previewUrl}
                        alt="Document Preview"
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                      />
                    </div>
                  )
                ) : (
                  !isViewerLoading && (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                      <div className="mb-6 rounded-3xl bg-red-2 p-5 text-red-9 shadow-sm ring-1 ring-red-4">
                        <Icon className="size-12" name="tabler:file-off" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-13">Unable to display file</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-10">
                        We couldn't generate a preview for this document. Please try refreshing the page.
                      </p>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (



            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--gray-2)]">
                <Icon name="tabler:file-off" className="size-6 text-[var(--gray-8)]" />
              </div>
              <p className="text-13 font-medium text-[var(--gray-10)]">
                No document selected
              </p>
            </div>
          )}
        </section>

        {/* Right Section: Sidebar */}
        <section className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent bg-white border-l border-[var(--gray-3)]">
          {/* Sidebar Content */}
          <div className="flex flex-col min-h-0 bg-white">
            {(!agentData || Object.keys(agentData).length === 0) ? (
              <SummarySkeleton />
            ) : (
              <div className="flex flex-col">
                {/* Content (Analysis Grid & AI Insights) */}
                <div className="p-6 pb-2 space-y-6">
                  {/* Analysis Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <AnalysisCard
                      icon={Paperclip}
                      title="PO Matching"
                      value={headerData?.['PO Number'] ? `PO: ${headerData['PO Number']}` : 'No PO Found'}
                      status={headerData?.['PO Number'] ? "Matched" : "Not Matched"}
                      statusType={headerData?.['PO Number'] ? "success" : "warning"}
                    />
                    <AnalysisCard
                      icon={Layers}
                      title="Duplicate Detection"
                      value="No duplicates detected"
                      status="No Duplicate"
                      statusType="success"
                    />
                    <AnalysisCard
                      icon={ListFilter}
                      title="GL Account Matching"
                      value="GL: 5100-001"
                      status="Matched"
                      statusType="success"
                    />
                    <AnalysisCard
                      icon={Store}
                      title="Supplier Verification"
                      value={headerData?.['Supplier ID'] ? `ID: ${headerData['Supplier ID']}` : 'SUP-001'}
                      status="Verified"
                      statusType="success"
                    />
                  </div>

                  {/* AI Analysis Collapsible Section */}
                  {agentData?.reason && (
                    <div className="bg-[var(--primary-1)] rounded-2xl border border-[var(--primary-3)] overflow-hidden transition-all duration-300">
                      <div 
                        onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--primary-2)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Brain className="text-[var(--primary-9)] w-5 h-5" />
                          <span className="text-[13px] font-bold text-[var(--gray-13)]">AI Insights</span>
                          <span className="text-[10px] bg-[var(--gray-2)] text-[var(--gray-11)] px-2 py-0.5 rounded uppercase font-bold">Optional</span>
                        </div>
                        <Icon 
                          name="lucide:chevron-down" 
                          className={cn(
                            "w-4 h-4 text-[var(--gray-11)] transition-transform duration-300",
                            isInsightsExpanded ? "rotate-180" : ""
                          )} 
                        />
                      </div>
                      {isInsightsExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-5 pb-5 pt-1"
                        >
                          <p className="text-[13px] text-[var(--gray-12)] font-medium leading-relaxed">
                            {agentData.reason}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* Main Navigation Tabs */}
                <div className="px-6 pt-2 border-b border-[var(--gray-3)] bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-8">
                    {[
                      { id: 'summary', label: 'Extracted Data', icon: FileText },
                      { id: 'line_items', label: 'Line Items', icon: Layers },
                      { id: 'attachments', label: 'Attachments', icon: Paperclip },
                      { id: 'comments', label: 'Comments', icon: MessageCircle },
                      { id: 'history', label: 'History', icon: HistoryIcon }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center gap-2 pb-4 text-[13px] font-bold transition-all border-b-2 -mb-[2px]",
                          activeTab === tab.id
                            ? "text-[var(--primary-9)] border-[var(--primary-9)]"
                            : "text-[var(--gray-11)] border-transparent hover:text-[var(--gray-13)]"
                        )}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.id === 'attachments' && attachmentData.length > 0 && (
                          <span className="bg-[var(--gray-2)] text-[var(--gray-11)] px-1.5 py-0.5 rounded text-[10px]">
                            {attachmentData.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Area */}
                <div className="min-h-0">
                  {activeTab === 'summary' && (
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <DataCard
                          icon={Store}
                          label="Supplier"
                          value={headerData?.['Supplier Name'] || 'Pending Analysis...'}
                          isEditing={isEditing}
                          onChange={(val: string) => handleHeaderChange('Supplier Name', val)}
                        />
                        <DataCard
                          icon={ListFilter}
                          label="Invoice Number"
                          value={headerData?.['Invoice Number'] || selectedItem?.['kvcYuknkDumkTenjvrVLj'] || selectedItem?.documentNumber || selectedItem?.requestNo || 'N/A'}
                          isEditing={isEditing}
                          onChange={(val: string) => handleHeaderChange('Invoice Number', val)}
                        />
                        <DataCard
                          icon={CreditCard}
                          label="Currency"
                          value={headerData?.['Currency'] || 'Pending Analysis...'}
                          isEditing={isEditing}
                          onChange={(val: string) => handleHeaderChange('Currency', val)}
                        />
                        <DataCard
                          icon={Wallet}
                          label="Total Value"
                          value={headerData?.['Total Due'] || 'Pending Analysis...'}
                          highlight
                          isEditing={isEditing}
                          onChange={(val: string) => handleHeaderChange('Total Due', val)}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'line_items' && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-[13px] font-bold text-[var(--gray-13)]">Line Items ({lineItemMatching?.length || 0})</h3>
                      </div>
                      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[var(--gray-3)]/10">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[var(--gray-2)] border-b border-[var(--gray-3)] text-[var(--gray-10)]">
                            <tr>
                              <th className="px-5 py-4 font-bold uppercase tracking-widest text-[10px]">Description</th>
                              <th className="px-5 py-4 font-bold uppercase tracking-widest text-[10px] text-center">Qty</th>
                              <th className="px-5 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Rate</th>
                              <th className="px-5 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Total</th>
                              <th className="px-5 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Match</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--gray-3)]">
                            {lineItemMatching.map((item: any, index: number) => {
                              const isMatch = item['Line Score'] >= 90;
                              return (
                                <tr key={index} className="hover:bg-[var(--gray-1)] transition-colors cursor-pointer group">
                                  <td className="px-5 py-4 font-semibold text-[var(--gray-13)]">
                                    {item.Description?.['Invoice Value'] || '-'}
                                  </td>
                                  <td className="px-5 py-4 text-center font-medium">
                                    {item.Quantity?.['Invoice Value'] || '-'}
                                  </td>
                                  <td className="px-5 py-4 text-right font-medium">
                                    {item?.Price?.['Invoice Value'] || '-'}
                                  </td>
                                  <td className="px-5 py-4 font-bold text-right text-[var(--gray-13)]">
                                    {item.Amount?.['Invoice Value'] || '-'}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <span className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold border",
                                      isMatch ? 'border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]' : 'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
                                    )}>
                                      {isMatch ? "MATCH" : "DIFF"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {activeTab === "attachments" && (
                    <div className="p-6">
                      <Attachments
                        workflowId={workflowId}
                        processId={processId}
                        enabled={true}
                        onSelect={(file) => {
                          if (selectedFile?.id === file.id) {
                            setIsViewerLoading(true);
                            setTimeout(() => setIsViewerLoading(false), 500);
                          } else {
                            setSelectedFile(file);
                          }
                        }}
                      />
                    </div>
                  )}

                  {activeTab === "comments" && (
                    <div className="p-6">
                      <Comments
                        workflowId={workflowId}
                        processId={processId}
                        transactionId={transactionId}
                        enabled={true}
                        attachments={selectedItem?.attachments || []}
                        repositoryId={repositoryId}
                      />
                    </div>
                  )}

                  {activeTab === "history" && (
                    <div className="p-6">
                      <History
                        workflowId={workflowId}
                        processId={processId}
                        enabled={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Overview;
