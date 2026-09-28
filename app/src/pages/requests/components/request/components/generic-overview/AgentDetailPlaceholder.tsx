import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import React from 'react'
import cn from '@/utils/cn'
import type { AgentBlock } from './AgentSummaryBoxes'

interface AgentDetailPlaceholderProps {
  agentBlock: AgentBlock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestData: any
  onBack: () => void
}

const AgentDetailPlaceholder: React.FC<AgentDetailPlaceholderProps> = ({
  agentBlock,
  requestData,
  onBack,
}) => {
  const { t } = useLingui()
  const label = agentBlock.settings?.label || 'Agent Details'
  const iconName = agentBlock.icon || 'lucide:cpu'

  const isQualify =
    agentBlock.settings?.subtype === 'QUALIFY' || label.includes('Qualify')
  const isQuote =
    agentBlock.settings?.subtype === 'QUOTE' || label.includes('Quote')
  const isDocGen =
    agentBlock.settings?.subtype === 'DOCUMENT_GENERATE' ||
    label.includes('Document Generate')
  const isAPAgent =
    agentBlock.settings?.subtype === 'AP_AGENT' || label.includes('AP Agent')

  let hasAgentResponse = false
  if (isQualify) {
    hasAgentResponse = !!requestData?.qualifyAgentResponse?.qualifier_result
  } else if (isQuote) {
    hasAgentResponse = !!requestData?.quoteAgentResponse
  } else if (isDocGen) {
    hasAgentResponse = !!requestData?.documentGenerateResponse
  } else if (isAPAgent) {
    hasAgentResponse =
      !!requestData?.agentResponse ||
      (requestData?._agentData && requestData._agentData.length > 0)
  } else {
    // Fallback for unknown agents
    hasAgentResponse =
      !!requestData?.agentResponse ||
      (requestData?._agentData && requestData._agentData.length > 0)
  }

  const isProcessing =
    !requestData || (requestData?.stage === label && !hasAgentResponse)

  return (
    <div className='flex flex-col gap-5 pb-5'>
      <div className='flex items-center gap-3'>
        <button
          className='flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-2'
          onClick={onBack}
        >
          <ArrowLeft className='h-4 w-4 text-gray-11' />
        </button>
        <div className='flex items-center gap-2'>
          <Icon className='h-5 w-5 text-gray-9' icon={iconName} />
          <h2 className='text-lg font-semibold text-gray-12'>{label}</h2>
        </div>
      </div>

      <div className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-sm'>
        {isProcessing ? (
          <div className='flex flex-col items-center justify-center gap-4 py-12 text-center'>
            <div className='flex size-14 items-center justify-center rounded-full bg-[var(--primary-1)]'>
              <Icon
                className='size-7 animate-spin text-[var(--primary-9)]'
                icon='tabler:loader-2'
              />
            </div>
            <div className='text-center'>
              <h3 className='text-base font-bold text-[var(--gray-13)]'>
                {t`Agent is processing...`}
              </h3>
              <p className='mt-1 max-w-[280px] text-xs font-semibold text-[var(--gray-10)]'>
                {t`Please wait while data is being extracted.`}
              </p>
            </div>
          </div>
        ) : isQualify && requestData?.qualifyAgentResponse?.qualifier_result ? (
          (() => {
            const result = requestData.qualifyAgentResponse.qualifier_result
            const isQualify = result.Qualify?.toLowerCase() === 'qualify'
            return (
              <div className='flex flex-col gap-6'>
                {/* Header info */}
                <div className='flex flex-wrap items-start justify-between gap-4'>
                  <div>
                    <h3 className='text-lg font-bold text-gray-12'>
                      {result['Project Name'] || 'Unknown Project'}
                    </h3>
                    <p className='mt-1 text-sm text-gray-9'>
                      {result['Project Type']}{' '}
                      {result.Deadline ? ` • Deadline: ${result.Deadline}` : ''}
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold',
                        isQualify
                          ? 'border-green-4 bg-green-2 text-green-11'
                          : 'border-red-4 bg-red-2 text-red-11',
                      )}
                    >
                      {isQualify ? (
                        <Icon className='h-4 w-4' icon='tabler:check' />
                      ) : (
                        <Icon className='h-4 w-4' icon='tabler:x' />
                      )}
                      {result.Qualify?.toUpperCase()}
                    </div>
                    {result.Confidence && (
                      <div className='flex items-center gap-1 text-xs font-semibold text-gray-9'>
                        <Icon className='h-3.5 w-3.5' icon='tabler:target' />
                        {result.Confidence}% Confidence
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Insight */}
                {result['Ai Insight'] && (
                  <div className='flex items-start gap-3 rounded-lg border border-primary-3 bg-primary-1 p-4 text-primary-11'>
                    <Icon
                      className='mt-0.5 h-5 w-5 shrink-0 text-primary-9'
                      icon='tabler:sparkles'
                    />
                    <div className='flex flex-1 flex-col gap-1 text-sm'>
                      <span className='font-bold text-primary-12'>
                        AI Insight
                      </span>
                      <span className='leading-relaxed'>
                        {result['Ai Insight']}
                      </span>
                    </div>
                  </div>
                )}

                {/* Flags */}
                {result.Flags && result.Flags.length > 0 && (
                  <div className='flex flex-col gap-2'>
                    <h4 className='text-sm font-semibold text-gray-12'>
                      Flags
                    </h4>
                    <div className='flex flex-wrap gap-2'>
                      {result.Flags.map((flag: string, i: number) => (
                        <span
                          className='inline-flex items-center gap-1 rounded-md border border-orange-3 bg-orange-2 px-2 py-1 text-xs font-semibold text-orange-10'
                          key={i}
                        >
                          <Icon className='h-3 w-3' icon='tabler:flag' />
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Items */}
                {result['Matched Items'] &&
                  result['Matched Items'].length > 0 && (
                    <div className='flex flex-col gap-2'>
                      <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
                        <Icon
                          className='h-4 w-4 text-green-9'
                          icon='tabler:list-check'
                        />
                        Matched Items ({result['Matched Items'].length})
                      </h4>
                      <div className='grid gap-2'>
                        {result['Matched Items'].map(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (item: any, i: number) => (
                          <div
                            className='flex flex-col gap-1 rounded-lg border border-gray-3 bg-gray-1 p-3'
                            key={i}
                          >
                            <div className='flex items-center justify-between'>
                              <span className='text-sm font-semibold text-gray-12'>
                                {item.Item}
                              </span>
                              <span className='rounded bg-green-2 px-2 py-0.5 text-xs font-bold text-green-10'>
                                {item.Match}
                              </span>
                            </div>
                            <div className='flex gap-2 text-xs text-gray-9'>
                              <span>
                                Category:{' '}
                                <strong className='text-gray-11'>
                                  {item.Category}
                                </strong>
                              </span>
                              {item['Catalog Ref'] && (
                                <span>
                                  • Ref:{' '}
                                  <strong className='text-gray-11'>
                                    {item['Catalog Ref']}
                                  </strong>
                                </span>
                              )}
                            </div>
                            {item.Note && (
                              <div className='mt-1 line-clamp-2 rounded bg-gray-2 p-1.5 text-xs text-gray-10'>
                                {item.Note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Excluded Items */}
                {result['Excluded Items'] &&
                  result['Excluded Items'].length > 0 && (
                    <div className='flex flex-col gap-2'>
                      <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
                        <Icon
                          className='h-4 w-4 text-red-9'
                          icon='tabler:list-x'
                        />
                        Excluded Items ({result['Excluded Items'].length})
                      </h4>
                      <div className='grid gap-2'>
                        {result['Excluded Items'].map(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (item: any, i: number) => (
                            <div
                              className='flex flex-col gap-1 rounded-lg border border-gray-3 bg-gray-1 p-3'
                              key={i}
                            >
                              <span className='text-sm font-semibold text-gray-12'>
                                {item.Item}
                              </span>
                              {item.Reason && (
                                <div className='mt-1 rounded bg-red-1 p-1.5 text-xs text-red-10'>
                                  {item.Reason}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Reasoning */}
                {result.Reasoning && (
                  <div className='flex flex-col gap-2 border-t border-gray-3 pt-2'>
                    <h4 className='text-sm font-semibold text-gray-12'>
                      Detailed Reasoning
                    </h4>
                    <p className='text-xs leading-relaxed whitespace-pre-wrap text-gray-10'>
                      {result.Reasoning}
                    </p>
                  </div>
                )}
              </div>
            )
          })()
        ) : isQuote && requestData?.quoteAgentResponse?.quote_result ? (
          (() => {
            const result = requestData.quoteAgentResponse.quote_result
            return (
              <div className='flex flex-col gap-6'>
                {/* Header info */}
                <div className='flex flex-wrap items-start justify-between gap-4'>
                  <div>
                    <h3 className='text-lg font-bold text-gray-12'>
                      {result.Project || 'Unknown Project'}
                    </h3>
                    <p className='mt-1 flex gap-2 text-sm text-gray-9'>
                      <span>Order: {result['Order Number'] || '-'}</span>
                      <span>•</span>
                      <span>{result['Invoice Type'] || 'Quotation'}</span>
                      <span>•</span>
                      <span>{result.Date || '-'}</span>
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <div className='text-xl font-bold text-[var(--primary-11)]'>
                      $
                      {result.Total?.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className='text-xs font-medium text-gray-9'>
                      Total Amount
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                {result['Line Item'] && result['Line Item'].length > 0 && (
                  <div className='flex flex-col gap-3'>
                    <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
                      <Icon
                        className='h-4 w-4 text-[var(--primary-9)]'
                        icon='tabler:shopping-cart'
                      />
                      Line Items ({result['Line Item'].length})
                    </h4>
                    <div className='overflow-x-auto rounded-lg border border-gray-3'>
                      <table className='w-full text-left text-sm'>
                        <thead className='bg-gray-1 text-xs text-gray-11'>
                          <tr>
                            <th className='p-3 font-semibold'>Product</th>
                            <th className='p-3 font-semibold'>Description</th>
                            <th className='p-3 text-center font-semibold'>
                              Qty
                            </th>
                            <th className='p-3 text-right font-semibold'>
                              Price
                            </th>
                            <th className='p-3 text-right font-semibold'>
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-2 bg-surface'>
                          {result['Line Item'].map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (item: any, i: number) => (
                            <React.Fragment key={i}>
                              <tr className='group'>
                                <td className='p-3 align-top font-medium text-gray-12'>
                                  <div className='flex items-center gap-2'>
                                    {item.Product}
                                    {item['Needs Engineering Review'] && (
                                      <span title='Needs Engineering Review' className='flex'>
                                        <Icon
                                          className='h-4 w-4 shrink-0 text-orange-9'
                                          icon='tabler:alert-triangle'
                                        />
                                      </span>
                                    )}
                                  </div>
                                  <div className='mt-0.5 text-xs text-gray-9'>
                                    {item.Category}
                                  </div>
                                </td>
                                <td className='p-3 align-top text-gray-11'>
                                  {item.Description}
                                </td>
                                <td className='p-3 text-center align-top text-gray-12'>
                                  {item.Qty}
                                </td>
                                <td className='p-3 text-right align-top text-gray-12'>
                                  $
                                  {item.Price?.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className='p-3 text-right align-top font-semibold text-gray-12'>
                                  $
                                  {item.Subtotal?.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                              {item.Note && (
                                <tr>
                                  <td className='px-3 pt-0 pb-3' colSpan={5}>
                                    <div className='flex items-start gap-2 rounded border border-orange-3 bg-orange-2/30 p-2 text-xs text-gray-10 text-orange-11'>
                                      <Icon
                                        className='mt-0.5 h-4 w-4 shrink-0'
                                        icon='tabler:info-circle'
                                      />
                                      <span>{item.Note}</span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary Totals */}
                <div className='flex justify-end border-t border-gray-3 pt-4'>
                  <div className='flex w-full max-w-sm flex-col gap-2 text-sm'>
                    <div className='flex justify-between text-gray-11'>
                      <span>Subtotal</span>
                      <span className='font-medium text-gray-12'>
                        $
                        {result.Subtotal?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between text-gray-11'>
                      <span>Freight</span>
                      <span className='font-medium text-gray-12'>
                        $
                        {result.Freight?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='flex justify-between text-gray-11'>
                      <span>HST</span>
                      <span className='font-medium text-gray-12'>
                        $
                        {result.Hst?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className='mt-2 flex justify-between border-t border-gray-2 pt-2 text-base font-bold text-gray-12'>
                      <span>Total</span>
                      <span className='text-[var(--primary-11)]'>
                        $
                        {result.Total?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assumptions */}
                {result.Assumptions && result.Assumptions.length > 0 && (
                  <div className='flex flex-col gap-2 border-t border-gray-3 pt-2'>
                    <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
                      <Icon
                        className='h-4 w-4 text-orange-9'
                        icon='tabler:bulb'
                      />
                      Assumptions & Rules Applied
                    </h4>
                    <ul className='flex list-disc flex-col gap-1 pl-5'>
                      {result.Assumptions.map((note: string, i: number) => (
                        <li className='text-xs text-gray-10' key={i}>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Remarks */}
                {result.Remarks && (
                  <div className='flex flex-col gap-2 border-t border-gray-3 pt-2'>
                    <h4 className='text-sm font-semibold text-gray-12'>
                      Remarks
                    </h4>
                    <p className='text-xs leading-relaxed text-gray-10'>
                      {result.Remarks}
                    </p>
                  </div>
                )}
              </div>
            )
          })()
        ) : (
          <div className='flex flex-col items-center justify-center gap-3 py-10 text-center'>
            <Icon className='h-10 w-10 text-gray-7' icon='lucide:hammer' />
            <h3 className='text-base font-medium text-gray-12'>
              Details Not Available Yet
            </h3>
            <p className='max-w-md text-13 text-gray-9'>
              The API integration for {label} is currently pending. Once the API
              is updated, this view will show the full agent analysis and
              details.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentDetailPlaceholder
