import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
// @/pages/requests/components/request/components/sections/comments/Comments.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { workflowsApiV6 } from '@/api/v6/workflows'
import Icon from '@/components/base/icon/Icon'
import { useComments } from '@/pages/requests/hooks/useComments'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import { parseUtcDate } from '@/utils/utcDate'
// import IconButton from '@/components/base/button/IconButton'

dayjs.extend(relativeTime)

const isUuid = (val: string): boolean => {
  if (typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val,
  )
}

const getInitials = (fullNameOrEmail: string): string => {
  const clean = String(fullNameOrEmail || '').trim()
  if (!clean || isUuid(clean)) return 'U'
  if (clean.includes('@')) {
    const part = clean.split('@')[0]
    const parts = part.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0])
        .toUpperCase()
        .slice(0, 2)
    }
    return part.substring(0, Math.min(2, part.length)).toUpperCase()
  }
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return clean.substring(0, Math.min(2, clean.length)).toUpperCase()
}

const getAvatarColors = (initials: string, isMe: boolean) => {
  if (isMe) {
    return 'bg-[var(--primary-3)] text-[var(--primary-9)] border border-[var(--primary-4)]'
  }
  const charCodeSum = initials
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const variants = [
    'bg-[var(--blue-1)] text-[var(--blue-9)] border border-[var(--blue-3)]',
    'bg-[var(--green-1)] text-[var(--green-9)] border border-[var(--green-3)]',
    'bg-[var(--orange-1)] text-[var(--orange-9)] border border-[var(--orange-3)]',
    'bg-[var(--gray-2)] text-[var(--gray-12)] border border-[var(--gray-3)]',
  ]
  return variants[charCodeSum % variants.length]
}

type Props = {
  attachments?: Array<{
    fileId?: any
    fileName?: string
    id?: any
    itemId?: any
    name?: string
  }>
  comments?: any[]
  enabled?: boolean
  instanceId?: string | number
  isLoading?: boolean
  processId?: number
  repositoryId?: string | number
  transactionId?: number | string
  workflowId?: number
  refetch?: () => Promise<void>
}

export default function Comments({
  attachments = [],
  comments: propComments,
  enabled = true,
  instanceId,
  isLoading: propIsLoading,
  processId,
  refetch: propRefetch,
  workflowId,
}: Props) {
  const { t } = useLingui()
  const { session } = authUserStore.getState()
  const currentUserEmail = session?.email ?? 'me@app.com'

  const myFullName = session
    ? session.name ||
      (session.firstName
        ? `${session.firstName} ${session.lastName || ''}`.trim()
        : '')
    : ''
  const myDisplayName = myFullName || currentUserEmail
  const myInitials = getInitials(myDisplayName)

  const {
    data,
    isLoading: hookIsLoading,
    refetch: hookRefetch,
  } = useComments(workflowId, instanceId || processId, enabled && !propComments)
  const comments = (propComments ?? data ?? []) as any[]
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const getCommentTime = (createdAt: any): number => {
        if (!createdAt) return 0
        const parsed = parseCommentDate(createdAt)
        if (parsed instanceof Date) return parsed.getTime()
        const d = new Date(parsed)
        return isNaN(d.getTime()) ? 0 : d.getTime()
      }
      return getCommentTime(a.createdAt) - getCommentTime(b.createdAt)
    })
  }, [comments])
  const isLoading = propComments ? (propIsLoading ?? false) : hookIsLoading
  const refetch = propRefetch ?? hookRefetch

  const [posting, setPosting] = useState(false)
  const [attachFileId, setAttachFileId] = useState<string | number | ''>('')
  const [draft, setDraft] = useState('')

  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [draft])

  useEffect(() => {
    if (!enabled) return
    if (!isLoading) setTimeout(scrollToBottom, 80)
  }, [isLoading, sortedComments.length, enabled])

  const fileOptions = useMemo(() => {
    return attachments
      .map((a) => ({ id: pickFileId(a), label: pickFileName(a) }))
      .filter((x) => x.id)
  }, [attachments])

  const targetInstanceId = instanceId || processId
  const onPost = async () => {
    const cleanText = draft.trim()
    if (!workflowId || !targetInstanceId || !cleanText) return

    setPosting(true)
    try {
      await workflowsApiV6.addInstanceComment(workflowId, targetInstanceId, {
        comments: cleanText,
        showTo: 2,
      })

      setDraft('')
      setAttachFileId('')

      await refetch()
      setTimeout(scrollToBottom, 60)
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setPosting(false)
    }
  }

  const canSend =
    !posting && !!workflowId && !!targetInstanceId && draft.trim().length > 0

  return (
    <div className='relative mx-auto mt-0 flex h-full w-full flex-col overflow-hidden font-sans transition-all duration-300'>
      {/* Header - Compact (removed legacy commented snippet) */}

      {/* Chat Feed */}
      <div
        className='flex-1 space-y-4 overflow-y-auto scroll-smooth bg-transparent px-4 py-3'
        ref={listRef}
        style={{ minHeight: 0 }}
      >
        {sortedComments.length === 0 && !isLoading && (
          <div className='text-gray-400 flex h-full flex-col items-center justify-center'>
            <Icon
              className='mb-2 size-8 opacity-50'
              name='tabler:messages-off'
            />
            <span className='text-13'>No comments yet</span>
          </div>
        )}

        {sortedComments.map((c, idx) => {
          const isMe =
            c?.createdByEmail === currentUserEmail ||
            (c?.createdBy && c.createdBy === session?.id)
          const name = isMe
            ? 'You'
            : isUuid(c?.createdByName || '')
              ? 'User'
              : (c?.createdByName ?? c?.createdByEmail ?? 'User')
          const fileIds = extractFileIds(c)
          const timeDisplay = c?.createdAt
            ? formatDatetime(
                parseCommentDate(c.createdAt),
                'YYYY-MM-DD hh:mm A',
              )
            : ''
          const initials = isMe
            ? myInitials
            : getInitials(c?.createdByName ?? c?.createdByEmail ?? 'User')

          return (
            <div
              className='flex items-start gap-3 py-1'
              key={`${c?.id ?? idx}`}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-13 font-bold',
                  getAvatarColors(initials, isMe),
                )}
              >
                {initials}
              </div>

              {/* Comment Body */}
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                {/* Header (Name & Time) */}
                <div className='flex items-baseline gap-2'>
                  <span className='text-[13px] font-bold text-[var(--gray-13)]'>{name}</span>
                  <span className='text-[11px] font-medium text-[var(--gray-9)]'>
                    {timeDisplay}
                  </span>
                </div>

                {/* Text */}
                <div className='text-[13px] leading-relaxed font-medium whitespace-pre-wrap text-[var(--gray-12)]'>
                  {formatCommentText(c?.comments)}
                </div>

                {/* File Attachments */}
                {!!fileIds.length && (
                  <div className='mt-1 flex flex-wrap gap-1.5'>
                    {fileIds.map((fid: any) => {
                      const fileRef = attachments.find(
                        (a) => String(pickFileId(a)) === String(fid),
                      )
                      const fileName = fileRef
                        ? pickFileName(fileRef)
                        : `Doc-${fid}`
                      return (
                        <div
                          className='flex items-center gap-1 rounded-md border border-[var(--gray-4)] bg-[var(--gray-2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--gray-12)]'
                          key={String(fid)}
                        >
                          <Icon className='size-3 text-[var(--primary-9)]' name='tabler:file' />
                          <span className='max-w-[120px] truncate'>
                            {fileName}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input Area */}
      <div className='border-t border-[var(--gray-3)] bg-transparent px-4 py-3'>
        <div className='flex flex-col gap-2'>
          {/* File Picker (Conditional) */}
          {!!fileOptions.length && (
            <div className='relative w-full'>
              <select
                className='w-full cursor-pointer appearance-none rounded-lg border border-[var(--gray-3)] bg-surface py-1 pr-4 pl-6 text-[11px] font-semibold text-[var(--gray-11)] transition-colors outline-none hover:bg-[var(--gray-2)]'
                value={String(attachFileId)}
                onChange={(e) => setAttachFileId(e.target.value)}
              >
                <option value=''>Attach file (optional)...</option>
                {fileOptions.map((f) => (
                  <option key={String(f.id)} value={String(f.id)}>
                    {f.label}
                  </option>
                ))}
              </select>
              <Icon
                className='absolute top-1.5 left-1.5 size-3 text-[var(--gray-9)]'
                name='tabler:paperclip'
              />
            </div>
          )}

          {/* Textarea & Send Button */}
          <div className='flex items-center gap-3'>
            {/* Current User Avatar */}
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                getAvatarColors(myInitials, true),
              )}
            >
              {myInitials}
            </div>

            {/* Input Box */}
            <div className='flex-1 overflow-hidden rounded-xl border border-[var(--gray-4)] bg-surface transition-all focus-within:border-[var(--primary-6)] focus-within:ring-1 focus-within:ring-[var(--primary-4)]'>
              <textarea
                className='w-full resize-none bg-transparent px-3 py-2 text-[13px] font-medium text-[var(--gray-13)] placeholder:text-[var(--gray-9)] focus:outline-none'
                placeholder={t`Add a comment...`}
                ref={textareaRef}
                rows={1}
                style={{ lineHeight: '1.4', minHeight: '36px' }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onPost()
                  }
                }}
              />
            </div>

            {/* Send Button */}
            <button
              disabled={!canSend}
              title={t`Send comment`}
              className={cn(
                'flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl bg-primary-9 text-13 font-bold text-text-on-accent transition-all active:scale-95',
                canSend
                  ? 'cursor-pointer hover:opacity-90'
                  : 'cursor-not-allowed opacity-45',
              )}
              onClick={onPost}
            >
              {posting ? (
                <div className='size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white' />
              ) : (
                <Icon className='size-4.5' name='tabler:send' />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
function extractFileIds(comment: any): Array<string | number> {
  if (Array.isArray(comment?.fileIds) && comment.fileIds.length)
    return comment.fileIds
  const ej = comment?.embedJson
  if (!ej) return []
  try {
    const parsed = typeof ej === 'string' ? JSON.parse(ej) : ej
    const itemIds = parsed?.itemIds
    return Array.isArray(itemIds) ? itemIds : []
  } catch {
    return []
  }
}

function pickFileId(x: any) {
  return x?.id ?? x?.itemId ?? x?.fileId ?? ''
}

function pickFileName(x: any) {
  return x?.name ?? x?.fileName ?? '-'
}

// isUuid already declared at top

const parseCommentDate = (val: any): Date | string => {
  if (!val) return ''
  return parseUtcDate(val) || val
}

const formatCommentText = (text: string): string => {
  const clean = String(text || '').trim()
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean)
      return Object.entries(parsed)
        .map(([key, val]) => `${key}: ${val}`)
        .join('\n')
    } catch {
      // fallback
    }
  }
  return text
}
