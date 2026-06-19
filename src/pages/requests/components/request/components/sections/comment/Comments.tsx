import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
// @/pages/requests/components/request/components/sections/comments/Comments.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { workflowsApiV6 } from '@/api/v6/workflows'
import Icon from '@/components/base/icon/Icon'
import { useComments } from '@/pages/requests/hooks/useComments'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'
import cn from '@/utils/cn'
// import IconButton from '@/components/base/button/IconButton'

dayjs.extend(relativeTime)

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
  const { session } = authUserStore.getState()
  const currentUserEmail = session?.email ?? 'me@app.com'

  const {
    data,
    isLoading: hookIsLoading,
    refetch: hookRefetch,
  } = useComments(workflowId, instanceId || processId, enabled && !propComments)
  const comments = (propComments ?? data ?? []) as any[]
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
  }, [isLoading, comments.length, enabled])

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
      await workflowsApiV6.addInstanceComment(
        workflowId,
        targetInstanceId,
        {
          comments: cleanText,
          showTo: 2,
        }
      )

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
    !posting &&
    !!workflowId &&
    !!targetInstanceId &&
    draft.trim().length > 0

  return (
    <div className='relative mx-auto mt-0 flex h-full w-full flex-col overflow-hidden font-sans transition-all duration-300'>
      {/* Header - Compact (removed legacy commented snippet) */}

      {/* Chat Feed */}
      <div
        className='flex-1 space-y-4 overflow-y-auto scroll-smooth bg-transparent px-4 py-3'
        ref={listRef}
        style={{ minHeight: 0 }}
      >
        {comments.length === 0 && !isLoading && (
          <div className='text-gray-400 flex h-full flex-col items-center justify-center'>
            <Icon
              className='mb-2 size-8 opacity-50'
              name='tabler:messages-off'
            />
            <span className='text-13'>No comments yet</span>
          </div>
        )}

        {comments.map((c, idx) => {
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
            ? formatDatetime(parseCommentDate(c.createdAt), 'YYYY-MM-DD hh:mm A')
            : ''
          const initial = isMe
            ? 'Y'
            : isUuid(c?.createdByName || '')
              ? 'U'
              : (c?.createdByName ?? c?.createdByEmail ?? 'U')
                  .charAt(0)
                  .toUpperCase()

          return (
            <div
              className='flex items-start gap-3 py-1'
              key={`${c?.id ?? idx}`}
            >
              {/* Avatar */}
              <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-2 text-13 font-bold text-blue-9'>
                {initial}
              </div>

              {/* Comment Body */}
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                {/* Header (Name & Time) */}
                <div className='flex items-baseline gap-2'>
                  <span className='text-13 font-bold text-gray-13'>{name}</span>
                  <span className='text-11 font-medium text-gray-9'>
                    {timeDisplay}
                  </span>
                </div>

                {/* Text */}
                <div className='text-13 leading-relaxed font-medium whitespace-pre-wrap text-gray-11'>
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
                          className='flex items-center gap-1 rounded-md border border-gray-4 bg-gray-2 px-1.5 py-0.5 text-11 font-semibold text-gray-11'
                          key={String(fid)}
                        >
                          <Icon className='size-3' name='tabler:file' />
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
      <div className='border-t border-gray-3 bg-transparent px-4 py-3'>
        <div className='flex flex-col gap-2'>
          {/* File Picker (Conditional) */}
          {!!fileOptions.length && (
            <div className='relative w-full'>
              <select
                className='w-full cursor-pointer appearance-none rounded border-none bg-gray-1 py-1 pr-4 pl-6 text-11 font-semibold text-gray-11 transition-colors outline-none hover:bg-gray-2'
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
                className='absolute top-1.5 left-1.5 size-3 text-gray-9'
                name='tabler:paperclip'
              />
            </div>
          )}

          {/* Textarea & Send Button */}
          <div className='flex items-center gap-3'>
            {/* Current User Avatar */}
            <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-2 text-13 font-bold text-blue-9'>
              {currentUserEmail.charAt(0).toUpperCase()}
            </div>

            {/* Input Box */}
            <div className='flex-1 overflow-hidden rounded-xl border border-gray-3 bg-gray-1 transition-all focus-within:border-primary-7 focus-within:bg-surface focus-within:ring-1 focus-within:ring-primary-4'>
              <textarea
                className='w-full resize-none bg-transparent px-3 py-2 text-13 font-medium text-gray-12 placeholder:text-gray-8 focus:outline-none'
                placeholder='Add a comment...'
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

            {/* Post Button */}
            <button
              className={cn(
                'flex h-[36px] items-center justify-center rounded-xl px-5 text-13 font-bold transition-all active:scale-95',
                canSend
                  ? 'bg-primary-9 text-text-on-accent cursor-pointer hover:opacity-90'
                  : 'bg-gray-3 text-gray-9 cursor-not-allowed',
              )}
              disabled={!canSend}
              onClick={onPost}
            >
              {posting ? (
                <div className='size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white' />
              ) : (
                'Post'
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

const isUuid = (val: string): boolean => {
  if (typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

const parseCommentDate = (val: any): Date | string => {
  if (!val) return ''
  if (typeof val === 'string') {
    const clean = val.trim()
    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(clean) &&
      !clean.endsWith('Z') &&
      !/[+-]\d{2}(:?\d{2})?$/.test(clean)
    ) {
      const d = new Date(clean + 'Z')
      if (!Number.isNaN(d.getTime())) return d
    }
  }
  return val
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
