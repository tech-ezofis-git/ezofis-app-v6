import { useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import { getUserListQueryOptions } from '@/api/userQueries'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Indicator from '@/components/base/Indicator'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
// import InputSelect from '@/components/base/inputs/InputSelect'
import { localizeRequestStatus } from '@/pages/requests/utils/localizeRequestUi'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'

interface HeaderProps {
  isLoading: boolean
  raisedAt: any
  requestNo: string
  rightView: 'overview' | 'history' | 'attachments' | 'comments'
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
  lastActionAt?: any
  percent?: number
  poNumber?: string
  poValue?: string | number
  raisedBy?: any
  showApprove?: boolean
  /** Generic (non-Accounts-Payable) requests: show only the ticket number
   * and action buttons — no PO/currency badges, status pill, AI Insights,
   * or Share, all of which are AP-specific or not yet wired for a generic
   * workflow instance. */
  simple?: boolean
  stage?: any
  status?: string
  ticketUserId?: string
  totalAmount?: string
  setRightView: (
    view: 'overview' | 'history' | 'attachments' | 'comments',
  ) => void
  onApprove?: (action: string) => void
  onBack?: () => void
  onManualCorrection?: () => void
  onNext?: () => void
  onPrev?: () => void
  onShare?: (
    shares: { action: number; email: string }[],
    message: string,
  ) => Promise<boolean>
}

// Generates a consistent color from a string (name/email)
const getAvatarColor = (_str?: string) => {
  return 'bg-[var(--primary-3)] text-[var(--primary-9)] font-semibold'
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
  if (typeof user === 'string') return user
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

const formatElapsedTime = (startDateStr?: string | number | Date) => {
  if (!startDateStr) return ''
  // Bare ISO datetimes from the API are UTC without a Z/offset — parse as
  // UTC first, otherwise the browser reads them as local time and the
  // elapsed value is off by the local UTC offset.
  const parsed = parseUtcDate(startDateStr)
  if (!parsed) return ''
  const start = parsed.getTime()
  const now = new Date().getTime()
  const diffMs = Math.max(0, now - start)

  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    const remHours = diffHours % 24
    return `${diffDays}d ${remHours}h running`
  }
  if (diffHours > 0) {
    const remMins = diffMins % 60
    return `${diffHours}h ${remMins}m running`
  }
  if (diffMins > 0) {
    return `${diffMins}m running`
  }
  return 'Just now'
}

const formatRaisedDate = (dateStr?: string | number | Date) => {
  if (!dateStr) return ''
  const d = parseUtcDate(dateStr)
  if (!d) return String(dateStr)
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const Header: React.FC<HeaderProps> = ({
  actions,
  agentData,
  approveLoading,
  attachmentCount = 0,
  commentsCount = 0,
  currency,
  enableAIInsights = true,
  hideActions: _hideActions,
  isEditing = false,
  isLoading: _isLoading,
  isProcessing = false,
  lastActionAt,
  percent,
  poNumber,
  poValue,
  raisedAt,
  raisedBy,
  requestNo,
  rightView,
  showApprove: _showApprove,
  simple = false,
  stage,
  status = 'Pending Review',
  ticketUserId,
  totalAmount,
  setRightView,
  onApprove,
  onBack,
  onManualCorrection: _onManualCorrection,
  onNext,
  onPrev,
  onShare,
}) => {
  const { i18n, t } = useLingui()
  const queryClient = useQueryClient()
  const [showAIInsights, setShowAIInsights] = React.useState(false)

  const raisedByDisplay =
    typeof raisedBy === 'object' && raisedBy
      ? getDisplayName(raisedBy)
      : raisedBy
        ? String(raisedBy)
        : null
  const [showShare, setShowShare] = React.useState(false)
  const [shareSearch, setShareSearch] = React.useState('')
  const [shareMessage, setShareMessage] = React.useState('')
  const [isSharing, setIsSharing] = React.useState(false)
  const [sharedUsers, setSharedUsers] = React.useState<Set<string>>(new Set())
  const [globalShareRole, setGlobalShareRole] = React.useState<{
    id: string
    name: string
  }>({ id: 'View', name: 'View' })
  const [showRoleDropdown, setShowRoleDropdown] = React.useState(false)
  const [openUserDropdown, setOpenUserDropdown] = React.useState<string | null>(
    null,
  )
  const [sendNotification, setSendNotification] = React.useState(true)
  const [notifyAccessed, setNotifyAccessed] = React.useState(false)
  const [selectedUsersToShare, setSelectedUsersToShare] = React.useState<
    Record<string, { permission: string; user: any }>
  >({})
  const containerRef = React.useRef<HTMLDivElement>(null)
  const shareRef = React.useRef<HTMLDivElement>(null)

  // Fetch users from API
  const { data: rawUsers = [], isLoading: usersLoading } = useQuery(
    getUserListQueryOptions(),
  )

  const users = React.useMemo(() => {
    if (!shareSearch) {
      return (rawUsers as any[]).filter((user) => {
        const id = String(
          user.userId || user.id || user.value || user.loginName,
        )
        const isShared = sharedUsers.has(id)
        const isOwner =
          ticketUserId &&
          (String(user.userId) === String(ticketUserId) ||
            String(user.id) === String(ticketUserId.toLowerCase()) ||
            String(user.value) === String(ticketUserId) ||
            String(user.loginName) === String(ticketUserId))
        return isOwner || isShared
      })
    }
    return (rawUsers as any[]).filter((u) => {
      const name = getDisplayName(u).toLowerCase()
      const email = getEmail(u).toLowerCase()
      const q = shareSearch.toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [rawUsers, shareSearch, sharedUsers, ticketUserId])

  const shareRoleOptions = React.useMemo(() => {
    return [
      { id: 'View', name: 'View' },
      { id: 'Manage', name: 'Manage' },
    ]
  }, [])

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
        setShareMessage('')
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
        next[id] = { permission: globalShareRole.id, user }
      }
      return next
    })
    setShareSearch('')
  }

  // const handlePermissionChange = (id: string, permission: 'View' | 'Verify' | 'Approve' | 'Paid') => {
  //   setSelectedUsersToShare((prev) => {
  //     const next = { ...prev }
  //     if (next[id]) {
  //       next[id] = { ...next[id], permission }
  //     }
  //     return next
  //   })
  // }

  const handleBulkShare = async () => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareSearch)
    const selectedCount = Object.keys(selectedUsersToShare).length
    if (selectedCount === 0 && !isEmail) return

    const shares: { action: number; email: string }[] = []
    Object.values(selectedUsersToShare).forEach(({ permission, user }) => {
      const email = getEmail(user)
      if (email) {
        shares.push({
          action: (permission || globalShareRole.id) === 'View' ? 0 : 1,
          email,
        })
      }
    })
    if (isEmail) {
      shares.push({
        action: globalShareRole.id === 'View' ? 0 : 1,
        email: shareSearch,
      })
    }

    if (onShare) {
      setIsSharing(true)
      const success = await onShare(shares, shareMessage)
      setIsSharing(false)

      if (success) {
        setSharedUsers((prev) => {
          const next = new Set(prev)
          Object.keys(selectedUsersToShare).forEach((id) => next.add(id))
          if (selectedCount === 0 && isEmail) next.add(shareSearch)
          return next
        })
        setSelectedUsersToShare({})
        setShowShare(false)
        setShareSearch('')
        setShareMessage('')

        queryClient.invalidateQueries({ queryKey: ['user-list'] })
        queryClient.invalidateQueries({ queryKey: ['inbox'] })
      }
    } else {
      // Fallback
      setSharedUsers((prev) => {
        const next = new Set(prev)
        Object.keys(selectedUsersToShare).forEach((id) => {
          next.add(id)
        })
        if (selectedCount === 0 && isEmail) {
          next.add(shareSearch)
        }
        return next
      })

      setSelectedUsersToShare({})
      setShowShare(false)
      setShareSearch('')
      setShareMessage('')

      queryClient.invalidateQueries({ queryKey: ['user-list'] })
      queryClient.invalidateQueries({ queryKey: ['inbox'] })

      showToast({
        message: t`Request shared successfully`,
        variant: 'success',
      })
    }
  }

  const insightContent =
    agentData?.reason ||
    agentData?.summary ||
    agentData?.['Extracted Invoice JSON']?.reason ||
    agentData?.['Extracted Invoice JSON']?.summary ||
    agentData?.decision_reason ||
    agentData?.po_matching?.reason ||
    agentData?.po_matching?.summary ||
    agentData?.message ||
    (agentData?.decision ? `Decision: ${agentData.decision}` : '') ||
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

  if (simple) {
    const rightViewTabs: {
      count: number
      icon: string
      id: 'overview' | 'history' | 'attachments' | 'comments'
      label: string
    }[] = [
        { count: 0, icon: 'tabler:history', id: 'history', label: t`History` },
        {
          count: attachmentCount,
          icon: 'tabler:paperclip',
          id: 'attachments',
          label: t`Attachments`,
        },
        {
          count: commentsCount,
          icon: 'tabler:message-circle',
          id: 'comments',
          label: t`Comments`,
        },
      ]

    return (
      <OverlayHeaderWrapper className='h-14 justify-between gap-4 px-4'>
        <div className='flex items-center gap-4 p-0'>
          <IconButton
            className='cursor-pointer hover:bg-[var(--gray-2)]'
            color='gray'
            icon='tabler:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onBack}
          />
          <div className='flex items-center gap-3'>
            <Tooltip content={t`Previous Request`} position='bottom'>
              <IconButton
                className='size-7 cursor-pointer hover:bg-surface'
                color='gray'
                disabled={!onPrev}
                icon='tabler:chevron-left'
                size='sm'
                variant='ghost'
                onClick={onPrev}
              />
            </Tooltip>
            <h1 className='text-[15px] font-semibold tracking-tight text-[var(--gray-13)]'>
              {requestNo}
            </h1>
            <Tooltip content={t`Next Request`} position='bottom'>
              <IconButton
                className='size-7 cursor-pointer hover:bg-surface'
                color='gray'
                disabled={!onNext}
                icon='tabler:chevron-right'
                size='sm'
                variant='ghost'
                onClick={onNext}
              />
            </Tooltip>

            {stage && (
              <span className='animate-in fade-in slide-in-from-left-2 inline-flex items-center rounded-md border border-purple-3 bg-purple-1 px-2 py-0.5 text-[11px] font-semibold text-purple-9 shadow-2xs dark:border-purple-9/30 dark:bg-purple-950/40 dark:text-purple-400'>
                {stage}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {(raisedByDisplay || raisedAt || lastActionAt) && (
            <div className='hidden md:flex items-center gap-3 border-r border-[var(--gray-3)] pr-3 text-[12px] text-[var(--gray-11)]'>
              {raisedByDisplay && (
                <div className='flex items-center gap-1.5' title={t`Raised By`}>
                  <Icon className='size-3.5 text-[var(--gray-9)]' name='lucide:user' />
                  <span className='font-medium text-[var(--gray-12)]'>
                    {raisedByDisplay}
                  </span>
                </div>
              )}

              {raisedAt && (
                <div className='flex items-center gap-1.5' title={t`Raised Date`}>
                  <Icon className='size-3.5 text-[var(--gray-9)]' name='lucide:calendar' />
                  <span>{formatRaisedDate(raisedAt)}</span>
                </div>
              )}

              {(lastActionAt || raisedAt) && (
                <div
                  className='flex items-center gap-1.5 rounded-full border border-orange-4 bg-orange-2 px-2.5 py-0.5 text-[11px] font-medium text-orange-11'
                  title={t`Time running from last action`}
                >
                  <Icon className='size-3 text-orange-9' name='lucide:clock' />
                  <span>{formatElapsedTime(lastActionAt || raisedAt)}</span>
                </div>
              )}
            </div>
          )}
          <div className='flex items-center gap-1'>
            {rightViewTabs.map((tab) => (
              <Tooltip content={tab.label} key={tab.id} position='bottom'>
                <button
                  aria-label={tab.label}
                  type='button'
                  className={cn(
                    'flex size-8 cursor-pointer items-center justify-center rounded-lg transition-all hover:bg-[var(--gray-2)] active:scale-95',
                    rightView === tab.id
                      ? 'bg-[var(--primary-2)] text-[var(--primary-11)]'
                      : 'text-[var(--gray-10)]',
                  )}
                  onClick={() => setRightView(tab.id)}
                >
                  <Indicator
                    disabled={tab.count === 0}
                    label={tab.count > 0 ? tab.count : undefined}
                    offset={4}
                  >
                    <Icon className='size-4' name={tab.icon} />
                  </Indicator>
                </button>
              </Tooltip>
            ))}
          </div>

          {!isProcessing && actions && actions.length > 0 && (
            <div className='flex items-center gap-2 border-l border-[var(--gray-3)] pl-3'>
              {actions.map((action: any) => {
                const label = String(action?.label || '').toLowerCase()
                let btnColor:
                  | 'gray'
                  | 'primary'
                  | 'secondary'
                  | 'red'
                  | 'green' = 'primary'
                let borderClass =
                  'border-primary-4 hover:border-primary-6 shadow-sm hover:shadow-md transition-shadow'
                let defaultIcon = action?.icon
                if (!defaultIcon) {
                  if (label.includes('approve')) defaultIcon = 'lucide:check'
                  else if (label.includes('reject')) defaultIcon = 'lucide:x'
                  else defaultIcon = 'lucide:arrow-right'
                }
                if (label.includes('approve')) {
                  btnColor = 'green'
                  borderClass =
                    'border-green-4 hover:border-green-6 shadow-sm hover:shadow-md transition-shadow'
                } else if (label.includes('reject')) {
                  btnColor = 'red'
                  borderClass =
                    'border-red-4 hover:border-red-6 shadow-sm hover:shadow-md transition-shadow'
                }
                return (
                  <Button
                    color={btnColor}
                    icon={defaultIcon}
                    iconClass='size-4'
                    key={action?.value}
                    label={action?.label}
                    loading={approveLoading}
                    size='md'
                    variant='subtle'
                    className={cn(
                      borderClass,
                      'h-8 justify-center rounded-lg px-3.5 text-[13px] font-semibold',
                    )}
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
            <Tooltip content={t`Previous Request`} position='bottom'>
              <IconButton
                className='size-7 cursor-pointer hover:bg-surface'
                color='gray'
                disabled={!onPrev}
                icon='tabler:chevron-left'
                size='sm'
                variant='ghost'
                onClick={onPrev}
              />
            </Tooltip>
            <h1 className='text-[15px] font-semibold tracking-tight text-[var(--gray-13)]'>
              {requestNo}
            </h1>
            <Tooltip content={t`Next Request`} position='bottom'>
              <IconButton
                className='size-7 cursor-pointer hover:bg-surface'
                color='gray'
                disabled={!onNext}
                icon='tabler:chevron-right'
                size='sm'
                variant='ghost'
                onClick={onNext}
              />
            </Tooltip>
            <div className='flex items-center gap-2'>
              {poNumber && poNumber !== '-' && poNumber !== 'N/A' && (
                <span className='animate-in fade-in slide-in-from-left-2 rounded-full border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-1 text-[11px] font-semibold text-[var(--gray-11)] duration-300'>
                  {`# ${poNumber.replace(/^#\s*/, '')}`}
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
                          <span>{localizeRequestStatus(i18n, status)}</span>
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
                        <span>{localizeRequestStatus(i18n, status)}</span>
                      </span>
                    )
                  })())}
            </div>
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
            const num = Number.parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
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
                <span className='mb-1.5 text-[10px] leading-none font-semibold text-[var(--gray-11)]'>
                  {t`Invoice Value`}
                </span>
                <div
                  className={cn(
                    'flex items-center justify-end',
                    invoiceValueColorClass,
                  )}
                >
                  {formatAmount(totalAmount) === '0.00' ? (
                    <div className='h-3 w-16 animate-pulse rounded bg-[var(--gray-4)]' />
                  ) : (
                    <span className='text-[13px] leading-tight font-semibold'>
                      {currDisplay} {formatAmount(totalAmount)}
                    </span>
                  )}
                </div>
              </div>
              <div className='flex flex-col border-l border-[var(--gray-3)] pl-3 text-right'>
                <span className='mb-1.5 text-[10px] leading-none font-semibold text-[var(--gray-11)]'>
                  {t`PO Value`}
                </span>
                <div className='flex items-center justify-end text-[var(--primary-9)]'>
                  {formatAmount(poValue) === '0.00' ? (
                    <div className='h-3 w-16 animate-pulse rounded bg-[var(--gray-4)]' />
                  ) : (
                    <span className='text-[13px] leading-tight font-semibold'>
                      {currDisplay} {formatAmount(poValue)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        <div className='flex items-center gap-2'>
          {/* AI Insights Toggle & Overlay */}
          {enableAIInsights && (
            <div className='relative' ref={containerRef}>
              <Button
                variant='outline'
                className={cn(
                  'flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold transition-all hover:shadow-sm active:scale-95',
                  showAIInsights
                    ? 'border-[var(--primary-6)] bg-[var(--primary-1)] text-[var(--primary-9)]'
                    : 'border-[var(--gray-3)] bg-surface text-[var(--gray-11)] hover:border-[var(--gray-5)] hover:text-[var(--gray-13)]',
                  isProcessing &&
                  'pointer-events-none animate-pulse opacity-70',
                )}
                onClick={() =>
                  !isProcessing && setShowAIInsights(!showAIInsights)
                }
              >
                <AiBrandIcon className='size-[16px]' />
                <span>{t`AI Insights`}</span>
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
                      <div className='flex flex-col'>
                        <div className='mb-3 flex items-center justify-between gap-3 border-b border-[var(--gray-2)] pb-2.5'>
                          <div className='flex items-center gap-2'>
                            <AiBrandIcon
                              className='size-[20px] text-[var(--primary-9)]'
                            />
                            <span className='text-[14px] font-semibold text-[var(--gray-13)]'>
                              {t`Invoice Decision Details`}
                            </span>
                          </div>
                          <button
                            aria-label={t`Close AI Insights`}
                            className='flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 text-[var(--gray-8)] transition-all hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)] active:scale-95'
                            onClick={() => setShowAIInsights(false)}
                          >
                            <Icon className='size-4' name='lucide:x' />
                          </button>
                        </div>
                        <p className='text-[13px] leading-relaxed font-medium text-[var(--gray-12)]'>
                          {insightContent
                            ? renderHighlightedContent(insightContent)
                            : t`No decision details available for this request.`}
                        </p>
                      </div>
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
                  'flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 text-[13px] font-semibold transition-all hover:shadow-sm active:scale-95',
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
        <span>{t`Share`}</span>
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
                  {t`Share Request`}
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
              <div className='flex items-center gap-2 rounded-lg border border-[var(--gray-3)] bg-surface px-3 py-1.5 transition-all focus-within:border-[var(--primary-7)] focus-within:ring-1 focus-within:ring-[var(--primary-4)]'>
                <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                  <Icon
                    className='size-4 shrink-0 text-[var(--gray-9)]'
                    name='tabler:search'
                  />

                  <input
                    className='min-w-[120px] flex-1 bg-transparent text-[13px] font-medium text-[var(--gray-13)] placeholder:text-[var(--gray-8)] focus:outline-none'
                    type='text'
                    value={shareSearch}
                    autoFocus
                    placeholder={
                      Object.keys(selectedUsersToShare).length > 0
                        ? t`Add more people...`
                        : t`Add names or emails`
                    }
                    onChange={(e) => setShareSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const val = shareSearch.trim().replace(/,$/, '')
                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                          setSelectedUsersToShare((prev) => ({
                            ...prev,
                            [val]: {
                              permission: globalShareRole.id,
                              user: {
                                email: val,
                                id: val,
                                isExternal: true,
                                name: val,
                              },
                            },
                          }))
                          setShareSearch('')
                        }
                      }
                    }}
                  />
                </div>

                <div className='h-4 w-px shrink-0 bg-[var(--gray-3)]' />
                <div className='relative shrink-0'>
                  <button
                    className='flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[13px] font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--gray-2)]'
                    onClick={() =>
                      setShowRoleDropdown(!showRoleDropdown)
                    }
                  >
                    {globalShareRole.name}
                    <Icon
                      className='size-3.5 text-[var(--gray-9)]'
                      name='lucide:chevron-down'
                    />
                  </button>
                  {showRoleDropdown && (
                    <div className='absolute top-full right-0 z-[110] mt-1 min-w-[120px] rounded-lg border border-[var(--gray-3)] bg-surface py-1 shadow-lg'>
                      {shareRoleOptions.map((opt) => (
                        <button
                          className='flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-[var(--gray-2)]'
                          key={opt.id}
                          onClick={() => {
                            setGlobalShareRole(opt)
                            setShowRoleDropdown(false)
                          }}
                        >
                          <span>{opt.name}</span>
                          {globalShareRole.id === opt.id && (
                            <Icon
                              className='size-3.5 text-[var(--primary-9)]'
                              name='lucide:check'
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
              ) : users.length > 0 ||
                Object.keys(selectedUsersToShare).length > 0 ? (
                [
                  ...users,
                  ...Object.values(selectedUsersToShare)
                    .map((s: any) => s.user)
                    .filter(
                      (su) =>
                        !users.some(
                          (u: any) =>
                            String(
                              u.userId ||
                              u.id ||
                              u.value ||
                              u.loginName ||
                              u.email,
                            ) ===
                            String(
                              su.userId ||
                              su.id ||
                              su.value ||
                              su.loginName ||
                              su.email,
                            ),
                        ),
                    ),
                ]
                  .sort((a: any, b: any) => {
                    const aId = String(
                      a.userId ||
                      a.id ||
                      a.value ||
                      a.loginName ||
                      a.email,
                    )
                    const bId = String(
                      b.userId ||
                      b.id ||
                      b.value ||
                      b.loginName ||
                      b.email,
                    )
                    const aSelected = !!selectedUsersToShare[aId]
                    const bSelected = !!selectedUsersToShare[bId]
                    if (aSelected && !bSelected) return -1
                    if (!aSelected && bSelected) return 1
                    return 0
                  })
                  .map((user: any) => {
                    const id = String(
                      user.userId ||
                      user.id ||
                      user.value ||
                      user.loginName ||
                      user.email,
                    )
                    const name = getDisplayName(user)
                    const email = getEmail(user)
                    const initials = getInitials(user)
                    const avatarColor = getAvatarColor(email || name)
                    const isShared = sharedUsers.has(id)
                    const isSelectedToShare = !!selectedUsersToShare[id]
                    const isOwner =
                      ticketUserId &&
                      (String(user.userId) === String(ticketUserId) ||
                        String(user.id) ===
                        String(ticketUserId.toLowerCase()) ||
                        String(user.value) === String(ticketUserId) ||
                        String(user.loginName) === String(ticketUserId))
                    // console.log(user, ticketUserId?.toLowerCase(), "Selected user session")
                    return (
                      <div
                        key={id}
                        className={cn(
                          'group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-all hover:bg-[var(--gray-2)]/50',
                          isShared && 'opacity-90',
                          isSelectedToShare &&
                          'bg-[var(--primary-2)]/30',
                          isOwner && 'bg-[var(--primary-1)]/40',
                        )}
                      >
                        {/* Left Side: Checkbox + Avatar + User Info */}
                        <div
                          className='flex min-w-0 flex-1 cursor-pointer items-center gap-3'
                          onClick={() =>
                            !isShared &&
                            !isOwner &&
                            handleToggleSelectUser(user)
                          }
                        >
                          {isOwner ? (
                            <div
                              className='flex w-5 shrink-0 items-center justify-center'
                              title={t`Request Owner`}
                            >
                              <Icon
                                className='size-4 text-[var(--primary-9)]'
                                name='tabler:crown'
                              />
                            </div>
                          ) : (
                            <div
                              className='flex shrink-0 items-center justify-center'
                              onClick={(e) => e.stopPropagation()}
                            >
                              <InputCheckbox
                                checked={isShared || isSelectedToShare}
                                className='cursor-pointer'
                                disabled={isShared}
                                onChange={() =>
                                  handleToggleSelectUser(user)
                                }
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
                            <p
                              className='truncate text-[12px] font-semibold text-[var(--gray-13)]'
                              title={name}
                            >
                              {name}
                            </p>
                            {email && (
                              <p
                                className='truncate text-[11px] text-[var(--gray-9)]'
                                title={email}
                              >
                                {email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Invite / Shared / Dropdown selector */}
                        <div
                          className='shrink-0'
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isOwner ? (
                            <span className='flex items-center gap-1 rounded-full border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--primary-9)]'>
                              <Icon
                                className='size-3'
                                name='tabler:crown'
                              />
                              {t`Owner`}
                            </span>
                          ) : isShared ? (
                            <span className='flex items-center gap-1 rounded-full bg-[var(--green-2)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--green-9)]'>
                              <Icon
                                className='size-3'
                                name='tabler:check'
                              />
                              {t`Invited`}
                            </span>
                          ) : isSelectedToShare ? (
                            <div
                              className='relative shrink-0'
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className='flex cursor-pointer items-center gap-1 rounded-md border border-[var(--gray-3)] bg-surface px-2.5 py-1 text-[11px] font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--gray-2)]'
                                onClick={() =>
                                  setOpenUserDropdown(
                                    openUserDropdown === id ? null : id,
                                  )
                                }
                              >
                                {shareRoleOptions.find(
                                  (opt) =>
                                    opt.id ===
                                    (selectedUsersToShare[id]
                                      ?.permission ||
                                      globalShareRole.id),
                                )?.name ||
                                  selectedUsersToShare[id]
                                    ?.permission ||
                                  globalShareRole.id}
                                <Icon
                                  className='size-3 text-[var(--gray-9)]'
                                  name='lucide:chevron-down'
                                />
                              </button>
                              {openUserDropdown === id && (
                                <div className='absolute top-full right-0 z-[110] mt-1 min-w-[100px] rounded-lg border border-[var(--gray-3)] bg-surface py-1 shadow-lg'>
                                  {shareRoleOptions.map((opt) => (
                                    <button
                                      className='flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-[11px] font-medium transition-colors hover:bg-[var(--gray-2)]'
                                      key={opt.id}
                                      onClick={() => {
                                        setSelectedUsersToShare(
                                          (prev) => ({
                                            ...prev,
                                            [id]: {
                                              ...prev[id],
                                              permission: opt.id,
                                            },
                                          }),
                                        )
                                        setOpenUserDropdown(null)
                                      }}
                                    >
                                      <span>{opt.name}</span>
                                      {(selectedUsersToShare[id]
                                        ?.permission ||
                                        globalShareRole.id) ===
                                        opt.id && (
                                          <Icon
                                            className='size-3.5 text-[var(--primary-9)]'
                                            name='lucide:check'
                                          />
                                        )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
              ) : null}
            </div>

            {/* Share Invite Button */}
            {(() => {
              const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                shareSearch,
              )
              const hasSelectedUsers =
                Object.keys(selectedUsersToShare).length > 0
              const showFooter =
                hasSelectedUsers || shareSearch.length > 0
              const canShare = hasSelectedUsers || isEmail

              return showFooter ? (
                <div className='flex flex-col gap-3 border-t border-[var(--gray-2)] bg-surface p-4'>
                  <div
                    className='flex w-fit cursor-pointer items-center gap-2'
                    onClick={() =>
                      setSendNotification(!sendNotification)
                    }
                  >
                    <InputCheckbox
                      checked={sendNotification}
                      className='cursor-pointer'
                      onChange={() => { }}
                    />
                    <span className='text-[13px] font-medium text-[var(--gray-13)] select-none'>
                      {t`Send notification`}
                    </span>
                  </div>
                  {sendNotification && (
                    <textarea
                      className='w-full rounded-lg border border-[var(--gray-3)] bg-surface p-2.5 text-[13px] font-medium text-[var(--gray-13)] transition-all placeholder:text-[var(--gray-8)] focus:border-[var(--primary-5)] focus:ring-1 focus:ring-[var(--primary-4)] focus:outline-none'
                      placeholder={t`Add message (optional)`}
                      rows={3}
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                    />
                  )}
                  <button
                    disabled={!canShare || isSharing}
                    type='button'
                    className={cn(
                      'mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-bold shadow-sm transition-all',
                      canShare && !isSharing
                        ? 'cursor-pointer bg-[var(--primary-9)] text-white hover:bg-[var(--primary-10)] hover:shadow-md active:scale-95'
                        : 'cursor-not-allowed bg-[var(--gray-3)] text-[var(--gray-8)]',
                    )}
                    onClick={handleBulkShare}
                  >
                    {isSharing ? t`Sharing...` : t`Share`}
                  </button>

                  <div className='mt-2 flex items-center justify-between border-t border-[var(--gray-2)] pt-3'>
                    <div className='flex items-center gap-1.5'>
                      <Icon
                        className='size-3.5 text-[var(--gray-13)]'
                        name='lucide:info'
                      />
                      <span className='text-[13px] font-medium text-[var(--gray-13)]'>
                        {t`Notify me when accessed`}
                      </span>
                      <span className='ml-0.5 rounded-full bg-[#8c52ff] px-1.5 py-0.5 text-[10px] leading-none font-bold text-white'>
                        {t`New`}
                      </span>
                    </div>

                    <button
                      aria-checked={notifyAccessed}
                      role='switch'
                      type='button'
                      className={cn(
                        'relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        notifyAccessed
                          ? 'bg-[#8c52ff]'
                          : 'bg-[var(--gray-5)]',
                      )}
                      onClick={() => setNotifyAccessed(!notifyAccessed)}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          notifyAccessed
                            ? 'translate-x-4'
                            : 'translate-x-0',
                        )}
                      />
                    </button>
                  </div>
                </div>
              ) : null
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

{
  !isProcessing && (
    <div className='flex items-center gap-2'>
      {isEditing && (
        <Button
          className='h-8 justify-center rounded-lg border border-primary-4 px-3.5 text-[13px] font-semibold shadow-sm transition-shadow hover:border-primary-6 hover:shadow-md'
          color='primary'
          icon='lucide:save'
          iconClass='size-4'
          label={t`Save`}
          loading={approveLoading}
          size='md'
          variant='solid'
          onClick={() => onApprove?.('Save')}
        />
      )}

      {actions?.map((action: any) => {
        const label = String(action?.label || '').toLowerCase()
        let btnColor:
          | 'gray'
          | 'primary'
          | 'secondary'
          | 'red'
          | 'green' = 'primary'
        const btnVariant: 'solid' | 'outline' | 'subtle' | 'ghost' =
          'subtle'
        let borderClass =
          'border-primary-4 hover:border-primary-6 shadow-sm hover:shadow-md transition-shadow'

        let defaultIcon = action?.icon
        if (!defaultIcon) {
          if (
            label === 'approved' ||
            label === 'approve' ||
            label.includes('approve')
          ) {
            defaultIcon = 'lucide:check'
          } else if (
            label === 'rejected' ||
            label === 'reject' ||
            label.includes('reject')
          ) {
            defaultIcon = 'lucide:x'
          } else {
            defaultIcon = 'lucide:arrow-right'
          }
        }

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
          <div
            className='flex items-center gap-1.5'
            key={action?.value}
          >
            <Button
              color={btnColor}
              icon={defaultIcon}
              iconClass='size-4'
              label={action?.label}
              loading={approveLoading}
              size='md'
              variant={btnVariant}
              className={cn(
                borderClass,
                'h-8 justify-center rounded-lg px-3.5 text-[13px] font-semibold',
              )}
              onClick={() => onApprove?.(action?.value)}
            />
          </div>
        )
      })}
    </div>
  )
}
        </div >
      </div >
    </OverlayHeaderWrapper >
  )
}

Header.displayName = 'Header'
export default Header
