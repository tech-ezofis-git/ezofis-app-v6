// @/pages/requests/components/request/components/sections/comments/Comments.tsx
import  { useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import requestApi from '@/api/requests/requests'
import { formatDatetime } from '@/utils/dayjs'
import authUserStore from '@/stores/authUserStore'
import { useComments } from '@/pages/requests/hooks/useComments'

type Props = {
    workflowId?: number
    processId?: number
    transactionId?: number | string // recommended: pass selectedItem.transactionId
    enabled?: boolean

    // optional: feed attachments so user can attach existing file to a comment
    attachments?: Array<{ id?: any; itemId?: any; fileId?: any; name?: string; fileName?: string }>
    repositoryId?: string | number // needed for embedJson like v5
}

function pickFileId(x: any) {
    return x?.id ?? x?.itemId ?? x?.fileId ?? ''
}
function pickFileName(x: any) {
    return x?.name ?? x?.fileName ?? '-'
}

export default function Comments({
    workflowId,
    processId,
    transactionId,
    enabled,
    attachments = [],
    repositoryId,
}: Props) {
    const { session } = authUserStore.getState()
    const tenantId = session?.tenantId

    const { data, isLoading, error, refetch } = useComments(workflowId, processId, enabled)

    const [text, setText] = useState('')
    const [posting, setPosting] = useState(false)

    // mirrors v5 “showTo” concept :contentReference[oaicite:5]{index=5}
    const [showTo, setShowTo] = useState<number>(2) // pick your default (2 = public/internal depending on tenant config)
    const [notifyInitiator, setNotifyInitiator] = useState(false)

    // attach an existing uploaded file to comment (v5 embedJson.itemIds) :contentReference[oaicite:6]{index=6}
    const fileOptions = useMemo(() => {
        return attachments.map((a) => ({
            id: pickFileId(a),
            label: pickFileName(a),
        })).filter((x) => x.id)
    }, [attachments])

    const [attachFileId, setAttachFileId] = useState<string | number | ''>('')

    const onPost = async () => {
        if (!workflowId || !processId || !transactionId) return
        const trimmed = text.trim()
        if (!trimmed) return

        setPosting(true)
        try {
            // v5: workflow.insertProcessComment(workflowId, processId, transactionId, { comments, showTo, hasNotifytoInitiated, embedJson }) :contentReference[oaicite:7]{index=7}
            const body: any = {
                comments: trimmed,
                showTo,
                hasNotifytoInitiated: notifyInitiator,
            }

            if (attachFileId && repositoryId) {
                body.embedJson = JSON.stringify({
                    repositoryId,
                    itemIds: [attachFileId],
                })
            }

            await (requestApi as any).insertProcessComment(workflowId, processId, transactionId, body)

            setText('')
            setAttachFileId('')
            setNotifyInitiator(false)

            // close the loop with a refresh to keep UI canonical
            await refetch()
        } finally {
            setPosting(false)
        }
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-800">
                    Comments ({data?.length ?? 0})
                </div>

                <div className="flex items-center gap-2">
                    <IconButton icon="tabler:refresh" variant="ghost" color="gray" onClick={() => refetch()} />
                </div>
            </div>

            {/* Composer */}
            <div className="rounded-lg border border-gray-200 bg-white p-3 mb-4">
                <div className="text-xs text-gray-500 mb-2">
                    Tenant: {tenantId ?? '-'} • Visibility + optional file attachment
                </div>

                <textarea
                    className="w-full border border-gray-200 rounded-md p-2 text-sm"
                    rows={3}
                    placeholder="Write a comment…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <div className="flex flex-wrap items-center gap-3 mt-3">
                    <label className="text-sm flex items-center gap-2">
                        <span className="text-gray-700">Show To</span>
                        <select
                            className="border border-gray-200 rounded-md p-1 text-sm"
                            value={showTo}
                            onChange={(e) => setShowTo(Number(e.target.value))}
                        >
                            <option value={1}>Internal</option>
                            <option value={2}>Public</option>
                        </select>
                    </label>

                    <label className="text-sm flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={notifyInitiator}
                            onChange={(e) => setNotifyInitiator(e.target.checked)}
                        />
                        <span className="text-gray-700">Notify initiator</span>
                    </label>

                    {!!fileOptions.length && (
                        <label className="text-sm flex items-center gap-2">
                            <span className="text-gray-700">Attach file</span>
                            <select
                                className="border border-gray-200 rounded-md p-1 text-sm max-w-[280px]"
                                value={String(attachFileId)}
                                onChange={(e) => setAttachFileId(e.target.value)}
                            >
                                <option value="">None</option>
                                {fileOptions.map((f) => (
                                    <option key={String(f.id)} value={String(f.id)}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <div className="ml-auto">
                        <button
                            className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm disabled:opacity-50"
                            disabled={posting || !workflowId || !processId || !transactionId || !text.trim()}
                            onClick={onPost}
                        >
                            {posting ? 'Posting…' : 'Post'}
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            {isLoading && <div className="text-sm text-gray-500">Loading comments…</div>}
            {!isLoading && error && <div className="text-sm text-red-600">Couldn’t load comments.</div>}
            {!isLoading && !data?.length && <div className="text-sm text-gray-500">No comments yet.</div>}

            {!!data?.length && (
                <div className="divide-y rounded-lg border border-gray-200 bg-white">
                    {data.map((c: any, idx: number) => (
                        <div key={`${c.id ?? idx}`} className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-900">
                                    {c.createdByName ?? c.createdByEmail ?? 'User'}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {c.createdAt ? formatDatetime(c.createdAt, 'datetime') : '-'}
                                </div>
                            </div>

                            <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                {c.comments ?? '-'}
                            </div>

                            <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-3">
                                <span>ShowTo: {String(c.showTo ?? '-')}</span>
                                {c.hasNotifytoInitiated !== undefined && (
                                    <span>Notify: {c.hasNotifytoInitiated ? 'Yes' : 'No'}</span>
                                )}
                                {!!c.fileIds?.length && <span>Files: {c.fileIds.length}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
