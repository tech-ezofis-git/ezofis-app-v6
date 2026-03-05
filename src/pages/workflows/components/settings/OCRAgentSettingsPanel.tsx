import { useState, useEffect } from 'react';
import InputSelect from '@/components/base/inputs/InputSelect';
import Icon from '@/components/base/icon/Icon';
import cn from '@/utils/cn';
import { useReactFlow, useNodes } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import InputLabel from '@/components/base/inputs/InputLabel';
import InputSwitch from '@/components/base/inputs/InputSwitch';
import SettingsSection from './common/SettingsSection';
import ConnectionsRouting from './common/ConnectionsRouting';
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup';
import type { Option } from '@/types/option';

const regionOptions = ['East Asia', 'Middle East', 'US & Canada'];

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
];

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
}`;

const outputMethodOptions: Option[] = [
    { id: 1, name: 'JSON Output' },
    { id: 2, name: 'Store Document' },
];

export default function OCRAgentSettingsPanel({ node: initialNode }: { node?: Node }) {
    const { setNodes } = useReactFlow();
    const liveNodes = useNodes();

    // Find matching node in the live nodes array to ensure reactivity
    const currentNode = initialNode ? (liveNodes.find(n => n.id === initialNode.id) || initialNode) : null;
    const nodeData = (currentNode?.data || {}) as any;

    const [region, setRegion] = useState(nodeData.region || 'US & Canada');
    const [assistantInput, setAssistantInput] = useState<any>(
        assistantInputOptions.find(opt => opt.name === nodeData.assistantInput) || assistantInputOptions[0]
    );
    const [fieldExtraction, setFieldExtraction] = useState(nodeData.fieldExtraction || initialJson);
    const [jsonValid, setJsonValid] = useState(true);
    const [showInstructions, setShowInstructions] = useState(nodeData.showInstructions || false);
    const [instructions, setInstructions] = useState(nodeData.instructions || '');
    const [outputSchema, setOutputSchema] = useState(nodeData.outputSchema || 'JSON Output');

    const [openBasic, setOpenBasic] = useState(false);
    const [openFields, setOpenFields] = useState(false);

    const updateNodeData = (key: string, value: any) => {
        if (currentNode) {
            setNodes((nodes) =>
                nodes.map((n) =>
                    n.id === currentNode.id ? { ...n, data: { ...n.data, [key]: value } } : n
                )
            );
        }
    };

    const handleRegionChange = (newRegion: string) => {
        setRegion(newRegion);
        updateNodeData('region', newRegion);
    };

    const handleAssistantInputChange = (option: any) => {
        setAssistantInput(option);
        updateNodeData('assistantInput', option?.name || '');
    };

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setFieldExtraction(val);
        updateNodeData('fieldExtraction', val);
        try {
            JSON.parse(val);
            setJsonValid(true);
        } catch {
            setJsonValid(false);
        }
    };

    // Keep state in sync with external changes
    useEffect(() => {
        if (nodeData.region && nodeData.region !== region) setRegion(nodeData.region);

        const currentName = assistantInput?.name || '';
        if (nodeData.assistantInput !== undefined && nodeData.assistantInput !== currentName) {
            const found = assistantInputOptions.find(opt => opt.name === nodeData.assistantInput);
            setAssistantInput(found || null);
        }
        if (nodeData.fieldExtraction && nodeData.fieldExtraction !== fieldExtraction) {
            setFieldExtraction(nodeData.fieldExtraction);
            try {
                JSON.parse(nodeData.fieldExtraction);
                setJsonValid(true);
            } catch {
                setJsonValid(false);
            }
        }
    }, [nodeData]);

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-inter text-gray-12">
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-1">

                <SettingsSection
                    title="Basic Setup"
                    icon="lucide:settings-2"
                    isOpen={openBasic}
                    variant="premium"
                    onToggle={() => setOpenBasic(!openBasic)}
                >
                    <div className="flex flex-col gap-2.5 py-1">
                        <div className="flex items-center gap-2.5 px-1 pb-1">
                            <Icon name="lucide:settings" className="h-4 w-4 text-indigo-600" />
                            <div className="flex flex-col space-y-1">
                                <span className="text-13 font-medium text-gray-12">Processing Details</span>
                                <span className="text-11 text-gray-9 leading-tight">Configure document region and extraction type</span>
                            </div>
                        </div>

                        {/* Region & Doc Type Card */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                            {/* Region */}
                            <div className="flex flex-col gap-1.5">
                                <InputLabel label="Region" required />
                                <div className="flex bg-gray-50/50 p-1 rounded-lg border border-gray-2/50 shadow-inner">
                                    {regionOptions.map((opt) => {
                                        const isActive = region === opt;
                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => handleRegionChange(opt)}
                                                className={cn(
                                                    "flex-1 py-1.5 text-[11px] font-bold transition-all duration-300 rounded-md border border-transparent outline-none",
                                                    isActive
                                                        ? "bg-purple-9 text-white shadow-md active:scale-95"
                                                        : "text-gray-9 hover:text-purple-11 hover:bg-purple-50"
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Document Type Dropdown */}
                            <div className="flex flex-col gap-1">
                                <InputSelect
                                    label="Document Type"
                                    required
                                    clearable
                                    searchable
                                    options={assistantInputOptions}
                                    value={assistantInput}
                                    onChange={handleAssistantInputChange}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                <SettingsSection
                    title="Field Extraction"
                    icon="lucide:file-json-2"
                    isOpen={openFields}
                    variant="premium"
                    onToggle={() => setOpenFields(!openFields)}
                >
                    <div className="flex flex-col gap-2.5 py-1">
                        {/* Schema & JSON Card */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                            <div className="flex items-center gap-2.5 px-0.5">
                                <Icon name="lucide:file-json-2" className="h-4 w-4 text-amber-600 stroke-[2]" />
                                <div className="flex flex-col space-y-1">
                                    <span className="text-13 font-medium text-gray-12">Schema Definition</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <p className="text-[12px] text-gray-10 leading-relaxed">
                                    Define specific data fields to identify and retrieve from your documents.
                                </p>

                                <div className={cn(
                                    "flex items-center gap-1.5 text-[11px] font-bold",
                                    jsonValid ? "text-[#16a34a]" : "text-red-500"
                                )}>
                                    <Icon name={jsonValid ? "lucide:check" : "lucide:x"} className="w-3.5 h-3.5 stroke-[3]" />
                                    {jsonValid ? "VALID JSON" : "INVALID JSON"}
                                </div>

                                <div className="relative rounded-lg border border-slate-100 bg-slate-50/30 overflow-hidden font-mono text-[12px]">
                                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-3 text-gray-400 select-none pointer-events-none">
                                        {fieldExtraction.split('\n').map((_: string, i: number) => (
                                            <div key={i} className="h-5 leading-5">{i + 1}</div>
                                        ))}
                                    </div>
                                    <textarea
                                        value={fieldExtraction}
                                        onChange={handleJsonChange}
                                        spellCheck={false}
                                        className="w-full h-[240px] bg-transparent outline-none resize-none pl-11 pr-3 py-3 text-gray-13 leading-5 focus:ring-1 focus:ring-primary-4"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Specific Instructions Card */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Icon name="lucide:pencil-line" className="h-4 w-4 text-purple-600 stroke-[2]" />
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-13 font-medium text-gray-12">Specific Instructions</span>
                                        <span className="text-11 text-gray-9 leading-tight">Add extra guidelines or formatting rules</span>
                                    </div>
                                </div>
                                <InputSwitch
                                    checked={showInstructions}
                                    onChange={(checked) => {
                                        setShowInstructions(checked);
                                        updateNodeData('showInstructions', checked);
                                    }}
                                />
                            </div>

                            {showInstructions && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="rounded-lg border border-slate-100 bg-slate-50/20 overflow-hidden">
                                        {/* Toolbar Simulation */}
                                        <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-white/50">
                                            {['B', 'I', 'U', 'list'].map((tool) => (
                                                <button
                                                    key={tool}
                                                    type="button"
                                                    className="flex h-6 w-6 items-center justify-center rounded border border-gray-2 bg-white text-gray-12 hover:bg-gray-1 transition-colors shadow-sm"
                                                >
                                                    {tool === 'list' ? (
                                                        <Icon name="lucide:list" className="h-3 w-3" />
                                                    ) : (
                                                        <span className={cn(
                                                            "text-10 font-bold",
                                                            tool === 'I' && "italic",
                                                            tool === 'U' && "underline"
                                                        )}>{tool}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={instructions}
                                            onChange={(e) => {
                                                setInstructions(e.target.value);
                                                updateNodeData('instructions', e.target.value);
                                            }}
                                            placeholder="Enter specific guidelines..."
                                            className="w-full h-24 p-2.5 text-[13px] text-gray-12 placeholder:text-gray-9 outline-none resize-none bg-transparent"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Output Method Card */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                            <div className="flex items-center gap-2.5 px-0.5">
                                <Icon name="lucide:layout" className="h-4 w-4 text-emerald-600 stroke-[2]" />
                                <div className="flex flex-col space-y-1">
                                    <span className="text-13 font-medium text-gray-12">Output Method</span>
                                </div>
                            </div>

                            <InputRadioGroup
                                options={outputMethodOptions}
                                value={outputMethodOptions.find(o => o.name === outputSchema)?.id || 1}
                                onChange={(val) => {
                                    const opt = outputMethodOptions.find(o => o.id === val);
                                    if (opt) {
                                        setOutputSchema(opt.name);
                                        updateNodeData('outputSchema', opt.name);
                                    }
                                }}
                                optionsPerLine={2}
                            />
                        </div>
                    </div>
                </SettingsSection>

                <ConnectionsRouting node={currentNode as any} />
            </div>
        </div>
    );
}
