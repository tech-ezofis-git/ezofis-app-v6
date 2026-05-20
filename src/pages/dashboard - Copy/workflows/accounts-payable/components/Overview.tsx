import { useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Tr from '@/components/base/table/Tr'
import { AnimateSlideUp } from '@/components/common/animations'
import { SkeletonCard } from '@/components/common/skeletons'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '../../shared/components/Section'

// Custom hook to replace @mantine/hooks useViewportSize
const useViewportSize = () => {
  const [size, setSize] = useState({ height: 0, width: 0 })

  useEffect(() => {
    const updateSize = () => {
      setSize({
        height: window.innerHeight,
        width: window.innerWidth,
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return size
}

interface AgentData {
  'decision': string
  'reason': string
  'score': number
  'debug'?: {
    'Side-by-side Field Matching'?: Array<{
      'Field': string
      'Invoice Value': string | number
      'PO Value': string | number
      'Score': number
    }>
    'Side-by-side Line Item matching'?: Array<{
      'Amount': { 'Invoice Value': number; 'PO Value': number; 'Score': number }
      'Description': {
        'Invoice Value': string
        'PO Value': string
        'Score': number
      }
      'Line Score': number
      'Price': { 'Invoice Value': number; 'PO Value': number; 'Score': number }
      'Quantity': {
        'Invoice Value': number
        'PO Value': number
        'Score': number
      }
    }>
  }
  'Extracted Invoice JSON'?: {
    invoice_header?: {
      'Currency'?: string
      'PO Number'?: string
      'Supplier Name'?: string
      'Total Due'?: string
    }
    line_items?: Array<{
      amount: number
      description: string
      line_no: number
      price: number
      quantity: string
    }>
  }
  'invoice_errors'?: {
    errors: Array<string>
    severity: string
  }
  'po_row'?: {
    'Currency'?: string
    'PO Amount': string
    'PO Number': string
    'Vendor Name': string
  }
  'reqNo'?: string
}

interface Props {
  agentData?: AgentData
}

const Overview = ({ agentData }: Props) => {
  const { width } = useViewportSize()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // Mock data structure for demonstration - replace with actual agentData prop
  const data = agentData || {}
  const fieldMatching = data.debug?.['Side-by-side Field Matching'] || []
  const lineItemMatching = data.debug?.['Side-by-side Line Item matching'] || []
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header
  const lineItems = data['Extracted Invoice JSON']?.line_items || []

  // #region agent log
  useEffect(() => {
    const logData = {
      data: {
        hasIndex0: !!lineItems[0],
        index0Value: lineItems[0],
        items: lineItems.map((item, idx) => ({
          description: item?.description,
          index: idx,
          isTruthy: !!item,
          line_no: item?.line_no,
        })),
        length: lineItems.length,
      },
      hypothesisId: 'A,B,C,D',
      location: 'Overview.tsx:194',
      message: 'lineItems array data',
      runId: 'run1',
      sessionId: 'debug-session',
      timestamp: Date.now(),
    }
    fetch('http://127.0.0.1:7242/ingest/55a364bd-11ea-4589-affc-f06939d0aec8', {
      body: JSON.stringify(logData),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }).catch(() => {})
  }, [lineItems])
  // #endregion

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-11'
    if (score >= 70) return 'text-orange-11'
    return 'text-red-11'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-gray-2'
    if (score >= 70) return 'bg-gray-2'
    return 'bg-gray-2'
  }

  const getDecisionColor = (decision: string) => {
    if (!decision) return 'text-gray-11 bg-gray-2 border-gray-3'
    if (decision === 'APPROVED') return 'text-green-11 bg-green-2 border-gray-4'
    return 'text-red-11 bg-red-2 border-gray-4'
  }

  const getDecisionIcon = (decision: string) => {
    if (!decision) return 'tabler:loader'
    if (decision === 'APPROVED') return 'tabler:check'
    return 'tabler:x'
  }

  const getDecisionIconColor = (decision: string) => {
    if (!decision) return 'text-gray-8'
    if (decision === 'APPROVED') return 'text-green-11'
    return 'text-red-11'
  }

  return (
    <Section title='Overview'>
      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          width >= SCREEN_XL ? '@xl:grid-cols-2' : 'md:grid-cols-2',
        )}
      >
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((index) => (
              <SkeletonCard key={`skeleton-${index}`} />
            ))}
          </>
        ) : (
          <>
            {/* Decision & Score Card */}
            <AnimateSlideUp delay={0.1}>
              <div className='rounded-lg border border-gray-3 bg-surface'>
                <div className='border-b border-gray-3 px-4 py-2.5'>
                  <div className='text-14 font-semibold text-gray-13'>
                    AI DECISION
                  </div>
                </div>
                <div className='p-4'>
                  <div className='mb-3 flex items-start justify-between'>
                    <div className='flex items-center gap-2.5'>
                      <Icon
                        name={getDecisionIcon(data.decision)}
                        className={cn(
                          'size-5',
                          getDecisionIconColor(data.decision),
                        )}
                      />
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-12 font-medium',
                          getDecisionColor(data.decision),
                        )}
                      >
                        <Icon
                          name={getDecisionIcon(data.decision)}
                          className={cn(
                            'size-3.5',
                            getDecisionIconColor(data.decision),
                          )}
                        />
                        {data.decision}
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='mb-0.5 text-11 text-gray-10'>
                        Confidence
                      </div>
                      <div
                        className={cn(
                          'text-20 font-semibold',
                          getScoreColor(data.score),
                        )}
                      >
                        {data.score}%
                      </div>
                    </div>
                  </div>
                  <div className='mb-3 rounded border border-gray-3 bg-gray-1 p-3'>
                    <div className='flex items-start gap-2'>
                      <Icon
                        className='mt-0.5 size-4 shrink-0 text-purple-9'
                        name='tabler:info-circle'
                      />
                      <div className='text-12 leading-relaxed text-gray-12'>
                        {data.reason}
                      </div>
                    </div>
                  </div>
                  {data.reqNo && (
                    <div className='text-12 text-gray-11'>
                      # Request:{' '}
                      <span className='font-medium text-purple-11'>
                        {data.reqNo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </AnimateSlideUp>

            {/* Field Matching Card */}
            <AnimateSlideUp delay={0.2}>
              <div className='rounded-lg border border-gray-3 bg-surface'>
                <div className='border-b border-gray-3 px-4 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <Icon
                      className='size-4 text-gray-11'
                      name='tabler:file-check'
                    />
                    <div className='text-14 font-semibold text-gray-13'>
                      Field Matching
                    </div>
                  </div>
                </div>
                <div className='p-3'>
                  <div className='space-y-2'>
                    {fieldMatching.length > 0 ? (
                      fieldMatching.map((field, index) => (
                        <div
                          className='rounded border border-gray-3 bg-gray-1 p-3'
                          key={index}
                        >
                          <div className='mb-2 flex items-center justify-between'>
                            <div className='flex items-center gap-1.5'>
                              <Icon
                                className='size-3.5 text-green-11'
                                name='tabler:check'
                              />
                              <div className='text-13 font-medium text-gray-12'>
                                {field.Field}
                              </div>
                            </div>
                            <div
                              className={cn(
                                'rounded-full px-2 py-0.5 text-11 font-medium',
                                getScoreBgColor(field.Score),
                                getScoreColor(field.Score),
                              )}
                            >
                              {field.Score}%
                            </div>
                          </div>
                          <div className='grid grid-cols-2 gap-2'>
                            <div>
                              <div className='mb-0.5 text-11 text-gray-10'>
                                Invoice
                              </div>
                              <div className='text-12 font-medium text-gray-13'>
                                {String(field['Invoice Value'])}
                              </div>
                            </div>
                            <div>
                              <div className='mb-0.5 text-11 text-gray-10'>
                                PO
                              </div>
                              <div className='text-12 font-medium text-gray-13'>
                                {String(field['PO Value'])}
                              </div>
                            </div>
                          </div>
                          {field.Score === 100 && (
                            <div className='mt-2 text-11 text-gray-10'>
                              Perfect Match
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className='rounded border border-gray-3 bg-gray-1 p-3 text-center text-12 text-gray-10'>
                        No field matching data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AnimateSlideUp>

            {/* Invoice Summary Card */}
            <AnimateSlideUp delay={0.3}>
              <div className='rounded-lg border border-gray-3 bg-surface'>
                <div className='border-b border-gray-3 px-4 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <Icon
                      className='size-4 text-purple-9'
                      name='tabler:receipt'
                    />
                    <div className='text-14 font-semibold text-gray-13'>
                      Invoice Summary
                    </div>
                  </div>
                </div>
                <div className='p-3'>
                  <div className='space-y-3'>
                    {invoiceHeader && (
                      <div className='grid grid-cols-2 gap-2'>
                        <div>
                          <div className='mb-1 flex items-center gap-1 text-11 text-gray-10'>
                            <Icon
                              className='size-3 text-gray-10'
                              name='tabler:building-store'
                            />
                            Supplier
                          </div>
                          <div className='text-13 font-medium text-gray-13'>
                            {invoiceHeader['Supplier Name'] || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className='mb-1 flex items-center gap-1 text-11 text-gray-10'>
                            <Icon
                              className='size-3 text-gray-10'
                              name='tabler:file-check'
                            />
                            PO Number
                          </div>
                          <div className='text-13 font-medium text-gray-13'>
                            {invoiceHeader['PO Number'] || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className='mb-1 text-11 text-gray-10'>
                            Currency
                          </div>
                          <div className='text-13 font-medium text-gray-13'>
                            {invoiceHeader.Currency || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className='mb-1 text-11 text-gray-10'>
                            Total Amount
                          </div>
                          <div className='text-15 font-semibold text-gray-13'>
                            {invoiceHeader['Total Due']
                              ? `${invoiceHeader.Currency || ''} ${invoiceHeader['Total Due']}`
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                    {lineItems.length > 0 && (
                      <div className='space-y-2'>
                        <div className='flex items-center gap-1.5 text-13 font-medium text-gray-12'>
                          <Icon
                            className='size-3.5 text-gray-11'
                            name='tabler:list'
                          />
                          Line Items
                        </div>
                        <div className='overflow-x-auto'>
                          <Table>
                            <Tbody>
                              {lineItems.map((item, index) => {
                                // #region agent log
                                const logData2 = {
                                  data: {
                                    index,
                                    isIndex0: index === 0,
                                    item: item
                                      ? {
                                          amount: item.amount,
                                          description: item.description,
                                          line_no: item.line_no,
                                          price: item.price,
                                          quantity: item.quantity,
                                        }
                                      : null,
                                    itemIsTruthy: !!item,
                                    keyValue: item?.line_no
                                      ? `line-${item.line_no}`
                                      : `line-item-${index}`,
                                    willRender: !!item,
                                  },
                                  hypothesisId: 'A,B,C,D,E',
                                  location: 'Overview.tsx:470',
                                  message: 'map iteration',
                                  runId: 'run1',
                                  sessionId: 'debug-session',
                                  timestamp: Date.now(),
                                }
                                fetch(
                                  'http://127.0.0.1:7242/ingest/55a364bd-11ea-4589-affc-f06939d0aec8',
                                  {
                                    body: JSON.stringify(logData2),
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    method: 'POST',
                                  },
                                ).catch(() => {})
                                console.log('[DEBUG] Line item map:', {
                                  index,
                                  isIndex0: index === 0,
                                  item,
                                  key: item?.line_no
                                    ? `line-${item.line_no}`
                                    : `line-item-${index}`,
                                })
                                // #endregion
                                const rowKey = item?.line_no
                                  ? `line-${item.line_no}`
                                  : `line-item-${index}`
                                return (
                                  <Tr key={rowKey}>
                                    <Td>
                                      <div className='flex size-5 items-center justify-center rounded bg-purple-2 text-11 font-medium text-purple-11'>
                                        {index + 1}
                                      </div>
                                    </Td>
                                    <Td>
                                      <div className='text-13 font-medium text-gray-13'>
                                        {item.description}
                                      </div>
                                    </Td>
                                    <Td>
                                      <div className='text-12 text-gray-11'>
                                        {item.quantity} × {item.price}
                                      </div>
                                    </Td>
                                    <Td>
                                      <div className='rounded bg-purple-2 px-2 py-0.5 text-12 font-medium text-purple-11'>
                                        {item.amount}
                                      </div>
                                    </Td>
                                  </Tr>
                                )
                              })}
                            </Tbody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AnimateSlideUp>

            {/* Line Item Matching Card */}
            <AnimateSlideUp delay={0.4}>
              <div className='rounded-lg border border-gray-3 bg-surface'>
                <div className='border-b border-gray-3 px-4 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <Icon
                      className='size-4 text-teal-9'
                      name='tabler:list-check'
                    />
                    <div className='text-14 font-semibold text-gray-13'>
                      Line Item Matching
                    </div>
                  </div>
                </div>
                <div className='p-3'>
                  <div className='space-y-2'>
                    {lineItemMatching.length > 0 ? (
                      lineItemMatching.map((lineItem, index) => (
                        <div
                          className='rounded border border-gray-3 bg-gray-1 p-3'
                          key={index}
                        >
                          <div className='mb-2 flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <div className='flex size-6 items-center justify-center rounded bg-teal-2 text-12 font-medium text-teal-11'>
                                {index + 1}
                              </div>
                              <div>
                                <div className='text-13 font-medium text-gray-13'>
                                  {lineItem.Description?.['Invoice Value'] ||
                                    'N/A'}
                                </div>
                                <div className='text-11 text-gray-10'>
                                  Line Item
                                </div>
                              </div>
                            </div>
                            <div
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-11 font-medium',
                                getScoreBgColor(lineItem['Line Score']),
                                getScoreColor(lineItem['Line Score']),
                              )}
                            >
                              {lineItem['Line Score']}%
                            </div>
                          </div>
                          <div className='grid grid-cols-2 gap-2'>
                            {[
                              {
                                icon: 'tabler:file-text',
                                invoice:
                                  lineItem.Description?.['Invoice Value'],
                                label: 'Description',
                                po: lineItem.Description?.['PO Value'],
                                score: lineItem.Description?.Score,
                              },
                              {
                                icon: 'tabler:hash',
                                invoice: lineItem.Quantity?.['Invoice Value'],
                                label: 'Quantity',
                                po: lineItem.Quantity?.['PO Value'],
                                score: lineItem.Quantity?.Score,
                              },
                              {
                                icon: 'tabler:currency-dollar',
                                invoice: lineItem.Price?.['Invoice Value'],
                                label: 'Price',
                                po: lineItem.Price?.['PO Value'],
                                score: lineItem.Price?.Score,
                              },
                              {
                                icon: 'tabler:calculator',
                                invoice: lineItem.Amount?.['Invoice Value'],
                                label: 'Amount',
                                po: lineItem.Amount?.['PO Value'],
                                score: lineItem.Amount?.Score,
                              },
                            ].map((field, fieldIndex) => (
                              <div
                                className='rounded border border-gray-3 bg-surface p-2'
                                key={fieldIndex}
                              >
                                <div className='mb-1.5 flex items-center justify-between'>
                                  <div className='flex items-center gap-1 text-11 text-gray-10'>
                                    <Icon
                                      className='size-3 text-gray-10'
                                      name={field.icon}
                                    />
                                    {field.label}
                                  </div>
                                  <div
                                    className={cn(
                                      'text-10 rounded-full px-1.5 py-0.5 font-medium',
                                      getScoreBgColor(field.score),
                                      getScoreColor(field.score),
                                    )}
                                  >
                                    {field.score}%
                                  </div>
                                </div>
                                <div className='space-y-0.5'>
                                  <div className='text-11 text-gray-11'>
                                    Invoice:{' '}
                                    <span className='font-medium text-gray-13'>
                                      {field.invoice}
                                    </span>
                                  </div>
                                  <div className='text-11 text-gray-11'>
                                    PO:{' '}
                                    <span className='font-medium text-gray-13'>
                                      {field.po}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='rounded border border-gray-3 bg-gray-1 p-3 text-center text-12 text-gray-10'>
                        No line item matching data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AnimateSlideUp>
          </>
        )}
      </div>
    </Section>
  )
}

Overview.displayName = 'Overview'
export default Overview
