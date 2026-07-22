import { useMemo, useState } from 'react'
import cn from '@/utils/cn'
import { AppBar, IconButton } from '../../components/layout/AppBar'
import { ScreenScroll, ScreenShell } from '../../components/layout/ScreenShell'
import { TabBar, type TabBarItemId } from '../../components/layout/TabBar'
import { Icon } from '../../components/primitives/Icon'
import { FilterChip, RequestCard } from './RequestCard'
import {
  useMobileRequestsInbox,
  type MobileInboxTab,
} from './useMobileRequestsInbox'

const FILTERS = [
  { id: 'overdue', label: 'Overdue', icon: 'Clock' as const, countKey: 'overdue' as const },
  {
    id: 'matched',
    label: 'Matched',
    icon: 'CircleCheck' as const,
    countKey: 'matched' as const,
  },
  {
    id: 'discrepancies',
    label: 'Discrepancies',
    icon: 'TriangleAlert' as const,
    countKey: 'discrepancies' as const,
  },
  {
    id: 'highValue',
    label: 'High value',
    icon: 'DollarSign' as const,
    countKey: 'high' as const,
  },
]

const TABS: { id: MobileInboxTab; label: string; countKey: 'invoices' | 'exceptions' | 'processed' }[] =
  [
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

  const {
    activeQuickFilters,
    activeTab,
    allWorkflows,
    cards,
    filterCounts,
    handleOpenRequest,
    handleQuickFilter,
    handleSelectWorkflow,
    isLoading,
    isRefreshing,
    page,
    rangeEnd,
    rangeStart,
    refetch,
    selectedWorkflowId,
    setActiveTab,
    setPage,
    tabCounts,
    totalItems,
    workflowLoadStatus,
    workflowName,
  } = useMobileRequestsInbox()

  const emptyMessage = useMemo(() => {
    if (workflowLoadStatus === 'empty') return 'No workflows available'
    if (isLoading) return 'Loading requests…'
    if (cards.length === 0) return 'No requests found'
    return null
  }, [cards.length, isLoading, workflowLoadStatus])

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
        <AppBar
          subtitle={
            <button
              className='inline-flex max-w-[70vw] items-center gap-0.5 text-11 text-text-muted transition-opacity hover:opacity-80 active:scale-95'
              type='button'
              onClick={() => setWorkflowPickerOpen((v) => !v)}
            >
              <span className='truncate'>{workflowName}</span>
              <Icon className='size-3 shrink-0' name='ChevronDown' />
            </button>
          }
          title='Requests'
          trailing={
            <>
              <IconButton
                aria-label='Refresh'
                onClick={() => void refetch()}
              >
                <Icon
                  className={cn('size-4', isRefreshing && 'animate-spin')}
                  name='RefreshCw'
                />
              </IconButton>
              <IconButton aria-label='Search'>
                <Icon className='size-4' name='Search' />
              </IconButton>
              <IconButton aria-label='Notifications' className='relative'>
                <Icon className='size-4' name='Bell' />
              </IconButton>
            </>
          }
        />
      }
    >
      {workflowPickerOpen && allWorkflows.length > 0 ? (
        <div className='shrink-0 border-b border-border-default bg-surface-primary px-3 py-2'>
          <div className='no-scrollbar flex max-h-40 flex-col gap-1 overflow-y-auto'>
            {allWorkflows.map((wf) => (
              <button
                className={cn(
                  'rounded-lg px-2.5 py-2 text-left text-12 transition-colors',
                  String(wf.id) === String(selectedWorkflowId)
                    ? 'bg-accent-soft font-semibold text-accent-primary'
                    : 'text-text-secondary hover:bg-surface-hover',
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

      <div className='shrink-0 border-b border-border-default bg-surface-primary px-3'>
        <div className='flex gap-3'>
          {TABS.map((tab) => {
            const active = tab.id === activeTab
            const count = tabCounts[tab.countKey]
            return (
              <button
                className={
                  active
                    ? 'border-b-2 border-accent-primary py-2 text-12 font-semibold text-accent-primary transition-all'
                    : 'border-b-2 border-transparent py-2 text-12 font-medium text-text-muted transition-all hover:text-text-secondary'
                }
                key={tab.id}
                type='button'
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'Inbox' ? (
        <div className='no-scrollbar shrink-0 flex gap-1.5 overflow-x-auto border-b border-border-default bg-surface-primary px-3 py-2'>
          {FILTERS.map((filter) => (
            <FilterChip
              active={activeQuickFilters.includes(filter.id)}
              count={filterCounts[filter.countKey]}
              icon={<Icon className='size-3' name={filter.icon} />}
              key={filter.id}
              label={filter.label}
              onClick={() => handleQuickFilter(filter.id)}
            />
          ))}
        </div>
      ) : null}

      <ScreenScroll className='px-3 py-2.5'>
        <div className='flex flex-col gap-2'>
          {emptyMessage ? (
            <div className='flex flex-col items-center justify-center gap-2 py-16 text-center'>
              {isLoading ? (
                <Icon
                  className='size-5 animate-spin text-accent-primary'
                  name='LoaderCircle'
                />
              ) : (
                <Icon className='size-5 text-text-muted' name='Inbox' />
              )}
              <p className='text-12 text-text-muted'>{emptyMessage}</p>
            </div>
          ) : (
            cards.map((item) => (
              <RequestCard
                item={item}
                key={item.id}
                onSelect={(id) => {
                  handleOpenRequest(id)
                  onOpenRequest?.(id)
                }}
              />
            ))
          )}

          {!emptyMessage ? (
            <div className='flex items-center justify-between gap-2 pb-1 pt-0.5'>
              <p className='text-11 text-text-muted'>
                Showing {rangeStart}–{rangeEnd} of {totalItems} requests
              </p>
              <div className='flex items-center gap-1'>
                <IconButton
                  aria-label='Previous page'
                  className='!size-7'
                  disabled={page <= 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                >
                  <Icon className='size-3.5' name='ChevronLeft' />
                </IconButton>
                <IconButton
                  aria-label='Next page'
                  className='!size-7'
                  disabled={rangeEnd >= totalItems}
                  onClick={() => setPage(page + 1)}
                >
                  <Icon className='size-3.5' name='ChevronRight' />
                </IconButton>
              </div>
            </div>
          ) : null}
        </div>
      </ScreenScroll>
    </ScreenShell>
  )
}
