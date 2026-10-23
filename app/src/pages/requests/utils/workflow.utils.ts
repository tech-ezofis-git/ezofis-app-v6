import { t } from '@lingui/macro'
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

// How the workflow is initiated ("initiate using"), read from settings /
// workflowJson / flowJson the same way the in-app new request does, upper-cased
// without separators: 'FORM', 'DOCUMENT', 'DOCUMENTFORM', or '' when unset.
export function getWorkflowInitiateType(workflow: any): string {
  if (!workflow) return ''
  const parse = (value: any) => {
    if (typeof value !== 'string') return value || null
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return String(
    workflow.settings?.general?.initiateUsing?.type ||
      parse(workflow.workflowJson)?.settings?.general?.initiateUsing?.type ||
      parse(workflow.flowJson)?.settings?.general?.initiateUsing?.type ||
      '',
  )
    .toUpperCase()
    .replace(/[-_\s]/g, '')
}

// True when the workflow starts from an uploaded document ("Document Form")
export function isDocumentFormWorkflow(workflow: any): boolean {
  return getWorkflowInitiateType(workflow) === 'DOCUMENTFORM'
}

// Field ids the workflow's start block hides from the initiator on a new
// request (its "form visibility" access and secure-control rules). Shared by
// the in-app new request and the portal so both hide the same fields.
export function getStartStageHiddenFieldIds(
  workflow: any,
  panels: any[],
  currentUserId: string,
): Set<string> {
  const blocks = extractBlocks(workflow)
  // Find the first trigger / start / manual user block for New Request
  const startBlock =
    blocks.find((b: any) => {
      const type = String(b.type || b.toolType || '').toUpperCase()
      return (
        type === 'START' ||
        type === 'INITIATOR' ||
        type === 'TRIGGER' ||
        type === 'MANUAL_USER' ||
        type === 'FORM_SUBMISSION'
      )
    }) || blocks[0]

  const settings = startBlock?.settings || {}
  const access = String(settings.formVisibilityAccess || 'ALL').toUpperCase()
  const allFieldIds = panels.flatMap((p: any) =>
    (p.fields || []).map((f: any) => String(f.id)),
  )
  if (access === 'ALL') return new Set<string>()
  if (access === 'NONE') return new Set(allFieldIds)

  const rules = Array.isArray(settings.formSecureControls)
    ? settings.formSecureControls
    : []
  const rule =
    rules.find((r: any) => String(r.userId) === currentUserId) ||
    rules.find((r: any) => !r.userId) ||
    (rules.length === 1 ? rules[0] : null)

  if (!rule) return new Set<string>()
  const specifiedFields = new Set<string>((rule.formFields || []).map(String))
  const mode = (rule.visibilityMode || 'HIDE').toUpperCase()
  if (mode === 'SHOW') {
    return new Set(allFieldIds.filter((id) => !specifiedFields.has(id)))
  }
  // HIDE mode (default)
  return specifiedFields
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

export type WorkflowStageStep = {
  id: string
  label: string
  isCondition?: boolean
  isEnd?: boolean
  isSuccess?: boolean
  status?: 'done' | 'current' | 'future'
}

const stageLabel = (block: any) =>
  String(
    block?.settings?.label || block?.label || block?.name || block?.type || 'Stage',
  )

export interface ComputeWorkflowStagesParams {
  workflow: any
  history?: any[]
  currentActivityId?: string | number
  isCompleted?: boolean
}

// Computes user-facing stages based on history (executed path), active stage,
// and prospective next stage (or condition block if multiple connections exist).
export const computeWorkflowStages = ({
  workflow,
  history = [],
  currentActivityId,
  isCompleted = false,
}: ComputeWorkflowStagesParams): WorkflowStageStep[] => {
  const { blocks, rules } = extractWorkflowGraph(workflow)
  if (!blocks.length) return []

  const byId = new Map(blocks.map((block: any) => [String(block.id), block]))
  const byName = new Map<string, any>()
  blocks.forEach((block: any) => {
    const l = stageLabel(block).toLowerCase().trim()
    if (l) byName.set(l, block)
    const n = String(block.name || '').toLowerCase().trim()
    if (n) byName.set(n, block)
  })

  const endBlocks = blocks.filter(
    (block: any) => String(block?.type || '').toUpperCase() === 'END',
  )

  const currentIdStr =
    currentActivityId != null ? String(currentActivityId).trim() : ''

  // Look for the specific END block executed in history (from latest to earliest)
  let executedEndBlock: any = null
  let executedEndLabel = ''

  if (Array.isArray(history) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i]
      const actId = h.activityId != null ? String(h.activityId).trim() : ''
      const typeStr = String(h.stageType || '').toUpperCase()

      if (actId && byId.has(actId)) {
        const b = byId.get(actId)
        if (String(b?.type || '').toUpperCase() === 'END') {
          executedEndBlock = b
          break
        }
      }

      if (typeStr === 'END') {
        const rawName = String(h.stageName || h.stage || '').toLowerCase().trim()
        if (rawName && byName.has(rawName)) {
          executedEndBlock = byName.get(rawName)
          break
        }
        if (h.stageName || h.stage) {
          executedEndLabel = String(h.stageName || h.stage).trim()
          break
        }
      }
    }
  }

  if (!executedEndBlock && currentIdStr && byId.has(currentIdStr)) {
    const b = byId.get(currentIdStr)
    if (String(b?.type || '').toUpperCase() === 'END') {
      executedEndBlock = b
    }
  }

  const endBlock = executedEndBlock || endBlocks[0] || null
  const currentBlockNow = currentIdStr ? byId.get(currentIdStr) : null
  const currentIsLiveStage =
    Boolean(currentBlockNow) &&
    String(currentBlockNow?.type || '').toUpperCase() !== 'END'

  // 1. Determine if the workflow has completed / reached terminal stage.
  // A live stage such as Approver means the request is still in progress,
  // even when an earlier history row says "approved" or "completed".
  const isTerminal =
    !currentIsLiveStage &&
    (Boolean(isCompleted) ||
      (Boolean(endBlock) && currentIdStr === String(endBlock.id)) ||
      (Array.isArray(history) &&
        history.some((h: any) => {
          const s = String(h.status || '')
            .toLowerCase()
            .trim()
          return (
            s === 'completed' ||
            s === 'workflow success' ||
            s === 'success' ||
            s === 'closed'
          )
        })))

  // 2. Extract stages that actually executed from history (ignoring unvisited branches)
  const visitedBlocks: any[] = []
  const seenIds = new Set<string>()

  if (Array.isArray(history) && history.length > 0) {
    history.forEach((h: any) => {
      const actId = h.activityId != null ? String(h.activityId).trim() : ''
      let block = actId ? byId.get(actId) : null

      if (!block) {
        const rawName = String(h.stageName || h.stage || '').toLowerCase().trim()
        block = byName.get(rawName)
      }

      if (!block && h.title) {
        const titleStr = String(h.title).toLowerCase()
        const afterDash = (
          titleStr.split('—')[1] || titleStr.split('-')[1] || ''
        ).trim()
        if (afterDash && byName.has(afterDash)) {
          block = byName.get(afterDash)
        } else {
          for (const b of blocks) {
            const bLabel = stageLabel(b).toLowerCase().trim()
            if (bLabel && titleStr.includes(bLabel)) {
              block = b
              break
            }
          }
        }
      }

      const isEnd =
        block && String(block.type || '').toUpperCase() === 'END'
      if (isEnd) return // Appended explicitly when terminal

      if (block) {
        const id = String(block.id)
        if (!seenIds.has(id)) {
          seenIds.add(id)
          visitedBlocks.push(block)
        }
      } else {
        const fallbackLabel = String(
          h.stageName || h.stage || h.title || '',
        ).trim()
        const fallbackLower = fallbackLabel.toLowerCase()
        if (
          fallbackLabel &&
          fallbackLower !== 'completed' &&
          fallbackLower !== 'start' &&
          !fallbackLower.includes('start')
        ) {
          const synthId = actId || `hist-${fallbackLabel}`
          if (!seenIds.has(synthId)) {
            seenIds.add(synthId)
            visitedBlocks.push({ id: synthId, label: fallbackLabel })
          }
        }
      }
    })
  }

  // 3. Fallback if history is empty (e.g. brand new request)
  if (visitedBlocks.length === 0) {
    if (currentIdStr && byId.has(currentIdStr)) {
      const b = byId.get(currentIdStr)
      if (String(b.type || '').toUpperCase() !== 'END') {
        visitedBlocks.push(b)
        seenIds.add(String(b.id))
      }
    } else {
      const start = blocks.find(
        (b: any) => String(b?.type || '').toUpperCase() === 'START',
      )
      if (start) {
        visitedBlocks.push(start)
        seenIds.add(String(start.id))
      }
    }
  }

  // Ensure current active block is present in visited blocks if running
  let currentBlock = currentIdStr ? byId.get(currentIdStr) : null
  if (
    currentBlock &&
    String(currentBlock.type || '').toUpperCase() !== 'END' &&
    !seenIds.has(String(currentBlock.id))
  ) {
    visitedBlocks.push(currentBlock)
    seenIds.add(String(currentBlock.id))
  }

  if (!currentBlock && visitedBlocks.length > 0) {
    currentBlock = visitedBlocks[visitedBlocks.length - 1]
  }

  const result: WorkflowStageStep[] = visitedBlocks.map((b: any) => ({
    id: String(b.id),
    label: stageLabel(b),
    status: 'done',
  }))

  // 4. Completed / Terminal:
  if (isTerminal) {
    if (endBlock) {
      result.push({
        id: String(endBlock.id),
        label: stageLabel(endBlock),
        isEnd: true,
        isSuccess: true,
        status: 'done',
      })
    } else {
      result.push({
        id: '__end_success__',
        label: executedEndLabel || 'Workflow Success',
        isEnd: true,
        isSuccess: true,
        status: 'done',
      })
    }
    return result
  }

  // 5. In-progress: mark active block as 'current'
  if (result.length > 0) {
    result[result.length - 1].status = 'current'
  }

  // Check outgoing connections from the current block
  if (currentBlock) {
    const curId = String(currentBlock.id)
    const outgoing = rules.filter(
      (rule: any) =>
        String(rule.fromBlockId || rule.from || rule.source || '') === curId,
    )
    const distinctTargets = Array.from(
      new Set(
        outgoing
          .map((r: any) => String(r.toBlockId || r.to || r.target || ''))
          .filter(Boolean),
      ),
    )

    if (distinctTargets.length >= 2 || outgoing.length >= 2) {
      result.push({
        id: '__conditional_next__',
        label: t`Conditional flow`,
        isCondition: true,
        status: 'future',
      })
    } else if (distinctTargets.length === 1) {
      const nextTargetId = distinctTargets[0]
      const nextBlock = byId.get(nextTargetId)
      if (nextBlock) {
        const nextType = String(nextBlock.type || '').toUpperCase()
        if (
          nextType === 'CONDITION' ||
          nextType === 'DECISION' ||
          nextType === 'BRANCH'
        ) {
          result.push({
            id: '__conditional_next__',
            label: t`Conditional flow`,
            isCondition: true,
            status: 'future',
          })
        } else {
          result.push({
            id: String(nextBlock.id),
            label: stageLabel(nextBlock),
            isEnd: nextType === 'END',
            status: 'future',
          })
        }
      }
    }
  }

  return result
}

export type StageTrailItem = {
  /** 1-based position of the step in the whole flow. */
  number: number
  step: WorkflowStageStep
}

/**
 * Compact 3-step window for the request header: previous, current and next
 * (a condition when the route branches). On the first stage it shows steps
 * 1–3, looking one block further ahead along a single path when needed.
 * When the flow is finished it shows the last three steps.
 */
export const getStageTrail = (
  stages: WorkflowStageStep[],
  workflow?: any,
): StageTrailItem[] => {
  if (!stages.length) return []
  const items: StageTrailItem[] = stages.map((step, index) => ({
    number: index + 1,
    step,
  }))
  const currentIndex = stages.findIndex((step) => step.status === 'current')

  if (currentIndex === -1) return items.slice(-3)
  if (currentIndex > 0) return items.slice(currentIndex - 1, currentIndex + 2)

  // First stage: extend one step past the known next one when the path is linear.
  const last = items[items.length - 1]
  if (
    items.length < 3 &&
    workflow &&
    !last.step.isCondition &&
    !last.step.isEnd &&
    last.step.status === 'future'
  ) {
    const { blocks, rules } = extractWorkflowGraph(workflow)
    const targets = Array.from(
      new Set(
        rules
          .filter(
            (rule: any) =>
              String(rule.fromBlockId || rule.from || rule.source || '') ===
              last.step.id,
          )
          .map((rule: any) => String(rule.toBlockId || rule.to || rule.target || ''))
          .filter(Boolean),
      ),
    )
    if (targets.length >= 2) {
      items.push({
        number: items.length + 1,
        step: {
          id: '__conditional_next_2__',
          isCondition: true,
          label: t`Conditional flow`,
          status: 'future',
        },
      })
    } else if (targets.length === 1) {
      const block = blocks.find((b: any) => String(b.id) === targets[0])
      if (block) {
        const type = String(block.type || '').toUpperCase()
        const isCondition =
          type === 'CONDITION' || type === 'DECISION' || type === 'BRANCH'
        items.push({
          number: items.length + 1,
          step: {
            id: String(block.id),
            isCondition,
            isEnd: type === 'END',
            label: isCondition ? t`Conditional flow` : stageLabel(block),
            status: 'future',
          },
        })
      }
    }
  }

  return items.slice(0, 3)
}

export const listWorkflowStages = (
  workflow: any,
  history?: any[],
  currentActivityId?: string | number,
  isCompleted?: boolean,
): WorkflowStageStep[] =>
  computeWorkflowStages({
    workflow,
    history,
    currentActivityId,
    isCompleted,
  })

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
