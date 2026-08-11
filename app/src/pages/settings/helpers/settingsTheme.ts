/** Shared typography + color classes for settings pages (theme-switcher safe). */
export const settingsTheme = {
  body: 'text-sm text-gray-11',
  caption: 'text-xs text-gray-11',
  card: 'rounded-[12px] border border-[var(--border-default)] bg-surface shadow-[var(--shadow-sm)]',
  cardMuted: 'rounded-[12px] border border-gray-3 bg-surface-muted',
  heading: 'font-semibold text-gray-13',
  headingLg: 'text-18/6 font-semibold tracking-tight text-gray-13',
  iconMuted: 'text-gray-10',
  labelUpper: 'text-xs font-bold uppercase text-gray-11',
  pageSubtitle: 'text-13/5 text-gray-11',
  pageTitle: 'text-18/6 font-semibold tracking-tight text-gray-13',
  primaryButton:
    'inline-flex items-center gap-2 rounded-[8px] bg-primary-9 px-5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-primary-10',
  secondaryButton:
    'inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-surface px-4 text-sm font-semibold text-gray-13 shadow-[var(--shadow-sm)] transition hover:bg-surface-muted',
  selectedCard: 'border-primary-9 bg-primary-2',
  selectedCardHover: 'border-gray-3 bg-surface hover:bg-surface-muted',
  statValue: 'text-[28px] leading-none font-bold text-gray-13',
  subtitle: 'text-sm text-gray-11',
  textPrimary: 'text-gray-13',
  textSecondary: 'text-gray-11',
} as const

export const settingsSeverityStyles = {
  critical: 'border-red-5 bg-red-2 text-red-11',
  info: 'border-blue-5 bg-blue-2 text-blue-11',
  warning: 'border-orange-5 bg-orange-2 text-orange-11',
} as const

export const settingsChartPalette = [
  'var(--primary-9)',
  'var(--cyan-9)',
  'var(--green-9)',
  'var(--orange-9)',
  'var(--red-9)',
  'var(--gray-9)',
] as const
