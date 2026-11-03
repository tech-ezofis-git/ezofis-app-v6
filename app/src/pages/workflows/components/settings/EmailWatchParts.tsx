import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

/** Small uppercase caption above a control group. */
export function Caption({ children }: { children: ReactNode }) {
  return (
    <div className='text-[10.5px] font-medium tracking-[0.14em] text-gray-10 uppercase'>
      {children}
    </div>
  )
}

/** Compact "Copy" button that shows a check and "Copied" for about 1.6 seconds. */
export function CopyButton({
  label,
  value,
  onCopyError,
}: {
  label?: string
  value: string
  onCopyError: (error: unknown) => void
}) {
  const { t } = useLingui()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      onCopyError(error)
    }
  }

  return (
    <button
      disabled={!value}
      type='button'
      className={cn(
        'flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-12 font-medium transition-colors duration-200 disabled:opacity-50',
        copied
          ? 'text-green-11'
          : 'text-gray-11 hover:bg-gray-3 hover:text-gray-12 active:bg-gray-4',
      )}
      onClick={() => void copy()}
    >
      <Icon
        className='size-3.5'
        name={copied ? 'lucide:check' : 'lucide:copy'}
      />
      {copied ? t`Copied` : (label ?? t`Copy`)}
    </button>
  )
}

/**
 * Read-only value and its Copy button in one container. Copy turns into a check and "Copied"
 * for about 1.6 seconds.
 */
export function CopyField({
  ariaLabel,
  icon = 'lucide:link',
  value,
  onCopyError,
}: {
  ariaLabel: string
  icon?: string
  value: string
  onCopyError: (error: unknown) => void
}) {
  return (
    <div className='flex h-10 items-center gap-2 rounded-xl border border-gray-3 bg-gray-2 pr-1 pl-3 transition-[background-color,box-shadow] duration-200 focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary-3'>
      <Icon className='size-3.5 shrink-0 text-gray-9' name={icon} />
      <input
        aria-label={ariaLabel}
        className='min-w-0 flex-1 truncate bg-transparent font-mono text-12 text-gray-11 outline-none'
        value={value || '…'}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
      />
      <CopyButton value={value} onCopyError={onCopyError} />
    </div>
  )
}

/**
 * One setting in the Email watch card: label and a one-line hint on the left, the control on
 * the right. Stacks to one column when the card is narrower than 768px (container query, so it
 * also stacks inside the builder's side panel).
 */
export function SettingRow({
  children,
  hint,
  label,
}: {
  children: ReactNode
  hint?: string
  label: string
}) {
  return (
    <div className='grid gap-3 px-5 py-6 @min-[768px]:grid-cols-[216px_minmax(0,1fr)] @min-[768px]:gap-6'>
      <div className='space-y-1'>
        <div className='text-13 font-medium text-gray-12'>{label}</div>
        {hint ? (
          <div className='text-12 leading-snug text-gray-10'>{hint}</div>
        ) : null}
      </div>
      <div className='min-w-0'>{children}</div>
    </div>
  )
}
