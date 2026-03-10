import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { Node } from '@xyflow/react';
import SettingsSection from './common/SettingsSection';
import ConnectionsRouting from './common/ConnectionsRouting';
import Icon from '@/components/base/icon/Icon';
import cn from '@/utils/cn';
import InputSelect from '@/components/base/inputs/InputSelect';
import InputSwitch from '@/components/base/inputs/InputSwitch';

const invoiceTypeOptions = [
  { id: 1, name: 'PO Invoices', description: 'Automated matching', icon: 'lucide:receipt-text' },
  { id: 2, name: 'Non-PO', description: 'Direct GL coding', icon: 'lucide:file-text' },
];

const poMatchingOptions = [
  { id: 1, name: '2-Way Match', description: 'PO + Invoice', icons: ['lucide:file-text', 'lucide:shopping-cart'] },
  { id: 2, name: '3-Way Match', description: 'PO + Invoice + Receipt', icons: ['lucide:file-text', 'lucide:shopping-cart', 'lucide:truck'] },
];

const poMasterOptions = [
  { id: 1, name: 'Purchase Orders' },
];

const invoiceMasterOptions = [
  { id: 1, name: 'Invoice Master' },
];

const vendorSourceOptions = [
  { id: 1, name: 'Vendor Master' },
];

const glSourceOptions = [
  { id: 1, name: 'General Ledger Master' },
];

const matterSourceOptions = [
  { id: 1, name: 'Matter Information Master' },
];

const availableFields = [
  { id: 1, name: 'Supplier Name', icon: 'lucide:user' },
  { id: 2, name: 'PO Number', icon: 'lucide:hash' },
  { id: 3, name: 'Currency', icon: 'lucide:banknote' },
  { id: 4, name: 'Total Due', icon: 'lucide:dollar-sign' },
  { id: 5, name: 'Line Items', icon: 'lucide:list' },
  { id: 6, name: 'Invoice Date', icon: 'lucide:calendar' },
  { id: 7, name: 'Tax Amount', icon: 'lucide:percent' },
];

interface Props {
  node?: Node;
}

export default function APAgentSettingsPanel({ node }: Props) {
  const [openBasic, setOpenBasic] = useState(true);
  const [openValidation, setOpenValidation] = useState(true);
  const [invoiceType, setInvoiceType] = useState(invoiceTypeOptions[0]);
  const [poMatching, setPoMatching] = useState(poMatchingOptions[0]);
  const [poMaster, setPoMaster] = useState(poMasterOptions[0]);
  const [invoiceMaster, setInvoiceMaster] = useState(invoiceMasterOptions[0]);

  // Validation States
  const [vendorMustExist, setVendorMustExist] = useState(true);
  const [syncGL, setSyncGL] = useState(false);
  const [syncMatter, setSyncMatter] = useState(false);

  // New States from Image
  const [duplicateDetection, setDuplicateDetection] = useState(true);
  const [backOrderDetection, setBackOrderDetection] = useState(false);

  const [vendorSource, setVendorSource] = useState(vendorSourceOptions[0]);
  const [glSource, setGlSource] = useState(glSourceOptions[0]);
  const [matterSource, setMatterSource] = useState(matterSourceOptions[0]);


  const isPO = invoiceType.name === 'PO Invoices';
  const isNonPO = invoiceType.name === 'Non-PO';

  const [openScoring, setOpenScoring] = useState(false);

  const [weights, setWeights] = useState([
    { rowId: nanoid(), fieldId: 1, label: 'Supplier Name', value: 35, icon: 'lucide:user' },
    { rowId: nanoid(), fieldId: 2, label: 'PO Number', value: 35, icon: 'lucide:hash' },
    { rowId: nanoid(), fieldId: 3, label: 'Currency', value: 10, icon: 'lucide:banknote' },
    { rowId: nanoid(), fieldId: 4, label: 'Total Due', value: 10, icon: 'lucide:dollar-sign' },
    { rowId: nanoid(), fieldId: 5, label: 'Line Items', value: 10, icon: 'lucide:list' },
  ]);

  const [thresholds, setThresholds] = useState({
    approved: 90,
    partial: 60
  });

  const isThresholdInvalid = thresholds.partial >= thresholds.approved;

  const totalWeight = weights.reduce((acc, w) => acc + w.value, 0);

  const updateWeight = (rowId: string, value: number) => {
    setWeights(prev => prev.map(w => w.rowId === rowId ? { ...w, value } : w));
  };

  const updateWeightField = (rowId: string, fieldId: number) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (!field) return;
    setWeights(prev => prev.map(w => w.rowId === rowId ? {
      ...w,
      fieldId: field.id,
      label: field.name,
      icon: field.icon
    } : w));
  };

  const addWeight = () => {
    const nextAvailable = availableFields.find(f => !weights.find(w => w.fieldId === f.id));
    const field = nextAvailable || availableFields[0];
    setWeights(prev => [...prev, {
      rowId: nanoid(),
      fieldId: field.id,
      label: field.name,
      icon: field.icon,
      value: 0
    }]);
  };

  const removeWeight = (rowId: string) => {
    setWeights(prev => prev.filter(w => w.rowId !== rowId));
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-inter text-gray-12">
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-1">
        {/* BASIC SETUP */}
        <SettingsSection
          title="Basic Setup"
          icon="lucide:settings-2"
          isOpen={openBasic}
          variant="premium"
          onToggle={() => setOpenBasic(!openBasic)}
        >
          {/* Processing Mode */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 px-0.5">
              <Icon name="lucide:settings" className="h-4 w-4 text-indigo-600 stroke-[2]" />
              <div className="flex flex-col space-y-1">
                <span className="text-13 font-medium text-gray-12">Processing Mode</span>
                <span className="text-11 text-gray-9 leading-tight">Select the invoice processing workflow type</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {invoiceTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setInvoiceType(opt)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all duration-300 text-center gap-1.5 group/btn active:scale-95',
                    invoiceType.id === opt.id
                      ? 'border-purple-3 bg-purple-50/20 shadow-sm'
                      : 'border-gray-5/40 bg-slate-50/20 shadow-sm'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300',
                    invoiceType.id === opt.id ? 'text-purple-9 scale-110' : 'text-gray-9/40 group-hover/btn:text-gray-400'
                  )}>
                    <Icon name={opt.icon} className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <div className={cn(
                      'text-13 font-medium transition-colors duration-300',
                      invoiceType.id === opt.id ? 'text-gray-13' : 'text-gray-12'
                    )}>{opt.name}</div>
                    <div className="text-11 text-gray-9 leading-tight opacity-70">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Matching Strategy */}
          {isPO && (
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex items-center gap-2.5 px-0.5">
                <Icon name="lucide:git-pull-request" className="h-4 w-4 text-rose-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Matching Strategy</span>
                  <span className="text-11 text-gray-9 leading-tight">Define how invoices are matched with Purchase Orders</span>
                </div>
              </div>
              <div className="space-y-2">
                {poMatchingOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPoMatching(opt)}
                    className={cn(
                      'flex items-center justify-between w-full p-2.5 rounded-xl border transition-all duration-300 active:scale-[0.99] group/strategy',
                      poMatching.id === opt.id
                        ? 'border-purple-3 bg-purple-50/20 shadow-sm'
                        : 'border-gray-5/40 bg-slate-50/20 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1.5">
                        {opt.icons.map((icon, idx) => (
                          <div key={idx} className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white border transition-all duration-300',
                            poMatching.id === opt.id
                              ? 'bg-purple-50 text-purple-9 border-purple-200 scale-105'
                              : 'bg-gray-50 text-gray-9/40 border-gray-100 group-hover/strategy:text-gray-400'
                          )}>
                            <Icon name={icon} className="h-3.5 w-3.5" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col items-start space-y-0.5">
                        <span className={cn(
                          'text-13 font-medium transition-colors duration-300',
                          poMatching.id === opt.id ? 'text-purple-11' : 'text-gray-12'
                        )}>{opt.name}</span>
                        <span className="text-11 text-gray-9 leading-tight opacity-80">{opt.description}</span>
                      </div>
                    </div>
                    <div className={cn(
                      'h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all duration-300',
                      poMatching.id === opt.id
                        ? 'border-purple-9 bg-purple-9 scale-110 shadow-sm shadow-purple-200'
                        : 'border-gray-3 bg-white group-hover/strategy:border-gray-4'
                    )}>
                      {poMatching.id === opt.id && (
                        <Icon name="lucide:check" className="h-2.5 w-2.5 text-white stroke-[3] animate-in zoom-in-50 duration-300" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 px-0.5 pt-1">
                <div className="text-12 font-medium text-gray-12">PO Master Resource</div>
                <InputSelect
                  options={poMasterOptions}
                  value={poMaster}
                  onChange={val => val && setPoMaster(val)}
                  placeholder="Select PO Master"
                  searchable={true}
                  rightSectionIcon="lucide:chevrons-up-down"
                />
              </div>
            </div>
          )}

          {/* Master Resources */}
          {isNonPO && (
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex items-center gap-2.5 px-0.5">
                <Icon name="lucide:database" className="h-4 w-4 text-blue-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Master Resources</span>
                  <span className="text-11 text-gray-9 leading-tight">Select the data sources for verification</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-12 font-medium text-gray-12">Invoice Master Resource</div>
                <InputSelect
                  options={invoiceMasterOptions}
                  value={invoiceMaster}
                  onChange={val => val && setInvoiceMaster(val)}
                  placeholder="Select Invoice Master"
                  searchable={true}
                  rightSectionIcon="lucide:chevrons-up-down"
                />
              </div>
            </div>
          )}
        </SettingsSection>

        {/* VALIDATION RULES */}
        <SettingsSection
          title="Validation & Sync"
          icon="lucide:shield-check"
          isOpen={openValidation}
          variant="premium"
          onToggle={() => setOpenValidation(!openValidation)}
        >

          {/* Vendor Verification */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon name="lucide:building-2" className="h-4 w-4 text-blue-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Vendor Verification</span>
                  <span className="text-11 text-gray-9 leading-tight">Validate vendor details against master database</span>
                </div>
              </div>
              <InputSwitch checked={vendorMustExist} onChange={setVendorMustExist} />
            </div>
            {vendorMustExist && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="space-y-1.5 pt-1">
                  <div className="text-12 font-medium text-gray-12">Vendor Source</div>
                  <InputSelect
                    options={vendorSourceOptions}
                    value={vendorSource}
                    onChange={val => val && setVendorSource(val)}
                    placeholder="Select Vendor Source"
                    searchable={true}
                    rightSectionIcon="lucide:chevrons-up-down"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Detection */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon name="lucide:copy-check" className="h-4 w-4 text-amber-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Duplicate Detection</span>
                  <span className="text-11 text-gray-9 leading-tight">Identify and flag potential duplicate invoices</span>
                </div>
              </div>
              <InputSwitch checked={duplicateDetection} onChange={setDuplicateDetection} />
            </div>
          </div>

          {/* Back Order Detection */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon name="lucide:package-x" className="h-4 w-4 text-orange-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Back Order Detection</span>
                  <span className="text-11 text-gray-9 leading-tight">Check if items are on back order or unavailable</span>
                </div>
              </div>
              <InputSwitch checked={backOrderDetection} onChange={setBackOrderDetection} />
            </div>
          </div>

          {/* GL Section */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon name="lucide:book-open-check" className="h-4 w-4 text-emerald-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">GL Account Verification</span>
                  <span className="text-11 text-gray-9 leading-tight">Ensure GL codes are valid and mapped correctly</span>
                </div>
              </div>
              <InputSwitch checked={syncGL} onChange={setSyncGL} />
            </div>
            {syncGL && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="space-y-1.5">
                  <div className="text-12 font-medium text-gray-12">GL Source</div>
                  <InputSelect
                    options={glSourceOptions}
                    value={glSource}
                    onChange={val => val && setGlSource(val)}
                    placeholder="Select GL Master"
                    searchable={true}
                    rightSectionIcon="lucide:chevrons-up-down"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Matter Section */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon name="lucide:briefcase" className="h-4 w-4 text-slate-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Matter Verification</span>
                  <span className="text-11 text-gray-9 leading-tight">Verify details against linked case or matter</span>
                </div>
              </div>
              <InputSwitch checked={syncMatter} onChange={setSyncMatter} />
            </div>
            {syncMatter && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="space-y-1.5">
                  <div className="text-12 font-medium text-gray-12">Matter Source</div>
                  <InputSelect
                    options={matterSourceOptions}
                    value={matterSource}
                    onChange={val => val && setMatterSource(val)}
                    placeholder="Select Matter Master"
                    searchable={true}
                    rightSectionIcon="lucide:chevrons-up-down"
                  />
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* SCORING & THRESHOLDS */}
        <SettingsSection
          title="Scoring & Thresholds"
          icon="lucide:gauge"
          isOpen={openScoring}
          variant="premium"
          onToggle={() => setOpenScoring(!openScoring)}
        >
          {/* Scoring Weights */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-2.5 px-0.5">
                <Icon name="lucide:bar-chart-big" className="h-4 w-4 text-purple-600 stroke-[2]" />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Scoring Weights</span>
                  <span className="text-11 text-gray-9 leading-tight">Assign importance to different match criteria</span>
                </div>
              </div>
              <div className={cn(
                "text-11 font-medium px-2 py-0.5 rounded-full border transition-all duration-300 whitespace-nowrap shrink-0",
                totalWeight !== 100
                  ? "text-red-11 bg-red-1 border-red-3 animate-pulse"
                  : "text-green-11 bg-green-1 border-green-3"
              )}>
                Total: {totalWeight}%
              </div>
            </div>

            <div className="space-y-1.5">
              {weights.map((w) => (
                <div
                  key={w.rowId}
                  className="group/weight flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300"
                >
                  <div className="w-[140px] shrink-0">
                    <InputSelect
                      options={availableFields}
                      value={availableFields.find(f => f.id === w.fieldId) || null}
                      onChange={val => val && updateWeightField(w.rowId, val.id)}
                      placeholder="Select Field"
                      searchable={true}
                    />
                  </div>

                  {/* Premium Purple Slider */}
                  <div className="flex-1 min-w-[60px] relative flex items-center h-8 group/slider mx-2">
                    {/* Value Tooltip (Floating above thumb) */}
                    <div
                      className="absolute -top-5 px-1.5 py-0.5 bg-gray-13 text-white text-11 font-medium rounded-md pointer-events-none transition-all duration-200 z-40 shadow-sm whitespace-nowrap opacity-0 group-hover/slider:opacity-100 group-active/slider:opacity-100 group-hover/slider:-top-6"
                      style={{
                        left: `${w.value}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {w.value}%
                      <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-13 rotate-45" />
                    </div>

                    {/* Background Track */}
                    <div className="absolute left-0 right-0 h-[6px] bg-gray-3 rounded-full pointer-events-none" />


                    {/* Thumb (Purple with white ring) */}
                    <div
                      className="absolute h-4.5 w-4.5 bg-purple-9 rounded-full pointer-events-none border-[2.5px] border-white shadow-md ring-0 group-hover/slider:ring-4 group-hover/slider:ring-purple-9/20 transition-all duration-300 z-20"
                      style={{
                        left: `${w.value}%`,
                        transform: 'translateX(-50%)'
                      }}
                    />

                    {/* Invisible Range Input for Interaction */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={w.value}
                      onChange={(e) => updateWeight(w.rowId, parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                    />
                  </div>

                  <button
                    onClick={() => removeWeight(w.rowId)}
                    className="w-7 h-7 flex items-center justify-center shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove weight"
                  >
                    <Icon name="lucide:trash-2" className="h-[15px] w-[15px]" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-1">
              <button
                onClick={addWeight}
                className="flex justify-center items-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-slate-500 text-13 font-medium hover:border-[#1677ff] hover:text-[#1677ff] hover:bg-blue-50 transition-all duration-300 active:scale-[0.99]"
              >
                <Icon name="lucide:plus" className="h-4 w-4" />
                <span>Add Property Weight</span>
              </button>
            </div>
          </div>

          {/* Decision Thresholds */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-2.5 px-0.5">
                <Icon name="lucide:shield-check" className={cn("h-4 w-4 stroke-[2]", isThresholdInvalid ? "text-red-11" : "text-blue-600")} />
                <div className="flex flex-col space-y-1">
                  <span className="text-13 font-medium text-gray-12">Decision Thresholds</span>
                  <span className="text-11 text-gray-9 leading-tight">Set confidence levels for auto-approval</span>
                </div>
              </div>
              {isThresholdInvalid && (
                <div className="text-[10px] font-medium text-red-11 animate-bounce">
                  Partial must be lower than Approved
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Auto-Approved Card */}
              <div className="p-1.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] space-y-1 shadow-sm hover:border-[#86efac] transition-colors">
                <div className="flex items-center justify-between pb-0.5 px-0.5">
                  <span className="text-13 font-bold text-[#16a34a] tracking-tight">Approved</span>
                </div>

                <div className="relative flex items-center h-7 group/slider">
                  {/* Floating Tooltip (Matching Scoring Weights) */}
                  <div
                    className="absolute -top-7 px-2 py-1 bg-gray-13 text-white text-13 font-bold rounded-md pointer-events-none transition-all duration-200 z-40 shadow-sm whitespace-nowrap opacity-0 group-hover/slider:opacity-100 group-active/slider:opacity-100"
                    style={{
                      left: `${thresholds.approved}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {thresholds.approved}%
                    <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-13 rotate-45" />
                  </div>

                  <div className={cn(
                    "absolute left-0 right-0 h-[6.5px] rounded-full pointer-events-none shadow-inner",
                    isThresholdInvalid ? "bg-red-a2" : "bg-white/60"
                  )} />
                  {/* Thumb (Green with white ring) */}
                  <div
                    className={cn(
                      "absolute h-4.5 w-4.5 rounded-full pointer-events-none border-[2.5px] border-white shadow-md ring-0 transition-all duration-300 z-20",
                      isThresholdInvalid ? "bg-red-11 group-hover/slider:ring-red-11/20" : "bg-[#16a34a] group-hover/slider:ring-[#16a34a]/20"
                    )}
                    style={{
                      left: `${thresholds.approved}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={thresholds.approved}
                    onChange={(e) => setThresholds(prev => ({ ...prev, approved: parseInt(e.target.value) }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                  />
                </div>
              </div>

              {/* Partial Match Card */}
              <div className="p-1.5 rounded-lg bg-[#fffbeb] border border-[#fef3c7] space-y-1 shadow-sm hover:border-[#fcd34d] transition-colors">
                <div className="flex items-center justify-between pb-0.5 px-0.5">
                  <span className="text-13 font-bold text-[#d97706] tracking-tight">Partial Match</span>
                </div>

                <div className="relative flex items-center h-7 group/slider">
                  {/* Floating Tooltip (Matching Scoring Weights) */}
                  <div
                    className="absolute -top-7 px-2 py-1 bg-gray-13 text-white text-13 font-bold rounded-md pointer-events-none transition-all duration-200 z-40 shadow-sm whitespace-nowrap opacity-0 group-hover/slider:opacity-100 group-active/slider:opacity-100"
                    style={{
                      left: `${thresholds.partial}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {thresholds.partial}%
                    <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-13 rotate-45" />
                  </div>

                  <div className={cn(
                    "absolute left-0 right-0 h-[6.5px] rounded-full pointer-events-none shadow-inner",
                    isThresholdInvalid ? "bg-red-a2" : "bg-white/60"
                  )} />
                  {/* Thumb (Amber with white ring) */}
                  <div
                    className={cn(
                      "absolute h-4.5 w-4.5 rounded-full pointer-events-none border-[2.5px] border-white shadow-md ring-0 transition-all duration-300 z-20",
                      isThresholdInvalid ? "bg-red-11 group-hover/slider:ring-red-11/20" : "bg-[#d97706] group-hover/slider:ring-[#d97706]/20"
                    )}
                    style={{
                      left: `${thresholds.partial}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={thresholds.partial}
                    onChange={(e) => setThresholds(prev => ({ ...prev, partial: parseInt(e.target.value) }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* CONNECTIONS & ROUTING */}
        <ConnectionsRouting node={node as any} />
      </div>
    </div>
  );
}
