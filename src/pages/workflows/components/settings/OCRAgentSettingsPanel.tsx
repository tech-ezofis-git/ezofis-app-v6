import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import cn from '@/utils/cn'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const regionOptions = ['East Asia', 'Middle East', 'US & Canada']

const assistantInputOptions = [
  { id: 1, name: 'Accounts Payable' },
  { id: 2, name: 'Purchase Orders' },
  { id: 3, name: 'Delivery Notes' },
  { id: 4, name: 'Contracts and Agreements' },
  { id: 5, name: 'Employee Records' },
  { id: 6, name: 'Time sheet and attendance' },
  { id: 7, name: 'Expense Report' },
  { id: 8, name: 'Sales Order' },
  { id: 9, name: 'Shipping Documents' },
  { id: 10, name: 'Quality Control Reports' },
]

const initialJson = `{
  "header": {
    "car_number": "string or null",
    "shipment_number": "string or null",
    "shipping_point": "string or null",
    "currency": "string or null",
    "invoice_number": "string or null",
    "invoice_date": "string or null",
    "order_number": "string or null",
    "customer_order_number": "string or null"
  }
}`

const outputMethodOptions: Option[] = [
  { id: 1, name: 'JSON Output' },
  { id: 2, name: 'Store Document' },
]

export default function OCRAgentSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as any

  const [region, setRegion] = useState(nodeData.region || 'US & Canada')
  const [assistantInput, setAssistantInput] = useState<any>(
    assistantInputOptions.find((opt) => opt.name === nodeData.assistantInput) ||
      assistantInputOptions[0],
  )
  const [fieldExtraction, setFieldExtraction] = useState(
    nodeData.fieldExtraction || initialJson,
  )
  const [jsonValid, setJsonValid] = useState(true)
  const [showInstructions, setShowInstructions] = useState(
    nodeData.showInstructions || false,
  )
  const [instructions, setInstructions] = useState(nodeData.instructions || '')
  const [outputSchema, setOutputSchema] = useState(
    nodeData.outputSchema || 'JSON Output',
  )

  const [openBasic, setOpenBasic] = useState(false)
  const [openFields, setOpenFields] = useState(false)

  const updateNodeData = (key: string, value: any) => {
    if (currentNode) {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === currentNode.id
            ? { ...n, data: { ...n.data, [key]: value } }
            : n,
        ),
      )
    }
  }

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion)
    updateNodeData('region', newRegion)
  }

  const handleAssistantInputChange = (option: any) => {
    setAssistantInput(option)
    updateNodeData('assistantInput', option?.name || '')
  }

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setFieldExtraction(val)
    updateNodeData('fieldExtraction', val)
    try {
      JSON.parse(val)
      setJsonValid(true)
    } catch {
      setJsonValid(false)
    }
  }

  // Keep state in sync with external changes
  useEffect(() => {
    if (nodeData.region && nodeData.region !== region)
      setRegion(nodeData.region)

    const currentName = assistantInput?.name || ''
    if (
      nodeData.assistantInput !== undefined &&
      nodeData.assistantInput !== currentName
    ) {
      const found = assistantInputOptions.find(
        (opt) => opt.name === nodeData.assistantInput,
      )
      setAssistantInput(found || null)
    }
    if (
      nodeData.fieldExtraction &&
      nodeData.fieldExtraction !== fieldExtraction
    ) {
      setFieldExtraction(nodeData.fieldExtraction)
      try {
        JSON.parse(nodeData.fieldExtraction)
        setJsonValid(true)
      } catch {
        setJsonValid(false)
      }
    }
  }, [nodeData])

  return (
    <div className='flex h-full flex-col overflow-hidden bg-white font-inter text-gray-12'>
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        <SettingsSection
          icon='lucide:settings-2'
          isOpen={openBasic}
          title='Basic Setup'
          variant='premium'
          onToggle={() => setOpenBasic(!openBasic)}
        >
          <div className='flex flex-col gap-2.5 py-1'>
            <div className='flex items-center gap-2.5 px-1 pb-1'>
              <Icon
                className='text-indigo-600 h-4 w-4'
                name='lucide:settings'
              />
              <div className='flex flex-col space-y-1'>
                <span className='text-13 font-medium text-gray-12'>
                  Processing Details
                </span>
                <span className='text-11 leading-tight text-gray-9'>
                  Configure document region and extraction type
                </span>
              </div>
            </div>

            {/* Region & Doc Type Card */}
            <div className='space-y-4 rounded-xl bg-white p-4 shadow-sm'>
              {/* Region */}
              <div className='flex flex-col gap-1.5'>
                <InputLabel label='Region' required />
                <div className='bg-gray-50/50 flex rounded-lg border border-gray-2/50 p-1 shadow-inner'>
                  {regionOptions.map((opt) => {
                    const isActive = region === opt
                    return (
                      <button
                        key={opt}
                        type='button'
                        className={cn(
                          'flex-1 rounded-md border border-transparent py-1.5 text-[11px] font-bold transition-all duration-300 outline-none',
                          isActive
                            ? 'bg-purple-9 text-white shadow-md active:scale-95'
                            : 'hover:bg-purple-50 text-gray-9 hover:text-purple-11',
                        )}
                        onClick={() => handleRegionChange(opt)}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Document Type Dropdown */}
              <div className='flex flex-col gap-1'>
                <InputSelect
                  className='bg-white'
                  label='Document Type'
                  options={assistantInputOptions}
                  value={assistantInput}
                  clearable
                  required
                  searchable
                  onChange={handleAssistantInputChange}
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon='lucide:file-json-2'
          isOpen={openFields}
          title='Field Extraction'
          variant='premium'
          onToggle={() => setOpenFields(!openFields)}
        >
          <div className='flex flex-col gap-2.5 py-1'>
            {/* Schema & JSON Card */}
            <div className='space-y-4 rounded-xl bg-white p-4 shadow-sm'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-amber-600 h-4 w-4 stroke-[2]'
                  name='lucide:file-json-2'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Schema Definition
                  </span>
                </div>
              </div>

              <div className='flex flex-col gap-1.5'>
                <p className='text-[12px] leading-relaxed text-gray-10'>
                  Define specific data fields to identify and retrieve from your
                  documents.
                </p>

                <div
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] font-bold',
                    jsonValid ? 'text-[#16a34a]' : 'text-red-500',
                  )}
                >
                  <Icon
                    className='h-3.5 w-3.5 stroke-[3]'
                    name={jsonValid ? 'lucide:check' : 'lucide:x'}
                  />
                  {jsonValid ? 'VALID JSON' : 'INVALID JSON'}
                </div>

                <div className='border-slate-100 bg-slate-50/30 relative overflow-hidden rounded-lg border font-mono text-[12px]'>
                  <div className='bg-slate-50 border-slate-100 text-gray-400 pointer-events-none absolute top-0 bottom-0 left-0 flex w-8 flex-col items-center border-r py-3 select-none'>
                    {fieldExtraction.split('\n').map((_: string, i: number) => (
                      <div className='h-5 leading-5' key={i}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    className='h-[240px] w-full resize-none bg-transparent py-3 pr-3 pl-11 leading-5 text-gray-13 outline-none focus:ring-1 focus:ring-primary-4'
                    spellCheck={false}
                    value={fieldExtraction}
                    onChange={handleJsonChange}
                  />
                </div>
              </div>
            </div>

            {/* Specific Instructions Card */}
            <div className='space-y-4 rounded-xl bg-white p-4 shadow-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <Icon
                    className='text-purple-600 h-4 w-4 stroke-[2]'
                    name='lucide:pencil-line'
                  />
                  <div className='flex flex-col space-y-1'>
                    <span className='text-13 font-medium text-gray-12'>
                      Specific Instructions
                    </span>
                    <span className='text-11 leading-tight text-gray-9'>
                      Add extra guidelines or formatting rules
                    </span>
                  </div>
                </div>
                <InputSwitch
                  checked={showInstructions}
                  onChange={(checked) => {
                    setShowInstructions(checked)
                    updateNodeData('showInstructions', checked)
                  }}
                />
              </div>

              {showInstructions && (
                <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                  <div className='border-slate-100 bg-slate-50/20 overflow-hidden rounded-lg border'>
                    {/* Toolbar Simulation */}
                    <div className='border-slate-100 flex items-center gap-2 border-b bg-white/50 p-2'>
                      {['B', 'I', 'U', 'list'].map((tool) => (
                        <button
                          className='flex h-6 w-6 items-center justify-center rounded border border-gray-2 bg-white text-gray-12 shadow-sm transition-colors hover:bg-gray-1'
                          key={tool}
                          type='button'
                        >
                          {tool === 'list' ? (
                            <Icon className='h-3 w-3' name='lucide:list' />
                          ) : (
                            <span
                              className={cn(
                                'text-10 font-bold',
                                tool === 'I' && 'italic',
                                tool === 'U' && 'underline',
                              )}
                            >
                              {tool}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className='h-24 w-full resize-none bg-transparent p-2.5 text-[13px] text-gray-12 outline-none placeholder:text-gray-9'
                      placeholder='Enter specific guidelines...'
                      value={instructions}
                      onChange={(e) => {
                        setInstructions(e.target.value)
                        updateNodeData('instructions', e.target.value)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Output Method Card */}
            <div className='space-y-4 rounded-xl bg-white p-4 shadow-sm'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-emerald-600 h-4 w-4 stroke-[2]'
                  name='lucide:layout'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Output Method
                  </span>
                </div>
              </div>

              <InputRadioGroup
                options={outputMethodOptions}
                optionsPerLine={2}
                value={
                  (outputMethodOptions.find((o) => o.name === outputSchema)
                    ?.id as any) || 1
                }
                onChange={(val) => {
                  const opt = outputMethodOptions.find((o) => o.id === val)
                  if (opt) {
                    setOutputSchema(opt.name)
                    updateNodeData('outputSchema', opt.name)
                  }
                }}
              />
            </div>
          </div>
        </SettingsSection>

        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
