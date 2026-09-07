const API_URL =
  import.meta.env.VITE_QWEN_API_URL || '/qwen-proxy/v1'
const API_KEY = import.meta.env.VITE_QWEN_API_KEY || ''
const MODEL = import.meta.env.VITE_QWEN_MODEL || 'qwen3.5-9b'

const AZURE_ENDPOINT =
  import.meta.env.VITE_AZURE_OPENAI_GPT_4_1_MINI_ENDPOINT ||
  import.meta.env.AZURE_OPENAI_GPT_4_1_MINI_ENDPOINT ||
  'https://ezazopenai.openai.azure.com/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2025-01-01-preview'

const AZURE_API_KEY =
  import.meta.env.VITE_AZURE_OPENAI_GPT_4_1_MINI_API_KEY ||
  import.meta.env.AZURE_OPENAI_GPT_4_1_MINI_API_KEY ||
  'DzHvSzdiiB0OKZWfG0isvRn1nwqAtHLwQMLMMGF65WA72qeNtR0KJQQJ99BAAC77bzfXJ3w3AAABACOG1pe8'

/** Primary AI provider ('azure' | 'qwen'). Defaults to 'azure' so Azure OpenAI is called directly. */
const PRIMARY_PROVIDER = (
  import.meta.env.VITE_AI_PRIMARY_PROVIDER || 'azure'
)
  .trim()
  .toLowerCase()

export type QwenChatMessage = {
  content: string
  role: 'system' | 'user' | 'assistant'
}

export type QwenChatCompletionsOptions = {
  maxTokens?: number
  messages: QwenChatMessage[]
  /** When true, ask the model to return JSON only (caller still parses). */
  jsonObject?: boolean
}

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
}

export function isAzureOpenAiConfigured(): boolean {
  return Boolean(AZURE_ENDPOINT && AZURE_API_KEY)
}

export function isQwenConfigured(): boolean {
  return Boolean((API_KEY && API_URL) || isAzureOpenAiConfigured())
}

export async function azureOpenAiChatCompletions(
  options: QwenChatCompletionsOptions,
): Promise<string> {
  if (!AZURE_API_KEY || !AZURE_ENDPOINT) {
    throw new Error('Azure OpenAI GPT-4.1-Mini endpoint or API key is not set')
  }

  const body: Record<string, unknown> = {
    max_tokens: options.maxTokens ?? 2048,
    messages: options.messages,
  }

  if (options.jsonObject) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(AZURE_ENDPOINT, {
    body: JSON.stringify(body),
    headers: {
      'api-key': AZURE_API_KEY,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const rawText = await response.text()
  let data: ChatCompletionsResponse = {}
  try {
    data = rawText ? (JSON.parse(rawText) as ChatCompletionsResponse) : {}
  } catch {
    // non-JSON error body
  }

  if (!response.ok) {
    const detail =
      data.error?.message ||
      rawText.slice(0, 300) ||
      `Azure OpenAI request failed (${response.status})`
    throw new Error(detail)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content?.trim()) {
    throw new Error('Azure OpenAI returned an empty response')
  }

  return content.trim()
}

async function rawQwenChatCompletions(
  options: QwenChatCompletionsOptions,
): Promise<string> {
  if (!API_KEY || !API_URL) {
    throw new Error('VITE_QWEN_API_KEY or VITE_QWEN_API_URL is not set')
  }

  const body: Record<string, unknown> = {
    chat_template_kwargs: { enable_thinking: false },
    max_tokens: options.maxTokens ?? 2048,
    messages: options.messages,
    model: MODEL,
  }

  if (options.jsonObject) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(
    `${API_URL.replace(/\/$/, '')}/chat/completions`,
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  )

  const rawText = await response.text()
  let data: ChatCompletionsResponse = {}
  try {
    data = rawText ? (JSON.parse(rawText) as ChatCompletionsResponse) : {}
  } catch {
    // non-JSON error body
  }

  if (!response.ok) {
    const detail =
      data.error?.message ||
      rawText.slice(0, 300) ||
      `Qwen request failed (${response.status})`
    throw new Error(detail)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content?.trim()) {
    throw new Error('Qwen returned an empty response')
  }

  return content.trim()
}

export async function qwenChatCompletions(
  options: QwenChatCompletionsOptions,
): Promise<string> {
  const preferAzure = PRIMARY_PROVIDER === 'azure'

  if (preferAzure) {
    if (isAzureOpenAiConfigured()) {
      try {
        return await azureOpenAiChatCompletions(options)
      } catch (azureErr: any) {
        console.warn(
          'Azure OpenAI call failed, attempting Qwen fallback:',
          azureErr,
        )
      }
    }
    if (API_KEY && API_URL) {
      return await rawQwenChatCompletions(options)
    }
  } else {
    if (API_KEY && API_URL) {
      try {
        return await rawQwenChatCompletions(options)
      } catch (qwenErr: any) {
        console.warn(
          'Qwen call failed, attempting Azure OpenAI fallback:',
          qwenErr,
        )
      }
    }
    if (isAzureOpenAiConfigured()) {
      return await azureOpenAiChatCompletions(options)
    }
  }

  throw new Error('No AI provider available (neither Azure OpenAI nor Qwen is working).')
}

/** Strip optional markdown fences and parse JSON. */
export function parseJsonFromModelContent<T>(content: string): T {
  const trimmed = content.trim()
  let jsonText = trimmed
  if (trimmed.startsWith('```')) {
    const withoutOpen = trimmed.replace(/^```(?:json)?\s*/i, '')
    const closeIdx = withoutOpen.lastIndexOf('```')
    jsonText =
      closeIdx >= 0
        ? withoutOpen.slice(0, closeIdx).trim()
        : withoutOpen.trim()
  }
  return JSON.parse(jsonText) as T
}
