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
      if (rule.fromBlockId === activityId) {
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
      const block = blocks.find((b: any) => b.id === activityId)
      if (block?.settings?.internalForward) {
        actions.push({
          color: 'orange',
          icon: 'tabler:user-share',
          label: 'Assign',
          value: 'Assign',
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

/**
 * An Accounts Payable workflow is one built with the "Intelligent AP Agent"
 * step from the workflow builder (block type `AP_AGENT` — see
 * AddNodeMenu.tsx / StepFour.tsx's applyApAgentSettings). Every other
 * workflow is treated as a generic, form-driven workflow.
 */
export const isAccountsPayableWorkflow = (workflow: any): boolean =>
  extractBlocks(workflow).some((block: any) => block?.type === 'AP_AGENT')

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
