import Icon from '@/components/base/icon/Icon'
import type { InvoiceData } from './types'

interface SummaryScreenProps {
    data: InvoiceData
}

const SummaryScreen = ({ data }: SummaryScreenProps) => {
    return (
        <div className="bg-[var(--surface-muted)] h-[calc(100vh-150px)] overflow-hidden flex flex-col">

            <main className="p-6 space-y-6 max-w-[1600px] mx-auto w-full flex-1 flex flex-col overflow-hidden">
                {/* Top Header Card */}
                <div className="bg-white border border-[var(--gray-3)] rounded-xl p-6 flex flex-col md:flex-row gap-8 items-start shadow-sm flex-none">
                    <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="w-12 h-12 bg-[var(--green-3)] rounded-full flex items-center justify-center text-[var(--green-11)]">
                            <Icon name="material-symbols:check-circle-outline" className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="text-[var(--green-11)] font-bold text-lg">Ready for Approval</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-[var(--gray-3)] rounded-full overflow-hidden">
                                    <div className="bg-[var(--green-9)] h-full w-[94%]"></div>
                                </div>
                                <span className="text-sm font-semibold text-[var(--gray-11)]">94%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 border-l border-[var(--gray-3)] pl-8">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="material-symbols:auto-awesome" className="text-[var(--primary-9)] text-sm" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--gray-10)]">Analysis</span>
                            <span className="bg-[var(--primary-3)] text-[var(--primary-9)] text-[10px] px-2 py-0.5 rounded-full font-bold">AUTO-VERIFIED</span>
                        </div>
                        <p className="text-[var(--gray-11)] text-sm leading-relaxed">
                            The invoice is approved because the overall matching score is 94.0%, which exceeds the required threshold. The vendor and PO were clearly identified and all key header fields align within tolerance. Both invoice line items matched the PO line items (2/2 lines matched) with high accuracy.
                        </p>
                    </div>

                    <div className="min-w-[240px] flex gap-4 items-center">
                        <div className="text-right flex-1">
                            <span className="text-[10px] uppercase font-bold text-[var(--gray-9)] block mb-1">Next Action</span>
                            <span className="font-bold text-[var(--gray-13)]">Schedule Payment</span>
                        </div>
                        <div className="bg-white border border-[var(--gray-3)] rounded-lg p-3 flex items-center gap-3">
                            <Icon name="material-symbols:calendar-today-outline" className="text-[var(--orange-9)] text-xl" />
                            <div>
                                <span className="text-sm font-bold block">Due Feb 12 <span className="text-[var(--orange-9)] ml-1">●</span></span>
                                <span className="text-[10px] text-[var(--gray-10)] flex items-center gap-1">
                                    Net 30 Days
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Content Grid */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Invoice View */}
                    <div className="bg-[var(--gray-3)] rounded-xl overflow-hidden flex flex-col h-full border border-[var(--gray-4)]">
                        <div className="bg-white border-b border-[var(--gray-4)] p-2 flex items-center justify-between text-[var(--gray-11)] flex-none">
                            <div className="flex items-center gap-4">
                                <button className="p-1.5 hover:bg-[var(--gray-2)] rounded transition-colors"><Icon name="material-symbols:view-sidebar-outline" /></button>
                                <div className="h-4 w-[1px] bg-[var(--gray-4)]"></div>
                                <button className="p-1.5 hover:bg-[var(--gray-2)] rounded transition-colors"><Icon name="material-symbols:search" /></button>
                                <button className="p-1.5 hover:bg-[var(--gray-2)] rounded transition-colors"><Icon name="material-symbols:expand-less" /></button>
                                <button className="p-1.5 hover:bg-[var(--gray-2)] rounded transition-colors"><Icon name="material-symbols:expand-more" /></button>
                                <span className="text-sm bg-white border border-[var(--gray-4)] px-2 py-0.5 rounded">1</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-[var(--gray-2)] rounded px-2">
                                    <button className="p-1"><Icon name="material-symbols:remove" /></button>
                                    <span className="mx-2 text-xs font-medium">100%</span>
                                    <button className="p-1"><Icon name="material-symbols:add" /></button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-12 custom-scrollbar flex justify-center bg-[var(--gray-6)]">
                            <div className="bg-white w-[595px] min-h-[842px] shadow-xl p-12 text-[var(--gray-13)] text-xs">
                                {/* Simplified Invoice Rendering for Summary */}
                                <div className="mb-8">
                                    <h1 className="text-[var(--blue-12)] font-bold text-lg mb-4">INVOICE</h1>
                                    <div className="space-y-1">
                                        <p><span className="font-bold">Supplier:</span> {data.supplier.name}</p>
                                        <p>{data.supplier.address.join(', ')}</p>
                                        <p><span className="font-bold">Date:</span> {data.invoiceDate}</p>
                                        <p><span className="font-bold">Inv #:</span> {data.invoiceNumber}</p>
                                        <p><span className="font-bold">PO #:</span> {data.poNumber}</p>
                                    </div>
                                </div>

                                <table className="w-full text-left">
                                    <thead className="border-b border-[var(--gray-3)]">
                                        <tr>
                                            <th className="py-2">Description</th>
                                            <th className="py-2">Qty</th>
                                            <th className="py-2">Rate</th>
                                            <th className="py-2">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--gray-2)]">
                                        {data.lineItems.map((item, i) => (
                                            <tr key={i}>
                                                <td className="py-2">{item.description}</td>
                                                <td className="py-2">{item.qty}</td>
                                                <td className="py-2">${item.rate.toFixed(2)}</td>
                                                <td className="py-2">${item.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-8 pt-4 border-t border-[var(--gray-3)] flex justify-end">
                                    <div className="w-48 space-y-2">
                                        <div className="flex justify-between"><span>Subtotal</span><span>${data.subtotal.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span>Tax</span><span>${data.tax.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${data.total.toFixed(2)}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary Data */}
                    <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar">

                        {/* Summary Cards */}
                        <section>
                            <h2 className="text-xs font-bold text-[var(--gray-10)] uppercase tracking-widest mb-4">Invoice Summary</h2>
                            <div className="bg-white border border-[var(--gray-3)] rounded-xl p-6 grid grid-cols-2 gap-y-8 gap-x-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--purple-3)] text-[var(--purple-11)] flex items-center justify-center rounded-lg">
                                        <Icon name="tabler:building-skyscraper" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[var(--gray-9)] font-bold block uppercase">Supplier</span>
                                        <span className="font-bold text-[var(--gray-13)]">{data.supplier.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--blue-3)] text-[var(--blue-11)] flex items-center justify-center rounded-lg">
                                        <Icon name="material-symbols:receipt-long" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[var(--gray-9)] font-bold block uppercase">PO Number</span>
                                        <span className="font-bold text-[var(--gray-13)]">{data.poNumber}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--orange-3)] text-[var(--orange-11)] flex items-center justify-center rounded-lg">
                                        <Icon name="material-symbols:payments" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[var(--gray-9)] font-bold block uppercase">Currency</span>
                                        <span className="font-bold text-[var(--gray-13)]">{data.currency}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--green-3)] text-[var(--green-11)] flex items-center justify-center rounded-lg">
                                        <Icon name="material-symbols:attach-money" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[var(--gray-9)] font-bold block uppercase">Total Due</span>
                                        <span className="font-bold text-[var(--green-11)]">{data.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Field Matching */}
                        <section>
                            <h2 className="text-xs font-bold text-[var(--gray-10)] uppercase tracking-widest mb-4">Field Matching</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'Supplier Name', val: data.supplier.name },
                                    { label: 'PO Number', val: data.poNumber },
                                    { label: 'Currency', val: data.currency },
                                    { label: 'Total Due', val: data.total.toFixed(2) }
                                ].map((field, i) => (
                                    <div key={i} className="bg-white border border-[var(--gray-3)] rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-bold text-sm text-[var(--gray-13)]">{field.label}</span>
                                            <span className="bg-[var(--green-3)] text-[var(--green-11)] text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                <Icon name="material-symbols:check" className="text-sm" /> 100%
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[var(--gray-2)] p-3 rounded-lg border border-[var(--gray-3)]">
                                                <span className="text-[9px] text-[var(--gray-9)] font-bold uppercase block mb-1">Extracted</span>
                                                <span className="text-xs font-semibold text-[var(--gray-12)]">{field.val}</span>
                                            </div>
                                            <div className="bg-[var(--gray-2)] p-3 rounded-lg border border-[var(--gray-3)]">
                                                <span className="text-[9px] text-[var(--gray-9)] font-bold uppercase block mb-1">PO Value</span>
                                                <span className="text-xs font-semibold text-[var(--gray-12)]">{field.val}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Line Items */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-bold text-[var(--gray-10)] uppercase tracking-widest">Line Item Matching</h2>
                                <span className="text-[10px] text-[var(--gray-9)] font-medium italic">{data.lineItems.length} of {data.lineItems.length} matched</span>
                            </div>
                            <div className="bg-white border border-[var(--gray-3)] rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-[var(--gray-2)] border-b border-[var(--gray-3)]">
                                        <tr className="text-left text-[var(--gray-11)]">
                                            <th className="p-3">ITEM DESCRIPTION</th>
                                            <th className="p-3">EXTRACTED</th>
                                            <th className="p-3">PO VALUE</th>
                                            <th className="p-3">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--gray-2)]">
                                        {data.lineItems.map((item, i) => (
                                            <tr key={i}>
                                                <td className="p-3 font-medium text-[var(--gray-12)]">{item.description}</td>
                                                <td className="p-3 text-[var(--gray-11)]">${item.amount.toFixed(2)}</td>
                                                <td className="p-3 text-[var(--gray-11)]">${item.amount.toFixed(2)}</td>
                                                <td className="p-3"><Icon name="material-symbols:check-circle" className="text-[var(--green-9)] text-sm" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                    </div>
                </div>
            </main>
        </div>
    )
}

export default SummaryScreen
