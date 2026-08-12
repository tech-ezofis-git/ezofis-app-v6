import type { ReactNode } from 'react'
import cn from '@/utils/cn'
import { Icon } from '../../components/primitives/Icon'

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'default'

export const getStatusStyles = (statusType: StatusType) => {
  switch (statusType) {
    case 'success':
      return 'bg-[var(--green-1)] text-[var(--green-9)]'
    case 'warning':
      return 'bg-[var(--orange-1)] text-[var(--orange-9)]'
    case 'danger':
      return 'bg-[var(--red-1)] text-[var(--red-9)]'
    case 'info':
      return 'bg-[var(--blue-1)] text-[var(--blue-9)]'
    default:
      return 'bg-[var(--gray-1)] text-[var(--gray-11)]'
  }
}

export const getStatusBorderStyles = (statusType: StatusType) => {
  switch (statusType) {
    case 'success':
      return 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
    case 'warning':
      return 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
    case 'danger':
      return 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]'
    case 'info':
      return 'border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)]'
    default:
      return 'border-[var(--gray-3)] bg-[var(--gray-1)] text-[var(--gray-11)]'
  }
}

type InsightCardProps = {
  icon: ReactNode
  label: string
  value: string
  status: string
  statusType?: StatusType
  action?: ReactNode
}

export function InsightCard({
  icon,
  label,
  value,
  status,
  statusType = 'default',
  action,
}: InsightCardProps) {
  return (
    <div className='flex min-w-0 flex-col gap-1 rounded-xl border border-[var(--gray-3)] bg-surface-primary p-2'>
      <div className='flex items-center justify-between gap-1.5'>
        <span
          className={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
            getStatusStyles(statusType),
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold leading-none',
            getStatusBorderStyles(statusType),
          )}
        >
          {status}
        </span>
      </div>
      <div className='mt-0.5 flex min-w-0 flex-col gap-0.5'>
        <span className='text-[10px] font-semibold leading-none tracking-tight text-[var(--gray-11)]'>
          {label}
        </span>
        <span
          className='truncate text-[12px] font-semibold leading-tight text-[var(--gray-13)]'
          title={value}
        >
          {value || '---'}
        </span>
      </div>
      {action ? <div className='mt-1.5'>{action}</div> : null}
    </div>
  )
}

type ExtractedDataRowProps = {
  label: string
  value: string
  confidence?: string
  highlightValue?: boolean
}

export function ExtractedDataRow({
  label,
  value,
  confidence,
  highlightValue,
}: ExtractedDataRowProps) {
  return (
    <div className='flex items-center justify-between gap-2 border-b border-[var(--gray-3)] py-2 last:border-b-0'>
      <span className='shrink-0 text-[11px] text-[var(--gray-11)]'>{label}</span>
      <div className='flex min-w-0 items-center justify-end gap-1.5'>
        <span
          className={cn(
            'truncate text-[12px] font-semibold',
            highlightValue
              ? 'text-[var(--primary-11)]'
              : 'text-[var(--gray-13)]',
          )}
        >
          {value}
        </span>
        {confidence ? (
          <span className='shrink-0 rounded-md border border-[var(--green-3)] bg-[var(--green-1)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--green-9)]'>
            {confidence}
          </span>
        ) : null}
      </div>
    </div>
  )
}

type ValueCompareCardProps = {
  invoiceValue: string
  poValue: string
  confidence: string
}

export function ValueCompareCard({
  invoiceValue,
  poValue,
  confidence,
}: ValueCompareCardProps) {
  return (
    <div className='rounded-xl border border-[var(--gray-3)] bg-surface-primary p-2.5'>
      <div className='relative grid grid-cols-2 gap-2'>
        <div className='min-w-0 pr-3'>
          <p className='text-[10px] text-[var(--gray-11)]'>Invoice value</p>
          <p className='mt-0.5 truncate text-[13px] font-bold text-[var(--green-9)]'>
            {invoiceValue}
          </p>
        </div>
        <div className='min-w-0 pl-3 text-right'>
          <p className='text-[10px] text-[var(--gray-11)]'>PO value</p>
          <p className='mt-0.5 truncate text-[13px] font-bold text-[var(--primary-9)]'>
            {poValue}
          </p>
        </div>
        <span className='absolute top-1/2 left-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gray-3)] bg-surface-primary text-[var(--gray-11)]'>
          <Icon className='size-2.5' name='ArrowLeftRight' />
        </span>
      </div>
      <div className='mt-2 flex items-center justify-between border-t border-[var(--gray-3)] pt-2'>
        <span className='text-[10px] text-[var(--gray-11)]'>
          AI match confidence
        </span>
        <span className='text-[12px] font-bold text-[var(--green-9)]'>
          {confidence}
        </span>
      </div>
    </div>
  )
}

type EmptyStateProps = {
  icon?: ReactNode
  message: string
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--gray-4)] bg-surface-primary px-3 py-8 text-center'>
      {icon}
      <p className='text-[11px] text-[var(--gray-11)]'>{message}</p>
    </div>
  )
}

type LineItemCardProps = {
  index: number
  description: string
  quantity: string
  unitPrice: string
  amount: string
  score?: string
}

export function LineItemCard({
  index,
  description,
  quantity,
  unitPrice,
  amount,
  score,
}: LineItemCardProps) {
  return (
    <div className='rounded-xl border border-[var(--gray-3)] bg-surface-primary p-2.5'>
      <div className='mb-1.5 flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <p className='text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-10)]'>
            Line {index + 1}
          </p>
          <p className='mt-0.5 text-[12px] font-semibold text-[var(--gray-13)]'>
            {description}
          </p>
        </div>
        {score ? (
          <span className='shrink-0 rounded-md border border-[var(--green-3)] bg-[var(--green-1)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--green-9)]'>
            {score}
          </span>
        ) : null}
      </div>
      <div className='grid grid-cols-3 gap-1.5 rounded-lg bg-[var(--gray-1)] px-2 py-1.5'>
        <div>
          <p className='text-[9px] text-[var(--gray-11)]'>Qty</p>
          <p className='mt-0.5 text-[11px] font-semibold text-[var(--gray-13)]'>
            {quantity}
          </p>
        </div>
        <div>
          <p className='text-[9px] text-[var(--gray-11)]'>Unit price</p>
          <p className='mt-0.5 text-[11px] font-semibold text-[var(--gray-13)]'>
            {unitPrice}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-[9px] text-[var(--gray-11)]'>Amount</p>
          <p className='mt-0.5 text-[11px] font-semibold text-[var(--primary-11)]'>
            {amount}
          </p>
        </div>
      </div>
    </div>
  )
}

type AttachmentRowProps = {
  name: string
  meta: string
  onOpen?: () => void
}

export function AttachmentRow({ name, meta, onOpen }: AttachmentRowProps) {
  return (
    <button
      className='flex w-full items-center gap-2.5 border-b border-[var(--gray-3)] px-0.5 py-2.5 text-left last:border-b-0 active:opacity-80'
      type='button'
      onClick={onOpen}
    >
      <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-2)] text-[var(--primary-11)]'>
        <Icon className='size-3.5' name='FileText' />
      </span>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-[12px] font-semibold text-[var(--gray-13)]'>
          {name}
        </p>
        <p className='mt-0.5 truncate text-[10px] text-[var(--gray-11)]'>
          {meta}
        </p>
      </div>
      <Icon className='size-3.5 text-[var(--gray-9)]' name='ChevronRight' />
    </button>
  )
}

type CommentRowProps = {
  author: string
  body: string
  time: string
}

export function CommentRow({ author, body, time }: CommentRowProps) {
  return (
    <div className='rounded-xl border border-[var(--gray-3)] bg-surface-primary p-2.5'>
      <div className='mb-1 flex items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-1.5'>
          <span className='inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary-2)] text-[10px] font-semibold text-[var(--primary-11)]'>
            {author.slice(0, 1).toUpperCase()}
          </span>
          <span className='truncate text-[11px] font-semibold text-[var(--gray-13)]'>
            {author}
          </span>
        </div>
        <span className='shrink-0 text-[9px] text-[var(--gray-10)]'>{time}</span>
      </div>
      <p className='text-[11px] leading-relaxed text-[var(--gray-12)]'>{body}</p>
    </div>
  )
}

type HistoryRowProps = {
  title: string
  meta: string
  isLast?: boolean
}

export function HistoryRow({ title, meta, isLast }: HistoryRowProps) {
  return (
    <div className='relative flex gap-2.5 pb-3 last:pb-0'>
      <div className='flex flex-col items-center'>
        <span className='mt-1 size-2 shrink-0 rounded-full bg-[var(--primary-9)]' />
        {!isLast ? (
          <span className='mt-1 w-px flex-1 bg-[var(--gray-4)]' />
        ) : null}
      </div>
      <div className='min-w-0 pb-0.5'>
        <p className='text-[12px] font-semibold text-[var(--gray-13)]'>
          {title}
        </p>
        <p className='mt-0.5 text-[10px] text-[var(--gray-11)]'>{meta}</p>
      </div>
    </div>
  )
}
