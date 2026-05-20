import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
import cn from '@/utils/cn'

interface HeaderProps {
  isLoading: boolean
  raisedAt: any
  requestNo: string
  rightView: 'analysis' | 'comments' | 'attachments' | 'forms'
  actions?: any[]
  agentData?: any
  approveLoading?: boolean
  attachmentCount?: number
  commentsCount?: number
  currency?: string
  hideActions?: boolean
  isEditing?: boolean
  poValue?: string | number
  raisedBy?: any
  showApprove?: boolean
  stage?: any
  status?: string
  totalAmount?: string
  setRightView: (
    view: 'analysis' | 'comments' | 'attachments' | 'forms',
  ) => void
  onApprove?: (action: string) => void
  onBack?: () => void
  onManualCorrection?: () => void
  onNext?: () => void
  onPrev?: () => void
}

const Header: React.FC<HeaderProps> = ({
  actions,
  agentData,
  approveLoading,
  currency,
  hideActions,
  isEditing = false,
  isLoading,
  poValue,
  requestNo,
  status = 'Pending Review',
  totalAmount,
  onApprove,
  onBack,
  onManualCorrection: _onManualCorrection,
  onNext,
  onPrev,
}) => {
  const [showAIInsights, setShowAIInsights] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowAIInsights(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const insightContent =
    agentData?.reason ||
    agentData?.summary ||
    agentData?.['Extracted Invoice JSON']?.reason ||
    ''

  // Simple highlighting logic for common terms
  const renderHighlightedContent = (text: string) => {
    if (!text) return null

    // Highlight percentages, scores, and statuses
    const parts = text.split(
      /(\d+%|Approved|Partially Approved|Matched|Discrepancy|Aligned|Threshold)/gi,
    )
    return parts.map((part, i) => {
      const lower = part.toLowerCase()
      if (/\d+%/.test(part))
        return (
          <span className='font-bold text-[var(--primary-9)]' key={i}>
            {part}
          </span>
        )
      if (lower === 'approved' || lower === 'matched' || lower === 'aligned')
        return (
          <span className='font-bold text-[var(--green-9)]' key={i}>
            {part}
          </span>
        )
      if (lower === 'partially approved' || lower === 'threshold')
        return (
          <span className='font-bold text-[var(--orange-9)]' key={i}>
            {part}
          </span>
        )
      if (lower === 'discrepancy')
        return (
          <span className='font-bold text-[var(--red-9)]' key={i}>
            {part}
          </span>
        )
      return part
    })
  }

  return (
    <OverlayHeaderWrapper className='h-14 justify-between gap-4 bg-white px-4'>
      {/* Left Side Group: Request Number + Navigation Buttons */}
      <div className='flex items-center gap-4 bg-white p-0'>
        <IconButton
          className='cursor-pointer hover:bg-[var(--gray-2)]'
          color='gray'
          icon='tabler:arrow-left'
          size='sm'
          variant='ghost'
          onClick={onBack}
        />

        <div className='flex flex-col pb-1'>
          <div className='flex items-center gap-3'>
            <IconButton
              className='size-7 cursor-pointer hover:bg-white'
              color='gray'
              disabled={!onPrev || isLoading}
              icon='tabler:chevron-left'
              size='sm'
              variant='ghost'
              onClick={onPrev}
            />
            <h1 className='text-[15px] font-semibold tracking-tight text-[var(--gray-13)]'>
              {isLoading ? (
                <span className='bg-gray-200 animate-pulse rounded px-2 text-transparent'>
                  INV-0000-000
                </span>
              ) : (
                requestNo
              )}
            </h1>
            <IconButton
              className='size-7 cursor-pointer hover:bg-white'
              color='gray'
              disabled={!onNext || isLoading}
              icon='tabler:chevron-right'
              size='sm'
              variant='ghost'
              onClick={onNext}
            />
            {!isLoading && (
              <span className='rounded-full border border-[var(--orange-3)] bg-[var(--orange-1)] px-3 py-1 text-[11px] font-semibold text-[var(--orange-9)]'>
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
            if (!curr) return '$'
            const symbols: { [key: string]: string } = {
              AED: 'د.إ',
              AUD: '$',
              CAD: '$',
              EUR: '€',
              GBP: '£',
              INR: '₹',
              SGD: '$',
              USD: '$',
            }
            const code = curr.length === 3 ? curr.toUpperCase() : null
            const symbol =
              symbols[code || ''] || (curr.length === 1 ? curr : '$')
            if (code && code !== symbol) return `${code} - ${symbol}`
            return symbol
          }

          const formatAmount = (val: any) => {
            if (!val || val === '0.00') return '0.00'
            const num =
              typeof val === 'number'
                ? val
                : parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
            return isNaN(num)
              ? '0.00'
              : num.toLocaleString(undefined, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })
          }

          const currDisplay = getCurrencyDisplay(currency || '')

          return (
            <div className='flex items-center gap-3 pr-3'>
              <div className='flex flex-col border-[var(--gray-3)] pl-3 text-right'>
                <span className='mb-1 text-[10px] leading-none font-semibold text-[var(--gray-11)]'>
                  Invoice Value
                </span>
                <span className='text-[13px] leading-none font-semibold text-[var(--gray-13)]'>
                  {currDisplay} {formatAmount(totalAmount)}
                </span>
              </div>
              <div className='flex flex-col border-l border-[var(--gray-3)] pl-3 text-right'>
                <span className='mb-1 text-[10px] leading-none font-semibold text-[var(--gray-11)]'>
                  PO Value
                </span>
                <span className='text-[13px] leading-none font-semibold text-[var(--primary-9)]'>
                  {currDisplay} {formatAmount(poValue)}
                </span>
              </div>
            </div>
          )
        })()}

        {/* AI Insights Toggle & Overlay */}
        <div className='relative flex items-center gap-3' ref={containerRef}>
          <Button
            variant='outline'
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all',
              showAIInsights
                ? 'border-[var(--primary-6)] bg-[var(--primary-1)] text-[var(--primary-9)]'
                : 'border-[var(--gray-3)] bg-white text-[var(--gray-11)]',
            )}
            onClick={() => setShowAIInsights(!showAIInsights)}
          >
            <Icon className='size-4.5' name='tabler:sparkles' />
            <span>AI Insights</span>
            {agentData?.score !== undefined && (
              <span
                className={cn(
                  'ml-1 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                  Number(agentData.score) >= 90
                    ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
                    : Number(agentData.score) >= 60
                      ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                      : 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
                )}
              >
                {Math.round(Number(agentData.score))}%
              </span>
            )}
          </Button>

          <AnimatePresence>
            {showAIInsights && (
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className='absolute top-full right-0 z-[100] mt-3 min-w-[500px] rounded-xl border border-[var(--gray-3)] bg-white/95 p-4 shadow-2xl backdrop-blur-md'
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
              >
                <div className='flex flex-col gap-4'>
                  {/* AI Insights Section */}
                  {insightContent && (
                    <div className='rounded-lg border border-[var(--primary-3)] bg-[var(--primary-1)] p-6'>
                      <div className='mb-4 flex items-center justify-between gap-3'>
                        <div className='flex items-center gap-3'>
                          <Icon className='h-6 w-6 text-[var(--primary-9)]' name='tabler:sparkles' />
                          <span className='text-[15px] font-semibold text-[var(--gray-13)]'>
                            Invoice Decision Details
                          </span>
                        </div>
                        <button
                          aria-label='Close AI Insights'
                          className='flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 text-[var(--gray-8)] transition-all hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)] active:scale-95'
                          onClick={() => setShowAIInsights(false)}
                        >
                          <Icon className='size-4' name='lucide:x' />
                        </button>
                      </div>
                      <p className='text-[14px] leading-relaxed font-medium text-[var(--gray-12)]'>
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
          <div className='flex items-center gap-2'>
            {isEditing && (
              <Button
                color='primary'
                label='Save'
                loading={approveLoading}
                size='lg'
                variant='solid'
                onClick={() => onApprove?.('Save')}
              />
            )}

            {actions?.map((action: any) => {
              const isPrimary =
                action?.label === 'Verified' ||
                action?.label === 'Approve' ||
                action?.label?.includes('Verify')
              return (
                <Button
                  color={isPrimary ? 'primary' : 'gray'}
                  icon={action?.icon}
                  key={action?.value}
                  label={action?.label}
                  loading={approveLoading}
                  size='lg'
                  variant={isPrimary ? 'solid' : 'subtle'}
                  onClick={() => onApprove?.(action?.value)}
                />
              )
            })}
          </div>
        )}
      </div>
    </OverlayHeaderWrapper>
  )
}

Header.displayName = 'Header'
export default Header
