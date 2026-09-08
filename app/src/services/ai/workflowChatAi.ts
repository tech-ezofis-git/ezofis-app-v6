import { GoogleGenAI, Type } from '@google/genai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

let aiClient: GoogleGenAI | null = null

const getAiClient = () => {
  if (!API_KEY) return null
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY })
  }
  return aiClient
}

export interface ChatStepResult {
  extractedAnswers: Record<string, any>
  isComplete: boolean
  nextDocId: string | null
  nextFieldId: string | null
  reply: string
  suggestedPills: string[]
  tipText?: string
}

export interface ParsedDoc {
  id: string
  label: string
  required: boolean
  accept?: string
  panelIndex?: number
  rawControl?: any
}

export interface ParsedField {
  id: string
  label: string
  required: boolean
  type: string // text, select, date, number, boolean, etc.
  options?: string[]
  panelIndex?: number
  placeholder?: string
  question?: string
  rawControl?: any
  tipExample?: string
}

export interface WorkflowIntentResult {
  matchedWorkflowId: string | null
  reply: string
  suggestedPills: string[]
}

export interface WorkflowSummary {
  id: string
  name: string
  description?: string
  wFormId?: string | number
}

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

/**
 * Uses Gemini AI to analyze user prompt against available real workflows in the system.
 */
export async function matchWorkflowWithGemini(
  userPrompt: string,
  availableWorkflows: WorkflowSummary[],
): Promise<WorkflowIntentResult> {
  const client = getAiClient()
  if (!client || availableWorkflows.length === 0) {
    return fallbackMatchWorkflow(userPrompt, availableWorkflows)
  }

  const workflowsListText = availableWorkflows
    .map(
      (w) =>
        `- ID: "${w.id}", Name: "${w.name}", Description: "${w.description || 'No description'}"`,
    )
    .join('\n')

  const promptText = `
You are the ezofis Workflow Assistant AI.
The user sent the following prompt: "${userPrompt}"

Available published workflows in the ezofis system:
${workflowsListText}

Task:
1. Determine if the user wants to start one of the available workflows above, or is asking general questions, or asking to view pending requests.
2. If the user prompt matches one of the available workflows, return its ID as "matchedWorkflowId".
3. Write a warm, professional, helpful response as "reply" (using markdown if needed, e.g. bolding key workflow names).
4. Provide an array of 2-4 short action pill labels in "suggestedPills" (e.g., ["Start Workflow", "Show my pending requests", "Browse workflows"]).

Return strictly JSON matching this schema.
`

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            properties: {
              matchedWorkflowId: { nullable: true, type: Type.STRING },
              reply: { type: Type.STRING },
              suggestedPills: {
                items: { type: Type.STRING },
                type: Type.ARRAY,
              },
            },
            required: ['reply', 'suggestedPills'],
            type: Type.OBJECT,
          },
        },
        contents: [{ parts: [{ text: promptText }], role: 'user' }],
        model,
      })

      const raw = response.text
      if (raw) {
        const parsed = JSON.parse(raw) as WorkflowIntentResult
        return {
          matchedWorkflowId: parsed.matchedWorkflowId || null,
          reply: parsed.reply || `I can help you initiate a workflow.`,
          suggestedPills:
            parsed.suggestedPills ||
            availableWorkflows.map((w) => w.name).slice(0, 4),
        }
      }
    } catch (err) {
      console.warn(
        `Gemini matchWorkflow attempt failed with model ${model}:`,
        err,
      )
    }
  }

  return fallbackMatchWorkflow(userPrompt, availableWorkflows)
}

/**
 * Uses Gemini AI to process a step in an active workflow, extract values, and formulate the response.
 */
export async function processWorkflowChatStepWithGemini(params: {
  currentAnswers: Record<string, any>
  currentDocs: Record<string, string>
  documents: ParsedDoc[]
  fields: ParsedField[]
  userMessage: string
  workflowName: string
}): Promise<ChatStepResult> {
  const {
    currentAnswers,
    currentDocs,
    documents,
    fields,
    userMessage,
    workflowName,
  } = params
  const client = getAiClient()

  const missingFields = fields.filter((f) => currentAnswers[f.id] === undefined)
  const missingDocs = documents.filter((d) => !currentDocs[d.id])

  if (!client) {
    return fallbackProcessStep(
      userMessage,
      fields,
      documents,
      currentAnswers,
      currentDocs,
    )
  }

  const fieldsSchemaDesc = fields
    .map((f) => {
      let desc = `- Field ID: "${f.id}", Label: "${f.label}", Type: "${f.type}", Required: ${f.required}`

      if (f.options && f.options.length > 0) {
        desc += `, Options: [${f.options.join(', ')}]`
      }

      if (f.rawControl) {
        if (
          f.rawControl.type === 'TABLE' ||
          f.rawControl.type === 'DYNAMIC_TABLE'
        ) {
          const cols = f.rawControl.settings?.specific?.tableColumns
            ?.map((c: any) => c.label)
            .join(', ')
          if (cols)
            desc += `. This is a table. Required columns: [${cols}]. Instruct the user to provide all these columns.`
        } else if (f.rawControl.type === 'CURRENCY') {
          desc += `. This is a currency field. Expect an amount and a currency symbol.`
        }
      }

      return desc
    })
    .join('\n')

  const promptText = `
You are the ezofis Workflow Assistant AI guiding a user through the "${workflowName}" workflow.

Form Fields Schema:
${fieldsSchemaDesc}

Current Collected Answers: ${JSON.stringify(currentAnswers)}
Current Attached Documents: ${JSON.stringify(currentDocs)}
User's Latest Input: "${userMessage}"

Task:
1. Extract any field values present in User's Latest Input that correspond to missing fields in Form Fields Schema.
2. Determine which field or document should be requested next. Required fields MUST be collected first.
3. Write a warm, polite response as "reply". If a field was just extracted, acknowledge it briefly.
4. If the next field has selectable options (e.g. dropdown/select type), provide those options in "suggestedPills".
5. Set "isComplete" to true ONLY IF all required form fields AND all required documents are collected.
6. Provide an optional helpful tip string in "tipText" (e.g., example values).

Return strictly JSON matching this schema:
{
  "extractedAnswers": { [fieldId: string]: string | number | boolean },
  "reply": string,
  "nextFieldId": string | null,
  "nextDocId": string | null,
  "suggestedPills": string[],
  "isComplete": boolean,
  "tipText": string
}
`

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            properties: {
              extractedAnswers: {
                description: 'Dictionary of field ID to extracted value',
                type: Type.OBJECT,
              },
              isComplete: { type: Type.BOOLEAN },
              nextDocId: { nullable: true, type: Type.STRING },
              nextFieldId: { nullable: true, type: Type.STRING },
              reply: { type: Type.STRING },
              suggestedPills: {
                items: { type: Type.STRING },
                type: Type.ARRAY,
              },
              tipText: { type: Type.STRING },
            },
            required: [
              'extractedAnswers',
              'reply',
              'isComplete',
              'suggestedPills',
            ],
            type: Type.OBJECT,
          },
        },
        contents: [{ parts: [{ text: promptText }], role: 'user' }],
        model,
      })

      const raw = response.text
      if (raw) {
        const parsed = JSON.parse(raw) as ChatStepResult
        return {
          extractedAnswers: parsed.extractedAnswers || {},
          isComplete: Boolean(parsed.isComplete),
          nextDocId: parsed.nextDocId || null,
          nextFieldId: parsed.nextFieldId || null,
          reply: parsed.reply || 'Thank you.',
          suggestedPills: parsed.suggestedPills || [],
          tipText: parsed.tipText || undefined,
        }
      }
    } catch (err) {
      console.warn(
        `Gemini processStep attempt failed with model ${model}:`,
        err,
      )
    }
  }

  return fallbackProcessStep(
    userMessage,
    fields,
    documents,
    currentAnswers,
    currentDocs,
  )
}

function fallbackMatchWorkflow(
  userPrompt: string,
  availableWorkflows: WorkflowSummary[],
): WorkflowIntentResult {
  const query = userPrompt.toLowerCase()

  const matched = availableWorkflows.find((w) => {
    const nameMatch = w.name
      .toLowerCase()
      .split(/\s+/)
      .some((term) => term.length > 3 && query.includes(term))
    const descMatch =
      w.description && w.description.toLowerCase().includes(query)
    return nameMatch || descMatch
  })

  if (matched) {
    return {
      matchedWorkflowId: matched.id,
      reply: `Great — I can help you start the **${matched.name}** workflow. Let's get the required details.`,
      suggestedPills: [
        'Proceed with ' + matched.name,
        'Browse other workflows',
      ],
    }
  }

  if (/pending|status|track|my request/i.test(query)) {
    return {
      matchedWorkflowId: null,
      reply: `Here are options for checking your active requests or starting a new process:`,
      suggestedPills: [
        'Show my pending requests',
        'Initiate workflow',
        'Browse workflows',
      ],
    }
  }

  return {
    matchedWorkflowId: null,
    reply: `I'm ready to assist you. Tell me what process you'd like to initiate, or select one of the published workflows below:`,
    suggestedPills: availableWorkflows.slice(0, 4).map((w) => w.name),
  }
}

function fallbackProcessStep(
  userMessage: string,
  fields: ParsedField[],
  documents: ParsedDoc[],
  currentAnswers: Record<string, any>,
  currentDocs: Record<string, string>,
): ChatStepResult {
  const missingFields = fields.filter((f) => currentAnswers[f.id] === undefined)
  const nextField = missingFields[0]
  const extractedAnswers: Record<string, any> = {}

  if (nextField && userMessage) {
    extractedAnswers[nextField.id] = userMessage
  }

  const remainingFields = fields.filter(
    (f) =>
      currentAnswers[f.id] === undefined &&
      extractedAnswers[f.id] === undefined,
  )
  const upcomingField = remainingFields[0]
  const upcomingDoc = documents.find((d) => !currentDocs[d.id])

  if (!upcomingField && !upcomingDoc) {
    return {
      extractedAnswers,
      isComplete: true,
      nextDocId: null,
      nextFieldId: null,
      reply:
        "All set! I've collected everything needed for your request. Ready to submit?",
      suggestedPills: ['Review & Submit', 'Make changes'],
    }
  }

  if (upcomingField) {
    return {
      extractedAnswers,
      isComplete: false,
      nextDocId: null,
      nextFieldId: upcomingField.id,
      reply: upcomingField.question || `What is the ${upcomingField.label}?`,
      suggestedPills: upcomingField.options || [],
      tipText: upcomingField.tipExample
        ? `Type your answer in the box below — e.g. ${upcomingField.tipExample}`
        : undefined,
    }
  }

  return {
    extractedAnswers,
    isComplete: false,
    nextDocId: upcomingDoc?.id || null,
    nextFieldId: null,
    reply: `Please attach the ${upcomingDoc?.label || 'document'}. You can upload a file or choose from your document library.`,
    suggestedPills: [],
  }
}
