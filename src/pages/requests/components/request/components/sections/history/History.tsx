// @/pages/requests/components/request/components/sections/history/History.tsx
import { useMemo } from 'react'
import { Timeline } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { formatDatetime } from '@/utils/dayjs'
import { useHistory } from '@/pages/requests/hooks/useHistory'
import cn from '@/utils/cn'

type Props = {
    workflowId?: number
    processId?: number
    enabled?: boolean
}

type HistoryRow = {
    activityId?: number | string
    stage?: string
    status?: string
    action?: string
    actionStatus?: number
    processedOn?: string | number | Date | null
    receivedOn?: string | number | Date | null
    actionAt?: string | number | Date | null
    processedBy?: string | null
    actionUserEmail?: string | null
    actionUser?: string | null
    agentType?: string | null
    agentResponse?: string | null
}

const safeLower = (v?: string) => (v || '').toLowerCase()

const toDate = (value: any): Date | null => {
    if (!value) return null
    const d = value instanceof Date ? value : new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

// Format date to match image: "10-Jan-2026 01:42 AM" or relative "4 days ago"
const getDisplayDate = (h: HistoryRow) => {
    const processed = toDate(h.processedOn)
    const received = toDate(h.receivedOn) || toDate(h.actionAt)

    if (processed) return formatDatetime(processed, 'datetime')

    if (received) {
        const diffHours = (Date.now() - received.getTime()) / (1000 * 60 * 60)
        if (diffHours < 24) return 'Just now'
        if (diffHours < 48) return 'Yesterday'
        if (diffHours > 24 * 3) return formatDatetime(received, 'datetime')
        return `${Math.floor(diffHours / 24)}d ago` // Abbreviated "days" to "d" for compactness
    }
    return ''
}

// Config for Icons and Badge Colors based on status
const getStepConfig = (h: HistoryRow, isStart: boolean) => {
    const s = safeLower(h.status)
    const stage = safeLower(h.stage)

    if (isStart || stage.includes('start')) {
        return {
            icon: 'tabler:send',
            iconColor: 'text-blue-9',
            bulletBg: 'bg-blue-5',
        }
    }

    const isApproved = s.includes('approved') || s.includes('approve') || s.includes('verified') || stage === 'end'
    if (isApproved) {
        return {
            icon: 'tabler:check',
            iconColor: 'text-green-9',
            bulletBg: 'bg-green-5',
        }
    }

    if (s.includes('reject')) {
        return {
            icon: 'tabler:x',
            iconColor: 'text-red-9',
            bulletBg: 'bg-red-5',
        }
    }

    return {
        icon: 'tabler:clock',
        iconColor: 'text-gray-9',
        bulletBg: 'bg-gray-5',
    }
}

const pickProcessedBy = (h: HistoryRow) => h.processedBy || h.actionUser || h.actionUserEmail || ''

const formatRelativeShort = (d: Date): string => {
    const now = Date.now()
    const diffMs = now - d.getTime()
    if (diffMs < 0) return formatDatetime(d, 'datetime')
    const sec = Math.floor(diffMs / 1000)
    if (sec < 45) return 'just now'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.floor(hr / 24)
    if (day < 14) return `${day}d ago`
    return formatDatetime(d, 'datetime')
}

const formatTimePhrase = (h: HistoryRow): string => {
    const processed = toDate(h.processedOn)
    if (processed) return formatDatetime(processed, 'datetime')
    const fallback = toDate(h.receivedOn) || toDate(h.actionAt)
    if (!fallback) return ''
    return formatRelativeShort(fallback)
}

const getMeaningfulSentence = (h: HistoryRow): string => {
    const stageLc = safeLower(h.stage)
    const isAgentDecision = !!(h.agentType || h.agentResponse || stageLc.includes('agent'))
    const actor = isAgentDecision ? `AI Agent` : pickProcessedBy(h)
    const actionText = h.status || h.action || 'Received'
    const time = formatTimePhrase(h)
    const hasProcessed = !!toDate(h.processedOn)
    const actionLc = actionText.toLowerCase()
    const isNeutral = actionLc.includes('pending') || actionLc.includes('received') || actionLc.includes('queued')

    if (!isNeutral && actor && time && hasProcessed) {
        return `Action ‘${actionText}’ by ${actor} on ${time}.` // Shortened phrasing
    }

    if (isNeutral && time) {
        return `${actionText} ${hasProcessed ? 'on' : ''} ${time}.`
    }

    const parts: string[] = [actionText]
    if (time) {
        if (hasProcessed) parts.push('on')
        parts.push(time)
    }
    if (actor && !isNeutral) {
        parts.push(`by ${actor}`)
    }

    return `${parts.join(' ')}.`
}

export default function History({ workflowId, processId, enabled }: Props) {
    const { data, isLoading, error } = useHistory(workflowId, processId, enabled)

    const stageRollup = useMemo(() => {
        const seen = new Set<string>()
        const out: HistoryRow[] = []
        for (const r of (data || []) as HistoryRow[]) {
            const key = String(r.activityId ?? r.stage ?? '')
            if (!key) continue
            if (seen.has(key)) continue
            seen.add(key)
            out.push(r)
        }
        return out
    }, [data])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-4">
                <Icon name="tabler:loader-2" className="size-4 text-gray-400 animate-spin mb-1" />
                <div className="text-[10px] font-medium text-gray-500">Loading...</div>
            </div>
        )
    }

    if (error) {
        return <div className="p-2 text-center text-[10px] text-red-500">Failed to load history.</div>
    }

    if (!stageRollup.length) {
        return (
            <div className="py-4 text-center text-gray-400">
                <Icon name="tabler:history-off" className="size-5 mx-auto mb-1 opacity-50" />
                <div className="text-[10px]">No history</div>
            </div>
        )
    }

    return (
        <div className="px-2 pt-2 pb-0">
            <Timeline
                lineWidth={1} // Thinner line
                bulletSize={24} // Compact bullet size (was 32)
                styles={{
                    item: {
                        paddingLeft: 14, // Reduced left padding (was 20)
                        paddingBottom: 12, // Reduced bottom padding for compactness (was 24)
                    },
                    itemBullet: {
                        backgroundColor: 'transparent',
                        border: 'none',
                    },
                    itemBody: {
                        marginTop: -3 // Fine-tune alignment for smaller bullet
                    }
                }}
            >
                {stageRollup.map((h, idx) => {
                    const isStart = idx === 0
                    const config = getStepConfig(h, isStart)
                    const dateDisplay = getDisplayDate(h)
                    const sentence = getMeaningfulSentence(h)

                    return (
                        <Timeline.Item
                            key={`${h.activityId ?? idx}`}
                            bullet={
                                <div className={cn("flex size-6 items-center justify-center rounded-full border border-white ring-2 ring-white shadow-sm", config.bulletBg)}>
                                    <Icon name={config.icon} className={cn("size-3", config.iconColor)} />
                                </div>
                            }
                        >
                            <div className="w-full flex items-start justify-between gap-2 min-h-[24px]">
                                {/* Left: Stage Name & Desc */}
                                <div className="flex flex-col min-w-0">
                                    <div className="text-xs font-semibold text-[var(--gray-12)] leading-none mb-0.5 line-clamp-1 hover:line-clamp-none transition-all">
                                        {h.stage || 'Stage'}
                                    </div>
                                    <div className="text-[11px] font-medium text-[var(--gray-9)] leading-tight line-clamp-2 hover:line-clamp-none transition-all">
                                        {sentence}
                                    </div>
                                </div>

                                {/* Right: Date */}
                                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                    <span className="text-[10px] font-medium text-[var(--gray-7)] whitespace-nowrap">
                                        {dateDisplay}
                                    </span>
                                </div>
                            </div>
                        </Timeline.Item>
                    )
                })}
            </Timeline>
        </div>
    )
}