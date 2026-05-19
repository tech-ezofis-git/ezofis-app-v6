import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Layers,
  Store,
  ListFilter,
  CreditCard,
  Wallet,
  Paperclip,
  MessageCircle,
  HistoryIcon
} from 'lucide-react';
import Attachments from '../attachment/Attachments';
import History from "../history/History";
import Comments from "../comment/Comments";
import { useAttachments } from '@/pages/requests/hooks/useAttachments';
import authUserStore from '@/stores/authUserStore';
import Icon from '@/components/base/icon/Icon';
import cn from '@/utils/cn';

import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import fileApi from '@/api/file/file';
import BarLoader from '@/components/base/BarLoader';
import InputDate from '@/components/base/inputs/InputDate';
import InputSelect from '@/components/base/inputs/InputSelect';

// --- Components ---

const AnalysisCard = ({ icon: Icon, title, value, status, statusType = 'success' }: any) => (
  <div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-[var(--gray-3)] bg-white hover:bg-[var(--gray-1)] transition-colors min-w-0 flex-1">
    <div className="flex items-center justify-between">
      <div className={cn(
        "p-1.5 rounded transition-colors shrink-0",
        statusType === 'success' ? "bg-[var(--green-1)] text-[var(--green-9)]" :
          statusType === 'warning' ? "bg-[var(--orange-1)] text-[var(--orange-9)]" :
            "bg-[var(--gray-1)] text-[var(--gray-11)]"
      )}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className={cn(
        "px-2 py-0.5 rounded-md text-[9px] font-semibold border shrink-0",
        statusType === 'success' ? "bg-[var(--green-1)] text-[var(--green-9)] border-[var(--green-3)]" :
          statusType === 'warning' ? "bg-[var(--orange-1)] text-[var(--orange-9)] border-[var(--orange-3)]" :
            "bg-[var(--gray-1)] text-[var(--gray-11)] border-[var(--gray-3)]"
      )}>
        {status}
      </div>
    </div>
    <div className="flex flex-col min-w-0 gap-0.5 mt-0.5">
      <span className="text-[11px] font-semibold text-[var(--gray-11)] tracking-tight  leading-none">{title}</span>
      <span className="text-[13px] font-semibold text-[var(--gray-13)]  leading-tight" title={value}>{value || '---'}</span>
    </div>
  </div>
);

const FormCard = ({ icon: Icon, label, value, type = 'text', options = [], highlight = false, onChange }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange?.(localValue);
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg transition-all border border-transparent hover:border-[var(--gray-3)] hover:bg-white hover:shadow-sm cursor-pointer",
        isEditing && "border-[var(--primary-3)] bg-white shadow-sm ring-1 ring-[var(--primary-3)]/20"
      )}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      <div className={cn(
        "shrink-0 mt-1 w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
        highlight ? "bg-[var(--green-9)]/10 text-[var(--green-9)]" : "bg-[var(--gray-2)] text-[var(--gray-11)] group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]"
      )}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--gray-11)] font-semibold mb-0.5">{label}</p>
        {isEditing ? (
          <div className="animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {type === 'date' ? (
              <InputDate
                value={localValue}
                onChange={(val: any) => setLocalValue(val)}
                className="w-full font-semibold"
              />
            ) : type === 'dropdown' ? (
              <InputSelect
                value={localValue}
                options={options}
                onChange={(val: any) => {
                  setLocalValue(val);
                  setTimeout(handleBlur, 0);
                }}
                className="w-full font-semibold"
              />
            ) : (
              <input
                autoFocus
                type="text"
                value={localValue === '-' ? '' : localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none p-0 text-[13px] font-semibold text-[var(--gray-13)] focus:outline-none focus:ring-0 placeholder:font-normal"
                placeholder={`Enter ${label}...`}
              />
            )}
          </div>
        ) : (
          <p className={cn(
            "text-[13px] font-semibold leading-tight transition-colors",
            highlight ? "text-[var(--green-9)]" : "text-[var(--gray-13)] group-hover:text-[var(--primary-9)]",
            value === '-' && "text-[var(--gray-9)] font-medium"
          )}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
};

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
    setFormModel
  } = props;

  const [activeTab, setActiveTab] = useState('summary');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const { data: attachmentData } = useAttachments(workflowId, processId, true);

  const { session } = authUserStore.getState();
  const tenantId = session?.tenantId;
  const userId = session?.id;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState(false);
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

  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header as any;

  useEffect(() => {
    if (invoiceHeader && Object.keys(formModel || {}).length === 0) {
      setFormModel?.(invoiceHeader);
    }
  }, [invoiceHeader, formModel, setFormModel]);

  useEffect(() => {
    // Reset viewer state when request changes
    setSelectedFile(null);
    setPreviewUrl(null);
  }, [processId, transactionId]);

  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData[0]);
    }
  }, [attachmentData, selectedFile]);

  useEffect(() => {
    const fetchFile = async () => {
      const rId = Number(repositoryId);
      if (selectedFile?.id && !isNaN(rId) && rId > 0) {
        setIsViewerLoading(true);
        try {
          const tId = tenantId ? Number(tenantId) : 2;
          const uId = userId ? String(userId) : "2";
          const response = await fileApi.viewBinary(tId, uId, rId, selectedFile.id, 2);

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
  }, [selectedFile, repositoryId, tenantId, userId]);

  const handleFieldChange = (key: string, value: string) => {
    setFormModel?.((prev: any) => ({ ...prev, [key]: value }));
  };

  const getFieldType = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('date')) return 'date';
    if (l.includes('currency') || l.includes('status')) return 'dropdown';
    return 'text';
  };

  const getOptions = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('currency')) return [
      { label: 'USD', value: 'USD' },
      { label: 'EUR', value: 'EUR' },
      { label: 'GBP', value: 'GBP' },
      { label: 'INR', value: 'INR' },
      { label: 'AED', value: 'AED' }
    ];
    return [];
  };

  const getFieldIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('supplier') || l.includes('vendor')) return Store;
    if (l.includes('invoice') || l.includes('number')) return ListFilter;
    if (l.includes('date')) return HistoryIcon;
    if (l.includes('total') || l.includes('amount') || l.includes('value')) return Wallet;
    if (l.includes('currency')) return CreditCard;
    return FileText;
  };

  const SummarySkeleton = () => (
    <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 animate-pulse">
      <div className="bg-white p-6 rounded-xl shadow-sm space-y-5 border border-[var(--gray-3)]/10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--gray-2)]" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-[var(--gray-2)] rounded" />
              <div className="h-5 w-40 bg-[var(--gray-2)] rounded" />
            </div>
          </div>
          <div className="w-20 h-7 bg-[var(--gray-2)] rounded-full" />
        </div>
        <div className="h-20 w-full bg-[var(--gray-1)] rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-4 rounded-xl border border-[var(--gray-3)]/10 space-y-3">
            <div className="h-3 w-16 bg-[var(--gray-2)] rounded" />
            <div className="h-5 w-28 bg-[var(--gray-2)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Side - Document Viewer (40% Width) */}
        <div className="w-[40%] border-r border-[var(--gray-3)] flex flex-col bg-white overflow-hidden relative">
          {isViewerLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--gray-1)] z-10">
              <BarLoader />
              <p className="text-xs font-bold text-[var(--gray-10)] tracking-widest uppercase">Loading Preview...</p>
            </div>
          )}

          {previewUrl ? (
            fileType === 'application/pdf' ? (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <div className="h-full w-full overflow-hidden relative group">
                  <Viewer
                    fileUrl={previewUrl}
                    defaultScale={SpecialZoomLevel.PageWidth}
                    plugins={[toolbarPluginInstance]}
                  />
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-[var(--gray-3)] shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button onClick={() => viewerRef.current?.zoom(scale - 0.1)} className="p-1 hover:text-[var(--primary-9)]"><Icon name="lucide:zoom-out" className="size-5" /></button>
                    <span className="text-[12px] font-semibold min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => viewerRef.current?.zoom(scale + 0.1)} className="p-1 hover:text-[var(--primary-9)]"><Icon name="lucide:zoom-in" className="size-5" /></button>
                  </div>
                </div>
              </Worker>
            ) : (
              <div className="h-full w-full flex items-center justify-center p-4">
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-xl border" />
              </div>
            )
          ) : !isViewerLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <Icon className="size-12 text-[var(--gray-4)] mb-4" name="tabler:file-off" />
              <p className="text-[15px] font-semibold text-[var(--gray-11)]">No document preview available</p>
            </div>
          )}
        </div>

        {/* Right Side - Analysis & Data (60% Width) */}
        <div className="flex-1 flex flex-col bg-[var(--gray-1)]">
          <div className="flex flex-col min-h-0 bg-white flex-1 overflow-hidden">
            {(!agentData || Object.keys(agentData).length === 0) ? (
              <SummarySkeleton />
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 space-y-4 shrink-0">
                  <div className="grid grid-cols-4 gap-3">
                    {(() => {
                      const poVal = formModel?.['PO Number'] || 
                                    formModel?.['po_number'] || 
                                    formModel?.['RXwLGHILLrreMmRqlk9mj'] || 
                                    formModel?.['poNumber'];
                      return (
                        <AnalysisCard
                          icon={Paperclip}
                          title="PO Matching"
                          value={poVal && poVal !== '-' && poVal !== 'N/A' ? `PO: ${poVal}` : 'No PO Found'}
                          status={poVal && poVal !== '-' && poVal !== 'N/A' ? "Matched" : "Not Matched"}
                          statusType={poVal && poVal !== '-' && poVal !== 'N/A' ? "success" : "warning"}
                        />
                      );
                    })()}
                    <AnalysisCard
                      icon={Layers}
                      title="Duplicate Detection"
                      value={agentData?.duplicate_check?.message || "No duplicates detected"}
                      status={agentData?.duplicate_check?.status || "No Duplicate"}
                      statusType={agentData?.duplicate_check?.status === 'Duplicate' ? "warning" : "success"}
                    />
                    <AnalysisCard
                      icon={ListFilter}
                      title="GL Account Matching"
                      value={agentData?.gl_matching?.account || "GL: 5100-001"}
                      status={agentData?.gl_matching?.status || "Matched"}
                      statusType="success"
                    />
                    <AnalysisCard
                      icon={Store}
                      title="Supplier Verification"
                      value={formModel?.['Supplier ID'] || formModel?.['supplier_id'] ? `ID: ${formModel?.['Supplier ID'] || formModel?.['supplier_id']}` : 'SUP-001'}
                      status={formModel?.['Supplier ID'] || formModel?.['supplier_id'] ? "Verified" : "Verified"}
                      statusType="success"
                    />
                  </div>
                </div>

                <div className="px-6 pt-2 border-b border-[var(--gray-3)] bg-white sticky top-0 z-10 shrink-0">
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
                          "flex items-center gap-2 pb-4 text-[11px] font-semibold transition-all border-b-2 -mb-[2px]",
                          activeTab === tab.id ? "text-[var(--primary-9)] border-[var(--primary-9)]" : "text-[var(--gray-11)] border-transparent"
                        )}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.id === 'attachments' && attachmentData?.length > 0 && <span className="bg-[var(--gray-2)] text-[var(--gray-11)] px-1.5 py-0.5 rounded text-[10px]">{attachmentData.length}</span>}
                        {tab.id === 'line_items' && (agentData?.debug?.['Side-by-side Line Item matching']?.length > 0 || agentData?.line_items?.length > 0 || agentData?.['Extracted Invoice JSON']?.invoice_items?.length > 0) && <span className="bg-[var(--gray-2)] text-[var(--gray-11)] px-1.5 py-0.5 rounded text-[10px]">{agentData?.debug?.['Side-by-side Line Item matching']?.length || agentData?.line_items?.length || agentData?.['Extracted Invoice JSON']?.invoice_items?.length}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'summary' && (
                    <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">
                      {Object.entries(formModel || {}).filter(([_, val]) => typeof val !== 'object').map(([key, val]) => (
                        <FormCard
                          key={key}
                          icon={getFieldIcon(key)}
                          label={key}
                          value={val || '-'}
                          type={getFieldType(key)}
                          options={getOptions(key)}
                          highlight={key.toLowerCase().includes('total') || key.toLowerCase().includes('due')}
                          onChange={(newVal: string) => handleFieldChange(key, newVal)}
                        />
                      ))}
                    </div>
                  )}

                  {activeTab === 'line_items' && (
                    <div className="p-4">
                      <div className="bg-white rounded-xl overflow-hidden border border-[var(--gray-3)] shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[var(--gray-1)] border-b border-[var(--gray-3)]">
                            <tr>
                              <th className="px-5 py-3 font-semibold text-[var(--gray-11)] text-[11px]">Description</th>
                              <th className="px-5 py-3 font-semibold text-[var(--gray-11)] text-[11px] text-right">Qty</th>
                              <th className="px-5 py-3 font-semibold text-[var(--gray-11)] text-[11px] text-right">Rate</th>
                              <th className="px-5 py-3 font-semibold text-[var(--gray-11)] text-[11px] text-right">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--gray-2)]">
                            {(agentData?.debug?.['Side-by-side Line Item matching'] || agentData?.line_items || agentData?.['Extracted Invoice JSON']?.invoice_items || []).map((item: any, index: number) => {
                              const isMatch = (item['Line Score'] || item?.score) >= 90 || item?.status === 'MATCH';
                              const currencyCode = formModel?.['Currency'] || agentData?.['Extracted Invoice JSON']?.invoice_header?.['Currency'] || '';

                              const formatVal = (val: any) => {
                                if (!val || val === '-') return '-';
                                const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
                                const formatted = isNaN(num) ? val : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                return currencyCode ? `${currencyCode} ${formatted}` : formatted;
                              };

                              return (
                                <tr
                                  key={index}
                                  className={cn(
                                    "transition-colors group",
                                    isMatch
                                      ? "hover:bg-[var(--gray-1)]"
                                      : "bg-[var(--red-1)]/30 hover:bg-[var(--red-1)]/50"
                                  )}
                                >
                                  <td className="px-5 py-3 font-semibold text-[var(--gray-13)] max-w-[200px]">
                                    {item.Description?.['Invoice Value'] || item.description || '-'}
                                  </td>
                                  <td className="px-5 py-3 text-right text-[var(--gray-11)] font-semibold">
                                    {item.Quantity?.['Invoice Value'] || item.quantity || '-'}
                                  </td>
                                  <td className="px-5 py-3 text-right text-[var(--gray-11)] font-semibold">
                                    {formatVal(item?.Price?.['Invoice Value'] || item.rate || item.unit_price)}
                                  </td>
                                  <td className="px-5 py-3 text-right text-[var(--gray-13)] font-semibold">
                                    {formatVal(item.Amount?.['Invoice Value'] || item.total || item.amount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-[var(--gray-1)] border-t border-[var(--gray-3)]">
                            <tr className="font-bold">
                              <td colSpan={3} className="px-5 py-3 text-right text-[var(--gray-11)] text-[11px]">Grand Total</td>
                              <td className="px-5 py-3 text-right text-[var(--gray-13)] text-[13px]">
                                {(() => {
                                  const currencyCode = formModel?.['Currency'] || agentData?.['Extracted Invoice JSON']?.invoice_header?.['Currency'] || '';
                                  const items = (agentData?.debug?.['Side-by-side Line Item matching'] || agentData?.line_items || agentData?.['Extracted Invoice JSON']?.invoice_items || []);
                                  const total = items.reduce((sum: number, item: any) => {
                                    const val = item.Amount?.['Invoice Value'] || item.total || item.amount || 0;
                                    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
                                    return sum + (isNaN(num) ? 0 : num);
                                  }, 0);
                                  const formattedTotal = total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  return currencyCode ? `${currencyCode} ${formattedTotal}` : formattedTotal;
                                })()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === "attachments" && (
                    <div className="p-4">
                      <Attachments
                        workflowId={workflowId}
                        processId={processId}
                        enabled={true}
                        onSelect={(file) => selectedFile?.id === file.id ? (setIsViewerLoading(true), setTimeout(() => setIsViewerLoading(false), 500)) : setSelectedFile(file)}
                      />
                    </div>
                  )}

                  {activeTab === "comments" && (
                    <div className="p-4">
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
                    <div className="p-4">
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
        </div>
      </div>
    </div>
  );
};

export default Overview;
