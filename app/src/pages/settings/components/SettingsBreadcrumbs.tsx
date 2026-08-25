import { Fragment } from 'react'
import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { SettingsBreadcrumbItem } from '../helpers/settingsBreadcrumbs'

type Props = {
  items: SettingsBreadcrumbItem[]
  onNavigate?: (key: string) => void
}

export default function SettingsBreadcrumbs({ items, onNavigate }: Props) {
  const { t } = useLingui()
  if (!items?.length) return null

  const localizeLabel = (label: string) => {
    switch (label) {
      case 'Settings':
        return t`Settings`
      case 'Folders':
        return t`Folders`
      case 'User Management':
        return t`User Management`
      case 'Roles & Permissions':
        return t`Roles & Permissions`
      case 'Group Management':
        return t`Group Management`
      case 'Folder Configuration':
        return t`Folder Configuration`
      case 'Audit & Monitoring':
        return t`Audit & Monitoring`
      case 'Credit Usage':
        return t`Credit Usage`
      case 'Playground API':
        return t`Playground API`
      case 'Accounts Payable':
      case 'Accounts payable':
        return label
      default:
        return label
    }
  }

  return (
    <nav
      aria-label={t`Breadcrumb`}
      className='flex min-w-0 items-center gap-2 text-15/5 font-semibold'
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const isClickable = Boolean(item.key && !isLast && onNavigate)
        const label = localizeLabel(item.label)

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
                {label}
              </button>
            ) : (
              <span
                className={cn(
                  'truncate',
                  isLast ? 'text-gray-13' : 'text-gray-10',
                )}
              >
                {label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
