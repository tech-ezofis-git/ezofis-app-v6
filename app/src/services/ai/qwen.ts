const API_URL =
  import.meta.env.VITE_QWEN_API_URL || '/qwen-proxy/v1'
const API_KEY = import.meta.env.VITE_QWEN_API_KEY || ''
const MODEL = import.meta.env.VITE_QWEN_MODEL || 'qwen3.5-9b'

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

export function isQwenConfigured() {
  return Boolean(API_KEY && API_URL)
}

export async function qwenChatCompletions(
  options: QwenChatCompletionsOptions,
): Promise<string> {
  if (!API_KEY) {
    throw new Error('VITE_QWEN_API_KEY is not set')
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

  const response = await fetch(`${API_URL.replace(/\/$/, '')}/chat/completions`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${API_KEY}`,
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
      `Qwen request failed (${response.status})`
    throw new Error(detail)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content?.trim()) {
    throw new Error('Qwen returned an empty response')
  }

  return content.trim()
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
