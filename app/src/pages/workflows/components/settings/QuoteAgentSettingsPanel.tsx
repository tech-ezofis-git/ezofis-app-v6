import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const quoteModelOptions: Option[] = [
  { id: 1, name: 'Standard Catalog Pricing' },
  { id: 2, name: 'Tiered Volume Discounting' },
  { id: 3, name: 'Subscription & Recurring Plan Quote' },
  { id: 4, name: 'Custom CPQ Rules' },
]

export default function QuoteAgentSettingsPanel({
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

  const [quoteModel, setQuoteModel] = useState<Option>(
    nodeData.quoteModel || quoteModelOptions[0],
  )
  const [expiryDays, setExpiryDays] = useState<string>(
    nodeData.expiryDays || '30',
  )
  const [marginThreshold, setMarginThreshold] = useState<string>(
    nodeData.marginThreshold || '15',
  )
  const [autoSendQuotePDF, setAutoSendQuotePDF] = useState<boolean>(
    nodeData.autoSendQuotePDF ?? true,
  )
  const [requireManagerApproval, setRequireManagerApproval] = useState<boolean>(
    nodeData.requireManagerApproval ?? false,
  )

  const [openBasic, setOpenBasic] = useState(true)
  const [openControls, setOpenControls] = useState(false)

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
      <div className='flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-900 shadow-xs'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs'>
          <Icon className='h-5 w-5' name='lucide:calculator' />
        </div>
        <div>
          <h3 className='text-sm font-bold text-emerald-950'>Quote Agent</h3>
          <p className='text-xs text-emerald-700 font-medium leading-relaxed'>
            Calculate pricing, generate sales quotes & manage discounts.
          </p>
        </div>
      </div>

      {/* Pricing Model Section */}
      <SettingsSection
        icon='lucide:sliders'
        isOpen={openBasic}
        title='Pricing & Quote Configuration'
        variant='premium'
        onToggle={() => setOpenBasic(!openBasic)}
      >
        <div className='space-y-1.5'>
          <InputLabel label='Quote Calculation Model' />
          <InputSelect
            options={quoteModelOptions}
            placeholder='Select quote model'
            value={quoteModel}
            onChange={(opt: any) => {
              if (opt) {
                setQuoteModel(opt)
                updateNodeData('quoteModel', opt)
              }
            }}
          />
        </div>

        <div className='space-y-1.5 pt-2'>
          <InputLabel label='Quote Validity (Days)' />
          <InputText
            placeholder='e.g. 30'
            value={expiryDays}
            onChange={(val) => {
              setExpiryDays(val)
              updateNodeData('expiryDays', val)
            }}
          />
        </div>
      </SettingsSection>

      {/* Controls & Approvals Section */}
      <SettingsSection
        icon='lucide:shield-alert'
        isOpen={openControls}
        title='Discount & Approval Controls'
        variant='premium'
        onToggle={() => setOpenControls(!openControls)}
      >
        <div className='space-y-1.5'>
          <InputLabel label='Min. Gross Margin Threshold (%)' />
          <InputText
            placeholder='e.g. 15'
            value={marginThreshold}
            onChange={(val) => {
              setMarginThreshold(val)
              updateNodeData('marginThreshold', val)
            }}
          />
        </div>

        <div className='flex items-center justify-between pt-2'>
          <div>
            <div className='text-xs font-semibold text-gray-800'>Auto-Generate Quote PDF</div>
            <div className='text-[11px] text-gray-500'>Create customer PDF document automatically</div>
          </div>
          <InputSwitch
            checked={autoSendQuotePDF}
            onChange={(checked) => {
              setAutoSendQuotePDF(checked)
              updateNodeData('autoSendQuotePDF', checked)
            }}
          />
        </div>

        <div className='flex items-center justify-between pt-2'>
          <div>
            <div className='text-xs font-semibold text-gray-800'>Require Manager Approval</div>
            <div className='text-[11px] text-gray-500'>Require sign-off for custom discounts</div>
          </div>
          <InputSwitch
            checked={requireManagerApproval}
            onChange={(checked) => {
              setRequireManagerApproval(checked)
              updateNodeData('requireManagerApproval', checked)
            }}
          />
        </div>
      </SettingsSection>

      {/* Connections & Routing */}
      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}
