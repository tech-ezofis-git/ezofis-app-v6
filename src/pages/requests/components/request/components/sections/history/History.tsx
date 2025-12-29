// @/pages/requests/components/request/components/sections/history/History.tsx
import { useMemo } from 'react'
import IconButton from '@/components/base/button/IconButton'
import { formatDatetime } from '@/utils/dayjs'
import { useHistory } from '@/pages/requests/hooks/useHistory'

type Props = {
    workflowId?: number
    processId?: number
    enabled?: boolean
}

export default function History({ workflowId, processId, enabled }: Props) {
    const { data, isLoading, error, refetch } = useHistory(workflowId, processId, enabled)

    // Optional: compress duplicates like v5 stepper logic did (activityId-based) :contentReference[oaicite:10]{index=10}
    const stageRollup = useMemo(() => {
        const seen = new Set<string>()
        const out: any[] = []
        for (const r of data || []) {
            const key = String(r.activityId ?? r.stage ?? '')
            if (!key) continue
            if (seen.has(key)) continue
            seen.add(key)
            out.push(r)
        }
        return out
    }, [data])

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-800">History</div>
                <div className="flex items-center gap-2">
                    <IconButton icon="tabler:refresh" variant="ghost" color="gray" onClick={() => refetch()} />
                </div>
            </div>

            {isLoading && <div className="text-sm text-gray-500">Loading history…</div>}
            {!isLoading && error && <div className="text-sm text-red-600">Couldn’t load history.</div>}

            {!isLoading && !stageRollup.length && (
                <div className="text-sm text-gray-500">No history data found.</div>
            )}

            {!!stageRollup.length && (
                <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="divide-y">
                        {stageRollup.map((h: any, idx: number) => (
                            <div key={`${h.activityId ?? idx}`} className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-gray-900">
                                        {h.stage ?? 'Stage'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {h.actionAt ? formatDatetime(h.actionAt, 'datetime') : '-'}
                                    </div>
                                </div>

                                <div className="text-sm text-gray-700 mt-1">
                                    <span className="font-medium">Action:</span> {h.action ?? '-'}
                                </div>

                                <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-3">
                                    <span>Status: {h.status ?? '-'}</span>
                                    <span>User: {h.actionUserEmail ?? h.actionUser ?? '-'}</span>
                                    {h.subWorkflowHistory && <span>Subflow: Yes</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
