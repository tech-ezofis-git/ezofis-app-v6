/* eslint-disable prettier/prettier */
import { useEffect } from 'react'
import { posthog } from '@/lib/posthog'
import { router } from '@/lib/tanstack-router/router'

export function PostHogPageView() {
  useEffect(() => {
    const capture = () => {
      const path = router.state.location.pathname
      if (!path) return

      posthog.capture('$pageview', {
        $current_url: window.location.href,
        path,
      })
    }
    // posthog setup

    // Initial page view
    capture()

    // Route changes (after resolve)
    const unsubscribe = router.subscribe('onResolved', () => {
      capture()
    })

    return unsubscribe
  }, [])

  return null
}
