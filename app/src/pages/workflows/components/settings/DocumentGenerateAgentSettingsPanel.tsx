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

const outputFormatOptions: Option[] = [
  { id: 1, name: 'PDF Document (.pdf)' },
  { id: 2, name: 'Microsoft Word Document (.docx)' },
  { id: 3, name: 'HTML Web Report (.html)' },
  { id: 4, name: 'Rich Text Format (.rtf)' },
]

const templateSourceOptions: Option[] = [
  { id: 1, name: 'Custom Ezofis HTML Template' },
  { id: 2, name: 'Uploaded Word Template (.docx)' },
  { id: 3, name: 'Dynamic Request Form Mapping' },
]

export default function DocumentGenerateAgentSettingsPanel({
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

  const [outputFormat, setOutputFormat] = useState<Option>(
    nodeData.outputFormat || outputFormatOptions[0],
  )
  const [templateSourceId, setTemplateSourceId] = useState<number>(
    nodeData.templateSourceId || 1,
  )
  const [documentTitlePattern, setDocumentTitlePattern] = useState<string>(
    nodeData.documentTitlePattern || 'Generated_Doc_{{request_id}}',
  )
  const [watermarkText, setWatermarkText] = useState<string>(
    nodeData.watermarkText || '',
  )

  const [embedDigitalSignature, setEmbedDigitalSignature] = useState<boolean>(
    nodeData.embedDigitalSignature ?? true,
  )
  const [autoStoreInVault, setAutoStoreInVault] = useState<boolean>(
    nodeData.autoStoreInVault ?? true,
  )
  const [notifyRecipient, setNotifyRecipient] = useState<boolean>(
    nodeData.notifyRecipient ?? false,
  )

  const [openBasic, setOpenBasic] = useState(true)
  const [openSecurity, setOpenSecurity] = useState(false)

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
      <div className='flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-indigo-900 shadow-xs'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs'>
          <Icon className='h-5 w-5' name='lucide:file-text' />
        </div>
        <div>
          <h3 className='text-sm font-bold text-indigo-950'>Document Generate Agent</h3>
          <p className='text-xs text-indigo-700 font-medium leading-relaxed'>
            Automated PDF & Word document generation from form templates & data.
          </p>
        </div>
      </div>

      {/* Basic Configuration */}
      <SettingsSection
        icon='lucide:file-code'
        isOpen={openBasic}
        title='Document Template & Format'
        onToggle={() => setOpenBasic(!openBasic)}
      >
        <div className='space-y-4'>
          <div>
            <InputLabel label='Output File Format' />
            <InputSelect
              options={outputFormatOptions}
              value={outputFormat}
              onChange={(val) => {
                if (val) {
                  setOutputFormat(val)
                  updateNodeData('outputFormat', val)
                }
              }}
            />
          </div>

          <div>
            <InputLabel label='Template Engine Source' />
            <InputRadioGroup
              options={templateSourceOptions}
              value={templateSourceId}
              onChange={(val) => {
                setTemplateSourceId(val)
                const opt = templateSourceOptions.find((o) => o.id === val)
                if (opt) {
                  updateNodeData('templateSourceId', val)
                  updateNodeData('templateSource', opt.name)
                }
              }}
            />
          </div>

          <div>
            <InputLabel label='Document Naming Pattern' />
            <InputText
              placeholder='Generated_Doc_{{request_id}}'
              value={documentTitlePattern}
              onChange={(val) => {
                setDocumentTitlePattern(val)
                updateNodeData('documentTitlePattern', val)
              }}
            />
            <p className='mt-1 text-[11px] text-gray-500'>
              Use tags like {'{{request_id}}'} or {'{{date}}'} to dynamically name generated files.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Security & Watermark */}
      <SettingsSection
        icon='lucide:lock'
        isOpen={openSecurity}
        title='Security, Signature & Storage'
        onToggle={() => setOpenSecurity(!openSecurity)}
      >
        <div className='space-y-4'>
          <div>
            <InputLabel label='Document Watermark (Optional)' />
            <InputText
              placeholder='CONFIDENTIAL'
              value={watermarkText}
              onChange={(val) => {
                setWatermarkText(val)
                updateNodeData('watermarkText', val)
              }}
            />
          </div>

          <InputSwitch
            checked={embedDigitalSignature}
            label='Embed Digital Signature Placeholder Block'
            onChange={(val) => {
              setEmbedDigitalSignature(val)
              updateNodeData('embedDigitalSignature', val)
            }}
          />

          <InputSwitch
            checked={autoStoreInVault}
            label='Automatically Store in Document Repository / Vault'
            onChange={(val) => {
              setAutoStoreInVault(val)
              updateNodeData('autoStoreInVault', val)
            }}
          />

          <InputSwitch
            checked={notifyRecipient}
            label='Send Email Notification with Generated Document Attached'
            onChange={(val) => {
              setNotifyRecipient(val)
              updateNodeData('notifyRecipient', val)
            }}
          />
        </div>
      </SettingsSection>

      {/* Connections & Routing */}
      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}
