import { Fragment } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { SettingsBreadcrumbItem } from '../helpers/settingsBreadcrumbs'

type Props = {
  items: SettingsBreadcrumbItem[]
  onNavigate?: (key: string) => void
}

export default function SettingsBreadcrumbs({ items, onNavigate }: Props) {
  if (!items.length) return null

  return (
    <nav
      aria-label='Settings breadcrumb'
      className='flex min-w-0 items-center gap-2 text-15/5 font-semibold'
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const isClickable = Boolean(item.key && !isLast && onNavigate)

        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <Icon
                className='shrink-0 text-gray-8'
                name='lucide:chevron-right'
              />
            ) : null}

            {isClickable ? (
              <button
                className='truncate text-gray-10 transition hover:text-primary-9 hover:underline'
                type='button'
                onClick={() => onNavigate?.(item.key!)}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={cn(
                  'truncate',
                  isLast ? 'text-gray-13' : 'text-gray-10',
                )}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
