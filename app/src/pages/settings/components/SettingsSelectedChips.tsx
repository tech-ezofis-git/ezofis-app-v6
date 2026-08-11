import IconButton from '@/components/base/button/IconButton'
import cn from '@/utils/cn'
import type { SettingsOption } from '../helpers/userGroupMappers'

type SettingsSelectedChipsProps = {
  className?: string
  items: SettingsOption[]
  onRemove: (id: SettingsOption['id']) => void
}

const getInitials = (name: string) => {
  if (!name) return '?'
  const clean = name.replace(/^(User:|Group:)\s*/i, '').trim()
  const parts = clean.split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

export default function SettingsSelectedChips({
  className,
  items,
  onRemove,
}: SettingsSelectedChipsProps) {
  if (!items.length) return null

  return (
    <div
      className={cn(
        'mt-2 w-full rounded-[10px] border border-primary-4/50 bg-gradient-to-r from-primary-2/80 via-surface to-primary-3/30 p-3 shadow-2xs',
        className,
      )}
    >
      <div className='ez-scrollbar flex max-h-36 flex-wrap gap-2 overflow-y-auto'>
        {items.map((item) => {
          const initials = getInitials(item.name)

          return (
            <div
              className='inline-flex h-8 max-w-full items-center gap-2 rounded-lg border border-primary-4/60 bg-gradient-to-r from-primary-3/70 to-primary-2/90 px-2.5 py-1 text-xs font-semibold text-gray-13 shadow-2xs transition hover:border-primary-8 hover:from-primary-3 hover:to-primary-3/80'
              key={item.id}
            >
              <span className='flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border border-primary-4/50 bg-white text-[10px] font-bold tracking-tight text-primary-11 shadow-2xs'>
                {initials}
              </span>
              <span className='truncate'>{item.name}</span>
              <IconButton
                ariaLabel={`Remove ${item.name}`}
                className='size-4 shrink-0 text-gray-9 hover:bg-primary-4/50 hover:text-gray-13'
                color='gray'
                icon='lucide:x'
                size='xs'
                variant='ghost'
                onClick={() => onRemove(item.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
