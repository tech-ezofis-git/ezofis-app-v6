import type { ReactNode } from 'react'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import Logo from '@/components/common/Logo'
import PageTitle from '@/layouts/app/components/topbar/components/PageTitle'

interface EmbedTopbarProps {
  title?: string
  actions?: ReactNode
  showAiBadge?: boolean
  hideLogoText?: boolean
}

export function EmbedTopbar({
  title,
  actions,
  showAiBadge = false,
  hideLogoText = false,
}: EmbedTopbarProps) {
  return (
    <header className='flex h-12 shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-4 shadow-2xs transition-colors duration-200'>
      <div className='flex items-center gap-3 min-w-0 overflow-hidden'>
        <Logo hideText={hideLogoText} markClassName='size-6 shrink-0' />
        <span className='h-4 w-px bg-gray-4 shrink-0' />
        {title ? (
          <span className='text-sm font-semibold tracking-tight text-gray-13 truncate'>
            {title}
          </span>
        ) : (
          <div className='flex items-center min-w-0 overflow-hidden'>
            <PageTitle />
          </div>
        )}
        {showAiBadge && (
          <div className='flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-primary shrink-0'>
            <AiBrandIcon className='size-3.5 shrink-0' variant='curved-purple' />
            <span>AI Enabled</span>
          </div>
        )}
      </div>
      {actions && <div className='flex items-center gap-2 shrink-0'>{actions}</div>}
    </header>
  )
}

export default EmbedTopbar
