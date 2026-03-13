import type { Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import { getMasterFormsQueryOptions } from '@/api/form/queries'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import cn from '@/utils/cn'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const invoiceTypeOptions = [
  {
    description: 'Automated matching',
    icon: 'lucide:receipt-text',
    id: 1,
    name: 'PO Invoices',
  },
  {
    description: 'Direct GL coding',
    icon: 'lucide:file-text',
    id: 2,
    name: 'Non-PO',
  },
]

const poMatchingOptions = [
  {
    description: 'PO + Invoice',
    icons: ['lucide:file-text', 'lucide:shopping-cart'],
    id: 1,
    name: '2-Way Match',
  },
  {
    description: 'PO + Invoice + Receipt',
    icons: ['lucide:file-text', 'lucide:shopping-cart', 'lucide:truck'],
    id: 2,
    name: '3-Way Match',
  },
]

const availableFields = [
  { icon: 'lucide:user', id: 1, name: 'Supplier Name' },
  { icon: 'lucide:hash', id: 2, name: 'PO Number' },
  { icon: 'lucide:banknote', id: 3, name: 'Currency' },
  { icon: 'lucide:dollar-sign', id: 4, name: 'Total Due' },
  { icon: 'lucide:list', id: 5, name: 'Line Items' },
  { icon: 'lucide:calendar', id: 6, name: 'Invoice Date' },
  { icon: 'lucide:percent', id: 7, name: 'Tax Amount' },
]

interface Props {
  node?: Node
}

export default function APAgentSettingsPanel({ node: initialNode }: Props) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as any

  // Fetch Master Forms from API
  const { data: masterForms = [] } = useQuery(getMasterFormsQueryOptions())

  // --- States initialized from nodeData ---
  const [openBasic, setOpenBasic] = useState(false)
  const [openValidation, setOpenValidation] = useState(false)
  const [openScoring, setOpenScoring] = useState(false)

  // Formatting helper for initial master values
  const getMasterOption = (val: any) => {
    if (!val) return null
    // If it's already an option object, return it. If it's an ID, we'll try to find it in masterForms (though masterForms might be loading)
    if (typeof val === 'object' && val.id) return val
    return masterForms.find((m) => m.id === val) || null
  }

  const [invoiceType, setInvoiceType] = useState(
    invoiceTypeOptions.find((opt) => opt.name === nodeData.invoiceType) ||
    invoiceTypeOptions[0],
  )
  const [poMatching, setPoMatching] = useState(
    poMatchingOptions.find((opt) => opt.name === nodeData.poMatching) ||
    poMatchingOptions[0],
  )

  const [poMaster, setPoMaster] = useState<any>(
    getMasterOption(nodeData.poMaster),
  )
  const [invoiceMaster, setInvoiceMaster] = useState<any>(
    getMasterOption(nodeData.invoiceMaster),
  )
  const [vendorSource, setVendorSource] = useState<any>(
    getMasterOption(nodeData.vendorSource),
  )
  const [glSource, setGlSource] = useState<any>(
    getMasterOption(nodeData.glSource),
  )
  const [matterSource, setMatterSource] = useState<any>(
    getMasterOption(nodeData.matterSource),
  )

  // Validation States
  const [vendorMustExist, setVendorMustExist] = useState(
    nodeData.vendorMustExist ?? true,
  )
  const [syncGL, setSyncGL] = useState(nodeData.syncGL ?? false)
  const [syncMatter, setSyncMatter] = useState(nodeData.syncMatter ?? false)
  const [duplicateDetection, setDuplicateDetection] = useState(
    nodeData.duplicateDetection ?? true,
  )
  const [backOrderDetection, setBackOrderDetection] = useState(
    nodeData.backOrderDetection ?? false,
  )

  // Scoring States
  const [weights, setWeights] = useState(
    nodeData.weights || [
      {
        fieldId: 1,
        icon: 'lucide:user',
        label: 'Supplier Name',
        rowId: nanoid(),
        value: 35,
      },
      {
        fieldId: 2,
        icon: 'lucide:hash',
        label: 'PO Number',
        rowId: nanoid(),
        value: 35,
      },
      {
        fieldId: 3,
        icon: 'lucide:banknote',
        label: 'Currency',
        rowId: nanoid(),
        value: 10,
      },
      {
        fieldId: 4,
        icon: 'lucide:dollar-sign',
        label: 'Total Due',
        rowId: nanoid(),
        value: 10,
      },
      {
        fieldId: 5,
        icon: 'lucide:list',
        label: 'Line Items',
        rowId: nanoid(),
        value: 10,
      },
    ],
  )

  const [thresholds, setThresholds] = useState(
    nodeData.thresholds || {
      approved: 90,
      partial: 60,
    },
  )

  // --- Derived Values ---
  const isPO = invoiceType.name === 'PO Invoices'
  const isNonPO = invoiceType.name === 'Non-PO'
  const totalWeight = weights.reduce((acc: number, w: any) => acc + w.value, 0)
  const isThresholdInvalid = thresholds.partial >= thresholds.approved

  // Values for display in select (handle loading from masterForms)
  const poMasterValue = poMaster || getMasterOption(nodeData.poMaster) || null
  const invoiceMasterValue =
    invoiceMaster || getMasterOption(nodeData.invoiceMaster) || null
  const vendorSourceValue =
    vendorSource || getMasterOption(nodeData.vendorSource) || null
  const glSourceValue = glSource || getMasterOption(nodeData.glSource) || null
  const matterSourceValue =
    matterSource || getMasterOption(nodeData.matterSource) || null

  // --- Update Logic ---
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

  const handleInvoiceTypeChange = (opt: any) => {
    setInvoiceType(opt)
    updateNodeData('invoiceType', opt.name)
  }

  const handlePoMatchingChange = (opt: any) => {
    setPoMatching(opt)
    updateNodeData('poMatching', opt.name)
  }

  const updateWeight = (rowId: string, value: number) => {
    const newWeights = weights.map((w: any) =>
      w.rowId === rowId ? { ...w, value } : w,
    )
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  const updateWeightField = (rowId: string, fieldId: number) => {
    const field = availableFields.find((f) => f.id === fieldId)
    if (!field) return
    const newWeights = weights.map((w: any) =>
      w.rowId === rowId
        ? {
          ...w,
          fieldId: field.id,
          icon: field.icon,
          label: field.name,
        }
        : w,
    )
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  const addWeight = () => {
    const nextAvailable = availableFields.find(
      (f) => !weights.find((w: any) => w.fieldId === f.id),
    )
    const field = nextAvailable || availableFields[0]
    const newWeights = [
      ...weights,
      {
        fieldId: field.id,
        icon: field.icon,
        label: field.name,
        rowId: nanoid(),
        value: 0,
      },
    ]
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  const removeWeight = (rowId: string) => {
    const newWeights = weights.filter((w: any) => w.rowId !== rowId)
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  // --- Sync local state with nodeData changes ---
  useEffect(() => {
    if (nodeData.invoiceType && nodeData.invoiceType !== invoiceType.name) {
      setInvoiceType(
        invoiceTypeOptions.find((opt) => opt.name === nodeData.invoiceType) ||
        invoiceTypeOptions[0],
      )
    }
    if (nodeData.poMatching && nodeData.poMatching !== poMatching.name) {
      setPoMatching(
        poMatchingOptions.find((opt) => opt.name === nodeData.poMatching) ||
        poMatchingOptions[0],
      )
    }
    if (
      nodeData.vendorMustExist !== undefined &&
      nodeData.vendorMustExist !== vendorMustExist
    ) {
      setVendorMustExist(nodeData.vendorMustExist)
    }
    // Add other syncs as needed...
  }, [nodeData])

  // Special sync for masterForms once they load
  useEffect(() => {
    if (masterForms.length > 0) {
      if (!poMaster && nodeData.poMaster)
        setPoMaster(getMasterOption(nodeData.poMaster))
      if (!invoiceMaster && nodeData.invoiceMaster)
        setInvoiceMaster(getMasterOption(nodeData.invoiceMaster))
      if (!vendorSource && nodeData.vendorSource)
        setVendorSource(getMasterOption(nodeData.vendorSource))
      if (!glSource && nodeData.glSource)
        setGlSource(getMasterOption(nodeData.glSource))
      if (!matterSource && nodeData.matterSource)
        setMatterSource(getMasterOption(nodeData.matterSource))
    }
  }, [
    masterForms,
    nodeData.poMaster,
    nodeData.invoiceMaster,
    nodeData.vendorSource,
    nodeData.glSource,
    nodeData.matterSource,
  ])

  return (
    <div className='flex h-full flex-col overflow-hidden bg-white font-inter text-gray-12'>
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        {/* BASIC SETUP */}
        <SettingsSection
          icon='lucide:settings-2'
          isOpen={openBasic}
          title='Basic Setup'
          variant='premium'
          onToggle={() => setOpenBasic(!openBasic)}
        >
          {/* Processing Mode */}
          <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center gap-2.5 px-0.5'>
              <Icon
                className='text-indigo-600 h-4 w-4 stroke-[2]'
                name='lucide:settings'
              />
              <div className='flex flex-col space-y-1'>
                <span className='text-13 font-medium text-gray-12'>
                  Processing Mode
                </span>
                <span className='text-11 leading-tight text-gray-9'>
                  Select the invoice processing workflow type
                </span>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              {invoiceTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={cn(
                    'group/btn flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-center transition-all duration-300 active:scale-95',
                    invoiceType.id === opt.id
                      ? 'bg-purple-50/20 border-purple-3 shadow-sm'
                      : 'bg-slate-50/20 border-gray-5/40 shadow-sm',
                  )}
                  onClick={() => handleInvoiceTypeChange(opt)}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300',
                      invoiceType.id === opt.id
                        ? 'scale-110 text-purple-9'
                        : 'group-hover/btn:text-gray-400 text-gray-9/40',
                    )}
                  >
                    <Icon className='h-6 w-6' name={opt.icon} />
                  </div>
                  <div className='flex flex-col space-y-0.5'>
                    <div
                      className={cn(
                        'text-13 font-medium transition-colors duration-300',
                        invoiceType.id === opt.id
                          ? 'text-gray-13'
                          : 'text-gray-12',
                      )}
                    >
                      {opt.name}
                    </div>
                    <div className='text-11 leading-tight text-gray-9 opacity-70'>
                      {opt.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Matching Strategy */}
          {isPO && (
            <div className='animate-in fade-in slide-in-from-top-1 space-y-3 rounded-xl bg-white p-4 shadow-sm duration-300'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-rose-600 h-4 w-4 stroke-[2]'
                  name='lucide:git-pull-request'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Matching Strategy
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Define how invoices are matched with Purchase Orders
                  </span>
                </div>
              </div>
              <div className='space-y-2'>
                {poMatchingOptions.map((opt) => (
                  <button
                    key={opt.id}
                    className={cn(
                      'group/strategy flex w-full items-center justify-between rounded-xl border p-2.5 transition-all duration-300 active:scale-[0.99]',
                      poMatching.id === opt.id
                        ? 'bg-purple-50/20 border-purple-3 shadow-sm'
                        : 'bg-slate-50/20 border-gray-5/40 shadow-sm',
                    )}
                    onClick={() => handlePoMatchingChange(opt)}
                  >
                    <div className='flex items-center gap-3'>
                      <div className='flex -space-x-1.5'>
                        {opt.icons.map((icon, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-full border ring-2 ring-white transition-all duration-300',
                              poMatching.id === opt.id
                                ? 'bg-purple-50 border-purple-200 scale-105 text-purple-9'
                                : 'bg-gray-50 border-gray-100 group-hover/strategy:text-gray-400 text-gray-9/40',
                            )}
                          >
                            <Icon className='h-3.5 w-3.5' name={icon} />
                          </div>
                        ))}
                      </div>
                      <div className='flex flex-col items-start space-y-0.5'>
                        <span
                          className={cn(
                            'text-13 font-medium transition-colors duration-300',
                            poMatching.id === opt.id
                              ? 'text-purple-11'
                              : 'text-gray-12',
                          )}
                        >
                          {opt.name}
                        </span>
                        <span className='text-11 leading-tight text-gray-9 opacity-80'>
                          {opt.description}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'flex h-4.5 w-4.5 items-center justify-center rounded-full border transition-all duration-300',
                        poMatching.id === opt.id
                          ? 'shadow-purple-200 scale-110 border-purple-9 bg-purple-9 shadow-sm'
                          : 'border-gray-3 bg-white group-hover/strategy:border-gray-4',
                      )}
                    >
                      {poMatching.id === opt.id && (
                        <Icon
                          className='animate-in zoom-in-50 h-2.5 w-2.5 stroke-[3] text-white duration-300'
                          name='lucide:check'
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className='space-y-1.5 px-0.5 pt-1'>
                <div className='text-12 font-medium text-gray-12'>
                  PO Master Resource
                </div>
                <InputSelect
                  options={masterForms}
                  placeholder='Select PO Master'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable={true}
                  value={poMasterValue}
                  onChange={(val) => {
                    setPoMaster(val)
                    updateNodeData('poMaster', val)
                  }}
                />
              </div>
            </div>
          )}

          {/* Master Resources */}
          {isNonPO && (
            <div className='animate-in fade-in slide-in-from-top-1 space-y-3 rounded-xl bg-white p-4 shadow-sm duration-300'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-blue-600 h-4 w-4 stroke-[2]'
                  name='lucide:database'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Master Resources
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Select the data sources for verification
                  </span>
                </div>
              </div>
              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Invoice Master Resource
                </div>
                <InputSelect
                  options={masterForms}
                  placeholder='Select Invoice Master'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable={true}
                  value={invoiceMasterValue}
                  onChange={(val) => {
                    setInvoiceMaster(val)
                    updateNodeData('invoiceMaster', val)
                  }}
                />
              </div>
            </div>
          )}
        </SettingsSection>

        {/* VALIDATION RULES */}
        <SettingsSection
          icon='lucide:shield-check'
          isOpen={openValidation}
          title='Validation & Sync'
          variant='premium'
          onToggle={() => setOpenValidation(!openValidation)}
        >
          {/* Vendor Verification */}
          <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-blue-600 h-4 w-4 stroke-[2]'
                  name='lucide:building-2'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Vendor Verification
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Validate vendor details against master database
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={vendorMustExist}
                onChange={(checked) => {
                  setVendorMustExist(checked)
                  updateNodeData('vendorMustExist', checked)
                }}
              />
            </div>
            {vendorMustExist && (
              <div className='animate-in fade-in slide-in-from-top-1 duration-300'>
                <div className='space-y-1.5 pt-1'>
                  <div className='text-12 font-medium text-gray-12'>
                    Vendor Source
                  </div>
                  <InputSelect
                    options={masterForms}
                    placeholder='Select Vendor Source'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={vendorSourceValue}
                    onChange={(val) => {
                      setVendorSource(val)
                      updateNodeData('vendorSource', val)
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Detection */}
          <div className='rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-amber-600 h-4 w-4 stroke-[2]'
                  name='lucide:copy-check'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Duplicate Detection
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Identify and flag potential duplicate invoices
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={duplicateDetection}
                onChange={(val) => {
                  setDuplicateDetection(val)
                  updateNodeData('duplicateDetection', val)
                }}
              />
            </div>
          </div>

          {/* Back Order Detection */}
          <div className='rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-orange-600 h-4 w-4 stroke-[2]'
                  name='lucide:package-x'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Back Order Detection
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Check if items are on back order or unavailable
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={backOrderDetection}
                onChange={(val) => {
                  setBackOrderDetection(val)
                  updateNodeData('backOrderDetection', val)
                }}
              />
            </div>
          </div>

          {/* GL Section */}
          <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-emerald-600 h-4 w-4 stroke-[2]'
                  name='lucide:book-open-check'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    GL Account Verification
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Ensure GL codes are valid and mapped correctly
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={syncGL}
                onChange={(val) => {
                  setSyncGL(val)
                  updateNodeData('syncGL', val)
                }}
              />
            </div>
            {syncGL && (
              <div className='animate-in fade-in slide-in-from-top-1 duration-300'>
                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    GL Source
                  </div>
                  <InputSelect
                    options={masterForms}
                    placeholder='Select GL Master'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={glSourceValue}
                    onChange={(val) => {
                      setGlSource(val)
                      updateNodeData('glSource', val)
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Matter Section */}
          <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-slate-600 h-4 w-4 stroke-[2]'
                  name='lucide:briefcase'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Matter Verification
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Verify details against linked case or matter
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={syncMatter}
                onChange={(val) => {
                  setSyncMatter(val)
                  updateNodeData('syncMatter', val)
                }}
              />
            </div>
            {syncMatter && (
              <div className='animate-in fade-in slide-in-from-top-1 duration-300'>
                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    Matter Source
                  </div>
                  <InputSelect
                    options={masterForms}
                    placeholder='Select Matter Master'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={matterSourceValue}
                    onChange={(val) => {
                      setMatterSource(val)
                      updateNodeData('matterSource', val)
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* SCORING & THRESHOLDS */}
        <SettingsSection
          icon='lucide:gauge'
          isOpen={openScoring}
          title='Scoring & Thresholds'
          variant='premium'
          onToggle={() => setOpenScoring(!openScoring)}
        >
          {/* Scoring Weights */}
          <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between pb-0.5'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-purple-600 h-4 w-4 stroke-[2]'
                  name='lucide:bar-chart-big'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Scoring Weights
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Assign importance to different match criteria
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-11 font-medium whitespace-nowrap transition-all duration-300',
                  totalWeight !== 100
                    ? 'animate-pulse border-red-3 bg-red-1 text-red-11'
                    : 'border-green-3 bg-green-1 text-green-11',
                )}
              >
                Total: {totalWeight}%
              </div>
            </div>

            <div className='space-y-1.5'>
              {weights.map((w: any) => (
                <div
                  className='group/weight animate-in fade-in slide-in-from-left-2 flex items-center gap-2 duration-300'
                  key={w.rowId}
                >
                  <div className='w-[140px] shrink-0'>
                    <InputSelect
                      options={availableFields}
                      placeholder='Select Field'
                      searchable={true}
                      value={
                        availableFields.find((f) => f.id === w.fieldId) || null
                      }
                      onChange={(val) =>
                        val && updateWeightField(w.rowId, Number(val.id))
                      }
                    />
                  </div>

                  {/* Premium Purple Slider */}
                  <div className='group/slider relative mx-2 flex h-8 min-w-[60px] flex-1 items-center'>
                    <div
                      className='pointer-events-none absolute -top-5 z-40 rounded-md bg-gray-13 px-1.5 py-0.5 text-11 font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-all duration-200 group-hover/slider:-top-6 group-hover/slider:opacity-100 group-active/slider:opacity-100'
                      style={{
                        left: `${w.value}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {w.value}%
                      <div className='absolute bottom-[-2px] left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gray-13' />
                    </div>

                    <div className='pointer-events-none absolute right-0 left-0 h-[6px] rounded-full bg-gray-3' />

                    <div
                      className='pointer-events-none absolute z-20 h-4.5 w-4.5 rounded-full border-[2.5px] border-white bg-purple-9 shadow-md ring-0 transition-all duration-300 group-hover/slider:ring-4 group-hover/slider:ring-purple-9/20'
                      style={{
                        left: `${w.value}%`,
                        transform: 'translateX(-50%)',
                      }}
                    />

                    <input
                      className='absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0'
                      max='100'
                      min='0'
                      step='5'
                      type='range'
                      value={w.value}
                      onChange={(e) =>
                        updateWeight(w.rowId, parseInt(e.target.value))
                      }
                    />
                  </div>

                  <button
                    className='text-slate-400 hover:text-red-500 hover:bg-red-50 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors'
                    title='Remove weight'
                    onClick={() => removeWeight(w.rowId)}
                  >
                    <Icon className='h-[15px] w-[15px]' name='lucide:trash-2' />
                  </button>
                </div>
              ))}
            </div>

            <div className='pt-1'>
              <button
                className='border-gray-300 text-slate-500 hover:bg-blue-50 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-13 font-medium transition-all duration-300 hover:border-[#1677ff] hover:text-[#1677ff] active:scale-[0.99]'
                onClick={addWeight}
              >
                <Icon className='h-4 w-4' name='lucide:plus' />
                <span>Add Property Weight</span>
              </button>
            </div>
          </div>

          {/* Decision Thresholds */}
          <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between pb-0.5'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  name='lucide:shield-check'
                  className={cn(
                    'h-4 w-4 stroke-[2]',
                    isThresholdInvalid ? 'text-red-11' : 'text-blue-600',
                  )}
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Decision Thresholds
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Set confidence levels for auto-approval
                  </span>
                </div>
              </div>
              {isThresholdInvalid && (
                <div className='animate-bounce text-[10px] font-medium text-red-11'>
                  Partial must be lower than Approved
                </div>
              )}
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-1.5 shadow-sm transition-colors hover:border-[#86efac]'>
                <div className='flex items-center justify-between px-0.5 pb-0.5'>
                  <span className='text-13 font-bold tracking-tight text-[#16a34a]'>
                    Approved
                  </span>
                </div>

                <div className='group/slider relative flex h-7 items-center'>
                  <div
                    className='pointer-events-none absolute -top-7 z-40 rounded-md bg-gray-13 px-2 py-1 text-13 font-bold whitespace-nowrap text-white opacity-0 shadow-sm transition-all duration-200 group-hover/slider:opacity-100 group-active/slider:opacity-100'
                    style={{
                      left: `${thresholds.approved}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {thresholds.approved}%
                    <div className='absolute bottom-[-3px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-13' />
                  </div>

                  <div
                    className={cn(
                      'pointer-events-none absolute right-0 left-0 h-[6.5px] rounded-full shadow-inner',
                      isThresholdInvalid ? 'bg-red-a2' : 'bg-white/60',
                    )}
                  />
                  <div
                    className={cn(
                      'pointer-events-none absolute z-20 h-4.5 w-4.5 rounded-full border-[2.5px] border-white shadow-md ring-0 transition-all duration-300',
                      isThresholdInvalid
                        ? 'bg-red-11 group-hover/slider:ring-red-11/20'
                        : 'bg-[#16a34a] group-hover/slider:ring-[#16a34a]/20',
                    )}
                    style={{
                      left: `${thresholds.approved}%`,
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <input
                    className='absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0'
                    max='100'
                    min='0'
                    step='5'
                    type='range'
                    value={thresholds.approved}
                    onChange={(e) => {
                      const newThresholds = {
                        ...thresholds,
                        approved: parseInt(e.target.value),
                      }
                      setThresholds(newThresholds)
                      updateNodeData('thresholds', newThresholds)
                    }}
                  />
                </div>
              </div>

              <div className='space-y-1 rounded-lg border border-[#fef3c7] bg-[#fffbeb] p-1.5 shadow-sm transition-colors hover:border-[#fcd34d]'>
                <div className='flex items-center justify-between px-0.5 pb-0.5'>
                  <span className='text-13 font-bold tracking-tight text-[#d97706]'>
                    Partial Match
                  </span>
                </div>

                <div className='group/slider relative flex h-7 items-center'>
                  <div
                    className='pointer-events-none absolute -top-7 z-40 rounded-md bg-gray-13 px-2 py-1 text-13 font-bold whitespace-nowrap text-white opacity-0 shadow-sm transition-all duration-200 group-hover/slider:opacity-100 group-active/slider:opacity-100'
                    style={{
                      left: `${thresholds.partial}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {thresholds.partial}%
                    <div className='absolute bottom-[-3px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-13' />
                  </div>

                  <div
                    className={cn(
                      'pointer-events-none absolute right-0 left-0 h-[6.5px] rounded-full shadow-inner',
                      isThresholdInvalid ? 'bg-red-a2' : 'bg-white/60',
                    )}
                  />
                  <div
                    className={cn(
                      'pointer-events-none absolute z-20 h-4.5 w-4.5 rounded-full border-[2.5px] border-white shadow-md ring-0 transition-all duration-300',
                      isThresholdInvalid
                        ? 'bg-red-11 group-hover/slider:ring-red-11/20'
                        : 'bg-[#d97706] group-hover/slider:ring-[#d97706]/20',
                    )}
                    style={{
                      left: `${thresholds.partial}%`,
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <input
                    className='absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0'
                    max='100'
                    min='0'
                    step='5'
                    type='range'
                    value={thresholds.partial}
                    onChange={(e) => {
                      const newThresholds = {
                        ...thresholds,
                        partial: parseInt(e.target.value),
                      }
                      setThresholds(newThresholds)
                      updateNodeData('thresholds', newThresholds)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* CONNECTIONS & ROUTING */}
        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
