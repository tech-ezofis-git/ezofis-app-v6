import { useState, useEffect } from 'react';
import Icon from '@/components/base/icon/Icon';
import { AnimateSlideUp } from '@/components/common/animations';
import { SkeletonCard } from '@/components/common/skeletons';
import cn from '@/utils/cn';
import Attachments from '../attachment/Attachments';
import History from "../history/History";
import Comments from "../comment/Comments";
import FileSheet from '@/components/common/file-sheet/FileSheet';
import { useAttachments } from '@/pages/requests/hooks/useAttachments';
import authUserStore from '@/stores/authUserStore';

// --- Types ---
// type RightViewMode = 'analysis' | 'comments' | 'attachments';

interface FieldMatch {
  Field: string;
  'Invoice Value': string | number;
  'PO Value': string | number;
  Score: number;
}

interface LineItemMatch {
  Description: { 'Invoice Value': string; 'PO Value': string; Score: number };
  Quantity: { 'Invoice Value': number; 'PO Value': number; Score: number };
  Price: { 'Invoice Value': number; 'PO Value': number; Score: number };
  Amount: { 'Invoice Value': number; 'PO Value': number; Score: number };
  'Line Score': number;
}

interface InvoiceHeader {
  'Supplier Name'?: string;
  'PO Number'?: string;
  'Currency'?: string;
  'Total Due'?: string | number;
}

interface ExtractedInvoice {
  invoice_header?: InvoiceHeader;
  line_items?: Array<{
    line_no: number;
    description: string;
    quantity: string;
    price: number;
    amount: number;
  }>;
}

interface DebugData {
  'Side-by-side Field Matching'?: FieldMatch[];
  'Side-by-side Line Item matching'?: LineItemMatch[];
}

/** invoice_errors can come as strings OR objects (your runtime error shows objects). */
type InvoiceErrorItem =
  | string
  | {
    code?: string;
    field?: string;
    detail?: any;
    message?: string;
  }
  | Record<string, any>;

interface InvoiceErrors {
  severity?: string;
  errors: InvoiceErrorItem[];
}

type BackorderReason = string;
type BackorderRecommendation = string;

interface BackorderItem {
  po_line_id?: string;
  po_qty: number;
  invoice_qty: number | null;
  remaining: number;
  description?: string;
  price?: number;
  amount?: number;
  reason?: BackorderReason;
}

interface BackorderData {
  detected: boolean;
  missing_qty_by_item?: BackorderItem[];
  recommendation?: BackorderRecommendation;
}

interface AgentData {
  decision: string;
  score: number;
  reason: string;
  debug?: DebugData;
  po_row?: {
    'PO Number': string;
    'Vendor Name': string;
    'PO Amount': string;
    Currency?: string;
  };
  'Extracted Invoice JSON'?: ExtractedInvoice;
  invoice_errors?: InvoiceErrors;
  backorder?: BackorderData;
  reqNo?: string;
}

const Overview = ({
  agentData,
  workflowId,
  processId,
  transactionId,
  repositoryId,
  selectedItem,
  // rawWorkflowData,
  rightView,
  setRightView,
}: any) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const defaultAgentData: AgentData = {
    decision: 'APPROVED',
    score: 94,
    reason:
      'The invoice from Silverline Auto Parts matches the PO exactly. All line items and totals are verified against the master record.',
    debug: {
      'Side-by-side Field Matching': [
        { Field: 'Supplier Name', 'Invoice Value': 'Silverline Auto Parts', 'PO Value': 'Silverline Auto Parts', Score: 100 },
        { Field: 'PO Number', 'Invoice Value': 'PO-1007', 'PO Value': 'PO-1007', Score: 100 },
        { Field: 'Total Due', 'Invoice Value': 813.6, 'PO Value': 813.6, Score: 100 },
      ],
      'Side-by-side Line Item matching': [
        { Description: { 'Invoice Value': 'Mouse', 'PO Value': 'Logitech Mouse', Score: 40 }, Quantity: { 'Invoice Value': 1, 'PO Value': 1, Score: 100 }, Price: { 'Invoice Value': 106.0, 'PO Value': 106.0, Score: 100 }, Amount: { 'Invoice Value': 106.0, 'PO Value': 106.0, Score: 100 }, 'Line Score': 60 },
        { Description: { 'Invoice Value': 'Keyboard', 'PO Value': 'Keyboard Mech', Score: 85 }, Quantity: { 'Invoice Value': 6, 'PO Value': 6, Score: 100 }, Price: { 'Invoice Value': 102.0, 'PO Value': 102.0, Score: 100 }, Amount: { 'Invoice Value': 612.0, 'PO Value': 612.0, Score: 100 }, 'Line Score': 90 },
        { Description: { 'Invoice Value': 'Printer', 'PO Value': 'Printer', Score: 100 }, Quantity: { 'Invoice Value': 4, 'PO Value': 4, Score: 100 }, Price: { 'Invoice Value': 97.0, 'PO Value': 97.0, Score: 100 }, Amount: { 'Invoice Value': 388.0, 'PO Value': 388.0, Score: 100 }, 'Line Score': 100 },
      ],
    },
    'Extracted Invoice JSON': {
      invoice_header: {
        'Supplier Name': 'Silverline Auto Parts',
        'PO Number': 'PO-1007',
        Currency: 'USD',
        'Total Due': '1106.00',
      },
      line_items: [],
    },
    reqNo: 'REQ-75',
  };

  // State for Right View Mode and Selected File
  // const [rightView, setRightView] = useState<RightViewMode>('analysis'); // Now props
  const [selectedFile, setSelectedFile] = useState<any>(null); // Use appropriate type
  const [isFileLoading, setIsFileLoading] = useState(false);

  // Fetch attachments to set default
  const { data: attachmentData } = useAttachments(workflowId, processId, true);

  const { session } = authUserStore.getState();
  const tenantId = session?.tenantId;
  const userId = session?.id;

  // Set default file when attachments load
  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData[0]);
    }
  }, [attachmentData]);

  const data: AgentData = agentData || defaultAgentData;

  const fieldMatching = data.debug?.['Side-by-side Field Matching'] || [];
  const lineItemMatching = data.debug?.['Side-by-side Line Item matching'] || [];
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header as any;

  // -----------------------------
  // NEW: Invoice Errors + Backorder
  // -----------------------------
  const invoiceErrors = data.invoice_errors;
  const backorder = data.backorder;

  const hasInvoiceErrors =
    !!invoiceErrors &&
    Array.isArray(invoiceErrors.errors) &&
    invoiceErrors.errors.length > 0;

  const hasBackorder =
    !!backorder &&
    backorder.detected === true &&
    Array.isArray(backorder.missing_qty_by_item) &&
    backorder.missing_qty_by_item.length > 0;

  /** Prevent "Objects are not valid as a React child" by normalizing to displayable strings. */
  const formatInvoiceError = (err: InvoiceErrorItem): { title: string; subtitle?: string } => {
    if (typeof err === 'string') return { title: err };

    // If it's an object, pick meaningful fields.
    const e: any = err || {};
    const code = e.code ? String(e.code) : '';
    const field = e.field ? String(e.field) : '';
    const message = e.message ? String(e.message) : '';
    const detail = e.detail;

    // Try to build a clean, human readable line.
    const titleParts = [code && `(${code})`, field && field, message].filter(Boolean);
    const title = titleParts.length ? titleParts.join(' ') : 'Validation issue';

    let subtitle: string | undefined;
    if (detail != null) {
      if (typeof detail === 'string') subtitle = detail;
      else {
        try {
          subtitle = JSON.stringify(detail);
        } catch {
          subtitle = String(detail);
        }
      }
    }

    // fallback: stringify whole object if still empty
    if (!titleParts.length && !subtitle) {
      try {
        subtitle = JSON.stringify(e);
      } catch {
        subtitle = String(e);
      }
    }

    return { title, subtitle };
  };

  const getSeverityMeta = (severity?: string) => {
    const s = (severity || '').toUpperCase();
    if (s.includes('HIGH') || s.includes('CRITICAL')) {
      return {
        chip: 'border-[var(--red-4)] bg-[var(--red-1)] text-[var(--red-11)]',
        iconWrap: 'bg-[var(--red-2)] text-[var(--red-9)]',
        label: 'High severity',
        icon: 'tabler:alert-octagon-filled',
      };
    }
    if (s.includes('MED')) {
      return {
        chip: 'border-[var(--yellow-4)] bg-[var(--yellow-1)] text-[var(--yellow-11)]',
        iconWrap: 'bg-[var(--yellow-2)] text-[var(--yellow-9)]',
        label: 'Medium severity',
        icon: 'tabler:alert-circle-filled',
      };
    }
    return {
      chip: 'border-[var(--gray-4)] bg-[var(--gray-1)] text-[var(--gray-11)]',
      iconWrap: 'bg-[var(--gray-2)] text-[var(--gray-9)]',
      label: 'Low severity',
      icon: 'tabler:info-circle',
    };
  };

  const getRecommendationMeta = (rec?: string) => {
    const r = (rec || '').toUpperCase();
    if (r.includes('WAIT')) {
      return {
        chip: 'border-[var(--blue-4)] bg-[var(--blue-1)] text-[var(--blue-11)]',
        icon: 'tabler:hourglass',
        label: 'Wait for balance',
      };
    }
    if (r.includes('CONTACT')) {
      return {
        chip: 'border-[var(--purple-4)] bg-[var(--purple-1)] text-[var(--purple-11)]',
        icon: 'tabler:message-circle-2',
        label: 'Contact vendor',
      };
    }
    if (r.includes('CANCEL')) {
      return {
        chip: 'border-[var(--red-4)] bg-[var(--red-1)] text-[var(--red-11)]',
        icon: 'tabler:ban',
        label: 'Cancel remaining',
      };
    }
    return {
      chip: 'border-[var(--gray-4)] bg-[var(--gray-1)] text-[var(--gray-11)]',
      icon: 'tabler:settings',
      label: rec || 'Recommendation',
    };
  };

  // -----------------------------
  // Existing banner helpers
  // -----------------------------
  const getStatusAttr = (decision: string) => {
    const d = decision?.toUpperCase() || '';
    if (d.includes('PARTIAL')) return 'PARTIAL';
    if (d === 'APPROVED') return 'APPROVED';
    if (d === 'REJECTED' || d === 'DECLINED') return 'REJECTED';
    return 'DEFAULT';
  };

  const statusAttr = getStatusAttr(data.decision);

  const getDecisionThemeClasses = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          bannerBorder: 'border-l-[var(--green-9)]',
          iconColor: 'text-[var(--green-9)]',
          titleColor: 'text-[var(--green-11)]',
          badge: 'bg-[var(--green-3)] text-[var(--green-11)]',
          box: 'bg-[var(--green-2)] border-[var(--green-4)]',
        };
      case 'REJECTED':
        return {
          bannerBorder: 'border-l-[var(--red-9)]',
          iconColor: 'text-[var(--red-9)]',
          titleColor: 'text-[var(--red-11)]',
          badge: 'bg-[var(--red-3)] text-[var(--red-11)]',
          box: 'bg-[var(--red-2)] border-[var(--red-4)]',
        };
      case 'PARTIAL':
        return {
          bannerBorder: 'border-l-[var(--yellow-9)]',
          iconColor: 'text-[var(--yellow-9)]',
          titleColor: 'text-[var(--yellow-11)]',
          badge: 'bg-[var(--yellow-3)] text-[var(--yellow-11)]',
          box: 'bg-[var(--yellow-2)] border-[var(--yellow-4)]',
        };
      default:
        return {
          bannerBorder: 'border-l-[var(--gray-9)]',
          iconColor: 'text-[var(--gray-9)]',
          titleColor: 'text-[var(--gray-11)]',
          badge: 'bg-[var(--gray-3)] text-[var(--gray-11)]',
          box: 'bg-[var(--gray-1)] border-[var(--gray-3)]',
        };
    }
  };

  const decisionTheme = getDecisionThemeClasses(statusAttr);

  const getBannerConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          statusTitle: 'Ready for Approval',
          colorVar: 'green',
          icon: 'tabler:circle-check',
          progressColor: 'bg-[var(--green-9)]',
          badgeText: 'Auto-verified',
          badgeBg: 'bg-[var(--purple-3)]',
          badgeColor: 'text-[var(--purple-11)]',
          nextAction: 'Schedule Payment',
          nextActionDate: 'Feb 12',
          nextActionIcon: 'tabler:calendar-dollar',
        };
      case 'REJECTED':
        return {
          statusTitle: 'Rejected',
          colorVar: 'red',
          icon: 'tabler:alert-octagon',
          progressColor: 'bg-[var(--red-9)]',
          badgeText: 'Flagged',
          badgeBg: 'bg-[var(--red-3)]',
          badgeColor: 'text-[var(--red-11)]',
          nextAction: 'Review Invoice',
          nextActionDate: 'Urgent',
          nextActionIcon: 'tabler:alert-triangle',
        };
      case 'PARTIAL':
        return {
          statusTitle: 'Partial Match',
          colorVar: 'yellow',
          icon: 'tabler:alert-circle',
          progressColor: 'bg-[var(--yellow-9)]',
          badgeText: 'Manual Check',
          badgeBg: 'bg-[var(--yellow-3)]',
          badgeColor: 'text-[var(--yellow-11)]',
          nextAction: 'Verify Line Items',
          nextActionDate: 'Net 30',
          nextActionIcon: 'tabler:list-search',
        };
      default:
        return {
          statusTitle: 'Processing',
          colorVar: 'gray',
          icon: 'tabler:loader',
          progressColor: 'bg-[var(--gray-9)]',
          badgeText: 'Analyzing',
          badgeBg: 'bg-[var(--gray-3)]',
          badgeColor: 'text-[var(--gray-11)]',
          nextAction: 'Wait for Agent',
          nextActionDate: '-',
          nextActionIcon: 'tabler:clock',
        };
    }
  };

  const banner = getBannerConfig(statusAttr);

  return (
    <>
      <div className="flex flex-col gap-3 h-full overflow-hidden p-0">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* TOP STAT / DECISION BANNER */}
            <div className="w-full  mt-2">
              <AnimateSlideUp delay={0.25}>
                <div className="w-full bg-white border border-[var(--gray-3)] rounded-xl shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                  <div className="flex w-full items-center gap-6">
                    {/* LEFT: Status & Score */}
                    <div className="flex items-center gap-4 shrink-0 min-w-[180px]">
                      <div
                        className={cn(
                          'size-10 rounded-full flex items-center justify-center shrink-0',
                          statusAttr === 'APPROVED'
                            ? 'bg-[var(--green-3)]'
                            : statusAttr === 'REJECTED'
                              ? 'bg-[var(--red-3)]'
                              : statusAttr === 'PARTIAL'
                                ? 'bg-[var(--yellow-3)]'
                                : 'bg-[var(--gray-3)] animate-spin'
                        )}
                      >
                        <Icon
                          className={cn('size-6', decisionTheme.iconColor)}
                          name={
                            statusAttr === 'APPROVED'
                              ? 'tabler:shield-check-filled'
                              : statusAttr === 'REJECTED'
                                ? 'tabler:alert-octagon-filled'
                                : statusAttr === 'PARTIAL'
                                  ? 'tabler:alert-circle-filled'
                                  : 'tabler:loader'
                          }
                        />
                      </div>

                      <div className="flex flex-col justify-center w-full">
                        <div className={cn('text-[15px] font-bold leading-tight', decisionTheme.titleColor)}>
                          {banner.statusTitle}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="h-2 w-full max-w-[100px] bg-[var(--gray-2)] rounded-full overflow-hidden relative">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500 ease-out',
                                statusAttr === 'APPROVED'
                                  ? 'bg-[var(--green-9)]'
                                  : statusAttr === 'REJECTED'
                                    ? 'bg-[var(--red-9)]'
                                    : statusAttr === 'PARTIAL'
                                      ? 'bg-[var(--yellow-9)]'
                                      : 'bg-[var(--gray-9)]'
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, Number(data.score) || 0))}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-bold text-[var(--gray-11)] whitespace-nowrap">
                            {data.score}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE: AI Analysis */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-start gap-3 h-full">
                        <div className="w-2 self-stretch rounded-full bg-[#8B5CF6] opacity-30" />
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon name="tabler:sparkles" className="size-3.5 text-[#8B5CF6]" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-10)]">
                              Analysis
                            </span>
                            {banner.badgeText && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8B5CF6]/10 text-[#7C3AED] border border-[#8B5CF6]/20">
                                {banner.badgeText}
                              </span>
                            )}
                          </div>

                          <p className="text-[13px] leading-relaxed text-[var(--gray-11)] line-clamp-3 hover:line-clamp-none transition-all">
                            {data.reason}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DIVIDER */}
                    <div className="h-12 w-px bg-[var(--gray-3)] shrink-0" />

                    {/* RIGHT: Next Action */}
                    <div className="flex items-center gap-5 shrink-0 justify-end">
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-9)] mb-0.5">
                          Next Action
                        </span>
                        <span className="text-[14px] font-bold text-[var(--gray-12)]">
                          {banner.nextAction}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--gray-3)] bg-white shadow-sm min-w-[160px]">
                        <div className="size-9 rounded-md flex items-center justify-center bg-[#FFEDD5]/50 text-[#F97316] shrink-0">
                          <Icon name="tabler:calendar" className="size-5" />
                        </div>

                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-1.5 leading-none mb-1">
                            <span className="text-[13px] font-bold text-[var(--gray-12)] whitespace-nowrap">
                              Due {banner.nextActionDate}
                            </span>
                            <div className="size-1.5 rounded-full bg-[#F97316]" />
                          </div>

                          <div className="flex items-center gap-1 leading-none">
                            <Icon name="tabler:clock" className="size-3 text-[var(--gray-8)]" />
                            <span className="text-[11px] font-medium text-[var(--gray-9)] whitespace-nowrap">
                              Net 30 Days
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </AnimateSlideUp>
            </div>

            {/* SPLIT VIEW */}
            <div className="flex flex-1 gap-4 overflow-hidden h-full">
              {/* Left Column: File Viewer (replaces Attachments) */}
              <div
                className={cn(
                  "h-full overflow-hidden rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] relative group/viewer transition-all duration-300",
                  rightView === 'analysis' ? "w-1/2" : "w-[40%]"
                )}
              >
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
              </div>

              {/* Middle Column: Analysis Data (Always Visible, resizeable) */}
              <div
                className={cn(
                  "h-full overflow-hidden rounded-lg relative transition-all duration-300",
                  rightView === 'analysis' ? "w-1/2" : "w-[30%]"
                )}
              >
                {/* Floating Action Buttons (Overlay) - Removed as moved to Header */}

                {/* --- ANALYSIS CONTENT --- */}
                <div className="h-full overflow-y-auto space-y-3 pr-1 pb-10 scrollbar-thin">

                  {/* Invoice Summary */}
                  <AnimateSlideUp delay={0.4}>
                    <div className="flex flex-col gap-2 ">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)] pl-1">
                        Invoice Summary
                      </div>

                      <div id="section-summary" className="rounded-xl border border-[var(--gray-4)] bg-white p-4 shadow-sm">
                        {invoiceHeader && (
                          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--purple-1)] text-[var(--purple-9)]">
                                <Icon name="tabler:building-skyscraper" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">Supplier</span>
                                <span className="line-clamp-1 hover:line-clamp-none transition-all text-13 font-bold text-[var(--gray-12)]">
                                  {invoiceHeader['Supplier Name'] || '-'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-1)] text-[var(--blue-9)]">
                                <Icon name="tabler:file-text" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">PO Number</span>
                                <span className="line-clamp-1 hover:line-clamp-none transition-all text-13 font-bold text-[var(--gray-12)]">
                                  {invoiceHeader['PO Number'] || '-'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--orange-1)] text-[var(--orange-9)]">
                                <Icon name="tabler:coins" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">Currency</span>
                                <span className="line-clamp-1 hover:line-clamp-none transition-all text-13 font-bold text-[var(--gray-12)]">
                                  {invoiceHeader['Currency'] || 'USD'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--green-1)] text-[var(--green-9)]">
                                <Icon name="tabler:currency-dollar" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">Total Due</span>
                                <span className="line-clamp-1 hover:line-clamp-none transition-all text-13 font-bold text-[var(--green-10)]">
                                  {invoiceHeader['Total Due'] ?? '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </AnimateSlideUp>

                  {/* Field Matching */}
                  <AnimateSlideUp delay={0.3}>
                    <div className="flex flex-col gap-2 mt-6">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)] pl-1">
                        Field Matching
                      </div>

                      <div className={cn(
                        "grid gap-3 transition-all",
                        rightView === 'analysis' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-2" : "grid-cols-1"
                      )}>
                        {fieldMatching.length > 0 ? (
                          fieldMatching.map((field, index) => {
                            const displayInvoice = field['Invoice Value'] || '-';
                            const displayPO = field['PO Value'] || '-';
                            const isPerfect = field.Score === 100;

                            return (
                              <div key={index} className="flex flex-col gap-3 rounded-xl border border-[var(--gray-3)] bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-13 font-bold text-[var(--gray-12)] line-clamp-1 hover:line-clamp-none transition-all" title={field.Field}>
                                    {field.Field}
                                  </span>

                                  <div
                                    className={cn(
                                      "flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold",
                                      isPerfect
                                        ? "border-[var(--green-4)] bg-[var(--green-1)] text-[var(--green-9)]"
                                        : "border-[var(--orange-4)] bg-[var(--orange-1)] text-[var(--orange-9)]"
                                    )}
                                  >
                                    {isPerfect && <Icon name="tabler:check" className="size-3" />}
                                    {field.Score}%
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 h-full">
                                  <div className="flex flex-col justify-center rounded-lg bg-[var(--gray-1)] px-2.5 py-2 border border-transparent">
                                    <div className="text-[9px] font-medium text-[var(--gray-8)] uppercase tracking-wide mb-0.5">
                                      Extracted
                                    </div>
                                    <div className="text-12 font-semibold text-[var(--gray-12)] break-all leading-tight line-clamp-2 hover:line-clamp-none transition-all" title={String(displayInvoice)}>
                                      {displayInvoice}
                                    </div>
                                  </div>

                                  <div className="flex flex-col justify-center rounded-lg bg-[var(--gray-1)] px-2.5 py-2 border border-transparent">
                                    <div className="text-[9px] font-medium text-[var(--gray-8)] uppercase tracking-wide mb-0.5">
                                      PO Value
                                    </div>
                                    <div className="text-12 font-semibold text-[var(--gray-12)] break-all leading-tight line-clamp-2 hover:line-clamp-none transition-all" title={String(displayPO)}>
                                      {displayPO}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full rounded-xl border border-[var(--gray-3)] bg-white p-4 text-center text-12 text-[var(--gray-8)] italic">
                            No fields matched.
                          </div>
                        )}
                      </div>
                    </div>
                  </AnimateSlideUp>

                  {/* Line Items */}
                  <AnimateSlideUp delay={0.35}>
                    <div className="flex flex-col gap-2 mt-6">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)] pl-1">
                        Line Items
                      </div>

                      <div id="section-line-items" className="rounded-xl border border-[var(--gray-4)] bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          {lineItemMatching.length > 0 ? (
                            <div className="min-w-[600px]">
                              <div className="grid grid-cols-[2fr_0.8fr_0.8fr_1fr_1fr] border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                                <div>Description</div>
                                <div>Qty</div>
                                <div>Price</div>
                                <div>Total</div>
                                <div className="text-right">Match Status</div>
                              </div>

                              <div className="divide-y divide-[var(--gray-2)]">
                                {lineItemMatching.map((item, index) => {
                                  const isMatch = item['Line Score'] >= 90;

                                  const renderCell = (actual: any, expected: any) => {
                                    const displayActual = actual || "-";
                                    const showExpected = !isMatch && expected;

                                    return (
                                      <div className="flex flex-col leading-tight">
                                        <span className={cn('line-clamp-1 hover:line-clamp-none transition-all text-11 font-medium', !actual && 'text-[var(--gray-8)] italic')}>
                                          {displayActual}
                                        </span>
                                        {showExpected && (
                                          <span className="text-[9px] font-bold text-[var(--orange-9)] mt-0.5 truncate bg-[var(--orange-1)] px-1 py-px rounded w-fit">
                                            Exp: {expected}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  };

                                  return (
                                    <div key={index} className="grid grid-cols-[2fr_0.8fr_0.8fr_1fr_1fr] items-center px-4 py-2.5 hover:bg-[var(--gray-1)] transition-colors group">
                                      <div className="text-[var(--gray-12)] pr-4">
                                        {renderCell(item.Description['Invoice Value'], item.Description['PO Value'])}
                                      </div>

                                      <div className="text-[var(--gray-11)]">
                                        {renderCell(item.Quantity['Invoice Value'], item.Quantity['PO Value'])}
                                      </div>

                                      <div className="text-[var(--gray-11)]">
                                        {renderCell(item.Price['Invoice Value'], item.Price['PO Value'])}
                                      </div>

                                      <div className="font-bold text-[var(--teal-9)]">
                                        {renderCell(item.Amount['Invoice Value'], item.Amount['PO Value'])}
                                      </div>

                                      <div className="text-right">
                                        <span
                                          className={cn(
                                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border',
                                            isMatch
                                              ? 'border-[var(--green-2)] bg-[var(--green-1)] text-[var(--green-9)]'
                                              : 'border-[var(--red-2)] bg-[var(--red-1)] text-[var(--red-9)]'
                                          )}
                                        >
                                          {isMatch ? "MATCH" : "DIFF"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 flex flex-col items-center justify-center text-[var(--gray-8)]">
                              <span className="text-11 font-medium opacity-70">No line items found.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </AnimateSlideUp>

                  {/* NEW: Invoice Errors + Backorder (Must be above History & Comments) */}
                  <div className="grid grid-cols-1 gap-2">
                    {hasInvoiceErrors && (
                      <AnimateSlideUp delay={0.36}>
                        <div className="flex flex-col gap-3 mt-3 ml-1">
                          {/* Header with severity badge */}
                          <div className="flex items-center justify-between pl-1">
                            <div className="flex items-center gap-2">
                              {/* <Icon
                                name="tabler:alert-triangle-filled"
                                className="size-4 text-[var(--red-9)]"
                              /> */}
                              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                                Invoice Errors
                              </div>
                            </div>

                            {/* {(() => {
                              const meta = getSeverityMeta(invoiceErrors?.severity);
                              return (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold shadow-sm',
                                    meta.chip
                                  )}
                                >
                                  <Icon name={meta.icon} className="size-3.5" />
                                  {meta.label}
                                </span>
                              );
                            })()} */}
                          </div>

                          {/* Main error card with gradient */}
                          <div className="relative rounded-xl   to-white p-5 shadow-sm overflow-hidden">
                            {/* Decorative background pattern */}
                            <div className="absolute inset-0 opacity-5">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--red-9)] rounded-full blur-3xl" />
                              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--red-9)] rounded-full blur-2xl" />
                            </div>

                            <div className="relative flex items-start gap-4">
                              {/* Icon section */}


                              {/* Content section */}
                              <div className="min-w-0 flex-1">
                                {/* Title and count */}
                                <div className="flex items-center justify-between gap-3 mb-3">

                                  <div className="flex flex-row gap-4 items-center">
                                    {(() => {
                                      const meta = getSeverityMeta(invoiceErrors?.severity);
                                      return (
                                        <div className={cn(
                                          'flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm border',
                                          meta.iconWrap,
                                          'border-[var(--red-4)]'
                                        )}>
                                          <Icon name={meta.icon} className="size-5" />
                                        </div>
                                      );
                                    })()}
                                    <h4 className="text-14 font-bold text-[var(--red-11)] mb-0.5">
                                      Validation Issues Detected
                                      <p className="text-11 text-[var(--gray-10)] font-medium">
                                        The following issues require attention before processing
                                      </p>
                                    </h4>

                                  </div>
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[var(--red-3)] shadow-sm shrink-0">
                                    <Icon name="tabler:alert-circle" className="size-4 text-[var(--red-9)]" />
                                    <span className="text-12 font-bold text-[var(--red-11)]">
                                      {invoiceErrors?.errors?.length} {invoiceErrors?.errors?.length === 1 ? 'Issue' : 'Issues'}
                                    </span>
                                  </div>
                                </div>

                                {/* Error list */}
                                <div className="mt-3 grid grid-cols-1 gap-2.5">
                                  {invoiceErrors!.errors.slice(0, 6).map((err, idx) => {
                                    const formatted = formatInvoiceError(err);
                                    return (
                                      <div
                                        key={idx}
                                        className="group flex items-start gap-3 rounded-lg border border-[var(--red-3)] bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--red-5)] hover:-translate-y-0.5"
                                      >
                                        {/* Error number badge */}
                                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--red-2)] text-[10px] font-bold text-[var(--red-10)] ring-2 ring-white">
                                          {idx + 1}
                                        </div>

                                        {/* Error content */}
                                        <div className="min-w-0 flex-1">
                                          <p className="text-12 font-semibold text-[var(--gray-13)] leading-relaxed break-words">
                                            {formatted.title}
                                          </p>
                                          {formatted.subtitle && (
                                            <p className="mt-1 text-[11px] font-medium text-[var(--gray-9)] break-words line-clamp-2 group-hover:line-clamp-none transition-all">
                                              {formatted.subtitle}
                                            </p>
                                          )}
                                        </div>

                                        {/* Status indicator */}
                                        <div className="flex items-center shrink-0">
                                          <div className="size-2 rounded-full bg-[var(--red-9)] animate-pulse" />
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Show more indicator */}
                                  {invoiceErrors!.errors.length > 6 && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--red-1)] border border-[var(--red-3)]">
                                      <Icon name="tabler:dots" className="size-4 text-[var(--red-9)]" />
                                      <span className="text-11 font-semibold text-[var(--red-10)]">
                                        +{invoiceErrors!.errors.length - 6} more issue{invoiceErrors!.errors.length - 6 !== 1 ? 's' : ''} detected
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Action footer */}
                                {/* <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[var(--red-3)]">
                                  <Icon name="tabler:shield-exclamation" className="size-4 text-[var(--orange-9)]" />
                                  <span className="text-11 font-semibold text-[var(--gray-11)]">
                                    Policy validation recommended before approval
                                  </span>
                                </div> */}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AnimateSlideUp>
                    )}

                    {hasBackorder && (
                      <AnimateSlideUp delay={0.38}>
                        <div className="flex flex-col gap-2 mt-3">
                          <div className="flex items-center justify-between pl-1">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                              Backorder
                            </div>

                            {(() => {
                              const meta = getRecommendationMeta(backorder?.recommendation);
                              return (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold',
                                    meta.chip
                                  )}
                                >
                                  <Icon name={meta.icon} className="size-3" />
                                  {meta.label}
                                </span>
                              );
                            })()}
                          </div>

                          <div className="rounded-xl border border-[var(--gray-4)] bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[var(--gray-3)] bg-[var(--gray-1)]">
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--orange-1)] text-[var(--orange-9)]">
                                  <Icon name="tabler:truck-delivery" className="size-5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                                    Detected missing quantities
                                  </span>
                                  <span className="text-13 font-bold text-[var(--gray-12)]">
                                    {backorder!.missing_qty_by_item!.length} impacted line(s)
                                  </span>
                                </div>
                              </div>

                              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--orange-3)] bg-[var(--orange-1)] px-2 py-1 text-[10px] font-bold text-[var(--orange-10)]">
                                <Icon name="tabler:alert-triangle" className="size-3" />
                                Short ship risk
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <div className="min-w-[720px]">
                                <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_1fr_1fr] border-b border-[var(--gray-3)] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                                  <div>Description</div>
                                  <div>PO Qty</div>
                                  <div>Inv Qty</div>
                                  <div>Remaining</div>
                                  <div>Value</div>
                                  <div className="text-right">Reason</div>
                                </div>

                                <div className="divide-y divide-[var(--gray-2)]">
                                  {backorder!.missing_qty_by_item!.map((row, idx) => {
                                    const desc = row.description?.trim() || 'Unmapped item';
                                    const invQty = row.invoice_qty ?? '-';
                                    const value =
                                      typeof row.amount === 'number'
                                        ? row.amount
                                        : typeof row.price === 'number' && typeof row.remaining === 'number'
                                          ? row.price * row.remaining
                                          : '-';
                                    const reason = row.reason || 'BACKORDER';

                                    return (
                                      <div
                                        key={idx}
                                        className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_1fr_1fr] items-center px-4 py-2.5 hover:bg-[var(--gray-1)] transition-colors"
                                      >
                                        <div className="text-[var(--gray-12)] pr-4">
                                          <div className="text-12 font-semibold line-clamp-1 hover:line-clamp-none transition-all" title={desc}>
                                            {desc}
                                          </div>
                                          {row.po_line_id && (
                                            <div className="text-[10px] font-medium text-[var(--gray-9)] line-clamp-1 hover:line-clamp-none transition-all">
                                              PO Line: {row.po_line_id}
                                            </div>
                                          )}
                                        </div>

                                        <div className="text-12 font-medium text-[var(--gray-11)]">{row.po_qty}</div>
                                        <div className="text-12 font-medium text-[var(--gray-11)]">{invQty as any}</div>
                                        <div className="text-12 font-bold text-[var(--orange-10)]">{row.remaining}</div>
                                        <div className="text-12 font-bold text-[var(--teal-9)]">{value as any}</div>

                                        <div className="text-right">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-10)]">
                                            {reason}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {backorder?.recommendation && (
                                  <div className="px-4 py-3 border-t border-[var(--gray-3)] bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--gray-10)]">
                                      <Icon name="tabler:route" className="size-4" />
                                      Orchestration recommendation
                                    </div>
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold',
                                        getRecommendationMeta(backorder.recommendation).chip
                                      )}
                                    >
                                      <Icon name={getRecommendationMeta(backorder.recommendation).icon} className="size-3" />
                                      {getRecommendationMeta(backorder.recommendation).label}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AnimateSlideUp>
                    )}

                    {/* History */}
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex items-center gap-2 pl-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                          History
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--gray-4)] bg-white p-4 shadow-sm">
                        <History workflowId={workflowId} processId={processId} enabled={true} />
                      </div>
                    </div>

                    {/* Comments (Moved to Overlay View) */}
                    {/* <div className="flex flex-col gap-2 mt-4"> ... </div> */}


                  </div>
                </div>
              </div>

              {/* Right Column: Third Layout (Comments or Attachments) */}
              {rightView !== 'analysis' && (
                <div className="w-[30%] h-full overflow-hidden rounded-lg animate-in slide-in-from-right-10 duration-300">
                  {rightView === 'comments' ? (
                    /* --- COMMENTS VIEW --- */
                    <div className="h-full flex flex-col bg-white rounded-lg border border-[var(--gray-3)] overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--gray-3)] shrink-0 bg-[var(--gray-1)]">
                        <div className="flex items-center gap-2">
                          <Icon name="tabler:message-circle" className="size-5 text-[var(--blue-9)]" />
                          <span className="font-bold text-[var(--gray-12)]">Comments</span>
                        </div>
                        <button
                          onClick={() => setRightView('analysis')}
                          className="flex items-center justify-center size-8 rounded-lg hover:bg-white text-[var(--gray-9)] transition-all border border-transparent hover:border-[var(--gray-3)] hover:shadow-sm cursor-pointer"
                        >
                          <Icon name="tabler:x" className="size-5" />
                        </button>
                      </div>
                      {/* Content */}
                      <div className="flex-1 overflow-hidden p-0">
                        <Comments
                          workflowId={workflowId}
                          processId={processId}
                          transactionId={transactionId}
                          enabled={true}
                          attachments={selectedItem?.attachments || []}
                          repositoryId={repositoryId}
                        />
                      </div>
                    </div>
                  ) : (
                    /* --- ATTACHMENTS VIEW --- */
                    <div className="h-full flex flex-col bg-white rounded-lg border border-[var(--gray-3)] overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--gray-3)] shrink-0 bg-[var(--gray-1)]">
                        <div className="flex items-center gap-2">
                          <Icon name="tabler:paperclip" className="size-5 text-[var(--blue-9)]" />
                          <span className="font-bold text-[var(--gray-12)]">Attachments</span>
                        </div>
                        <button
                          onClick={() => setRightView('analysis')}
                          className="flex items-center justify-center size-8 rounded-lg hover:bg-white text-[var(--gray-9)] transition-all border border-transparent hover:border-[var(--gray-3)] hover:shadow-sm cursor-pointer"
                        >
                          <Icon name="tabler:x" className="size-5" />
                        </button>
                      </div>
                      {/* Content */}
                      <div className="flex-1 overflow-hidden">
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
                          onClose={() => setRightView('analysis')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

Overview.displayName = 'Overview';
export default Overview;
