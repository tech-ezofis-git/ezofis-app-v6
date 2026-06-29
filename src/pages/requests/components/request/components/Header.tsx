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
  enableAIInsights?: boolean
  hideActions?: boolean
  isEditing?: boolean
  isProcessing?: boolean
  percent?: number
  poNumber?: string
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
  attachmentCount: _attachmentCount,
  commentsCount: _commentsCount,
  currency,
  enableAIInsights = true,
  hideActions: _hideActions,
  isEditing = false,
  isLoading: _isLoading,
  isProcessing = false,
  percent,
  poNumber,
  poValue,
  raisedAt: _raisedAt,
  raisedBy: _raisedBy,
  requestNo,
  rightView: _rightView,
  showApprove: _showApprove,
  stage: _stage,
  status = 'Pending Review',
  totalAmount,
  setRightView: _setRightView,
  onApprove,
  onBack,
  onManualCorrection: _onManualCorrection,
  onNext,
  onPrev,
}) => {
  const [showAIInsights, setShowAIInsights] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const getProgressStyles = (pct: number) => {
    if (pct < 100) {
      return {
        badge:
          'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]',
        bullet: 'bg-[var(--orange-4)]',
        fill: 'bg-[var(--orange-3)]/30',
        icon: 'text-[var(--orange-9)]',
        text: 'text-[var(--orange-11)]',
      }
    }
    return {
      badge:
        'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]',
      bullet: 'bg-[var(--green-4)]',
      fill: 'bg-[var(--green-3)]/30',
      icon: 'text-[var(--green-9)]',
      text: 'text-[var(--green-11)]',
    }
  }

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
      const itemKey = `${part}-${i}`
      if (/\d+%/.test(part))
        return (
          <span className='font-bold text-[var(--primary-9)]' key={itemKey}>
            {part}
          </span>
        )
      if (lower === 'approved' || lower === 'matched' || lower === 'aligned')
        return (
          <span className='font-bold text-[var(--green-9)]' key={itemKey}>
            {part}
          </span>
        )
      if (lower === 'partially approved' || lower === 'threshold')
        return (
          <span className='font-bold text-[var(--orange-9)]' key={itemKey}>
            {part}
          </span>
        )
      if (lower === 'discrepancy')
        return (
          <span className='font-bold text-[var(--red-9)]' key={itemKey}>
            {part}
          </span>
        )
      return part
    })
  }

  const getScoreBadgeClass = (score: any) => {
    const numScore = Number(score)
    if (numScore >= 90) {
      return 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
    }
    if (numScore >= 60) {
      return 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
    }
    return 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]'
  }

  console.log('Action value', actions)

  return (
    <OverlayHeaderWrapper className='h-14 justify-between gap-4 px-4'>
      {/* Left Side Group: Request Number + Navigation Buttons */}
      <div className='flex items-center gap-4 p-0'>
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
              className='size-7 cursor-pointer hover:bg-surface'
              color='gray'
              disabled={!onPrev}
              icon='tabler:chevron-left'
              size='sm'
              variant='ghost'
              onClick={onPrev}
            />
            <h1 className='text-[15px] font-semibold tracking-tight text-[var(--gray-13)]'>
              {requestNo}
            </h1>
            <IconButton
              className='size-7 cursor-pointer hover:bg-surface'
              color='gray'
              disabled={!onNext}
              icon='tabler:chevron-right'
              size='sm'
              variant='ghost'
              onClick={onNext}
            />
            <div className='flex items-center gap-2'>
              {poNumber && poNumber !== '-' && poNumber !== 'N/A' && (
                <span className='animate-in fade-in slide-in-from-left-2 rounded-full border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-1 text-[11px] font-semibold text-[var(--gray-11)] duration-300'>
                  {poNumber}
                </span>
              )}
              {status &&
                (isProcessing && percent !== undefined
                  ? (() => {
                      const styles = getProgressStyles(percent)
                      return (
                        <div
                          className={cn(
                            'animate-in fade-in zoom-in-95 relative overflow-hidden rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-300',
                            styles.badge,
                          )}
                        >
                          {/* Progress Fill Layer */}
                          <div
                            style={{ width: `${percent}%` }}
                            className={cn(
                              'absolute inset-y-0 left-0 transition-all duration-500 ease-out',
                              styles.fill,
                            )}
                          />

                          {/* Content Layer */}
                          <span className='relative z-10 flex items-center gap-1.5'>
                            {percent < 100 && (
                              <Icon
                                name='tabler:loader-2'
                                className={cn(
                                  'h-3.5 w-3.5 animate-spin',
                                  styles.icon,
                                )}
                              />
                            )}
                            <span>{status}</span>
                          </span>
                        </div>
                      )
                    })()
                  : (() => {
                      const dec = String(status || '').toUpperCase()
                      let iconName = ''
                      let badgeColorClass = ''

                      if (
                        dec === 'APPROVED' ||
                        dec === 'MATCHED' ||
                        dec === 'VERIFIED'
                      ) {
                        iconName = 'tabler:circle-check'
                        badgeColorClass =
                          'border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]'
                      } else if (
                        dec === 'REJECTED' ||
                        dec === 'NO MATCH' ||
                        dec === 'NOT MATCHED'
                      ) {
                        iconName = 'tabler:alert-circle'
                        badgeColorClass =
                          'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
                      } else if (
                        dec === 'PARTIALLY APPROVED' ||
                        dec === 'PARTIALLY_APPROVED' ||
                        dec === 'PARTIAL MATCH'
                      ) {
                        iconName = 'tabler:alert-triangle'
                        badgeColorClass =
                          'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
                      } else {
                        if (_showApprove) {
                          return null
                        }
                        iconName = 'tabler:clock'
                        badgeColorClass =
                          'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
                      }

                      return (
                        <span
                          className={cn(
                            'animate-in fade-in zoom-in-95 flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-all duration-300',
                            badgeColorClass,
                          )}
                        >
                          <Icon className='h-3.5 w-3.5' name={iconName} />
                          <span>{status}</span>
                        </span>
                      )
                    })())}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Group: Total Amount + Actions */}
      <div className='flex items-center gap-6'>
        {!isProcessing &&
          (() => {
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
                  : Number.parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
              return Number.isNaN(num)
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
        {!isProcessing && enableAIInsights && (
          <div className='relative flex items-center gap-3' ref={containerRef}>
            <Button
              variant='outline'
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all',
                showAIInsights
                  ? 'border-[var(--primary-6)] bg-[var(--primary-1)] text-[var(--primary-9)]'
                  : 'border-[var(--gray-3)] text-[var(--gray-11)]',
              )}
              onClick={() => setShowAIInsights(!showAIInsights)}
            >
              <Icon className='size-4.5' name='tabler:sparkles' />
              <span>AI Insights</span>
              {agentData?.score !== undefined && (
                <span
                  className={cn(
                    'ml-1 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                    getScoreBadgeClass(agentData.score),
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
                  className='absolute top-full right-0 z-[100] mt-3 min-w-[500px] rounded-xl border border-[var(--gray-3)] bg-surface/95 p-4 shadow-2xl backdrop-blur-md'
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                >
                  <div className='flex flex-col gap-4'>
                    {/* AI Insights Section */}
                    {insightContent && (
                      <div className='flex flex-col'>
                        <div className='mb-3 flex items-center justify-between gap-3 border-b border-[var(--gray-2)] pb-2.5'>
                          <div className='flex items-center gap-2'>
                            <Icon
                              className='h-5 w-5 text-[var(--primary-9)]'
                              name='tabler:sparkles'
                            />
                            <span className='text-[14px] font-semibold text-[var(--gray-13)]'>
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
                        <p className='text-[13px] leading-relaxed font-medium text-[var(--gray-12)]'>
                          {renderHighlightedContent(insightContent)}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!isProcessing && (
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
              const label = String(action?.label || '').toLowerCase()
              let btnColor: 'gray' | 'primary' | 'secondary' | 'red' | 'green' =
                'primary'
              const btnVariant: 'solid' | 'outline' | 'subtle' | 'ghost' =
                'subtle'
              let borderClass =
                'border-primary-4 hover:border-primary-6 shadow-sm hover:shadow-md transition-shadow'

              if (
                label === 'approved' ||
                label === 'approve' ||
                label.includes('approve')
              ) {
                btnColor = 'green'
                borderClass =
                  'border-green-4 hover:border-green-6 shadow-sm hover:shadow-md transition-shadow'
              } else if (
                label === 'rejected' ||
                label === 'reject' ||
                label.includes('reject')
              ) {
                btnColor = 'red'
                borderClass =
                  'border-red-4 hover:border-red-6 shadow-sm hover:shadow-md transition-shadow'
              }

              return (
                <Button
                  className={borderClass}
                  color={btnColor}
                  icon={action?.icon}
                  key={action?.value}
                  label={action?.label}
                  loading={approveLoading}
                  size='lg'
                  variant={btnVariant}
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
