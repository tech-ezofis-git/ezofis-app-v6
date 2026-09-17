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

const qualificationFrameworkOptions: Option[] = [
  { id: 1, name: 'BANT (Budget, Authority, Need, Timeline)' },
  { id: 2, name: 'CHAMP (Challenges, Authority, Money, Prioritization)' },
  { id: 3, name: 'MEDDPICC (Metrics, Economic Buyer, Decision Criteria...)' },
  { id: 4, name: 'Custom Scoring Model' },
]

export default function QualifyAgentSettingsPanel({
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

  const [framework, setFramework] = useState<Option>(
    nodeData.framework || qualificationFrameworkOptions[0],
  )
  const [minLeadScore, setMinLeadScore] = useState<string>(
    nodeData.minLeadScore || '70',
  )
  const [minBudget, setMinBudget] = useState<string>(
    nodeData.minBudget || '5000',
  )
  const [autoDisqualifySpam, setAutoDisqualifySpam] = useState<boolean>(
    nodeData.autoDisqualifySpam ?? true,
  )
  const [requireVerifiedEmail, setRequireVerifiedEmail] = useState<boolean>(
    nodeData.requireVerifiedEmail ?? true,
  )

  const [openBasic, setOpenBasic] = useState(true)
  const [openCriteria, setOpenCriteria] = useState(false)

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
      <div className='flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-sky-900 shadow-xs'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs'>
          <Icon className='h-5 w-5' name='lucide:user-check' />
        </div>
        <div>
          <h3 className='text-sm font-bold text-sky-950'>Qualify Agent</h3>
          <p className='text-xs text-sky-700 font-medium leading-relaxed'>
            Qualify leads, verify prospect data & evaluate criteria.
          </p>
        </div>
      </div>

      {/* Framework Section */}
      <SettingsSection
        icon='lucide:sliders'
        isOpen={openBasic}
        title='Qualification Framework'
        variant='premium'
        onToggle={() => setOpenBasic(!openBasic)}
      >
        <div className='space-y-1.5'>
          <InputLabel label='Methodology' />
          <InputSelect
            options={qualificationFrameworkOptions}
            placeholder='Select framework'
            value={framework}
            onChange={(opt: any) => {
              if (opt) {
                setFramework(opt)
                updateNodeData('framework', opt)
              }
            }}
          />
        </div>

        <div className='space-y-1.5 pt-2'>
          <InputLabel label='Minimum Lead Score (0 - 100)' />
          <InputText
            placeholder='e.g. 70'
            value={minLeadScore}
            onChange={(val) => {
              setMinLeadScore(val)
              updateNodeData('minLeadScore', val)
            }}
          />
        </div>
      </SettingsSection>

      {/* Criteria Rules Section */}
      <SettingsSection
        icon='lucide:shield-check'
        isOpen={openCriteria}
        title='Qualification Criteria'
        variant='premium'
        onToggle={() => setOpenCriteria(!openCriteria)}
      >
        <div className='space-y-1.5'>
          <InputLabel label='Minimum Budget Requirement ($)' />
          <InputText
            placeholder='e.g. 5000'
            value={minBudget}
            onChange={(val) => {
              setMinBudget(val)
              updateNodeData('minBudget', val)
            }}
          />
        </div>

        <div className='flex items-center justify-between pt-2'>
          <div>
            <div className='text-xs font-semibold text-gray-800'>Auto-Disqualify Spam</div>
            <div className='text-[11px] text-gray-500'>Filter temp emails and invalid domains</div>
          </div>
          <InputSwitch
            checked={autoDisqualifySpam}
            onChange={(checked) => {
              setAutoDisqualifySpam(checked)
              updateNodeData('autoDisqualifySpam', checked)
            }}
          />
        </div>

        <div className='flex items-center justify-between pt-2'>
          <div>
            <div className='text-xs font-semibold text-gray-800'>Require Verified Email</div>
            <div className='text-[11px] text-gray-500'>Verify deliverability before routing</div>
          </div>
          <InputSwitch
            checked={requireVerifiedEmail}
            onChange={(checked) => {
              setRequireVerifiedEmail(checked)
              updateNodeData('requireVerifiedEmail', checked)
            }}
          />
        </div>
      </SettingsSection>

      {/* Connections & Routing */}
      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}
