import posthog from 'posthog-js'
import { env } from '../env'

const key =
  env.VITE_POSTHOG_KEY ||
  (import.meta.env?.VITE_POSTHOG_KEY as string) ||
  env.VITE_POSTHOG_PROJECT_TOKEN ||
  (import.meta.env?.VITE_POSTHOG_PROJECT_TOKEN as string) ||
  'phc_vpdrDKNugLVVgvtVLV5QSFCq8B5WvMqq5JbSqQu3uxdi'

const host =
  env.VITE_POSTHOG_HOST ||
  (import.meta.env?.VITE_POSTHOG_HOST as string) ||
  'https://us.i.posthog.com'

if (typeof window !== 'undefined') {
  console.log('[PostHog Debug] Resolved Key:', key ? `${key.substring(0, 8)}...` : 'EMPTY/UNDEFINED')
  console.log('[PostHog Debug] Resolved Host:', host)

  if (key && !key.includes('disabled_placeholder')) {
    if (!posthog.__loaded) {
      console.log('[PostHog Debug] Calling posthog.init()...')
      posthog.init(key, {
        api_host: host,
        defaults: '2026-05-30',
        enable_heatmaps: true,
        capture_pageview: true, // Automatically capture SPA pageviews
        debug: true, // Print verbose PostHog SDK logs in browser console
        loaded: (ph) => {
          console.log('[PostHog Debug] SDK Successfully Loaded & Ready', ph)
        },
      })
    } else {
      console.log('[PostHog Debug] PostHog instance already loaded.')
    }
  } else {
    console.warn('[PostHog Debug] Initialization skipped: Key is missing or placeholder.')
  }
}

/**
 * Capture manual exceptions in try/catch blocks
 */
export function captureException(error: unknown, additionalProperties?: Record<string, any>) {
  if (typeof window !== 'undefined' && posthog) {
    console.log('[PostHog Debug] Capturing Exception:', error, additionalProperties)
    posthog.captureException(error, additionalProperties)
  }
}

export { posthog }
