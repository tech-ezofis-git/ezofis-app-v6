import { useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getUserListQueryOptions } from '@/api/userQueries'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'

export type ShareInvitePayload = { action: number; email: string }

export type ShareRoleOption = { id: string; name: string }

type SharePopoverProps = {
  className?: string
  /** When true, open the popover on mount. */
  defaultOpen?: boolean
  /** Hide the Share label — icon only. */
  iconOnly?: boolean
  ownerUserId?: string
  roleOptions?: ShareRoleOption[]
  /** Pre-mark users already shared with (ids/emails). */
  sharedIds?: Iterable<string>
  successMessage?: string
  title?: string
  triggerClassName?: string
  triggerLabel?: string
  onOpenChange?: (open: boolean) => void
  onShare: (shares: ShareInvitePayload[], message: string) => Promise<boolean>
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

export default function SharePopover({
  className,
  defaultOpen = false,
  iconOnly = false,
  ownerUserId,
  roleOptions,
  sharedIds,
  successMessage,
  title,
  triggerClassName,
  triggerLabel,
  onOpenChange,
  onShare,
}: SharePopoverProps) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [showShare, setShowShare] = useState(defaultOpen)
  const [shareSearch, setShareSearch] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [sharedUsers, setSharedUsers] = useState<Set<string>>(
    () => new Set(sharedIds ? [...sharedIds] : []),
  )
  const shareRoleOptions = useMemo<ShareRoleOption[]>(
    () =>
      roleOptions || [
        { id: 'View', name: t`View` },
        { id: 'Manage', name: t`Manage` },
      ],
    [roleOptions, t],
  )
  const [globalShareRole, setGlobalShareRole] = useState<ShareRoleOption>(
    () => shareRoleOptions[0] || { id: 'View', name: 'View' },
  )
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [openUserDropdown, setOpenUserDropdown] = useState<string | null>(null)
  const [sendNotification, setSendNotification] = useState(true)
  const [notifyAccessed, setNotifyAccessed] = useState(false)
  const [selectedUsersToShare, setSelectedUsersToShare] = useState<
    Record<string, { permission: string; user: any }>
  >({})
  const shareRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState<{
    left: number
    top: number
  } | null>(null)

  const { data: rawUsers = [], isLoading: usersLoading } = useQuery(
    getUserListQueryOptions(),
  )

  useEffect(() => {
    if (!sharedIds) return
    setSharedUsers(new Set(sharedIds))
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
      const width = 340
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      )
      setPanelPos({ left, top: rect.bottom + 12 })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [showShare])

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
        target.closest('.mantine-Combobox-dropdown') ||
        target.closest('.mantine-Popover-dropdown') ||
        target.closest('[class*="combobox"]') ||
        target.closest('[class*="dropdown"]')
      ) {
        return
      }
      setShowShare(false)
      setSelectedUsersToShare({})
      setShareSearch('')
      setShareMessage('')
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const closeShare = () => {
    setShowShare(false)
    setSelectedUsersToShare({})
    setShareSearch('')
    setShareMessage('')
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
    setShareSearch('')
  }

  const handleBulkShare = async () => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareSearch)
    const selectedCount = Object.keys(selectedUsersToShare).length
    if (selectedCount === 0 && !isEmail) return

    const shares: ShareInvitePayload[] = []
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

    setIsSharing(true)
    try {
      const success = await onShare(shares, shareMessage)
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

  return (
    <div className={cn('relative', className)} ref={shareRef}>
      <button
        aria-label={triggerLabel || t`Share`}
        type='button'
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
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className='fixed z-[200] w-[340px] overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-2xl backdrop-blur-md'
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  ref={panelRef}
                  style={{ left: panelPos.left, top: panelPos.top }}
                  transition={{ duration: 0.15 }}
                >
                  <div className='flex items-center justify-between border-b border-[var(--gray-2)] px-4 py-3'>
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
                      className='flex cursor-pointer items-center justify-center rounded-md p-1 text-[var(--gray-8)] transition-all hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)] active:scale-95'
                      type='button'
                      onClick={closeShare}
                    >
                      <Icon className='size-3.5' name='lucide:x' />
                    </button>
                  </div>

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
                          type='button'
                          onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        >
                          {globalShareRole.name}
                          <Icon
                            className='size-3.5 text-[var(--gray-9)]'
                            name='lucide:chevron-down'
                          />
                        </button>
                        {showRoleDropdown ? (
                          <div className='absolute top-full right-0 z-[110] mt-1 min-w-[120px] rounded-lg border border-[var(--gray-3)] bg-surface py-1 shadow-lg'>
                            {shareRoleOptions.map((opt) => (
                              <button
                                className='flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-[13px] font-medium transition-colors hover:bg-[var(--gray-2)]'
                                key={opt.id}
                                type='button'
                                onClick={() => {
                                  setGlobalShareRole(opt)
                                  setShowRoleDropdown(false)
                                }}
                              >
                                <span>{opt.name}</span>
                                {globalShareRole.id === opt.id ? (
                                  <Icon
                                    className='size-3.5 text-[var(--primary-9)]'
                                    name='lucide:check'
                                  />
                                ) : null}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

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
                            (email ? sharedUsers.has(email) : false)
                          const isSelectedToShare = !!selectedUsersToShare[id]
                          const isOwner =
                            ownerUserId &&
                            (String(user.userId) === String(ownerUserId) ||
                              String(user.id) ===
                                String(ownerUserId).toLowerCase() ||
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
                                  !isShared &&
                                  !isOwner &&
                                  handleToggleSelectUser(user)
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
                                      onChange={() =>
                                        handleToggleSelectUser(user)
                                      }
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
                                  <div className='relative shrink-0'>
                                    <button
                                      className='flex cursor-pointer items-center gap-1 rounded-md border border-[var(--gray-3)] bg-surface px-2.5 py-1 text-[11px] font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--gray-2)]'
                                      type='button'
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
                                            ?.permission || globalShareRole.id),
                                      )?.name ||
                                        selectedUsersToShare[id]?.permission ||
                                        globalShareRole.id}
                                      <Icon
                                        className='size-3 text-[var(--gray-9)]'
                                        name='lucide:chevron-down'
                                      />
                                    </button>
                                    {openUserDropdown === id ? (
                                      <div className='absolute top-full right-0 z-[110] mt-1 min-w-[100px] rounded-lg border border-[var(--gray-3)] bg-surface py-1 shadow-lg'>
                                        {shareRoleOptions.map((opt) => (
                                          <button
                                            className='flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-[11px] font-medium transition-colors hover:bg-[var(--gray-2)]'
                                            key={opt.id}
                                            type='button'
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
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <p className='px-3 py-6 text-center text-[12px] text-[var(--gray-9)]'>
                        {t`Search for people to share with`}
                      </p>
                    )}
                  </div>

                  {(() => {
                    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                      shareSearch,
                    )
                    const hasSelectedUsers =
                      Object.keys(selectedUsersToShare).length > 0
                    const showFooter =
                      hasSelectedUsers || shareSearch.length > 0
                    const canShare = hasSelectedUsers || isEmail

                    if (!showFooter) return null

                    return (
                      <div className='flex flex-col gap-3 border-t border-[var(--gray-2)] bg-surface p-4'>
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
                            className='w-full rounded-lg border border-[var(--gray-3)] bg-surface p-2.5 text-[13px] font-medium text-[var(--gray-13)] transition-all placeholder:text-[var(--gray-8)] focus:border-[var(--primary-5)] focus:ring-1 focus:ring-[var(--primary-4)] focus:outline-none'
                            placeholder={t`Add message (optional)`}
                            rows={3}
                            value={shareMessage}
                            onChange={(e) => setShareMessage(e.target.value)}
                          />
                        ) : null}
                        <button
                          disabled={!canShare || isSharing}
                          type='button'
                          className={cn(
                            'mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-bold shadow-sm transition-all',
                            canShare && !isSharing
                              ? 'cursor-pointer bg-[var(--primary-9)] text-white hover:bg-[var(--primary-10)] hover:shadow-md active:scale-95'
                              : 'cursor-not-allowed bg-[var(--gray-3)] text-[var(--gray-8)]',
                          )}
                          onClick={() => void handleBulkShare()}
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
                            <span className='ml-0.5 rounded-full bg-primary-9 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white'>
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
                                ? 'bg-primary-9'
                                : 'bg-[var(--gray-5)]',
                            )}
                            onClick={() => setNotifyAccessed(!notifyAccessed)}
                          >
                            <span
                              className={cn(
                                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--control-thumb)] shadow ring-0 transition duration-200 ease-in-out',
                                notifyAccessed
                                  ? 'translate-x-4'
                                  : 'translate-x-0',
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  )
}
