import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react'
import { DynamicIcon } from './icons'
export function Button({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-3 bg-surface-primary px-4 text-sm font-semibold text-gray-13 shadow-sm transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`animate-in fade-in rounded-xl border border-gray-3 shadow-sm duration-300 ${
        className.includes('bg-') ? '' : 'bg-surface-primary'
      } ${className}`}
    >
      {children}
    </section>
  )
}
export function IconButton({
  active,
  className = '',
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  icon: string
}) {
  return (
    <button
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 ${active ? 'bg-gray-2 text-gray-13 shadow-sm' : ''} ${className}`}
      {...props}
    >
      <DynamicIcon className='h-4 w-4' name={icon} />
    </button>
  )
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 rounded-lg border border-gray-3 bg-surface-primary px-3 text-sm text-gray-13 shadow-sm transition-all outline-none placeholder:text-gray-8 focus:border-blue-8 focus:ring-2 focus:ring-blue-3 ${props.className || ''}`}
    />
  )
}
export function PageHeader({
  actions,
  subtitle,
  title,
}: {
  actions?: ReactNode
  subtitle?: string
  title: string
}) {
  return (
    <header className='flex h-[68px] items-center justify-between border-b border-gray-3 bg-surface-primary px-5'>
      <div>
        <h1 className='text-xl leading-6 font-semibold text-gray-13'>
          {title}
        </h1>
        {subtitle ? (
          <p className='mt-1 text-sm text-gray-10'>{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex items-center gap-3'>{actions}</div>
      ) : null}
    </header>
  )
}
export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary-10 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-11 active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export const Header = PageHeader
export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  const tone =
    s.includes('approved') ||
    s.includes('clean') ||
    s.includes('pass') ||
    s.includes('verified') ||
    s.includes('paid')
      ? 'border-green-6 bg-green-3 text-green-11'
      : s.includes('approver') ||
          s.includes('pending') ||
          s.includes('high')
        ? 'border-orange-6 bg-orange-3 text-orange-11'
        : s.includes('flag') || s.includes('reject')
          ? 'border-red-6 bg-red-3 text-red-11'
          : s.includes('verifier')
            ? 'border-blue-6 bg-blue-3 text-blue-11'
            : 'border-blue-6 bg-blue-3 text-blue-11'
  return (
    <span
      className={`inline-flex w-max items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  )
}
export function ToolbarStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className='border-l border-gray-3 px-4 text-right'>
      <p className='text-xs text-gray-10'>{label}</p>
      <p className='text-base font-bold text-gray-13'>{value}</p>
    </div>
  )
}
