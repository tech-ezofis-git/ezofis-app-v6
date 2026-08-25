import type { Edge, Node } from '@xyflow/react'
import { create } from 'zustand'
import { importWorkflow } from '../utils/importWorkflow'

type AddMenuState = {
  edgeId: string | null
  isOpen: boolean
  nodeId: string | null
  position: { x: number; y: number } | null
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
  loadedEdges: Edge[] | null
  loadedNodes: Node[] | null
  prefixSegments: Array<{ id: string; type: string; value: string }>
  selectedEdge: Edge | null
  selectedNode: Node | null
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
  setPrefixSegments: (
    segments: Array<{ id: string; type: string; value: string }>,
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
  loadedEdges: null,
  loadedNodes: null,
  prefixSegments: [
    { id: '1', type: 'date', value: 'Year' },
    { id: '2', type: 'separator', value: '-' },
    { id: '3', type: 'text', value: 'REQ' },
    { id: '4', type: 'auto-increment', value: '1' },
  ],
  selectedEdge: null,
  selectedNode: null,
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

    let prefixSegments = [
      { id: '1', type: 'date', value: 'Year' },
      { id: '2', type: 'separator', value: '-' },
      { id: '3', type: 'text', value: 'REQ' },
      { id: '4', type: 'auto-increment', value: '1' },
    ]

    try {
      if (legacyJson.settings?.general?.processNumberPrefix) {
        prefixSegments = JSON.parse(
          legacyJson.settings.general.processNumberPrefix,
        )
      }
    } catch (e) {}

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

    set({
      folder:
        legacyJson.settings?.general?.initiateUsing?.repositoryId ||
        apiData?.repositoryId ||
        null,
      form:
        legacyJson.settings?.general?.initiateUsing?.formId ||
        apiData?.formId ||
        null,
      initiateUsing:
        legacyJson.settings?.general?.initiateUsing?.type || 'document-form',
      loadedEdges: edges,
      loadedNodes: nodes,
      prefixSegments,
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
      loadedEdges: null,
      loadedNodes: null,
      prefixSegments: [
        { id: '1', type: 'date', value: 'Year' },
        { id: '2', type: 'separator', value: '-' },
        { id: '3', type: 'text', value: 'REQ' },
        { id: '4', type: 'auto-increment', value: '1' },
      ],
      selectedEdge: null,
      selectedNode: null,
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
  setPrefixSegments: (segments) => set({ prefixSegments: segments }),
  setWorkflowDescription: (description) =>
    set({ workflowDescription: description }),
  setWorkflowId: (workflowId) => set({ workflowId }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setWorkflowStatus: (status) => set({ workflowStatus: status }),
}))

export default useWorkflowStore
