import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cn from '@/utils/cn'
import { IconButton } from '../../components/layout/AppBar'
import { ScreenScroll, ScreenShell } from '../../components/layout/ScreenShell'
import { TabBar, type TabBarItemId } from '../../components/layout/TabBar'
import { Icon } from '../../components/primitives/Icon'
import {
  FilterChip,
  RequestCard,
  RequestCardSkeleton,
  type RequestCardTone,
} from './RequestCard'
import {
  useMobileRequestsInbox,
  type MobileInboxTab,
} from './useMobileRequestsInbox'

const FILTERS: {
  id: string
  label: string
  icon: 'Clock' | 'CircleCheck' | 'TriangleAlert' | 'DollarSign'
  countKey: 'overdue' | 'matched' | 'discrepancies' | 'high'
  tone: RequestCardTone
}[] = [
  { id: 'overdue', label: 'Overdue', icon: 'Clock', countKey: 'overdue', tone: 'error' },
  {
    id: 'matched',
    label: 'Matched',
    icon: 'CircleCheck',
    countKey: 'matched',
    tone: 'success',
  },
  {
    id: 'discrepancies',
    label: 'Discrepancy',
    icon: 'TriangleAlert',
    countKey: 'discrepancies',
    tone: 'warning',
  },
  {
    id: 'highValue',
    label: 'High value',
    icon: 'DollarSign',
    countKey: 'high',
    tone: 'accent',
  },
]

const TABS: {
  id: MobileInboxTab
  label: string
  countKey: 'invoices' | 'exceptions' | 'processed'
}[] = [
  { id: 'Inbox', label: 'Invoices', countKey: 'invoices' },
  { id: 'Exceptions', label: 'Exceptions', countKey: 'exceptions' },
  { id: 'Processed', label: 'Processed', countKey: 'processed' },
]

type RequestsInboxScreenProps = {
  onOpenRequest?: (id: string) => void
  onTabBarChange?: (id: TabBarItemId) => void
}

export function RequestsInboxScreen({
  onOpenRequest,
  onTabBarChange,
}: RequestsInboxScreenProps) {
  const [tabBarId, setTabBarId] = useState<TabBarItemId>('inbox')
  const [workflowPickerOpen, setWorkflowPickerOpen] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const {
    activeQuickFilters,
    activeTab,
    allWorkflows,
    cards,
    filterCounts,
    handleOpenRequest,
    handleQuickFilter,
    handleSelectWorkflow,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    refetch,
    selectedWorkflowId,
    setActiveTab,
    showTopLoader,
    tabCounts,
    totalItems,
    workflowLoadStatus,
    workflowName,
  } = useMobileRequestsInbox()

  const emptyMessage = useMemo(() => {
    if (workflowLoadStatus === 'empty') return 'No workflows available'
    if (isInitialLoading) return null
    if (cards.length === 0) return 'No other pending invoices'
    return null
  }, [cards.length, isInitialLoading, workflowLoadStatus])

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore()
      }
    },
    [loadMore],
  )

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(onIntersect, {
      root: scrollRef.current,
      rootMargin: '180px 0px',
      threshold: 0,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, onIntersect, cards.length])

  return (
    <ScreenShell
      footer={
        <TabBar
          activeId={tabBarId}
          onChange={(id) => {
            setTabBarId(id)
            onTabBarChange?.(id)
          }}
        />
      }
      header={
        <header className='relative shrink-0 border-b border-[var(--gray-3)] bg-surface-primary pt-[max(0.5rem,env(safe-area-inset-top))]'>
          <div className='relative flex h-11 items-center px-1.5'>
            <IconButton
              aria-label='Workflows'
              className='z-10 size-9 shrink-0'
              onClick={() => setWorkflowPickerOpen((v) => !v)}
            >
              <Icon className='size-4' name='Menu' />
            </IconButton>

            <button
              className='absolute inset-x-12 truncate text-center text-[15px] font-semibold text-[var(--primary-9)] active:opacity-80'
              type='button'
              onClick={() => setWorkflowPickerOpen((v) => !v)}
            >
              {workflowName}
            </button>

            <div className='z-10 ml-auto flex shrink-0 items-center'>
              <IconButton
                aria-label='Refresh'
                className='size-9'
                onClick={() => void refetch()}
              >
                <Icon
                  className={cn('size-4', showTopLoader && 'animate-spin')}
                  name='RefreshCw'
                />
              </IconButton>
              <IconButton aria-label='Search' className='size-9'>
                <Icon className='size-4' name='Search' />
              </IconButton>
            </div>
          </div>

          <div
            aria-hidden
            className='pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden'
          >
            {showTopLoader ? (
              <div className='absolute inset-y-0 w-1/3 rounded-full bg-[var(--primary-9)] animate-[mobile-load_1.05s_ease-in-out_infinite]' />
            ) : null}
          </div>

          {workflowPickerOpen && allWorkflows.length > 0 ? (
            <div className='mx-3 mb-1 rounded-xl border border-border-default/70 bg-surface-primary p-1 shadow-sm'>
              <div className='no-scrollbar flex max-h-40 flex-col gap-0.5 overflow-y-auto'>
                {allWorkflows.map((wf) => (
                  <button
                    className={cn(
                      'rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors active:scale-[0.99]',
                      String(wf.id) === String(selectedWorkflowId)
                        ? 'bg-[var(--primary-3)] font-semibold text-[var(--primary-9)]'
                        : 'font-medium text-[var(--gray-11)]',
                    )}
                    key={String(wf.id)}
                    type='button'
                    onClick={() => {
                      handleSelectWorkflow(String(wf.id))
                      setWorkflowPickerOpen(false)
                    }}
                  >
                    {wf.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </header>
      }
    >
      <style>{`
        @keyframes mobile-load {
          0% { left: -35%; }
          50% { left: 45%; }
          100% { left: 110%; }
        }
      `}</style>

      {/* Underline tabs */}
      <div className='shrink-0 border-b border-[var(--gray-3)] bg-surface-primary px-3'>
        <div className='flex'>
          {TABS.map((tab) => {
            const active = tab.id === activeTab
            const count = tabCounts[tab.countKey]
            return (
              <button
                className={cn(
                  'flex-1 border-b-2 py-2.5 text-center text-[12px] transition-colors',
                  active
                    ? 'border-[var(--primary-9)] font-semibold text-[var(--primary-9)]'
                    : 'border-transparent font-medium text-[var(--gray-9)]',
                )}
                key={tab.id}
                type='button'
                onClick={() => setActiveTab(tab.id)}
              >
                <span className='truncate'>
                  {tab.label} ({count})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Capsule filters */}
      {activeTab === 'Inbox' ? (
        <div className='no-scrollbar shrink-0 flex gap-2 overflow-x-auto px-3 py-2.5'>
          {FILTERS.map((filter) => (
            <FilterChip
              active={activeQuickFilters.includes(filter.id)}
              count={filterCounts[filter.countKey]}
              icon={<Icon className='size-3' name={filter.icon} />}
              key={filter.id}
              label={filter.label}
              tone={filter.tone}
              onClick={() => handleQuickFilter(filter.id)}
            />
          ))}
        </div>
      ) : null}

      <ScreenScroll className='px-3 py-2.5' scrollRef={scrollRef}>
        <div className='flex flex-col gap-2.5 pb-2'>
          {isInitialLoading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <RequestCardSkeleton index={i} key={i} />
              ))}
            </>
          ) : emptyMessage ? (
            <div className='flex flex-col items-center justify-center gap-2 py-16 text-center'>
              <Icon className='size-8 text-text-muted/50' name='ClipboardList' />
              <p className='text-[12px] text-text-muted'>{emptyMessage}</p>
            </div>
          ) : (
            <>
              {cards.map((item, index) => (
                <RequestCard
                  index={index}
                  item={item}
                  key={item.id}
                  onSelect={(id) => {
                    handleOpenRequest(id)
                    onOpenRequest?.(id)
                  }}
                />
              ))}
              {!hasMore && !isLoadingMore ? (
                <div className='flex flex-col items-center gap-1.5 py-6 text-center'>
                  <Icon
                    className='size-7 text-text-muted/40'
                    name='ClipboardList'
                  />
                  <p className='text-[11px] text-text-muted'>
                    No other pending invoices
                  </p>
                </div>
              ) : null}
            </>
          )}

          {!isInitialLoading && cards.length > 0 ? (
            <div
              className='flex min-h-9 items-center justify-center py-1.5'
              ref={loadMoreRef}
            >
              {isLoadingMore ? (
                <div className='flex items-center gap-1.5'>
                  <Icon
                    className='size-3.5 animate-spin text-[var(--primary-9)]'
                    name='LoaderCircle'
                  />
                  <span className='text-[10px] text-text-muted'>
                    Loading more…
                  </span>
                </div>
              ) : hasMore ? (
                <span className='text-[10px] text-text-muted'>
                  Scroll to load more
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </ScreenScroll>
    </ScreenShell>
  )
}
