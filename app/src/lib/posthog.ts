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

if (typeof window !== 'undefined' && key && !key.includes('disabled_placeholder')) {
  if (!posthog.__loaded) {
    posthog.init(key, {
      api_host: host,
      defaults: '2026-05-30',
      enable_heatmaps: true,
      capture_pageview: false, // We manually capture pageviews for SPA
    })
  }
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
