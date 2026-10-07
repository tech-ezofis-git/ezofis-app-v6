import { GoogleGenAI, Type } from '@google/genai'
import { type Question } from '@/pages/form-builder/store/formStore'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!API_KEY) {
  console.warn('VITE_GEMINI_API_KEY is not set in environment variables.')
}

let aiClient: GoogleGenAI | null = null

const getAiClient = () => {
  if (!API_KEY) {
    throw new Error('Gemini API Key is missing')
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY })
  }
  return aiClient
}

const FREE_FOLDER_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
] as const

export const generateFormFields = async (
  prompt: string,
): Promise<Question[]> => {
  if (!API_KEY) {
    throw new Error('Gemini API Key is missing')
  }

  try {
    const response = await getAiClient().models.generateContent({
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
      model: 'gemini-2.5-flash-lite',
    })

    const result = JSON.parse(response.text || '{}')

    if (!result) return []

    return result.fields.map((f: any) => ({
      aiRiskScore: f.aiRiskScore,
      description: '',
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

export type FolderConfigField = {
  dataType: string
  fieldName: string
  iconKey?: string
  includeInFolderStructure: boolean
  isMandatory: boolean
  settings?: Record<string, any>
}

export type FolderConfigSuggestion = {
  description: string
  fields: FolderConfigField[]
  folderName: string
  reply: string
  source?: 'gemini' | 'qwen' | 'local'
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

const isRetryableModelError = (error: unknown) => {
  const text = String(
    (error as { message?: string })?.message ||
      JSON.stringify(error) ||
      error ||
      '',
  ).toLowerCase()
  return (
    text.includes('429') ||
    text.includes('404') ||
    text.includes('not_found') ||
    text.includes('not found') ||
    text.includes('resource_exhausted') ||
    text.includes('quota') ||
    text.includes('rate-limit') ||
    text.includes('rate limit') ||
    text.includes('unavailable')
  )
}

export const buildLocalFolderConfig = (
  prompt: string,
): FolderConfigSuggestion => {
  const text = prompt.toLowerCase()

  if (
    text.includes('hr') ||
    text.includes('employee') ||
    text.includes('payslip') ||
    text.includes('payroll')
  ) {
    return {
      description:
        'Store employee records, payslips, and HR documents with a clear employee-based structure.',
      fields: [
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Employee',
          iconKey: 'user',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SINGLE_SELECT',
          fieldName: 'Document Type',
          iconKey: 'document',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Employee ID',
          iconKey: 'user',
          includeInFolderStructure: false,
          isMandatory: true,
        },
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Department',
          iconKey: 'building',
          includeInFolderStructure: false,
          isMandatory: false,
        },
        {
          dataType: 'DATE',
          fieldName: 'Payslip Month',
          iconKey: 'calendar',
          includeInFolderStructure: false,
          isMandatory: true,
        },
        {
          dataType: 'CURRENCY_AMOUNT',
          fieldName: 'Net Pay',
          iconKey: 'dollar',
          includeInFolderStructure: false,
          isMandatory: false,
        },
      ],
      folderName: 'HR',
      reply:
        "I've set up an HR folder for payslips and employee documents, organized by employee and document type so you can find records quickly.",
      source: 'local',
    }
  }

  if (
    text.includes('receivable') ||
    text.includes('ar ') ||
    text.includes('customer invoice') ||
    text.includes('incoming payment')
  ) {
    return {
      description:
        'Folder structure for managing customer invoices, payment receipts, and credit memos to track incoming revenue.',
      fields: [
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Customer name',
          iconKey: 'user',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SINGLE_SELECT',
          fieldName: 'Document type',
          iconKey: 'document',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Invoice number',
          iconKey: 'document',
          includeInFolderStructure: false,
          isMandatory: true,
        },
        {
          dataType: 'DATE',
          fieldName: 'Invoice date',
          iconKey: 'calendar',
          includeInFolderStructure: false,
          isMandatory: true,
        },
        {
          dataType: 'DATE',
          fieldName: 'Due date',
          iconKey: 'calendar',
          includeInFolderStructure: false,
          isMandatory: false,
        },
        {
          dataType: 'CURRENCY_AMOUNT',
          fieldName: 'Amount',
          iconKey: 'dollar',
          includeInFolderStructure: false,
          isMandatory: true,
        },
      ],
      folderName: 'Accounts Receivable',
      reply:
        "I've created the Accounts Receivable folder structure for you, organized by customer and document type to help you manage incoming payments and invoices efficiently.",
      source: 'local',
    }
  }

  if (
    text.includes('account') ||
    text.includes('payable') ||
    text.includes('invoice') ||
    text.includes('vendor') ||
    text.includes('po')
  ) {
    return {
      description:
        'Manage supplier invoices, purchase orders, and AP supporting documents.',
      fields: [
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Supplier',
          iconKey: 'building',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SINGLE_SELECT',
          fieldName: 'Document Type',
          iconKey: 'document',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'PO Number',
          iconKey: 'folder',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Invoice Number',
          iconKey: 'document',
          includeInFolderStructure: false,
          isMandatory: true,
        },
        {
          dataType: 'DATE',
          fieldName: 'Invoice Date',
          iconKey: 'calendar',
          includeInFolderStructure: false,
          isMandatory: false,
        },
        {
          dataType: 'CURRENCY_AMOUNT',
          fieldName: 'Amount',
          iconKey: 'dollar',
          includeInFolderStructure: false,
          isMandatory: true,
        },
      ],
      folderName: 'Accounts Payable',
      reply:
        "I've created an Accounts Payable folder for invoices, POs, and vendor bills, organized by supplier and document type so AP docs stay easy to find.",
      source: 'local',
    }
  }

  if (
    text.includes('legal') ||
    text.includes('contract') ||
    text.includes('compliance')
  ) {
    return {
      description:
        'Store contracts, agreements, and compliance documents by party and document type.',
      fields: [
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Party',
          iconKey: 'building',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SINGLE_SELECT',
          fieldName: 'Document Type',
          iconKey: 'document',
          includeInFolderStructure: true,
          isMandatory: true,
        },
        {
          dataType: 'SHORT_TEXT',
          fieldName: 'Contract Number',
          iconKey: 'folder',
          includeInFolderStructure: false,
          isMandatory: true,
        },
        {
          dataType: 'DATE',
          fieldName: 'Effective Date',
          iconKey: 'calendar',
          includeInFolderStructure: false,
          isMandatory: false,
        },
        {
          dataType: 'DATE',
          fieldName: 'Expiry Date',
          iconKey: 'calendar',
          includeInFolderStructure: false,
          isMandatory: false,
        },
      ],
      folderName: 'Legal',
      reply:
        "I've set up a Legal folder for contracts and compliance docs, organized by party and document type so agreements stay easy to track.",
      source: 'local',
    }
  }

  const topic =
    prompt
      .replace(/create|need|folder|documents?|related|for|an|a|the/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 3)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Documents'

  return {
    description: `Document folder for ${topic.toLowerCase()} with structure and metadata fields.`,
    fields: [
      {
        dataType: 'SHORT_TEXT',
        fieldName: 'Category',
        iconKey: 'folder',
        includeInFolderStructure: true,
        isMandatory: true,
      },
      {
        dataType: 'SINGLE_SELECT',
        fieldName: 'Document Type',
        iconKey: 'document',
        includeInFolderStructure: true,
        isMandatory: true,
      },
      {
        dataType: 'SHORT_TEXT',
        fieldName: 'Document Number',
        iconKey: 'document',
        includeInFolderStructure: false,
        isMandatory: false,
      },
      {
        dataType: 'DATE',
        fieldName: 'Document Date',
        iconKey: 'calendar',
        includeInFolderStructure: false,
        isMandatory: false,
      },
    ],
    folderName: topic,
    reply: `I've prepared a starter folder setup for "${topic}", with a simple category and document-type structure you can refine next.`,
    source: 'local',
  }
}

export type FolderConfigReference = {
  dataBase64: string
  mimeType: string
  name: string
}

/** Hidden Gemini path — use generateFolderConfig from folderConfig.ts (provider switch). */
export const generateFolderConfigViaGemini = async (
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
  reference?: FolderConfigReference | null,
): Promise<FolderConfigSuggestion> => {
  if (!API_KEY) {
    return buildLocalFolderConfig(prompt)
  }

  const referenceHint = reference
    ? `

The user attached a reference file named "${reference.name}" (${reference.mimeType}).
Use it as context to infer a practical folder name, description, and fields that match the document.`
    : ''

  const userParts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [
    {
      text: `You help design document management folder configurations.
User request: "${prompt}"${referenceHint}

Return a practical folder setup for this use case.
- folderName should be short and clear
- description should explain the folder purpose
- fields should cover documents and metadata needed for this folder
- includeInFolderStructure=true for hierarchy levels (e.g. Employee, Document Type)
- includeInFolderStructure=false for document metadata fields (e.g. Employee ID, Payslip Month)
- isMandatory should only be true when essential (e.g., Invoice Number, Amount Due, or folder hierarchy levels). Leave the rest as false (optional) so users see both Required and Optional states side by side.
- Prefer these dataType values: ${FOLDER_DATA_TYPES.join(', ')}
- Prefer iconKey values like: building, document, folder, user, calendar, dollar
- reply should be 1-2 short sentences explaining the folder purpose and how fields are organized (e.g. by customer/document type). Do not list every field.`,
    },
  ]

  if (reference?.dataBase64 && reference.mimeType) {
    userParts.push({
      inlineData: {
        data: reference.dataBase64,
        mimeType: reference.mimeType,
      },
    })
  }

  const contents = [
    ...history.map((message) => ({
      parts: [{ text: message.text }],
      role: message.role === 'assistant' ? 'model' : 'user',
    })),
    {
      parts: userParts,
      role: 'user',
    },
  ]

  let lastError: unknown = null

  for (const model of FREE_FOLDER_MODELS) {
    try {
      const response = await getAiClient().models.generateContent({
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            properties: {
              description: { type: Type.STRING },
              fields: {
                items: {
                  properties: {
                    dataType: { type: Type.STRING },
                    fieldName: { type: Type.STRING },
                    iconKey: { type: Type.STRING },
                    includeInFolderStructure: { type: Type.BOOLEAN },
                    isMandatory: { type: Type.BOOLEAN },
                  },
                  required: [
                    'fieldName',
                    'dataType',
                    'includeInFolderStructure',
                    'isMandatory',
                  ],
                  type: Type.OBJECT,
                },
                type: Type.ARRAY,
              },
              folderName: { type: Type.STRING },
              reply: { type: Type.STRING },
            },
            required: ['folderName', 'description', 'fields', 'reply'],
            type: Type.OBJECT,
          },
        },
        contents,
        model,
      })

      const result = JSON.parse(response.text || '{}') as FolderConfigSuggestion

      if (!result?.folderName || !Array.isArray(result.fields)) {
        throw new Error('AI returned an invalid folder configuration')
      }

      return {
        description: String(result.description || ''),
        fields: result.fields.map((field) => ({
          dataType: normalizeFolderDataType(field.dataType),
          fieldName: String(field.fieldName || 'Field').trim(),
          iconKey: field.iconKey ? String(field.iconKey) : 'document',
          includeInFolderStructure: Boolean(field.includeInFolderStructure),
          isMandatory: Boolean(field.isMandatory),
          settings: (field as any).settings,
        })),
        folderName: String(result.folderName).trim(),
        reply:
          String(result.reply || '').trim() ||
          `I've prepared a folder setup for "${result.folderName}".`,
        source: 'gemini',
      }
    } catch (error) {
      lastError = error
      if (!isRetryableModelError(error)) {
        break
      }
    }
  }

  if (isRetryableModelError(lastError)) {
    return buildLocalFolderConfig(prompt)
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not generate folder configuration')
}

export function normalizeFolderDataType(value: string) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  const aliases: Record<string, string> = {
    BOOL: 'BOOLEAN',
    CURRENCY: 'CURRENCY_AMOUNT',
    DROPDOWN: 'SINGLE_SELECT',
    LONGTEXT: 'LONG_TEXT',
    SELECT: 'SINGLE_SELECT',
    SHORTTEXT: 'SHORT_TEXT',
    TEXT: 'SHORT_TEXT',
    TOGGLE: 'BOOLEAN',
    URL: 'LINK',
    YES_NO: 'BOOLEAN',
    YES_NO_TOGGLE: 'BOOLEAN',
  }

  const mapped = aliases[normalized] || normalized
  return FOLDER_DATA_TYPES.includes(
    mapped as (typeof FOLDER_DATA_TYPES)[number],
  )
    ? mapped
    : 'SHORT_TEXT'
}

export async function suggestImprovements(formJson: string) {
  console.log(formJson)
  return []
}

function mapType(apiType: string): string {
  const typeMap: Record<string, string> = {
    address: 'long_text',
    file_upload: 'short_text',
    multiple_choice: 'choices',
    slider: 'number',
    url: 'short_text',
    yes_no: 'choices',
  }
  return typeMap[apiType] || apiType
}
