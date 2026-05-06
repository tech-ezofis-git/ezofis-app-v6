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

import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import fileApi from '@/api/file/file';
import BarLoader from '@/components/base/BarLoader';

// --- Components ---

const SmartCard = ({ icon: Icon, title, status, active = false, onClick }: any) => (
  <motion.div 
    whileHover={{ y: -2 }}
    onClick={onClick}
    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
      active 
        ? `bg-white border-[var(--primary-9)]/20 shadow-lg shadow-[var(--primary-9)]/5 border-l-4 border-l-[var(--primary-9)]` 
        : 'bg-white/40 border-[var(--gray-3)] hover:border-[var(--gray-11)] opacity-60'
    }`}
  >
    <div className="flex flex-col gap-1.5">
      <Icon className={`w-5 h-5 ${active ? 'text-[var(--primary-9)]' : 'text-[var(--gray-11)]'}`} />
      <span className="text-[13px] font-bold text-[var(--gray-13)]">{title}</span>
      <div className="flex items-center gap-1">
        {status.type === 'verified' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--green-9)]" />}
        <span className={`text-[9px] font-bold ${
          status.type === 'missing' ? 'text-[var(--primary-9)]' : 'text-[var(--gray-10)]'
        }`}>
          {status.count} {status.label}
        </span>
      </div>
    </div>
  </motion.div>
);

const DataCard = ({ icon: Icon, label, value, highlight = false }: any) => (
  <div className="bg-white p-4 rounded-xl border border-[var(--gray-3)] flex items-center gap-4 hover:border-[var(--primary-9)] transition-colors cursor-pointer group shadow-sm">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
      highlight ? 'bg-[var(--green-9)]/10' : 'bg-[var(--gray-2)] group-hover:bg-[var(--primary-3)]'
    }`}>
      <Icon className={`w-5 h-5 ${highlight ? 'text-[var(--green-9)]' : 'text-[var(--gray-11)] group-hover:text-[var(--primary-9)]'}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[12px] text-[var(--gray-13)]">{label}</p>
      <p className={`text-sm font-bold truncate ${highlight ? 'text-[var(--green-9)]' : 'text-[var(--gray-13)]'}`}>{value}</p>
    </div>
  </div>
);

// --- Main App ---

const Overview = ({
  agentData,
  workflowId,
  processId,
  transactionId,
  repositoryId,
  selectedItem,
  formModel,
  setFormModel
}: any) => {
  
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

  const data = agentData || {};
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header as any;
  const lineItemMatching = data.debug?.['Side-by-side Line Item matching'] || [];

  const formatAmount = (val: any) => {
    if (val === undefined || val === null || val === '') return '-';
    const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, "")) : val;
    if (isNaN(num)) return val;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
    <div className="h-full w-full flex flex-col overflow-hidden font-sans">
      {/* Header */}
      

      <main className="flex-1 flex overflow-hidden">
        {/* Left Section: Document Preview */}
        <section className="w-[60%] border-r border-[var(--gray-3)] flex flex-col bg-white overflow-hidden">
          {selectedFile ? (
            <>
              {/* Document Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gray-2)] bg-white shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 2xl:w-11 2xl:h-11 rounded-xl bg-[var(--indigo-2)] flex items-center justify-center text-[var(--indigo-9)] shrink-0">
                    <Icon name="lucide:file-text" className="w-5 h-5 2xl:w-6 2xl:h-6" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-[14px] 2xl:text-[15px] font-bold text-[var(--gray-13)] leading-none mb-1">Document Preview</h3>
                    <p className="text-[11px] 2xl:text-[12px] text-[var(--gray-10)] font-medium truncate">
                      {selectedFile?.name || 'Loading document...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 bg-[var(--gray-2)] px-3 py-1.5 rounded-lg border border-[var(--gray-3)]">
                    <button 
                      onClick={() => viewerRef.current?.zoom(scale - 0.1)}
                      className="text-[var(--gray-11)] hover:text-[var(--primary-9)] transition-colors active:scale-90"
                      title="Zoom Out"
                    >
                      <Icon name="lucide:zoom-out" className="w-4 h-4 2xl:w-5 2xl:h-5" />
                    </button>
                    <span className="text-[11px] 2xl:text-[12px] font-bold text-[var(--gray-13)] min-w-[36px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button 
                      onClick={() => viewerRef.current?.zoom(scale + 0.1)}
                      className="text-[var(--gray-11)] hover:text-[var(--primary-9)] transition-colors active:scale-90"
                      title="Zoom In"
                    >
                      <Icon name="lucide:zoom-in" className="w-4 h-4 2xl:w-5 2xl:h-5" />
                    </button>
                  </div>
                  
                  <div className="w-px h-6 bg-[var(--gray-3)]" />
                  
                  <button 
                    onClick={() => {
                      setPreviewUrl(null);
                      setRefreshCounter(prev => prev + 1);
                    }}
                    className="w-9 h-9 2xl:w-10 2xl:h-10 rounded-lg flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--primary-9)] hover:bg-[var(--primary-2)] transition-all active:rotate-180 duration-500"
                    title="Refresh Preview"
                  >
                    <Icon name="lucide:refresh-cw" className="w-4 h-4 2xl:w-5 2xl:h-5" />
                  </button>
                </div>
              </div>

              {/* Viewer Area */}
              <div className="flex-1 relative bg-[var(--gray-1)] overflow-hidden">
                {isViewerLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--gray-1)] z-10">
                        <BarLoader />
                        <p className="text-xs font-bold text-[var(--gray-10)] tracking-widest uppercase">Loading Preview...</p>
                    </div>
                ) : null}

                {previewUrl ? (
                    fileType === 'application/pdf' ? (
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                            <div className="h-full w-full overflow-hidden relative">
                                <Viewer
                                    fileUrl={previewUrl}
                                    defaultScale={SpecialZoomLevel.PageFit}
                                    plugins={[toolbarPluginInstance]}
                                />
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
        <section className="w-[50%] flex flex-col bg-[var(--gray-1)] overflow-hidden">
          {/* Smart Cards Tabs */}
          <div className="p-4 grid grid-cols-5 gap-3 shrink-0">
            <SmartCard 
              icon={FileText} 
              title="Summary" 
              status={{ type: 'verified', label: 'Verified' }} 
              active={activeTab === 'summary'} 
              onClick={() => setActiveTab('summary')}
            />
            <SmartCard 
              icon={Layers} 
              title="Forms" 
              status={{ type: 'missing', label: '3 Missing' }} 
              active={activeTab === 'forms'} 
              onClick={() => setActiveTab('forms')}
            />
            <SmartCard 
              icon={Paperclip} 
              title="Attachments" 
              status={{ type: 'items', count: attachmentData.length, label: 'Items' }} 
              active={activeTab === 'attachments'} 
              onClick={() => setActiveTab('attachments')}
            />
            <SmartCard 
              icon={MessageCircle} 
              title="Comments" 
              status={{ type: 'new', label: 'New', count: commentsData.length, }} 
              active={activeTab === 'comments'} 
              onClick={() => setActiveTab('comments')}
            />
            <SmartCard 
              icon={HistoryIcon} 
              title="History" 
              status={{ type: '', label: '' }} 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')}
            />
          </div>

          {/* Sidebar Content */}
          {activeTab === 'summary' && (!agentData || Object.keys(agentData).length === 0) && (
            <SummarySkeleton />
          )}

          {activeTab === 'summary' && agentData && Object.keys(agentData).length > 0 && (
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 custom-scrollbar">
              {/* Approval Status Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm space-y-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${!data.decision ? 'bg-[var(--gray-3)]' : data.decision === 'APPROVED' ? 'bg-[var(--green-9)]/10' : data.decision === 'PARTIAL' ? 'bg-[var(--yellow-9)]/10' : 'bg-[var(--red-9)]/10'}`}>
                    <AlertCircle className={`w-6 h-6 ${!data.decision ? 'text-[var(--gray-8)]' : data.decision === 'APPROVED' ? 'text-[var(--green-9)]' : data.decision === 'PARTIAL' ? 'text-[var(--yellow-9)]' : 'text-[var(--red-9)]'}`} />
                  </div>
                  <div>
                    <p className="text-[12px] text-[var(--gray-11)] font-bold mb-0.5">Approval Status</p>
                    <p className={`text-lg font-bold ${!data.decision ? 'text-[var(--gray-8)]' : data.decision === 'APPROVED' ? 'text-[var(--green-9)]' : data.decision === 'PARTIAL' ? 'text-[var(--yellow-9)]' : 'text-[var(--red-9)]'}`}>Status: {data.decision || 'Analysis in Progress...'}</p>
                  </div>
                </div>
                {data.decision && (
                  <div className="bg-[var(--orange-9)]/10 text-[var(--orange-9)] px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold border border-[var(--orange-9)]/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    High Risk
                  </div>
                )}
              </div>

              {data.reason && (
                <div className="bg-[var(--primary-3)] rounded-2xl p-5 border border-[var(--primary-9)]/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="text-[var(--primary-9)] w-4 h-4" />
                    <span className="text-[11px] font-bold text-[var(--primary-9)] uppercase tracking-widest">AI Analysis</span>
                  </div>
                  <p className="text-[13px] text-[var(--gray-13)] font-medium leading-relaxed">
                    {data.reason}
                  </p>
                </div>
              )}
            </div>

            {/* Extracted Data Grid */}
            <div>
              <div className='flex items-center justify-between'>
              <h3 className="text-[12px] font-bold text-[var(--gray-13)] mb-4 px-1">Extracted Invoice Data</h3>
               <button className="text-[11px] font-bold text-[var(--primary-9)] hover:underline flex items-center gap-1">
                  {/* <History className="w-3 h-3" /> */}
                  <HistoryIcon className="w-3 h-3" />
                  Past Vendor History
                </button>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <DataCard icon={Store} label="Supplier" value={invoiceHeader?.['Supplier Name'] || 'Pending Analysis...'} />
                <DataCard icon={ListFilter} label="PO Number" value={invoiceHeader?.['PO Number'] || selectedItem?.requestNo || 'N/A'} />
                <DataCard icon={CreditCard} label="Currency" value={invoiceHeader?.['Currency'] || 'Pending Analysis...'} />
                <DataCard icon={Wallet} label="Total Value" value={formatAmount(invoiceHeader?.['Total Due']) || 'Pending Analysis...'} highlight />
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[13px] font-bold text-[var(--gray-13)]">Line Items ({lineItemMatching?.length || 0})</h3>
                <button className="text-[11px] font-bold text-[var(--primary-9)] hover:underline flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  Edit Items
                </button>
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
                            <div className="flex flex-col">
                              {item.Description?.['Invoice Value'] || '-'}
                              {(!isMatch && item.Description?.['PO Value']) && (
                                <span className="text-[9px] font-bold text-[var(--orange-9)] mt-0.5 truncate bg-[var(--orange-1)] px-1 py-px rounded w-fit">
                                  Exp: {item.Description?.['PO Value']}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center font-medium border-l border-[var(--gray-3)]">
                            <div className="flex flex-col items-center">
                              {item.Quantity?.['Invoice Value'] || '-'}
                              {(!isMatch && item.Quantity?.['PO Value']) && (
                                <span className="text-[9px] font-bold text-[var(--orange-9)] mt-0.5 truncate bg-[var(--orange-1)] px-1 py-px rounded w-fit">
                                  Exp: {item.Quantity?.['PO Value']}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-medium border-l border-[var(--gray-3)]">
                            <div className="flex flex-col items-end">
                              {formatAmount(item?.Price?.['Invoice Value'])}
                              {(!isMatch && item.Price?.['PO Value']) && (
                                <span className="text-[9px] font-bold text-[var(--orange-9)] mt-0.5 truncate bg-[var(--orange-1)] px-1 py-px rounded w-fit">
                                  Exp: {formatAmount(item.Price?.['PO Value'])}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-bold text-right text-[var(--gray-13)] group-hover:text-[var(--primary-9)] transition-colors border-l border-[var(--gray-3)]">
                            <div className="flex flex-col items-end">
                              {formatAmount(item.Amount?.['Invoice Value'])}
                              {(!isMatch && item.Amount?.['PO Value']) && (
                                <span className="text-[9px] font-bold text-[var(--orange-9)] mt-0.5 truncate bg-[var(--orange-1)] px-1 py-px rounded w-fit">
                                  Exp: {formatAmount(item.Amount?.['PO Value'])}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right border-l border-[var(--gray-3)]">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                                isMatch
                                  ? 'border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]'
                                  : 'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
                              }`}
                            >
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
          </div>
          )}
          {activeTab === "forms" && (
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-6 custom-scrollbar">
              <Forms formModel={formModel} setFormModel={setFormModel} />
            </div>
          )}
          {activeTab === "attachments" && (
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-6 custom-scrollbar">
              {/* Attachments Content */}
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
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-6 custom-scrollbar">
              {/* Comments Content */}
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
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-6 custom-scrollbar">
              {/* History Content */}
              <History
                                        workflowId={workflowId}
                                        processId={processId}
                                        enabled={true}
                                      />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Overview;
