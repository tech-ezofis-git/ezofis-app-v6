import { useLingui } from '@lingui/react/macro'
import { Fragment, useEffect } from 'react'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import type { BreadcrumbItem } from './Breadcrumbs'

/** Crumbs kept visible on each side when a deep path is collapsed. */
const MAX_VISIBLE_CRUMBS = 4

type Props = {
  breadcrumbs: BreadcrumbItem[]
  canGoBack: boolean
  loading?: boolean
  onBack: () => void
  onSelect: (id: string) => void
}

/**
 * Location bar above the folder list: a Back button plus a clickable
 * breadcrumb trail, so users can step up one level or jump to any ancestor.
 * Alt+← also goes back.
 */
export default function ExplorerLocationBar({
  breadcrumbs,
  canGoBack,
  loading = false,
  onBack,
  onSelect,
}: Props) {
  const { t } = useLingui()
  const parent =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null
  const parentLabel = parent?.label ?? ''
  const backLabel = parent ? t`Back to ${parentLabel}` : t`Back`

  // Long paths: first crumb, "…", then the last few.
  const collapsed = breadcrumbs.length > MAX_VISIBLE_CRUMBS
  const visibleCrumbs = collapsed
    ? [breadcrumbs[0], ...breadcrumbs.slice(-(MAX_VISIBLE_CRUMBS - 1))]
    : breadcrumbs

  useEffect(() => {
    if (!canGoBack) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.key !== 'ArrowLeft') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      event.preventDefault()
      onBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canGoBack, onBack])

  if (!breadcrumbs.length) return null

  return (
    <nav
      aria-label={t`Folder location`}
      className='animate-in fade-in flex h-12 shrink-0 items-center gap-2 border-b border-gray-3 bg-surface px-3 duration-200'
    >
      <Tooltip content={`${backLabel} (Alt+←)`} position='bottom'>
        <button
          aria-label={backLabel}
          className='inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-4 bg-surface text-gray-11 transition-all hover:border-gray-6 hover:bg-gray-2 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface'
          disabled={!canGoBack || loading}
          type='button'
          onClick={onBack}
        >
          <Icon className='size-4' name='lucide:arrow-left' />
        </button>
      </Tooltip>

      <div className='h-5 w-px shrink-0 bg-gray-4' />

      <ol className='flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-13'>
        {visibleCrumbs.map((crumb, index) => {
          const isFirst = index === 0
          const isLast = index === visibleCrumbs.length - 1
          return (
            <Fragment key={`${crumb.id}-${index}`}>
              {!isFirst ? (
                <li className='shrink-0 text-gray-8' aria-hidden>
                  <Icon className='size-3.5' name='lucide:chevron-right' />
                </li>
              ) : null}
              {collapsed && index === 1 ? (
                <>
                  <li className='shrink-0 px-1 text-gray-9'>…</li>
                  <li className='shrink-0 text-gray-8' aria-hidden>
                    <Icon className='size-3.5' name='lucide:chevron-right' />
                  </li>
                </>
              ) : null}
              <li className={cn('min-w-0', isLast ? 'shrink' : 'shrink-[2]')}>
                <button
                  aria-current={isLast ? 'page' : undefined}
                  disabled={isLast}
                  title={crumb.label}
                  type='button'
                  className={cn(
                    'flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors',
                    isLast
                      ? 'cursor-default font-semibold text-gray-13'
                      : 'cursor-pointer text-gray-11 hover:bg-gray-2 hover:text-primary-11',
                  )}
                  onClick={() => onSelect(crumb.id)}
                >
                  {isFirst ? (
                    <Icon
                      className='size-4 shrink-0 text-primary-10'
                      name='lucide:folder-open'
                    />
                  ) : null}
                  <span className='truncate'>{crumb.label}</span>
                </button>
              </li>
            </Fragment>
          )
        })}
      </ol>

      {loading ? (
        <Icon
          className='size-4 shrink-0 animate-spin text-gray-9'
          name='lucide:loader-2'
        />
      ) : null}
    </nav>
  )
}
