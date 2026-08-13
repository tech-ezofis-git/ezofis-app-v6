import type { useNavigate } from '@tanstack/react-router'
import type { NotificationTarget } from '../types'

type Navigate = ReturnType<typeof useNavigate>

export function navigateToNotificationTarget(
  navigate: Navigate,
  target: NotificationTarget,
) {
  switch (target.route) {
    case 'requests':
      void navigate({ search: target.search as any, to: '/requests' })
      break
    case 'folders':
      void navigate({ search: target.search as any, to: '/folders' })
      break
    case 'sign-request':
      void navigate({
        params: { _splat: target.params?._splat ?? '' },
        search: target.search as any,
        to: '/sign-request/$',
      })
      break
    case 'form-builder':
      void navigate({
        params: { formId: target.params?.formId ?? '' },
        to: '/form-builder/$formId',
      })
      break
    case 'form-entries':
      void navigate({
        params: { formId: target.params?.formId ?? '' },
        search: target.search as any,
        to: '/forms/$formId/entries',
      })
      break
    case 'settings':
    case 'support-tickets':
      void navigate({ search: target.search as any, to: '/settings' })
      break
  }
}
