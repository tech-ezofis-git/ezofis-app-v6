import type { Table as TanstackTable } from '@tanstack/react-table'
import type { ComponentProps } from 'react'
import EmptyState from '@/components/base/EmptyState'
import cn from '@/utils/cn'
import {
  getMenuPageEmptyContent,
  type MenuPage,
  type MenuPageEmptyVariant,
} from './menuPageEmptyStates'

export type { MenuPage, MenuPageEmptyVariant } from './menuPageEmptyStates'
export {
  getMenuPageEmptyContent,
  MENU_PAGE_EMPTY_STATES,
} from './menuPageEmptyStates'

type EmptyStateProps = ComponentProps<typeof EmptyState>

type SearchState = { id?: string; value?: string }

export const hasActiveTableSearch = (table?: TanstackTable<any>) => {
  if (!table) return false
  const search = table.getState().globalFilter as SearchState | undefined
  return Boolean(search?.value?.trim())
}

export const resolveEmptyVariant = (
  table?: TanstackTable<any>,
  variant?: MenuPageEmptyVariant,
): MenuPageEmptyVariant => {
  if (variant) return variant
  return hasActiveTableSearch(table) ? 'filtered' : 'initial'
}

interface Props extends Omit<
  EmptyStateProps,
  'description' | 'icon' | 'title'
> {
  containerClassName?: string
  description?: string
  /** When true, fills the available page/section height (default). */
  fill?: boolean
  icon?: string
  /** Menu page preset (workflows, forms, requests). Omit for one-off empty views. */
  page?: MenuPage
  title?: string
  variant?: MenuPageEmptyVariant
}

const PageEmptyState = ({
  containerClassName,
  description,
  fill = true,
  icon,
  page,
  title,
  variant = 'initial',
  ...emptyStateProps
}: Props) => {
  const content = page
    ? getMenuPageEmptyContent(page, variant)
    : {
        description: description ?? 'No content to display.',
        icon: icon ?? 'lucide:folder-search',
        title: title ?? 'No results found',
      }

  const showCreateAction = variant === 'initial'

  return (
    <div
      className={cn(
        'flex items-center justify-center px-6 py-12',
        fill && 'min-h-0 flex-1',
        containerClassName,
      )}
    >
      <EmptyState
        description={description ?? content.description}
        icon={icon ?? content.icon}
        title={title ?? content.title}
        primaryActionLabel={
          showCreateAction && emptyStateProps.onPrimaryAction
            ? (emptyStateProps.primaryActionLabel ?? content.primaryActionLabel)
            : undefined
        }
        secondaryActionLabel={
          emptyStateProps.secondaryActionLabel ?? content.secondaryActionLabel
        }
        onPrimaryAction={
          showCreateAction ? emptyStateProps.onPrimaryAction : undefined
        }
        onSecondaryAction={emptyStateProps.onSecondaryAction}
      />
    </div>
  )
}

PageEmptyState.displayName = 'PageEmptyState'
export default PageEmptyState
