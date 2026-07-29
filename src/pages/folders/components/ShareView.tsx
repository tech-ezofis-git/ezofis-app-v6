import { useCallback, useEffect, useState } from 'react'
import showToast from '@/components/base/toast/showToast'
import type { ShareData } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import { DynamicIcon } from './icons'
import { Button, Card, Input, PrimaryButton } from './Ui'

type SharePerson = ShareData['sharedWith'][number]

function personFromInvite(
  email: string,
  permission: string,
  shareId?: string,
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
    date: new Date().toLocaleDateString(),
    email,
    initials,
    name,
    permission,
    shareId,
  }
}

export function ShareView({
  fileName,
  itemId,
  onBack,
  repositoryId,
}: {
  fileName?: string
  itemId: string
  onBack: () => void
  repositoryId: string
}) {
  const [data, setData] = useState<ShareData | null>(null)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('Can View')
  const [shareLink, setShareLink] = useState('')
  const [localShares, setLocalShares] = useState<SharePerson[]>([])
  const [inviting, setInviting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadShareData = useCallback(async () => {
    if (!itemId) {
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
    })
    setData({
      ...next,
      link: shareLink || next.link,
    })
  }, [itemId, localShares, shareLink])

  useEffect(() => {
    void loadShareData()
  }, [loadShareData])

  const handleInvite = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      showToast({ message: 'Enter an email address', variant: 'error' })
      return
    }
    if (!repositoryId || !itemId) {
      showToast({ message: 'Missing file context for share', variant: 'error' })
      return
    }

    setInviting(true)
    try {
      const result = await folderApi.inviteToShare({
        email: trimmed,
        itemId,
        message: fileName
          ? `Please review this file: ${fileName}`
          : 'Please review this file',
        permission,
        repositoryId,
      })

      if (result.shareUrl) setShareLink(result.shareUrl)

      setLocalShares((prev) => {
        const nextPerson = personFromInvite(
          result.recipientEmail || trimmed,
          result.permission || permission,
          result.shareId,
        )
        const withoutDup = prev.filter(
          (person) =>
            person.email.toLowerCase() !== nextPerson.email.toLowerCase(),
        )
        return [nextPerson, ...withoutDup]
      })
      setEmail('')
      showToast({ message: 'Invite sent', variant: 'success' })
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to invite',
        variant: 'error',
      })
    } finally {
      setInviting(false)
    }
  }

  const handleRevoke = async (person: SharePerson) => {
    if (!person.shareId) {
      showToast({ message: 'Cannot revoke this share', variant: 'error' })
      return
    }
    setRevokingId(person.shareId)
    try {
      await folderApi.revokeShare(person.shareId)
      setLocalShares((prev) =>
        prev.filter((entry) => entry.shareId !== person.shareId),
      )
      showToast({ message: 'Share revoked', variant: 'success' })
      await loadShareData()
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to revoke',
        variant: 'error',
      })
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopyLink = async () => {
    const link = shareLink || data?.link
    if (!link) {
      showToast({
        message: 'Invite someone first to generate a link',
        variant: 'error',
      })
      return
    }
    try {
      await navigator.clipboard.writeText(link)
      showToast({ message: 'Link copied', variant: 'success' })
    } catch {
      showToast({ message: 'Could not copy link', variant: 'error' })
    }
  }

  if (!data) {
    return (
      <div className='p-6 text-[13px] text-gray-10'>
        Loading share options...
      </div>
    )
  }

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      <div className='flex h-[56px] shrink-0 items-center border-b border-gray-3 bg-surface-primary px-6'>
        <button
          className='inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[14px] font-semibold text-gray-13 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95'
          type='button'
          onClick={onBack}
        >
          <DynamicIcon className='h-4 w-4' name='arrowLeft' />
          Back
        </button>
        {fileName ? (
          <span className='ml-3 truncate text-[13px] text-gray-10'>
            {fileName}
          </span>
        ) : null}
      </div>

      <div className='ez-share-scroll min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-[780px] space-y-5 px-6 py-8'>
          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-5 flex items-center gap-2 text-[16px] font-semibold text-gray-13'>
              <DynamicIcon className='h-5 w-5 text-blue-11' name='mail' />
              Invite People
            </h2>

            <div className='grid grid-cols-[1fr_180px_108px] gap-3'>
              <Input
                className='h-11 rounded-lg border-gray-3 px-4 text-[14px]'
                placeholder='Enter email address...'
                type='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleInvite()
                  }
                }}
              />

              <select
                className='h-11 rounded-lg border border-gray-3 bg-surface-primary px-4 text-[14px] text-gray-13 shadow-sm transition-all outline-none hover:bg-gray-2 focus:border-blue-8'
                value={permission}
                onChange={(event) => setPermission(event.target.value)}
              >
                {data.invitePermissions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <PrimaryButton
                className='h-11 rounded-lg px-4 text-[14px] shadow-sm'
                disabled={inviting || !email.trim()}
                type='button'
                onClick={() => void handleInvite()}
              >
                <DynamicIcon className='h-4 w-4' name='send' />
                {inviting ? '…' : 'Invite'}
              </PrimaryButton>
            </div>
          </Card>

          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-6 flex items-center justify-between text-[16px] font-semibold text-gray-13'>
              <span className='flex items-center gap-2'>
                <DynamicIcon className='h-5 w-5 text-blue-11' name='users' />
                Currently Shared With
              </span>

              <span className='inline-flex h-6 w-fit items-center rounded-full bg-gray-2 px-3 text-[12px] font-semibold whitespace-nowrap text-gray-13'>
                {data.sharedWith.length} people
              </span>
            </h2>

            <div className='space-y-5'>
              {data.sharedWith.length === 0 ? (
                <p className='text-[13px] text-gray-10'>
                  No one has been invited yet.
                </p>
              ) : (
                data.sharedWith.map((person) => (
                  <div
                    className='grid grid-cols-[1fr_145px_auto] items-center gap-4'
                    key={person.shareId || person.email}
                  >
                    <div className='flex items-center gap-3'>
                      <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[13px] font-semibold text-blue-11'>
                        {person.initials}
                      </span>

                      <div>
                        <b className='block text-[14px] leading-5 font-semibold text-gray-13'>
                          {person.name}
                        </b>
                        <p className='text-[13px] leading-5 text-gray-10'>
                          {person.email}
                        </p>
                      </div>
                    </div>

                    <span className='inline-flex h-9 items-center justify-between rounded-lg border border-gray-3 bg-surface-primary px-4 text-[14px] font-semibold text-gray-13 shadow-sm'>
                      {person.permission}
                    </span>

                    <div className='flex items-center gap-2'>
                      {person.date ? (
                        <span className='inline-flex items-center gap-2 text-[13px] text-gray-10'>
                          <DynamicIcon className='h-4 w-4' name='clock' />
                          {person.date}
                        </span>
                      ) : null}
                      {person.shareId ? (
                        <Button
                          className='h-9 px-3 text-[13px]'
                          disabled={revokingId === person.shareId}
                          type='button'
                          onClick={() => void handleRevoke(person)}
                        >
                          {revokingId === person.shareId ? '…' : 'Revoke'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-5 flex items-center gap-2 text-[16px] font-semibold text-gray-13'>
              <DynamicIcon className='h-5 w-5 text-blue-11' name='link' />
              Shareable Link
            </h2>

            <div className='grid grid-cols-[1fr_132px] gap-3'>
              <div className='flex h-11 min-w-0 items-center rounded-lg bg-gray-2 px-4 font-mono text-[13px] text-gray-10'>
                <DynamicIcon
                  className='mr-2 h-4 w-4 shrink-0 text-green-11'
                  name='shield'
                />
                <span className='truncate'>
                  {shareLink || data.link || 'Invite someone to generate a link'}
                </span>
              </div>

              <Button
                className='h-11 px-4 text-[14px] shadow-sm'
                type='button'
                onClick={() => void handleCopyLink()}
              >
                <DynamicIcon className='h-4 w-4' name='copy' />
                Copy Link
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
