import type { ReactNode } from 'react'
import cn from '@/utils/cn'
import { Icon } from '../primitives/Icon'

export type TabBarItemId = 'home' | 'inbox' | 'folder' | 'ai' | 'menu'

type TabBarItem = {
  id: TabBarItemId
  label: string
  icon: 'House' | 'Inbox' | 'Folder' | 'Sparkles' | 'Menu'
}

const TABS: TabBarItem[] = [
  { id: 'home', label: 'Home', icon: 'House' },
  { id: 'inbox', label: 'Inbox', icon: 'Inbox' },
  { id: 'folder', label: 'Folder', icon: 'Folder' },
  { id: 'ai', label: 'AI', icon: 'Sparkles' },
  { id: 'menu', label: 'Menu', icon: 'Menu' },
]

type TabBarProps = {
  activeId: TabBarItemId
  onChange: (id: TabBarItemId) => void
}

export function TabBar({ activeId, onChange }: TabBarProps) {
  return (
    <nav
      aria-label='Primary'
      className='shrink-0 border-t border-border-default bg-surface-primary px-1.5 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]'
    >
      <ul className='flex items-stretch justify-between gap-1'>
        {TABS.map((tab) => {
          const active = tab.id === activeId
          return (
            <li className='min-w-0 flex-1' key={tab.id}>
              <button
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 text-11 font-medium transition-all active:scale-95',
                  active
                    ? 'bg-accent-soft text-accent-primary'
                    : 'text-text-muted hover:bg-surface-hover',
                )}
                type='button'
                onClick={() => onChange(tab.id)}
              >
                <Icon className='size-4' name={tab.icon} />
                <span className='truncate'>{tab.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

type StackProps = {
  children: ReactNode
  className?: string
  gap?: 'sm' | 'md' | 'lg'
}

const gapClass = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-5',
}

export function Stack({ children, className, gap = 'md' }: StackProps) {
  return (
    <div className={cn('flex flex-col', gapClass[gap], className)}>
      {children}
    </div>
  )
}
