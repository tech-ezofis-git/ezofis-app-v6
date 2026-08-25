import { useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SignRequestSigningMode } from '@/api/v6/folder/signRequest'
import { getUserListQueryOptions } from '@/api/userQueries'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSegmentedControl from '@/components/base/inputs/InputSegmentedControl'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'

export type FolderShareRoleOption = {
  id: string
  name: string
  description?: string
  icon?: string
}

export type FolderShareInvitePayload = {
  /** 0 = View, 1 = Manage/Edit, 2 = Sign */
  action: number
  email: string
  permission: string
}

export type FolderShareMeta = {
  signingMode: SignRequestSigningMode
}

type FolderSharePopoverProps = {
  className?: string
  /** When true, open the popover on mount (e.g. list "Share" action). */
  defaultOpen?: boolean
  ownerUserId?: string
  roleOptions?: FolderShareRoleOption[]
  /** Pre-mark users already shared with (ids/emails). */
  sharedIds?: Iterable<string>
  /** Optional role per shared email/id (`View` | `Sign` | …). */
  sharedRoles?: Record<string, string>
  successMessage?: string
  title?: string
  triggerClassName?: string
  /** Hide the Share label — icon + optional tooltip via wrapper. */
  iconOnly?: boolean
  triggerLabel?: string
  onOpenChange?: (open: boolean) => void
  onShare: (
    shares: FolderShareInvitePayload[],
    message: string,
    meta?: FolderShareMeta,
  ) => Promise<boolean>
}



const roleAction = (role: string) => {
  if (role === 'View') return 0
  if (role === 'Sign') return 2
  return 1
}

const roleIcon = (role: FolderShareRoleOption) => {
  if (role.icon) return role.icon
  if (role.id === 'Sign') return 'lucide:pen-line'
  if (role.id === 'View') return 'lucide:eye'
  if (role.id === 'Manage') return 'lucide:settings-2'
  return 'lucide:shield'
}

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

const userKey = (user: any): string =>
  String(
    user.userId || user.id || user.value || user.loginName || user.email || '',
  )

export default function FolderSharePopover({
  className,
  defaultOpen = false,
  ownerUserId,
  roleOptions,
  sharedIds,
  sharedRoles,
  successMessage,
  title,
  triggerClassName,
  iconOnly = false,
  triggerLabel,
  onOpenChange,
  onShare,
}: FolderSharePopoverProps) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [showShare, setShowShare] = useState(defaultOpen)
  const [shareSearch, setShareSearch] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [sharedUsers, setSharedUsers] = useState<Set<string>>(
    () => new Set(sharedIds ? [...sharedIds] : []),
  )
  const shareRoleOptions = useMemo<FolderShareRoleOption[]>(
    () =>
      roleOptions || [
        {
          icon: 'lucide:eye',
          id: 'View',
          name: t`View`,
        },
        {
          icon: 'lucide:pen-line',
          id: 'Sign',
          name: t`Sign`,
        },
      ],
    [roleOptions, t],
  )
  const [globalShareRole, setGlobalShareRole] = useState<FolderShareRoleOption>(
    () => shareRoleOptions[0] || { id: 'View', name: 'View' },
  )
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [openUserDropdown, setOpenUserDropdown] = useState<string | null>(null)
  const [sendNotification, setSendNotification] = useState(true)
  const [selectedUsersToShare, setSelectedUsersToShare] = useState<
    Record<string, { permission: string; user: any }>
  >({})
  const [selectedOrder, setSelectedOrder] = useState<string[]>([])

  const isEmailInput = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareSearch.trim())
  }, [shareSearch])

  const isAlreadySelected = useMemo(() => {
    return !!selectedUsersToShare[shareSearch.trim()]
  }, [selectedUsersToShare, shareSearch])

  const showPressEnterPrompt = isEmailInput && !isAlreadySelected

  const signingModeOptions = useMemo(
    () => [
      { id: 'non-sequential', name: t`Flexible Order` },
      { id: 'sequential', name: t`Fixed Order` },
    ],
    [t],
  )
  const [signingModeOption, setSigningModeOption] = useState(
    () => signingModeOptions[0],
  )
  const shareRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState<{
    left: number
    top?: number
    bottom?: number
    maxHeight: number
  } | null>(null)
  // The user list scrolls, so its role menu is portalled out to avoid clipping.
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [userDropdownPos, setUserDropdownPos] = useState<{
    left: number
    top: number
    width: number
  } | null>(null)

  const { data: rawUsers = [], isLoading: usersLoading } = useQuery(
    getUserListQueryOptions(),
  )

  useEffect(() => {
    if (!sharedIds) return
    setSharedUsers(new Set([...sharedIds]))
  }, [sharedIds])

  useEffect(() => {
    if (!defaultOpen) return
    setShowShare(true)
  }, [defaultOpen])

  useEffect(() => {
    onOpenChange?.(showShare)
  }, [showShare, onOpenChange])

  useEffect(() => {
    if (!shareRoleOptions.some((opt) => opt.id === globalShareRole.id)) {
      setGlobalShareRole(shareRoleOptions[0] || { id: 'View', name: 'View' })
    }
  }, [shareRoleOptions, globalShareRole.id])

  useLayoutEffect(() => {
    if (!showShare || !shareRef.current) {
      setPanelPos(null)
      return
    }
    const update = () => {
      const rect = shareRef.current?.getBoundingClientRect()
      if (!rect) return

      const width = 360
      const gap = 8
      const edge = 8
      const left = Math.min(
        Math.max(edge, rect.right - width),
        window.innerWidth - width - edge,
      )
      const spaceBelow = window.innerHeight - rect.bottom - gap - edge
      const spaceAbove = rect.top - gap - edge
      const preferredMax = Math.min(
        Math.floor(window.innerHeight * 0.85),
        640,
      )
      const minComfortable = 280

      if (spaceBelow >= minComfortable || spaceBelow >= spaceAbove) {
        setPanelPos({
          left,
          maxHeight: Math.max(200, Math.min(preferredMax, spaceBelow)),
          top: rect.bottom + gap,
        })
      } else {
        setPanelPos({
          bottom: window.innerHeight - rect.top + gap,
          left,
          maxHeight: Math.max(200, Math.min(preferredMax, spaceAbove)),
        })
      }
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [showShare])

  useLayoutEffect(() => {
    if (!openUserDropdown) {
      setUserDropdownPos(null)
      return
    }
    const update = () => {
      const rect = userDropdownAnchorRef.current?.getBoundingClientRect()
      if (!rect) return

      const width = Math.max(120, rect.width)
      const height = shareRoleOptions.length * 34 + 8
      const gap = 4
      const edge = 8
      const left = Math.min(
        Math.max(edge, rect.right - width),
        window.innerWidth - width - edge,
      )
      const spaceBelow = window.innerHeight - rect.bottom - gap - edge
      const top =
        spaceBelow >= height
          ? rect.bottom + gap
          : Math.max(edge, rect.top - gap - height)

      setUserDropdownPos({ left, top, width })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [openUserDropdown, shareRoleOptions.length])

  useEffect(() => {
    if (!openUserDropdown) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        userDropdownRef.current?.contains(target) ||
        userDropdownAnchorRef.current?.contains(target)
      ) {
        return
      }
      setOpenUserDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openUserDropdown])

  const users = useMemo(() => {
    if (!shareSearch) {
      return (rawUsers as any[]).filter((user) => {
        const id = userKey(user)
        const isShared = sharedUsers.has(id) || sharedUsers.has(getEmail(user))
        const isOwner =
          ownerUserId &&
          (String(user.userId) === String(ownerUserId) ||
            String(user.id) === String(ownerUserId).toLowerCase() ||
            String(user.value) === String(ownerUserId) ||
            String(user.loginName) === String(ownerUserId))
        return isOwner || isShared
      })
    }
    return (rawUsers as any[]).filter((u) => {
      const name = getDisplayName(u).toLowerCase()
      const email = getEmail(u).toLowerCase()
      const q = shareSearch.toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [rawUsers, shareSearch, sharedUsers, ownerUserId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        shareRef.current?.contains(target) ||
        panelRef.current?.contains(target) ||
        userDropdownRef.current?.contains(target) ||
        target.closest('.mantine-Combobox-dropdown') ||
        target.closest('.mantine-Popover-dropdown') ||
        target.closest('[class*="combobox"]') ||
        target.closest('[class*="dropdown"]')
      ) {
        return
      }
      setShowShare(false)
      setSelectedUsersToShare({})
      setSelectedOrder([])
      setShareSearch('')
      setShareMessage('')
      setOpenUserDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const closeShare = () => {
    setShowShare(false)
    setSelectedUsersToShare({})
    setSelectedOrder([])
    setShareSearch('')
    setShareMessage('')
    setSigningModeOption(signingModeOptions[0])
    setOpenUserDropdown(null)
  }

  const handleToggleSelectUser = (user: any) => {
    const id = userKey(user)
    if (!id) return
    setSelectedUsersToShare((prev) => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = { permission: globalShareRole.id, user }
      }
      return next
    })
    setSelectedOrder((prev) => {
      if (prev.includes(id)) return prev.filter((entry) => entry !== id)
      return [...prev, id]
    })
    setShareSearch('')
  }

  const handleBulkShare = async () => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareSearch)
    const selectedCount = Object.keys(selectedUsersToShare).length
    if (selectedCount === 0 && !isEmail) return

    const orderedIds = [
      ...selectedOrder.filter((id) => selectedUsersToShare[id]),
      ...Object.keys(selectedUsersToShare).filter(
        (id) => !selectedOrder.includes(id),
      ),
    ]

    const shares: FolderShareInvitePayload[] = []
    orderedIds.forEach((id) => {
      const entry = selectedUsersToShare[id]
      if (!entry) return
      const email = getEmail(entry.user)
      const role = entry.permission || globalShareRole.id
      if (email) {
        shares.push({
          action: roleAction(role),
          email,
          permission: role,
        })
      }
    })
    if (isEmail) {
      shares.push({
        action: roleAction(globalShareRole.id),
        email: shareSearch,
        permission: globalShareRole.id,
      })
    }

    const signShares = shares.filter(
      (share) => share.permission === 'Sign' || share.action === 2,
    )
    let meta: FolderShareMeta | undefined
    if (signShares.length === 1) {
      meta = { signingMode: 'single' }
    } else if (signShares.length > 1) {
      meta = {
        signingMode:
          signingModeOption.id === 'sequential' ? 'sequential' : 'multiple',
      }
    }

    setIsSharing(true)
    try {
      const success = await onShare(shares, shareMessage, meta)
      if (!success) return

      setSharedUsers((prev) => {
        const next = new Set(prev)
        Object.keys(selectedUsersToShare).forEach((id) => next.add(id))
        if (selectedCount === 0 && isEmail) next.add(shareSearch)
        return next
      })
      closeShare()
      queryClient.invalidateQueries({ queryKey: ['user-list'] })
      showToast({
        message: successMessage || t`Shared successfully`,
        variant: 'success',
      })
    } finally {
      setIsSharing(false)
    }
  }

  const selectingSign =
    globalShareRole.id === 'Sign' ||
    Object.values(selectedUsersToShare).some(
      (entry) => entry.permission === 'Sign',
    )

  const signOrderIds = useMemo(
    () =>
      selectedOrder.filter(
        (id) => selectedUsersToShare[id]?.permission === 'Sign',
      ),
    [selectedOrder, selectedUsersToShare],
  )
  const isSequential = signingModeOption.id === 'sequential'

  const resolveSharedRole = (id: string, email: string) => {
    const byId = sharedRoles?.[id]
    const byEmail = email ? sharedRoles?.[email.toLowerCase()] : undefined
    return byId || byEmail || ''
  }

  return (
    <div className={cn('relative', className)} ref={shareRef}>
      <button
        type='button'
        aria-label={triggerLabel || t`Share`}
        className={cn(
          'flex cursor-pointer items-center justify-center gap-2 rounded-lg border font-semibold transition-all hover:shadow-sm active:scale-95',
          iconOnly ? 'h-8 w-8 px-0' : 'h-8 px-3.5 text-[13px]',
          showShare
            ? 'border-[var(--primary-6)] bg-[var(--primary-1)] text-[var(--primary-9)]'
            : 'border-[var(--gray-3)] bg-surface text-[var(--gray-11)] hover:border-[var(--gray-5)] hover:text-[var(--gray-13)]',
          triggerClassName,
        )}
        onClick={() => {
          setShowShare(!showShare)
          setShareSearch('')
        }}
      >
        <Icon className='size-4' name='tabler:user-share' />
        {!iconOnly ? <span>{triggerLabel || t`Share`}</span> : null}
        {!iconOnly && sharedUsers.size > 0 ? (
          <span className='flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--primary-9)] px-1 text-[10px] font-bold text-white'>
            {sharedUsers.size}
          </span>
        ) : null}
      </button>

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {showShare && panelPos ? (
                <motion.div
                  ref={panelRef}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className='fixed z-[200] flex w-[360px] flex-col overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-2xl backdrop-blur-md'
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  style={{
                    bottom: panelPos.bottom,
                    left: panelPos.left,
                    maxHeight: panelPos.maxHeight,
                    top: panelPos.top,
                  }}
                  transition={{ duration: 0.15 }}
                >
            <div className='flex shrink-0 items-center justify-between border-b border-[var(--gray-2)] px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Icon
                  className='size-4 text-[var(--primary-9)]'
                  name='tabler:user-share'
                />
                <span className='text-[13px] font-semibold text-[var(--gray-13)]'>
                  {title || t`Share`}
                </span>
              </div>
              <button
                type='button'
                className='flex cursor-pointer items-center justify-center rounded-md p-1 text-[var(--gray-8)] transition-all hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)] active:scale-95'
                onClick={closeShare}
              >
                <Icon className='size-3.5' name='lucide:x' />
              </button>
            </div>

            <div className='shrink-0 px-3 pt-3 pb-2'>
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
                          setSelectedOrder((prev) =>
                            prev.includes(val) ? prev : [...prev, val],
                          )
                          setShareSearch('')
                        }
                      }
                    }}
                  />
                </div>

                <div className='h-4 w-px shrink-0 bg-[var(--gray-3)]' />
                <div className='relative shrink-0'>
                  <button
                    type='button'
                    className='flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[13px] font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--gray-2)]'
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  >
                    <Icon
                      className='size-3.5 text-[var(--primary-9)]'
                      name={roleIcon(globalShareRole)}
                    />
                    {globalShareRole.name}
                    <Icon
                      className='size-3.5 text-[var(--gray-9)]'
                      name='lucide:chevron-down'
                    />
                  </button>
                  {showRoleDropdown && (
                    <div className='absolute top-full right-0 z-[110] mt-1 min-w-[140px] overflow-visible rounded-lg border border-[var(--gray-3)] bg-surface py-1 shadow-lg'>
                      {shareRoleOptions.map((opt) => (
                        <button
                          type='button'
                          className='flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--gray-2)]'
                          key={opt.id}
                          onClick={() => {
                            setGlobalShareRole(opt)
                            setShowRoleDropdown(false)
                          }}
                        >
                          <Icon
                            className='size-3.5 shrink-0 text-[var(--primary-9)]'
                            name={roleIcon(opt)}
                          />
                          <span className='min-w-0 flex-1 text-[13px] font-semibold text-[var(--gray-13)]'>
                            {opt.name}
                          </span>
                          {globalShareRole.id === opt.id ? (
                            <Icon
                              className='size-3.5 shrink-0 text-[var(--primary-9)]'
                              name='lucide:check'
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain'>
            <div className='px-2 py-2'>
              {showPressEnterPrompt && (
                <button
                  type='button'
                  className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-[var(--primary-2)]/30 border border-dashed border-[var(--primary-4)] bg-[var(--primary-1)]/10 mb-2'
                  onClick={() => {
                    const val = shareSearch.trim()
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
                    setSelectedOrder((prev) =>
                      prev.includes(val) ? prev : [...prev, val],
                    )
                    setShareSearch('')
                  }}
                >
                  <Icon
                    className='size-4 text-[var(--primary-9)] shrink-0'
                    name='lucide:plus'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='text-[12px] font-semibold text-[var(--primary-9)]'>
                      Press Enter to add "{shareSearch.trim()}"
                    </p>
                    <p className='text-[10px] text-[var(--gray-9)]'>
                      Share with this external email address
                    </p>
                  </div>
                </button>
              )}

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
                    .map((s) => s.user)
                    .filter(
                      (su) =>
                        !users.some(
                          (u: any) => userKey(u) === userKey(su),
                        ),
                    ),
                ]
                  .sort((a: any, b: any) => {
                    const aSelected = !!selectedUsersToShare[userKey(a)]
                    const bSelected = !!selectedUsersToShare[userKey(b)]
                    if (aSelected && !bSelected) return -1
                    if (!aSelected && bSelected) return 1
                    return 0
                  })
                  .map((user: any) => {
                    const id = userKey(user)
                    const name = getDisplayName(user)
                    const email = getEmail(user)
                    const initials = getInitials(user)
                    const avatarColor = getAvatarColor(email || name)
                    const isShared =
                      sharedUsers.has(id) ||
                      (email ? sharedUsers.has(email) : false) ||
                      (email
                        ? sharedUsers.has(email.toLowerCase())
                        : false)
                    const existingRole = resolveSharedRole(
                      id,
                      email.toLowerCase(),
                    )
                    const isSelectedToShare = !!selectedUsersToShare[id]
                    const selectedRole =
                      shareRoleOptions.find(
                        (opt) =>
                          opt.id ===
                          (selectedUsersToShare[id]?.permission ||
                            globalShareRole.id),
                      ) || globalShareRole
                    const isOwner =
                      ownerUserId &&
                      (String(user.userId) === String(ownerUserId) ||
                        String(user.id) === String(ownerUserId).toLowerCase() ||
                        String(user.value) === String(ownerUserId) ||
                        String(user.loginName) === String(ownerUserId))

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
                        <div
                          className='flex min-w-0 flex-1 cursor-pointer items-center gap-3'
                          onClick={() =>
                            !isShared && !isOwner && handleToggleSelectUser(user)
                          }
                        >
                          {isOwner ? (
                            <div
                              className='flex w-5 shrink-0 items-center justify-center'
                              title={t`Owner`}
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
                                onChange={() => handleToggleSelectUser(user)}
                              />
                            </div>
                          )}

                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm',
                              avatarColor,
                            )}
                          >
                            {initials}
                          </div>

                          <div className='min-w-0 flex-1'>
                            <p
                              className='truncate text-[12px] font-semibold text-[var(--gray-13)]'
                              title={name}
                            >
                              {name}
                            </p>
                            {email ? (
                              <p
                                className='truncate text-[11px] text-[var(--gray-9)]'
                                title={email}
                              >
                                {email}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className='shrink-0'
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isOwner ? (
                            <span className='flex items-center gap-1 rounded-full border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--primary-9)]'>
                              <Icon className='size-3' name='tabler:crown' />
                              {t`Owner`}
                            </span>
                          ) : isShared ? (
                            existingRole === 'Sign' ? (
                              <span className='flex items-center gap-1 rounded-full border border-primary-4 bg-primary-2 px-2.5 py-0.5 text-[10px] font-semibold text-primary-10'>
                                <Icon
                                  className='size-3'
                                  name='lucide:pen-line'
                                />
                                {t`Sign`}
                              </span>
                            ) : (
                              <span className='flex items-center gap-1 rounded-full bg-[var(--green-2)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--green-9)]'>
                                <Icon className='size-3' name='lucide:eye' />
                                {t`View`}
                              </span>
                            )
                          ) : isSelectedToShare ? (
                            <div className='relative shrink-0'>
                              <button
                                type='button'
                                className='flex cursor-pointer items-center gap-1 rounded-md border border-[var(--gray-3)] bg-surface px-2.5 py-1 text-[11px] font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--gray-2)]'
                                onClick={(event) => {
                                  const isOpen = openUserDropdown === id
                                  userDropdownAnchorRef.current = isOpen
                                    ? null
                                    : event.currentTarget
                                  setOpenUserDropdown(isOpen ? null : id)
                                }}
                              >
                                <Icon
                                  className='size-3 text-[var(--primary-9)]'
                                  name={roleIcon(selectedRole)}
                                />
                                {selectedRole.name}
                                <Icon
                                  className='size-3 text-[var(--gray-9)]'
                                  name='lucide:chevron-down'
                                />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
              ) : showPressEnterPrompt ? null : (
                <p className='px-3 py-6 text-center text-[12px] text-[var(--gray-9)]'>
                  {t`Search for people to share with`}
                </p>
              )}
            </div>

            {signOrderIds.length > 0 ? (
              <div className='space-y-3 border-t border-[var(--gray-2)] px-3 py-3'>
                <InputSegmentedControl
                  options={signingModeOptions}
                  value={
                    signingModeOptions.find(
                      (opt) => opt.id === signingModeOption.id,
                    ) || signingModeOptions[0]
                  }
                  onChange={(option) =>
                    setSigningModeOption({
                      id: String(option.id),
                      name: option.name,
                    })
                  }
                />
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-[12px] font-semibold text-[var(--gray-10)]'>
                    {isSequential ? t`Signing order` : t`Signers`}
                  </p>
                  <p className='text-[11px] text-[var(--gray-9)]'>
                    {t`Drag to reorder`}
                  </p>
                </div>
                <SortableContainer
                  items={signOrderIds}
                  onItemsChange={(items) => {
                    setSelectedOrder((prev) => {
                      const nonSign = prev.filter(
                        (id) => selectedUsersToShare[id]?.permission !== 'Sign',
                      )
                      return [...nonSign, ...items]
                    })
                  }}
                >
                  <div className='space-y-1.5'>
                    {signOrderIds.map((id, index) => {
                      const entry = selectedUsersToShare[id]
                      if (!entry) return null
                      const name = getDisplayName(entry.user)
                      const email = getEmail(entry.user)
                      return (
                        <SortableItem
                          key={id}
                          className='rounded-lg border border-[var(--gray-3)] bg-surface px-2 py-1.5'
                          handlerPosition='before'
                          id={id}
                          trailing={
                            <button
                              type='button'
                              aria-label={t`Remove signer`}
                              className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--red-9)] transition-colors hover:bg-[var(--red-2)]'
                              onClick={() => {
                                setSelectedUsersToShare((prev) => {
                                  const next = { ...prev }
                                  delete next[id]
                                  return next
                                })
                                setSelectedOrder((prev) =>
                                  prev.filter((entryId) => entryId !== id),
                                )
                              }}
                            >
                              <Icon className='size-3.5' name='lucide:trash-2' />
                            </button>
                          }
                        >
                          <div className='flex min-w-0 flex-1 items-center gap-2'>
                            <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-3 text-[11px] font-bold text-primary-11'>
                              {index + 1}
                            </span>
                            <span className='min-w-0'>
                              <span className='block truncate text-[12px] font-semibold text-[var(--gray-13)]'>
                                {name}
                              </span>
                              {email ? (
                                <span className='block truncate text-[11px] text-[var(--gray-9)]'>
                                  {email}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </SortableItem>
                      )
                    })}
                  </div>
                </SortableContainer>
              </div>
            ) : null}
            </div>

            {(() => {
              const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareSearch)
              const hasSelectedUsers =
                Object.keys(selectedUsersToShare).length > 0
              const showFooter = hasSelectedUsers || shareSearch.length > 0
              const canShare = hasSelectedUsers || isEmail

              if (!showFooter) return null

              return (
                <div className='flex shrink-0 flex-col gap-2.5 border-t border-[var(--gray-2)] bg-surface p-3'>
                  <div
                    className='flex w-fit cursor-pointer items-center gap-2'
                    onClick={() => setSendNotification(!sendNotification)}
                  >
                    <InputCheckbox
                      checked={sendNotification}
                      className='cursor-pointer'
                      onChange={() => {}}
                    />
                    <span className='text-[13px] font-medium text-[var(--gray-13)] select-none'>
                      {t`Send notification`}
                    </span>
                  </div>
                  {sendNotification ? (
                    <textarea
                      className='w-full resize-none rounded-lg border border-[var(--gray-3)] bg-surface px-2.5 py-1.5 text-[12px] font-medium text-[var(--gray-13)] transition-all placeholder:text-[var(--gray-8)] focus:border-[var(--primary-5)] focus:ring-1 focus:ring-[var(--primary-4)] focus:outline-none'
                      placeholder={t`Add message (optional)`}
                      rows={2}
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                    />
                  ) : null}
                  <button
                    disabled={!canShare || isSharing}
                    type='button'
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-bold shadow-sm transition-all',
                      canShare && !isSharing
                        ? 'cursor-pointer bg-[var(--primary-9)] text-white hover:bg-[var(--primary-10)] hover:shadow-md active:scale-95'
                        : 'cursor-not-allowed bg-[var(--gray-3)] text-[var(--gray-8)]',
                    )}
                    onClick={() => void handleBulkShare()}
                  >
                    {isSharing
                      ? t`Sharing...`
                      : selectingSign
                        ? t`Send sign request`
                        : t`Share`}
                  </button>
                </div>
              )
            })()}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {typeof document !== 'undefined' &&
      showShare &&
      openUserDropdown &&
      userDropdownPos
        ? createPortal(
            <div
              ref={userDropdownRef}
              className='fixed z-[210] overflow-hidden rounded-lg border border-[var(--gray-3)] bg-surface py-1 shadow-lg'
              style={{
                left: userDropdownPos.left,
                minWidth: userDropdownPos.width,
                top: userDropdownPos.top,
              }}
            >
              {shareRoleOptions.map((opt) => (
                <button
                  type='button'
                  className='flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--gray-2)]'
                  key={opt.id}
                  onClick={() => {
                    const id = openUserDropdown
                    setSelectedUsersToShare((prev) => ({
                      ...prev,
                      [id]: { ...prev[id], permission: opt.id },
                    }))
                    if (opt.id === 'Sign') {
                      setSelectedOrder((prev) =>
                        prev.includes(id) ? prev : [...prev, id],
                      )
                    }
                    setOpenUserDropdown(null)
                  }}
                >
                  <Icon
                    className='size-3.5 shrink-0 text-[var(--primary-9)]'
                    name={roleIcon(opt)}
                  />
                  <span className='min-w-0 flex-1 text-[11px] font-semibold text-[var(--gray-13)]'>
                    {opt.name}
                  </span>
                  {(selectedUsersToShare[openUserDropdown]?.permission ||
                    globalShareRole.id) === opt.id ? (
                    <Icon
                      className='size-3.5 shrink-0 text-[var(--primary-9)]'
                      name='lucide:check'
                    />
                  ) : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
