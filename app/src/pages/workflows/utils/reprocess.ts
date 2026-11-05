import type { Option } from '@/types/option'
import { isEndNode } from './slaSettings'

/** End block setting: finished requests can be re-initiated. No target = the start block. */
export interface ReprocessSettings {
  enabled: boolean
  targetBlockId: null | string
}

interface StageNode {
  id: string
  data?: Record<string, any>
}

const isStartNode = (data: Record<string, any> | undefined) => {
  const type = String(data?.type || '').toUpperCase()
  return type === 'TRIGGER' || type === 'START'
}

/** Every stage on the canvas except the End blocks; the start block is marked. */
export const getReprocessStageOptions = (nodes: StageNode[]): Option[] =>
  nodes
    .filter((node) => !isEndNode(node.data))
    .map((node) => {
      const label = String(node.data?.label || 'Stage')
      return {
        id: node.id,
        name: isStartNode(node.data) ? `${label} (Start)` : label,
      }
    })

/** Whether this saved workflow block is an End block with re-initiate turned on. */
export const canReinitiateFromBlock = (block: any) =>
  String(block?.type || '').toUpperCase() === 'END' &&
  block?.settings?.reprocess?.enabled === true
