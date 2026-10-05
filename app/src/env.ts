import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  client: {
    VITE_AZURE_OPENAI_GPT_4_1_MINI_API_KEY: z.string().optional(),
    VITE_AZURE_OPENAI_GPT_4_1_MINI_ENDPOINT: z.string().optional(),
    VITE_BASE_URL: z.string().min(1),
    VITE_POSTHOG_HOST: z.string().optional(),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_POSTHOG_PROJECT_TOKEN: z.string().optional(),
  },
  clientPrefix: 'VITE_',
  emptyStringAsUndefined: true,
  runtimeEnv: import.meta.env,
})
