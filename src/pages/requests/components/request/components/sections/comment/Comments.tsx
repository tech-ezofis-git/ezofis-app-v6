import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
// @/pages/requests/components/request/components/sections/comments/Comments.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import requestApi from '@/api/requests/requests'
import Icon from '@/components/base/icon/Icon'
import { useComments } from '@/pages/requests/hooks/useComments'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'
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
  enabled?: boolean
  processId?: number
  repositoryId?: string | number
  transactionId?: number | string
  workflowId?: number
}

export default function Comments({
  attachments = [],
  enabled = true,
  processId,
  repositoryId,
  transactionId,
  workflowId,
}: Props) {
  const { session } = authUserStore.getState()
  const currentUserEmail = session?.email ?? 'me@app.com'

  const { data, isLoading, refetch } = useComments(
    workflowId,
    processId,
    enabled,
  )
  const comments = (data || []) as any[]

  const [posting, setPosting] = useState(false)
  const [notifyInitiator, setNotifyInitiator] = useState(false)
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

  const onPost = async () => {
    const cleanText = draft.trim()
    if (!workflowId || !processId || !transactionId || !cleanText) return

    setPosting(true)
    try {
      const body: any = {
        comments: cleanText,
        hasNotifytoInitiated: notifyInitiator,
        showTo: 2,
      }

      if (attachFileId && repositoryId) {
        body.embedJson = JSON.stringify({
          itemIds: [attachFileId],
          repositoryId,
        })
      }

      await (requestApi as any).insertProcessComment(
        workflowId,
        processId,
        transactionId,
        body,
      )

      setDraft('')
      setAttachFileId('')
      setNotifyInitiator(false)

      await refetch()
      setTimeout(scrollToBottom, 60)
    } finally {
      setPosting(false)
    }
  }

  const canSend =
    !posting &&
    !!workflowId &&
    !!processId &&
    !!transactionId &&
    draft.trim().length > 0

  return (
    <div
      className='relative mx-auto mt-0 flex h-full w-full flex-col overflow-hidden border bg-[var(--purple-2)] bg-white font-sans shadow-sm transition-all duration-300'
      style={{
        borderColor: 'var(--gray-4)',
      }}
    >
      {/* Header - Compact */}
      {/* <div className="flex items-center justify-between px-3 py-2 bg-white sticky top-0 z-20 border-b border-gray-4">
                <div className="flex items-center gap-2">
                    <Icon name="tabler:message-circle-2" className="size-4 text-gray-10" />
                    <h2 className="text-12 font-bold text-gray-12">Comments</h2>
                </div>
                <IconButton
                    icon="tabler:refresh"
                    variant="ghost"
                    color="gray"
                    size="xs"
                    className="size-6"
                    onClick={() => refetch()}
                    loading={isLoading}
                />
            </div> */}

      {/* Chat Feed */}
      <div
        className='flex-1 space-y-4 overflow-y-auto scroll-smooth bg-[var(--purple-1)] px-4 py-3'
        ref={listRef}
        style={{ minHeight: 0 }}
      >
        {comments.length === 0 && !isLoading && (
          <div className='text-gray-400 flex h-full flex-col items-center justify-center'>
            <Icon
              className='mb-2 size-8 opacity-50'
              name='tabler:messages-off'
            />
            <span className='text-xs'>No comments yet</span>
          </div>
        )}

        {comments.map((c, idx) => {
          const isMe = c?.createdByEmail === currentUserEmail
          const name = isMe
            ? 'You'
            : (c?.createdByName ?? c?.createdByEmail ?? 'User')
          const fileIds = extractFileIds(c)
          const timeDisplay = getDisplayTime(c?.createdAt)

          return (
            <div
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              key={`${c?.id ?? idx}`}
            >
              <div
                className={`flex max-w-[90%] flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* 1. Message Bubble (Top) */}
                <div
                  className={`relative rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? 'rounded-br-none bg-primary-9 text-white' // Point bubble to metadata
                      : 'rounded-bl-none border border-gray-4 bg-white text-gray-12'
                  }`}
                >
                  <div className='font-medium whitespace-pre-wrap'>
                    {c?.comments}
                  </div>

                  {!!fileIds.length && (
                    <div
                      className={`mt-1.5 flex flex-wrap gap-1.5 border-t pt-1.5 ${isMe ? 'border-white/20' : 'border-gray-3'}`}
                    >
                      {fileIds.map((fid: any) => {
                        const fileRef = attachments.find(
                          (a) => String(pickFileId(a)) === String(fid),
                        )
                        const fileName = fileRef
                          ? pickFileName(fileRef)
                          : `Doc-${fid}`
                        return (
                          <div
                            key={String(fid)}
                            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              isMe
                                ? 'bg-white/10 text-white'
                                : 'border border-gray-4 bg-gray-2 text-gray-11'
                            }`}
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

                {/* 2. Metadata Row (Bottom: Name • Time) */}
                <div
                  className={`mt-1 flex items-center gap-1.5 px-1 text-[10px] text-gray-9 ${isMe ? 'flex-row' : 'flex-row'}`}
                >
                  <span className='font-bold text-gray-11'>{name}</span>
                  <span className='text-slate-400 text-[8px]'>•</span>

                  <span>{timeDisplay}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input Area */}
      <div className='border-t border-[var(--purple-2)] bg-[var(--purple-1)] bg-white p-2'>
        <div className='flex flex-col gap-2'>
          {/* File Picker (Conditional) */}
          {!!fileOptions.length && (
            <div className='relative w-full'>
              <select
                className='w-full cursor-pointer appearance-none rounded border-none bg-gray-1 py-1 pr-4 pl-6 text-[10px] font-semibold text-gray-11 transition-colors outline-none hover:bg-gray-2'
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

          {/* Textarea & Send */}
          <div className='flex items-end gap-2'>
            <div className='flex-1 overflow-hidden rounded-lg border border-gray-3 bg-gray-1 transition-all focus-within:border-primary-7 focus-within:ring-1 focus-within:ring-primary-4'>
              <textarea
                className='w-full resize-none bg-transparent px-3 py-2 text-xs font-medium text-gray-12 placeholder:text-gray-8 focus:outline-none'
                placeholder='Type a comment...'
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

            <button
              className='mb-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-lg shadow-sm transition-all active:scale-95'
              disabled={!canSend}
              style={{
                background: canSend ? 'var(--primary-9)' : 'var(--gray-3)',
                color: canSend ? 'white' : 'var(--gray-9)',
                cursor: canSend ? 'pointer' : 'not-allowed',
              }}
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

function getDisplayTime(dateString: string) {
  if (!dateString) return ''
  const date = dayjs(dateString)
  const diffInHours = dayjs().diff(date, 'hour')
  if (diffInHours < 24) return date.fromNow()
  return formatDatetime(dateString, 'datetime')
}

function pickFileId(x: any) {
  return x?.id ?? x?.itemId ?? x?.fileId ?? ''
}

function pickFileName(x: any) {
  return x?.name ?? x?.fileName ?? '-'
}
