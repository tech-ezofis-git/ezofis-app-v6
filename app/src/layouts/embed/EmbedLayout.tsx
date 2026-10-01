import type { ReactNode } from 'react'
import useEmbedMode from '@/hooks/useEmbedMode'
import EmbedTopbar from './components/EmbedTopbar'

interface EmbedLayoutProps {
  children: ReactNode
  hideLogoText?: boolean
  showActions?: boolean
  showAiBadge?: boolean
  showLogo?: boolean
  showTopbar?: boolean
  title?: string
  topbarActions?: ReactNode
}

/**
 * Minimal Embed Layout for standalone page rendering.
 * Supports optional topbar layout with brand icon and logo.
 */
const EmbedLayout = ({
  children,
  hideLogoText,
  showActions,
  showAiBadge,
  showLogo,
  showTopbar,
  title,
  topbarActions,
}: EmbedLayoutProps) => {
  const { hasActions, hasLogo, hasTopbar } = useEmbedMode()
  const renderTopbar = showTopbar ?? hasTopbar
  const renderActions = showActions ?? hasActions
  const renderLogo = showLogo ?? hasLogo

  return (
    <div className='w-vw relative h-svh overflow-hidden bg-surface-secondary text-gray-13 antialiased'>
      <div className='flex h-full w-full flex-col overflow-hidden'>
        {renderTopbar && (
          <EmbedTopbar
            actions={topbarActions}
            hideLogoText={hideLogoText}
            showActions={renderActions}
            showAiBadge={showAiBadge}
            showLogo={renderLogo}
            title={title}
          />
        )}
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    </div>
  )
}

EmbedLayout.displayName = 'EmbedLayout'
export default EmbedLayout
