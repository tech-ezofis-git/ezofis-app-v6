import { GoogleGenAI, Type } from "@google/genai";
import { type Question } from "@/pages/form-builder/store/formStore";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

export const generateFormFields = async (prompt: string): Promise<Question[]> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is missing");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Fallback to flash-exp as 3-pro-preview might not be public yet, or use user's suggestion if available
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a detailed form structure based on this prompt: "${prompt}". 
              Create a professional title, a helpful description, and a set of diverse, relevant fields.
              Each field should have an aiRiskScore (0-100) representing how likely a user is to drop off at that question.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { 
                    type: Type.STRING,
                    description: "One of: short_text, long_text, email, phone, number, choices, checkbox, dropdown, date, rating"
                  },
                  label: { type: Type.STRING },
                  placeholder: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  aiRiskScore: { type: Type.NUMBER, description: "Predicted drop-off risk (0-100)" }
                },
                required: ["id", "type", "label", "required"]
              }
            }
          },
          required: ["title", "description", "fields"]
        }
      },
    });

    const result = JSON.parse(response.text || '{}');
    
    if (!result) return [];

    // Map the result to our Question type
    // We might need to handle the title/description return if we want to use them
    // For now, returning just questions to match signature
    // TODO: Update store to accept form title/desc if needed
    
    return result.fields.map((f: any) => ({
        id: f.id || crypto.randomUUID(),
        title: f.label,
        description: "", // Schema doesn't have per-field desc, only form desc
        type: mapType(f.type),
        placeholder: f.placeholder,
        options: f.options,
        required: f.required,
        aiRiskScore: f.aiRiskScore
    }));

  } catch (error) {
    console.error("Error generating form fields:", error);
    throw error;
  }
};

function mapType(apiType: string): string {
    // Map API types to internal types if needed, or ensure they match
    // internal: 'short_text' | 'email' | 'phone' | 'choices' | 'dropdown' | 'checkbox' | 'date' | 'rating' | 'long_text' | 'number'
    const typeMap: Record<string, string> = {
        'multiple_choice': 'choices',
        'file_upload': 'short_text', // fallback
        'url': 'short_text', // fallback
        'yes_no': 'choices', // fallback
        'slider': 'number', // fallback
        'address': 'long_text', // fallback
    };
    return typeMap[apiType] || apiType;
}

export async function suggestImprovements(formJson: string) {
  console.log(formJson)
    // Placeholder for improvement suggestion if we needed it later
    return [];
}
