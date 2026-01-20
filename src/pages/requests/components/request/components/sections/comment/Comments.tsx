// @/pages/requests/components/request/components/sections/comments/Comments.tsx
import { useMemo, useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import requestApi from '@/api/requests/requests'
import { formatDatetime } from '@/utils/dayjs'
import authUserStore from '@/stores/authUserStore'
import { useComments } from '@/pages/requests/hooks/useComments'
import Icon from '@/components/base/icon/Icon'
// import IconButton from '@/components/base/button/IconButton'

dayjs.extend(relativeTime)

type Props = {
    workflowId?: number
    processId?: number
    transactionId?: number | string
    enabled?: boolean
    attachments?: Array<{ id?: any; itemId?: any; fileId?: any; name?: string; fileName?: string }>
    repositoryId?: string | number
}

function pickFileId(x: any) {
    return x?.id ?? x?.itemId ?? x?.fileId ?? ''
}
function pickFileName(x: any) {
    return x?.name ?? x?.fileName ?? '-'
}

function getDisplayTime(dateString: string) {
    if (!dateString) return ''
    const date = dayjs(dateString)
    const diffInHours = dayjs().diff(date, 'hour')
    if (diffInHours < 24) return date.fromNow()
    return formatDatetime(dateString, 'datetime')
}

function extractFileIds(comment: any): Array<string | number> {
    if (Array.isArray(comment?.fileIds) && comment.fileIds.length) return comment.fileIds
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

export default function Comments({
    workflowId,
    processId,
    transactionId,
    enabled = true,
    attachments = [],
    repositoryId,
}: Props) {
    const { session } = authUserStore.getState()
    const currentUserEmail = session?.email ?? 'me@app.com'

    const { data, isLoading, refetch } = useComments(workflowId, processId, enabled)
    const comments = (data || []) as any[]

    const [posting, setPosting] = useState(false)
    const [notifyInitiator, setNotifyInitiator] = useState(false)
    const [attachFileId, setAttachFileId] = useState<string | number | ''>('')
    const [draft, setDraft] = useState('')

    const listRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = () => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
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
                showTo: 2,
                hasNotifytoInitiated: notifyInitiator,
            }

            if (attachFileId && repositoryId) {
                body.embedJson = JSON.stringify({
                    repositoryId,
                    itemIds: [attachFileId],
                })
            }

            await (requestApi as any).insertProcessComment(workflowId, processId, transactionId, body)

            setDraft('')
            setAttachFileId('')
            setNotifyInitiator(false)

            await refetch()
            setTimeout(scrollToBottom, 60)
        } finally {
            setPosting(false)
        }
    }

    const canSend = !posting && !!workflowId && !!processId && !!transactionId && draft.trim().length > 0

    return (
        <div
            className="flex flex-col mt-0 bg-[var(--purple-2)] relative font-sans w-full mx-auto  overflow-hidden border bg-white shadow-sm transition-all duration-300"
            style={{
                borderColor: 'var(--gray-4)',
                maxHeight: 'calc(100vh - 350px)',
                minHeight: '200px',
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
                className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-[var(--purple-1)] scroll-smooth"
                ref={listRef}
                style={{ minHeight: 0 }}
            >
                {comments.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Icon name="tabler:messages-off" className="size-8 mb-2 opacity-50" />
                        <span className="text-xs">No comments yet</span>
                    </div>
                )}

                {comments.map((c, idx) => {
                    const isMe = c?.createdByEmail === currentUserEmail
                    const name = isMe ? 'You' : (c?.createdByName ?? c?.createdByEmail ?? 'User')
                    const fileIds = extractFileIds(c)
                    const timeDisplay = getDisplayTime(c?.createdAt)

                    return (
                        <div key={`${c?.id ?? idx}`} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col max-w-[90%] ${isMe ? 'items-end' : 'items-start'}`}>

                                {/* 1. Message Bubble (Top) */}
                                <div
                                    className={`relative px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${isMe
                                        ? 'bg-primary-9 text-white rounded-br-none' // Point bubble to metadata
                                        : 'bg-white text-gray-12 border border-gray-4 rounded-bl-none'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap font-medium">{c?.comments}</div>

                                    {!!fileIds.length && (
                                        <div className={`mt-1.5 pt-1.5 flex flex-wrap gap-1.5 border-t ${isMe ? 'border-white/20' : 'border-gray-3'}`}>
                                            {fileIds.map((fid: any) => {
                                                const fileRef = attachments.find((a) => String(pickFileId(a)) === String(fid))
                                                const fileName = fileRef ? pickFileName(fileRef) : `Doc-${fid}`
                                                return (
                                                    <div
                                                        key={String(fid)}
                                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${isMe ? 'bg-white/10 text-white' : 'bg-gray-2 text-gray-11 border border-gray-4'
                                                            }`}
                                                    >
                                                        <Icon name="tabler:file" className="size-3" />
                                                        <span className="truncate max-w-[120px]">{fileName}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* 2. Metadata Row (Bottom: Name • Time) */}
                                <div className={`flex items-center gap-1.5 mt-1 px-1 text-[10px] text-gray-9 ${isMe ? 'flex-row' : 'flex-row'}`}>
                                    <span className="font-bold text-gray-11">{name}</span>
                                    <span className="text-[8px] text-slate-400">•</span>

                                    <span>{timeDisplay}</span>
                                </div>

                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Input Area */}
            <div className="p-2 bg-white border-t border-[var(--purple-2)] bg-[var(--purple-1)]">
                <div className="flex flex-col gap-2">
                    {/* File Picker (Conditional) */}
                    {!!fileOptions.length && (
                        <div className="relative w-full">
                            <select
                                className="appearance-none w-full pl-6 pr-4 py-1 text-[10px] font-semibold rounded bg-gray-1 border-none text-gray-11 outline-none cursor-pointer hover:bg-gray-2 transition-colors"
                                value={String(attachFileId)}
                                onChange={(e) => setAttachFileId(e.target.value)}
                            >
                                <option value="">Attach file (optional)...</option>
                                {fileOptions.map((f) => (
                                    <option key={String(f.id)} value={String(f.id)}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                            <Icon name="tabler:paperclip" className="absolute left-1.5 top-1.5 size-3 text-gray-9" />
                        </div>
                    )}

                    {/* Textarea & Send */}
                    <div className="flex items-end gap-2">
                        <div className="flex-1 rounded-lg bg-gray-1 border border-gray-3 overflow-hidden focus-within:border-primary-7 focus-within:ring-1 focus-within:ring-primary-4 transition-all">
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        onPost()
                                    }
                                }}
                                placeholder="Type a comment..."
                                className="w-full px-3 py-2 text-xs font-medium bg-transparent focus:outline-none resize-none text-gray-12 placeholder:text-gray-8"
                                style={{ lineHeight: '1.4', minHeight: '36px' }}
                            />
                        </div>

                        <button
                            onClick={onPost}
                            disabled={!canSend}
                            className="size-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all shadow-sm active:scale-95 mb-0.5"
                            style={{
                                background: canSend ? 'var(--primary-9)' : 'var(--gray-3)',
                                color: canSend ? 'white' : 'var(--gray-9)',
                                cursor: canSend ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {posting ? (
                                <div className="size-3.5 rounded-full animate-spin border-2 border-white/30 border-t-white" />
                            ) : (
                                <Icon name="tabler:send" className="size-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div >
        </div >
    )
}