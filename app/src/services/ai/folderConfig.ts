import {
  buildLocalFolderConfig,
  type FolderConfigField,
  type FolderConfigReference,
  type FolderConfigSuggestion,
  generateFolderConfigViaGemini,
  normalizeFolderDataType,
} from '@/services/ai/gemini'
import {
  isQwenConfigured,
  parseJsonFromModelContent,
  qwenChatCompletions,
} from '@/services/ai/qwen'

export type { FolderConfigField, FolderConfigReference, FolderConfigSuggestion }

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

const ACRONYMS = new Set([
  'AP',
  'AR',
  'HR',
  'PO',
  'IT',
  'ERP',
  'ID',
  'VAT',
  'GST',
  'SLA',
  'KPI',
  'DMS',
  'CRM',
  'API',
])

export function shortenDescription(input: string, maxChars = 75): string {
  if (!input) return ''

  let cleaned = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(
      /^(this\s+(is\s+a\s+)?(folder|repository|form|workflow|process)\s+(designed|built|created)\s+to\s+)/i,
      'Folder to ',
    )
    .replace(/^an?\s+(automated|end-to-end)\s+/i, '')
    .replace(
      /^this\s+(folder|repository)\s+(allows|stores|manages|captures|collects)\s+/i,
      'Folder to $2 ',
    )
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.includes('.')) {
    const firstSentence = cleaned.split('.')[0].trim()
    if (firstSentence.length >= 12) {
      cleaned = firstSentence + '.'
    }
  }

  if (
    !cleaned.endsWith('.') &&
    !cleaned.endsWith('!') &&
    !cleaned.endsWith('?')
  ) {
    cleaned += '.'
  }

  if (cleaned.length > maxChars) {
    const trimmed = cleaned.slice(0, maxChars)
    const lastSpace = trimmed.lastIndexOf(' ')
    cleaned =
      (lastSpace > 15 ? trimmed.slice(0, lastSpace) : trimmed).trim() + '...'
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function shortenFolderName(input: string): string {
  if (!input) return 'Custom Folder'

  let cleaned = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(
      /^(create|build|make|generate|design|setup|new)\s+(a|an|the)?\s*/i,
      '',
    )
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\s+(folder|repository|system|process|layout)\s+for\s+/i, ' ')
    .replace(/\s+for\s+/i, ' ')
    .replace(/\s+(with|to|that|which|and)\s+.*$/i, '')
    .replace(/[^a-zA-Z0-9\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) cleaned = input.trim().split('.')[0]

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length > 1 && words[words.length - 1].toLowerCase() === 'folder') {
    words.pop()
  }

  const shortWords = words.slice(0, 3)
  if (
    shortWords.length > 0 &&
    ['&', '-', '/'].includes(shortWords[shortWords.length - 1])
  ) {
    shortWords.pop()
  }

  let result = shortWords.join(' ')
  if (result.length > 25) {
    result = result.slice(0, 25).trim()
  }

  if (!result) return 'Custom Folder'

  return result
    .split(' ')
    .map((w) => {
      const upper = w.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function buildFolderConfigPrompt(
  prompt: string,
  reference?: FolderConfigReference | null,
) {
  const referenceHint = reference
    ? `\nThe user attached a reference file named "${reference.name}" (${reference.mimeType}). Use it to infer folder setup.`
    : ''

  return `You help design document management folder configurations.
User request: "${prompt}"${referenceHint}

Guidelines:
- "folderName": Keep it very short, clean, proper spacing, and meaningful (1-3 words max, e.g. "AP Invoice", "HR Documents", "Contracts").
- "description": Keep it short and concise (1 simple sentence, max 8-10 words, ~60 chars max). Do NOT write long text paragraphs.
- "fields": cover essential metadata for this folder
- includeInFolderStructure=true for hierarchy levels (e.g. Employee, Document Type)
- includeInFolderStructure=false for document metadata fields (e.g. Employee ID, Payslip Month)
- "isMandatory": only mark fields as true when essential (e.g., Invoice Number, Amount Due, or folder structure levels). Leave the rest as false (optional) so users see both Required and Optional states side by side.
- Prefer dataType values: ${FOLDER_DATA_TYPES.join(', ')}
- reply: 1 short sentence summarizing folder purpose.

Respond ONLY with valid JSON using this shape:
{
  "folderName": "Short Name",
  "description": "Short 1-sentence description",
  "reply": "Short summary",
  "fields": [
    {
      "fieldName": "Field Name",
      "dataType": "SHORT_TEXT",
      "includeInFolderStructure": false,
      "isMandatory": true,
      "iconKey": "document"
    }
  ]
}`
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
        'You are an enterprise document management architect. Always respond with valid JSON only.',
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

function normalizeSuggestion(
  result: FolderConfigSuggestion,
  source: FolderConfigSuggestion['source'],
): FolderConfigSuggestion {
  if (!result?.folderName || !Array.isArray(result.fields)) {
    throw new Error('AI returned an invalid folder configuration')
  }

  const folderName = shortenFolderName(String(result.folderName))
  const description = shortenDescription(
    String(
      result.description || `Folder setup for ${folderName.toLowerCase()}.`,
    ),
  )

  return {
    description,
    fields: result.fields.map((field: FolderConfigField) => ({
      dataType: normalizeFolderDataType(field.dataType),
      fieldName: String(field.fieldName || 'Field').trim(),
      iconKey: field.iconKey ? String(field.iconKey) : 'document',
      includeInFolderStructure: Boolean(field.includeInFolderStructure),
      isMandatory: Boolean(field.isMandatory),
      settings: field.settings,
    })),
    folderName,
    reply:
      String(result.reply || '').trim() ||
      `Prepared folder setup for "${folderName}".`,
    source,
  }
}

function resolveFolderAiProvider(): FolderAiProvider {
  const configured = String(import.meta.env.VITE_FOLDER_AI_PROVIDER || '')
    .trim()
    .toLowerCase()

  if (
    configured === 'qwen' ||
    configured === 'gemini' ||
    configured === 'local'
  ) {
    return configured
  }

  if (isQwenConfigured()) return 'qwen'
  if (import.meta.env.VITE_GEMINI_API_KEY) return 'gemini'
  return 'local'
}

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
    const suggestion = await generateFolderConfigViaGemini(
      prompt,
      history,
      reference,
    )
    return normalizeSuggestion(suggestion, 'gemini')
  }

  return generateFolderConfigViaQwen(prompt, history, reference)
}
