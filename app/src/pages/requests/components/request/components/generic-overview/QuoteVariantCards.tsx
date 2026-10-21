import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import cn from '@/utils/cn'
import AgentFlatTable, {
  type AgentFlatTableColumn,
  normalizeAgentTableRows,
} from './AgentFlatTable'
import { toMoney } from './QuoteLineItemsTable'
import {
  formatQuoteDelta,
  QUOTE_VARIANT_META,
  type QuoteVariant,
  type QuoteVariantEmptyMeta,
  type QuoteVariantId,
} from './quoteVariants'

export type QuoteTabId = QuoteVariantId | 'compare'

const VARIANT_STYLES: Record<
  QuoteVariantId,
  {
    active: string
    badge: string
    idle: string
    emptyNote: string
  }
> = {
  alt: {
    active:
      'border-2 border-[var(--teal-8)] bg-[var(--teal-2)] shadow-[0_0_0_1px_var(--teal-6)]',
    badge: 'text-[var(--teal-11)]',
    emptyNote: 'text-[var(--teal-11)]',
    idle: 'border border-t-[3px] border-t-[var(--teal-8)] border-x-gray-3 border-b-gray-3 bg-surface hover:bg-[var(--teal-1)]',
  },
  main: {
    active:
      'border-2 border-[var(--primary-8)] bg-[var(--primary-2)] shadow-[0_0_0_1px_var(--primary-6)]',
    badge: 'text-[var(--primary-11)]',
    emptyNote: 'text-[var(--primary-11)]',
    idle: 'border border-t-[3px] border-t-[var(--primary-8)] border-x-gray-3 border-b-gray-3 bg-surface hover:bg-[var(--primary-1)]',
  },
  opt: {
    active:
      'border-2 border-[var(--orange-8)] bg-[var(--orange-2)] shadow-[0_0_0_1px_var(--orange-6)]',
    badge: 'text-[var(--orange-11)]',
    emptyNote: 'text-[var(--orange-11)]',
    idle: 'border border-t-[3px] border-t-[var(--orange-8)] border-x-gray-3 border-b-gray-3 bg-surface hover:bg-[var(--orange-1)]',
  },
}

const EMPTY_NOTES: Record<QuoteVariantId, string> = {
  alt: 'NO VALID RECOMMENDED VARIANT',
  main: 'NO LINE ITEMS',
  opt: 'NO VALID THIRD OPTION',
}

const DEFAULT_EMPTY_REASONS: Record<'alt' | 'opt', string> = {
  alt: 'No approved RFQ recommendation rule applies to this scope (QUOTE-002): the base quote already contains the RFQ solution, or the trigger conditions are not met. An upgrade is never invented to raise the quote value.',
  opt: 'No consultant / customer alternate and no approved broader RFQ configuration applies (QUOTE-003). A third quote is never filled for the sake of having three.',
}

const emptyTitleFor = (id: QuoteVariantId) =>
  id === 'opt'
    ? 'Quote 3 — RFQ complete / alternate'
    : id === 'alt'
      ? 'Quote 2 — Recommended'
      : QUOTE_VARIANT_META[id].shortLabel

type Props = {
  activeId: QuoteTabId
  /** When set, show a highlighted "Copied from …" badge under the tabs. */
  copiedFromLabel?: string | null
  emptyMetaByVariant?: Partial<Record<'alt' | 'opt', QuoteVariantEmptyMeta>>
  variants: QuoteVariant[]
  onSelect: (id: QuoteTabId) => void
}

export default function QuoteVariantCards({
  activeId,
  copiedFromLabel,
  emptyMetaByVariant,
  variants,
  onSelect,
}: Props) {
  const { t } = useLingui()
  if (variants.length <= 1) return null

  const mainTotal = variants.find((v) => v.id === 'main')?.total ?? 0
  const activeVariant =
    activeId === 'compare'
      ? null
      : variants.find((v) => v.id === activeId) || variants[0]
  const isCompareActive = activeId === 'compare'

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <h4 className='text-sm font-semibold text-gray-12'>
          {t`Quotes`} ({variants.length})
        </h4>
      </div>

      <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4'>
        {variants.map((variant) => {
          const styles = VARIANT_STYLES[variant.id]
          const isActive = activeId === variant.id
          const isEmpty = variant.itemCount <= 0
          const delta =
            variant.id === 'main' || isEmpty
              ? ''
              : formatQuoteDelta(variant.total, mainTotal)
          const countLabel =
            variant.itemCount === 1
              ? t`${variant.itemCount} item`
              : t`${variant.itemCount} items`
          const discount = Number(variant.discount || 0)
          const discountLabel =
            !isEmpty && discount > 0
              ? ` · -$${toMoney(discount)} disc.`
              : ''

          return (
            <button
              aria-pressed={isActive}
              className={cn(
                'flex min-h-[4.25rem] flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-all active:scale-[0.99]',
                isActive ? styles.active : styles.idle,
              )}
              key={variant.id}
              type='button'
              onClick={() => onSelect(variant.id)}
            >
              <span
                className={cn(
                  'text-[9px] font-bold tracking-[0.06em] uppercase',
                  styles.badge,
                )}
              >
                {variant.shortLabel}
              </span>
              {isEmpty ? (
                <>
                  <span className='text-sm font-semibold text-gray-9'>
                    {t`No data`}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-bold tracking-[0.05em] uppercase',
                      styles.emptyNote,
                    )}
                  >
                    {(variant.id === 'alt' || variant.id === 'opt'
                      ? emptyMetaByVariant?.[variant.id]?.status
                      : '') || EMPTY_NOTES[variant.id]}
                  </span>
                </>
              ) : (
                <>
                  <span className='text-sm font-semibold tabular-nums text-gray-12'>
                    ${toMoney(variant.total)}
                  </span>
                  <span className='text-[10px] leading-4 text-gray-10'>
                    {countLabel}
                    {discountLabel}
                    {delta ? (
                      <span className='text-[var(--tomato-11)]'>{` · ${delta}`}</span>
                    ) : null}
                  </span>
                </>
              )}
            </button>
          )
        })}

        <button
          aria-pressed={isCompareActive}
          className={cn(
            'flex min-h-[4.25rem] flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-all active:scale-[0.99]',
            isCompareActive
              ? 'border-2 border-[var(--indigo-8)] bg-[var(--indigo-2)] shadow-[0_0_0_1px_var(--indigo-6)]'
              : 'border border-t-[3px] border-t-[var(--indigo-8)] border-x-gray-3 border-b-gray-3 bg-surface hover:bg-[var(--indigo-1)]',
          )}
          type='button'
          onClick={() => onSelect('compare')}
        >
          <span className='text-[9px] font-bold tracking-[0.06em] text-[var(--indigo-11)] uppercase'>
            {t`Compare`}
          </span>
          <span className='text-sm font-semibold text-gray-12'>
            {t`Quote 1 → 2 / 3`}
          </span>
          <span className='text-[10px] leading-4 text-gray-10'>
            {t`What changed vs Quote 1`}
          </span>
        </button>
      </div>

      {activeVariant && !isCompareActive ? (
        <div className='flex flex-wrap items-center gap-2'>
          <p className='text-[12px] leading-5 text-gray-10'>
            {activeVariant.description ||
              QUOTE_VARIANT_META[activeVariant.id].description}
          </p>
          {copiedFromLabel ? (
            <span className='inline-flex items-center gap-1 rounded-full border border-[var(--primary-7)] bg-[var(--primary-3)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary-11)] shadow-[0_0_0_1px_var(--primary-5)]'>
              <Icon className='size-3' icon='lucide:copy' />
              {t`Copied from`} {copiedFromLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const isCompareRowArray = (
  value: unknown,
): value is Record<string, any>[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => item && typeof item === 'object' && !Array.isArray(item))

const columnsFromCompareRows = (
  rows: Record<string, any>[],
): AgentFlatTableColumn[] => {
  const keys: string[] = []
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (key.startsWith('_') || keys.includes(key)) return
      keys.push(key)
    })
  })
  return keys.map((key) => ({ id: key, name: key, type: 'SHORT_TEXT' }))
}

const isFromToValue = (
  value: unknown,
): value is { From?: unknown; To?: unknown; from?: unknown; to?: unknown } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    ('From' in record || 'from' in record) && ('To' in record || 'to' in record)
  )
}

const formatCompareScalar = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return toMoney(value)
  if (value == null || value === '') return '—'
  return String(value)
}

function CompareValueView({
  label,
  value,
}: {
  label?: string
  value: unknown
}) {
  if (value == null || value === '') return null

  if (isCompareRowArray(value)) {
    const columns = columnsFromCompareRows(value)
    return (
      <AgentFlatTable
        allowAddRow={false}
        allowDelete={false}
        columns={columns}
        icon='tabler:table'
        readOnly
        rows={normalizeAgentTableRows(value, columns)}
        title={label || ''}
        onChange={() => {}}
      />
    )
  }

  if (isFromToValue(value)) {
    const from = value.From ?? value.from
    const to = value.To ?? value.to
    return (
      <p className='text-sm leading-6 text-gray-12'>
        {label ? <span className='font-semibold'>{label}: </span> : null}
        {formatCompareScalar(from)} → {formatCompareScalar(to)}
      </p>
    )
  }

  if (Array.isArray(value)) {
    const lines = value.map((item) => String(item ?? '')).filter(Boolean)
    if (!lines.length) return null
    return (
      <div className='flex flex-col gap-1'>
        {label ? (
          <p className='text-sm font-semibold text-gray-12'>{label}</p>
        ) : null}
        {lines.map((line, index) => (
          <p className='text-sm leading-6 text-gray-12' key={`${line}-${index}`}>
            {line}
          </p>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key, child]) => !key.startsWith('_') && child != null && child !== '',
    )
    if (!entries.length) return null
    return (
      <div className='flex flex-col gap-3'>
        {entries.map(([key, child]) => (
          <CompareValueView
            key={key}
            label={label ? `${label} ${key}` : key}
            value={child}
          />
        ))}
      </div>
    )
  }

  return (
    <p className='text-sm leading-6 text-gray-12'>
      {label ? <span className='font-semibold'>{label}: </span> : null}
      {String(value)}
    </p>
  )
}

/** Empty-state panel when a quote tab has no line items (matches FTL quote UI). */
export function QuoteComparePanel({
  compareByVariant,
  compareColumns = [],
  emptyMetaByVariant,
  variants,
  onOpenVariant,
}: {
  /** Compare-table rows for Quote 2 / Quote 3. Null means show the empty state. */
  compareByVariant?: Partial<Record<'alt' | 'opt', unknown | null>>
  /** Columns from the Compare DYNAMIC_TABLE (schema + user-added). */
  compareColumns?: AgentFlatTableColumn[]
  emptyMetaByVariant?: Partial<Record<'alt' | 'opt', QuoteVariantEmptyMeta>>
  variants: QuoteVariant[]
  onOpenVariant?: (id: QuoteVariantId) => void
}) {
  const { t } = useLingui()
  const alt = variants.find((v) => v.id === 'alt')
  const opt = variants.find((v) => v.id === 'opt')
  const compareTargets = [alt, opt].filter(Boolean) as QuoteVariant[]

  const [targetId, setTargetId] = useState<QuoteVariantId>(
    compareTargets[0]?.id || 'alt',
  )

  const target =
    variants.find((v) => v.id === targetId) || compareTargets[0] || null

  const comparePayload =
    targetId === 'alt' || targetId === 'opt'
      ? (compareByVariant?.[targetId] ?? null)
      : null
  const hasComparePayload = comparePayload != null

  const emptyMeta =
    targetId === 'alt' || targetId === 'opt'
      ? emptyMetaByVariant?.[targetId]
      : undefined
  const emptyStatus =
    emptyMeta?.status?.trim() || (target ? EMPTY_NOTES[target.id] : t`NO DATA`)
  const emptyReason =
    emptyMeta?.reason?.trim() ||
    (targetId === 'alt' || targetId === 'opt'
      ? DEFAULT_EMPTY_REASONS[targetId]
      : t`This quote has no line items to compare against Quote 1.`)

  const isCompareTable =
    Array.isArray(comparePayload) &&
    comparePayload.length > 0 &&
    comparePayload.every(
      (item) => item && typeof item === 'object' && !Array.isArray(item),
    )

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap gap-2'>
        {compareTargets.map((variant) => {
          const selected = targetId === variant.id
          const label =
            variant.id === 'alt' ? t`Quote 1 → Quote 2` : t`Quote 1 → Quote 3`
          return (
            <button
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                selected
                  ? 'border-[var(--indigo-8)] bg-[var(--indigo-9)] text-white'
                  : 'border-gray-4 bg-surface text-gray-12 hover:bg-gray-2',
              )}
              key={variant.id}
              type='button'
              onClick={() => setTargetId(variant.id)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className='rounded-xl border border-gray-3 bg-surface px-5 py-5'>
        {!hasComparePayload ? (
          <>
            <h4 className='text-base font-semibold text-gray-12'>
              {target ? emptyTitleFor(target.id) : t`Compare`}
            </h4>
            <p className='mt-2 text-xs font-bold tracking-[0.06em] text-[var(--orange-11)] uppercase'>
              {emptyStatus}
            </p>
            <p className='mt-3 text-sm leading-6 text-gray-10'>{emptyReason}</p>
            {target && onOpenVariant ? (
              <div className='mt-5'>
                <button
                  className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary-6)] bg-[var(--primary-2)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-11)] hover:bg-[var(--primary-3)]'
                  type='button'
                  onClick={() => onOpenVariant(target.id)}
                >
                  {t`Open`} {target.shortLabel}
                </button>
              </div>
            ) : null}
          </>
        ) : isCompareTable ? (
          <AgentFlatTable
            allowAddRow={false}
            allowDelete={false}
            columns={compareColumns}
            icon='tabler:table'
            readOnly
            rows={normalizeAgentTableRows(
              comparePayload as Record<string, any>[],
              compareColumns,
            )}
            title={
              targetId === 'alt' ? t`Quote 1 → Quote 2` : t`Quote 1 → Quote 3`
            }
            onChange={() => {}}
          />
        ) : (
          <>
            <h4 className='text-base font-semibold text-gray-12'>
              {targetId === 'alt' ? t`Quote 1 → Quote 2` : t`Quote 1 → Quote 3`}
            </h4>
            <div className='mt-3 flex flex-col gap-3'>
              {typeof comparePayload === 'string' ? (
                <p className='text-sm leading-6 whitespace-pre-wrap text-gray-12'>
                  {comparePayload}
                </p>
              ) : (
                <CompareValueView value={comparePayload} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function QuoteVariantEmptyPanel({
  canCopy = false,
  emptyMeta,
  sources = [],
  variant,
  onCopyFrom,
}: {
  canCopy?: boolean
  emptyMeta?: QuoteVariantEmptyMeta | null
  sources?: QuoteVariant[]
  variant: QuoteVariant
  onCopyFrom?: (sourceId: QuoteVariantId) => void
}) {
  const { t } = useLingui()
  const title = emptyTitleFor(variant.id)
  const note =
    emptyMeta?.status?.trim() || EMPTY_NOTES[variant.id]
  const detail =
    emptyMeta?.reason?.trim() ||
    (variant.id === 'alt' || variant.id === 'opt'
      ? DEFAULT_EMPTY_REASONS[variant.id]
      : t`No line items available for this quote.`)

  const copySources = sources.filter(
    (source) => source.id !== variant.id && source.itemCount > 0,
  )

  return (
    <div className='rounded-xl border border-gray-3 bg-surface px-5 py-6'>
      <h4 className='text-base font-semibold text-gray-12'>{title}</h4>
      <p className='mt-2 text-xs font-bold tracking-[0.06em] text-[var(--orange-11)] uppercase'>
        {note}
      </p>
      <p className='mt-3 text-sm leading-6 text-gray-10'>{detail}</p>

      {canCopy && copySources.length > 0 && onCopyFrom ? (
        <div className='mt-5 border-t border-dashed border-gray-4 pt-4'>
          <p className='mb-2.5 text-sm font-medium text-gray-12'>
            {t`Start from an existing quote:`}
          </p>
          <div className='flex flex-wrap gap-2'>
            {copySources.map((source) => (
              <button
                className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary-6)] bg-[var(--primary-2)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-11)] transition-colors hover:bg-[var(--primary-3)]'
                key={source.id}
                type='button'
                onClick={() => onCopyFrom(source.id)}
              >
                <Icon className='size-3.5' icon='lucide:copy' />
                {t`Copy from`} {source.shortLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
