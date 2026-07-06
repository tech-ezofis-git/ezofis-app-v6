import { GoogleGenAI } from '@google/genai'

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export interface StreamParams {
  apiKey: string
  provider: 'gemini' | string
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  messages: ChatMessage[]
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: any) => void
}

export const streamChat = async (params: StreamParams) => {
  const {
    apiKey,
    provider,
    model,
    systemPrompt,
    temperature,
    maxTokens,
    messages,
    onChunk,
    onComplete,
    onError,
  } = params

  if (provider === 'gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey })

      // Map messages format for Google GenAI SDK
      const contents = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }))

      const responseStream = await ai.models.generateContentStream({
        model: model || 'gemini-2.0-flash-exp',
        contents,
        config: {
          systemInstruction: systemPrompt || undefined,
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
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
