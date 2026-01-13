import { useState, useEffect } from 'react';
import Icon from '@/components/base/icon/Icon';
import { AnimateSlideUp } from '@/components/common/animations';
import { SkeletonCard } from '@/components/common/skeletons';
import cn from '@/utils/cn';
import Section from '@/pages/dashboard/workflows/shared/components/Section';

// --- Helper for JSON Syntax Highlighting ---
const syntaxHighlight = (json: any) => {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match: string) {
      let cls = 'text-[var(--blue-11)]'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-[var(--purple-11)]'; // key
        } else {
          cls = 'text-[var(--green-11)]'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-[var(--orange-11)]'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-[var(--gray-10)]'; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
};

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
  Currency?: string;
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

interface Props {
  agentData?: AgentData;
}

// --- Component: Stat Card ---
interface StatCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: string;
  colorVar: string;
  progress?: number;
  isLoading?: boolean;
  onClick?: () => void;
}

const StatCard = ({ title, value, subtext, icon, colorVar, progress = 100, isLoading, onClick }: StatCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--gray-3)] bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md",
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
    >
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-8 rounded-md bg-[var(--gray-3)]"></div>
          <div className="h-8 w-24 rounded-md bg-[var(--gray-3)]"></div>
          <div className="h-4 w-16 rounded-md bg-[var(--gray-3)]"></div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-4">
              {/* Icon & Title Group */}
              <div className="flex items-center gap-3">
                <div
                  className="flex size-9 items-center justify-center rounded-lg border shadow-sm"
                  style={{
                    backgroundColor: `var(--${colorVar}-2)`,
                    borderColor: `var(--${colorVar}-4)`,
                    color: `var(--${colorVar}-11)`
                  }}
                >
                  <Icon name={icon} className="size-5" />
                </div>
                <span className="text-14 font-semibold text-[var(--gray-11)]">{title}</span>
              </div>

              {/* Value */}
              <div className="text-28 font-bold text-[var(--gray-13)] tracking-tight">
                {value}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-13 font-medium text-[var(--gray-9)]">{subtext}</span>
            <div className="flex size-6 items-center justify-center rounded-full bg-[var(--green-3)] text-[var(--green-11)]">
              <Icon name="tabler:check" className="size-3.5" />
            </div>
          </div>

          {/* Progress Bar at bottom */}
          <div className="absolute bottom-0 left-0 h-1.5 w-full bg-[var(--gray-2)]">
            <div
              className="h-full transition-all duration-1000 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: `var(--${colorVar}-9)`
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};


const Overview = ({ agentData }: Props) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'extracted' | 'matching' | 'po'>('extracted');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // --- Scroll Handler ---
  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const defaultAgentData: AgentData = {
    decision: 'APPROVED',
    score: 94,
    reason: 'The invoice from Silverline Auto Parts matches the PO exactly. All line items and totals are verified.',
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
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header;

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
      case 'APPROVED': return 'Invoice Approved';
      case 'REJECTED': return 'Invoice Review Required';
      case 'PARTIAL': return 'Partial Approval';
      default: return 'Invoice Status Unknown';
    }
  };

  const handleTabChange = (tab: 'extracted' | 'matching' | 'po') => {
    setActiveTab(tab);
    setCopied(false);
  };

  const getCurrentJsonData = () => {
    if (activeTab === 'extracted') return data['Extracted Invoice JSON'];
    if (activeTab === 'matching') return data.debug;
    if (activeTab === 'po') return data.po_row;
    return {};
  };

  // Check if current active tab data is available
  const currentJsonData = getCurrentJsonData();
  const hasJsonData = currentJsonData && Object.keys(currentJsonData).length > 0;

  const handleCopy = () => {
    const textToCopy = JSON.stringify(currentJsonData, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fieldMatchingScore = fieldMatching.length > 0
    ? Math.round(fieldMatching.reduce((acc, field) => acc + field.Score, 0) / fieldMatching.length)
    : 0;

  return (
    <Section title="">
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              <AnimateSlideUp delay={0.05}>
                <StatCard
                  title="AI Confidence"
                  value={`${data.score ? data.score : 0}%`}
                  subtext="Match Confidence"
                  icon="tabler:brain"
                  colorVar="primary"
                  progress={data.score}
                  onClick={() => handleScrollTo('section-confidence')}
                />
              </AnimateSlideUp>

              <AnimateSlideUp delay={0.1}>
                <StatCard
                  title="Field Matching"
                  value={`${fieldMatchingScore}%`}
                  subtext="Avg. Field Score"
                  icon="tabler:scan-eye"
                  colorVar="blue"
                  progress={fieldMatchingScore}
                  onClick={() => handleScrollTo('section-field-matching')}
                />
              </AnimateSlideUp>

              <AnimateSlideUp delay={0.15}>
                <StatCard
                  title="Line Items"
                  value={`${lineItemMatching.length}`}
                  subtext="Items processed"
                  icon="tabler:list-details"
                  colorVar="teal"
                  progress={100}
                  onClick={() => handleScrollTo('section-line-items')}
                />
              </AnimateSlideUp>

              <AnimateSlideUp delay={0.2}>
                <StatCard
                  title="Total Value"
                  value={invoiceHeader ? invoiceHeader['Total Due'] || '0.00' : '0.00'}
                  subtext="Invoice Amount"
                  icon="tabler:currency-dollar"
                  colorVar="orange"
                  progress={100}
                  onClick={() => handleScrollTo('section-summary')}
                />
              </AnimateSlideUp>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-2 flex flex-col gap-6">

                {/* Decision Banner (ID: section-confidence) */}
                <AnimateSlideUp delay={0.25}>
                  <div
                    id="section-confidence"
                    className={cn('scroll-mt-24 relative h-full overflow-hidden rounded-xl border bg-white shadow-sm border-l-4', decisionTheme.bannerBorder, 'border-[var(--gray-3)]')}
                  >
                    <div className="flex flex-col gap-4 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className={cn('size-6', decisionTheme.iconColor)} name={statusAttr === 'APPROVED' ? 'tabler:circle-check-filled' : statusAttr === 'REJECTED' ? 'tabler:alert-octagon-filled' : 'tabler:alert-circle-filled'} />
                          <div className={cn('text-20 font-bold', decisionTheme.titleColor)}>{getDecisionTitle(statusAttr)}</div>
                        </div>

                        <div className={cn('flex items-center gap-2 rounded-full px-4 py-1.5 text-13 font-bold', decisionTheme.badge)}>
                          {data.score}% Score
                        </div>
                      </div>

                      <div className={cn('rounded-lg border p-4', decisionTheme.box)}>
                        <div className="flex gap-3">
                          <Icon className={cn('mt-0.5 size-5 shrink-0', decisionTheme.iconColor)} name="tabler:info-circle" />
                          <div>
                            <div className={cn('mb-1 text-12 font-bold uppercase tracking-wide', decisionTheme.titleColor)}>Reasoning</div>
                            <div className="text-14 leading-relaxed text-[var(--gray-12)]">{data.reason}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimateSlideUp>

                {/* Field Matching Grid (ID: section-field-matching) - BLUE THEME */}
                <AnimateSlideUp delay={0.3}>
                  <div
                    id="section-field-matching"
                    className="scroll-mt-24 rounded-xl border border-[var(--blue-4)] bg-[var(--blue-1)] shadow-sm"
                  >
                    <div className="border-b border-[var(--blue-3)] bg-[var(--blue-2)] px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="size-5 text-[var(--blue-9)]" name="tabler:layout-list" />
                        <div className="text-15 font-semibold text-[var(--gray-13)]">Field Matching Breakdown</div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {fieldMatching.length > 0 ? (
                          fieldMatching.map((field, index) => {
                            const bandClass = getScoreBandClass(field.Score);
                            return (
                              <div key={index} className="group relative overflow-hidden rounded-lg border border-[var(--blue-3)] bg-white transition-all duration-200 hover:border-[var(--blue-5)] hover:shadow-md">
                                <div className="p-4">
                                  <div className="mb-3 flex items-center justify-between border-b border-[var(--gray-2)] pb-2">
                                    <div className="text-13 font-bold text-[var(--gray-12)] truncate pr-2">{field.Field}</div>
                                    <div className={cn('flex items-center justify-center min-w-[3rem] rounded-full border px-2 py-0.5 text-11 font-bold', bandClass)}>
                                      {field.Score}%
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div>
                                      <div className="text-10 font-medium uppercase tracking-wider text-[var(--gray-9)] mb-0.5">Extracted</div>
                                      <div className="text-13 font-semibold text-[var(--gray-13)] break-all">{String(field['Invoice Value'])}</div>
                                    </div>
                                    <div>
                                      <div className="text-10 font-medium uppercase tracking-wider text-[var(--gray-9)] mb-0.5">PO Value</div>
                                      <div className="text-13 font-medium text-[var(--gray-11)] break-all">{String(field['PO Value'])}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full rounded-lg bg-[var(--blue-2)] p-6 text-center text-13 text-[var(--blue-10)]">
                            No field matching data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimateSlideUp>

                {/* Line Items Table (ID: section-line-items) - TEAL THEME */}
                <AnimateSlideUp delay={0.35}>
                  <div
                    id="section-line-items"
                    className="scroll-mt-24 overflow-hidden rounded-xl border border-[var(--teal-4)] bg-[var(--teal-1)] shadow-sm"
                  >
                    <div className="border-b border-[var(--teal-3)] bg-[var(--teal-2)] px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="size-5 text-[var(--teal-9)]" name="tabler:list-check" />
                        <div className="text-15 font-semibold text-[var(--gray-13)]">Line Items</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {lineItemMatching.length > 0 ? (
                        <table className="w-full text-left text-13">
                          <thead>
                            <tr className="bg-[var(--teal-2)] text-11 font-bold uppercase tracking-wider text-[var(--teal-9)] border-b border-[var(--teal-3)]">
                              <th className="px-6 py-3">Description</th>
                              <th className="px-6 py-3">Qty</th>
                              <th className="px-6 py-3">Price</th>
                              <th className="px-6 py-3">Total</th>
                              <th className="px-6 py-3 text-right">Match</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--teal-3)]">
                            {lineItemMatching.map((item, index) => {
                              const score = item['Line Score'];
                              const isMatch = score >= 90;
                              return (
                                <tr key={index} className="transition-colors hover:bg-[var(--teal-2)]">
                                  <td className="px-6 py-4 align-top">
                                    <div className="font-semibold text-[var(--gray-13)]">{item.Description['Invoice Value']}</div>
                                    {!isMatch && (
                                      <div className="mt-1 flex items-center gap-1 text-12 text-[var(--orange-11)]">
                                        <Icon name="tabler:arrow-right" className="size-3" />
                                        Expected: {item.Description['PO Value']}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 align-top text-[var(--gray-11)]">{item.Quantity['Invoice Value']}</td>
                                  <td className="px-6 py-4 align-top text-[var(--gray-11)]">{item.Price['Invoice Value']}</td>
                                  <td className="px-6 py-4 align-top font-bold text-[var(--gray-12)]">{item.Amount['Invoice Value']}</td>
                                  <td className="px-6 py-4 align-top text-right">
                                    <div className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-11 font-bold', isMatch ? 'border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]' : 'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]')}>
                                      {isMatch ? 'Match' : 'Mismatch'}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-8 text-center text-[var(--teal-10)]">No line items found.</div>
                      )}
                    </div>
                  </div>
                </AnimateSlideUp>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-1 space-y-6">

                {/* Invoice Summary (ID: section-summary) - PURPLE THEME */}
                <AnimateSlideUp delay={0.4}>
                  <div
                    id="section-summary"
                    className="scroll-mt-24 overflow-hidden rounded-xl border border-[var(--purple-4)] bg-[var(--purple-1)] shadow-sm"
                  >
                    <div className="border-b border-[var(--purple-3)] bg-[var(--purple-2)] px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="size-5 text-[var(--purple-9)]" name="tabler:file-invoice" />
                        <div className="text-15 font-semibold text-[var(--gray-13)]">Summary</div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {invoiceHeader && (
                        <>
                          <div className="flex flex-col gap-1">
                            <label className="text-11 font-medium text-[var(--purple-9)] uppercase tracking-wide">Supplier</label>
                            <div className="text-14 font-semibold text-[var(--gray-12)]">{invoiceHeader['Supplier Name'] || 'N/A'}</div>
                          </div>
                          <div className="h-px bg-[var(--purple-3)]" />
                          <div className="flex flex-col gap-1">
                            <label className="text-11 font-medium text-[var(--purple-9)] uppercase tracking-wide">PO Number</label>
                            <div className="text-14 font-semibold text-[var(--gray-12)]">{invoiceHeader['PO Number'] || 'N/A'}</div>
                          </div>
                          <div className="h-px bg-[var(--purple-3)]" />
                          <div className="flex items-center justify-between">
                            <label className="text-11 font-medium text-[var(--purple-9)] uppercase tracking-wide">Currency</label>
                            <div className="text-14 font-medium text-[var(--gray-12)]">{invoiceHeader.Currency || 'N/A'}</div>
                          </div>

                          <div className="mt-2 rounded-lg bg-[var(--primary-2)] p-4 border border-[var(--primary-4)]">
                            <label className="text-12 font-medium text-[var(--primary-9)]">Total Amount Due</label>
                            <div className="text-24 font-bold text-[var(--primary-11)]">{invoiceHeader['Total Due'] || 'N/A'}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </AnimateSlideUp>

                {/* JSON VIEWER - GRAY THEME */}
                {hasJsonData && (
                  <AnimateSlideUp delay={0.45}>
                    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--gray-4)] bg-[var(--gray-1)] shadow-sm">
                      {/* Control Bar */}
                      <div className="p-3 border-b border-[var(--gray-3)] bg-[var(--gray-2)]">
                        {/* Tabs */}
                        <div className="flex w-full items-center gap-1 rounded-lg bg-[var(--gray-4)] p-1">
                          <button onClick={() => handleTabChange('extracted')} className={cn('flex-1 rounded-md py-1.5 text-11 font-bold uppercase tracking-wide transition-all', activeTab === 'extracted' ? 'bg-white text-[var(--gray-12)] shadow-sm' : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]')}>
                            Extracted
                          </button>
                          <button onClick={() => handleTabChange('matching')} className={cn('flex-1 rounded-md py-1.5 text-11 font-bold uppercase tracking-wide transition-all', activeTab === 'matching' ? 'bg-white text-[var(--gray-12)] shadow-sm' : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]')}>
                            Matches
                          </button>
                          <button onClick={() => handleTabChange('po')} className={cn('flex-1 rounded-md py-1.5 text-11 font-bold uppercase tracking-wide transition-all', activeTab === 'po' ? 'bg-white text-[var(--gray-12)] shadow-sm' : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]')}>
                            PO Data
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <button onClick={handleCopy} className="absolute right-3 top-3 z-10 rounded-md bg-[var(--gray-2)] p-1.5 text-[var(--gray-9)] hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)]">
                          <Icon name={copied ? 'tabler:check' : 'tabler:copy'} className="size-4" />
                        </button>
                        <div className="h-[300px] overflow-auto bg-white p-4">
                          <pre className="font-mono text-11 leading-relaxed text-[var(--gray-12)]" dangerouslySetInnerHTML={{ __html: syntaxHighlight(currentJsonData) }} />
                        </div>
                      </div>
                    </div>
                  </AnimateSlideUp>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Section>
  );
};

Overview.displayName = 'Overview';
export default Overview;