import React, { useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import { formatDatetime } from '@/utils/dayjs'
import cn from '@/utils/cn'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import type { TableActionButton } from '@/components/base/data-table/TableActionBar'

interface GridViewProps {
  data: any[]
  isLoading: boolean
  onRowClick: (item: any, tab: string) => void
  actions?: TableActionButton[]
}

const GridView: React.FC<GridViewProps> = ({ data, isLoading, onRowClick, actions = [] }) => {
  const flatRows = useMemo(() => {
    const out: any[] = []
    const walk = (node: any) => {
      if (!node) return
      if (Array.isArray(node.items)) out.push(...node.items)
      if (Array.isArray(node.value)) out.push(...node.value)
      if (Array.isArray(node.rows)) out.push(...node.rows)
      if (Array.isArray(node.children)) node.children.forEach(walk)
      if (Array.isArray(node.groups)) node.groups.forEach(walk)
    }
      ; (data || []).forEach(walk)
    return out
  }, [data])

  const getStatusConfig = (stage: string) => {
    const s = stage?.toUpperCase() || ''

    if (s === 'APPROVED' || s === 'COMPLETED') {
      return {
        bg: 'bg-[var(--green-2)]',
        text: 'text-[var(--green-11)]',
        border: 'border-[var(--green-4)]',
        icon: 'tabler:circle-check-filled'
      }
    }
    if (s === 'REJECTED') {
      return {
        bg: 'bg-[var(--red-2)]',
        text: 'text-[var(--red-11)]',
        border: 'border-[var(--red-4)]',
        icon: 'tabler:circle-x-filled'
      }
    }
    // Default / Pending / Verifier
    return {
      bg: 'bg-[var(--primary-2)]',
      text: 'text-[var(--primary-11)]',
      border: 'border-[var(--primary-4)]',
      icon: 'tabler:clock-filled'
    }
  }

  // --- Loading State with Grey Placeholders ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--gray-3)] bg-white p-4 shadow-sm"
          >
            {/* Left Side Skeleton */}
            <div className="flex items-center gap-4">
              {/* Icon Placeholder */}
              <div className="size-12 shrink-0 rounded-lg bg-gray-4 animate-pulse" />

              {/* Text Placeholders */}
              <div className="flex flex-col gap-2">
                <div className="h-4 w-48 rounded bg-grey-4 animate-pulse" />
                <div className="h-3 w-32 rounded bg-grey-5 animate-pulse" />
              </div>
            </div>

            {/* Right Side Skeleton */}
            <div className="hidden md:flex items-center gap-8">
              {/* Metric Placeholder */}
              <div className="flex flex-col items-end gap-1">
                <div className="h-3 w-16 rounded bg-[var(--gray-3)] animate-pulse" />
                <div className="h-4 w-8 rounded bg-[var(--gray-4)] animate-pulse" />
              </div>

              {/* Badge Placeholder */}
              <div className="h-8 w-24 rounded-full bg-[var(--gray-4)] animate-pulse" />

              {/* Arrow Placeholder */}
              <div className="size-5 rounded bg-[var(--gray-3)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (flatRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-[var(--gray-2)]">
          <Icon name="tabler:inbox" className="size-8 text-[var(--gray-8)]" />
        </div>
        <p className="mt-4 text-[var(--gray-11)] font-medium">No requests found</p>
      </div>
    )
  }

  const leftActions = actions.filter((a) => (a.align ?? 'right') === 'left')
  const rightActions = actions.filter((a) => (a.align ?? 'right') === 'right')

  return (
    <div className="flex flex-col gap-3">
      {/* Action Bar */}
      {actions.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 px-5 pt-1">
          {!!leftActions.length && (
            <div className="flex flex-wrap items-center gap-2">
              {leftActions.map((a, idx) => (
                <button
                  key={`${a.label}-${idx}`}
                  type="button"
                  onClick={a.onClick}
                  disabled={a.disabled}
                  title={a.title ?? a.label}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border border-[var(--gray-4)] bg-white px-3 py-2 text-12 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)]',
                    a.disabled && 'opacity-60 cursor-not-allowed hover:bg-white',
                    a.className
                  )}
                >
                  {a.icon ? <Icon name={a.icon} className="size-4" /> : null}
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {!!rightActions.length && (
            <div className="flex flex-wrap items-center gap-2">
              {rightActions.map((a, idx) => (
                <button
                  key={`${a.label}-${idx}`}
                  type="button"
                  onClick={a.onClick}
                  disabled={a.disabled}
                  title={a.title ?? a.label}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[var(--secondary-9)] px-3 py-2 text-12 font-semibold text-white hover:bg-[var(--secondary-10)]',
                    a.disabled && 'opacity-60 cursor-not-allowed hover:bg-[var(--secondary-9)]',
                    a.className
                  )}
                >
                  {a.icon ? <Icon name={a.icon} className="size-4" /> : null}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 ">
        {flatRows.map((row: any, index: number) => {
          const requestNo = row?.requestNo || `REQ-${row?.id}`
          const raisedBy = row?.raisedBy || 'Unknown User'
          const raisedAt = row?.raisedAt || row?.transaction_createdAt
          const stage = row?.stage || 'Pending'
          const fieldCount = row?.formData?.fields ? Object.keys(row.formData.fields).length : 0
          const statusConfig = getStatusConfig(stage)

          return (
            <div
              key={row?.id || index}
              onClick={() => onRowClick(row, 'Overview')}
              className="group relative flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--gray-3)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-200 hover:border-[var(--primary-6)] hover:shadow-md active:scale-[0.995]"
            >
              {/* Left Section: Icon & Main Info */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Icon Box */}
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-3)] bg-[var(--primary-2)] text-[var(--primary-9)]">
                  <Icon name="tabler:file-invoice" className="size-6" />
                </div>

                {/* Text Info */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-15 font-semibold text-[var(--gray-13)]">
                      {requestNo}
                    </h3>
                    {row?.isDuplicateInvoice && (
                      // <span className="inline-flex items-center rounded-md border border-[var(--orange-4)] bg-[var(--orange-2)] px-2 py-0.5 text-11 font-medium text-[var(--orange-11)]">
                      //   Duplicate
                      // </span>
                      <RequestStatusBadge status="Duplicated" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-12 text-[var(--gray-10)] truncate">
                    <span className="truncate max-w-[200px]">{raisedBy}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--gray-6)] shrink-0" />
                    <span className="shrink-0">{formatDatetime(raisedAt, 'datetime')}</span>
                  </div>
                </div>
              </div>

              {/* Right Section: Metrics & Status */}
              <div className="hidden md:flex items-center gap-8 shrink-0">

                {/* Fields Count Metric */}
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--gray-9)]">
                    Fields
                  </span>
                  <span className="text-14 font-medium text-[var(--gray-12)]">
                    {fieldCount}
                  </span>
                </div>

                {/* Status Badge */}
                <div className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-12 font-semibold transition-colors",
                  statusConfig.bg,
                  statusConfig.text,
                  statusConfig.border
                )}>
                  <Icon name={statusConfig.icon} className="size-3.5" />
                  {stage}
                </div>

                {/* Chevron Arrow */}
                <Icon
                  name="tabler:chevron-right"
                  className="size-5 text-[var(--gray-8)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary-9)]"
                />
              </div>

              {/* Mobile Arrow (Only visible on small screens) */}
              <div className="md:hidden text-[var(--gray-8)]">
                <Icon name="tabler:chevron-right" className="size-5" />
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}

GridView.displayName = 'GridView'
export default GridView