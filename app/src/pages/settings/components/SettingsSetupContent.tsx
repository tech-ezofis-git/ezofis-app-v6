import type { ReactNode } from 'react'

type SettingsSetupContentProps = {
  children: ReactNode
  /** @deprecated Content always uses the full available width. */
  fullWidth?: boolean
}

export default function SettingsSetupContent({
  children,
}: SettingsSetupContentProps) {
  return (
    <section className='ez-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6'>
      <div className='w-full min-w-0'>{children}</div>
    </section>
  )
}
