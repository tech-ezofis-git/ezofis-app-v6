import type { ReactNode } from 'react'

interface EmbedLayoutProps {
  children: ReactNode
}

/**
 * Minimal Embed Layout for standalone page rendering.
 * Renders full width and full height with no sidebar, topbar, header, footer,
 * AI assistant, notifications, or extraneous global chrome elements.
 */
const EmbedLayout = ({ children }: EmbedLayoutProps) => {
  return (
    <div className='relative h-svh w-vw overflow-hidden bg-surface-secondary text-gray-13 antialiased'>
      <div className='flex h-full w-full flex-col overflow-hidden'>
        {children}
      </div>
    </div>
  )
}

EmbedLayout.displayName = 'EmbedLayout'
export default EmbedLayout
