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

const verificationMethodOptions: Option[] = [
  { id: 1, name: 'Automated OCR & Biometric Matching' },
  { id: 2, name: 'Document Hash & Sanction List Verification' },
  { id: 3, name: 'Full Manual Compliance Officer Review' },
  { id: 4, name: 'AI Risk Scoring & Fraud Detection' },
]

const providerOptions: Option[] = [
  { id: 1, name: 'Ezofis AI Identity Engine' },
  { id: 2, name: 'Jumio Verification Services' },
  { id: 3, name: 'Onfido Identity Verification' },
  { id: 4, name: 'Trulioo Global Identity' },
]

export default function KYCAgentSettingsPanel({
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

  const [verificationMethodId, setVerificationMethodId] = useState<number>(
    nodeData.verificationMethodId || 1,
  )
  const [provider, setProvider] = useState<Option>(
    nodeData.provider || providerOptions[0],
  )
  const [riskThreshold, setRiskThreshold] = useState<string>(
    nodeData.riskThreshold || '85',
  )
  const [autoRejectHighRisk, setAutoRejectHighRisk] = useState<boolean>(
    nodeData.autoRejectHighRisk ?? true,
  )

  // Document requirements
  const [reqPassport, setReqPassport] = useState<boolean>(
    nodeData.reqPassport ?? true,
  )
  const [reqAddress, setReqAddress] = useState<boolean>(
    nodeData.reqAddress ?? true,
  )
  const [reqTaxId, setReqTaxId] = useState<boolean>(nodeData.reqTaxId ?? false)
  const [reqBusinessLicense, setReqBusinessLicense] = useState<boolean>(
    nodeData.reqBusinessLicense ?? false,
  )

  const [openBasic, setOpenBasic] = useState(true)
  const [openDocs, setOpenDocs] = useState(false)
  const [openRisk, setOpenRisk] = useState(false)

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
    <div className='flex h-full flex-col space-y-3.5 overflow-y-auto p-4 font-sans'>
      {/* Header Banner */}
      <div className='border-yellow-4 bg-yellow-2/70 text-yellow-12 flex items-center gap-3 rounded-xl border p-3.5 shadow-xs'>
        <div className='bg-yellow-9 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-xs'>
          <Icon className='h-5 w-5' name='lucide:shield-check' />
        </div>
        <div>
          <h3 className='text-yellow-12 text-sm font-bold'>KYC Agent</h3>
          <p className='text-yellow-11 text-xs leading-relaxed font-medium'>
            Identity verification, document authentication & risk analysis.
          </p>
        </div>
      </div>

      {/* Basic Configuration */}
      <SettingsSection
        icon='lucide:sliders'
        isOpen={openBasic}
        title='Verification Setup'
        onToggle={() => setOpenBasic(!openBasic)}
      >
        <div className='space-y-4'>
          <div>
            <InputLabel label='Verification Provider' />
            <InputSelect
              options={providerOptions}
              value={provider}
              onChange={(val) => {
                if (val) {
                  setProvider(val)
                  updateNodeData('provider', val)
                }
              }}
            />
          </div>

          <div>
            <InputLabel label='Verification Methodology' />
            <InputRadioGroup
              options={verificationMethodOptions}
              value={verificationMethodId}
              onChange={(val) => {
                setVerificationMethodId(val)
                const opt = verificationMethodOptions.find((o) => o.id === val)
                if (opt) {
                  updateNodeData('verificationMethodId', val)
                  updateNodeData('verificationMethod', opt.name)
                }
              }}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Document Requirements */}
      <SettingsSection
        icon='lucide:file-check'
        isOpen={openDocs}
        title='Required Documents'
        onToggle={() => setOpenDocs(!openDocs)}
      >
        <div className='space-y-3'>
          <InputSwitch
            checked={reqPassport}
            label='Passport / National Identity Card'
            onChange={(val) => {
              setReqPassport(val)
              updateNodeData('reqPassport', val)
            }}
          />
          <InputSwitch
            checked={reqAddress}
            label='Proof of Address (Utility / Bank Statement)'
            onChange={(val) => {
              setReqAddress(val)
              updateNodeData('reqAddress', val)
            }}
          />
          <InputSwitch
            checked={reqTaxId}
            label='Tax Identification Number (TIN/SSN)'
            onChange={(val) => {
              setReqTaxId(val)
              updateNodeData('reqTaxId', val)
            }}
          />
          <InputSwitch
            checked={reqBusinessLicense}
            label='Corporate / Business License (Commercial KYC)'
            onChange={(val) => {
              setReqBusinessLicense(val)
              updateNodeData('reqBusinessLicense', val)
            }}
          />
        </div>
      </SettingsSection>

      {/* Risk Scoring & Controls */}
      <SettingsSection
        icon='lucide:alert-triangle'
        isOpen={openRisk}
        title='Risk & Compliance Thresholds'
        onToggle={() => setOpenRisk(!openRisk)}
      >
        <div className='space-y-4'>
          <div>
            <InputLabel label='Minimum Verification Score (%)' />
            <InputText
              placeholder='85'
              value={riskThreshold}
              onChange={(val) => {
                setRiskThreshold(val)
                updateNodeData('riskThreshold', val)
              }}
            />
            <p className='text-gray-9 mt-1 text-[11px]'>
              Requests scoring below this threshold will be flagged for manual
              review.
            </p>
          </div>

          <InputSwitch
            checked={autoRejectHighRisk}
            label='Auto-Reject High Risk / Fraud Flagged Profiles'
            onChange={(val) => {
              setAutoRejectHighRisk(val)
              updateNodeData('autoRejectHighRisk', val)
            }}
          />
        </div>
      </SettingsSection>

      {/* Connections & Routing */}
      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}
