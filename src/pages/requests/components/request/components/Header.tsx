import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import { getUserListQueryOptions } from '@/api/userQueries'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
import showToast from '@/components/base/toast/showToast'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
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
  onOpenPlayground?: (context: any) => void
  onPrev?: () => void
  ticketUserId?: string
}

// Generates a consistent color from a string (name/email)
const getAvatarColor = (str: string) => {
  const colors = [
    'bg-[var(--violet-9)] text-white',
    'bg-[var(--blue-9)] text-white',
    'bg-[var(--green-9)] text-white',
    'bg-[var(--orange-9)] text-white',
    'bg-[var(--pink-9)] text-white',
    'bg-[var(--cyan-9)] text-white',
    'bg-[var(--teal-9)] text-white',
    'bg-[var(--indigo-9)] text-white',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const getInitials = (user: any): string => {
  const first = user.firstName || user.FirstName || ''
  const last = user.lastName || user.LastName || ''
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  const name =
    user.name ||
    user.value ||
    user.loginName ||
    user.displayName ||
    user.email ||
    ''
  const parts = name.trim().split(' ')
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const getDisplayName = (user: any): string => {
  const first = user.firstName || user.FirstName || ''
  const last = user.lastName || user.LastName || ''
  if (first && last) return `${first} ${last}`
  return (
    user.name ||
    user.value ||
    user.loginName ||
    user.displayName ||
    user.email ||
    'Unknown'
  )
}

const getEmail = (user: any): string =>
  user.email || user.Email || user.loginName || ''

const roleOptions = [
  { id: 'View', name: 'View' },
  { id: 'Verify', name: 'Verify' },
  { id: 'Approve', name: 'Approve' },
  { id: 'Paid', name: 'Paid' },
]

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
  ticketUserId,
  setRightView: _setRightView,
  onApprove,
  onBack,
  onManualCorrection: _onManualCorrection,
  onNext,
  onPrev,
}) => {
  const [showAIInsights, setShowAIInsights] = React.useState(false)
  const [showShare, setShowShare] = React.useState(false)
  const [shareSearch, setShareSearch] = React.useState('')
  const [sharedUsers, setSharedUsers] = React.useState<Set<string>>(new Set())
  const [selectedUsersToShare, setSelectedUsersToShare] = React.useState<Record<string, { user: any, permission: 'View' | 'Verify' | 'Approve' | 'Paid' }>>({})
  const containerRef = React.useRef<HTMLDivElement>(null)
  const shareRef = React.useRef<HTMLDivElement>(null)

  // Fetch users from API
  const { data: rawUsers = [], isLoading: usersLoading } = useQuery(
    getUserListQueryOptions(),
  )

  const users = React.useMemo(() => {
    return (rawUsers as any[]).filter((u) => {
      const name = getDisplayName(u).toLowerCase()
      const email = getEmail(u).toLowerCase()
      const q = shareSearch.toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [rawUsers, shareSearch])

  const getProgressStyles = (pct: number) => {
    if (pct < 100) {
      return {
        badge: 'border-[var(--orange-9)] bg-[var(--orange-9)] text-white',
        bullet: 'bg-white',
        fill: 'bg-white/20',
        icon: 'text-white',
        text: 'text-white',
      }
    }
    return {
      badge: 'border-[var(--green-9)] bg-[var(--green-9)] text-white',
      bullet: 'bg-white',
      fill: 'bg-white/20',
      icon: 'text-white',
      text: 'text-white',
    }
  }

  // Close AI Insights on outside click
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

  // Close Share on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        shareRef.current &&
        !shareRef.current.contains(target) &&
        !target.closest('.mantine-Combobox-dropdown') &&
        !target.closest('.mantine-Popover-dropdown') &&
        !target.closest('[class*="combobox"]') &&
        !target.closest('[class*="dropdown"]')
      ) {
        setShowShare(false)
        setSelectedUsersToShare({})
        setShareSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleSelectUser = (user: any) => {
    const id = String(user.id || user.value || user.loginName)
    setSelectedUsersToShare((prev) => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = { user, permission: 'View' }
      }
      return next
    })
  }

  const handlePermissionChange = (id: string, permission: 'View' | 'Verify' | 'Approve' | 'Paid') => {
    setSelectedUsersToShare((prev) => {
      const next = { ...prev }
      if (next[id]) {
        next[id] = { ...next[id], permission }
      }
      return next
    })
  }

  const handleBulkShare = () => {
    const selectedCount = Object.keys(selectedUsersToShare).length
    if (selectedCount === 0) return

    setSharedUsers((prev) => {
      const next = new Set(prev)
      Object.keys(selectedUsersToShare).forEach((id) => {
        next.add(id)
      })
      return next
    })

    setSelectedUsersToShare({})
    setShowShare(false)
    setShareSearch('')

    showToast({
      message: 'Request shared successfully',
      variant: 'success',
    })
  }

  const insightContent =
    agentData?.reason ||
    agentData?.summary ||
    agentData?.['Extracted Invoice JSON']?.reason ||
    ''

  const renderHighlightedContent = (text: string) => {
    if (!text) return null
    const parts = text.split(
      /(\d+%|Approved|Partially Approved|Partially Matched|Matched|Discrepancy|Aligned|Threshold|Not Matched)/gi,
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
      if (
        lower === 'partially approved' ||
        lower === 'partially matched' ||
        lower === 'threshold'
      )
        return (
          <span className='font-bold text-[var(--orange-9)]' key={itemKey}>
            {part}
          </span>
        )
      if (lower === 'discrepancy' || lower === 'not matched')
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
                    let isLoaderIcon = false

                    if (
                      dec === 'APPROVED' ||
                      dec === 'MATCHED' ||
                      dec === 'VERIFIED'
                    ) {
                      iconName = 'tabler:circle-check'
                      badgeColorClass =
                        'border-[var(--green-9)] bg-[var(--green-9)] text-white'
                    } else if (
                      dec === 'REJECTED' ||
                      dec === 'NO MATCH' ||
                      dec === 'NOT MATCHED'
                    ) {
                      iconName = 'tabler:alert-circle'
                      badgeColorClass =
                        'border-[var(--red-9)] bg-[var(--red-9)] text-white'
                    } else if (
                      dec === 'PARTIALLY APPROVED' ||
                      dec === 'PARTIALLY_APPROVED' ||
                      dec === 'PARTIALLY MATCHED' ||
                      dec === 'PARTIAL MATCH'
                    ) {
                      iconName = 'tabler:alert-triangle'
                      badgeColorClass =
                        'border-transparent bg-[var(--orange-9)] text-white'
                    } else if (
                      dec.includes('ANALYZING') ||
                      dec.includes('FINALIZING') ||
                      dec.includes('FETCHING') ||
                      dec.includes('INITIATING') ||
                      dec.includes('SETTING UP')
                    ) {
                      iconName = 'tabler:loader-2'
                      badgeColorClass =
                        'border-[var(--orange-9)] bg-[var(--orange-9)] text-white'
                      isLoaderIcon = true
                    } else {
                      if (_showApprove) {
                        return null
                      }
                      iconName = 'tabler:clock'
                      badgeColorClass =
                        'border-[var(--orange-9)] bg-[var(--orange-9)] text-white'
                    }

                    return (
                      <span
                        className={cn(
                          'animate-in fade-in zoom-in-95 flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-all duration-300',
                          badgeColorClass,
                        )}
                      >
                        <Icon
                          name={iconName}
                          className={cn(
                            'h-3.5 w-3.5',
                            isLoaderIcon && 'animate-spin',
                          )}
                        />
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

            const parseVal = (val: any) => {
              if (!val) return 0
              const num = Number.parseFloat(
                String(val).replace(/[^0-9.-]+/g, ''),
              )
              return Number.isNaN(num) ? 0 : num
            }

            const invoiceNum = parseVal(totalAmount)
            const poNum = parseVal(poValue)

            let invoiceValueColorClass = 'text-[var(--gray-13)]'
            if (invoiceNum > 0 && poNum > 0) {
              if (invoiceNum === poNum) {
                invoiceValueColorClass = 'text-[var(--green-9)]'
              } else if (invoiceNum < poNum) {
                invoiceValueColorClass = 'text-[var(--red-9)]'
              }
            }
            if (
              invoiceValueColorClass === 'text-[var(--gray-13)]' &&
              poNumber &&
              poNumber !== '-' &&
              poNumber !== 'N/A'
            ) {
              invoiceValueColorClass = 'text-[var(--green-9)]'
            }

            return (
              <div className='flex items-center gap-3 pr-3'>
                <div className='flex flex-col border-[var(--gray-3)] pl-3 text-right'>
                  <span className='mb-1 text-[10px] leading-none font-semibold text-[var(--gray-11)]'>
                    Invoice Value
                  </span>
                  <span
                    className={cn(
                      'text-[13px] leading-none font-semibold',
                      invoiceValueColorClass,
                    )}
                  >
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

        {/* Share Button — Canva-style user picker */}
        {!isProcessing && (
          <div className='relative' ref={shareRef}>
            <button
              type='button'
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-all hover:shadow-sm active:scale-95',
                showShare
                  ? 'border-[var(--primary-6)] bg-[var(--primary-1)] text-[var(--primary-9)]'
                  : 'border-[var(--gray-3)] bg-surface text-[var(--gray-11)] hover:border-[var(--gray-5)] hover:text-[var(--gray-13)]',
              )}
              onClick={() => {
                setShowShare(!showShare)
                setShareSearch('')
              }}
            >
              <Icon className='size-4' name='tabler:user-share' />
              <span>Share</span>
              {sharedUsers.size > 0 && (
                <span className='flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--primary-9)] px-1 text-[10px] font-bold text-white'>
                  {sharedUsers.size}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showShare && (
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className='absolute top-full right-0 z-[100] mt-3 w-[340px] overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-2xl backdrop-blur-md'
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Header */}
                  <div className='flex items-center justify-between border-b border-[var(--gray-2)] px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <Icon
                        className='size-4 text-[var(--primary-9)]'
                        name='tabler:user-share'
                      />
                      <span className='text-[13px] font-semibold text-[var(--gray-13)]'>
                        Share Request
                      </span>
                    </div>
                    <button
                      className='flex cursor-pointer items-center justify-center rounded-md p-1 text-[var(--gray-8)] transition-all hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)] active:scale-95'
                      onClick={() => {
                        setShowShare(false)
                        setSelectedUsersToShare({})
                        setShareSearch('')
                      }}
                    >
                      <Icon className='size-3.5' name='lucide:x' />
                    </button>
                  </div>

                  {/* Search */}
                  <div className='px-3 pt-3 pb-2'>
                    <div className='flex items-center gap-2 rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2 transition-all focus-within:border-[var(--primary-7)] focus-within:bg-surface focus-within:ring-1 focus-within:ring-[var(--primary-4)]'>
                      <Icon
                        className='size-3.5 shrink-0 text-[var(--gray-9)]'
                        name='tabler:search'
                      />
                      <input
                        className='flex-1 bg-transparent text-[12px] font-medium text-[var(--gray-13)] placeholder:text-[var(--gray-8)] focus:outline-none'
                        placeholder='Search people...'
                        type='text'
                        value={shareSearch}
                        autoFocus
                        onChange={(e) => setShareSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* User List */}
                  <div className='max-h-[280px] overflow-y-auto px-2 py-2'>
                    {usersLoading ? (
                      <div className='flex flex-col gap-2 px-2 py-2'>
                        {[1, 2, 3].map((i) => (
                          <div
                            className='flex items-center gap-3 rounded-lg px-2 py-2'
                            key={i}
                          >
                            <div className='h-8 w-8 animate-pulse rounded-full bg-[var(--gray-3)]' />
                            <div className='flex flex-1 flex-col gap-1.5'>
                              <div className='h-3 w-28 animate-pulse rounded bg-[var(--gray-3)]' />
                              <div className='h-2.5 w-40 animate-pulse rounded bg-[var(--gray-3)]' />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : users.length === 0 ? (
                      <div className='flex flex-col items-center justify-center py-8 text-center'>
                        <Icon
                          className='mb-2 size-8 text-[var(--gray-5)]'
                          name='tabler:users-group'
                        />
                        <p className='text-[12px] font-medium text-[var(--gray-9)]'>
                          {shareSearch
                            ? 'No users found'
                            : 'No users available'}
                        </p>
                      </div>
                    ) : (
                      users.map((user: any) => {
                        const id = String(
                          user.userId || user.id || user.value || user.loginName,
                        )
                        const name = getDisplayName(user)
                        const email = getEmail(user)
                        const initials = getInitials(user)
                        const avatarColor = getAvatarColor(email || name)
                        const isShared = sharedUsers.has(id)
                        const isSelectedToShare = !!selectedUsersToShare[id]
                        const isOwner = ticketUserId && (
                          String(user.userId) === String(ticketUserId) ||
                          String(user.id) === String(ticketUserId.toLowerCase()) ||
                          String(user.value) === String(ticketUserId) ||
                          String(user.loginName) === String(ticketUserId)
                        )
                        // console.log(user, ticketUserId?.toLowerCase(), "Selected user session")
                        return (
                          <div
                            key={id}
                            className={cn(
                              'group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-all hover:bg-[var(--gray-2)]/50',
                              isShared && 'opacity-90',
                              isSelectedToShare && 'bg-[var(--primary-2)]/30',
                              isOwner && 'bg-[var(--primary-1)]/40',
                            )}
                          >
                            {/* Left Side: Checkbox + Avatar + User Info */}
                            <div
                              className='flex items-center gap-3 min-w-0 flex-1 cursor-pointer'
                              onClick={() => !isShared && !isOwner && handleToggleSelectUser(user)}
                            >
                              {isOwner ? (
                                <div className='w-5 shrink-0 flex items-center justify-center' title='Request Owner'>
                                  <Icon className='size-4 text-[var(--primary-9)]' name='tabler:crown' />
                                </div>
                              ) : (
                                <div onClick={(e) => e.stopPropagation()} className='shrink-0 flex items-center justify-center'>
                                  <InputCheckbox
                                    checked={isShared || isSelectedToShare}
                                    disabled={isShared}
                                    onChange={() => handleToggleSelectUser(user)}
                                    className='cursor-pointer'
                                  />
                                </div>
                              )}

                              {/* Avatar */}
                              <div
                                className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm',
                                  avatarColor,
                                )}
                              >
                                {initials}
                              </div>

                              {/* Name & Email */}
                              <div className='min-w-0 flex-1'>
                                <p className='truncate text-[12px] font-semibold text-[var(--gray-13)]'>
                                  {name}
                                </p>
                                {email && (
                                  <p className='truncate text-[11px] text-[var(--gray-9)]'>
                                    {email}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Side: Invite / Shared / Dropdown selector */}
                            <div className='shrink-0' onClick={(e) => e.stopPropagation()}>
                              {isOwner ? (
                                <span className='flex items-center gap-1 rounded-full bg-[var(--primary-2)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--primary-9)] border border-[var(--primary-4)]'>
                                  <Icon className='size-3' name='tabler:crown' />
                                  Owner
                                </span>
                              ) : isShared ? (
                                <span className='flex items-center gap-1 rounded-full bg-[var(--green-2)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--green-9)]'>
                                  <Icon className='size-3' name='tabler:check' />
                                  Shared
                                </span>
                              ) : isSelectedToShare ? (
                                <div className='w-24'>
                                  <InputSelect
                                    options={roleOptions}
                                    value={roleOptions.find((opt) => opt.id === selectedUsersToShare[id]?.permission) || roleOptions[0]}
                                    onChange={(val) => handlePermissionChange(id, (val?.id || 'View') as any)}
                                    searchable={false}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Share Invite Button */}
                  {Object.keys(selectedUsersToShare).length > 0 && (
                    <div className='border-t border-[var(--gray-2)] p-2.5 bg-[var(--gray-1)]/50'>
                      <button
                        type='button'
                        onClick={handleBulkShare}
                        className='flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary-9)] hover:bg-[var(--primary-10)] text-white py-1.5 text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all'
                      >
                        <Icon className='size-3.5' name='tabler:send' />
                        <span>Share Invite</span>
                      </button>
                    </div>
                  )}
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
                <div className='flex items-center gap-1.5' key={action?.value}>
                  <Button
                    className={borderClass}
                    color={btnColor}
                    icon={action?.icon}
                    label={action?.label}
                    loading={approveLoading}
                    size='lg'
                    variant={btnVariant}
                    onClick={() => onApprove?.(action?.value)}
                  />
                </div>
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
