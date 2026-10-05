import posthog from 'posthog-js'
import { env } from '../env'

const key = env.VITE_POSTHOG_PROJECT_TOKEN || env.VITE_POSTHOG_KEY

if (typeof window !== 'undefined' && key) {
  posthog.init(key, {
    api_host: env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    enable_heatmaps: true,
    capture_pageview: false, // We manually capture pageviews for SPA
  })
}

/**
 * Capture manual exceptions in try/catch blocks
 */
export function captureException(error: unknown, additionalProperties?: Record<string, any>) {
  if (typeof window !== 'undefined' && posthog) {
    posthog.captureException(error, additionalProperties)
  }
}

export { posthog }
