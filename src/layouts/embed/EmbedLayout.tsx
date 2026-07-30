import type { ReactNode } from 'react'
import useEmbedMode from '@/hooks/useEmbedMode'
import EmbedTopbar from './components/EmbedTopbar'

interface EmbedLayoutProps {
  children: ReactNode
  showTopbar?: boolean
  title?: string
  topbarActions?: ReactNode
  showAiBadge?: boolean
  hideLogoText?: boolean
}

/**
 * Minimal Embed Layout for standalone page rendering.
 * Supports optional topbar layout with brand icon and logo.
 */
const EmbedLayout = ({
  children,
  showTopbar,
  title,
  topbarActions,
  showAiBadge,
  hideLogoText,
}: EmbedLayoutProps) => {
  const { hasTopbar } = useEmbedMode()
  const renderTopbar = showTopbar ?? hasTopbar

  return (
    <div className='relative h-svh w-vw overflow-hidden bg-surface-secondary text-gray-13 antialiased'>
      <div className='flex h-full w-full flex-col overflow-hidden'>
        {renderTopbar && (
          <EmbedTopbar
            actions={topbarActions}
            hideLogoText={hideLogoText}
            showAiBadge={showAiBadge}
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
