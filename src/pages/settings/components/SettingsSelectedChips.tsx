import IconButton from '@/components/base/button/IconButton'
import type { SettingsOption } from '../helpers/userGroupMappers'

type SettingsSelectedChipsProps = {
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

const getAvatarColor = (str: string) => {
  const colors = [
    'bg-[var(--violet-9)] text-white',
    'bg-[var(--blue-9)] text-white',
    'bg-[var(--green-9)] text-white',
    'bg-[var(--orange-9)] text-white',
    'bg-[var(--pink-9)] text-white',
    'bg-[var(--cyan-9)] text-white',
    'bg-[var(--teal-9)] text-white',
    'bg-[var(--indigo-9)] text-white',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function SettingsSelectedChips({
  items,
  onRemove,
}: SettingsSelectedChipsProps) {
  if (!items.length) return null

  return (
    <div className='mt-2 w-full rounded-[10px] border border-[var(--border-default)] bg-surface p-3 shadow-xs'>
      <div className='ez-scrollbar flex max-h-36 flex-wrap gap-2 overflow-y-auto'>
        {items.map((item) => {
          const initials = getInitials(item.name)
          const avatarBg = getAvatarColor(item.name)

          return (
            <div
              className='inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-[var(--border-default)] bg-surface-muted px-2.5 py-1 text-xs font-medium text-gray-13 transition hover:border-gray-4'
              key={item.id}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-2xs ${avatarBg}`}
              >
                {initials}
              </span>
              <span className='truncate'>{item.name}</span>
              <IconButton
                ariaLabel={`Remove ${item.name}`}
                className='size-4 shrink-0 text-gray-9 hover:bg-gray-4 hover:text-gray-13'
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
