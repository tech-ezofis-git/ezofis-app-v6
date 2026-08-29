import { useMemo, useState } from 'react'
import cn from '@/utils/cn'
import { formatUtcToLocalDateTime } from '@/utils/utcDate'
import { AppBar, IconButton } from '../../components/layout/AppBar'
import { ScreenScroll, ScreenShell } from '../../components/layout/ScreenShell'
import { AppButton } from '../../components/primitives/AppButton'
import { Icon } from '../../components/primitives/Icon'
import { useToast } from '../../providers/useToast'
import {
  AttachmentRow,
  CommentRow,
  EmptyState,
  ExtractedDataRow,
  HistoryRow,
  InsightCard,
  LineItemCard,
  ValueCompareCard,
} from './InvoiceDetailPieces'
import { useMobileRequestDetail } from './useMobileRequestDetail'

type DetailTab =
  | 'extracted'
  | 'line_items'
  | 'attachments'
  | 'comments'
  | 'history'

type InvoiceDetailScreenProps = {
  onBack?: () => void
}

function formatWhen(value?: string | number | Date | null) {
  if (!value) return ''
  try {
    const formatted = formatUtcToLocalDateTime(value, '')
    if (formatted) return formatted
    return String(value).slice(0, 16)
  } catch {
    return String(value).slice(0, 16)
  }
}

export function InvoiceDetailScreen({ onBack }: InvoiceDetailScreenProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<DetailTab>('extracted')
  const detail = useMobileRequestDetail()

  const tabs = useMemo(
    () =>
      [
        { id: 'extracted' as const, label: 'Extracted data' },
        {
          id: 'line_items' as const,
          label: `Line items${detail.lineItems.length ? ` · ${detail.lineItems.length}` : ''}`,
        },
        {
          id: 'attachments' as const,
          label: `Attachments${detail.attachments.length ? ` · ${detail.attachments.length}` : ''}`,
        },
        {
          id: 'comments' as const,
          label: `Comments${detail.comments.length ? ` · ${detail.comments.length}` : ''}`,
        },
        { id: 'history' as const, label: 'History' },
      ] as const,
    [
      detail.attachments.length,
      detail.comments.length,
      detail.lineItems.length,
    ],
  )

  const handleVerify = () => {
    void detail.refetch()
    toast({
      message: 'AI insights refreshed',
      variant: 'success',
    })
  }

  const handleSupplierVerify = () => {
    toast({
      message: 'Supplier verification started',
      variant: 'default',
    })
  }

  return (
    <ScreenShell
      className='bg-surface-secondary'
      footer={
        <div className='border-t border-[var(--gray-3)] bg-surface-primary px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]'>
          <AppButton
            className='min-h-10 text-12'
            fullWidth
            trailingIcon={<Icon className='size-3.5' name='ArrowRight' />}
            onClick={handleVerify}
          >
            Verify invoice
          </AppButton>
        </div>
      }
      header={
        <AppBar
          className='[&_h1]:text-[13px] [&_h1]:text-[var(--gray-13)] [&>div>div]:text-[10px]'
          onBack={onBack}
          subtitle={detail.poSubtitle}
          title={detail.invoiceNumber}
          trailing={
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold',
                  detail.matched
                    ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
                    : detail.statusTone === 'error'
                      ? 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]'
                      : detail.statusTone === 'warning'
                        ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                        : 'border-[var(--primary-3)] bg-[var(--primary-1)] text-[var(--primary-11)]',
                )}
              >
                {detail.matched ? (
                  <Icon className='size-2.5' name='Check' />
                ) : null}
                {detail.statusLabel}
              </span>
              <IconButton
                aria-label='Share'
                onClick={() => void detail.refetch()}
              >
                <Icon
                  className={cn('size-3.5', detail.isFetching && 'animate-spin')}
                  name='Share2'
                />
              </IconButton>
            </>
          }
        />
      }
    >
      {detail.isLoading ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-2 py-20'>
          <Icon
            className='size-6 animate-spin text-accent-primary'
            name='LoaderCircle'
          />
          <p className='text-12 text-text-muted'>Loading invoice details…</p>
        </div>
      ) : (
        <ScreenScroll className='px-3 py-2.5'>
          <div className='flex flex-col gap-2.5'>
            <ValueCompareCard
              confidence={detail.confidence}
              invoiceValue={detail.invoiceAmount}
              poValue={detail.poAmount}
            />

            <div className='grid grid-cols-2 gap-2'>
              <InsightCard
                icon={<Icon className='size-3' name='Paperclip' />}
                label='PO Matching'
                status={detail.poMatchingStatus}
                statusType={detail.poMatchingTone}
                value={
                  detail.poNumber !== '—'
                    ? detail.poNumber.startsWith('PO')
                      ? detail.poNumber
                      : `PO-${detail.poNumber}`
                    : '—'
                }
              />
              <InsightCard
                icon={<Icon className='size-3' name='Layers' />}
                label='Duplicate Detection'
                status={detail.duplicateStatus}
                statusType={detail.duplicateTone}
                value={detail.duplicateMessage}
              />
              <InsightCard
                action={
                  detail.supplierNeedsAction ? (
                    <AppButton
                      className='min-h-7 text-[10px]'
                      fullWidth
                      onClick={handleSupplierVerify}
                    >
                      Verify now
                    </AppButton>
                  ) : null
                }
                icon={<Icon className='size-3' name='Store' />}
                label='Supplier Verification'
                status={detail.supplierStatus}
                statusType={detail.supplierTone}
                value={detail.supplierValue}
              />
              <InsightCard
                icon={<Icon className='size-3' name='CalendarDays' />}
                label='Payment Terms'
                status={detail.paymentBadge}
                statusType={detail.paymentBadgeTone}
                value={detail.paymentDaysText}
              />
            </div>

            <div className='no-scrollbar -mx-3 flex gap-3 overflow-x-auto border-b border-[var(--gray-3)] px-3'>
              {tabs.map((tab) => {
                const active = tab.id === activeTab
                return (
                  <button
                    className={cn(
                      'shrink-0 border-b-2 py-2 text-[11px] font-semibold transition-colors',
                      active
                        ? 'border-[var(--primary-9)] text-[var(--primary-11)]'
                        : 'border-transparent text-[var(--gray-11)]',
                    )}
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {activeTab === 'extracted' ? (
              <div className='rounded-xl border border-[var(--gray-3)] bg-surface-primary px-2.5'>
                {detail.extractedRows.map((row) => (
                  <ExtractedDataRow
                    confidence={row.confidence}
                    highlightValue={row.highlightValue}
                    key={row.label}
                    label={row.label}
                    value={row.value}
                  />
                ))}
              </div>
            ) : null}

            {activeTab === 'line_items' ? (
              detail.lineItems.length === 0 ? (
                <EmptyState
                  icon={
                    <Icon className='size-4 text-[var(--gray-9)]' name='List' />
                  }
                  message='No line items found'
                />
              ) : (
                <div className='flex flex-col gap-2'>
                  {detail.lineItems.map((item, idx) => (
                    <LineItemCard
                      amount={item.amount}
                      description={item.description}
                      index={idx}
                      key={`${item.description}-${idx}`}
                      quantity={item.quantity}
                      score={item.score}
                      unitPrice={item.unitPrice}
                    />
                  ))}
                </div>
              )
            ) : null}

            {activeTab === 'attachments' ? (
              detail.attachmentsLoading ? (
                <p className='py-6 text-center text-[11px] text-[var(--gray-11)]'>
                  Loading attachments…
                </p>
              ) : detail.attachments.length === 0 ? (
                <EmptyState
                  icon={
                    <Icon
                      className='size-4 text-[var(--gray-9)]'
                      name='Paperclip'
                    />
                  }
                  message='No attachments'
                />
              ) : (
                <div className='rounded-xl border border-[var(--gray-3)] bg-surface-primary px-2.5'>
                  {detail.attachments.map((file) => (
                    <AttachmentRow
                      key={String(file.id || file.fileId || file.name)}
                      meta={[
                        file.uploadedBy,
                        file.contentType,
                        formatWhen(file.createdAt || file.createdAtUtc),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      name={file.name || 'Attachment'}
                      onOpen={() =>
                        toast({
                          message: file.name || 'Attachment',
                          title: 'Attachment',
                          variant: 'default',
                        })
                      }
                    />
                  ))}
                </div>
              )
            ) : null}

            {activeTab === 'comments' ? (
              <div className='flex flex-col gap-2'>
                <div className='rounded-xl border border-[var(--gray-3)] bg-surface-primary p-2.5'>
                  <textarea
                    className='min-h-16 w-full resize-none rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] px-2.5 py-2 text-[12px] text-[var(--gray-13)] outline-none placeholder:text-[var(--gray-9)] focus:border-[var(--primary-7)] focus:bg-surface-primary focus:ring-2 focus:ring-[var(--primary-3)]'
                    placeholder='Add a comment…'
                    value={detail.commentText}
                    onChange={(e) => detail.setCommentText(e.target.value)}
                  />
                  <AppButton
                    className='mt-2 min-h-9 text-[11px]'
                    disabled={!detail.commentText.trim()}
                    fullWidth
                    loading={detail.commentSubmitting}
                    onClick={() => void detail.submitComment()}
                  >
                    Post comment
                  </AppButton>
                </div>

                {detail.commentsLoading ? (
                  <p className='py-5 text-center text-[11px] text-[var(--gray-11)]'>
                    Loading comments…
                  </p>
                ) : detail.comments.length === 0 ? (
                  <EmptyState
                    icon={
                      <Icon
                        className='size-4 text-[var(--gray-9)]'
                        name='MessageSquare'
                      />
                    }
                    message='No comments yet'
                  />
                ) : (
                  detail.comments.map((c) => (
                    <CommentRow
                      author={
                        c.createdByName ||
                        c.createdByEmail ||
                        c.createdBy ||
                        'User'
                      }
                      body={c.comments || '—'}
                      key={String(c.id || c.createdAt)}
                      time={formatWhen(c.createdAt)}
                    />
                  ))
                )}
              </div>
            ) : null}

            {activeTab === 'history' ? (
              detail.historyLoading ? (
                <p className='py-6 text-center text-[11px] text-[var(--gray-11)]'>
                  Loading history…
                </p>
              ) : detail.history.length === 0 ? (
                <EmptyState
                  icon={
                    <Icon
                      className='size-4 text-[var(--gray-9)]'
                      name='RotateCcwClock'
                    />
                  }
                  message='No history yet'
                />
              ) : (
                <div className='rounded-xl border border-[var(--gray-3)] bg-surface-primary px-2.5 py-2.5'>
                  {detail.history.map((h: any, idx: number) => (
                    <HistoryRow
                      isLast={idx === detail.history.length - 1}
                      key={h.activityId || idx}
                      meta={[
                        h.performedByUserName || h.actionUser || h.status,
                        formatWhen(h.actionAt || h.processedOn),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      title={
                        h.title ||
                        h.stage ||
                        h.stageName ||
                        h.action ||
                        h.status ||
                        'Step'
                      }
                    />
                  ))}
                </div>
              )
            ) : null}
          </div>
        </ScreenScroll>
      )}
    </ScreenShell>
  )
}
