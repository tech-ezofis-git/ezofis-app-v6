import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const actionTypeOptions: Option[] = [
  { id: 1, name: 'Purchase Requisition (PR) Review' },
  { id: 2, name: 'Purchase Order (PO) Generation' },
  { id: 3, name: 'Vendor Match & Audit' },
  { id: 4, name: 'Budget & Cost Center Approval Routing' },
]

const matchingRuleOptions: Option[] = [
  { id: 1, name: '3-Way Match (PO, Goods Receipt & Invoice)' },
  { id: 2, name: '2-Way Match (PO & Invoice)' },
  { id: 3, name: 'Threshold-Based Direct Approval' },
]

export default function ProcurementAgentSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as any

  const [actionType, setActionType] = useState<Option>(
    nodeData.actionType || actionTypeOptions[0],
  )
  const [matchingRuleId, setMatchingRuleId] = useState<number>(
    nodeData.matchingRuleId || 1,
  )
  const [maxAmountLimit, setMaxAmountLimit] = useState<string>(
    nodeData.maxAmountLimit || '10000',
  )
  const [toleranceThreshold, setToleranceThreshold] = useState<string>(
    nodeData.toleranceThreshold || '5',
  )

  const [syncVendorMaster, setSyncVendorMaster] = useState<boolean>(
    nodeData.syncVendorMaster ?? true,
  )
  const [autoApproveWithinBudget, setAutoApproveWithinBudget] = useState<boolean>(
    nodeData.autoApproveWithinBudget ?? false,
  )

  const [openBasic, setOpenBasic] = useState(true)
  const [openMatching, setOpenMatching] = useState(false)
  const [openBudget, setOpenBudget] = useState(false)

  const updateNodeData = (key: string, value: any) => {
    if (!currentNode) return
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                [key]: value,
              },
            }
          : n,
      ),
    )
  }

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 space-y-3.5 font-sans'>
      {/* Header Banner */}
      <div className='flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-teal-900 shadow-xs'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs'>
          <Icon className='h-5 w-5' name='lucide:shopping-bag' />
        </div>
        <div>
          <h3 className='text-sm font-bold text-teal-950'>Procurement Agent</h3>
          <p className='text-xs text-teal-700 font-medium leading-relaxed'>
            Automate requisitions, PO creation, vendor audit & matching.
          </p>
        </div>
      </div>

      {/* Basic Configuration */}
      <SettingsSection
        icon='lucide:sliders'
        isOpen={openBasic}
        title='Procurement Action'
        onToggle={() => setOpenBasic(!openBasic)}
      >
        <div className='space-y-4'>
          <div>
            <InputLabel label='Primary Procurement Action' />
            <InputSelect
              options={actionTypeOptions}
              value={actionType}
              onChange={(val) => {
                if (val) {
                  setActionType(val)
                  updateNodeData('actionType', val)
                }
              }}
            />
          </div>

          <InputSwitch
            checked={syncVendorMaster}
            label='Sync with ERP Vendor Master Database'
            onChange={(val) => {
              setSyncVendorMaster(val)
              updateNodeData('syncVendorMaster', val)
            }}
          />
        </div>
      </SettingsSection>

      {/* Vendor Matching Rules */}
      <SettingsSection
        icon='lucide:git-compare'
        isOpen={openMatching}
        title='Vendor & Invoice Matching Rules'
        onToggle={() => setOpenMatching(!openMatching)}
      >
        <div className='space-y-4'>
          <div>
            <InputLabel label='Matching Standard' />
            <InputRadioGroup
              options={matchingRuleOptions}
              value={matchingRuleId}
              onChange={(val) => {
                setMatchingRuleId(val)
                const opt = matchingRuleOptions.find((o) => o.id === val)
                if (opt) {
                  updateNodeData('matchingRuleId', val)
                  updateNodeData('matchingRule', opt.name)
                }
              }}
            />
          </div>

          <div>
            <InputLabel label='Price Variance Tolerance (%)' />
            <InputText
              placeholder='5'
              value={toleranceThreshold}
              onChange={(val) => {
                setToleranceThreshold(val)
                updateNodeData('toleranceThreshold', val)
              }}
            />
            <p className='mt-1 text-[11px] text-gray-500'>
              Maximum allowed variance between PO amount and vendor invoice.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Budget & Authorization */}
      <SettingsSection
        icon='lucide:dollar-sign'
        isOpen={openBudget}
        title='Budget & Threshold Controls'
        onToggle={() => setOpenBudget(!openBudget)}
      >
        <div className='space-y-4'>
          <div>
            <InputLabel label='Auto-Approval Limit ($)' />
            <InputText
              placeholder='10000'
              value={maxAmountLimit}
              onChange={(val) => {
                setMaxAmountLimit(val)
                updateNodeData('maxAmountLimit', val)
              }}
            />
          </div>

          <InputSwitch
            checked={autoApproveWithinBudget}
            label='Auto-approve requisitions within department budget limit'
            onChange={(val) => {
              setAutoApproveWithinBudget(val)
              updateNodeData('autoApproveWithinBudget', val)
            }}
          />
        </div>
      </SettingsSection>

      {/* Connections & Routing */}
      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}
