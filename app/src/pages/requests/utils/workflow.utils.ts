import type { ActionButton } from '../types'

// Helper to determine tenant specific logic (replacing isTenantArmgroup, etc.)
export const checkTenantFeature = (feature: string) => {
  const origin = window.location.origin
  // Add your logic here based on origin or env variables
  if (feature === 'HIDE_COLUMNS_ARMGROUP') return origin.includes('ag-appsvc')
  return false
}

// Parse flowJson to determine buttons (Approve, Reject, Forward)
export const getActionsForActivity = (
  activityId: string,
  flowJsonInput: string | any | undefined,
): ActionButton[] => {
  if (!activityId || !flowJsonInput) return []

  const actions: ActionButton[] = []
  try {
    const flow =
      typeof flowJsonInput === 'string'
        ? JSON.parse(flowJsonInput)
        : flowJsonInput

    // Extract rules array from various possible structures
    let rules: any[] = []
    if (Array.isArray(flow)) {
      rules = flow
    } else if (flow && typeof flow === 'object') {
      if (Array.isArray(flow.rules)) {
        rules = flow.rules
      } else if (flow.flowJson && Array.isArray(flow.flowJson.rules)) {
        rules = flow.flowJson.rules
      } else if (flow.flowJson && typeof flow.flowJson === 'string') {
        try {
          const parsedInner = JSON.parse(flow.flowJson)
          if (Array.isArray(parsedInner?.rules)) {
            rules = parsedInner.rules
          } else if (Array.isArray(parsedInner)) {
            rules = parsedInner
          }
        } catch {
          // ignore
        }
      }
    }

    // 1. Check Rules (Outgoing Lines)
    rules.forEach((rule: any) => {
      const fromId = String(rule.fromBlockId || rule.from || rule.source || '')
      if (fromId && fromId === String(activityId)) {
        let color: ActionButton['color'] = 'blue'
        let icon = 'tabler:arrow-right'

        const action = rule.action || rule.proceedAction
        if (!action) return

        if (['Approve', 'Complete'].includes(action)) {
          color = 'green'
          icon = 'tabler:check'
        } else if (['Reject', 'Terminate'].includes(action)) {
          color = 'red'
          icon = 'tabler:x'
        } else if (['Reply'].includes(action)) {
          color = 'orange'
          icon = 'tabler:arrow-back-up'
        }

        actions.push({ color, icon, label: action, value: action })
      }
    })

    // 2. Check Block Settings (Internal Forward)
    if (flow && typeof flow === 'object') {
      const blocks = Array.isArray(flow.blocks) ? flow.blocks : []
      const block = blocks.find((b: any) => String(b.id) === String(activityId))
      if (block?.settings?.internalForward) {
        actions.push({
          color: 'orange',
          icon: 'tabler:user-share',
          label: 'Forward',
          value: 'Forward',
        })
      }
    }
  } catch (e) {
    console.error('Error parsing flowJson', e)
  }
  return actions
}

// Safe JSON parse for cell data
export const safeParse = (data: any) => {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data
  } catch {
    return data
  }
}

// Extract the blocks array from any of the shapes a "workflow" object shows up
// as in this module: the raw V6 workflow record (`workflowJson.blocks`), the
// lightweight WorkflowOption used by the requests list (`flowJson` as a JSON
// string), or an already-parsed flow object (`{ blocks, rules, settings }`).
export function extractBlocks(workflow: any): any[] {
  if (!workflow) return []

  if (Array.isArray(workflow.workflowJson?.blocks)) {
    return workflow.workflowJson.blocks
  }
  if (Array.isArray(workflow.blocks)) {
    return workflow.blocks
  }

  const flowJsonInput = workflow.flowJson ?? workflow.workflowJson
  if (!flowJsonInput) return []

  try {
    const flow =
      typeof flowJsonInput === 'string'
        ? JSON.parse(flowJsonInput)
        : flowJsonInput
    if (Array.isArray(flow?.blocks)) return flow.blocks
  } catch {
    // ignore
  }
  return []
}

export function getStageNameFromWorkflow(
  activityId?: string | null,
  workflow?: any,
): string | null {
  if (!activityId || !workflow) return null

  let blocks: any[] = extractBlocks(workflow)
  if (!blocks || !blocks.length) {
    const raw = workflow?.workflowJson ?? workflow?.flowJson ?? workflow
    const flow =
      typeof raw === 'string'
        ? (() => {
            try {
              return JSON.parse(raw)
            } catch {
              return null
            }
          })()
        : raw
    if (Array.isArray(flow?.nodes)) {
      blocks = flow.nodes
    } else if (Array.isArray(flow?.workflowJson?.nodes)) {
      blocks = flow.workflowJson.nodes
    }
  }

  if (!blocks || !blocks.length) return null

  const match = blocks.find(
    (b: any) =>
      String(b?.id || b?.activityId || b?.nodeId || b?.key) ===
      String(activityId),
  )

  if (!match) return null

  const name =
    match.name ||
    match.label ||
    match.title ||
    match.stageName ||
    match.stage ||
    match.settings?.name ||
    match.settings?.label ||
    match.settings?.title ||
    match.settings?.stageName ||
    match.data?.name ||
    match.data?.label ||
    match.data?.title ||
    match.data?.stageName ||
    match.data?.stage

  return name ? String(name) : null
}

/**
 * An Accounts Payable workflow is one built with the "Intelligent AP Agent"
 * step from the workflow builder (block type `AP_AGENT` — see
 * AddNodeMenu.tsx / StepFour.tsx's applyApAgentSettings). Every other
 * workflow is treated as a generic, form-driven workflow.
 */
export const isAccountsPayableWorkflow = (workflow: any): boolean =>
  extractBlocks(workflow).some((block: any) => block?.type === 'AP_AGENT')

/**
 * Checks if PO Source SAP is configured in the workflow JSON AP Agent Node settings
 */
export const isSapPoSourceConfigured = (workflow: any): boolean => {
  if (!workflow) return false
  const blocks = extractBlocks(workflow)
  const apBlock = blocks.find(
    (block: any) =>
      block?.type === 'AP_AGENT' ||
      block?.type === 'ap_agent' ||
      block?.toolType === 'ap_agent' ||
      block?.data?.toolType === 'ap_agent',
  )
  if (!apBlock) return false

  const apAgent =
    apBlock.settings?.apAgent ||
    apBlock.data?.apAgent ||
    apBlock.data ||
    apBlock.settings ||
    {}

  const resource = String(
    apAgent.resource ||
      apBlock.data?.resource ||
      apBlock.settings?.resource ||
      '',
  )
    .toUpperCase()
    .trim()

  const poMasterSourceType = String(
    apAgent.poMasterSourceType ||
      apBlock.data?.poMasterSourceType ||
      apAgent.poMasterType ||
      apBlock.data?.poMasterType ||
      apAgent.poMaster?.sourceType ||
      apBlock.data?.poMaster?.sourceType ||
      '',
  )
    .toLowerCase()
    .trim()

  const connectorId = String(
    apAgent.connectorId ||
      apBlock.data?.connectorId ||
      apBlock.data?.poMasterSapAccount?.id ||
      apAgent.poMasterSapAccount?.id ||
      '',
  )
    .toLowerCase()
    .trim()

  return (
    resource === 'SAP' ||
    resource.includes('SAP') ||
    poMasterSourceType === 'sap' ||
    connectorId.startsWith('sap')
  )
}

// Same shape-normalization as extractBlocks, but also returns `rules` —
// needed to look up the step that preceded a given activity (rule.toBlockId
// === activityId) for list/grid "previous stage" displays.
export const extractWorkflowGraph = (
  workflow: any,
): { blocks: any[]; rules: any[] } => {
  if (!workflow) return { blocks: [], rules: [] }

  if (Array.isArray(workflow.workflowJson?.blocks)) {
    return {
      blocks: workflow.workflowJson.blocks,
      rules: workflow.workflowJson.rules || [],
    }
  }
  if (Array.isArray(workflow.blocks)) {
    return { blocks: workflow.blocks, rules: workflow.rules || [] }
  }

  const flowJsonInput = workflow.flowJson ?? workflow.workflowJson
  if (!flowJsonInput) return { blocks: [], rules: [] }

  try {
    const flow =
      typeof flowJsonInput === 'string'
        ? JSON.parse(flowJsonInput)
        : flowJsonInput
    return {
      blocks: Array.isArray(flow?.blocks) ? flow.blocks : [],
      rules: Array.isArray(flow?.rules) ? flow.rules : [],
    }
  } catch {
    return { blocks: [], rules: [] }
  }
}

export interface GenericStageInfo {
  currentLabel: string
  isTerminal: boolean
  previousLabel: string | null
}

// Settings live on the workflow record, inside workflowJson, or inside a
// stringified flowJson. Stage tabs (Enquiry / Qualified / Processed) are
// settings.general.requestTabs. Reading only workflowJson.settings misses
// them when the API returns workflowJson as a string.
export function extractWorkflowGeneral(workflow: any): any {
  if (!workflow) return undefined

  const direct =
    workflow.settings?.general || workflow.workflowJson?.settings?.general
  if (direct && typeof direct === 'object') return direct

  const raw = workflow.flowJson ?? workflow.workflowJson
  if (!raw) return undefined
  if (typeof raw === 'object') return raw.settings?.general

  try {
    const flow = JSON.parse(raw)
    return flow?.settings?.general
  } catch {
    return undefined
  }
}

// The workflow-settings "Preview" field labels (Workflow Builder ->
// Settings -> Configuration -> Field Selection), used to decide which
// form/repository fields show up on a request's list/grid row. Same
// shape-normalization as extractBlocks/extractWorkflowGraph, since
// `workflow` shows up as the raw V6 record, the lightweight
// WorkflowOption, or an already-parsed { blocks, rules, settings } object.
export function extractPreviewValues(workflow: any): string[] {
  if (!workflow) return []

  const readFromSettings = (settings: any): string[] => {
    const raw = settings?.general?.previewValues
    if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string')
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed)
          ? parsed.filter((v) => typeof v === 'string')
          : []
      } catch {
        return []
      }
    }
    return []
  }

  const candidates: any[] = [
    workflow.workflowJson?.settings,
    workflow.settings,
    workflow.wSettings,
  ]

  const flowJsonInput = workflow.flowJson
  if (flowJsonInput && flowJsonInput !== workflow.workflowJson) {
    try {
      const flow =
        typeof flowJsonInput === 'string'
          ? JSON.parse(flowJsonInput)
          : flowJsonInput
      candidates.push(flow?.settings)
    } catch {
      // Ignore a flow blob that is not JSON. A later candidate may still
      // carry the configured preview labels.
    }
  }

  for (const settings of candidates) {
    const values = readFromSettings(settings)
    if (values.length) return values
  }
  return []
}

// Previous → Current stage for a list/grid row, without a per-row history
// call: Current comes straight off the row (`stage`/`activityId`); Previous
// comes from the workflow's own rule graph (the rule whose toBlockId is
// this row's activityId tells us which block led here). Terminal = this
// activity has no outgoing rule (nothing left to do) or is an ACTION/END
// block, which drives the icon/color (done vs in-progress).
export const getGenericStageInfo = (
  workflow: any,
  row: any,
): GenericStageInfo => {
  const { blocks, rules } = extractWorkflowGraph(workflow)
  const activityId = row?.activityId
  const currentLabel = row?.stage || row?.stageName || 'In Progress'

  const incomingRule = rules.find((r: any) => r.toBlockId === activityId)
  const previousBlock = blocks.find(
    (b: any) => b.id === incomingRule?.fromBlockId,
  )
  const previousLabel = previousBlock?.settings?.label || null

  const outgoingRule = rules.find((r: any) => r.fromBlockId === activityId)
  const currentBlockType = blocks.find((b: any) => b.id === activityId)?.type
  const isTerminal =
    !outgoingRule ||
    currentBlockType === 'ACTION' ||
    currentBlockType === 'END' ||
    row?.stageType === 'ACTION'

  return { currentLabel, isTerminal, previousLabel }
}
