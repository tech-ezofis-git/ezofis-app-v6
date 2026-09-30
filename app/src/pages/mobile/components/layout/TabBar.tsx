import type { ReactNode } from 'react'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'
import { Icon } from '../primitives/Icon'

export type TabBarItemId = 'home' | 'inbox' | 'folder' | 'ai' | 'menu'

type TabBarItem = {
  icon: 'House' | 'Inbox' | 'Folder' | 'Sparkles' | 'Menu'
  id: TabBarItemId
  label: string
}

const TABS: TabBarItem[] = [
  { icon: 'House', id: 'home', label: 'Home' },
  { icon: 'Inbox', id: 'inbox', label: 'Inbox' },
  { icon: 'Folder', id: 'folder', label: 'Folder' },
  { icon: 'Sparkles', id: 'ai', label: 'AI' },
  { icon: 'Menu', id: 'menu', label: 'Menu' },
]

type StackProps = {
  children: ReactNode
  className?: string
  gap?: 'sm' | 'md' | 'lg'
}

type TabBarProps = {
  activeId: TabBarItemId
  onChange: (id: TabBarItemId) => void
}

export function TabBar({ activeId, onChange }: TabBarProps) {
  return (
    <nav
      aria-label='Primary'
      className='shrink-0 border-t border-[var(--gray-3)] bg-surface-primary px-1.5 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]'
    >
      <ul className='flex items-stretch justify-between gap-1'>
        {TABS.map((tab) => {
          const active = tab.id === activeId
          return (
            <li className='min-w-0 flex-1' key={tab.id}>
              <button
                aria-current={active ? 'page' : undefined}
                type='button'
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 px-0.5 py-1.5 text-11 font-medium transition-all active:scale-95',
                  active
                    ? 'text-[var(--gray-9)]'
                    : 'text-[var(--gray-9)] hover:text-[var(--gray-11)]',
                )}
                onClick={() => onChange(tab.id)}
              >
                {tab.id === 'ai' ? (
                  <AiBrandIcon className='size-4' variant='outline-purple' />
                ) : (
                  <Icon
                    name={tab.icon}
                    className={cn(
                      'size-4',
                      active ? 'text-[var(--primary-9)]' : undefined,
                    )}
                  />
                )}
                <span
                  className={cn(
                    'truncate',
                    active ? 'text-[var(--primary-9)]' : undefined,
                  )}
                >
                  {tab.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
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
