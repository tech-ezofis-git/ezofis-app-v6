import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

type AddMenuState = {
    isOpen: boolean
    position: { x: number; y: number } | null
    edgeId: string | null
    nodeId: string | null
}

type Store = {
    workflowName: string
    workflowDescription: string
    setWorkflowName: (name: string) => void
    setWorkflowDescription: (description: string) => void
    initiateUsing: string
    folder: number | null
    form: number | null
    setInitiateUsing: (value: string) => void
    setFolder: (value: number | null) => void
    setForm: (value: number | null) => void
    prefixSegments: Array<{ id: string; type: string; value: string }>
    setPrefixSegments: (segments: Array<{ id: string; type: string; value: string }>) => void
    isRunningTest: boolean
    activeEdgeId: string | null
    activeNodeId: string | null
    startTestRun: () => void
    stopTestRun: () => void
    setActiveEdge: (edgeId: string | null) => void
    setActiveNode: (nodeId: string | null) => void
    workflowStatus: 'draft' | 'published'
    selectedNode: Node | null
    selectedEdge: Edge | null
    isPanelOpen: boolean
    isSettingsOpen: boolean
    addMenu: AddMenuState
    setWorkflowStatus: (status: 'draft' | 'published') => void
    selectNode: (node: Node | null) => void
    selectEdge: (edge: Edge | null) => void
    closePanel: () => void
    openSettings: () => void
    closeSettings: () => void
    openAddMenu: (position: { x: number; y: number }, edgeId: string) => void
    openChangeMenu: (position: { x: number; y: number }, nodeId: string) => void
    closeAddMenu: () => void
}

const useWorkflowStore = create<Store>()((set) => ({
    workflowName: `Workflow - ${new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).replace(',', '').replace(/\//g, '-')}`,
    workflowDescription: '',
    setWorkflowName: (name) => set({ workflowName: name }),
    setWorkflowDescription: (description) => set({ workflowDescription: description }),
    initiateUsing: 'document-form',
    folder: null,
    form: null,
    setInitiateUsing: (value) => set({ initiateUsing: value }),
    setFolder: (value) => set({ folder: value }),
    setForm: (value) => set({ form: value }),
    prefixSegments: [
        { id: '1', type: 'date', value: 'Year' },
        { id: '2', type: 'separator', value: '-' },
        { id: '3', type: 'text', value: 'REQ' },
        { id: '4', type: 'auto-increment', value: '1' }
    ],
    setPrefixSegments: (segments) => set({ prefixSegments: segments }),
    isRunningTest: false,
    activeEdgeId: null,
    activeNodeId: null,
    startTestRun: () => set({ isRunningTest: true }),
    stopTestRun: () => set({ isRunningTest: false, activeEdgeId: null, activeNodeId: null }),
    setActiveEdge: (edgeId) => set({ activeEdgeId: edgeId }),
    setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
    workflowStatus: 'draft',
    selectedNode: null,
    selectedEdge: null,
    isPanelOpen: false,
    isSettingsOpen: false,
    addMenu: {
        isOpen: false,
        position: null,
        edgeId: null,
        nodeId: null,
    },
    setWorkflowStatus: (status) => set({ workflowStatus: status }),
    selectNode: (node) => set({ selectedNode: node, selectedEdge: null, isPanelOpen: !!node, isSettingsOpen: false }),
    selectEdge: (edge) => set({ selectedEdge: edge, selectedNode: null, isPanelOpen: !!edge, isSettingsOpen: false }),
    closePanel: () => set({ isPanelOpen: false, selectedNode: null, selectedEdge: null }),
    openSettings: () => set({ isSettingsOpen: true, isPanelOpen: false, selectedNode: null, selectedEdge: null }),
    closeSettings: () => set({ isSettingsOpen: false }),
    openAddMenu: (position, edgeId) =>
        set({ addMenu: { isOpen: true, position, edgeId, nodeId: null } }),
    openChangeMenu: (position, nodeId) =>
        set({ addMenu: { isOpen: true, position, edgeId: null, nodeId } }),
    closeAddMenu: () =>
        set((state) => ({ addMenu: { ...state.addMenu, isOpen: false, nodeId: null, edgeId: null } })),
}))

export default useWorkflowStore
