import { useState, useEffect } from 'react';
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
import FileSheet from '@/components/common/file-sheet/FileSheet';
import { useAttachments } from '@/pages/requests/hooks/useAttachments';
import authUserStore from '@/stores/authUserStore';
import Icon from '@/components/base/icon/Icon';
import { useComments } from '@/pages/requests/hooks/useComments'

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
    const [isFileLoading, setIsFileLoading] = useState(false);
  
    // Fetch attachments to set default
    const { data: attachmentData } = useAttachments(workflowId, processId, true);
  
    const { session } = authUserStore.getState();
    const tenantId = session?.tenantId;
    const userId = session?.id;

    useEffect(() => {
        if (attachmentData && attachmentData.length > 0 && !selectedFile) {
          setSelectedFile(attachmentData[0]);
        }
      }, [attachmentData]);

      const { data: data1 } = useComments(workflowId, processId, true)
          const commentsData = (data1 || []) as any[]

  const data = agentData || {};
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header as any;
  const lineItemMatching = data.debug?.['Side-by-side Line Item matching'] || [];

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
        <section className="w-[60%] border-r border-[var(--gray-3)] flex flex-col bg-[var(--gray-2)] relative">
          {selectedFile ? (
                            <div className="absolute inset-0">
                              <FileSheet
                                opened={true}
                                onClose={() => { }} // Viewer is always open in this layout
                                file={selectedFile}
                                tenantId={tenantId}
                                userId={userId}
                                workflowId={workflowId}
                                processId={processId}
                                type={2}
                                actions=""
                                customLoading={isFileLoading}
                              // Adjusting FileSheet style to fit container if needed, assuming it fits parent
                              />
                            </div>
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
                <DataCard icon={Wallet} label="Total Value" value={invoiceHeader?.['Total Due'] || 'Pending Analysis...'} highlight />
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
                              {item?.Price?.['Invoice Value'] || '-'}
                              {(!isMatch && item.Price?.['PO Value']) && (
                                <span className="text-[9px] font-bold text-[var(--orange-9)] mt-0.5 truncate bg-[var(--orange-1)] px-1 py-px rounded w-fit">
                                  Exp: {item.Price?.['PO Value']}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-bold text-right text-[var(--gray-13)] group-hover:text-[var(--primary-9)] transition-colors border-l border-[var(--gray-3)]">
                            <div className="flex flex-col items-end">
                              {item.Amount?.['Invoice Value'] || '-'}
                              {(!isMatch && item.Amount?.['PO Value']) && (
                                <span className="text-[9px] font-bold text-[var(--orange-9)] mt-0.5 truncate bg-[var(--orange-1)] px-1 py-px rounded w-fit">
                                  Exp: {item.Amount?.['PO Value']}
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
                                            setIsFileLoading(true);
                                            setTimeout(() => setIsFileLoading(false), 500);
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
