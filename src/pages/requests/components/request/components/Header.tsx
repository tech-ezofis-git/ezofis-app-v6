import React from 'react'
import IconButton from '@/components/base/button/IconButton'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { Brain } from 'lucide-react';

interface HeaderProps {
  requestNo: string
  isLoading: boolean
  stage?: any
  raisedBy?: any
  raisedAt: any
  onNext?: () => void
  onPrev?: () => void
  onBack?: () => void
  onApprove?: (action: string) => void
  approveLoading?: boolean
  rightView: 'analysis' | 'comments' | 'attachments' | 'forms'
  setRightView: (view: 'analysis' | 'comments' | 'attachments' | 'forms') => void
  hideActions?: boolean
  showApprove?: boolean
  attachmentCount?: number
  commentsCount?: number
  actions?: any[]
  isEditing?: boolean
  totalAmount?: string
  currency?: string
  status?: string
  agentData?: any
  poValue?: string | number
  poNumber?: string
  onManualCorrection?: () => void
}

const Header: React.FC<HeaderProps> = ({
  requestNo,
  isLoading,
  onNext,
  onPrev,
  onBack,
  onApprove,
  approveLoading,
  hideActions,
  actions,
  isEditing = false,
  totalAmount,
  currency,
  status = 'Pending Review',
  agentData,
  poValue,
  poNumber,
  onManualCorrection: _onManualCorrection
}) => {
  const [showAIInsights, setShowAIInsights] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowAIInsights(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insightContent = agentData?.reason || agentData?.summary || agentData?.['Extracted Invoice JSON']?.reason || '';

  // Simple highlighting logic for common terms
  const renderHighlightedContent = (text: string) => {
    if (!text) return null;

    // Highlight percentages, scores, and statuses
    const parts = text.split(/(\d+%|Approved|Partially Approved|Matched|Discrepancy|Aligned|Threshold)/gi);
    return parts.map((part, i) => {
      const lower = part.toLowerCase();
      if (/\d+%/.test(part)) return <span key={i} className="text-[var(--primary-9)] font-bold">{part}</span>;
      if (lower === 'approved' || lower === 'matched' || lower === 'aligned') return <span key={i} className="text-[var(--green-9)] font-bold">{part}</span>;
      if (lower === 'partially approved' || lower === 'threshold') return <span key={i} className="text-[var(--orange-9)] font-bold">{part}</span>;
      if (lower === 'discrepancy') return <span key={i} className="text-[var(--red-9)] font-bold">{part}</span>;
      return part;
    });
  };

  return (
    <OverlayHeaderWrapper className='h-14 justify-between gap-4 px-4 bg-white'>

      {/* Left Side Group: Request Number + Navigation Buttons */}
      <div className='flex items-center gap-4 bg-white p-0 '>
        <IconButton
          color='gray'
          icon='tabler:arrow-left'
          variant='ghost'
          onClick={onBack}
          className="cursor-pointer hover:bg-[var(--gray-2)]"
          size="sm"
        />

        <div className="flex flex-col pb-1">
          <div className="flex items-center gap-3">
            <IconButton
              color='gray'
              icon='tabler:chevron-left'
              variant='ghost'
              disabled={!onPrev || isLoading}
              onClick={onPrev}
              className="cursor-pointer hover:bg-white size-7"
              size="sm"
            />
            <h1 className='text-[15px] font-semibold text-[var(--gray-13)] tracking-tight'>
              {isLoading ? (
                <span className="animate-pulse rounded bg-gray-200 px-2 text-transparent">INV-0000-000</span>
              ) : (
                requestNo
              )}
            </h1>
            <IconButton
              color='gray'
              icon='tabler:chevron-right'
              variant='ghost'
              disabled={!onNext || isLoading}
              onClick={onNext}
              className="cursor-pointer hover:bg-white size-7"
              size="sm"
            />
            {!isLoading && (
              <span className="bg-[var(--orange-1)] text-[var(--orange-9)] px-3 py-1 rounded-full text-[11px] font-semibold border border-[var(--orange-3)]">
                {status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Group: Total Amount + Actions */}
      <div className='flex items-center gap-6'>
        {(() => {
          const getCurrencyDisplay = (curr: string) => {
            if (!curr) return '$';
            const symbols: { [key: string]: string } = {
              'USD': '$', 'CAD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'AED': 'د.إ', 'AUD': '$', 'SGD': '$'
            };
            const code = curr.length === 3 ? curr.toUpperCase() : null;
            const symbol = symbols[code || ''] || (curr.length === 1 ? curr : '$');
            if (code && code !== symbol) return `${code} - ${symbol}`;
            return symbol;
          };

          const formatAmount = (val: any) => {
            if (!val || val === '0.00') return '0.00';
            const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
            return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          };

          const currDisplay = getCurrencyDisplay(currency || '');

          const rawPoVal = (poNumber && poNumber !== 'N/A') ? poNumber : (
            agentData?.['Extracted Invoice JSON']?.invoice_header?.['PO Number'] ||
            agentData?.['Extracted Invoice JSON']?.invoice_header?.['po_number'] ||
            agentData?.po_matching?.po_number ||
            agentData?.po_matching?.poNumber ||
            agentData?.po_matching?.po ||
            ''
          );

          const extractStringOnly = (val: any): string => {
            if (!val) return '';
            if (typeof val === 'object') {
              const inner = val['Invoice Value'] ?? val.value ?? val['PO Value'] ?? val.val ?? val.text;
              if (inner && typeof inner !== 'object') return String(inner).trim();
              for (const k of Object.keys(val)) {
                if (val[k] && typeof val[k] !== 'object' && String(val[k]).trim() !== '-' && String(val[k]).trim() !== '') {
                  return String(val[k]).trim();
                }
              }
              return '';
            }
            return String(val).trim();
          };

          const resolvedPoVal = extractStringOnly(rawPoVal);
          const poValToDisplay = (resolvedPoVal && resolvedPoVal !== '-' && resolvedPoVal.toUpperCase() !== 'N/A') ? resolvedPoVal : 'N/A';

          const matchingStatus = agentData?.po_matching?.status ||
            (agentData?.decision === 'APPROVED' ? 'Matched' : 'Pending');

          return (
            <div className="flex items-center gap-3 pr-3">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-semibold text-[var(--gray-11)] leading-none mb-1">PO Number</span>
                <span className="text-[13px] font-semibold text-[var(--gray-13)] leading-none">
                  {poValToDisplay}
                </span>
              </div>
              <div className="flex flex-col border-l border-[var(--gray-3)] pl-3 text-right">
                <span className="text-[10px] font-semibold text-[var(--gray-11)] leading-none mb-1">Matching Status</span>
                <span className={cn(
                  "text-[13px] font-semibold leading-none",
                  matchingStatus === 'Matched' || matchingStatus === 'APPROVED' ? "text-[var(--green-9)]" : "text-[var(--orange-9)]"
                )}>
                  {matchingStatus}
                </span>
              </div>
              <div className="flex flex-col border-l border-[var(--gray-3)] pl-3 text-right">
                <span className="text-[10px] font-semibold text-[var(--gray-11)] leading-none mb-1">Invoice Value</span>
                <span className="text-[13px] font-semibold text-[var(--gray-13)] leading-none">
                  {currDisplay} {formatAmount(totalAmount)}
                </span>
              </div>
              <div className="flex flex-col border-l border-[var(--gray-3)] pl-3 text-right">
                <span className="text-[10px] font-semibold text-[var(--gray-11)] leading-none mb-1">PO Value</span>
                <span className="text-[13px] font-semibold text-[var(--primary-9)] leading-none">
                  {currDisplay} {formatAmount(poValue)}
                </span>
              </div>
            </div>
          );
        })()}

        {/* AI Insights Toggle & Overlay */}
        <div className="flex items-center gap-3 relative" ref={containerRef}>
          <Button
            onClick={() => setShowAIInsights(!showAIInsights)}
            variant="outline"
            className={cn(
              "cursor-pointer px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2",
              showAIInsights ? "bg-[var(--primary-1)] border-[var(--primary-6)] text-[var(--primary-9)]" : "bg-white border-[var(--gray-3)] text-[var(--gray-11)]"
            )}
          >
            <Icon name="tabler:sparkles" className="size-4.5" />
            <span>AI Insights</span>
            {agentData?.score !== undefined && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ml-1 transition-colors border",
                Number(agentData.score) >= 90 ? "bg-[var(--green-1)] text-[var(--green-9)] border-[var(--green-3)]" :
                  Number(agentData.score) >= 60 ? "bg-[var(--orange-1)] text-[var(--orange-9)] border-[var(--orange-3)]" :
                    "bg-[var(--red-1)] text-[var(--red-9)] border-[var(--red-3)]"
              )}>
                {Math.round(Number(agentData.score))}%
              </span>
            )}
          </Button>

          <AnimatePresence>
            {showAIInsights && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-3 p-4 bg-white/95 backdrop-blur-md rounded-xl border border-[var(--gray-3)] shadow-2xl z-[100] min-w-[500px]"
              >
                <div className="flex flex-col gap-4">
                  {/* AI Insights Section */}
                  {insightContent && (
                    <div className="bg-[var(--primary-1)] rounded-lg border border-[var(--primary-3)] p-6">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <Brain className="text-[var(--primary-9)] w-6 h-6" />
                          <span className="text-[15px] font-semibold text-[var(--gray-13)]">Invoice Decision Details</span>
                        </div>
                        <button
                          onClick={() => setShowAIInsights(false)}
                          className="p-1 rounded-lg text-[var(--gray-8)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-2)] active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          aria-label="Close AI Insights"
                        >
                          <Icon name="lucide:x" className="size-4" />
                        </button>
                      </div>
                      <p className="text-[14px] text-[var(--gray-12)] font-medium leading-relaxed">
                        {renderHighlightedContent(insightContent)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!hideActions && (
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button
                onClick={() => onApprove?.("Save")}
                loading={approveLoading}
                color='primary'
                variant='solid'
                size='lg'
                label="Save"
              />
            )}

            {actions?.map((action: any) => {
              const isPrimary = action?.label === 'Verified' || action?.label === 'Approve' || action?.label?.includes('Verify');
              return (
                <Button
                  key={action?.value}
                  onClick={() => onApprove?.(action?.value)}
                  loading={approveLoading}
                  color={isPrimary ? 'primary' : 'gray'}
                  variant={isPrimary ? 'solid' : 'subtle'}
                  size='lg'
                  icon={action?.icon}
                  label={action?.label}
                />
              );
            })}
          </div>
        )}
      </div>
    </OverlayHeaderWrapper >
  )
}

Header.displayName = 'Header'
export default Header