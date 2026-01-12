import { useState, useEffect } from 'react'
import Icon from '@/components/base/icon/Icon'
import { AnimateSlideUp } from '@/components/common/animations'
import { SkeletonCard } from '@/components/common/skeletons'
// import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '@/pages/dashboard/workflows/shared/components/Section'

// const useViewportSize = () => {
//   const [size, setSize] = useState({ width: 0, height: 0 })

//   useEffect(() => {
//     const updateSize = () => {
//       setSize({
//         width: window.innerWidth,
//         height: window.innerHeight,
//       })
//     }
//     updateSize()
//     window.addEventListener('resize', updateSize)
//     return () => window.removeEventListener('resize', updateSize)
//   }, [])

//   return size
// }

interface AgentData {
  decision: string
  score: number
  reason: string
  debug?: {
    'Side-by-side Field Matching'?: Array<{
      Field: string
      'Invoice Value': string | number
      'PO Value': string | number
      Score: number
    }>
    'Side-by-side Line Item matching'?: Array<{
      Description: { 'Invoice Value': string; 'PO Value': string; Score: number }
      Quantity: { 'Invoice Value': number; 'PO Value': number; Score: number }
      Price: { 'Invoice Value': number; 'PO Value': number; Score: number }
      Amount: { 'Invoice Value': number; 'PO Value': number; Score: number }
      'Line Score': number
    }>
  }
  po_row?: {
    'PO Number': string
    'Vendor Name': string
    'PO Amount': string
    Currency?: string
  }
  'Extracted Invoice JSON'?: {
    invoice_header?: {
      'Supplier Name'?: string
      'PO Number'?: string
      Currency?: string
      'Total Due'?: string
    }
    line_items?: Array<{
      line_no: number
      description: string
      quantity: string
      price: number
      amount: number
    }>
  }
  invoice_errors?: {
    severity: string
    errors: Array<string>
  }
  reqNo?: string
}

interface Props {
  agentData?: AgentData
}

const Overview = ({ agentData }: Props) => {
  // const { width } = useViewportSize()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // Mock data
  const defaultAgentData: AgentData = {
    decision: 'APPROVED',
    score: 94,
    reason:
      'The invoice from Silverline Auto Parts matches the PO exactly. All line items and totals are verified.',
    debug: {
      'Side-by-side Field Matching': [
        {
          Field: 'Supplier Name',
          'Invoice Value': 'Silverline Auto Parts',
          'PO Value': 'Silverline Auto Parts',
          Score: 100,
        },
        {
          Field: 'PO Number',
          'Invoice Value': 'PO-1007',
          'PO Value': 'PO-1007',
          Score: 100,
        },
        {
          Field: 'Total Due',
          'Invoice Value': 813.6,
          'PO Value': 813.6,
          Score: 100,
        },
      ],
      'Side-by-side Line Item matching': [
        {
          Description: {
            'Invoice Value': 'Mouse',
            'PO Value': 'Logitech Mouse',
            Score: 40,
          },
          Quantity: {
            'Invoice Value': 1,
            'PO Value': 1,
            Score: 100,
          },
          Price: {
            'Invoice Value': 106.0,
            'PO Value': 106.0,
            Score: 100,
          },
          Amount: {
            'Invoice Value': 106.0,
            'PO Value': 106.0,
            Score: 100,
          },
          'Line Score': 60,
        },
        {
          Description: {
            'Invoice Value': 'Keyboard',
            'PO Value': 'Keyboard Mech',
            Score: 85,
          },
          Quantity: {
            'Invoice Value': 6,
            'PO Value': 6,
            Score: 100,
          },
          Price: {
            'Invoice Value': 102.0,
            'PO Value': 102.0,
            Score: 100,
          },
          Amount: {
            'Invoice Value': 612.0,
            'PO Value': 612.0,
            Score: 100,
          },
          'Line Score': 90,
        },
        {
          Description: {
            'Invoice Value': 'Printer',
            'PO Value': 'Printer',
            Score: 100,
          },
          Quantity: {
            'Invoice Value': 4,
            'PO Value': 4,
            Score: 100,
          },
          Price: {
            'Invoice Value': 97.0,
            'PO Value': 97.0,
            Score: 100,
          },
          Amount: {
            'Invoice Value': 388.0,
            'PO Value': 388.0,
            Score: 100,
          },
          'Line Score': 100,
        },
      ],
    },
    'Extracted Invoice JSON': {
      invoice_header: {
        'Supplier Name': 'Silverline Auto Parts',
        'PO Number': 'PO-1007',
        Currency: 'USD',
        'Total Due': '1106.00',
      },
      line_items: [],
    },
    reqNo: 'REQ-75',
  }

  const data = agentData || defaultAgentData

  const fieldMatching = data.debug?.['Side-by-side Field Matching'] || []
  const lineItemMatching = data.debug?.['Side-by-side Line Item matching'] || []
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header

  // Helper to normalize status string
  const getStatusAttr = (decision: string) => {
    const d = decision?.toUpperCase() || ''
    if (d.includes('PARTIAL')) return 'PARTIAL'
    if (d === 'APPROVED') return 'APPROVED'
    if (d === 'REJECTED' || d === 'DECLINED') return 'REJECTED'
    return 'DEFAULT'
  }

  const statusAttr = getStatusAttr(data.decision)

  // ✅ Theme Logic returning Tailwind Classes directly
  const getDecisionThemeClasses = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          bannerBorder: 'border-l-[var(--green-9)]',
          iconColor: 'text-[var(--green-9)]',
          titleColor: 'text-[var(--green-11)]',
          badge: 'bg-[var(--green-3)] text-[var(--green-11)]',
          box: 'bg-[var(--green-2)] border-[var(--green-4)]',
        }
      case 'REJECTED':
        return {
          bannerBorder: 'border-l-[var(--red-9)]',
          iconColor: 'text-[var(--red-9)]',
          titleColor: 'text-[var(--red-11)]',
          badge: 'bg-[var(--red-3)] text-[var(--red-11)]',
          box: 'bg-[var(--red-2)] border-[var(--red-4)]',
        }
      case 'PARTIAL':
        return {
          bannerBorder: 'border-l-[var(--yellow-9)]',
          iconColor: 'text-[var(--yellow-9)]',
          titleColor: 'text-[var(--yellow-11)]',
          badge: 'bg-[var(--yellow-3)] text-[var(--yellow-11)]',
          box: 'bg-[var(--yellow-2)] border-[var(--yellow-4)]',
        }
      default:
        return {
          bannerBorder: 'border-l-[var(--gray-9)]',
          iconColor: 'text-[var(--gray-9)]',
          titleColor: 'text-[var(--gray-11)]',
          badge: 'bg-[var(--gray-3)] text-[var(--gray-11)]',
          box: 'bg-[var(--gray-1)] border-[var(--gray-3)]',
        }
    }
  }

  const decisionTheme = getDecisionThemeClasses(statusAttr)

  const getScoreBandClass = (score: number) => {
    if (score >= 90) return 'bg-white border-[var(--green-6)] text-[var(--green-11)]'
    if (score >= 70) return 'bg-white border-[var(--yellow-6)] text-[var(--yellow-11)]'
    return 'bg-white border-[var(--red-6)] text-[var(--red-11)]'
  }

  const getDecisionTitle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Invoice Approved'
      case 'REJECTED':
        return 'Invoice Review Required'
      case 'PARTIAL':
        return 'Partial Approval'
      default:
        return 'Invoice Status Unknown'
    }
  }

  return (
    <Section title=''>
      <div className='flex flex-col gap-5'>
        {isLoading ? (
          <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* --- ROW 1: AI Decision Banner & Invoice Summary --- */}
            <div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
              {/* Decision Banner */}
              <div className='lg:col-span-2'>
                <AnimateSlideUp delay={0.1}>
                  <div
                    className={cn(
                      'relative h-full overflow-hidden rounded-lg border border-gray-2 bg-white shadow-sm border-l-4',
                      decisionTheme.bannerBorder,
                    )}
                  >
                    <div className='flex flex-col gap-4 p-5'>
                      {/* Header Row */}
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <Icon
                            className={cn('size-6', decisionTheme.iconColor)}
                            name={
                              statusAttr === 'APPROVED'
                                ? 'tabler:progress-check'
                                : statusAttr === 'REJECTED'
                                  ? 'tabler:robot'
                                  : 'tabler:alert-circle'
                            }
                          />
                          <div
                            className={cn(
                              'text-18 font-bold',
                              decisionTheme.titleColor,
                            )}
                          >
                            {getDecisionTitle(statusAttr)}
                          </div>
                        </div>

                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-full px-4 py-1.5 text-13 font-bold',
                            decisionTheme.badge,
                          )}
                        >
                          {data.score}% Confidence
                        </div>
                      </div>

                      {/* Body Row (Recommendation Box) */}
                      <div
                        className={cn('rounded-md border p-4', decisionTheme.box)}
                      >
                        <div className='flex gap-3'>
                          <Icon
                            className={cn(
                              'mt-0.5 size-5 shrink-0',
                              decisionTheme.iconColor,
                            )}
                            name='tabler:info-circle'
                          />
                          <div>
                            <div
                              className={cn(
                                'mb-1 text-12 font-bold uppercase tracking-wide',
                                decisionTheme.titleColor,
                              )}
                            >
                              AI Recommendation: {data.decision}
                            </div>
                            <div className='text-14 leading-relaxed text-gray-13'>
                              {data.reason}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimateSlideUp>
              </div>

              {/* Invoice Summary */}
              <div className='lg:col-span-1'>
                <AnimateSlideUp delay={0.2}>
                  <div className='group relative h-full overflow-hidden rounded-xl border border-gray-3 bg-white shadow-sm transition-all duration-300 hover:shadow-md'>
                    <div className='relative border-b border-gray-2 bg-gray-1 px-5 py-3'>
                      <div className='flex items-center gap-3'>
                        {/* Icon Container with specific styling */}
                        <div className='flex size-10 items-center justify-center rounded-lg border border-[var(--purple-4)] bg-[var(--purple-2)] text-[var(--purple-9)] shadow-sm'>
                          <Icon className='size-5' name='tabler:receipt-2' />
                        </div>
                        <div className='text-15 font-semibold text-gray-13'>
                          Invoice Summary
                        </div>
                      </div>
                    </div>

                    <div className='p-5'>
                      <div className='space-y-4'>
                        {invoiceHeader && (
                          <div className='flex flex-col gap-3'>
                            <div className='rounded-lg border border-gray-3 bg-gray-1/50 p-3'>
                              <div className='mb-1.5 flex items-center gap-1.5 text-11 font-medium text-gray-10'>
                                <Icon
                                  className='size-3.5 text-purple-11'
                                  name='tabler:building-store'
                                />
                                Supplier
                              </div>
                              <div className='text-14 font-semibold text-gray-13'>
                                {invoiceHeader['Supplier Name'] || 'N/A'}
                              </div>
                            </div>

                            <div className='rounded-lg border border-gray-3 bg-gray-1/50 p-3'>
                              <div className='mb-1.5 flex items-center gap-1.5 text-11 font-medium text-gray-10'>
                                <Icon
                                  className='size-3.5 text-blue-11'
                                  name='tabler:file-check'
                                />
                                PO Number
                              </div>
                              <div className='text-14 font-semibold text-gray-13'>
                                {invoiceHeader['PO Number'] || 'N/A'}
                              </div>
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                              <div className='rounded-lg border border-gray-3 bg-gray-1/50 p-3'>
                                <div className='mb-1.5 flex items-center gap-1.5 text-11 font-medium text-gray-10'>
                                  <Icon
                                    className='size-3.5 text-yellow-11'
                                    name='tabler:currency-dollar'
                                  />
                                  Currency
                                </div>
                                <div className='text-14 font-semibold text-gray-13'>
                                  {invoiceHeader.Currency || 'N/A'}
                                </div>
                              </div>

                              <div className='rounded-lg border-2 border-primary-3 bg-primary-1 p-3 shadow-sm'>
                                <div className='mb-1.5 flex items-center gap-1.5 text-11 font-medium text-primary-11'>
                                  <Icon
                                    className='size-3.5 text-primary-9'
                                    name='tabler:currency-dollar'
                                  />
                                  Total
                                </div>
                                <div className='text-16 font-bold text-primary-12'>
                                  {invoiceHeader['Total Due'] || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimateSlideUp>
              </div>
            </div>

            {/* --- ROW 2: Field Matching --- */}
            <AnimateSlideUp delay={0.3}>
              <div className='group relative h-full overflow-hidden rounded-xl border border-gray-3 bg-white shadow-sm transition-all duration-300 hover:shadow-md'>
                <div className='relative border-b border-gray-2 bg-gray-1 px-5 py-3'>
                  <div className='flex items-center gap-3'>
                    {/* Icon Container with specific styling */}
                    <div className='flex size-10 items-center justify-center rounded-lg border border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-9)] shadow-sm'>
                      <Icon className='size-5' name='tabler:file-check' />
                    </div>
                    <div className='text-15 font-semibold text-gray-13'>
                      Field Matching
                    </div>
                  </div>
                </div>

                <div className='p-5'>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
                    {fieldMatching.length > 0 ? (
                      fieldMatching.map((field, index) => {
                        const bandClass = getScoreBandClass(field.Score)
                        return (
                          <div
                            key={index}
                            className='relative overflow-hidden rounded-lg border border-gray-3 bg-white p-3 transition-all duration-200 hover:border-gray-4 hover:shadow-sm'
                          >
                            <div className='mb-3 flex items-center justify-between'>
                              <div className='text-13 font-bold text-gray-12'>
                                {field.Field}
                              </div>
                              <div
                                className={cn(
                                  'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-11 font-bold',
                                  bandClass,
                                )}
                              >
                                {field.Score}%
                              </div>
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                              <div className='rounded-md bg-gray-1/50 p-2'>
                                <div className='mb-1 text-10 font-medium uppercase tracking-wide text-gray-9'>
                                  Invoice
                                </div>
                                <div className='text-13 font-semibold text-gray-13 break-words'>
                                  {String(field['Invoice Value'])}
                                </div>
                              </div>
                              <div className='rounded-md bg-gray-1/50 p-2'>
                                <div className='mb-1 text-10 font-medium uppercase tracking-wide text-gray-9'>
                                  PO
                                </div>
                                <div className='text-13 font-semibold text-gray-13 break-words'>
                                  {String(field['PO Value'])}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className='col-span-full rounded-lg border border-gray-3 bg-gray-1 p-4 text-center text-13 text-gray-10'>
                        No field matching data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AnimateSlideUp>

            {/* --- ROW 3: Line Items --- */}
            <AnimateSlideUp delay={0.4}>
              <div className='group relative overflow-hidden rounded-xl border border-gray-3 bg-white shadow-sm'>
                <div className='relative border-b border-gray-2 bg-gray-1 px-5 py-3'>
                  <div className='flex items-center gap-3'>
                    {/* Icon Container with specific styling */}
                    <div className='flex size-10 items-center justify-center rounded-lg border border-[var(--teal-4)] bg-[var(--teal-2)] text-[var(--teal-9)] shadow-sm'>
                      <Icon className='size-5' name='tabler:list-check' />
                    </div>
                    <div className='text-15 font-semibold text-gray-13'>
                      Line Items
                    </div>
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  {lineItemMatching.length > 0 ? (
                    <table className='w-full text-left text-13'>
                      <thead>
                        <tr className='border-b border-gray-2 bg-gray-1/30 text-11 font-bold uppercase tracking-wider text-gray-9'>
                          <th className='px-6 py-3'>Description</th>
                          <th className='px-6 py-3'>Qty</th>
                          <th className='px-6 py-3'>Unit Price</th>
                          <th className='px-6 py-3'>Total</th>
                          <th className='px-6 py-3 text-right'>Match Status</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-2'>
                        {lineItemMatching.map((item, index) => {
                          const score = item['Line Score']
                          const isMatch = score >= 90
                          const isMismatch = score < 90

                          return (
                            <tr
                              key={index}
                              className='group transition-colors hover:bg-gray-1/40'
                            >
                              <td className='px-6 py-4 align-top'>
                                <div className='font-semibold text-gray-13'>
                                  {item.Description['Invoice Value']}
                                </div>
                                {isMismatch && (
                                  <div className='mt-1 text-12 font-medium text-orange-11'>
                                    PO Match: {item.Description['PO Value']}
                                  </div>
                                )}
                              </td>
                              <td className='px-6 py-4 align-top text-gray-12'>
                                {item.Quantity['Invoice Value']}
                              </td>
                              <td className='px-6 py-4 align-top text-gray-12'>
                                {item.Price['Invoice Value']}
                              </td>
                              <td className='px-6 py-4 align-top font-bold text-gray-13'>
                                {item.Amount['Invoice Value']}
                              </td>
                              <td className='px-6 py-4 align-top text-right'>
                                <div
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-12 font-bold',
                                    isMatch
                                      ? 'border-green-3 bg-green-1 text-green-11'
                                      : 'border-red-3 bg-red-1 text-red-11',
                                  )}
                                >
                                  <Icon
                                    className='size-3.5'
                                    name={
                                      isMatch
                                        ? 'tabler:check'
                                        : 'tabler:alert-circle'
                                    }
                                  />
                                  {isMatch ? 'Match' : 'Mismatch'}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className='p-8 text-center text-gray-10'>
                      No line items found.
                    </div>
                  )}
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