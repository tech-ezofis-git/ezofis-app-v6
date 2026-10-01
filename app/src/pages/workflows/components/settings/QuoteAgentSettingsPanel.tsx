import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import AgentKnowledgeSkillPanel from './common/AgentKnowledgeSkillPanel'
import SettingsSection from './common/SettingsSection'

export default function QuoteAgentSettingsPanel({ node }: { node?: Node }) {
  return (
    <AgentKnowledgeSkillPanel
      extraSettings={<QuoteTableEditableSetting node={node} />}
      node={node}
      config={{
        instructionPlaceholder:
          'Discount limits, margin floor, tax, currency, and how long the quote stays valid.',
        knowledgeHint:
          'Upload the price list, rate card, or discount policy. The quote request comes from the previous step.',
        skillPlaceholder:
          'Describe how this agent should price and build the quote.',
      }}
    />
  )
}

function QuoteTableEditableSetting({ node: initialNode }: { node?: Node }) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as Record<string, unknown>
  const showTableAsEditable = Boolean(nodeData.showTableAsEditable)
  const [openTable, setOpenTable] = useState(true)

  const updateNodeData = (patch: Record<string, unknown>) => {
    if (!currentNode) return
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                ...patch,
              },
            }
          : n,
      ),
    )
  }

  return (
    <SettingsSection
      icon='lucide:table'
      isOpen={openTable}
      title='Quote Table'
      onToggle={() => setOpenTable(!openTable)}
    >
      <InputSwitch
        checked={showTableAsEditable}
        description='Match form tables by heading (for example Line Item), including calculated columns. Edits in this agent write back to form data.'
        label='Show the table as editable'
        onChange={(val) => updateNodeData({ showTableAsEditable: val })}
      />
    </SettingsSection>
  )
}
