import IconButton from '@/components/base/button/IconButton'
import type { SettingsOption } from '../helpers/userGroupMappers'

type SettingsSelectedChipsProps = {
  items: SettingsOption[]
  onRemove: (id: SettingsOption['id']) => void
}

export default function SettingsSelectedChips({
  items,
  onRemove,
}: SettingsSelectedChipsProps) {
  if (!items.length) return null

  return (
    <div className='mt-2 w-full rounded-[10px] border border-[var(--border-default)] bg-surface p-3 shadow-sm'>
      <div className='ez-scrollbar flex max-h-36 flex-wrap gap-2 overflow-y-auto'>
        {items.map((item) => (
          <div
            key={item.id}
            className='inline-flex h-7 max-w-full items-center gap-1 rounded bg-purple-2 px-2 text-13 font-medium text-purple-11'
          >
            <span className='truncate'>{item.name}</span>
            <IconButton
              ariaLabel={`Remove ${item.name}`}
              className='size-5 shrink-0 text-purple-11 hover:bg-purple-3'
              color='gray'
              icon='lucide:x'
              size='xs'
              variant='ghost'
              onClick={() => onRemove(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
