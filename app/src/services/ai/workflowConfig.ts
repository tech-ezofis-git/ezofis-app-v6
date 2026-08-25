import {
  isQwenConfigured,
  parseJsonFromModelContent,
  qwenChatCompletions,
} from '@/services/ai/qwen'

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

export function shortenWorkflowName(input: string): string {
  if (!input) return 'Custom Workflow'
  let cleaned = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^(create|build|make|generate|design|setup|new)\s+(a|an|the)?\s*/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\s+(workflow|form|process|layout|system)\s+for\s+/i, ' ')
    .replace(/\s+for\s+/i, ' ')
    .replace(/\s+(with|to|that|which|and)\s+.*$/i, '')
    .replace(/[^a-zA-Z0-9\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) cleaned = input.trim().split('.')[0]

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (
    words.length > 1 &&
    ['workflow', 'process'].includes(words[words.length - 1].toLowerCase())
  ) {
    words.pop()
  }

  let shortWords = words.slice(0, 3)
  if (shortWords.length > 0 && ['&', '-', '/'].includes(shortWords[shortWords.length - 1])) {
    shortWords.pop()
  }

  let result = shortWords.join(' ')

  if (result.length > 25) {
    result = result.slice(0, 25).trim()
  }

  if (!result) return 'Custom Workflow'

  return result
    .split(' ')
    .map((w) => {
      const upper = w.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

export function shortenDescription(input: string, maxChars = 75): string {
  if (!input) return ''

  let cleaned = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^(this\s+(is\s+a\s+)?(workflow|process|form)\s+(designed|built|created)\s+to\s+)/i, 'Workflow for ')
    .replace(/^an?\s+(automated|end-to-end)\s+/i, '')
    .replace(/^this\s+workflow\s+(allows|manages|handles|tracks)\s+/i, 'Workflow to $1 ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.includes('.')) {
    const firstSentence = cleaned.split('.')[0].trim()
    if (firstSentence.length >= 12) {
      cleaned = firstSentence + '.'
    }
  }

  if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
    cleaned += '.'
  }

  if (cleaned.length > maxChars) {
    const trimmed = cleaned.slice(0, maxChars)
    const lastSpace = trimmed.lastIndexOf(' ')
    cleaned = (lastSpace > 15 ? trimmed.slice(0, lastSpace) : trimmed).trim() + '...'
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

import apSetupPayloads from '@/pages/dashboard/workflows/accounts-payable/constants/apSetupPayloads.json'

export interface GenerateWorkflowConfigOptions {
  description: string
  name: string
  prompt?: string
}

export function buildLocalWorkflowConfig(promptText: string): any {
  const lower = (promptText || '').toLowerCase()
  const meta = generateSimpleWorkflowMeta(promptText)
  const basePayload = JSON.parse(JSON.stringify(apSetupPayloads.workflowPayload))

  basePayload.name = meta.name
  basePayload.description = meta.description
  if (basePayload.settings?.general) {
    basePayload.settings.general.name = meta.name
    basePayload.settings.general.description = meta.description
  }
  if (basePayload.settings?.publish) {
    basePayload.settings.publish.publishOption = 'DRAFT'
  }

  if (lower.includes('receivable') || lower.includes('ar')) {
    const blocks = [
      {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-receipt',
        id: 'start_1',
        left: 50,
        settings: { label: 'Customer Invoiced' },
        top: 70,
        type: 'START',
        width: 175,
      },
      {
        color: '#3B82F6',
        height: 90,
        icon: 'mdi-credit-card-check',
        id: 'credit_review',
        left: 280,
        settings: { label: 'Credit & Payment Review' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#8B5CF6',
        height: 90,
        icon: 'mdi-cash-register',
        id: 'collection',
        left: 510,
        settings: { label: 'Payment Collection' },
        top: 110,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#10B981',
        height: 90,
        icon: 'mdi-check-decagram',
        id: 'end_1',
        left: 740,
        settings: { label: 'Revenue Posted' },
        top: 70,
        type: 'END',
        width: 175,
      },
    ]

    const rules = [
      { from: 'start_1', id: 'rule_1', ruleName: '', to: 'credit_review' },
      { from: 'credit_review', id: 'rule_2', ruleName: '', to: 'collection' },
      { from: 'collection', id: 'rule_3', ruleName: '', to: 'end_1' },
    ]

    return { ...basePayload, blocks, rules }
  }

  if (lower.includes('order to pay') || lower.includes('order to cash') || lower.includes('order')) {
    const blocks = [
      {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-cart-arrow-down',
        id: 'start_1',
        left: 50,
        settings: { label: 'Order Intake' },
        top: 70,
        type: 'START',
        width: 175,
      },
      {
        color: '#3B82F6',
        height: 90,
        icon: 'mdi-shield-check',
        id: 'credit_val',
        left: 280,
        settings: { label: 'Credit Validation' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#8B5CF6',
        height: 90,
        icon: 'mdi-truck-delivery',
        id: 'fulfillment',
        left: 510,
        settings: { label: 'Order Fulfillment' },
        top: 110,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#F59E0B',
        height: 90,
        icon: 'mdi-cash-multiple',
        id: 'billing',
        left: 740,
        settings: { label: 'Billing & Payment' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#10B981',
        height: 90,
        icon: 'mdi-check-all',
        id: 'end_1',
        left: 970,
        settings: { label: 'Order Completed' },
        top: 70,
        type: 'END',
        width: 175,
      },
    ]

    const rules = [
      { from: 'start_1', id: 'rule_1', ruleName: '', to: 'credit_val' },
      { from: 'credit_val', id: 'rule_2', ruleName: '', to: 'fulfillment' },
      { from: 'fulfillment', id: 'rule_3', ruleName: '', to: 'billing' },
      { from: 'billing', id: 'rule_4', ruleName: '', to: 'end_1' },
    ]

    return { ...basePayload, blocks, rules }
  }

  if (lower.includes('onboarding') || lower.includes('employee')) {
    const blocks = [
      {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-flag',
        id: 'start_1',
        left: 50,
        settings: { label: 'Start Onboarding' },
        top: 70,
        type: 'START',
        width: 175,
      },
      {
        color: '#3B82F6',
        height: 90,
        icon: 'mdi-account-check',
        id: 'hr_review',
        left: 280,
        settings: { label: 'HR Verification' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#8B5CF6',
        height: 90,
        icon: 'mdi-laptop',
        id: 'it_provisioning',
        left: 510,
        settings: { label: 'IT Equipment Setup' },
        top: 110,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#F59E0B',
        height: 90,
        icon: 'mdi-account-supervisor',
        id: 'mgr_approval',
        left: 740,
        settings: { label: 'Manager Sign-off' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#10B981',
        height: 90,
        icon: 'mdi-check-circle',
        id: 'end_1',
        left: 970,
        settings: { label: 'Onboarding Complete' },
        top: 70,
        type: 'END',
        width: 175,
      },
    ]

    const rules = [
      { from: 'start_1', id: 'rule_1', ruleName: '', to: 'hr_review' },
      { from: 'hr_review', id: 'rule_2', ruleName: '', to: 'it_provisioning' },
      { from: 'it_provisioning', id: 'rule_3', ruleName: '', to: 'mgr_approval' },
      { from: 'mgr_approval', id: 'rule_4', ruleName: '', to: 'end_1' },
    ]

    return { ...basePayload, blocks, rules }
  }

  if (lower.includes('leave') || lower.includes('vacation') || lower.includes('time off')) {
    const blocks = [
      {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-calendar-plus',
        id: 'start_1',
        left: 50,
        settings: { label: 'Submit Leave Request' },
        top: 70,
        type: 'START',
        width: 175,
      },
      {
        color: '#F59E0B',
        height: 90,
        icon: 'mdi-account-tie',
        id: 'mgr_approval',
        left: 280,
        settings: { label: 'Manager Approval' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#8B5CF6',
        height: 90,
        icon: 'mdi-calculator',
        id: 'hr_balance',
        left: 510,
        settings: { label: 'HR Balance Check' },
        top: 110,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#10B981',
        height: 90,
        icon: 'mdi-check-all',
        id: 'end_1',
        left: 740,
        settings: { label: 'Leave Approved' },
        top: 70,
        type: 'END',
        width: 175,
      },
    ]

    const rules = [
      { from: 'start_1', id: 'rule_1', ruleName: '', to: 'mgr_approval' },
      { from: 'mgr_approval', id: 'rule_2', ruleName: '', to: 'hr_balance' },
      { from: 'hr_balance', id: 'rule_3', ruleName: '', to: 'end_1' },
    ]

    return { ...basePayload, blocks, rules }
  }

  if (lower.includes('purchase') || lower.includes('requisition') || lower.includes('po')) {
    const blocks = [
      {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-cart',
        id: 'start_1',
        left: 50,
        settings: { label: 'Requisition Created' },
        top: 70,
        type: 'START',
        width: 175,
      },
      {
        color: '#3B82F6',
        height: 90,
        icon: 'mdi-account-tie',
        id: 'dept_approval',
        left: 280,
        settings: { label: 'Dept Head Review' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#F59E0B',
        height: 90,
        icon: 'mdi-finance',
        id: 'budget_check',
        left: 510,
        settings: { label: 'Finance Budget Check' },
        top: 110,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#8B5CF6',
        height: 90,
        icon: 'mdi-file-document-edit',
        id: 'po_generation',
        left: 740,
        settings: { label: 'PO Generation' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#10B981',
        height: 90,
        icon: 'mdi-check-circle',
        id: 'end_1',
        left: 970,
        settings: { label: 'PO Released' },
        top: 70,
        type: 'END',
        width: 175,
      },
    ]

    const rules = [
      { from: 'start_1', id: 'rule_1', ruleName: '', to: 'dept_approval' },
      { from: 'dept_approval', id: 'rule_2', ruleName: '', to: 'budget_check' },
      { from: 'budget_check', id: 'rule_3', ruleName: '', to: 'po_generation' },
      { from: 'po_generation', id: 'rule_4', ruleName: '', to: 'end_1' },
    ]

    return { ...basePayload, blocks, rules }
  }

  if (lower.includes('contract') || lower.includes('signing') || lower.includes('legal')) {
    const blocks = [
      {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-file-document-outline',
        id: 'start_1',
        left: 50,
        settings: { label: 'Contract Submitted' },
        top: 70,
        type: 'START',
        width: 175,
      },
      {
        color: '#3B82F6',
        height: 90,
        icon: 'mdi-gavel',
        id: 'legal_review',
        left: 280,
        settings: { label: 'Legal Review' },
        top: 30,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#8B5CF6',
        height: 90,
        icon: 'mdi-pen',
        id: 'exec_signature',
        left: 510,
        settings: { label: 'Executive Sign-off' },
        top: 110,
        type: 'INTERNAL_ACTOR',
        width: 175,
      },
      {
        color: '#10B981',
        height: 90,
        icon: 'mdi-archive',
        id: 'end_1',
        left: 740,
        settings: { label: 'Archived & Executed' },
        top: 70,
        type: 'END',
        width: 175,
      },
    ]

    const rules = [
      { from: 'start_1', id: 'rule_1', ruleName: '', to: 'legal_review' },
      { from: 'legal_review', id: 'rule_2', ruleName: '', to: 'exec_signature' },
      { from: 'exec_signature', id: 'rule_3', ruleName: '', to: 'end_1' },
    ]

    return { ...basePayload, blocks, rules }
  }

  return basePayload
}

export function generateSimpleWorkflowMeta(promptText: string): { description: string; name: string } {
  const lower = (promptText || '').toLowerCase().trim()

  if (lower.includes('receivable') || lower.includes('ar')) {
    return {
      description: 'Customer invoicing, credit checks, payment collection, and revenue posting workflow.',
      name: 'Accounts Receivable Workflow',
    }
  }
  if (lower.includes('order to pay') || lower.includes('order to cash') || lower.includes('o2p')) {
    return {
      description: 'End-to-end process workflow for sales order intake, fulfillment, billing, and payment processing.',
      name: 'Order to Pay',
    }
  }
  if (lower.includes('onboarding') || lower.includes('employee')) {
    return {
      description: 'Automated multi-stage approval workflow for HR verification, IT setup, and manager sign-off.',
      name: 'Employee Onboarding',
    }
  }
  if (lower.includes('leave') || lower.includes('vacation') || lower.includes('time off')) {
    return {
      description: 'Automated workflow for manager review and HR balance verification.',
      name: 'Leave Request',
    }
  }
  if (lower.includes('purchase') || lower.includes('requisition') || lower.includes('po')) {
    return {
      description: 'Approval and verification workflow for purchasing requisitions and PO generation.',
      name: 'Purchase Requisition',
    }
  }
  if (lower.includes('contract') || lower.includes('signing') || lower.includes('legal')) {
    return {
      description: 'Multi-stage workflow for legal assessment, executive sign-off, and contract archiving.',
      name: 'Contract Review',
    }
  }
  if (lower.includes('invoice') || lower.includes('accounts payable') || lower.includes('ap')) {
    return {
      description: 'End-to-end invoice processing workflow with OCR extraction, matching, and ERP export.',
      name: 'Accounts Payable',
    }
  }

  const name = shortenWorkflowName(promptText)
  return {
    description: `Automated process workflow configured for ${name.toLowerCase()}.`,
    name,
  }
}

export function ensureStartAndEndNodes(
  rawBlocks: any[],
  rawRules: any[],
): { blocks: any[]; rules: any[] } {
  let blocks = Array.isArray(rawBlocks) ? rawBlocks.map((b: any) => ({ ...b })) : []
  let rules = Array.isArray(rawRules) ? [...rawRules] : []

  if (blocks.length === 0) {
    blocks = [
      {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-flag',
        id: 'start_1',
        left: 50,
        settings: { label: 'Start' },
        top: 70,
        type: 'START',
        width: 175,
      },
      {
        color: '#10B981',
        height: 90,
        icon: 'mdi-check-circle',
        id: 'end_1',
        left: 280,
        settings: { label: 'End' },
        top: 70,
        type: 'END',
        width: 175,
      },
    ]
    rules = [{ from: 'start_1', id: 'rule_start_end', ruleName: '', to: 'end_1' }]
    return { blocks, rules }
  }

  // 0. Sanitize block types
  blocks = blocks.map((b: any, idx: number) => {
    let blockType = String(b.type || '').toUpperCase().trim()
    const label = String(b.settings?.label || '').toLowerCase()

    if (blockType === 'ACTION' || !blockType) {
      if (
        idx === blocks.length - 1 ||
        /\b(end|complete|completed|finish|approved|done|posted|released|archive|archived)\b/i.test(label)
      ) {
        blockType = 'END'
      } else if (
        idx === 0 ||
        /\b(start|begin|submit|submitted|create|created|intake)\b/i.test(label)
      ) {
        blockType = 'START'
      } else {
        blockType = 'INTERNAL_ACTOR'
      }
    }

    return {
      ...b,
      type: blockType,
    }
  })

  // 1. Ensure START node exists as first block
  const hasStartNode = blocks.some(
    (b: any) => String(b.type || '').toUpperCase() === 'START',
  )
  if (!hasStartNode) {
    if (
      blocks.length > 0 &&
      /\b(start|begin|submit|submitted|create|created|intake|onboarding)\b/i.test(
        String(blocks[0].settings?.label || ''),
      )
    ) {
      blocks[0].type = 'START'
    } else {
      const firstLeft = Number(blocks[0]?.left) || 280
      const startNode = {
        color: '#2BCCBA',
        height: 90,
        icon: 'mdi-flag',
        id: 'start_auto_1',
        left: Math.max(50, firstLeft - 230),
        settings: { label: 'Start' },
        top: Number(blocks[0]?.top) || 70,
        type: 'START',
        width: 175,
      }
      blocks.unshift(startNode)

      const firstOtherBlock = blocks[1]
      if (firstOtherBlock) {
        rules.unshift({
          action: 'Submit',
          confirm: false,
          fromBlockId: 'start_auto_1',
          id: `rule_auto_start_${firstOtherBlock.id}`,
          left: 0,
          passwordAccess: false,
          proceedAction: 'Submit',
          remarks: false,
          signature: false,
          toBlockId: firstOtherBlock.id,
          top: 0,
        })
      }
    }
  }

  // 2. Ensure END node exists as last block
  const hasEndNode = blocks.some(
    (b: any) => String(b.type || '').toUpperCase() === 'END',
  )
  if (!hasEndNode) {
    const lastBlock = blocks[blocks.length - 1]
    if (
      lastBlock &&
      /\b(end|complete|completed|finish|approved|done|posted|released|archive|archived)\b/i.test(
        String(lastBlock.settings?.label || ''),
      )
    ) {
      lastBlock.type = 'END'
    } else {
      const lastLeft = Number(lastBlock?.left) || 50
      const endNode = {
        color: '#10B981',
        height: 90,
        icon: 'mdi-check-circle',
        id: 'end_auto_1',
        left: lastLeft + 230,
        settings: { label: 'End' },
        top: Number(lastBlock?.top) || 70,
        type: 'END',
        width: 175,
      }
      blocks.push(endNode)

      if (lastBlock) {
        rules.push({
          action: 'Submit',
          confirm: false,
          fromBlockId: lastBlock.id,
          id: `rule_auto_${lastBlock.id}_end`,
          left: 0,
          passwordAccess: false,
          proceedAction: 'Submit',
          remarks: false,
          signature: false,
          toBlockId: 'end_auto_1',
          top: 0,
        })
      }
    }
  }

  // 3. Clean orphan rules & normalize rule format
  const validBlockIds = new Set(blocks.map((b: any) => String(b.id)))
  const cleanRules = rules
    .filter((r: any) => {
      const fromId = String(r.fromBlockId || r.from || '')
      const toId = String(r.toBlockId || r.to || '')
      return validBlockIds.has(fromId) && validBlockIds.has(toId)
    })
    .map((r: any) => {
      const fromId = String(r.fromBlockId || r.from || '')
      const toId = String(r.toBlockId || r.to || '')
      const actionName = r.proceedAction || r.action || 'Submit'
      return {
        action: actionName,
        confirm: r.confirm ?? false,
        fromBlockId: fromId,
        id: r.id || `r_${fromId}_${toId}`,
        left: r.left ?? 0,
        passwordAccess: r.passwordAccess ?? false,
        proceedAction: actionName,
        remarks: r.remarks ?? false,
        signature: r.signature ?? false,
        toBlockId: toId,
        top: r.top ?? 0,
      }
    })

  return { blocks, rules: cleanRules }
}

export async function generateWorkflowConfigViaQwen(
  options: GenerateWorkflowConfigOptions,
): Promise<any> {
  const promptText = options.prompt || options.description || options.name
  const meta = generateSimpleWorkflowMeta(promptText)

  if (!isQwenConfigured()) {
    const raw = buildLocalWorkflowConfig(promptText)
    const { blocks, rules } = ensureStartAndEndNodes(raw.blocks, raw.rules)
    return { ...raw, blocks, rules }
  }

  const messages = [
    {
      content:
        'You are an expert Workflow Architect designing business process diagrams. Always respond with valid JSON only.',
      role: 'system' as const,
    },
    {
      content: `Design a workflow for: "${promptText}".
Return a JSON object with:
- "name": short & meaningful title (1-3 words max, e.g. "AP Invoice", "Purchase Requisition", "Leave Request")
- "description": short 1-sentence description (max 10-12 words)
- "blocks": array of nodes
- "rules": array of transitions

STRICT NODE TYPE RULES:
1. The first block MUST be type "START" (e.g. label: "Start Workflow" or "Submit Request").
2. The last block MUST be type "END" (e.g. label: "Completed" or "Approved").
3. Intermediate steps MUST be type "INTERNAL_ACTOR" or "CONDITION".
4. DO NOT use type "ACTION". Only use "START", "INTERNAL_ACTOR", "CONDITION", or "END".
5. Connect all nodes sequentially from START -> intermediate steps -> END using rules.

Each block should have: { "id": "b1", "type": "START", "settings": { "label": "Step Name" }, "left": 50, "top": 70, "width": 175, "height": 90, "color": "#2BCCBA", "icon": "mdi-flag" }
Rules: { "id": "r1", "from": "b1", "to": "b2", "ruleName": "" }
Increment "left" position by 230 for each step so nodes are horizontally aligned cleanly.
Respond ONLY with JSON shape: { "name": string, "description": string, "blocks": [...], "rules": [...] }`,
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
    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      const basePayload = JSON.parse(JSON.stringify(apSetupPayloads.workflowPayload))
      const rawWfName = parsed.name || meta.name
      const wfName = shortenWorkflowName(rawWfName)
      const rawWfDesc = parsed.description || options.description || meta.description
      const wfDesc = shortenDescription(rawWfDesc)
      if (!basePayload.settings) basePayload.settings = {}
      if (!basePayload.settings.general) basePayload.settings.general = {}
      basePayload.settings.general.name = wfName
      basePayload.settings.general.description = wfDesc
      basePayload.settings.publish = {
        ...(basePayload.settings.publish || {}),
        publishOption: 'DRAFT',
      }

      const { blocks, rules } = ensureStartAndEndNodes(
        parsed.blocks,
        Array.isArray(parsed.rules) ? parsed.rules : [],
      )

      return {
        ...basePayload,
        blocks,
        description: wfDesc,
        name: wfName,
        rules,
      }
    }
  } catch (e) {
    console.warn('Qwen workflow generation error, using local fallback:', e)
  }

  const fallback = buildLocalWorkflowConfig(promptText)
  const { blocks, rules } = ensureStartAndEndNodes(fallback.blocks, fallback.rules)
  return { ...fallback, blocks, rules }
}
