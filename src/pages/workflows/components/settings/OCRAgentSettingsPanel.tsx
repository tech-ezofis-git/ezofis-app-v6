import { useState, useEffect } from 'react';
import InputSelect from '@/components/base/inputs/InputSelect';
import Icon from '@/components/base/icon/Icon';
import cn from '@/utils/cn';
import { useReactFlow, useNodes } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import InputLabel from '@/components/base/inputs/InputLabel';

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
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

                {/* Region */}
                <div className="flex flex-col gap-1">
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
                                            ? "bg-purple-9 text-white shadow-md active:scale-95 hover:bg-purple-8 hover:-translate-y-0.5"
                                            : "text-gray-9 hover:text-purple-11 hover:bg-purple-50 hover:border-purple-200/50 hover:shadow-sm hover:scale-[1.02]"
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
                    />
                </div>

                {/* Field Extraction */}
                <div className="flex flex-col gap-1">
                    <InputLabel label="Field Extraction" required />

                    <p className="text-[12px] text-gray-10 leading-relaxed mb-0.5">
                        Define specific data fields to identify and retrieve from your documents.
                    </p>

                    <div className={cn(
                        "flex items-center gap-1.5 text-[13px] font-bold mb-1",
                        jsonValid ? "text-[#16a34a]" : "text-red-500"
                    )}>
                        <Icon name={jsonValid ? "lucide:check" : "lucide:x"} className="w-4 h-4 stroke-[3]" />
                        {jsonValid ? "Valid JSON" : "Invalid JSON"}
                    </div>

                    <div className="relative rounded-lg border border-gray-3 bg-gray-1 overflow-hidden font-mono text-[13px]">
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gray-2 border-r border-gray-3 flex flex-col items-center py-3 text-gray-9 text-xs select-none pointer-events-none">
                            {fieldExtraction.split('\n').map((_: string, i: number) => (
                                <div key={i} className="h-5 leading-5">{i + 1}</div>
                            ))}
                        </div>
                        <textarea
                            value={fieldExtraction}
                            onChange={handleJsonChange}
                            spellCheck={false}
                            className="w-full h-[280px] bg-transparent outline-none resize-none pl-11 pr-3 py-3 text-gray-12 leading-5 focus:ring-1 focus:ring-primary-9"
                        />
                    </div>
                </div>

                {/* Specific Instructions */}
                <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-start gap-2.5">
                        <div
                            onClick={() => {
                                const newVal = !showInstructions;
                                setShowInstructions(newVal);
                                updateNodeData('showInstructions', newVal);
                            }}
                            className={cn(
                                "mt-1 flex h-4.5 w-4.5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all",
                                showInstructions ? "bg-primary-9 border-primary-9" : "bg-white border-gray-4 hover:border-primary-5"
                            )}
                        >
                            {showInstructions && <Icon name="lucide:check" className="h-3.5 w-3.5 text-white stroke-[3]" />}
                        </div>
                        <div className="flex flex-col gap-1">
                            <InputLabel label="Specific Instructions" />
                            <p className="text-[11px] text-gray-10 leading-relaxed font-medium">
                                Add extra guidelines or formatting rules for the extraction process.
                            </p>
                        </div>
                    </div>

                    {showInstructions && (
                        <div className="mt-1 rounded-lg border border-gray-3 bg-white overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Toolbar Simulation */}
                            <div className="flex items-center gap-2 p-2 border-b border-gray-2 bg-gray-50/30">
                                {['B', 'I', 'U', 'list'].map((tool) => (
                                    <button
                                        key={tool}
                                        type="button"
                                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-3 bg-white text-gray-12 hover:bg-gray-2 transition-colors shadow-sm"
                                    >
                                        {tool === 'list' ? (
                                            <Icon name="lucide:list" className="h-3.5 w-3.5" />
                                        ) : (
                                            <span className={cn(
                                                "text-xs font-bold",
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
                                placeholder="Start typing ..."
                                className="w-full h-32 p-3 text-[13px] text-gray-12 placeholder:text-gray-9 outline-none resize-none bg-transparent"
                            />
                        </div>
                    )}
                </div>

                <div className="h-px bg-gray-2 mb-1" />

                {/* Output Schema */}
                <div className="flex flex-col gap-2 pt-1">
                    <InputLabel label="Output Schema" />

                    <div className="flex items-center gap-20 px-1 mt-1">
                        {['JSON Output', 'Store Document'].map((opt) => (
                            <label
                                key={opt}
                                className="flex items-center gap-2.5 cursor-pointer group"
                                onClick={() => {
                                    setOutputSchema(opt);
                                    updateNodeData('outputSchema', opt);
                                }}
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all",
                                    outputSchema === opt
                                        ? "border-primary-9 bg-white"
                                        : "border-gray-5 bg-white group-hover:border-primary-5"
                                )}>
                                    {outputSchema === opt && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary-9" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[13px] font-bold transition-colors",
                                    outputSchema === opt ? "text-gray-12" : "text-gray-10 group-hover:text-gray-12"
                                )}>
                                    {opt}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
