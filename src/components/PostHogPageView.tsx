import { useEffect } from 'react'
import { router } from '@/lib/tanstack-router/router'
import { posthog } from '@/lib/posthog'

export function PostHogPageView() {
    useEffect(() => {
        // Track initial page view
        const currentPath = router.state.location.pathname
        if (currentPath) {
            console.log('PostHogPageView', currentPath, posthog)
            posthog.capture('$pageview', {
                $current_url: window.location.href,
                path: currentPath
            })
        }

        // Subscribe to route changes
        const unsubscribe = router.subscribe({
            select: (state: any) => state.location.pathname,
            onChange: (path: string) => {
                posthog.capture('$pageview', {
                    $current_url: window.location.href,
                    path,
                })
            },
        })

        return unsubscribe
    }, [])

    return null
}
