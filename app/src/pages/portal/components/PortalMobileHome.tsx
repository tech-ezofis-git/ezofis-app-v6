import { useLingui } from '@lingui/react/macro'
import dayjs from 'dayjs'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useDeferredValue, useMemo, useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Skeleton from '@/components/base/Skeleton'
import { extractGenericRequestNumber } from '@/pages/requests/components/columns/useDynamicColumns'
import {
  getGenericStageInfo,
  isAtEndBlock,
} from '@/pages/requests/utils/workflow.utils'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import type { PortalWorkflowSummary } from '../helpers/portalWorkflows'
import {
  getLastActionLabel,
  lastActionTone,
  parseSubmissionFormData,
  type PortalSubmission,
} from '../helpers/portalSubmissions'
import { type PortalRequestTab, submissionInTab } from '../helpers/portalTabs'
import {
  type PortalFilterField,
  usePortalFilterOptions,
  usePortalFilters,
} from '../hooks/usePortalFilters'
import PortalBottomSheet from './PortalBottomSheet'
import {
  formatRunningTime,
  getSubmissionMeta,
  toListRow,
} from './PortalSubmissionRow'

type PortalMobileHomeProps = {
  canCreateSubmission: boolean
  email: string
  loading?: boolean
  /** Tabs from the workflow's Request Views setting (none when unset). */
  requestTabs?: PortalRequestTab[]
  submissions: PortalSubmission[]
  submissionsError?: string | null
  tenantId?: string
  workflowId?: string
  workflowName?: string
  workflows: PortalWorkflowSummary[]
  onBackToWorkflows?: () => void
  onNewSubmission: () => void
  onOpenSubmission: (submission: PortalSubmission) => void
  onRefresh?: () => void
  onSignOut: () => void
}

/**
 * Icon on each card, from where the request is in its workflow: the last
 * review action when there is one, otherwise finished vs. still in a stage.
 */
/** Stage-trail colors (connection button color into the current stage). */
const STAGE_COLOR_TONE: Record<
  string,
  { className: string; done: string; open: string }
> = {
  green: {
    className: 'bg-green-3 text-green-11',
    done: 'tabler:circle-check',
    open: 'tabler:progress',
  },
  orange: {
    className: 'bg-orange-3 text-orange-11',
    done: 'tabler:arrow-back-up',
    open: 'tabler:arrow-back-up',
  },
  primary: {
    className: 'bg-primary-3 text-primary-11',
    done: 'tabler:circle-check',
    open: 'tabler:progress',
  },
  red: {
    className: 'bg-red-3 text-red-11',
    done: 'tabler:circle-x',
    open: 'tabler:circle-x',
  },
  secondary: {
    className: 'bg-secondary-3 text-secondary-11',
    done: 'tabler:circle-check',
    open: 'tabler:progress',
  },
}

const stageIcon = (
  lastActionLabel: string,
  isTerminal: boolean,
  color?: string,
) => {
  // Same color as the stage in the request header / Requests list.
  const colored = color ? STAGE_COLOR_TONE[color] : undefined
  if (colored) {
    return {
      className: colored.className,
      icon: isTerminal ? colored.done : colored.open,
    }
  }
  const text = lastActionLabel.toLowerCase()
  if (text.includes('reject') || text.includes('denied')) {
    return { className: 'bg-red-3 text-red-11', icon: 'tabler:circle-x' }
  }
  if (text.includes('approv') || text.includes('complete') || isTerminal) {
    return {
      className: 'bg-green-3 text-green-11',
      icon: 'tabler:circle-check',
    }
  }
  if (text.includes('return') || text.includes('rework')) {
    return {
      className: 'bg-orange-3 text-orange-11',
      icon: 'tabler:arrow-back-up',
    }
  }
  return { className: 'bg-primary-3 text-primary-11', icon: 'tabler:progress' }
}

const flattenSearchableText = (value: unknown): string => {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.map(flattenSearchableText).join(' ')
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(flattenSearchableText)
      .join(' ')
  }
  return String(value)
}

/**
 * Phone layout of the portal request list: compact "My Requests" title with
 * a search toggle, API-driven filter chips (bottom-sheet pickers), floating
 * request cards and a floating bottom nav whose centre button starts a new
 * submission.
 */
export default function PortalMobileHome({
  canCreateSubmission,
  email,
  loading,
  requestTabs = [],
  submissions,
  submissionsError,
  tenantId,
  workflowId,
  workflowName,
  workflows,
  onBackToWorkflows,
  onNewSubmission,
  onOpenSubmission,
  onRefresh,
  onSignOut,
}: PortalMobileHomeProps) {
  const { t } = useLingui()
  const reduceMotion = useReducedMotion()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [sheetField, setSheetField] = useState<PortalFilterField | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [optionSearch, setOptionSearch] = useState('')

  const filters = usePortalFilters(workflowId, tenantId)
  const [activeTabId, setActiveTabId] = useState('')
  // '' = Total (every request); otherwise a Request Views tab's id
  const activeTab = requestTabs.find((tab) => tab.id === activeTabId) || null
  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        requestTabs.map((tab) => [
          tab.id,
          submissions.filter((row) => submissionInTab(row, tab)).length,
        ]),
      ),
    [requestTabs, submissions],
  )
  const optionsQuery = usePortalFilterOptions(workflowId, sheetField, tenantId)

  const datePresets = useMemo(
    () => [
      { label: t`Today`, value: 'today' },
      { label: t`This week`, value: 'this_week' },
      { label: t`Last week`, value: 'last_week' },
      { label: t`This month`, value: 'this_month' },
      { label: t`Last month`, value: 'last_month' },
      { label: t`This year`, value: 'this_year' },
    ],
    [t],
  )

  const openSheet = (field: PortalFilterField) => {
    setDraft(filters.activeFilters[field.id] || [])
    setOptionSearch('')
    setSheetField(field)
  }

  // Server-filtered (when filters are active), then searched on the device.
  const visible = useMemo(() => {
    let rows = activeTab
      ? submissions.filter((row) => submissionInTab(row, activeTab))
      : submissions
    if (filters.isFiltering) {
      const ids = filters.matchIds
      rows = ids ? rows.filter((row) => ids.has(row.id)) : []
    }
    const needle = deferredQuery.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => {
      const summary = [
        row.title,
        row.requestNo,
        row.status,
        row.amount,
        row.workflowName,
        row.raw.stage,
      ]
        .join(' ')
        .toLowerCase()
      return (
        summary.includes(needle) ||
        flattenSearchableText(parseSubmissionFormData(row.raw))
          .toLowerCase()
          .includes(needle)
      )
    })
  }, [
    activeTab,
    deferredQuery,
    filters.isFiltering,
    filters.matchIds,
    submissions,
  ])

  const hasCriteria = filters.isFiltering || Boolean(query.trim())
  const isLoading = loading || filters.matchLoading
  const loadError =
    (submissionsError && submissions.length === 0) || filters.matchError

  // Re-run the card entrance only when the result set changes.
  const listKey = useMemo(
    () => visible.map((row) => row.id).join('|'),
    [visible],
  )
  const optionValues = useMemo(() => {
    if (!sheetField) return []
    const list =
      sheetField.kind === 'date'
        ? datePresets
        : (optionsQuery.data || []).map((value) => ({ label: value, value }))
    const needle = optionSearch.trim().toLowerCase()
    return needle
      ? list.filter((option) => option.label.toLowerCase().includes(needle))
      : list
  }, [datePresets, optionSearch, optionsQuery.data, sheetField])

  const chipLabel = (field: PortalFilterField) => {
    const values = filters.activeFilters[field.id] || []
    if (!values.length) return field.label
    const first =
      field.kind === 'date'
        ? datePresets.find((preset) => preset.value === values[0])?.label ||
          values[0]
        : values[0]
    return values.length > 1 ? `${first} +${values.length - 1}` : first
  }

  const tapScale = reduceMotion ? undefined : { scale: 0.98 }

  return (
    <div className='flex min-w-0 flex-col gap-4 pb-28'>
      {/* Title + search / refresh */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='flex items-center justify-between gap-2'
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
      >
        <div className='flex min-w-0 items-center gap-2'>
          {onBackToWorkflows ? (
            <button
              aria-label={t`Back to workflows`}
              className='flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-gray-11 shadow-xs transition active:scale-95'
              type='button'
              onClick={onBackToWorkflows}
            >
              <Icon className='size-4' name='lucide:arrow-left' />
            </button>
          ) : null}
          <div className='min-w-0'>
            <h1 className='text-[22px] leading-tight font-bold tracking-tight text-gray-13'>
              {t`My Requests`}
            </h1>
            {workflowName ? (
              <p className='truncate text-12 text-gray-10'>{workflowName}</p>
            ) : null}
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-1.5'>
          <button
            aria-expanded={searchOpen}
            aria-label={t`Search requests`}
            type='button'
            className={cn(
              'relative flex size-11 items-center justify-center rounded-full bg-surface text-gray-11 shadow-xs transition active:scale-95',
              searchOpen && 'bg-primary-9 text-white',
            )}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Icon className='size-[18px]' name='lucide:search' />
            {query && !searchOpen ? (
              <span className='absolute top-2 right-2 size-2 rounded-full bg-primary-9' />
            ) : null}
          </button>
          {onRefresh ? (
            <button
              aria-label={t`Refresh`}
              className='flex size-11 items-center justify-center rounded-full bg-surface text-gray-11 shadow-xs transition active:scale-95 disabled:opacity-60'
              disabled={isLoading}
              type='button'
              onClick={() => {
                onRefresh()
                if (filters.isFiltering) void filters.refetchMatches()
              }}
            >
              <Icon
                className={cn('size-[18px]', isLoading && 'animate-spin')}
                name='tabler:refresh'
              />
            </button>
          ) : null}
        </div>
      </motion.div>

      {/* Search (collapsing keeps the query) */}
      <AnimatePresence initial={false}>
        {searchOpen ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className='overflow-hidden'
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <div className='flex items-center gap-2 rounded-full bg-surface px-4 shadow-xs ring-1 ring-gray-3 focus-within:ring-2 focus-within:ring-primary-7'>
              <Icon
                className='size-4 shrink-0 text-gray-9'
                name='lucide:search'
              />
              <input
                aria-label={t`Search requests`}
                className='h-11 min-w-0 flex-1 bg-transparent text-[16px] text-gray-13 outline-none placeholder:text-gray-8'
                placeholder={t`Search requests…`}
                type='search'
                value={query}
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button
                  aria-label={t`Clear search`}
                  className='flex size-8 shrink-0 items-center justify-center rounded-full text-gray-9 hover:bg-gray-3'
                  type='button'
                  onClick={() => setQuery('')}
                >
                  <Icon className='size-4' name='lucide:x' />
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Request Views tabs, as on the Requests page */}
      {requestTabs.length > 0 ? (
        <div
          aria-label={t`Request views`}
          className='-mx-4 flex gap-1 overflow-x-auto border-b border-gray-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          role='tablist'
        >
          {[{ id: '', label: t`Total` }, ...requestTabs].map((tab) => {
            const selected = tab.id === (activeTab?.id ?? '')
            return (
              <button
                aria-selected={selected}
                key={tab.id}
                role='tab'
                type='button'
                className={cn(
                  '-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-2 text-14 whitespace-nowrap transition-colors active:scale-95',
                  selected
                    ? 'border-primary-9 font-semibold text-primary-11'
                    : 'border-transparent font-medium text-gray-10',
                )}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-11 font-bold tabular-nums',
                    selected
                      ? 'bg-primary-3 text-primary-11'
                      : 'bg-gray-3 text-gray-10',
                  )}
                >
                  {tab.id ? (tabCounts[tab.id] ?? 0) : submissions.length}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Filter chips from the workflow's filter-fields API */}
      {filters.chipFields.length || filters.addableFields.length ? (
        <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {filters.chipFields.map((field) => {
            const active = (filters.activeFilters[field.id]?.length || 0) > 0
            return (
              <button
                aria-haspopup='dialog'
                key={field.id}
                type='button'
                className={cn(
                  'inline-flex h-10 max-w-[220px] shrink-0 items-center gap-1.5 rounded-full px-4 text-13 font-medium whitespace-nowrap shadow-xs transition active:scale-95',
                  active
                    ? 'bg-primary-9 text-white'
                    : 'bg-surface text-gray-12 ring-1 ring-gray-3',
                )}
                onClick={() => openSheet(field)}
              >
                <span className='truncate'>{chipLabel(field)}</span>
                <Icon
                  className='size-3.5 shrink-0 opacity-70'
                  name='lucide:chevron-down'
                />
              </button>
            )
          })}
          {filters.addableFields.length ? (
            <button
              aria-label={t`Add filter`}
              className='flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary-11 shadow-xs ring-1 ring-gray-3 transition active:scale-95'
              type='button'
              onClick={() => setAddOpen(true)}
            >
              <Icon className='size-4' name='lucide:plus' />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Request cards */}
      {isLoading ? (
        <div aria-busy='true' className='flex flex-col gap-3'>
          {[0, 1, 2, 3].map((index) => (
            <div
              className='flex items-start gap-3 rounded-2xl border border-gray-3 bg-surface p-3'
              key={index}
            >
              <Skeleton className='size-9 shrink-0 rounded-full' />
              <div className='min-w-0 flex-1 space-y-2'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-3 w-32' />
                <Skeleton className='h-3 w-20' />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className='flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-8 text-center shadow-xs'>
          <span className='flex size-12 items-center justify-center rounded-full bg-red-2 text-red-11'>
            <Icon className='size-5' name='lucide:wifi-off' />
          </span>
          <p className='text-13 font-medium text-gray-12'>
            {t`We couldn't load your requests.`}
          </p>
          <Button
            icon='tabler:refresh'
            label={t`Retry`}
            size='sm'
            variant='outline'
            onClick={() => {
              if (filters.matchError) void filters.refetchMatches()
              else onRefresh?.()
            }}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className='flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-10 text-center shadow-xs'>
          <span className='flex size-14 items-center justify-center rounded-full bg-secondary-3 text-secondary-11'>
            <Icon className='size-6' name='lucide:inbox' />
          </span>
          <p className='text-14 font-semibold text-gray-13'>
            {t`No requests found`}
          </p>
          {hasCriteria ? (
            <Button
              icon='lucide:x'
              label={t`Clear filters`}
              size='sm'
              variant='outline'
              onClick={() => {
                filters.clearAll()
                setQuery('')
              }}
            />
          ) : null}
        </div>
      ) : (
        <div className='flex flex-col gap-3' key={listKey}>
          {visible.map((submission, index) => {
            const row = toListRow(submission)
            const workflow = workflows.find(
              (item) => item.id === submission.workflowId,
            )?.workflow
            const { color, currentLabel, isTerminal } = getGenericStageInfo(
              workflow,
              row,
            )
            const lastActionLabel = getLastActionLabel(submission.raw)
            const tone = stageIcon(lastActionLabel, isTerminal, color)
            const { lastActionAt, raisedBy, startedAt } = getSubmissionMeta(
              submission,
              row,
            )
            const started = parseUtcDate(startedAt)
            // A request sitting on the END block is finished — no timer
            // A request sitting on the END block is finished — green time
            const isEnd = isAtEndBlock(workflow, row.activityId)
            const running = lastActionAt ? formatRunningTime(lastActionAt) : ''
            return (
              <motion.button
                animate={{ opacity: 1, y: 0 }}
                className='flex w-full min-w-0 items-start gap-3 rounded-2xl border border-gray-3 bg-surface p-3 text-left shadow-2xs transition-colors outline-none hover:border-gray-5 focus-visible:ring-2 focus-visible:ring-primary-7'
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                key={`${submission.workflowId}-${submission.id}`}
                type='button'
                whileTap={tapScale}
                transition={{
                  delay: reduceMotion ? 0 : Math.min(index, 8) * 0.05,
                  duration: 0.25,
                }}
                onClick={() => onOpenSubmission(submission)}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    tone.className,
                  )}
                >
                  <Icon className='size-[18px]' name={tone.icon} />
                </span>
                <span className='flex min-w-0 flex-1 flex-col gap-1'>
                  <span className='flex min-w-0 items-center gap-2'>
                    <span className='truncate text-14 font-bold text-gray-13'>
                      {extractGenericRequestNumber(row) || submission.requestNo}
                    </span>
                    {lastActionLabel ? (
                      <span
                        className={cn(
                          'inline-flex h-5 max-w-[45%] shrink-0 items-center rounded-full px-2 text-11 font-medium',
                          lastActionTone(lastActionLabel),
                        )}
                      >
                        <span className='truncate'>{lastActionLabel}</span>
                      </span>
                    ) : null}
                    <Icon
                      className='ml-auto size-4 shrink-0 text-gray-7'
                      name='lucide:chevron-right'
                    />
                  </span>
                  {/* Who raised it on the left, current stage badge on the
                      right — one row */}
                  {raisedBy || currentLabel ? (
                    <span className='flex min-w-0 items-center justify-between gap-2'>
                      <span className='flex min-w-0 items-center gap-1 text-12 text-gray-11'>
                        {raisedBy ? (
                          <>
                            <Icon
                              className='size-3.5 shrink-0 text-gray-8'
                              name='tabler:user'
                            />
                            <span className='truncate'>{raisedBy}</span>
                          </>
                        ) : null}
                      </span>
                      {currentLabel ? (
                        <span
                          className={cn(
                            'inline-flex h-5 max-w-[50%] shrink-0 items-center gap-1 rounded-full px-2 text-11 font-semibold',
                            isTerminal
                              ? 'bg-green-2 text-green-11'
                              : 'bg-primary-2 text-primary-11',
                          )}
                        >
                          <Icon
                            className='size-3 shrink-0'
                            name='tabler:git-branch'
                          />
                          <span className='truncate'>{currentLabel}</span>
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {started || running ? (
                    <span className='mt-1 flex items-center justify-between gap-2 border-t border-gray-3 pt-2'>
                      {started ? (
                        <span className='flex min-w-0 items-center gap-1 text-11 text-gray-9'>
                          <Icon
                            className='size-3 shrink-0 text-gray-7'
                            name='tabler:calendar'
                          />
                          <span className='truncate'>
                            {dayjs(started).format('DD-MMM-YYYY hh:mm A')}
                          </span>
                        </span>
                      ) : (
                        <span />
                      )}
                      {running ? (
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-11 font-semibold whitespace-nowrap',
                            isEnd
                              ? 'bg-green-2 text-green-11'
                              : 'bg-orange-2 text-orange-11',
                          )}
                        >
                          <Icon
                            className='size-3'
                            name={
                              isEnd ? 'tabler:circle-check' : 'tabler:clock'
                            }
                          />
                          {running}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Floating bottom navigation */}
      <nav
        aria-label={t`Portal navigation`}
        className='fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 md:hidden'
      >
        <div className='mx-auto flex h-14 max-w-xs items-center justify-around rounded-full bg-surface px-3 shadow-[0_8px_24px_-12px_var(--gray-10)] ring-1 ring-gray-3'>
          <button
            aria-current='page'
            aria-label={t`My Requests`}
            className='relative flex size-10 items-center justify-center rounded-full bg-primary-3 text-primary-11 transition active:scale-95'
            type='button'
            onClick={() => window.scrollTo({ behavior: 'smooth', top: 0 })}
          >
            <Icon className='size-[18px]' name='lucide:file-text' />
            <span className='absolute -bottom-1 h-0.5 w-4 rounded-full bg-primary-9' />
          </button>
          {canCreateSubmission ? (
            <motion.button
              aria-label={t`New Submission`}
              className='-mt-5 flex size-12 items-center justify-center rounded-full bg-primary-9 text-white shadow-[0_8px_18px_-8px_var(--primary-9)] ring-4 ring-surface'
              type='button'
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              onClick={onNewSubmission}
            >
              <Icon className='size-5' name='lucide:plus' />
            </motion.button>
          ) : null}
          <button
            aria-label={t`Profile`}
            className='flex size-10 items-center justify-center rounded-full bg-secondary-3 text-secondary-11 transition active:scale-95'
            type='button'
            onClick={() => setProfileOpen(true)}
          >
            <Icon className='size-[18px]' name='lucide:user' />
          </button>
        </div>
      </nav>

      {/* Filter value sheet */}
      <PortalBottomSheet
        open={Boolean(sheetField)}
        title={sheetField?.label || ''}
        footer={
          <>
            <Button
              className='flex-1 justify-center'
              color='gray'
              label={t`Clear`}
              variant='outline'
              onClick={() => {
                if (sheetField) filters.setFieldValues(sheetField.id, [])
                setSheetField(null)
              }}
            />
            <Button
              className='flex-1 justify-center'
              label={t`Apply`}
              onClick={() => {
                if (sheetField) filters.setFieldValues(sheetField.id, draft)
                setSheetField(null)
              }}
            />
          </>
        }
        onClose={() => setSheetField(null)}
      >
        {sheetField?.kind === 'category' ? (
          <div className='mb-2 flex items-center gap-2 rounded-full bg-gray-2 px-3'>
            <Icon className='size-4 text-gray-9' name='lucide:search' />
            <input
              aria-label={t`Search options`}
              className='h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gray-8'
              placeholder={t`Search`}
              value={optionSearch}
              onChange={(event) => setOptionSearch(event.target.value)}
            />
          </div>
        ) : null}
        {sheetField?.kind === 'category' && optionsQuery.isLoading ? (
          <p className='px-3 py-6 text-center text-13 text-gray-9'>
            {t`Loading options…`}
          </p>
        ) : optionValues.length === 0 ? (
          <p className='px-3 py-6 text-center text-13 text-gray-9'>
            {t`No options found.`}
          </p>
        ) : (
          <div className='flex flex-col'>
            {optionValues.map((option) => {
              const single = sheetField?.kind === 'date'
              const checked = draft.includes(option.value)
              return (
                <button
                  aria-checked={checked}
                  key={option.value}
                  role={single ? 'radio' : 'checkbox'}
                  type='button'
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-14 transition-colors active:bg-gray-3',
                    checked
                      ? 'bg-primary-2 font-medium text-gray-13'
                      : 'text-gray-12',
                  )}
                  onClick={() =>
                    setDraft((prev) =>
                      single
                        ? [option.value]
                        : prev.includes(option.value)
                          ? prev.filter((value) => value !== option.value)
                          : [...prev, option.value],
                    )
                  }
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center border-2 transition-colors',
                      single ? 'rounded-full' : 'rounded-md',
                      checked
                        ? 'border-primary-9 bg-primary-9 text-white'
                        : 'border-gray-6',
                    )}
                  >
                    {checked ? (
                      single ? (
                        <span className='size-2 rounded-full bg-white' />
                      ) : (
                        <Icon className='size-3.5' name='lucide:check' />
                      )
                    ) : null}
                  </span>
                  <span className='min-w-0 flex-1 truncate'>
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </PortalBottomSheet>

      {/* "+" : add another filter field */}
      <PortalBottomSheet
        open={addOpen}
        title={t`Add filter`}
        onClose={() => setAddOpen(false)}
      >
        <div className='flex flex-col'>
          {filters.addableFields.map((field) => (
            <button
              className='flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-14 text-gray-12 transition-colors active:bg-gray-3'
              key={field.id}
              type='button'
              onClick={() => {
                filters.addField(field.id)
                setAddOpen(false)
                openSheet(field)
              }}
            >
              <Icon
                className='size-4 text-gray-9'
                name={
                  field.kind === 'date'
                    ? 'lucide:calendar'
                    : 'lucide:list-filter'
                }
              />
              <span className='min-w-0 flex-1 truncate'>{field.label}</span>
            </button>
          ))}
        </div>
      </PortalBottomSheet>

      {/* Profile: who is signed in + sign out */}
      <PortalBottomSheet
        open={profileOpen}
        title={t`Profile`}
        onClose={() => setProfileOpen(false)}
      >
        <div className='flex items-center gap-3 rounded-2xl bg-gray-2 p-3'>
          <span className='flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-3 text-15 font-semibold text-primary-11 uppercase'>
            {email.trim().charAt(0) || '?'}
          </span>
          <span className='min-w-0 flex-1 text-13 font-medium [overflow-wrap:anywhere] text-gray-12'>
            {email}
          </span>
        </div>
        <button
          className='mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-14 font-medium text-red-11 transition-colors active:bg-red-2'
          type='button'
          onClick={() => {
            setProfileOpen(false)
            onSignOut()
          }}
        >
          <Icon className='size-4' name='lucide:log-out' />
          {t`Sign out`}
        </button>
      </PortalBottomSheet>
    </div>
  )
}
