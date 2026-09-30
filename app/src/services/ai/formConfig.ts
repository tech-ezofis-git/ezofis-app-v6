import { getField } from '@/helpers/new-field'
import {
  isQwenConfigured,
  parseJsonFromModelContent,
  qwenChatCompletions,
} from '@/services/ai/qwen'

export interface AiFormConfigSuggestion {
  description: string
  formType: FormTypeOption
  name: string
  panels: AiGeneratedPanel[]
  reply: string
  source: 'qwen' | 'gemini' | 'local'
  action?: 'INFO' | 'UPDATE' | 'REMOVE_FORM'
  removedFieldIds?: string[]
  removedPanelIds?: string[]
}

export interface AiGeneratedField {
  label: string
  type: string
  id?: string
  isMandatory?: boolean
  options?: string[]
  placeholder?: string
  size?: 'col-3' | 'col-4' | 'col-6' | 'col-12'
}

export interface AiGeneratedPanel {
  fields: AiGeneratedField[]
  title: string
  description?: string
  id?: string
}

export type FormTypeOption = 'MASTER' | 'WORKFLOW' | 'FEEDBACK'

export interface GenerateFormConfigOptions {
  description: string
  formType: FormTypeOption
  name: string
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

export interface FormAssistantOptions {
  formState: any
  userPrompt: string
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
      question.id = f.id || question.id
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
        [
          'SINGLE_SELECT',
          'MULTI_SELECT',
          'SINGLE_CHOICE',
          'MULTIPLE_CHOICE',
        ].includes(fieldType) &&
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
      id: panel.id || crypto.randomUUID(),
      settings: {
        description: panel.description || '',
        isCollapsed: false,
        title: panel.title || 'Panel',
      },
    }
  })

  return {
    action: suggestion.action || 'UPDATE',
    description: suggestion.description,
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
    formType: suggestion.formType,
    name: suggestion.name,
    panels,
    removedFieldIds: suggestion.removedFieldIds,
    removedPanelIds: suggestion.removedPanelIds,
    reply: suggestion.reply,
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

export function buildLocalFormConfig(
  options: GenerateFormConfigOptions,
): AiFormConfigSuggestion {
  const promptText = (
    options.prompt ||
    options.description ||
    options.name ||
    ''
  ).toLowerCase()

  let generatedPanels: AiGeneratedPanel[] = []

  if (promptText.includes('onboarding') || promptText.includes('employee')) {
    generatedPanels = [
      {
        description: 'Employee details and joining parameters',
        fields: [
          {
            isMandatory: true,
            label: 'Full Name',
            placeholder: 'Enter employee full name',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Department',
            options: [
              'Engineering',
              'Finance',
              'Human Resources',
              'Sales',
              'Operations',
            ],
            placeholder: 'Select department',
            size: 'col-6',
            type: 'SINGLE_SELECT',
          },
          {
            isMandatory: true,
            label: 'Job Title',
            placeholder: 'e.g. Senior Software Engineer',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Joining Date',
            placeholder: 'Select joining date',
            size: 'col-6',
            type: 'DATE',
          },
          {
            isMandatory: true,
            label: 'Employment Type',
            options: ['Full Time', 'Part Time', 'Contractor', 'Intern'],
            placeholder: 'Select type',
            size: 'col-6',
            type: 'SINGLE_SELECT',
          },
          {
            isMandatory: true,
            label: 'Work Email',
            placeholder: 'employee@company.com',
            size: 'col-6',
            type: 'EMAIL',
          },
          {
            isMandatory: false,
            label: 'Contact Phone',
            placeholder: '+1 234 567 8900',
            size: 'col-6',
            type: 'PHONE_NUMBER',
          },
          {
            isMandatory: false,
            label: 'Emergency Contact Name',
            placeholder: 'Enter contact name',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
        ],
        title: 'Personal & Position Details',
      },
      {
        description: 'Identity documents and certifications',
        fields: [
          {
            isMandatory: true,
            label: 'Identity / Passport Document',
            placeholder: 'Upload Passport or National ID',
            size: 'col-12',
            type: 'FILE_UPLOAD',
          },
          {
            isMandatory: false,
            label: 'Resume / Offer Letter',
            placeholder: 'Upload offer letter or resume',
            size: 'col-12',
            type: 'FILE_UPLOAD',
          },
        ],
        title: 'Required Documentation',
      },
    ]
  } else if (
    promptText.includes('leave') ||
    promptText.includes('vacation') ||
    promptText.includes('time off')
  ) {
    generatedPanels = [
      {
        description: 'Leave request parameters and dates',
        fields: [
          {
            isMandatory: true,
            label: 'Employee Name',
            placeholder: 'Enter employee name',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Leave Type',
            options: [
              'Annual Leave',
              'Sick Leave',
              'Casual Leave',
              'Maternity / Paternity',
              'Unpaid Leave',
            ],
            placeholder: 'Select leave type',
            size: 'col-6',
            type: 'SINGLE_SELECT',
          },
          {
            isMandatory: true,
            label: 'Start Date',
            placeholder: 'Select start date',
            size: 'col-6',
            type: 'DATE',
          },
          {
            isMandatory: true,
            label: 'End Date',
            placeholder: 'Select end date',
            size: 'col-6',
            type: 'DATE',
          },
          {
            isMandatory: false,
            label: 'Total Number of Days',
            placeholder: 'e.g. 5',
            size: 'col-6',
            type: 'NUMBER',
          },
          {
            isMandatory: false,
            label: 'Handover Person / Contact',
            placeholder: 'Enter colleague name',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Reason for Leave',
            placeholder: 'Provide detailed reason...',
            size: 'col-12',
            type: 'LONG_TEXT',
          },
          {
            isMandatory: false,
            label: 'Medical Certificate / Document',
            placeholder: 'Upload supporting document',
            size: 'col-12',
            type: 'FILE_UPLOAD',
          },
        ],
        title: 'Leave Request Information',
      },
    ]
  } else if (
    promptText.includes('purchase') ||
    promptText.includes('requisition') ||
    promptText.includes('po')
  ) {
    generatedPanels = [
      {
        description: 'Requisition details and cost estimation',
        fields: [
          {
            isMandatory: true,
            label: 'Requisition Title',
            placeholder: 'e.g. IT Laptops Purchase',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Requesting Department',
            options: ['IT', 'Operations', 'Finance', 'Marketing', 'Facilities'],
            placeholder: 'Select department',
            size: 'col-6',
            type: 'SINGLE_SELECT',
          },
          {
            isMandatory: true,
            label: 'Vendor / Supplier Name',
            placeholder: 'Enter vendor name',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Estimated Total Cost',
            placeholder: '0.00',
            size: 'col-6',
            type: 'CURRENCY_AMOUNT',
          },
          {
            isMandatory: true,
            label: 'Required Delivery Date',
            placeholder: 'Select date',
            size: 'col-6',
            type: 'DATE',
          },
          {
            isMandatory: false,
            label: 'Budget Code',
            placeholder: 'e.g. CAPEX-2026-09',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Business Justification',
            placeholder: 'Explain why this purchase is required...',
            size: 'col-12',
            type: 'LONG_TEXT',
          },
          {
            isMandatory: false,
            label: 'Vendor Quotation Attachment',
            placeholder: 'Upload quote',
            size: 'col-12',
            type: 'FILE_UPLOAD',
          },
        ],
        title: 'Purchase Requisition Details',
      },
    ]
  } else if (
    promptText.includes('invoice') ||
    promptText.includes('accounts payable') ||
    promptText.includes('ap')
  ) {
    generatedPanels = [
      {
        description: 'Vendor & invoice header parameters',
        fields: [
          {
            isMandatory: true,
            label: 'Vendor Name',
            placeholder: 'Enter supplier name',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Invoice Number',
            placeholder: 'e.g. INV-99481',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'PO Number',
            placeholder: 'e.g. PO-2026-104',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Invoice Date',
            placeholder: 'Select invoice date',
            size: 'col-6',
            type: 'DATE',
          },
          {
            isMandatory: true,
            label: 'Total Invoice Amount',
            placeholder: '0.00',
            size: 'col-6',
            type: 'CURRENCY_AMOUNT',
          },
          {
            isMandatory: false,
            label: 'Tax Amount',
            placeholder: '0.00',
            size: 'col-6',
            type: 'CURRENCY_AMOUNT',
          },
          {
            isMandatory: true,
            label: 'Currency',
            options: ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR'],
            placeholder: 'Select currency',
            size: 'col-6',
            type: 'SINGLE_SELECT',
          },
          {
            isMandatory: false,
            label: 'Payment Terms',
            options: ['Net 30', 'Net 60', 'Immediate', 'Due upon receipt'],
            placeholder: 'Select terms',
            size: 'col-6',
            type: 'SINGLE_SELECT',
          },
          {
            isMandatory: true,
            label: 'Original Invoice File',
            placeholder: 'Upload scanned invoice PDF',
            size: 'col-12',
            type: 'FILE_UPLOAD',
          },
        ],
        title: 'Invoice Information',
      },
    ]
  } else if (promptText.includes('feedback')) {
    generatedPanels = [
      {
        description: 'User ratings and detailed feedback',
        fields: [
          {
            isMandatory: true,
            label: 'Respondent Name',
            placeholder: 'Enter your full name',
            size: 'col-6',
            type: 'SHORT_TEXT',
          },
          {
            isMandatory: true,
            label: 'Email Address',
            placeholder: 'yourname@example.com',
            size: 'col-6',
            type: 'EMAIL',
          },
          {
            isMandatory: true,
            label: 'Feedback Category',
            options: [
              'Product Experience',
              'Customer Service',
              'Bug Report',
              'Feature Request',
            ],
            placeholder: 'Select category',
            size: 'col-6',
            type: 'SINGLE_SELECT',
          },
          {
            isMandatory: true,
            label: 'Overall Rating',
            placeholder: 'Rate 1 to 5',
            size: 'col-6',
            type: 'RATING',
          },
          {
            isMandatory: true,
            label: 'Detailed Comments & Suggestions',
            placeholder: 'Share your detailed feedback...',
            size: 'col-12',
            type: 'LONG_TEXT',
          },
        ],
        title: 'Feedback Details',
      },
    ]
  } else {
    const isWorkflow = options.formType === 'WORKFLOW'
    const isMaster = options.formType === 'MASTER'

    generatedPanels = [
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
            size: 'col-12',
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
  }

  const meta = generateSimpleFormMeta(
    options.prompt || options.description || options.name,
  )

  return {
    description: meta.description,
    formType: options.formType,
    name: meta.name,
    panels: generatedPanels,
    reply: `Created form structure for "${meta.name}".`,
    source: 'local',
  }
}

export function formatFormStateForAi(formState: any) {
  const name = formState.name || 'Untitled Form'
  const description = formState.description || ''
  const formType = formState.formType || 'WORKFLOW'

  const panelsSummary = (formState.panels || []).map((p: any) => ({
    description: p.settings?.description || p.description || '',
    fields: (p.fields || []).map((f: any) => {
      const isMandatory = f.settings?.validation?.fieldRule === 'MANDATORY'
      const options = f.settings?.specific?.customOptions
        ? String(f.settings.specific.customOptions).split('\n').filter(Boolean)
        : undefined

      return {
        id: f.id,
        isMandatory,
        label: f.label || f.displayLabel || 'Untitled Field',
        options: options && options.length > 0 ? options : undefined,
        placeholder: f.settings?.general?.placeholder || '',
        size: f.settings?.general?.size || 'col-6',
        type: f.type || 'SHORT_TEXT',
      }
    }),
    id: p.id,
    title: p.settings?.title || p.title || 'Untitled Section',
  }))

  return {
    description,
    formType,
    name,
    panels: panelsSummary,
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

    const meta = generateSimpleFormMeta(
      parsed?.name || options.prompt || options.description || options.name,
    )
    const finalName = shortenFormName(parsed?.name || meta.name)
    const finalDesc = shortenDescription(
      parsed?.description || options.description || meta.description,
    )

    return {
      description: finalDesc,
      formType: options.formType,
      name: finalName,
      panels,
      reply:
        String(parsed?.reply || '').trim() ||
        `Generated a complete ${options.formType.toLowerCase()} form layout for "${finalName}".`,
      source: 'qwen',
    }
  } catch (error) {
    console.error('Qwen form generation error, falling back to local:', error)
    return buildLocalFormConfig(options)
  }
}

export function generateSimpleFormMeta(promptText: string): {
  description: string
  name: string
} {
  const lower = (promptText || '').toLowerCase().trim()

  if (lower.includes('onboarding') || lower.includes('employee')) {
    return {
      description:
        'Form to collect new employee details, position info, and identity documents.',
      name: 'Employee Onboarding',
    }
  }
  if (
    lower.includes('leave') ||
    lower.includes('vacation') ||
    lower.includes('time off')
  ) {
    return {
      description:
        'Form for employees to submit leave requests, dates, and handover notes.',
      name: 'Leave Request',
    }
  }
  if (
    lower.includes('purchase') ||
    lower.includes('requisition') ||
    lower.includes('po')
  ) {
    return {
      description:
        'Form to request items, estimated costs, vendor details, and budget approval.',
      name: 'Purchase Requisition',
    }
  }
  if (
    lower.includes('invoice') ||
    lower.includes('accounts payable') ||
    lower.includes('ap')
  ) {
    return {
      description:
        'Form to capture vendor invoice data, line items, currency, and attachments.',
      name: 'AP Invoice',
    }
  }
  if (lower.includes('feedback')) {
    return {
      description:
        'Form to collect user ratings, feedback category, and detailed comments.',
      name: 'Feedback',
    }
  }

  const name = shortenFormName(promptText)
  return {
    description: `Custom form layout generated for ${name.toLowerCase()}.`,
    name,
  }
}

export async function processFormAssistantPrompt(
  options: FormAssistantOptions,
): Promise<AiFormConfigSuggestion> {
  const currentForm = formatFormStateForAi(options.formState)

  if (!isQwenConfigured()) {
    const fallback = buildLocalFormConfig({
      description: currentForm.description,
      formType: currentForm.formType as FormTypeOption,
      name: currentForm.name,
      prompt: options.userPrompt,
    })
    return {
      ...fallback,
      action: 'UPDATE',
    }
  }

  const systemMessage = `You are an AI Form Architect Assistant editing an existing business form or answering questions about it.

CURRENT FORM SCHEMA:
Form Name: "${currentForm.name}"
Description: "${currentForm.description}"
Form Type: "${currentForm.formType}"
Current Sections & Fields:
${JSON.stringify(currentForm.panels, null, 2)}

Supported Field Types: ${SUPPORTED_FIELD_TYPES.join(', ')}
Field Sizes: "col-3", "col-4", "col-6", "col-12"

INSTRUCTIONS & RULES:
1. Determine user intent, one of three actions:
   - "INFO": The user is asking a question or requesting information about the form (e.g. "What fields are mandatory?", "How many sections?", "Explain what this form does"). Answer clearly in "reply", set "action": "INFO", "panels": [].
   - "REMOVE_FORM": The user explicitly asks to remove/delete/clear the ENTIRE form or start over from scratch (e.g. "remove this form", "clear everything", "delete all fields and sections", "start over"). Set "action": "REMOVE_FORM", "panels": [], and briefly confirm in "reply". Only use this when the user unmistakably wants the WHOLE form wiped - never use it for a request to remove just one field or one section.
   - "UPDATE": The user asks to add, modify, or remove specific fields/sections, or change form-level settings (name/description/type). Set "action": "UPDATE", and explain the change in "reply". This is the default for anything that isn't a pure question and isn't a whole-form wipe.

2. FOR "UPDATE" RESPONSES, SEND ONLY THE DELTA - never resend the whole form:
   - In "panels", include ONLY the sections you are adding or changing. Do NOT re-list sections/fields that are not changing - the system automatically keeps everything you don't mention exactly as it is.
   - To modify an existing field or section, you MUST reuse its exact "id" from CURRENT FORM SCHEMA above so the system matches and updates it in place instead of creating a duplicate. Omit "id" only when creating a genuinely new field or section.
   - To remove specific fields, list their existing ids in "removedFieldIds". To remove specific sections, list their existing ids in "removedPanelIds". Only put an id in one of these lists when the user explicitly asked to remove that exact field or section - never remove or omit something the user did not ask to change.
   - Never use "removedFieldIds"/"removedPanelIds" to clear the whole form - use "REMOVE_FORM" for that instead.

Respond ONLY with valid JSON using this exact structure:
{
  "action": "INFO" | "UPDATE" | "REMOVE_FORM",
  "name": "Form Name",
  "description": "Form Description",
  "reply": "Friendly explanation of changes made or answer to question",
  "removedFieldIds": ["existing-field-id"],
  "removedPanelIds": ["existing-section-id"],
  "panels": [
    {
      "id": "existing-section-id-or-omit-if-new",
      "title": "Section Title",
      "description": "Section description",
      "fields": [
        {
          "id": "existing-field-id-or-omit-if-new",
          "label": "Field Label",
          "type": "SHORT_TEXT",
          "isMandatory": true,
          "size": "col-6",
          "placeholder": "Enter value",
          "options": ["Option 1", "Option 2"]
        }
      ]
    }
  ]
}`

  const messages = [
    { content: systemMessage, role: 'system' as const },
    { content: options.userPrompt, role: 'user' as const },
  ]

  try {
    const content = await qwenChatCompletions({
      jsonObject: true,
      maxTokens: 3000,
      messages,
    })

    const parsed = parseJsonFromModelContent<any>(content)
    const rawAction = String(parsed?.action || '').toUpperCase()
    const action =
      rawAction === 'INFO'
        ? 'INFO'
        : rawAction === 'REMOVE_FORM'
          ? 'REMOVE_FORM'
          : 'UPDATE'
    const panels =
      action === 'REMOVE_FORM' ? [] : extractPanelsFromRawJson(parsed)

    return {
      action,
      description: shortenDescription(
        parsed?.description || currentForm.description,
      ),
      formType: (parsed?.formType || currentForm.formType) as FormTypeOption,
      name: shortenFormName(parsed?.name || currentForm.name),
      panels,
      removedFieldIds: Array.isArray(parsed?.removedFieldIds)
        ? parsed.removedFieldIds.map(String)
        : undefined,
      removedPanelIds: Array.isArray(parsed?.removedPanelIds)
        ? parsed.removedPanelIds.map(String)
        : undefined,
      reply:
        String(parsed?.reply || '').trim() || 'I have processed your request.',
      source: 'qwen',
    }
  } catch (error) {
    console.error('Form assistant error:', error)
    // Leave the current form untouched on failure rather than silently
    // injecting a canned structure - the user only asked for one change.
    return {
      action: 'INFO',
      description: currentForm.description,
      formType: currentForm.formType as FormTypeOption,
      name: currentForm.name,
      panels: [],
      reply:
        'Sorry, I ran into an error processing that request. Please try again.',
      source: 'local',
    }
  }
}

export function shortenDescription(input: string, maxChars = 75): string {
  if (!input) return ''

  let cleaned = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(
      /^(this\s+(is\s+a\s+)?(form|workflow|process)\s+(designed|built|created)\s+to\s+)/i,
      'Form to ',
    )
    .replace(/^an?\s+(automated|end-to-end)\s+/i, '')
    .replace(
      /^this\s+form\s+(allows|captures|collects|submits)\s+/i,
      'Form to $1 ',
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

export function shortenFormName(input: string): string {
  if (!input) return 'Custom Form'
  let cleaned = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(
      /^(create|build|make|generate|design|setup|new)\s+(a|an|the)?\s*/i,
      '',
    )
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\s+(form|workflow|process|layout|system)\s+for\s+/i, ' ')
    .replace(/\s+for\s+/i, ' ')
    .replace(/\s+(with|to|that|which|and)\s+.*$/i, '')
    .replace(/[^a-zA-Z0-9\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) cleaned = input.trim().split('.')[0]

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length > 1 && words[words.length - 1].toLowerCase() === 'form') {
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

  if (!result) return 'Custom Form'

  return result
    .split(' ')
    .map((w) => {
      const upper = w.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function buildFormConfigPrompt(options: GenerateFormConfigOptions): string {
  const extraPrompt = options.prompt?.trim()
    ? `\nAdditional requirements: "${options.prompt}"`
    : ''

  return `You are an expert Form Architect designing a business form layout.
Form Details:
- Form Type: ${options.formType} Form (${options.formType === 'MASTER' ? 'Master Data Schema' : 'Workflow Request Process'})
- Form Name: "${shortenFormName(options.name)}"
- Purpose / Description: "${shortenDescription(options.description)}"${extraPrompt}

Generate a comprehensive form structure with panels and fields tailored to this purpose.
Supported Field Types: ${SUPPORTED_FIELD_TYPES.join(', ')}
Field Sizes: "col-3", "col-4", "col-6", "col-12"

Guidelines:
- Create 1-4 logical sections (e.g. "General Information", "Details & Specifications", "Approval & Audit")
- "name": Keep it very short, crisp, proper spacing, and meaningful (1-3 words max, e.g. "AP Invoice", "Purchase Order", "Leave Request"). Avoid long sentence titles.
- "description": Keep it short and concise (1 simple sentence, max 8-10 words, ~60 chars max). Do NOT write long text paragraphs.
- Include relevant fields with clear labels, realistic placeholders, proper mandatory status, and sensible grid sizes
- For SINGLE_SELECT or MULTI_SELECT fields, provide a 3-5 item options array
- reply should be 1-2 friendly sentences explaining how the form was structured

Respond with ONLY valid JSON using this exact shape:
{
  "name": "Short Name",
  "description": "Short 1-sentence description",
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
    id: f.id ? String(f.id) : undefined,
    isMandatory: Boolean(
      f.isMandatory ||
      f.required ||
      f.isMandatoryField ||
      f.settings?.validation?.fieldRule === 'MANDATORY',
    ),
    label: String(
      f.label || f.name || f.title || f.fieldName || 'Field',
    ).trim(),
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
    raw =
      typeof parsed.formJson === 'string'
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
      id: p.id ? String(p.id) : undefined,
      title: String(
        p.title || p.name || p.settings?.title || `Section ${idx + 1}`,
      ),
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
