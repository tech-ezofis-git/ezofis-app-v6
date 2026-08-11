import {
  buildLocalFolderConfig,
  generateFolderConfigViaGemini,
  normalizeFolderDataType,
  type FolderConfigField,
  type FolderConfigReference,
  type FolderConfigSuggestion,
} from '@/services/ai/gemini'
import {
  isQwenConfigured,
  parseJsonFromModelContent,
  qwenChatCompletions,
} from '@/services/ai/qwen'

export type {
  FolderConfigField,
  FolderConfigReference,
  FolderConfigSuggestion,
}

const FOLDER_DATA_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'BOOLEAN',
  'DATE',
  'TIME',
  'DATE_TIME',
  'SINGLE_SELECT',
  'TABLE',
  'BARCODE',
  'OMR',
  'CALCULATED',
  'AUTO_GENERATED',
  'LINK',
  'CURRENCY_AMOUNT',
  'DYNAMIC_TABLE',
] as const

type FolderAiProvider = 'qwen' | 'gemini' | 'local'

function resolveFolderAiProvider(): FolderAiProvider {
  const configured = String(
    import.meta.env.VITE_FOLDER_AI_PROVIDER || '',
  )
    .trim()
    .toLowerCase()

  if (configured === 'qwen' || configured === 'gemini' || configured === 'local') {
    return configured
  }

  if (isQwenConfigured()) return 'qwen'
  if (import.meta.env.VITE_GEMINI_API_KEY) return 'gemini'
  return 'local'
}

function buildFolderConfigPrompt(
  prompt: string,
  reference?: FolderConfigReference | null,
) {
  const referenceHint = reference
    ? `

The user attached a reference file named "${reference.name}" (${reference.mimeType}).
Use it as context to infer a practical folder name, description, and fields that match the document.`
    : ''

  return `You help design document management folder configurations.
User request: "${prompt}"${referenceHint}

Return a practical folder setup for this use case.
- folderName should be short and clear
- description should explain the folder purpose
- fields should cover documents and metadata needed for this folder
- includeInFolderStructure=true for hierarchy levels (e.g. Employee, Document Type)
- includeInFolderStructure=false for document metadata fields (e.g. Employee ID, Payslip Month)
- Prefer these dataType values: ${FOLDER_DATA_TYPES.join(', ')}
- Prefer iconKey values like: building, document, folder, user, calendar, dollar
- reply should be 1-2 short sentences explaining the folder purpose and how fields are organized (e.g. by customer/document type). Do not list every field.

Respond with ONLY a JSON object (no markdown) using this shape:
{
  "folderName": string,
  "description": string,
  "reply": string,
  "fields": [
    {
      "fieldName": string,
      "dataType": string,
      "includeInFolderStructure": boolean,
      "isMandatory": boolean,
      "iconKey": string
    }
  ]
}`
}

function normalizeSuggestion(
  result: FolderConfigSuggestion,
  source: FolderConfigSuggestion['source'],
): FolderConfigSuggestion {
  if (!result?.folderName || !Array.isArray(result.fields)) {
    throw new Error('AI returned an invalid folder configuration')
  }

  return {
    description: String(result.description || ''),
    fields: result.fields.map((field: FolderConfigField) => ({
      dataType: normalizeFolderDataType(field.dataType),
      fieldName: String(field.fieldName || 'Field').trim(),
      iconKey: field.iconKey ? String(field.iconKey) : 'document',
      includeInFolderStructure: Boolean(field.includeInFolderStructure),
      isMandatory: Boolean(field.isMandatory),
    })),
    folderName: String(result.folderName).trim(),
    reply:
      String(result.reply || '').trim() ||
      `I've prepared a folder setup for "${result.folderName}".`,
    source,
  }
}

async function generateFolderConfigViaQwen(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
  reference?: FolderConfigReference | null,
): Promise<FolderConfigSuggestion> {
  if (!isQwenConfigured()) {
    return buildLocalFolderConfig(prompt)
  }

  const messages = [
    {
      content:
        'You are a document management assistant. Always respond with valid JSON only.',
      role: 'system' as const,
    },
    ...history.map((message) => ({
      content: message.text,
      role: message.role,
    })),
    {
      content: buildFolderConfigPrompt(prompt, reference),
      role: 'user' as const,
    },
  ]

  try {
    const content = await qwenChatCompletions({
      jsonObject: true,
      maxTokens: 2048,
      messages,
    })
    const result = parseJsonFromModelContent<FolderConfigSuggestion>(content)
    return normalizeSuggestion(result, 'qwen')
  } catch (error) {
    console.error('Qwen folder config failed, using local fallback:', error)
    return buildLocalFolderConfig(prompt)
  }
}

/**
 * Folder AI entry point used by Document Repository setup and AiFolderBuilder.
 * Provider is selected via VITE_FOLDER_AI_PROVIDER (`qwen` | `gemini` | `local`).
 * Gemini implementation remains intact and is used when provider is `gemini`.
 */
export const generateFolderConfig = async (
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
  reference?: FolderConfigReference | null,
): Promise<FolderConfigSuggestion> => {
  const provider = resolveFolderAiProvider()

  if (provider === 'local') {
    return buildLocalFolderConfig(prompt)
  }

  if (provider === 'gemini') {
    return generateFolderConfigViaGemini(prompt, history, reference)
  }

  return generateFolderConfigViaQwen(prompt, history, reference)
}
