import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export type FileCategory = 'all' | 'staged' | 'archived'

export interface FileCategorySegmentedControlProps {
  activeCategory: FileCategory
  allCount: number
  archivedCount: number
  stagedCount: number
  onChange: (category: FileCategory) => void
  className?: string
}

export function FileCategorySegmentedControl({
  activeCategory,
  allCount,
  archivedCount,
  stagedCount,
  onChange,
  className,
}: FileCategorySegmentedControlProps) {
  const { t } = useLingui()

  if (allCount <= 0 && stagedCount <= 0 && archivedCount <= 0) {
    return null
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-gray-3 bg-surface p-1 shadow-sm',
        className,
      )}
    >
      <button
        type='button'
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
          activeCategory === 'all'
            ? 'bg-[var(--primary-9)] text-white shadow-xs'
            : 'text-gray-10 hover:bg-gray-3 hover:text-gray-13',
        )}
        onClick={() => onChange('all')}
      >
        <Icon name='lucide:files' className='size-3.5' />
        <span>{t`All Files`}</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.2 text-[10px]',
            activeCategory === 'all'
              ? 'bg-white/20 text-white'
              : 'bg-gray-4 text-gray-11',
          )}
        >
          {allCount}
        </span>
      </button>

      {stagedCount > 0 ? (
        <button
          type='button'
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
            activeCategory === 'staged'
              ? 'bg-[var(--primary-9)] text-white shadow-xs'
              : 'text-gray-10 hover:bg-gray-3 hover:text-gray-13',
          )}
          onClick={() => onChange('staged')}
        >
          <Icon name='tabler:scan' className='size-3.5' />
          <span>{t`Staged`}</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px]',
              activeCategory === 'staged'
                ? 'bg-white/20 text-white'
                : 'bg-gray-4 text-gray-11',
            )}
          >
            {stagedCount}
          </span>
        </button>
      ) : null}

      <button
        type='button'
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
          activeCategory === 'archived'
            ? 'bg-[var(--primary-9)] text-white shadow-xs'
            : 'text-gray-10 hover:bg-gray-3 hover:text-gray-13',
        )}
        onClick={() => onChange('archived')}
      >
        <Icon name='lucide:archive' className='size-3.5' />
        <span>{t`Archived`}</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.2 text-[10px]',
            activeCategory === 'archived'
              ? 'bg-white/20 text-white'
              : 'bg-gray-4 text-gray-11',
          )}
        >
          {archivedCount}
        </span>
      </button>
    </div>
  )
}
