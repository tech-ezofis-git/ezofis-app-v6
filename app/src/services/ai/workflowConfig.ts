import {
  isQwenConfigured,
  parseJsonFromModelContent,
  qwenChatCompletions,
} from '@/services/ai/qwen'
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
  if (lower.includes('order to pay') || lower.includes('order to cash') || lower.includes('order')) {
    return {
      description: 'End-to-end process workflow for sales order intake, fulfillment, billing, and payment processing.',
      name: 'Order to Pay Process Workflow',
    }
  }
  if (lower.includes('onboarding') || lower.includes('employee')) {
    return {
      description: 'Automated multi-stage approval workflow for HR verification, IT setup, and manager sign-off.',
      name: 'Employee Onboarding Workflow',
    }
  }
  if (lower.includes('leave') || lower.includes('vacation') || lower.includes('time off')) {
    return {
      description: 'Automated workflow for manager review and HR balance verification.',
      name: 'Leave Request Approval Workflow',
    }
  }
  if (lower.includes('purchase') || lower.includes('requisition') || lower.includes('po')) {
    return {
      description: 'Approval and verification workflow for purchasing requisitions and PO generation.',
      name: 'Purchase Requisition Workflow',
    }
  }
  if (lower.includes('contract') || lower.includes('signing') || lower.includes('legal')) {
    return {
      description: 'Multi-stage workflow for legal assessment, executive sign-off, and contract archiving.',
      name: 'Contract Review & Signing Workflow',
    }
  }
  if (lower.includes('invoice') || lower.includes('accounts payable') || lower.includes('ap')) {
    return {
      description: 'End-to-end invoice processing workflow with OCR extraction, matching, and ERP export.',
      name: 'Accounts Payable Workflow',
    }
  }

  let clean = promptText
    .replace(/^a\s+/i, '')
    .replace(/^an\s+/i, '')
    .replace(/^the\s+/i, '')
    .trim()
  if (!clean) clean = 'Custom Workflow'
  clean = clean.split('.')[0]
  if (clean.length > 35) clean = `${clean.slice(0, 35).trim()}...`

  const name = clean.toLowerCase().includes('workflow') ? clean : `${clean} Workflow`
  return {
    description: `Automated process workflow configured for ${clean.toLowerCase()}.`,
    name: name.charAt(0).toUpperCase() + name.slice(1),
  }
}

export async function generateWorkflowConfigViaQwen(
  options: GenerateWorkflowConfigOptions,
): Promise<any> {
  const promptText = options.prompt || options.description || options.name
  const meta = generateSimpleWorkflowMeta(promptText)

  if (!isQwenConfigured()) {
    return buildLocalWorkflowConfig(promptText)
  }

  const messages = [
    {
      content:
        'You are an expert Workflow Architect designing business process diagrams. Always respond with valid JSON only.',
      role: 'system' as const,
    },
    {
      content: `Design a workflow for: "${promptText}".
Return a JSON object with "blocks" array and "rules" array.
Block types: "START", "INTERNAL_ACTOR", "CONDITION", "END".
Each block should have: { "id": "b1", "type": "START", "settings": { "label": "Step Name" }, "left": 50, "top": 50, "width": 175, "height": 90, "color": "#2BCCBA", "icon": "mdi-flag" }
Rules: { "id": "r1", "from": "b1", "to": "b2", "ruleName": "" }
Increment "left" position by 230 for each step so nodes are horizontally aligned cleanly.
Respond ONLY with JSON shape: { "blocks": [...], "rules": [...] }`,
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
      const wfName = parsed.name || meta.name
      const wfDesc = parsed.description || meta.description
      if (basePayload.settings?.general) {
        basePayload.settings.general.name = wfName
        basePayload.settings.general.description = wfDesc
      }
      return {
        ...basePayload,
        blocks: parsed.blocks,
        description: wfDesc,
        name: wfName,
        rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      }
    }
  } catch (e) {
    console.warn('Qwen workflow generation error, using local fallback:', e)
  }

  return buildLocalWorkflowConfig(promptText)
}
