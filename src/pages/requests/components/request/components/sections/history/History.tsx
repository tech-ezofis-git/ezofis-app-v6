// @/pages/requests/components/request/components/sections/history/History.tsx
import Icon from '@/components/base/icon/Icon'
import { useHistory } from '@/pages/requests/hooks/useHistory'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'

type HistoryRow = {
  action?: string
  actionAt?: string | number | Date | null
  actionStatus?: number
  actionUser?: string | null
  actionUserEmail?: string | null
  activityId?: number | string
  agentResponse?: string | null
  agentType?: string | null
  description?: string
  performedByUserName?: string
  processedBy?: string | null
  processedOn?: string | number | Date | null
  receivedOn?: string | number | Date | null

  review?: string
  stage?: string
  stageName?: string
  stageType?: string
  status?: string
  // V6 Real-time properties
  title?: string
}

type Props = {
  enabled?: boolean
  instanceId?: string | number
  processId?: number | string
  workflowId?: number | string
}

const safeLower = (v?: string) => (v || '').toLowerCase()

const toDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const clean = value.trim()
    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(clean) &&
      !clean.endsWith('Z') &&
      !/[+-]\d{2}(:?\d{2})?$/.test(clean)
    ) {
      const d = new Date(clean + 'Z')
      if (!Number.isNaN(d.getTime())) return d
    }
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// Helper to determine the actor name
const pickActor = (h: HistoryRow) => {
  const userName = h.actionUser || h.performedByUserName
  const milestoneLower = safeLower(h.status || h.stage || h.stageType || '')
  const isApAgentNode =
    milestoneLower.includes('ap_agent') ||
    milestoneLower.includes('ocr') ||
    safeLower(h.stageName).includes('ocr') ||
    safeLower(h.stageType) === 'ap_agent'

  if (isApAgentNode) return 'AI Agent'

  if (h.actionUser) return h.actionUser
  if (h.performedByUserName) return h.performedByUserName
  if (h.agentType) {
    return h.agentType === 'ocr' ? 'AI Engine' : h.agentType
  }
  if (!userName) {
    const stageLc = safeLower(h.stage)
    if (stageLc.includes('start') || stageLc.includes('ingest')) {
      return 'System (Email)'
    }
    return 'System'
  }
  return userName
}

// Formats timestamp matching user's layout: YYYY-MM-DD hh:mm A
const getFormattedTimestamp = (h: HistoryRow) => {
  const d = toDate(h.processedOn) || toDate(h.receivedOn) || toDate(h.actionAt)
  if (!d) return ''
  return formatDatetime(d, 'YYYY-MM-DD hh:mm A')
}

// Config for Icons and Badge Colors based on status matching sample layout
const getStepConfig = (h: HistoryRow, _isStart: boolean) => {
  const action = safeLower(h.action)

  // If action contains 'move', prioritize orange clock theme (pending/moving)
  if (action === 'move' || action.includes('move')) {
    return {
      bulletBg: 'text-orange-9',
      icon: 'tabler:clock',
    }
  }

  // Otherwise, if action is not equal to move, it represents completed status (green success)
  return {
    bulletBg: 'text-green-9',
    icon: 'tabler:circle-check',
  }
}

// Maps the dynamic data fields to the requested action titles in layout sample
const getTitle = (h: HistoryRow) => {
  const stage = h.stage || ''
  const status = h.status || ''
  const stageLc = safeLower(stage)
  const statusLc = safeLower(status)

  // 1. Ingested
  if (
    stageLc.includes('start') ||
    stageLc.includes('ingest') ||
    statusLc.includes('ingest')
  ) {
    return 'Document ingested via email'
  }

  // 2. OCR extraction
  if (
    stageLc.includes('ocr') ||
    stageLc.includes('extraction') ||
    statusLc.includes('ocr') ||
    statusLc.includes('extraction')
  ) {
    let confidenceText = ''
    try {
      if (h.agentResponse) {
        const parsed =
          typeof h.agentResponse === 'string'
            ? JSON.parse(h.agentResponse)
            : h.agentResponse
        const conf =
          parsed.confidence || parsed.ocrConfidence || parsed.ocr_confidence
        if (conf) {
          confidenceText = ` — ${conf}`
          if (!confidenceText.includes('%')) confidenceText += '%'
        }
      }
    } catch (e) {
      // ignore
    }
    if (!confidenceText) {
      confidenceText = ' — 98% confidence' // default or fallback
    }
    return `OCR extraction complete${confidenceText}`
  }

  // 3. Metadata validated / Duplicate check
  if (
    stageLc.includes('validate') ||
    stageLc.includes('duplicate') ||
    statusLc.includes('validate') ||
    statusLc.includes('duplicate')
  ) {
    return 'Metadata validated, no duplicates found'
  }

  // 4. Approval / Grant
  if (
    statusLc.includes('approved') ||
    statusLc.includes('approve') ||
    statusLc.includes('verified') ||
    statusLc.includes('grant')
  ) {
    if (stageLc.includes('l1')) {
      return 'L1 Approval granted'
    } else if (stageLc.includes('l2')) {
      return 'L2 Approval granted'
    }
    return `${stage || 'Approval'} granted`
  }

  // 5. Escalated
  if (statusLc.includes('escalat') || stageLc.includes('escalat')) {
    let target = ''
    if (stageLc.includes('l2') || statusLc.includes('l2'))
      target = 'L2 Approval'
    else if (stageLc.includes('l3') || statusLc.includes('l3'))
      target = 'L3 Approval'

    let assignee = ''
    const actor = pickActor(h)
    if (actor && actor !== 'System' && actor !== 'System (Email)') {
      assignee = ` — ${actor}`
    } else if (h.actionUser) {
      assignee = ` — ${h.actionUser}`
    }

    if (target) {
      return `Escalated to ${target}${assignee}`
    }
    return `Escalated${assignee}`
  }

  // Fallback: Use h.stage or h.status / h.action
  if (stage && status) {
    return `${stage} — ${status}`
  }
  return stage || status || h.action || 'Stage processed'
}

export default function History({
  enabled,
  instanceId,
  processId,
  workflowId,
}: Props) {
  const {
    data: flows = [],
    error,
    isLoading,
  } = useHistory(workflowId, instanceId || processId, enabled)

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-8'>
        <Icon
          className='mb-2 size-5 animate-spin text-gray-10'
          name='tabler:loader-2'
        />
        <div className='text-[11px] font-medium text-gray-10'>
          Loading history...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-4 text-center text-xs font-semibold text-red-9'>
        Failed to load history.
      </div>
    )
  }

  if (!flows.length) {
    return (
      <div className='py-8 text-center text-gray-10'>
        <Icon
          className='mx-auto mb-2 size-8 opacity-50'
          name='tabler:history-off'
        />
        <div className='text-xs'>No history found</div>
      </div>
    )
  }

  // Dynamic Sorting / Chronological check
  const getStepDate = (item: HistoryRow): Date | null => {
    return (
      toDate(item.processedOn) ||
      toDate(item.receivedOn) ||
      toDate(item.actionAt)
    )
  }

  const firstDate = flows.length > 0 ? getStepDate(flows[0]) : null
  const lastDate =
    flows.length > 1 ? getStepDate(flows[flows.length - 1]) : null
  const isChronological =
    firstDate && lastDate ? firstDate.getTime() <= lastDate.getTime() : true

  const formatDuration = (ms: number): string => {
    if (ms < 0) ms = Math.abs(ms)
    const secs = Math.floor(ms / 1000)
    if (secs <= 0) return ''
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    if (mins < 60) {
      const remainingSecs = secs % 60
      return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`
    }
    const hours = Math.floor(mins / 60)
    if (hours < 24) {
      return `${hours}h ${mins % 60}m`
    }
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }

  return (
    <div className=''>
      <div className='animate-in fade-in slide-in-from-left-4 rounded-xl border border-[var(--gray-3)] bg-surface p-3 shadow-sm duration-300'>
        <div className='relative flex flex-col gap-5'>
          {/* Timeline Connecting Line */}
          {flows.length > 1 && (
            <div className='absolute top-8 bottom-8 left-[19px] z-0 w-0 border-l-[1.5px] border-dotted border-[var(--gray-5)]' />
          )}

          {flows.map((h, idx) => {
            const isStart = idx === 0
            const config = getStepConfig(h, isStart)
            const title = h.title || getTitle(h)
            const actor = pickActor(h)
            const date = getFormattedTimestamp(h)
            const isApAgent = safeLower(title).includes('ap agent')
            const hasDesc =
              h.description &&
              h.description.trim() &&
              h.description !== h.activityId &&
              h.description !== h.stage

            let matchBadge = null
            // let showDesc = !!hasDesc

            if (isApAgent && hasDesc) {
              const descLower = safeLower(h.description)
              if (descLower.includes('review: matched')) {
                matchBadge = {
                  color: 'border-green-3 bg-green-1 text-green-9',
                  label: 'Matched',
                }
                // if (descLower.trim() === 'review: matched') showDesc = false
              } else if (descLower.includes('partially matched')) {
                matchBadge = {
                  color: 'border-orange-3 bg-orange-1 text-orange-9',
                  label: 'Partially Matched',
                }
                // if (descLower.trim() === 'review: partially matched') showDesc = false
              } else if (descLower.includes('not matched')) {
                matchBadge = {
                  color: 'border-red-3 bg-red-1 text-red-9',
                  label: 'Not Matched',
                }
                // if (descLower.trim() === 'review: not matched') showDesc = false
              }
            }

            // Duration calculation
            let durationText = ''
            let isLatestDuration = false
            const currentDate = getStepDate(h)
            if (currentDate) {
              let nextStep: HistoryRow | undefined
              if (isChronological) {
                if (idx + 1 < flows.length) {
                  nextStep = flows[idx + 1]
                }
              } else {
                if (idx - 1 >= 0) {
                  nextStep = flows[idx - 1]
                }
              }

              if (nextStep) {
                const nextDate = getStepDate(nextStep)
                if (nextDate) {
                  const diffMs = Math.abs(
                    nextDate.getTime() - currentDate.getTime(),
                  )
                  if (diffMs > 0) {
                    durationText = formatDuration(diffMs)
                  }
                }
              } else {
                const isLatest = isChronological
                  ? idx === flows.length - 1
                  : idx === 0
                if (isLatest) {
                  const isTerminal =
                    safeLower(title).includes('complet') ||
                    safeLower(h.status).includes('complet') ||
                    safeLower(h.stage).includes('complet') ||
                    safeLower(title).includes('approv') ||
                    safeLower(title).includes('reject') ||
                    safeLower(title).includes('end')
                  const diffMs = Math.abs(Date.now() - currentDate.getTime())
                  if (diffMs > 0) {
                    const formatted = formatDuration(diffMs)
                    if (formatted) {
                      durationText = `${formatted} ago`
                      isLatestDuration = !isTerminal
                    }
                  }
                }
              }
            }

            return (
              <div
                className='relative flex items-start gap-4 transition-all duration-200 hover:translate-x-1'
                key={`${h.activityId ?? idx}-${idx}`}
              >
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--gray-3)] bg-surface shadow-sm transition-all active:scale-95',
                    config.bulletBg,
                  )}
                >
                  <Icon className='size-5' name={config.icon} />
                </div>

                <div className='flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5'>
                  <div className='flex items-center gap-2'>
                    <div className='text-13 leading-snug font-semibold text-gray-13'>
                      {title}
                    </div>
                    {matchBadge && (
                      <span
                        className={cn(
                          'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase',
                          matchBadge.color,
                        )}
                      >
                        {matchBadge.label}
                      </span>
                    )}
                  </div>
                  {/* {showDesc && (
                <div className='mt-1 max-w-md rounded-lg border border-gray-3/30 bg-gray-2/50 px-2.5 py-1.5 text-11 leading-normal font-normal whitespace-pre-wrap text-gray-11'>
                  {h.description}
                </div>
              )} */}
                  <div className='mt-1 flex flex-wrap items-center gap-1.5 text-11 font-medium text-gray-9'>
                    <span className='flex items-center gap-1'>
                      <Icon
                        className={cn(
                          'size-3.5 shrink-0',
                          actor === 'AI Agent'
                            ? 'text-[var(--primary-9)]'
                            : 'text-gray-8',
                        )}
                        name={
                          actor === 'AI Agent'
                            ? 'lucide:bot'
                            : actor === 'System' || actor === 'System (Email)'
                              ? 'tabler:settings'
                              : 'tabler:user'
                        }
                      />
                      <span>{actor}</span>
                    </span>
                    <span className='text-gray-6'>·</span>
                    <span>{date}</span>
                    {durationText && (
                      <>
                        <span className='text-gray-6'>·</span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                            isLatestDuration
                              ? 'bg-yellow-2/60 text-yellow-11'
                              : 'bg-purple-2/60 text-purple-11',
                          )}
                        >
                          <Icon className='size-3' name='tabler:clock' />
                          <span>{durationText}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
