// Shapes for the sub-workflow feature, mirroring the V5 contract
// (see SUBWORKFLOW_PLAN.md). Two mechanisms share `subWorkflowId`:
//  - Workflow Initiator: a START / INTERNAL_ACTOR block lets the user start a
//    child request manually.
//  - Workflow Connector: a WORKFLOW_CONNECTOR block the engine runs.

/** `settings` keys written into a WORKFLOW_CONNECTOR block in flowJson. */
export interface ConnectorBlockSettings {
  label: string
  subWorkflowId: Id
}

export type Id = number | string

/** `settings` keys written into a START / INTERNAL_ACTOR block in flowJson. */
export interface InitiatorBlockSettings {
  /** Target workflow id; 0 when the initiator is off. */
  subWorkflowId: Id
  workflowInitiator: boolean
}

/** Parent request as seen from a child (`getDetailsforMainworkflow`). */
export interface MainProcessDetails {
  flowStatus: number | string
  processId: Id
  requestNo: string
  workflowId: Id
  workflowName?: string
}

export interface SubProcessPreviewField {
  label: string
  value: string
}

/** A child request as shown in the Sub Process panel and list sub-rows. */
export interface SubProcessRow {
  flowStatus: number | string
  processId: Id
  requestNo: string
  subWorkflowId: Id
  subWorkflowName: string
  /** Seconds since the child's last action. */
  duration?: number
  /** True when the child's current task is assigned to the current user. */
  inbox?: boolean
  lastAction?: string
  /** The first few filled-in values of the child's own form, in form order. */
  preview?: SubProcessPreviewField[]
  raisedAt?: string
  raisedBy?: string
  stage?: string
}

export type SubProcessStatus = 'completed' | 'forceClosed' | 'running'

/** One child stage inside a parent history row (`subWorkflowHistory[]`). */
export interface SubWorkflowHistoryRow {
  requestNo: string
  stage: string
  action?: string
  actionAt?: string | null
  actionStatus?: number
  actionUser?: string | null
  actionUserEmail?: string | null
  activityId?: string | number
  agentType?: string
  description?: string
  performedByUserName?: string
  processedBy?: string | null
  processedOn?: string | null
  receivedOn?: string | null
  review?: string
  stageName?: string
  stageType?: string
  status?: string
  title?: string
}

/** Row of the parent→child link table (`POST /workflow/postSubWorkflow`). */
export interface SubWorkflowLink {
  mainProcessId: Id
  mainWorkflowId: Id
  review: string
  subProcessId: Id
  subProcessStatus: number
  subWorkflowId: Id
}

/** A parent→child field copy produced by the label-matching pre-fill. */
export interface SubWorkflowPrefillField {
  label: string
  /** Parent field id the value came from. */
  sourceId: string
  /** Child field id the value goes to. */
  targetId: string
  type: string
  value: unknown
}
