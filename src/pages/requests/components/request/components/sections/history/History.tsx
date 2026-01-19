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

    // If processed, show absolute date
    if (processed) return formatDatetime(processed, 'datetime')

    // If pending/received, show relative if recent, otherwise absolute
    if (received) {
        const diffHours = (Date.now() - received.getTime()) / (1000 * 60 * 60)
        if (diffHours < 24) return 'Just now' // Simplified relative
        if (diffHours < 48) return 'Yesterday'
        if (diffHours > 24 * 3) return formatDatetime(received, 'datetime') // Fallback to date after 3 days
        return `${Math.floor(diffHours / 24)} days ago`
    }
    return ''
}

// Config for Icons and Badge Colors based on status
const getStepConfig = (h: HistoryRow, isStart: boolean) => {
    const s = safeLower(h.status)
    const stage = safeLower(h.stage)

    // 1. Start Node
    if (isStart || stage.includes('start')) {
        return {
            icon: 'tabler:send',
            iconColor: 'text-blue-9',
            bulletBg: 'bg-blue-5',
            badgeBg: 'bg-blue-5',
            badgeText: 'text-blue-9',
            label: 'Submit'
        }
    }

    // 2. Approved / Completed
    const isApproved = s.includes('approved') || s.includes('approve') || s.includes('verified') || stage === 'end'
    if (isApproved) {
        return {
            icon: 'tabler:check',
            iconColor: 'text-green-9',
            bulletBg: 'bg-green-5',
            badgeBg: 'bg-green-5',
            badgeText: 'text-green-9',
            label: h.status || 'APPROVED'
        }
    }

    // 3. Rejected
    if (s.includes('reject')) {
        return {
            icon: 'tabler:x',
            iconColor: 'text-red-9',
            bulletBg: 'bg-red-5',
            badgeBg: 'bg-red-5',
            badgeText: 'text-red-9',
            label: h.status || 'REJECTED'
        }
    }

    // 4. Default / Pending / Received
    return {
        icon: 'tabler:clock', // Clock icon for pending
        iconColor: 'text-gray-9',
        bulletBg: 'bg-gray-5',
        badgeBg: 'bg-gray-5',
        badgeText: 'text-gray-9',
        label: h.status || 'Received'
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
    if (min < 60) return `${min} minutes ago`

    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr} hours ago`

    const day = Math.floor(hr / 24)
    if (day < 14) return `${day} days ago`

    return formatDatetime(d, 'datetime')
}

/** Time policy: processed absolute, others relative */
const formatTimePhrase = (h: HistoryRow): string => {
    const processed = toDate(h.processedOn)
    // Using 'datetime' format to ensure it looks like 06-Jan-2026 19:51
    if (processed) return formatDatetime(processed, 'datetime')

    const fallback = toDate(h.receivedOn) || toDate(h.actionAt)
    if (!fallback) return ''
    return formatRelativeShort(fallback)
}

/** * Logic to construct the description sentence:
 * Action ‘[Status]’ was performed by [User] on [Date].
 */
const getMeaningfulSentence = (h: HistoryRow): string => {
    const stageLc = safeLower(h.stage)
    const isAgentDecision = !!(h.agentType || h.agentResponse || stageLc.includes('agent'))

    // 1. Identify the Actor
    const actor = isAgentDecision ? `AI Agent` : pickProcessedBy(h)

    // 2. Get the Raw Action
    const actionText = h.status || h.action || 'Received'

    // 3. Identify the Timing
    const time = formatTimePhrase(h)
    const hasProcessed = !!toDate(h.processedOn)

    // 4. Construct the sentence based on availability of data
    const actionLc = actionText.toLowerCase()
    const isNeutral = actionLc.includes('pending') || actionLc.includes('received') || actionLc.includes('queued')

    // Case: Full sentence with Actor and Date
    if (!isNeutral && actor && time && hasProcessed) {
        return `Action ‘${actionText}’ was performed by ${actor} on ${time}.`
    }

    // Case: No actor (like Received or Pending states)
    if (isNeutral && time) {
        return `${actionText} ${hasProcessed ? 'on' : ''} ${time}.`
    }

    // Fallback construction
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

/** Badge Config: Visual indicators based on status */
const getStatusConfig = (h: HistoryRow) => {
    const s = safeLower(h.status)
    const stage = safeLower(h.stage)
    const action = safeLower(h.action)

    const badgeLabel = h.status || (stage === 'end' || stage.includes('end') ? 'Completed' : 'Pending')

    const isQueued =
        h.actionStatus === 2 ||
        s.includes('queued') ||
        s.includes('pending') ||
        action.includes('queued') ||
        action.includes('pending')

    if (isQueued) return { badgeColor: 'purple' as const, badgeLabel }
    if (s.includes('rejected') || s.includes('reject')) return { badgeColor: 'red' as const, badgeLabel }
    if (s.includes('approved') || s.includes('approve')) return { badgeColor: 'green' as const, badgeLabel }
    if (s.includes('verified') || s.includes('verify')) return { badgeColor: 'blue' as const, badgeLabel }
    if (s.includes('submit') || s.includes('submitted')) return { badgeColor: 'indigo' as const, badgeLabel }
    if (stage === 'end' || stage.includes('end')) return { badgeColor: 'green' as const, badgeLabel }

    return { badgeColor: 'purple' as const, badgeLabel }
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
            <div className="flex flex-col items-center justify-center py-8">
                <Icon name="tabler:loader-2" className="size-5 text-gray-400 animate-spin mb-2" />
                <div className="text-xs font-medium text-gray-500">Loading history...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 text-center">
                <div className="text-xs text-red-500">Failed to load history.</div>
            </div>
        )
    }

    if (!stageRollup.length) {
        return (
            <div className="py-8 text-center text-gray-400">
                <Icon name="tabler:history-off" className="size-6 mx-auto mb-2 opacity-50" />
                <div className="text-xs">No history available</div>
            </div>
        )
    }

    return (
        <div className="px-4 pt-4 ">
            <Timeline
                lineWidth={2}
                bulletSize={32} // Larger bullet to accommodate the circle background
                styles={{
                    item: {
                        paddingLeft: 20,
                        paddingBottom: 24, // Spacing between items
                    },
                    itemBullet: {
                        backgroundColor: 'transparent', // We handle bg in the div
                        border: 'none',
                    },
                    itemBody: {
                        marginTop: -6 // Align text with the bullet
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
                                <div className={cn("flex size-8 items-center justify-center rounded-full border border-white ring-4 ring-white", config.bulletBg)}>
                                    <Icon name={config.icon} className={cn("size-4", config.iconColor)} />
                                </div>
                            }
                        >
                            <div className="w-full flex items-start justify-between gap-4">
                                {/* Left: Stage Name & Date */}

                                <div className="flex flex-col gap-0.5">
                                    <div className="text-13 font-bold text-[var(--gray-12)] leading-tight">
                                        {h.stage || 'Stage'}
                                    </div>
                                    <div className="text-12 font-medium text-[var(--gray-9)] leading-tight">
                                        {sentence}
                                    </div>
                                </div>

                                {/* Right: Badge */}
                                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                    <Icon name="tabler:clock" className="size-3 text-[var(--gray-7)]" />
                                    <span className="text-11 font-medium text-[var(--gray-8)]">
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