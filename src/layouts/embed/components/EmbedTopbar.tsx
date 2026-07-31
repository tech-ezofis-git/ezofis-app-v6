import type { ReactNode } from 'react'
import IconButton from '@/components/base/button/IconButton'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import Logo from '@/components/common/Logo'
import GlobalSearch from '@/layouts/app/components/topbar/components/GlobalSearch'
import Notifications from '@/layouts/app/components/topbar/components/notifications/Notifications'
import PageTitle from '@/layouts/app/components/topbar/components/PageTitle'

interface EmbedTopbarProps {
  title?: string
  actions?: ReactNode
  showActions?: boolean
  showAiBadge?: boolean
  hideLogoText?: boolean
}

export function EmbedTopbar({
  title,
  actions,
  showActions = false,
  showAiBadge = false,
  hideLogoText = false,
}: EmbedTopbarProps) {
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)

  const handleOpenAskAI = () => {
    useAskAIStore.getState().open()
  }

  const defaultActions = (
    <div className='flex items-center'>
      <GlobalSearch />
      <IconButton
        ariaLabel='Ask AI'
        className={
          isAskAIOpen
            ? 'text-primary-11 hover:text-primary-12'
            : 'text-gray-11 hover:text-gray-13'
        }
        color='gray'
        icon='lucide:bot'
        tooltip='Ask AI'
        variant='ghost'
        onClick={handleOpenAskAI}
      />
      <IconButton
        ariaLabel='Quick Help'
        className='text-gray-11 hover:text-gray-13'
        color='gray'
        icon='lucide:help-circle'
        tooltip='Quick Help'
        variant='ghost'
        onClick={() =>
          globalThis.open('https://help.ezofis.com/', '_blank', 'noopener')
        }
      />
      <Notifications />
    </div>
  )

  return (
    <header className='flex h-14 shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary pl-4 pr-6 shadow-2xs transition-colors duration-200'>
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
            <AiBrandIcon className='size-3.5 shrink-0' variant='outline-purple' />
            <span>AI Enabled</span>
          </div>
        )}
      </div>

      <div className='flex items-center gap-1 shrink-0'>
        {actions}
        {showActions && defaultActions}
      </div>
    </header>
  )
}

export default EmbedTopbar
