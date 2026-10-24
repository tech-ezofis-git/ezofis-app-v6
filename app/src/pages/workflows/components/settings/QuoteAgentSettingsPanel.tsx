import type { Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useMemo, useState } from 'react'
import { getMasterFormsQueryOptions } from '@/api/form/queries'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import {
  isExternalPoMaster,
  resolveMasterOption,
} from '@/pages/workflows/utils/poSourceConfig'
import useDefaultSectionOpen from '@/pages/workflows/utils/useDefaultSectionOpen'
import AgentKnowledgeSkillPanel from './common/AgentKnowledgeSkillPanel'
import PoSourceSettings from './common/PoSourceSettings'
import SettingsSection from './common/SettingsSection'

export default function QuoteAgentSettingsPanel({ node }: { node?: Node }) {
  return (
    <AgentKnowledgeSkillPanel
      node={node}
      config={{
        instructionPlaceholder:
          'Discount limits, margin floor, tax, currency, and how long the quote stays valid.',
        knowledgeHint:
          'Upload the price list, rate card, or discount policy. The quote request comes from the previous step.',
        skillPlaceholder:
          'Describe how this agent should price and build the quote.',
      }}
      extraSettings={
        <>
          <QuoteBasicSetup node={node} />
          <QuoteTableEditableSetting node={node} />
        </>
      }
    />
  )
}

/**
 * Basic Setup → Sync Source: the AP Agent's PO source picker (Master Form,
 * QuickBooks or SAP), saved with the same keys the AP Agent uses.
 */
function QuoteBasicSetup({ node: initialNode }: { node?: Node }) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as any
  const [openBasic, setOpenBasic] = useState(false)
  const { data: masterForms = [] } = useQuery(getMasterFormsQueryOptions())

  const [poMaster, setPoMaster] = useState<any>(() =>
    isExternalPoMaster(nodeData.poMaster) ? null : nodeData.poMaster || null,
  )
  const poMasterSourceType =
    nodeData.poMasterSourceType ||
    nodeData.poMasterType ||
    nodeData.poMaster?.sourceType ||
    'internal'
  // Master form shown in the dropdown, resolved against the loaded forms.
  const poMasterValue = useMemo(() => {
    if (poMasterSourceType !== 'internal') return null
    const candidate = poMaster || nodeData.poMaster
    if (!candidate || isExternalPoMaster(candidate)) return null
    return resolveMasterOption(candidate, masterForms)
  }, [masterForms, nodeData.poMaster, poMaster, poMasterSourceType])

  const updateNodeData = (key: string, value: any) => {
    if (!currentNode) return
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? { ...n, data: { ...n.data, [key]: value } }
          : n,
      ),
    )
  }

  if (!currentNode) return null

  return (
    <SettingsSection
      icon='lucide:settings-2'
      isOpen={openBasic}
      title='Basic Setup'
      variant='premium'
      onToggle={() => setOpenBasic(!openBasic)}
    >
      <div className='rounded-xl bg-surface p-4 shadow-sm'>
        <PoSourceSettings
          heading='Sync Source'
          masterForms={masterForms}
          nodeData={nodeData}
          poMaster={poMaster}
          poMasterValue={poMasterValue}
          sourceLabel='Source'
          updateNodeData={updateNodeData}
          setPoMaster={setPoMaster}
        />
      </div>
    </SettingsSection>
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
  const defaultOpen = useDefaultSectionOpen()
  const [openTable, setOpenTable] = useState(defaultOpen)

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
