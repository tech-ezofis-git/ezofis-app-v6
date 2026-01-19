import { useState, useEffect } from 'react';
import Icon from '@/components/base/icon/Icon';
import { AnimateSlideUp } from '@/components/common/animations';
import { SkeletonCard } from '@/components/common/skeletons';
import cn from '@/utils/cn';
// import Section from '@/pages/dashboard/workflows/shared/components/Section';
import Attachments from '../attachment/Attachments';
import History from "../history/History";
import Comments from "../comment/Comments"

// --- Helper for JSON Syntax Highlighting ---
// const syntaxHighlight = (json: any) => {
//   if (typeof json !== 'string') {
//     json = JSON.stringify(json, undefined, 2);
//   }
//   json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
//   return json.replace(
//     /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
//     function (match: string) {
//       let cls = 'text-[var(--blue-11)]'; // number
//       if (/^"/.test(match)) {
//         if (/:$/.test(match)) {
//           cls = 'text-[var(--purple-11)]'; // key
//         } else {
//           cls = 'text-[var(--green-11)]'; // string
//         }
//       } else if (/true|false/.test(match)) {
//         cls = 'text-[var(--orange-11)]'; // boolean
//       } else if (/null/.test(match)) {
//         cls = 'text-[var(--gray-10)]'; // null
//       }
//       return `<span class="${cls}">${match}</span>`;
//     }
//   );
// };

// --- Types ---
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
  'Total Due'?: string;
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
  invoice_errors?: {
    severity: string;
    errors: Array<string>;
  };
  reqNo?: string;
}

const Overview = ({ agentData, workflowId,
  processId,
  transactionId,
  repositoryId,
  selectedItem,
  rawWorkflowData, }: any) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // const [activeTab, setActiveTab] = useState<'extracted' | 'matching' | 'po'>('extracted');
  // const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const defaultAgentData: AgentData = {
    decision: 'APPROVED',
    score: 94,
    reason: 'The invoice from Silverline Auto Parts matches the PO exactly. All line items and totals are verified against the master record.',
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

  const data: AgentData = agentData || defaultAgentData;

  const fieldMatching = data.debug?.['Side-by-side Field Matching'] || [];
  const lineItemMatching = data.debug?.['Side-by-side Line Item matching'] || [];
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header as any;

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

  const getScoreBandClass = (score: number) => {
    if (score >= 90) return 'bg-white border-[var(--green-6)] text-[var(--green-11)]';
    if (score >= 70) return 'bg-white border-[var(--yellow-6)] text-[var(--yellow-11)]';
    return 'bg-white border-[var(--red-6)] text-[var(--red-11)]';
  };

  const getDecisionTitle = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Review';
      case 'PARTIAL': return 'Partial';
      default: return 'Unknown';
    }
  };

  // const handleTabChange = (tab: 'extracted' | 'matching' | 'po') => {
  //   setActiveTab(tab);
  //   setCopied(false);
  // };

  // const getCurrentJsonData = () => {
  //   if (activeTab === 'extracted') return data['Extracted Invoice JSON'];
  //   if (activeTab === 'matching') return data.debug;
  //   if (activeTab === 'po') return data.po_row;
  //   return {};
  // };

  // const currentJsonData = getCurrentJsonData();
  // const hasJsonData = currentJsonData && Object.keys(currentJsonData).length > 0;

  // const handleCopy = () => {
  //   const textToCopy = JSON.stringify(currentJsonData, null, 2);
  //   navigator.clipboard.writeText(textToCopy);
  //   setCopied(true);
  //   setTimeout(() => setCopied(false), 2000);
  // };
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
          nextActionDate: 'Due Feb 12',
          nextActionIcon: 'tabler:calendar-dollar'
        };
      case 'REJECTED':
        return {
          statusTitle: 'Review Required',
          colorVar: 'red',
          icon: 'tabler:alert-octagon',
          progressColor: 'bg-[var(--red-9)]',
          badgeText: 'Flagged',
          badgeBg: 'bg-[var(--red-3)]',
          badgeColor: 'text-[var(--red-11)]',
          nextAction: 'Review Invoice',
          nextActionDate: 'Urgent',
          nextActionIcon: 'tabler:alert-triangle'
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
          nextActionIcon: 'tabler:list-search'
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
          nextActionIcon: 'tabler:clock'
        };
    }
  };

  const banner = getBannerConfig(statusAttr);
  // const colorVar = banner.colorVar;
  return (
    <>
      {/* Main Layout Container: 
         - Uses h-screen minus header offset to fit exactly on screen
         - Flex column to stack Banner on top, Split pane on bottom
      */}
      <div className="flex flex-col  gap-3 h-full overflow-hidden p-0">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* 1. TOP STAT/DECISION BANNER (Compact) */}
            {/* 1. TOP STAT/DECISION BANNER (Pixel-aligned to reference) */}
            {/* 1. TOP STAT/DECISION BANNER (Simple, no card layout, with divider like reference) */}
            {/* 1. TOP STAT/DECISION BANNER (Simple, no card layout, full AI Analysis text) */}
            <div className="w-full px-4 my-4">
              <AnimateSlideUp delay={0.25}>
                {/* CARD CONTAINER */}
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

                    {/* VERTICAL DIVIDER 1 */}
                    {/* <div className="h-12 w-px bg-[var(--gray-3)] shrink-0" /> */}

                    {/* MIDDLE: AI Analysis */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-start gap-3 h-full">
                        {/* Visual Indicator Line */}
                        <div className="w-2 self-stretch rounded-full bg-[#8B5CF6] opacity-30" />

                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon name="tabler:sparkles" className="size-3.5 text-[#8B5CF6]" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-10)]">
                              AI Analysis
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

                    {/* VERTICAL DIVIDER 2 */}
                    <div className="h-12 w-px bg-[var(--gray-3)] shrink-0" />

                    {/* RIGHT: Action */}
                    {/* RIGHT: Next Action */}
                    <div className="flex items-center gap-5 shrink-0 justify-end">

                      {/* Text Label & Action Name */}
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-9)] mb-0.5">
                          Next Action
                        </span>
                        <span className="text-[14px] font-bold text-[var(--gray-12)]">
                          {banner.nextAction}
                        </span>
                      </div>

                      {/* Date & Terms Card */}
                      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--gray-3)] bg-white shadow-sm min-w-[160px]">

                        {/* Icon Container */}
                        <div className="size-9 rounded-md flex items-center justify-center bg-[#FFEDD5]/50 text-[#F97316] shrink-0">
                          <Icon name="tabler:calendar" className="size-5" />
                        </div>

                        {/* Text Details */}
                        <div className="flex flex-col justify-center">

                          {/* Top Line: Due Date + Dot */}
                          <div className="flex items-center gap-1.5 leading-none mb-1">
                            <span className="text-[13px] font-bold text-[var(--gray-12)] whitespace-nowrap">
                              Due {banner.nextActionDate}
                            </span>
                            <div className="size-1.5 rounded-full bg-[#F97316]" />
                          </div>

                          {/* Bottom Line: Clock + Terms */}
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



            {/* 2. SPLIT VIEW (Fills remaining height) */}
            <div className="flex flex-1  gap-4 overflow-hidden h-full">

              {/* Left Column: Attachments */}
              <div className="w-1/2 h-full overflow-hidden rounded-lg border border-[var(--gray-3)] bg-white">
                <div className="h-full w-full overflow-y-auto  scrollbar-thin">
                  <Attachments
                    workflowId={workflowId}
                    processId={processId}
                    transactionId={transactionId}
                    repositoryId={repositoryId}
                    selectedItem={selectedItem}
                    rawWorkflowData={rawWorkflowData}
                  />
                </div>
              </div>

              {/* Right Column: Analysis Data */}
              <div className="w-1/2 h-full overflow-hidden rounded-lg">
                <div className="h-full overflow-y-auto space-y-3 pr-1 pb-10 scrollbar-thin">
                  <AnimateSlideUp delay={0.4}>
                    <div className="flex flex-col gap-2">
                      {/* Header Title */}
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)] pl-1">
                        Invoice Summary
                      </div>

                      {/* Main Card */}
                      <div id="section-summary" className="rounded-xl border border-[var(--gray-4)] bg-white p-4 shadow-sm">
                        {invoiceHeader && (
                          <div className="grid grid-cols-2 gap-y-5 gap-x-4">

                            {/* 1. Supplier - PURPLE THEME */}
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--purple-1)] text-[var(--purple-9)]">
                                <Icon name="tabler:building-skyscraper" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">Supplier</span>
                                <span className="truncate text-13 font-bold text-[var(--gray-12)]">
                                  {invoiceHeader['Supplier Name'] || '-'}
                                </span>
                              </div>
                            </div>

                            {/* 2. PO Number - BLUE THEME */}
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-1)] text-[var(--blue-9)]">
                                <Icon name="tabler:file-text" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">PO Number</span>
                                <span className="truncate text-13 font-bold text-[var(--gray-12)]">
                                  {invoiceHeader['PO Number'] || '-'}
                                </span>
                              </div>
                            </div>

                            {/* 3. Currency - ORANGE THEME */}
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--orange-1)] text-[var(--orange-9)]">
                                <Icon name="tabler:coins" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">Currency</span>
                                <span className="truncate text-13 font-bold text-[var(--gray-12)]">
                                  {invoiceHeader['Currency'] || 'USD'}
                                </span>
                              </div>
                            </div>

                            {/* 4. Total Due - GREEN THEME */}
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--green-1)] text-[var(--green-9)]">
                                <Icon name="tabler:currency-dollar" className="size-5" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-medium text-[var(--gray-9)]">Total Due</span>
                                <span className="truncate text-13 font-bold text-[var(--green-10)]">
                                  {!invoiceHeader['Currency'] && '$'}
                                  {invoiceHeader['Total Due'] || '-'}
                                </span>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>
                  </AnimateSlideUp>

                  {/* --- SECTION 1: FIELD MATCHING --- */}
                  {/* --- SECTION 1: FIELD MATCHING (Compact Grid Design) --- */}
                  <AnimateSlideUp delay={0.3}>
                    <div className="flex flex-col gap-2 mb-6">

                      {/* Header - GRAY */}
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)] pl-1">
                        Field Matching
                      </div>

                      {/* Grid Layout for Compactness */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {fieldMatching.length > 0 ? (
                          fieldMatching.map((field, index) => {
                            const displayInvoice = field['Invoice Value'] || '-';
                            const displayPO = field['PO Value'] || '-';
                            const isPerfect = field.Score === 100;

                            return (
                              <div key={index} className="flex flex-col gap-3 rounded-xl border border-[var(--gray-3)] bg-white p-3 shadow-sm">

                                {/* Header: Title & Score */}
                                <div className="flex items-center justify-between">
                                  <span className="text-13 font-bold text-[var(--gray-12)] truncate" title={field.Field}>
                                    {field.Field}
                                  </span>

                                  <div className={cn(
                                    "flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold",
                                    isPerfect
                                      ? "border-[var(--green-4)] bg-[var(--green-1)] text-[var(--green-9)]"
                                      : "border-[var(--orange-4)] bg-[var(--orange-1)] text-[var(--orange-9)]"
                                  )}>
                                    {isPerfect && <Icon name="tabler:check" className="size-3" />}
                                    {field.Score}%
                                  </div>
                                </div>

                                {/* Compact Gray Boxes for Values */}
                                <div className="grid grid-cols-2 gap-2 h-full">

                                  {/* 1. Extracted */}
                                  <div className="flex flex-col justify-center rounded-lg bg-[var(--gray-1)] px-2.5 py-2 border border-transparent">
                                    <div className="text-[9px] font-medium text-[var(--gray-8)] uppercase tracking-wide mb-0.5">
                                      Extracted
                                    </div>
                                    <div className="text-12 font-semibold text-[var(--gray-12)] break-all leading-tight line-clamp-2" title={String(displayInvoice)}>
                                      {displayInvoice}
                                    </div>
                                  </div>

                                  {/* 2. PO Value */}
                                  <div className="flex flex-col justify-center rounded-lg bg-[var(--gray-1)] px-2.5 py-2 border border-transparent">
                                    <div className="text-[9px] font-medium text-[var(--gray-8)] uppercase tracking-wide mb-0.5">
                                      PO Value
                                    </div>
                                    <div className="text-12 font-semibold text-[var(--gray-12)] break-all leading-tight line-clamp-2" title={String(displayPO)}>
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


                  {/* --- SECTION 2: LINE ITEMS (Compact) --- */}
                  <AnimateSlideUp delay={0.35}>
                    <div className="flex flex-col gap-2">

                      {/* Header - GRAY */}
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)] pl-1">
                        Line Items
                      </div>

                      {/* Main White Card */}
                      <div id="section-line-items" className="rounded-xl border border-[var(--gray-4)] bg-white shadow-sm overflow-hidden">

                        <div className="overflow-x-auto">
                          {lineItemMatching.length > 0 ? (
                            <div className="min-w-[600px]">
                              {/* Table Header */}
                              <div className="grid grid-cols-[2fr_0.8fr_0.8fr_1fr_1fr] border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                                <div>Description</div>
                                <div>Qty</div>
                                <div>Price</div>
                                <div>Total</div>
                                <div className="text-right">Match Status</div>
                              </div>

                              {/* Table Body */}
                              <div className="divide-y divide-[var(--gray-2)]">
                                {lineItemMatching.map((item, index) => {
                                  const isMatch = item['Line Score'] >= 90;

                                  const renderCell = (actual: any, expected: any) => {
                                    const displayActual = actual || "-";
                                    const showExpected = !isMatch && expected;

                                    return (
                                      <div className="flex flex-col leading-tight">
                                        <span className={cn('truncate text-11 font-medium', !actual && 'text-[var(--gray-8)] italic')}>
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

                                      {/* Desc */}
                                      <div className="text-[var(--gray-12)] pr-4">
                                        {renderCell(item.Description['Invoice Value'], item.Description['PO Value'])}
                                      </div>

                                      {/* Qty */}
                                      <div className="text-[var(--gray-11)]">
                                        {renderCell(item.Quantity['Invoice Value'], item.Quantity['PO Value'])}
                                      </div>

                                      {/* Price */}
                                      <div className="text-[var(--gray-11)]">
                                        {renderCell(item.Price['Invoice Value'], item.Price['PO Value'])}
                                      </div>

                                      {/* Amount */}
                                      <div className="font-bold text-[var(--teal-9)]">
                                        {renderCell(item.Amount['Invoice Value'], item.Amount['PO Value'])}
                                      </div>

                                      {/* Status Badge */}
                                      <div className="text-right">
                                        <span className={cn(
                                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border',
                                          isMatch
                                            ? 'border-[var(--green-2)] bg-[var(--green-1)] text-[var(--green-9)]'
                                            : 'border-[var(--red-2)] bg-[var(--red-1)] text-[var(--red-9)]'
                                        )}>
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
                  {/* Summary Header */}

                  {/* History & Comments - Styled as Cards */}
                  <div className="grid grid-cols-1 gap-5">
                    {/* History Card - Indigo Theme */}
                    <div className="flex flex-col gap-2 mt-6">
                      {/* Floating Header - GRAY */}
                      <div className="flex items-center gap-2 pl-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                          History
                        </div>
                      </div>

                      {/* Main White Card */}
                      <div className="rounded-xl border border-[var(--gray-4)] bg-white p-4 shadow-sm">
                        <History workflowId={workflowId} processId={processId} enabled={true} />
                      </div>
                    </div>

                    {/* Comments Card - Orange Theme */}
                    <div className="flex flex-col gap-2 mt-3">
                      {/* Floating Header - GRAY */}
                      <div className="flex items-center gap-2 pl-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gray-9)]">
                          Comments
                        </div>
                      </div>

                      {/* Main White Card */}
                      <div className="rounded-xl border border-[var(--gray-4)] bg-white shadow-sm overflow-hidden">
                        {/* Internal padding removed (p-0) as requested since component handles it */}
                        <div className="p-0">
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
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

Overview.displayName = 'Overview';
export default Overview;