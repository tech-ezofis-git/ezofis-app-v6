import posthog from 'posthog-js'
import { env } from '../env'

if (typeof window !== 'undefined') {
  posthog.init(env.VITE_POSTHOG_KEY, {
    api_host: env.VITE_POSTHOG_HOST,
    capture_pageview: false, // We manually capture pageviews for SPA
  })
}

export { posthog }
