import type { Edge, Node } from '@xyflow/react'
import { create } from 'zustand'
import { importWorkflow } from '../utils/importWorkflow'
import {
  type KanbanCardSetting,
  parseKanbanSettings,
} from '../utils/kanbanSettings'
import {
  isFilledValue,
  type WorkflowValidationErrors,
} from '../utils/validateWorkflowSettings'

export type PrefixSegment = { id: string; key: string; value: string | number }

// A user-named Requests-page tab. Only the first 3 entries (by position)
// are wired to real data today - position 0/1/2 map to the workflow's
// Inbox/Sent/Completed (or Invoices/Exceptions/Processed for AP) buckets
// regardless of what they're labelled; anything past index 2 has no data
// source yet and renders empty on the Requests page.
export type RequestTabConfig = { id: string; label: string }

type AddMenuState = {
  edgeId: string | null
  isOpen: boolean
  nodeId: string | null
  position: { x: number; y: number } | null
}

const defaultPrefixSegments: PrefixSegment[] = [
  { id: '1', key: 'seperator', value: '-' },
  { id: '2', key: 'prefix', value: 'REQ' },
  { id: '3', key: 'autoIncrement', value: 1 },
]

const KNOWN_PREFIX_KEYS = new Set([
  'seperator',
  'reset',
  'prefix',
  'year',
  'month',
  'formColumn',
  'currentDate',
  'autoIncrement',
])

const migrateLegacyPrefix = (raw: unknown): PrefixSegment[] => {
  if (typeof raw !== 'string' || !raw) return defaultPrefixSegments
  try {
    const parsed = JSON.parse(raw)
    // Data saved under an unrecognized/older segment shape (e.g. the
    // pre-migration `{id, type, value}` format) has no usable `key` -
    // treat it the same as "no setting saved" rather than rendering
    // blank rows.
    if (
      Array.isArray(parsed) &&
      parsed.length &&
      parsed.some((s) => KNOWN_PREFIX_KEYS.has(s?.key))
    ) {
      return parsed
    }
    return defaultPrefixSegments
  } catch {
    return [
      { id: '1', key: 'seperator', value: '-' },
      { id: '2', key: 'reset', value: 'year' },
      { id: '3', key: 'prefix', value: raw },
      { id: '4', key: 'autoIncrement', value: 1 },
    ]
  }
}

type Store = {
  activeEdgeId: string | null
  activeNodeId: string | null
  addMenu: AddMenuState
  folder: number | null
  form: number | null
  initiateUsing: string
  isBuilderOpen: boolean
  isPanelOpen: boolean
  isRunningTest: boolean
  isSettingsOpen: boolean
  kanbanSettings: KanbanCardSetting[]
  loadedEdges: Edge[] | null
  loadedNodes: Node[] | null
  prefixSegments: PrefixSegment[]
  previewValues: string[]
  requestTitleField: string | null
  requestTabs: RequestTabConfig[]
  selectedEdge: Edge | null
  selectedNode: Node | null
  settingsValidationErrors: WorkflowValidationErrors | null
  workflowDescription: string
  workflowId: number | null
  workflowName: string
  workflowStatus: 'draft' | 'published'
  closeAddMenu: () => void
  closeBuilder: () => void
  closePanel: () => void
  closeSettings: () => void
  loadLegacyWorkflow: (legacyJson: any, apiData?: any) => void
  openAddMenu: (position: { x: number; y: number }, edgeId: string) => void
  openChangeMenu: (position: { x: number; y: number }, nodeId: string) => void
  openSettings: () => void
  resetWorkflow: () => void
  selectEdge: (edge: Edge | null) => void
  selectNode: (node: Node | null) => void
  setActiveEdge: (edgeId: string | null) => void
  setActiveNode: (nodeId: string | null) => void
  setFolder: (value: number | null) => void
  setForm: (value: number | null) => void
  setInitiateUsing: (value: string) => void
  setKanbanSettings: (cards: KanbanCardSetting[]) => void
  setPrefixSegments: (segments: PrefixSegment[]) => void
  setPreviewValues: (values: string[]) => void
  setRequestTitleField: (field: string | null) => void
  setRequestTabs: (tabs: RequestTabConfig[]) => void
  setSettingsValidationErrors: (
    errors: WorkflowValidationErrors | null,
  ) => void
  setWorkflowDescription: (description: string) => void
  setWorkflowId: (id: number | null) => void
  setWorkflowName: (name: string) => void
  setWorkflowStatus: (status: 'draft' | 'published') => void
  startTestRun: () => void
  stopTestRun: () => void
}

const useWorkflowStore = create<Store>()((set) => ({
  activeEdgeId: null,
  activeNodeId: null,
  addMenu: {
    edgeId: null,
    isOpen: false,
    nodeId: null,
    position: null,
  },
  folder: null,
  form: null,
  initiateUsing: 'document-form',
  isBuilderOpen: false,
  isPanelOpen: false,
  isRunningTest: false,
  isSettingsOpen: false,
  kanbanSettings: [],
  loadedEdges: null,
  loadedNodes: null,
  prefixSegments: defaultPrefixSegments,
  previewValues: [],
  requestTitleField: null,
  requestTabs: [],
  selectedEdge: null,
  selectedNode: null,
  settingsValidationErrors: null,
  workflowDescription: '',
  workflowId: null,
  workflowName: `Workflow - ${new Date()
    .toLocaleString('en-US', {
      day: '2-digit',
      hour: '2-digit',
      hour12: true,
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(',', '')
    .replace(/\//g, '-')}`,
  workflowStatus: 'draft',
  closeAddMenu: () =>
    set((state) => ({
      addMenu: { ...state.addMenu, edgeId: null, isOpen: false, nodeId: null },
    })),
  closeBuilder: () => set({ isBuilderOpen: false }),
  closePanel: () =>
    set({ isPanelOpen: false, selectedEdge: null, selectedNode: null }),
  closeSettings: () => set({ isSettingsOpen: false }),
  // ... rest of the functions (will be updated below in TargetContent range)
  loadLegacyWorkflow: (legacyJson: any, apiData?: any) => {
    const { edges, nodes } = importWorkflow(legacyJson)

    const prefixSegments = migrateLegacyPrefix(
      legacyJson.settings?.general?.processNumberPrefix,
    )

    let previewValues: string[] = []
    try {
      const rawPreviewValues = legacyJson.settings?.general?.previewValues
      previewValues = Array.isArray(rawPreviewValues)
        ? rawPreviewValues
        : typeof rawPreviewValues === 'string'
          ? JSON.parse(rawPreviewValues)
          : []
    } catch {
      previewValues = []
    }

    let requestTabs: RequestTabConfig[] = []
    try {
      const rawRequestTabs = legacyJson.settings?.general?.requestTabs
      const parsed = Array.isArray(rawRequestTabs)
        ? rawRequestTabs
        : typeof rawRequestTabs === 'string'
          ? JSON.parse(rawRequestTabs)
          : []
      requestTabs = Array.isArray(parsed)
        ? parsed
            .map((entry, index) => {
              const label = String(entry?.label ?? '').trim()
              if (!label) return null
              return {
                id: String(entry?.id ?? `tab-${index + 1}`),
                label,
              }
            })
            .filter((tab): tab is RequestTabConfig => Boolean(tab))
        : []
    } catch {
      requestTabs = []
    }

    const rawStatus =
      apiData?.publishOption ||
      apiData?.status ||
      legacyJson.settings?.publish?.publishOption

    const isPublished =
      String(rawStatus).toUpperCase() === 'PUBLISHED' ||
      rawStatus === 1 ||
      rawStatus === '1'

    const workflowName =
      legacyJson.settings?.general?.name ||
      legacyJson.name ||
      apiData?.name ||
      'Imported Workflow'
    const workflowDescription =
      legacyJson.settings?.general?.description ||
      legacyJson.description ||
      apiData?.description ||
      ''

    const rawFolder =
      legacyJson.settings?.general?.initiateUsing?.repositoryId ??
      apiData?.repositoryId
    const rawForm =
      legacyJson.settings?.general?.initiateUsing?.formId ??
      apiData?.formId

    set({
      folder: isFilledValue(rawFolder)
        ? (typeof rawFolder === 'number' ? rawFolder : Number(rawFolder) || rawFolder)
        : null,
      form: isFilledValue(rawForm)
        ? (typeof rawForm === 'number' ? rawForm : Number(rawForm) || rawForm)
        : null,
      initiateUsing:
        legacyJson.settings?.general?.initiateUsing?.type || 'document-form',
      kanbanSettings: parseKanbanSettings(
        legacyJson.settings?.general?.kanbanSettings,
      ),
      loadedEdges: edges,
      loadedNodes: nodes,
      prefixSegments,
      previewValues,
      requestTitleField: legacyJson.settings?.general?.requestTitleField || null,
      requestTabs,
      workflowDescription,
      workflowId: legacyJson.id || apiData?.id || null,
      workflowName,
      workflowStatus: isPublished ? 'published' : 'draft',
    })
  },
  openAddMenu: (position, edgeId) =>
    set({ addMenu: { edgeId, isOpen: true, nodeId: null, position } }),
  openChangeMenu: (position, nodeId) =>
    set({ addMenu: { edgeId: null, isOpen: true, nodeId, position } }),
  openSettings: () =>
    set({
      isPanelOpen: false,
      isSettingsOpen: true,
      selectedEdge: null,
      selectedNode: null,
    }),
  resetWorkflow: () =>
    set({
      folder: null,
      form: null,
      initiateUsing: 'document-form',
      kanbanSettings: [],
      loadedEdges: null,
      loadedNodes: null,
      prefixSegments: defaultPrefixSegments,
      previewValues: [],
      requestTitleField: null,
      requestTabs: [],
      selectedEdge: null,
      selectedNode: null,
      settingsValidationErrors: null,
      workflowDescription: '',
      workflowId: null,
      workflowName: `Workflow - ${new Date()
        .toLocaleString('en-US', {
          day: '2-digit',
          hour: '2-digit',
          hour12: true,
          minute: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(',', '')
        .replace(/\//g, '-')}`,
      workflowStatus: 'draft',
    }),
  selectEdge: (edge) =>
    set({
      isPanelOpen: !!edge,
      isSettingsOpen: false,
      selectedEdge: edge,
      selectedNode: null,
    }),
  selectNode: (node) =>
    set({
      isPanelOpen: !!node,
      isSettingsOpen: false,
      selectedEdge: null,
      selectedNode: node,
    }),
  startTestRun: () => set({ isRunningTest: true }),
  stopTestRun: () =>
    set({ activeEdgeId: null, activeNodeId: null, isRunningTest: false }),
  setActiveEdge: (edgeId) => set({ activeEdgeId: edgeId }),
  setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
  setFolder: (value) => set({ folder: value }),
  setForm: (value) => set({ form: value }),
  setInitiateUsing: (value) => set({ initiateUsing: value }),
  setKanbanSettings: (cards) => set({ kanbanSettings: cards }),
  setPrefixSegments: (segments) => set({ prefixSegments: segments }),
  setPreviewValues: (values) => set({ previewValues: values }),
  setRequestTitleField: (field) => set({ requestTitleField: field }),
  setRequestTabs: (tabs) => set({ requestTabs: tabs }),
  setSettingsValidationErrors: (errors) =>
    set({ settingsValidationErrors: errors }),
  setWorkflowDescription: (description) =>
    set({ workflowDescription: description }),
  setWorkflowId: (workflowId) => set({ workflowId }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setWorkflowStatus: (status) => set({ workflowStatus: status }),
}))

export default useWorkflowStore
