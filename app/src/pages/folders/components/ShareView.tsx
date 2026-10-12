import { useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getUsers } from '@/api/v6/user'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import showToast from '@/components/base/toast/showToast'
import type { ShareData } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import { DynamicIcon } from './icons'
import { Button, Card, IconButton, PrimaryButton } from './Ui'

type SharePerson = ShareData['sharedWith'][number]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MONTH_ABBR = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const

export function ShareView({
  fileName,
  itemId,
  repositoryId,
  onBack,
}: {
  fileName?: string
  itemId: string
  repositoryId: string
  onBack: () => void
}) {
  const { t } = useLingui()
  const permissionOptions = useMemo<Option[]>(
    () => [
      { id: 'can-view', name: t`Can View`, value: 'Can View' },
      { id: 'can-edit', name: t`Can Edit`, value: 'Can Edit' },
    ],
    [t],
  )
  const [data, setData] = useState<ShareData | null>(null)
  const [selectedEmails, setSelectedEmails] = useState<Option[]>([])
  const [permissionOption, setPermissionOption] = useState<Option | null>(null)
  const [userOptions, setUserOptions] = useState<Option[]>([])
  const [localShares, setLocalShares] = useState<SharePerson[]>([])
  const [inviting, setInviting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    setPermissionOption((current) => current ?? permissionOptions[0] ?? null)
  }, [permissionOptions])

  const permission =
    permissionOption?.value || permissionOption?.name || 'Can View'

  const emailOptions = useMemo(() => {
    const byKey = new Map<string, Option>()
    userOptions.forEach((option) => {
      byKey.set(optionEmail(option), option)
    })
    selectedEmails.forEach((option) => {
      const key = optionEmail(option)
      if (!byKey.has(key)) byKey.set(key, option)
    })
    return Array.from(byKey.values())
  }, [selectedEmails, userOptions])

  useEffect(() => {
    let mounted = true
    void getUsers().then((response) => {
      if (!mounted || response.error || !Array.isArray(response.data)) return
      setUserOptions(
        response.data
          .filter((user) => Boolean(user.email?.trim()))
          .map((user) => ({
            description: user.displayName || undefined,
            id: user.id || user.email,
            name: user.email,
            value: user.email,
          })),
      )
    })
    return () => {
      mounted = false
    }
  }, [])

  const loadShareData = useCallback(async () => {
    if (!itemId || !repositoryId) {
      setData({
        documentId: '',
        invitePermissions: ['Can View', 'Can Edit'],
        link: '',
        permissions: [],
        sharedWith: [],
      })
      return
    }

    const next = await folderApi.getShareData({
      itemId,
      localShares,
      repositoryId,
    })
    setData(next)
  }, [itemId, localShares, repositoryId])

  useEffect(() => {
    void loadShareData()
  }, [loadShareData])

  const handleInvite = async () => {
    const emails = selectedEmails
      .map(optionEmail)
      .filter((email) => EMAIL_PATTERN.test(email))

    if (!emails.length) {
      showToast({
        message: t`Select or add at least one valid email`,
        variant: 'error',
      })
      return
    }
    if (!repositoryId || !itemId) {
      showToast({
        message: t`Missing file context for share`,
        variant: 'error',
      })
      return
    }

    setInviting(true)
    try {
      const invitedPeople: SharePerson[] = []

      for (const email of emails) {
        const result = await folderApi.inviteToShare({
          email,
          itemId,
          message: fileName
            ? t`Please review this file: ${fileName}`
            : t`Please review this file`,
          permission,
          repositoryId,
        })
        invitedPeople.push(
          personFromInvite(
            result.recipientEmail || email,
            result.permission || permission,
            result.shareId,
            buildShareUrlFromInvite(result),
          ),
        )
      }

      setLocalShares((prev) => {
        const next = [...invitedPeople]
        prev.forEach((person) => {
          if (
            !next.some(
              (entry) =>
                entry.email.toLowerCase() === person.email.toLowerCase(),
            )
          ) {
            next.push(person)
          }
        })
        return next
      })
      setSelectedEmails([])
      showToast({
        message:
          emails.length === 1
            ? t`File shared successfully`
            : t`File shared with ${emails.length} recipients successfully`,
        variant: 'success',
      })

      const refreshed = await folderApi.getShareData({
        itemId,
        localShares: invitedPeople,
        repositoryId,
      })
      setData(refreshed)
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : t`Failed to invite`,
        variant: 'error',
      })
    } finally {
      setInviting(false)
    }
  }

  const handleRevoke = async (person: SharePerson) => {
    if (!person.shareId) {
      showToast({ message: t`Cannot revoke this share`, variant: 'error' })
      return
    }
    setRevokingId(person.shareId)
    try {
      await folderApi.revokeShare(person.shareId)
      setLocalShares((prev) =>
        prev.filter((entry) => entry.shareId !== person.shareId),
      )
      showToast({ message: t`Share revoked`, variant: 'success' })
      await loadShareData()
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : t`Failed to revoke`,
        variant: 'error',
      })
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopyPersonLink = async (person: SharePerson) => {
    const link = person.shareUrl?.trim()
    if (!link) {
      showToast({
        message: t`No share link available for this user`,
        variant: 'error',
      })
      return
    }
    try {
      await navigator.clipboard.writeText(link)
      showToast({ message: t`Link copied`, variant: 'success' })
    } catch {
      showToast({ message: t`Could not copy link`, variant: 'error' })
    }
  }

  if (!data) {
    return (
      <div className='p-6 text-[13px] text-gray-10'>
        {t`Loading share options...`}
      </div>
    )
  }

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      <div className='flex h-[60px] shrink-0 items-center gap-3 border-b border-gray-3 bg-surface-primary px-5'>
        <Button className='h-8 px-3 text-[13px]' type='button' onClick={onBack}>
          <ArrowLeft size={12} /> {t`Back`}
        </Button>
        <span className='min-w-0 truncate text-[14px] font-semibold text-gray-13'>
          {t`Share`}
          {' : '}
          {fileName || t`Untitled`}
        </span>
      </div>

      <div className='ez-share-scroll min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-[780px] space-y-5 px-6 py-8'>
          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-5 flex items-center gap-2 text-[16px] font-semibold text-gray-13'>
              <DynamicIcon className='h-5 w-5 text-blue-11' name='mail' />
              {t`Invite People`}
            </h2>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px_108px] sm:items-start'>
              <InputSelectMultiple
                createOptionLabel={() => t`Press Enter to add this email`}
                isCreatableSearch={(search) => EMAIL_PATTERN.test(search)}
                options={emailOptions}
                placeholder={t`Select or type email…`}
                searchPlaceholder={t`Search users or type email…`}
                value={selectedEmails}
                clearable
                creatable
                searchable
                onChange={(next) => {
                  const seen = new Set<string>()
                  const deduped: Option[] = []
                  for (const option of next) {
                    const email = optionEmail(option)
                    if (!email || seen.has(email)) continue
                    if (!EMAIL_PATTERN.test(email)) {
                      showToast({
                        message: t`Enter a valid email address`,
                        variant: 'error',
                      })
                      continue
                    }
                    seen.add(email)
                    deduped.push({
                      ...option,
                      name: email,
                      value: email,
                    })
                  }
                  setSelectedEmails(deduped)
                }}
              />

              <InputSelect
                options={permissionOptions}
                placeholder={t`Permission`}
                value={permissionOption}
                onChange={setPermissionOption}
              />

              <PrimaryButton
                className='h-10 rounded-lg px-4 text-[14px] shadow-sm'
                disabled={inviting || selectedEmails.length === 0}
                type='button'
                onClick={() => void handleInvite()}
              >
                <DynamicIcon className='h-4 w-4' name='send' />
                {inviting ? '…' : t`Invite`}
              </PrimaryButton>
            </div>
          </Card>

          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-6 flex items-center justify-between text-[16px] font-semibold text-gray-13'>
              <span className='flex items-center gap-2'>
                <DynamicIcon className='h-5 w-5 text-blue-11' name='users' />
                {t`Currently Shared With`}
              </span>

              <span className='inline-flex h-6 w-fit items-center rounded-full bg-gray-2 px-3 text-[12px] font-semibold whitespace-nowrap text-gray-13'>
                {t`${data.sharedWith.length} people`}
              </span>
            </h2>

            <div className='space-y-4'>
              {data.sharedWith.length === 0 ? (
                <p className='text-[13px] text-gray-10'>
                  {t`No one has been invited yet.`}
                </p>
              ) : (
                data.sharedWith.map((person) => {
                  const canEdit = isEditPermission(person.permission)
                  return (
                    <div
                      className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3'
                      key={person.shareId || person.email}
                    >
                      <div className='flex min-w-0 items-center gap-3'>
                        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[13px] font-semibold text-blue-11'>
                          {person.initials}
                        </span>

                        <div className='min-w-0'>
                          <b className='block truncate text-[14px] leading-5 font-semibold text-gray-13'>
                            {person.name}
                          </b>
                          <p className='truncate text-[13px] leading-5 text-gray-10'>
                            {person.email}
                          </p>
                        </div>
                      </div>

                      <div className='flex shrink-0 items-center gap-1'>
                        {person.date ? (
                          <span className='mr-2 text-[13px] whitespace-nowrap text-gray-10'>
                            {formatShareDate(person.date)}
                          </span>
                        ) : null}

                        <span
                          className='inline-flex h-8 w-8 items-center justify-center text-gray-11'
                          title={person.permission}
                        >
                          <DynamicIcon
                            className='h-4 w-4'
                            name={canEdit ? 'edit' : 'eye'}
                          />
                        </span>

                        <IconButton
                          aria-label={t`Copy link`}
                          disabled={!person.shareUrl}
                          icon='copy'
                          title={t`Copy link`}
                          type='button'
                          onClick={() => void handleCopyPersonLink(person)}
                        />

                        {person.shareId ? (
                          <IconButton
                            aria-label={t`Revoke`}
                            className='text-red-10 hover:bg-red-2 hover:text-red-11'
                            disabled={revokingId === person.shareId}
                            icon='trash'
                            title={t`Revoke`}
                            type='button'
                            onClick={() => void handleRevoke(person)}
                          />
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function buildShareUrlFromInvite(result: {
  recipientEmail?: string
  shareToken?: string
  shareUrl?: string
}) {
  const direct = String(result.shareUrl || '').trim()
  if (direct) return direct
  const token = String(result.shareToken || '').trim()
  if (!token) return undefined
  const email = encodeURIComponent(String(result.recipientEmail || '').trim())
  return `${globalThis.location?.origin || ''}/sign-in?shareToken=${encodeURIComponent(token)}${email ? `&email=${email}` : ''}&isNew=true`
}

function formatShareDate(value?: string | Date | null) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{1,2}-[a-z]{3}-\d{4}$/i.test(value)) {
    return value.toLowerCase()
  }
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return typeof value === 'string' ? value : ''
  return `${parsed.getDate()}-${MONTH_ABBR[parsed.getMonth()]}-${parsed.getFullYear()}`
}

function isEditPermission(permission?: string) {
  return /edit/i.test(String(permission || ''))
}

function optionEmail(option: Option) {
  return String(option.value || option.name || '')
    .trim()
    .toLowerCase()
}

function personFromInvite(
  email: string,
  permission: string,
  shareId?: string,
  shareUrl?: string,
): SharePerson {
  const name = email.split('@')[0] || email
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?'

  return {
    date: formatShareDate(new Date()),
    email,
    initials,
    name,
    permission,
    shareId,
    shareUrl,
  }
}
