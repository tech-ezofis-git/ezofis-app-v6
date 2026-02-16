import { create } from 'zustand'
import type { Node } from '@xyflow/react'

type AddMenuState = {
    isOpen: boolean
    position: { x: number; y: number } | null
    edgeId: string | null
    nodeId: string | null
}

type Store = {
    selectedNode: Node | null
    isPanelOpen: boolean
    addMenu: AddMenuState
    selectNode: (node: Node | null) => void
    closePanel: () => void
    openAddMenu: (position: { x: number; y: number }, edgeId: string) => void
    openChangeMenu: (position: { x: number; y: number }, nodeId: string) => void
    closeAddMenu: () => void
}

const useWorkflowStore = create<Store>()((set) => ({
    selectedNode: null,
    isPanelOpen: false,
    addMenu: {
        isOpen: false,
        position: null,
        edgeId: null,
        nodeId: null,
    },
    selectNode: (node) => set({ selectedNode: node, isPanelOpen: !!node }),
    closePanel: () => set({ isPanelOpen: false, selectedNode: null }),
    openAddMenu: (position, edgeId) =>
        set({ addMenu: { isOpen: true, position, edgeId, nodeId: null } }),
    openChangeMenu: (position, nodeId) =>
        set({ addMenu: { isOpen: true, position, edgeId: null, nodeId } }),
    closeAddMenu: () =>
        set((state) => ({ addMenu: { ...state.addMenu, isOpen: false, nodeId: null, edgeId: null } })),
}))

export default useWorkflowStore
