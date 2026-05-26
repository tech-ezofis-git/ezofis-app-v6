import Icon from '@/components/base/icon/Icon'
import type { InvoiceData } from './types'

interface SummaryScreenProps {
  data: InvoiceData
}

const SummaryScreen = ({ data }: SummaryScreenProps) => {
  return (
    <div className='flex h-[calc(100vh-150px)] flex-col overflow-hidden bg-[var(--surface-muted)]'>
      <main className='mx-auto flex w-full max-w-[1600px] flex-1 flex-col space-y-6 overflow-hidden p-6'>
        {/* Top Header Card */}
        <div className='flex flex-none flex-col items-start gap-8 rounded-xl border border-[var(--gray-3)] bg-surface p-6 shadow-sm md:flex-row'>
          <div className='flex min-w-[200px] items-center gap-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-[var(--green-3)] text-[var(--green-11)]'>
              <Icon
                className='text-2xl'
                name='material-symbols:check-circle-outline'
              />
            </div>
            <div>
              <h3 className='text-lg font-bold text-[var(--green-11)]'>
                Ready for Approval
              </h3>
              <div className='flex items-center gap-2'>
                <div className='h-2 w-24 overflow-hidden rounded-full bg-[var(--gray-3)]'>
                  <div className='h-full w-[94%] bg-[var(--green-9)]'></div>
                </div>
                <span className='text-sm font-semibold text-[var(--gray-11)]'>
                  94%
                </span>
              </div>
            </div>
          </div>

          <div className='flex-1 border-l border-[var(--gray-3)] pl-8'>
            <div className='mb-2 flex items-center gap-2'>
              <Icon
                className='text-sm text-[var(--primary-9)]'
                name='material-symbols:auto-awesome'
              />
              <span className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                Analysis
              </span>
              <span className='rounded-full bg-[var(--primary-3)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary-9)]'>
                AUTO-VERIFIED
              </span>
            </div>
            <p className='text-sm leading-relaxed text-[var(--gray-11)]'>
              The invoice is approved because the overall matching score is
              94.0%, which exceeds the required threshold. The vendor and PO
              were clearly identified and all key header fields align within
              tolerance. Both invoice line items matched the PO line items (2/2
              lines matched) with high accuracy.
            </p>
          </div>

          <div className='flex min-w-[240px] items-center gap-4'>
            <div className='flex-1 text-right'>
              <span className='mb-1 block text-[10px] font-bold text-[var(--gray-9)] uppercase'>
                Next Action
              </span>
              <span className='font-bold text-[var(--gray-13)]'>
                Schedule Payment
              </span>
            </div>
            <div className='flex items-center gap-3 rounded-lg border border-[var(--gray-3)] bg-surface p-3'>
              <Icon
                className='text-xl text-[var(--orange-9)]'
                name='material-symbols:calendar-today-outline'
              />
              <div>
                <span className='block text-sm font-bold'>
                  Due Feb 12{' '}
                  <span className='ml-1 text-[var(--orange-9)]'>●</span>
                </span>
                <span className='flex items-center gap-1 text-[10px] text-[var(--gray-10)]'>
                  Net 30 Days
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Content Grid */}
        <div className='grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Left: Invoice View */}
          <div className='flex h-full flex-col overflow-hidden rounded-xl border border-[var(--gray-4)] bg-[var(--gray-3)]'>
            <div className='flex flex-none items-center justify-between border-b border-[var(--gray-4)] bg-surface p-2 text-[var(--gray-11)]'>
              <div className='flex items-center gap-4'>
                <button className='rounded p-1.5 transition-colors hover:bg-[var(--gray-2)]'>
                  <Icon name='material-symbols:view-sidebar-outline' />
                </button>
                <div className='h-4 w-[1px] bg-[var(--gray-4)]'></div>
                <button className='rounded p-1.5 transition-colors hover:bg-[var(--gray-2)]'>
                  <Icon name='material-symbols:search' />
                </button>
                <button className='rounded p-1.5 transition-colors hover:bg-[var(--gray-2)]'>
                  <Icon name='material-symbols:expand-less' />
                </button>
                <button className='rounded p-1.5 transition-colors hover:bg-[var(--gray-2)]'>
                  <Icon name='material-symbols:expand-more' />
                </button>
                <span className='rounded border border-[var(--gray-4)] bg-surface px-2 py-0.5 text-sm'>
                  1
                </span>
              </div>
              <div className='flex items-center gap-4'>
                <div className='flex items-center rounded bg-[var(--gray-2)] px-2'>
                  <button className='p-1'>
                    <Icon name='material-symbols:remove' />
                  </button>
                  <span className='mx-2 text-xs font-medium'>100%</span>
                  <button className='p-1'>
                    <Icon name='material-symbols:add' />
                  </button>
                </div>
              </div>
            </div>
            <div className='custom-scrollbar flex flex-1 justify-center overflow-auto bg-[var(--gray-6)] p-12'>
              <div className='min-h-[842px] w-[595px] bg-surface p-12 text-xs text-[var(--gray-13)] shadow-xl'>
                {/* Simplified Invoice Rendering for Summary */}
                <div className='mb-8'>
                  <h1 className='mb-4 text-lg font-bold text-[var(--blue-12)]'>
                    INVOICE
                  </h1>
                  <div className='space-y-1'>
                    <p>
                      <span className='font-bold'>Supplier:</span>{' '}
                      {data.supplier.name}
                    </p>
                    <p>{data.supplier.address.join(', ')}</p>
                    <p>
                      <span className='font-bold'>Date:</span>{' '}
                      {data.invoiceDate}
                    </p>
                    <p>
                      <span className='font-bold'>Inv #:</span>{' '}
                      {data.invoiceNumber}
                    </p>
                    <p>
                      <span className='font-bold'>PO #:</span> {data.poNumber}
                    </p>
                  </div>
                </div>

                <table className='w-full text-left'>
                  <thead className='border-b border-[var(--gray-3)]'>
                    <tr>
                      <th className='py-2'>Description</th>
                      <th className='py-2'>Qty</th>
                      <th className='py-2'>Rate</th>
                      <th className='py-2'>Amount</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[var(--gray-2)]'>
                    {data.lineItems.map((item, i) => (
                      <tr key={i}>
                        <td className='py-2'>{item.description}</td>
                        <td className='py-2'>{item.qty}</td>
                        <td className='py-2'>${item.rate.toFixed(2)}</td>
                        <td className='py-2'>${item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className='mt-8 flex justify-end border-t border-[var(--gray-3)] pt-4'>
                  <div className='w-48 space-y-2'>
                    <div className='flex justify-between'>
                      <span>Subtotal</span>
                      <span>${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Tax</span>
                      <span>${data.tax.toFixed(2)}</span>
                    </div>
                    <div className='flex justify-between text-lg font-bold'>
                      <span>Total</span>
                      <span>${data.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Summary Data */}
          <div className='custom-scrollbar h-full space-y-6 overflow-y-auto pr-2'>
            {/* Summary Cards */}
            <section>
              <h2 className='mb-4 text-xs font-bold tracking-widest text-[var(--gray-10)] uppercase'>
                Invoice Summary
              </h2>
              <div className='grid grid-cols-2 gap-x-6 gap-y-8 rounded-xl border border-[var(--gray-3)] bg-surface p-6'>
                <div className='flex items-center gap-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--purple-3)] text-[var(--purple-11)]'>
                    <Icon name='tabler:building-skyscraper' />
                  </div>
                  <div>
                    <span className='block text-[10px] font-bold text-[var(--gray-9)] uppercase'>
                      Supplier
                    </span>
                    <span className='font-bold text-[var(--gray-13)]'>
                      {data.supplier.name}
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--blue-3)] text-[var(--blue-11)]'>
                    <Icon name='material-symbols:receipt-long' />
                  </div>
                  <div>
                    <span className='block text-[10px] font-bold text-[var(--gray-9)] uppercase'>
                      PO Number
                    </span>
                    <span className='font-bold text-[var(--gray-13)]'>
                      {data.poNumber}
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--orange-3)] text-[var(--orange-11)]'>
                    <Icon name='material-symbols:payments' />
                  </div>
                  <div>
                    <span className='block text-[10px] font-bold text-[var(--gray-9)] uppercase'>
                      Currency
                    </span>
                    <span className='font-bold text-[var(--gray-13)]'>
                      {data.currency}
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--green-3)] text-[var(--green-11)]'>
                    <Icon name='material-symbols:attach-money' />
                  </div>
                  <div>
                    <span className='block text-[10px] font-bold text-[var(--gray-9)] uppercase'>
                      Total Due
                    </span>
                    <span className='font-bold text-[var(--green-11)]'>
                      {data.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Field Matching */}
            <section>
              <h2 className='mb-4 text-xs font-bold tracking-widest text-[var(--gray-10)] uppercase'>
                Field Matching
              </h2>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {[
                  { label: 'Supplier Name', val: data.supplier.name },
                  { label: 'PO Number', val: data.poNumber },
                  { label: 'Currency', val: data.currency },
                  { label: 'Total Due', val: data.total.toFixed(2) },
                ].map((field, i) => (
                  <div
                    className='rounded-xl border border-[var(--gray-3)] bg-surface p-5'
                    key={i}
                  >
                    <div className='mb-4 flex items-center justify-between'>
                      <span className='text-sm font-bold text-[var(--gray-13)]'>
                        {field.label}
                      </span>
                      <span className='flex items-center gap-1 rounded-full bg-[var(--green-3)] px-2 py-0.5 text-[10px] font-bold text-[var(--green-11)]'>
                        <Icon
                          className='text-sm'
                          name='material-symbols:check'
                        />{' '}
                        100%
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='rounded-lg border border-[var(--gray-3)] bg-[var(--gray-2)] p-3'>
                        <span className='mb-1 block text-[9px] font-bold text-[var(--gray-9)] uppercase'>
                          Extracted
                        </span>
                        <span className='text-xs font-semibold text-[var(--gray-12)]'>
                          {field.val}
                        </span>
                      </div>
                      <div className='rounded-lg border border-[var(--gray-3)] bg-[var(--gray-2)] p-3'>
                        <span className='mb-1 block text-[9px] font-bold text-[var(--gray-9)] uppercase'>
                          PO Value
                        </span>
                        <span className='text-xs font-semibold text-[var(--gray-12)]'>
                          {field.val}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Line Items */}
            <section>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xs font-bold tracking-widest text-[var(--gray-10)] uppercase'>
                  Line Item Matching
                </h2>
                <span className='text-[10px] font-medium text-[var(--gray-9)] italic'>
                  {data.lineItems.length} of {data.lineItems.length} matched
                </span>
              </div>
              <div className='overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface'>
                <table className='w-full text-xs'>
                  <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-2)]'>
                    <tr className='text-left text-[var(--gray-11)]'>
                      <th className='p-3'>ITEM DESCRIPTION</th>
                      <th className='p-3'>EXTRACTED</th>
                      <th className='p-3'>PO VALUE</th>
                      <th className='p-3'>STATUS</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[var(--gray-2)]'>
                    {data.lineItems.map((item, i) => (
                      <tr key={i}>
                        <td className='p-3 font-medium text-[var(--gray-12)]'>
                          {item.description}
                        </td>
                        <td className='p-3 text-[var(--gray-11)]'>
                          ${item.amount.toFixed(2)}
                        </td>
                        <td className='p-3 text-[var(--gray-11)]'>
                          ${item.amount.toFixed(2)}
                        </td>
                        <td className='p-3'>
                          <Icon
                            className='text-sm text-[var(--green-9)]'
                            name='material-symbols:check-circle'
                          />
                        </td>
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
