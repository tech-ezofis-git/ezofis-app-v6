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
    <section className='flex h-full min-h-0 flex-1 flex-col justify-between overflow-hidden px-6 py-6 md:px-8'>
      <div className={cn('w-full', !fullWidth && 'max-w-[860px]')}>
        {children}
      </div>
    </section>
  )
}
