// @/pages/requests/components/request/components/sections/history/History.tsx
import { useMemo } from 'react'
import { Timeline } from '@mantine/core'
import Title from '@/components/base/Title'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Badge from '@/components/base/Badge'
import { formatDatetime } from '@/utils/dayjs'
import { useHistory } from '@/pages/requests/hooks/useHistory'

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

/** * Picks the most relevant actor name. 
 * Falls back through processedBy -> actionUser -> actionUserEmail.
 */
const pickProcessedBy = (h: HistoryRow) => h.processedBy || h.actionUser || h.actionUserEmail || ''

/** Relative time for non-processed events */
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
    const { data, isLoading, error, refetch } = useHistory(workflowId, processId, enabled)

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

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <Title className="mb-0" level={3} title="Process History" />
                <IconButton
                    icon="tabler:refresh"
                    variant="ghost"
                    color="gray"
                    onClick={() => refetch()}
                    loading={isLoading}
                    title="Refresh history"
                    ariaLabel="Refresh history"
                />
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-10">
                    <Icon name="tabler:loader-2" className="size-7 text-gray-400 animate-spin mb-3" />
                    <div className="text-sm font-medium text-gray-600">Loading history…</div>
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2">
                        <Icon name="tabler:alert-circle" className="size-5 text-red-600" />
                        <div className="text-sm font-medium text-red-800">Couldn't load process history</div>
                    </div>
                    <div className="mt-1 text-sm text-red-600">Please refresh to re-sync the timeline.</div>
                </div>
            )}

            {!isLoading && !error && !stageRollup.length && (
                <div className="flex flex-col items-center justify-center py-10">
                    <div className="flex size-14 items-center justify-center rounded-full bg-gray-100 mb-3">
                        <Icon name="tabler:history-off" className="size-7 text-gray-400" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">No history events yet</div>
                    <div className="text-sm text-gray-500 mt-1">History will appear here as the process progresses.</div>
                </div>
            )}

            {!isLoading && !error && !!stageRollup.length && (
                <Timeline
                    bulletSize={10}
                    lineWidth={1}
                    styles={{
                        item: { marginTop: 28, paddingLeft: 16 },
                        itemBullet: {
                            borderColor: 'var(--primary-11)',
                            backgroundColor: 'var(--surface)',
                            top: 6,
                        },
                        itemTitle: { margin: 0, padding: 0, lineHeight: '24px' },
                    }}
                >
                    {stageRollup.map((h, idx) => {
                        const { badgeColor, badgeLabel } = getStatusConfig(h)
                        const sentence = getMeaningfulSentence(h)

                        return (
                            <Timeline.Item
                                key={`${h.activityId ?? idx}`}
                                title={
                                    <div className="flex items-center gap-2 min-h-[24px]">
                                        <span className="text-base font-bold text-gray-900 leading-6">
                                            {h.stage || 'Stage'}
                                        </span>
                                        <Badge color={badgeColor} label={badgeLabel} />
                                    </div>
                                }
                            >
                                <div className="mt-2 text-sm text-gray-700">{sentence}</div>
                            </Timeline.Item>
                        )
                    })}
                </Timeline>
            )}
        </div>
    )
}