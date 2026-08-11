import type { ComponentProps } from 'react'
import type EmptyState from '@/components/base/EmptyState'

export type MenuPage =
  | 'workflows'
  | 'forms'
  | 'requests'
  | 'requests-exceptions'
  | 'requests-processed'

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
  'requests-exceptions': {
    filtered: {
      description:
        'No exceptions match your current search or filters. Try different keywords or clear filters.',
      icon: 'lucide:folder-search',
      title: 'No matching exceptions',
    },
    initial: {
      description:
        'Requests flagged with issues will appear here for your review.',
      icon: 'tabler:alert-triangle',
      title: 'No exceptions',
    },
    unavailable: {
      description:
        'Exceptions are unavailable right now. Refresh the page or contact your administrator.',
      icon: 'lucide:folder-search',
      title: 'Exceptions unavailable',
    },
  },
  'requests-processed': {
    filtered: {
      description:
        'No processed requests match your current search or filters. Try different keywords or clear filters.',
      icon: 'lucide:folder-search',
      title: 'No matching processed requests',
    },
    initial: {
      description:
        'Completed and approved requests will appear here once they have been fully processed.',
      icon: 'tabler:circle-check',
      title: 'No processed requests',
    },
    unavailable: {
      description:
        'Processed requests are unavailable right now. Refresh the page or contact your administrator.',
      icon: 'lucide:folder-search',
      title: 'Processed requests unavailable',
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
