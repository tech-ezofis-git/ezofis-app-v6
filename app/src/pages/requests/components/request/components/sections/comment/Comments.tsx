import { useLingui } from '@lingui/react/macro'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
// @/pages/requests/components/request/components/sections/comments/Comments.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { workflowsApiV6 } from '@/api/v6/workflows'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { useComments } from '@/pages/requests/hooks/useComments'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import { parseUtcDate } from '@/utils/utcDate'

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
  onClose?: () => void
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
  onClose,
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

  const scrollToBottom = () => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight
  }

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
    <div
      className={
        onClose
          ? 'flex h-full min-h-0 w-full flex-col font-sans'
          : 'relative mx-auto mt-0 flex h-full w-full flex-col overflow-hidden font-sans transition-all duration-300'
      }
    >
      {onClose && (
        <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
          <span className='text-xs font-semibold text-gray-12'>
            {t`Comments`} ({sortedComments.length})
          </span>
          <IconButton
            ariaLabel={t`Close`}
            icon='tabler:x'
            size='sm'
            variant='ghost'
            onClick={onClose}
          />
        </div>
      )}

      <div
        className='min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth px-4 pt-4 pb-3'
        ref={listRef}
      >
        {sortedComments.length === 0 && !isLoading && (
          <div className='flex h-full flex-col items-center justify-center text-gray-8'>
            <Icon
              className='mb-2 size-8 opacity-50'
              name='tabler:messages-off'
            />
            <span className='text-13'>{t`No comments yet`}</span>
          </div>
        )}

        {sortedComments.map((c, idx) => {
          const isMe =
            c?.createdByEmail === currentUserEmail ||
            (c?.createdBy && c.createdBy === session?.id)
          const rawName = String(
            c?.createdByName ||
              c?.createdByEmail ||
              c?.userName ||
              c?.author ||
              '',
          ).trim()
          const isAi =
            !rawName ||
            isUuid(rawName) ||
            ['system', 'bot', 'ai', 'ai agent', 'ezofis ai'].includes(
              rawName.toLowerCase(),
            )
          const name = isMe ? t`You` : isAi ? t`AI` : rawName
          const fileIds = extractFileIds(c)
          const timeDisplay = c?.createdAt
            ? formatDatetime(
                parseCommentDate(c.createdAt),
                'YYYY-MM-DD hh:mm A',
              )
            : ''
          const initials = isMe
            ? myInitials
            : isAi
              ? 'AI'
              : getInitials(rawName)

          return (
            <div className='flex items-start gap-3' key={`${c?.id ?? idx}`}>
              {isAi ? (
                <div className='flex size-8 shrink-0 items-center justify-center rounded-full border border-purple-4/50 bg-purple-1 text-purple-9 shadow-2xs'>
                  <AiBrandIcon className='size-4 shrink-0' />
                </div>
              ) : (
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-13 font-bold',
                    getAvatarColors(initials, isMe),
                  )}
                >
                  {initials}
                </div>
              )}

              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <div className='flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                  <span className='text-[13px] font-bold text-gray-13'>
                    {name}
                  </span>
                  {timeDisplay && (
                    <span className='text-[11px] font-medium text-gray-9'>
                      {timeDisplay}
                    </span>
                  )}
                </div>

                <div className='text-[13px] leading-relaxed font-medium break-words whitespace-pre-wrap text-gray-12'>
                  {formatCommentText(c?.comments)}
                </div>

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
                          className='flex items-center gap-1 rounded-md border border-gray-4 bg-gray-2 px-1.5 py-0.5 text-[11px] font-semibold text-gray-12'
                          key={String(fid)}
                        >
                          <Icon
                            className='size-3 text-primary-9'
                            name='tabler:file'
                          />
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

      <div className='shrink-0 border-t border-gray-3 px-3 pt-2 pb-2'>
        <div className='flex flex-col gap-2'>
          {!!fileOptions.length && (
            <div className='relative w-full'>
              <select
                className='w-full cursor-pointer appearance-none rounded-xl border border-gray-3 bg-surface py-1.5 pr-4 pl-6 text-[11px] font-semibold text-gray-11 transition-colors outline-none hover:bg-gray-2'
                value={String(attachFileId)}
                onChange={(e) => setAttachFileId(e.target.value)}
              >
                <option value=''>{t`Attach file (optional)...`}</option>
                {fileOptions.map((f) => (
                  <option key={String(f.id)} value={String(f.id)}>
                    {f.label}
                  </option>
                ))}
              </select>
              <Icon
                className='absolute top-1/2 left-1.5 size-3 -translate-y-1/2 text-gray-9'
                name='tabler:paperclip'
              />
            </div>
          )}

          <div className='flex items-start gap-2.5'>
            <div
              className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                getAvatarColors(myInitials, true),
              )}
            >
              {myInitials}
            </div>

            <div className='flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-gray-4 bg-surface transition-all focus-within:border-primary-6 focus-within:ring-1 focus-within:ring-primary-4'>
              <textarea
                className='w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-5 font-medium text-gray-13 placeholder:text-gray-9 focus:outline-none'
                disabled={posting}
                placeholder={t`Add a comment...`}
                rows={2}
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

            <button
              aria-label={t`Send comment`}
              disabled={!canSend}
              title={t`Send comment`}
              type='button'
              className={cn(
                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-9 text-text-on-accent transition-all active:scale-95',
                canSend
                  ? 'cursor-pointer hover:opacity-90'
                  : 'cursor-not-allowed opacity-45',
              )}
              onClick={onPost}
            >
              {posting ? (
                <div className='size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white' />
              ) : (
                <Icon className='size-4' name='tabler:send' />
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
