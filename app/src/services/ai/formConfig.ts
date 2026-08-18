import { getField } from '@/helpers/new-field'
import {
  isQwenConfigured,
  parseJsonFromModelContent,
  qwenChatCompletions,
} from '@/services/ai/qwen'

export type FormTypeOption = 'MASTER' | 'WORKFLOW' | 'FEEDBACK'

export interface AiGeneratedField {
  label: string
  type: string
  isMandatory?: boolean
  size?: 'col-3' | 'col-4' | 'col-6' | 'col-12'
  placeholder?: string
  options?: string[]
}

export interface AiGeneratedPanel {
  title: string
  description?: string
  fields: AiGeneratedField[]
}

export interface AiFormConfigSuggestion {
  name: string
  description: string
  formType: FormTypeOption
  reply: string
  panels: AiGeneratedPanel[]
  source: 'qwen' | 'gemini' | 'local'
}

export interface GenerateFormConfigOptions {
  formType: FormTypeOption
  name: string
  description: string
  prompt?: string
}

const SUPPORTED_FIELD_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'TIME',
  'DATE_TIME',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'TABLE',
  'DYNAMIC_TABLE',
  'CURRENCY_AMOUNT',
  'PHONE_NUMBER',
  'EMAIL',
  'FILE_UPLOAD',
  'SIGNATURE',
  'RATING',
  'YES_NO_TOGGLE',
] as const

function buildFormConfigPrompt(options: GenerateFormConfigOptions): string {
  const extraPrompt = options.prompt?.trim()
    ? `\nAdditional requirements: "${options.prompt}"`
    : ''

  return `You are an expert Form Architect designing a business form layout.
Form Details:
- Form Type: ${options.formType} Form (${options.formType === 'MASTER' ? 'Master Data Schema' : 'Workflow Request Process'})
- Form Name: "${options.name}"
- Purpose / Description: "${options.description}"${extraPrompt}

Generate a comprehensive form structure with panels and fields tailored to this purpose.
Supported Field Types: ${SUPPORTED_FIELD_TYPES.join(', ')}
Field Sizes: "col-3", "col-4", "col-6", "col-12"

Guidelines:
- Create 1-4 logical sections (e.g. "General Information", "Details & Specifications", "Approval & Audit")
- Include relevant fields with clear labels, realistic placeholders, proper mandatory status, and sensible grid sizes
- For SINGLE_SELECT or MULTI_SELECT fields, provide a 3-5 item options array
- reply should be 1-2 friendly sentences explaining how the form was structured

Respond with ONLY valid JSON using this exact shape:
{
  "name": "${options.name}",
  "description": "${options.description}",
  "reply": "Summary explanation of form sections",
  "panels": [
    {
      "title": "General Information",
      "description": "Basic details",
      "fields": [
        {
          "label": "Title",
          "type": "SHORT_TEXT",
          "isMandatory": true,
          "size": "col-6",
          "placeholder": "Enter title"
        },
        {
          "label": "Category",
          "type": "SINGLE_SELECT",
          "isMandatory": false,
          "size": "col-6",
          "options": ["Option 1", "Option 2"]
        }
      ]
    }
  ]
}`
}

function extractFieldsArray(rawFields: any): AiGeneratedField[] {
  if (!Array.isArray(rawFields)) return []
  return rawFields.map((f: any) => ({
    isMandatory: Boolean(
      f.isMandatory ||
        f.required ||
        f.isMandatoryField ||
        f.settings?.validation?.fieldRule === 'MANDATORY',
    ),
    label: String(f.label || f.name || f.title || f.fieldName || 'Field').trim(),
    options: Array.isArray(f.options)
      ? f.options.map(String)
      : typeof f.options === 'string'
        ? f.options.split(',').map((s: string) => s.trim())
        : undefined,
    placeholder: String(
      f.placeholder || f.settings?.general?.placeholder || '',
    ),
    size: (['col-3', 'col-4', 'col-6', 'col-12'].includes(
      f.size || f.settings?.general?.size,
    )
      ? f.size || f.settings?.general?.size
      : 'col-6') as any,
    type: String(f.type || f.dataType || 'SHORT_TEXT').toUpperCase(),
  }))
}

function extractPanelsFromRawJson(parsed: any): AiGeneratedPanel[] {
  if (!parsed) return []

  let raw = parsed
  if (parsed.formJson) {
    raw = typeof parsed.formJson === 'string'
      ? JSON.parse(parsed.formJson)
      : parsed.formJson
  } else if (parsed.formPayload) {
    raw = parsed.formPayload
  } else if (parsed.data && (parsed.data.panels || parsed.data.fields)) {
    raw = parsed.data
  }

  // 1. Check if panels array exists
  if (Array.isArray(raw.panels) && raw.panels.length > 0) {
    return raw.panels.map((p: any, idx: number) => ({
      description: String(p.description || p.settings?.description || ''),
      fields: extractFieldsArray(p.fields || p.questions),
      title: String(p.title || p.name || p.settings?.title || `Section ${idx + 1}`),
    }))
  }

  // 2. Check if direct fields exist at top-level or array
  const directFields = Array.isArray(raw.fields)
    ? raw.fields
    : Array.isArray(raw)
      ? raw
      : null

  if (directFields && directFields.length > 0) {
    return [
      {
        description: 'Form details and fields',
        fields: extractFieldsArray(directFields),
        title: 'General Information',
      },
    ]
  }

  return []
}

export function buildLocalFormConfig(
  options: GenerateFormConfigOptions,
): AiFormConfigSuggestion {
  const isWorkflow = options.formType === 'WORKFLOW'
  const isMaster = options.formType === 'MASTER'

  const defaultPanels: AiGeneratedPanel[] = [
    {
      description: `Core parameters and details for ${options.name}`,
      fields: [
        {
          isMandatory: true,
          label: isMaster ? 'Entity Name' : 'Request Title',
          placeholder: 'Enter title or name',
          size: 'col-6',
          type: 'SHORT_TEXT',
        },
        {
          isMandatory: true,
          label: isMaster ? 'Category / Type' : 'Priority Level',
          options: isMaster
            ? ['Category A', 'Category B', 'Category C']
            : ['Low', 'Medium', 'High', 'Urgent'],
          placeholder: 'Select option',
          size: 'col-6',
          type: 'SINGLE_SELECT',
        },
        {
          isMandatory: false,
          label: 'Request / Reference Date',
          placeholder: 'Select date',
          size: 'col-6',
          type: 'DATE',
        },
        {
          isMandatory: false,
          label: isMaster ? 'Status' : 'Department',
          options: isMaster
            ? ['Active', 'Pending', 'Archived']
            : ['Operations', 'Finance', 'HR', 'IT'],
          placeholder: 'Select value',
          size: 'col-6',
          type: 'SINGLE_SELECT',
        },
      ],
      title: 'General Information',
    },
    {
      description: 'Specific notes and documentation',
      fields: [
        {
          isMandatory: false,
          label: 'Detailed Description / Purpose',
          placeholder: 'Provide complete details...',
          size: 'col-12',
          type: 'LONG_TEXT',
        },
        {
          isMandatory: false,
          label: 'Attachment / Supporting Document',
          placeholder: 'Upload document',
          size: 'col-6',
          type: 'FILE_UPLOAD',
        },
        {
          isMandatory: false,
          label: isWorkflow ? 'Estimated Cost' : 'Amount',
          placeholder: '0.00',
          size: 'col-6',
          type: 'CURRENCY_AMOUNT',
        },
      ],
      title: 'Detailed Specifications',
    },
  ]

  return {
    description: options.description,
    formType: options.formType,
    name: options.name,
    panels: defaultPanels,
    reply: `Created a standard ${options.formType.toLowerCase()} form structure for "${options.name}" with 2 organized sections.`,
    source: 'local',
  }
}

export async function generateFormConfigViaQwen(
  options: GenerateFormConfigOptions,
): Promise<AiFormConfigSuggestion> {
  if (!isQwenConfigured()) {
    return buildLocalFormConfig(options)
  }

  const messages = [
    {
      content:
        'You are an expert Form Architect for enterprise document & workflow software. Always respond with valid JSON only.',
      role: 'system' as const,
    },
    {
      content: buildFormConfigPrompt(options),
      role: 'user' as const,
    },
  ]

  try {
    const content = await qwenChatCompletions({
      jsonObject: true,
      maxTokens: 2500,
      messages,
    })

    const parsed = parseJsonFromModelContent<any>(content)
    const panels = extractPanelsFromRawJson(parsed)

    if (panels.length === 0) {
      console.warn('Qwen JSON did not yield panels, using fallback')
      return buildLocalFormConfig(options)
    }

    return {
      description: String(parsed?.description || options.description),
      formType: options.formType,
      name: String(parsed?.name || options.name),
      panels,
      reply:
        String(parsed?.reply || '').trim() ||
        `Generated a complete ${options.formType.toLowerCase()} form layout for "${options.name}".`,
      source: 'qwen',
    }
  } catch (error) {
    console.error('Qwen form generation error, falling back to local:', error)
    return buildLocalFormConfig(options)
  }
}

/**
 * Transforms an AiFormConfigSuggestion into a complete EZOFIS form JSON object
 * compatible with useFormStore.loadForm().
 */
export function buildFormPayloadFromAiSuggestion(
  suggestion: AiFormConfigSuggestion,
) {
  const panels = suggestion.panels.map((panel) => {
    const fields = panel.fields.map((f) => {
      const fieldType = (f.type || 'SHORT_TEXT').toUpperCase()
      const question = getField(fieldType)
      question.label = f.label
      if (question.settings?.general) {
        ;(question.settings.general as any).label = f.label
        if (f.placeholder) {
          question.settings.general.placeholder = f.placeholder
        }
        if (f.size) {
          question.settings.general.size = f.size as any
        }
      }
      if (question.settings?.validation) {
        question.settings.validation.fieldRule = f.isMandatory
          ? 'MANDATORY'
          : 'OPTIONAL'
      }
      if (
        ['SINGLE_SELECT', 'MULTI_SELECT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(
          fieldType,
        ) &&
        question.settings?.specific
      ) {
        if (f.options && f.options.length > 0) {
          question.settings.specific.customOptions = f.options.join(',')
          question.settings.specific.optionsType = 'CUSTOM'
        }
      }
      return question
    })

    return {
      fields,
      id: crypto.randomUUID(),
      settings: {
        description: panel.description || '',
        isCollapsed: false,
        title: panel.title || 'Panel',
      },
    }
  })

  return {
    formJson: JSON.stringify({
      panels,
      secondaryPanels: [],
      settings: {
        general: {
          coordinator: '',
          description: suggestion.description,
          layout: 'typeform',
          name: suggestion.name,
          type: suggestion.formType,
        },
        publish: {
          publishOption: 'DRAFT',
        },
      },
    }),
    panels,
    settings: {
      general: {
        coordinator: '',
        description: suggestion.description,
        layout: 'typeform',
        name: suggestion.name,
        type: suggestion.formType,
      },
      publish: {
        publishOption: 'DRAFT',
      },
    },
  }
}
