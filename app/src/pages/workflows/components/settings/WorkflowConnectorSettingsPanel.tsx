import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import {
  isSubWorkflowIdSet,
  writeConnectorSettings,
} from '@/features/sub-workflow'
import useDefaultSectionOpen from '@/pages/workflows/utils/useDefaultSectionOpen'
import {
  CONNECTOR_ENGINE_READY,
  WORKFLOW_CONNECTOR_NODE,
} from '@/pages/workflows/utils/workflowConnector'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'
import SubWorkflowPicker from './common/SubWorkflowPicker'

export default function WorkflowConnectorSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const defaultOpen = useDefaultSectionOpen()
  const [openTarget, setOpenTarget] = useState(true)

  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  if (!currentNode) return null
  const nodeData = (currentNode.data || {}) as Record<string, any>
  const hasTarget = isSubWorkflowIdSet(nodeData.subWorkflowId)

  const handleChange = (option: Option | null) => {
    const { subWorkflowId } = writeConnectorSettings(option?.id)
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                subLabel: option
                  ? `Starts ${option.name}`
                  : WORKFLOW_CONNECTOR_NODE.subLabel,
                subWorkflowId,
                subWorkflowName: option?.name ?? '',
                warning: !option,
              },
            }
          : n,
      ),
    )
  }

  return (
    <div className='flex h-full flex-col space-y-3.5 overflow-y-auto p-4 font-sans'>
      <div className='animate-in fade-in slide-in-from-top-1 flex items-center gap-3 rounded-xl border border-pink-4 bg-pink-2/70 p-3.5 shadow-xs duration-300'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-9 text-white shadow-xs'>
          <Icon className='h-5 w-5' name={WORKFLOW_CONNECTOR_NODE.icon} />
        </div>
        <div>
          <h3 className='text-sm font-bold text-pink-12'>Workflow Connector</h3>
          <p className='text-xs leading-relaxed font-medium text-pink-11'>
            When a request reaches this step, a new request is started in the
            selected workflow and linked to it as a sub-process.
          </p>
          {!CONNECTOR_ENGINE_READY && (
            <p className='mt-1.5 flex items-start gap-1 text-xs leading-relaxed font-semibold text-pink-12'>
              <Icon className='mt-0.5 size-3.5 shrink-0' name='lucide:info' />
              Preview only: the server can't run this step yet, so a workflow
              that contains it won't save until it's removed.
            </p>
          )}
        </div>
      </div>

      <SettingsSection
        icon='lucide:git-branch-plus'
        isOpen={openTarget}
        title='Connected Workflow'
        onToggle={() => setOpenTarget(!openTarget)}
      >
        <SubWorkflowPicker
          description='Only published workflows are listed.'
          error={hasTarget ? undefined : 'Select a workflow to connect to'}
          value={nodeData.subWorkflowId}
          valueName={nodeData.subWorkflowName}
          required
          onChange={handleChange}
        />
      </SettingsSection>

      <ConnectionsRouting defaultOpen={defaultOpen} node={currentNode} />
    </div>
  )
}
