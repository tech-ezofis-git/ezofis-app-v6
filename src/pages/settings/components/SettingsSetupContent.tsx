import type { ReactNode } from 'react'
import cn from '@/utils/cn'

type SettingsSetupContentProps = {
  children: ReactNode
  fullWidth?: boolean
}

export default function SettingsSetupContent({
  children,
  fullWidth = false,
}: SettingsSetupContentProps) {
  return (
    <section className='ez-scrollbar h-[calc(100vh-155px)] min-h-0 overflow-y-auto px-6 py-2 pt-8 md:px-8'>
      <div className={cn('w-full', !fullWidth && 'max-w-[860px]')}>
        {children}
      </div>
    </section>
  )
}
