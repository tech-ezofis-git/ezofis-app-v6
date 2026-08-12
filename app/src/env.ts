import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  client: {
    VITE_BASE_URL: z.string().min(1),
    VITE_POSTHOG_HOST: z.string().min(1),
    VITE_POSTHOG_KEY: z.string().min(1),
  },
  clientPrefix: 'VITE_',
  emptyStringAsUndefined: true,
  runtimeEnv: import.meta.env,
})
