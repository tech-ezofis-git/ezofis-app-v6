import type { ComponentProps } from 'react'
import type EmptyState from '@/components/base/EmptyState'

export type MenuPage = 'workflows' | 'forms' | 'requests'

export type MenuPageEmptyStateConfig = Record<
  MenuPage,
  Record<MenuPageEmptyVariant, EmptyContent>
>

export type MenuPageEmptyVariant = 'initial' | 'filtered' | 'unavailable'

type EmptyContent = {
  description: string
  icon: string
  primaryActionLabel?: string
  secondaryActionLabel?: string
  title: string
}

export const MENU_PAGE_EMPTY_STATES: MenuPageEmptyStateConfig = {
  forms: {
    filtered: {
      description:
        'No forms match your current search or filters. Try different keywords or clear filters.',
      icon: 'lucide:folder-search',
      title: 'No matching forms',
    },
    initial: {
      description:
        'Create a form to collect data and connect it to your workflows.',
      icon: 'lucide:file-text',
      primaryActionLabel: 'Create Form',
      title: 'No forms yet',
    },
    unavailable: {
      description:
        'Forms are unavailable right now. Refresh the page or contact your administrator.',
      icon: 'lucide:folder-search',
      title: 'Forms unavailable',
    },
  },
  requests: {
    filtered: {
      description:
        'No requests match your current search or filters. Try different keywords or clear filters.',
      icon: 'lucide:folder-search',
      title: 'No matching requests',
    },
    initial: {
      description:
        'Submit a new request to start processing invoices and track them in your inbox.',
      icon: 'tabler:inbox',
      primaryActionLabel: 'New Request',
      title: 'No requests yet',
    },
    unavailable: {
      description:
        'We could not find a workflow for your account. Complete AP setup or contact your administrator if this continues.',
      icon: 'lucide:folder-search',
      title: 'No workflow found',
    },
  },
  workflows: {
    filtered: {
      description:
        'No workflows match your current search or filters. Try different keywords or clear filters.',
      icon: 'lucide:folder-search',
      title: 'No matching workflows',
    },
    initial: {
      description:
        'Create your first workflow to automate approvals, routing, and integrations.',
      icon: 'tabler:git-branch',
      primaryActionLabel: 'Create Workflow',
      title: 'No workflows yet',
    },
    unavailable: {
      description:
        'Workflows are unavailable right now. Refresh the page or contact your administrator.',
      icon: 'lucide:folder-search',
      title: 'Workflows unavailable',
    },
  },
}

export type MenuPageEmptyStateProps = Pick<
  ComponentProps<typeof EmptyState>,
  'onPrimaryAction' | 'onSecondaryAction'
>

export const getMenuPageEmptyContent = (
  page: MenuPage,
  variant: MenuPageEmptyVariant,
): EmptyContent => MENU_PAGE_EMPTY_STATES[page][variant]
