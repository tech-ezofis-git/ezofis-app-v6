import { GoogleGenAI, Type } from '@google/genai'
import { type Question } from '@/pages/form-builder/store/formStore'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!API_KEY) {
  console.warn('VITE_GEMINI_API_KEY is not set in environment variables.')
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' })

export const generateFormFields = async (
  prompt: string,
): Promise<Question[]> => {
  if (!API_KEY) {
    throw new Error('Gemini API Key is missing')
  }

  try {
    const response = await ai.models.generateContent({
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          properties: {
            description: { type: Type.STRING },
            fields: {
              items: {
                properties: {
                  aiRiskScore: {
                    description: 'Predicted drop-off risk (0-100)',
                    type: Type.NUMBER,
                  },
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  options: { items: { type: Type.STRING }, type: Type.ARRAY },
                  placeholder: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  type: {
                    description:
                      'One of: short_text, long_text, email, phone, number, choices, checkbox, dropdown, date, rating',
                    type: Type.STRING,
                  },
                },
                required: ['id', 'type', 'label', 'required'],
                type: Type.OBJECT,
              },
              type: Type.ARRAY,
            },
            title: { type: Type.STRING },
          },
          required: ['title', 'description', 'fields'],
          type: Type.OBJECT,
        },
      },
      contents: [
        {
          parts: [
            {
              text: `Generate a detailed form structure based on this prompt: "${prompt}". 
              Create a professional title, a helpful description, and a set of diverse, relevant fields.
              Each field should have an aiRiskScore (0-100) representing how likely a user is to drop off at that question.`,
            },
          ],
          role: 'user',
        },
      ],
      model: 'gemini-2.0-flash-exp', // Fallback to flash-exp as 3-pro-preview might not be public yet, or use user's suggestion if available
    })

    const result = JSON.parse(response.text || '{}')

    if (!result) return []

    // Map the result to our Question type
    // We might need to handle the title/description return if we want to use them
    // For now, returning just questions to match signature
    // TODO: Update store to accept form title/desc if needed

    return result.fields.map((f: any) => ({
      aiRiskScore: f.aiRiskScore,
      description: '', // Schema doesn't have per-field desc, only form desc
      id: f.id || crypto.randomUUID(),
      options: f.options,
      placeholder: f.placeholder,
      required: f.required,
      title: f.label,
      type: mapType(f.type),
    }))
  } catch (error) {
    console.error('Error generating form fields:', error)
    throw error
  }
}

export async function suggestImprovements(formJson: string) {
  console.log(formJson)
  // Placeholder for improvement suggestion if we needed it later
  return []
}

function mapType(apiType: string): string {
  // Map API types to internal types if needed, or ensure they match
  // internal: 'short_text' | 'email' | 'phone' | 'choices' | 'dropdown' | 'checkbox' | 'date' | 'rating' | 'long_text' | 'number'
  const typeMap: Record<string, string> = {
    address: 'long_text', // fallback
    file_upload: 'short_text', // fallback
    multiple_choice: 'choices',
    slider: 'number', // fallback
    url: 'short_text', // fallback
    yes_no: 'choices', // fallback
  }
  return typeMap[apiType] || apiType
}
