import { GoogleGenAI } from '@google/genai'

export interface ChatMessage {
  content: string
  role: 'user' | 'model'
}

export interface StreamParams {
  apiKey: string
  maxTokens: number
  messages: ChatMessage[]
  model: string
  provider: 'gemini' | string
  systemPrompt: string
  temperature: number
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: any) => void
}

export const streamChat = async (params: StreamParams) => {
  const {
    apiKey,
    maxTokens,
    messages,
    model,
    provider,
    systemPrompt,
    temperature,
    onChunk,
    onComplete,
    onError,
  } = params

  if (provider === 'gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey })

      // Map messages format for Google GenAI SDK
      const contents = messages.map((m) => ({
        parts: [{ text: m.content }],
        role: m.role,
      }))

      const responseStream = await ai.models.generateContentStream({
        config: {
          maxOutputTokens: maxTokens,
          systemInstruction: systemPrompt || undefined,
          temperature: temperature,
        },
        contents,
        model: model || 'gemini-2.0-flash-exp',
      })

      let fullText = ''
      for await (const chunk of responseStream) {
        const text = chunk.text || ''
        fullText += text
        onChunk(text)
      }
      onComplete(fullText)
    } catch (err) {
      console.error('Error streaming Gemini response:', err)
      onError(err)
    }
  } else {
    onError(new Error(`Unsupported provider: ${provider}`))
  }
}
