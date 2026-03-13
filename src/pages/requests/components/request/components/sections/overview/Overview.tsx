import { useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { AnimateSlideUp } from '@/components/common/animations'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import { SkeletonCard } from '@/components/common/skeletons'
import { useAttachments } from '@/pages/requests/hooks/useAttachments'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import Attachments from '../attachment/Attachments'
import Comments from '../comment/Comments'
import History from '../history/History'

// --- Types ---
// type RightViewMode = 'analysis' | 'comments' | 'attachments';

interface AgentData {
  'decision': string
  'reason': string
  'score': number
  'backorder'?: BackorderData
  'debug'?: DebugData
  'Extracted Invoice JSON'?: ExtractedInvoice
  'invoice_errors'?: InvoiceErrors
  'po_row'?: {
    'Currency'?: string
    'PO Amount': string
    'PO Number': string
    'Vendor Name': string
  }
  'reqNo'?: string
}

interface BackorderData {
  detected: boolean
  missing_qty_by_item?: BackorderItem[]
  recommendation?: BackorderRecommendation
}

interface BackorderItem {
  invoice_qty: number | null
  po_qty: number
  remaining: number
  amount?: number
  description?: string
  po_line_id?: string
  price?: number
  reason?: BackorderReason
}

type BackorderReason = string

type BackorderRecommendation = string

interface DebugData {
  'Side-by-side Field Matching'?: FieldMatch[]
  'Side-by-side Line Item matching'?: LineItemMatch[]
}

interface ExtractedInvoice {
  invoice_header?: InvoiceHeader
  line_items?: Array<{
    amount: number
    description: string
    line_no: number
    price: number
    quantity: string
  }>
}

interface FieldMatch {
  'Field': string
  'Invoice Value': string | number
  'PO Value': string | number
  'Score': number
}
/** invoice_errors can come as strings OR objects (your runtime error shows objects). */
type InvoiceErrorItem =
  | string
  | {
      code?: string
      detail?: any
      field?: string
      message?: string
    }
  | Record<string, any>

interface InvoiceErrors {
  errors: InvoiceErrorItem[]
  severity?: string
}

interface InvoiceHeader {
  'Currency'?: string
  'PO Number'?: string
  'Supplier Name'?: string
  'Total Due'?: string | number
}

interface LineItemMatch {
  'Amount': { 'Invoice Value': number; 'PO Value': number; 'Score': number }
  'Description': {
    'Invoice Value': string
    'PO Value': string
    'Score': number
  }
  'Line Score': number
  'Price': { 'Invoice Value': number; 'PO Value': number; 'Score': number }
  'Quantity': { 'Invoice Value': number; 'PO Value': number; 'Score': number }
}

const Overview = ({
  agentData,
  processId,
  repositoryId,
  // rawWorkflowData,
  rightView,
  selectedItem,
  transactionId,
  workflowId,
  setRightView,
}: any) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const defaultAgentData: AgentData = {
    'debug': {
      'Side-by-side Field Matching': [
        {
          'Field': 'Supplier Name',
          'Invoice Value': 'Silverline Auto Parts',
          'PO Value': 'Silverline Auto Parts',
          'Score': 100,
        },
        {
          'Field': 'PO Number',
          'Invoice Value': 'PO-1007',
          'PO Value': 'PO-1007',
          'Score': 100,
        },
        {
          'Field': 'Total Due',
          'Invoice Value': 813.6,
          'PO Value': 813.6,
          'Score': 100,
        },
      ],
      'Side-by-side Line Item matching': [
        {
          'Amount': { 'Invoice Value': 106.0, 'PO Value': 106.0, 'Score': 100 },
          'Description': {
            'Invoice Value': 'Mouse',
            'PO Value': 'Logitech Mouse',
            'Score': 40,
          },
          'Line Score': 60,
          'Price': { 'Invoice Value': 106.0, 'PO Value': 106.0, 'Score': 100 },
          'Quantity': { 'Invoice Value': 1, 'PO Value': 1, 'Score': 100 },
        },
        {
          'Amount': { 'Invoice Value': 612.0, 'PO Value': 612.0, 'Score': 100 },
          'Description': {
            'Invoice Value': 'Keyboard',
            'PO Value': 'Keyboard Mech',
            'Score': 85,
          },
          'Line Score': 90,
          'Price': { 'Invoice Value': 102.0, 'PO Value': 102.0, 'Score': 100 },
          'Quantity': { 'Invoice Value': 6, 'PO Value': 6, 'Score': 100 },
        },
        {
          'Amount': { 'Invoice Value': 388.0, 'PO Value': 388.0, 'Score': 100 },
          'Description': {
            'Invoice Value': 'Printer',
            'PO Value': 'Printer',
            'Score': 100,
          },
          'Line Score': 100,
          'Price': { 'Invoice Value': 97.0, 'PO Value': 97.0, 'Score': 100 },
          'Quantity': { 'Invoice Value': 4, 'PO Value': 4, 'Score': 100 },
        },
      ],
    },
    'decision': 'APPROVED',
    'Extracted Invoice JSON': {
      invoice_header: {
        'Currency': 'USD',
        'PO Number': 'PO-1007',
        'Supplier Name': 'Silverline Auto Parts',
        'Total Due': '1106.00',
      },
      line_items: [],
    },
    'reason':
      'The invoice from Silverline Auto Parts matches the PO exactly. All line items and totals are verified against the master record.',
    'reqNo': 'REQ-75',
    'score': 94,
  }

  // State for Right View Mode and Selected File
  // const [rightView, setRightView] = useState<RightViewMode>('analysis'); // Now props
  const [selectedFile, setSelectedFile] = useState<any>(null) // Use appropriate type
  const [isFileLoading, setIsFileLoading] = useState(false)

  // Fetch attachments to set default
  const { data: attachmentData } = useAttachments(workflowId, processId, true)

  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId
  const userId = session?.id

  // Set default file when attachments load
  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData[0])
    }
  }, [attachmentData])

  const data: AgentData = agentData || defaultAgentData

  const fieldMatching = data.debug?.['Side-by-side Field Matching'] || []
  const lineItemMatching = data.debug?.['Side-by-side Line Item matching'] || []
  const invoiceHeader = data['Extracted Invoice JSON']?.invoice_header as any

  // -----------------------------
  // NEW: Invoice Errors + Backorder
  // -----------------------------
  const invoiceErrors = data.invoice_errors
  const backorder = data.backorder

  const hasInvoiceErrors =
    !!invoiceErrors &&
    Array.isArray(invoiceErrors.errors) &&
    invoiceErrors.errors.length > 0

  const hasBackorder =
    !!backorder &&
    backorder.detected === true &&
    Array.isArray(backorder.missing_qty_by_item) &&
    backorder.missing_qty_by_item.length > 0

  /** Prevent "Objects are not valid as a React child" by normalizing to displayable strings. */
  const formatInvoiceError = (
    err: InvoiceErrorItem,
  ): { subtitle?: string; title: string } => {
    if (typeof err === 'string') return { title: err }

    // If it's an object, pick meaningful fields.
    const e: any = err || {}
    const code = e.code ? String(e.code) : ''
    const field = e.field ? String(e.field) : ''
    const message = e.message ? String(e.message) : ''
    const detail = e.detail

    // Try to build a clean, human readable line.
    const titleParts = [code && `(${code})`, field && field, message].filter(
      Boolean,
    )
    const title = titleParts.length ? titleParts.join(' ') : 'Validation issue'

    let subtitle: string | undefined
    if (detail != null) {
      if (typeof detail === 'string') subtitle = detail
      else {
        try {
          subtitle = JSON.stringify(detail)
        } catch {
          subtitle = String(detail)
        }
      }
    }

    // fallback: stringify whole object if still empty
    if (!titleParts.length && !subtitle) {
      try {
        subtitle = JSON.stringify(e)
      } catch {
        subtitle = String(e)
      }
    }

    return { subtitle, title }
  }

  const getSeverityMeta = (severity?: string) => {
    const s = (severity || '').toUpperCase()
    if (s.includes('HIGH') || s.includes('CRITICAL')) {
      return {
        chip: 'border-[var(--red-4)] bg-[var(--red-1)] text-[var(--red-11)]',
        icon: 'tabler:alert-octagon-filled',
        iconWrap: 'bg-[var(--red-2)] text-[var(--red-9)]',
        label: 'High severity',
      }
    }
    if (s.includes('MED')) {
      return {
        chip: 'border-[var(--yellow-4)] bg-[var(--yellow-1)] text-[var(--yellow-11)]',
        icon: 'tabler:alert-circle-filled',
        iconWrap: 'bg-[var(--yellow-2)] text-[var(--yellow-9)]',
        label: 'Medium severity',
      }
    }
    return {
      chip: 'border-[var(--gray-4)] bg-[var(--gray-1)] text-[var(--gray-11)]',
      icon: 'tabler:info-circle',
      iconWrap: 'bg-[var(--gray-2)] text-[var(--gray-9)]',
      label: 'Low severity',
    }
  }

  const getRecommendationMeta = (rec?: string) => {
    const r = (rec || '').toUpperCase()
    if (r.includes('WAIT')) {
      return {
        chip: 'border-[var(--blue-4)] bg-[var(--blue-1)] text-[var(--blue-11)]',
        icon: 'tabler:hourglass',
        label: 'Wait for balance',
      }
    }
    if (r.includes('CONTACT')) {
      return {
        chip: 'border-[var(--purple-4)] bg-[var(--purple-1)] text-[var(--purple-11)]',
        icon: 'tabler:message-circle-2',
        label: 'Contact vendor',
      }
    }
    if (r.includes('CANCEL')) {
      return {
        chip: 'border-[var(--red-4)] bg-[var(--red-1)] text-[var(--red-11)]',
        icon: 'tabler:ban',
        label: 'Cancel remaining',
      }
    }
    return {
      chip: 'border-[var(--gray-4)] bg-[var(--gray-1)] text-[var(--gray-11)]',
      icon: 'tabler:settings',
      label: rec || 'Recommendation',
    }
  }

  // -----------------------------
  // Existing banner helpers
  // -----------------------------
  const getStatusAttr = (decision: string) => {
    const d = decision?.toUpperCase() || ''
    if (d.includes('PARTIAL')) return 'PARTIAL'
    if (d === 'APPROVED') return 'APPROVED'
    if (d === 'REJECTED' || d === 'DECLINED') return 'REJECTED'
    return 'DEFAULT'
  }

  const statusAttr = getStatusAttr(data.decision)

  const getDecisionThemeClasses = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          badge: 'bg-[var(--green-3)] text-[var(--green-11)]',
          bannerBorder: 'border-l-[var(--green-9)]',
          box: 'bg-[var(--green-2)] border-[var(--green-4)]',
          iconColor: 'text-[var(--green-9)]',
          titleColor: 'text-[var(--green-11)]',
        }
      case 'REJECTED':
        return {
          badge: 'bg-[var(--red-3)] text-[var(--red-11)]',
          bannerBorder: 'border-l-[var(--red-9)]',
          box: 'bg-[var(--red-2)] border-[var(--red-4)]',
          iconColor: 'text-[var(--red-9)]',
          titleColor: 'text-[var(--red-11)]',
        }
      case 'PARTIAL':
        return {
          badge: 'bg-[var(--yellow-3)] text-[var(--yellow-11)]',
          bannerBorder: 'border-l-[var(--yellow-9)]',
          box: 'bg-[var(--yellow-2)] border-[var(--yellow-4)]',
          iconColor: 'text-[var(--yellow-9)]',
          titleColor: 'text-[var(--yellow-11)]',
        }
      default:
        return {
          badge: 'bg-[var(--gray-3)] text-[var(--gray-11)]',
          bannerBorder: 'border-l-[var(--gray-9)]',
          box: 'bg-[var(--gray-1)] border-[var(--gray-3)]',
          iconColor: 'text-[var(--gray-9)]',
          titleColor: 'text-[var(--gray-11)]',
        }
    }
  }

  const decisionTheme = getDecisionThemeClasses(statusAttr)

  const getBannerConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          badgeBg: 'bg-[var(--purple-3)]',
          badgeColor: 'text-[var(--purple-11)]',
          badgeText: 'Auto-verified',
          colorVar: 'green',
          icon: 'tabler:circle-check',
          nextAction: 'Schedule Payment',
          nextActionDate: 'Feb 12',
          nextActionIcon: 'tabler:calendar-dollar',
          progressColor: 'bg-[var(--green-9)]',
          statusTitle: 'Ready for Approval',
        }
      case 'REJECTED':
        return {
          badgeBg: 'bg-[var(--red-3)]',
          badgeColor: 'text-[var(--red-11)]',
          badgeText: 'Flagged',
          colorVar: 'red',
          icon: 'tabler:alert-octagon',
          nextAction: 'Review Invoice',
          nextActionDate: 'Urgent',
          nextActionIcon: 'tabler:alert-triangle',
          progressColor: 'bg-[var(--red-9)]',
          statusTitle: 'Rejected',
        }
      case 'PARTIAL':
        return {
          badgeBg: 'bg-[var(--yellow-3)]',
          badgeColor: 'text-[var(--yellow-11)]',
          badgeText: 'Manual Check',
          colorVar: 'yellow',
          icon: 'tabler:alert-circle',
          nextAction: 'Verify Line Items',
          nextActionDate: 'Net 30',
          nextActionIcon: 'tabler:list-search',
          progressColor: 'bg-[var(--yellow-9)]',
          statusTitle: 'Partial Match',
        }
      default:
        return {
          badgeBg: 'bg-[var(--gray-3)]',
          badgeColor: 'text-[var(--gray-11)]',
          badgeText: 'Analyzing',
          colorVar: 'gray',
          icon: 'tabler:loader',
          nextAction: 'Wait for Agent',
          nextActionDate: '-',
          nextActionIcon: 'tabler:clock',
          progressColor: 'bg-[var(--gray-9)]',
          statusTitle: 'Processing',
        }
    }
  }

  const banner = getBannerConfig(statusAttr)

  return (
    <>
      <div className='flex h-full flex-col gap-3 overflow-hidden p-0'>
        {isLoading ? (
          <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4'>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* TOP STAT / DECISION BANNER */}
            <div className='mt-2 w-full'>
              <AnimateSlideUp delay={0.25}>
                <div className='w-full rounded-xl border border-[var(--gray-3)] bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md'>
                  <div className='flex w-full items-center gap-6'>
                    {/* LEFT: Status & Score */}
                    <div className='flex min-w-[180px] shrink-0 items-center gap-4'>
                      <div
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full',
                          statusAttr === 'APPROVED'
                            ? 'bg-[var(--green-3)]'
                            : statusAttr === 'REJECTED'
                              ? 'bg-[var(--red-3)]'
                              : statusAttr === 'PARTIAL'
                                ? 'bg-[var(--yellow-3)]'
                                : 'animate-spin bg-[var(--gray-3)]',
                        )}
                      >
                        <Icon
                          className={cn('size-6', decisionTheme.iconColor)}
                          name={
                            statusAttr === 'APPROVED'
                              ? 'tabler:shield-check-filled'
                              : statusAttr === 'REJECTED'
                                ? 'tabler:alert-octagon-filled'
                                : statusAttr === 'PARTIAL'
                                  ? 'tabler:alert-circle-filled'
                                  : 'tabler:loader'
                          }
                        />
                      </div>

                      <div className='flex w-full flex-col justify-center'>
                        <div
                          className={cn(
                            'text-[15px] leading-tight font-bold',
                            decisionTheme.titleColor,
                          )}
                        >
                          {banner.statusTitle}
                        </div>

                        <div className='mt-1.5 flex items-center gap-3'>
                          <div className='relative h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-[var(--gray-2)]'>
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500 ease-out',
                                statusAttr === 'APPROVED'
                                  ? 'bg-[var(--green-9)]'
                                  : statusAttr === 'REJECTED'
                                    ? 'bg-[var(--red-9)]'
                                    : statusAttr === 'PARTIAL'
                                      ? 'bg-[var(--yellow-9)]'
                                      : 'bg-[var(--gray-9)]',
                              )}
                              style={{
                                width: `${Math.min(100, Math.max(0, Number(data.score) || 0))}%`,
                              }}
                            />
                          </div>
                          <span className='text-[12px] font-bold whitespace-nowrap text-[var(--gray-11)]'>
                            {data.score}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE: AI Analysis */}
                    <div className='min-w-0 flex-1 py-1'>
                      <div className='flex h-full items-start gap-3'>
                        <div className='w-2 self-stretch rounded-full bg-[#8B5CF6] opacity-30' />
                        <div className='flex min-w-0 flex-col gap-1'>
                          <div className='flex items-center gap-2'>
                            <Icon
                              className='size-3.5 text-[#8B5CF6]'
                              name='tabler:sparkles'
                            />
                            <span className='text-[11px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                              Analysis
                            </span>
                            {banner.badgeText && (
                              <span className='rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]'>
                                {banner.badgeText}
                              </span>
                            )}
                          </div>

                          <p className='line-clamp-3 text-[13px] leading-relaxed text-[var(--gray-11)] transition-all hover:line-clamp-none'>
                            {data.reason}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DIVIDER */}
                    <div className='h-12 w-px shrink-0 bg-[var(--gray-3)]' />

                    {/* RIGHT: Next Action */}
                    <div className='flex shrink-0 items-center justify-end gap-5'>
                      <div className='flex flex-col items-end text-right'>
                        <span className='mb-0.5 text-[10px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                          Next Action
                        </span>
                        <span className='text-[14px] font-bold text-[var(--gray-12)]'>
                          {banner.nextAction}
                        </span>
                      </div>

                      <div className='flex min-w-[160px] items-center gap-3 rounded-lg border border-[var(--gray-3)] bg-white px-3 py-2 shadow-sm'>
                        <div className='flex size-9 shrink-0 items-center justify-center rounded-md bg-[#FFEDD5]/50 text-[#F97316]'>
                          <Icon className='size-5' name='tabler:calendar' />
                        </div>

                        <div className='flex flex-col justify-center'>
                          <div className='mb-1 flex items-center gap-1.5 leading-none'>
                            <span className='text-[13px] font-bold whitespace-nowrap text-[var(--gray-12)]'>
                              Due {banner.nextActionDate}
                            </span>
                            <div className='size-1.5 rounded-full bg-[#F97316]' />
                          </div>

                          <div className='flex items-center gap-1 leading-none'>
                            <Icon
                              className='size-3 text-[var(--gray-8)]'
                              name='tabler:clock'
                            />
                            <span className='text-[11px] font-medium whitespace-nowrap text-[var(--gray-9)]'>
                              Net 30 Days
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateSlideUp>
            </div>

            {/* SPLIT VIEW */}
            <div className='flex h-full flex-1 gap-4 overflow-hidden'>
              {/* Left Column: File Viewer (replaces Attachments) */}
              <div
                className={cn(
                  'group/viewer relative h-full overflow-hidden rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] transition-all duration-300',
                  rightView === 'analysis' ? 'w-1/2' : 'w-[40%]',
                )}
              >
                {selectedFile ? (
                  <div className='absolute inset-0'>
                    <FileSheet
                      actions=''
                      customLoading={isFileLoading}
                      file={selectedFile}
                      opened={true}
                      processId={processId}
                      tenantId={tenantId}
                      type={2}
                      userId={userId}
                      workflowId={workflowId}
                      onClose={() => {}} // Viewer is always open in this layout
                      // Adjusting FileSheet style to fit container if needed, assuming it fits parent
                    />
                  </div>
                ) : (
                  <div className='flex h-full flex-col items-center justify-center gap-3 text-center'>
                    <div className='flex size-12 items-center justify-center rounded-full bg-[var(--gray-2)]'>
                      <Icon
                        className='size-6 text-[var(--gray-8)]'
                        name='tabler:file-off'
                      />
                    </div>
                    <p className='text-13 font-medium text-[var(--gray-10)]'>
                      No document selected
                    </p>
                  </div>
                )}
              </div>

              {/* Middle Column: Analysis Data (Always Visible, resizeable) */}
              <div
                className={cn(
                  'relative h-full overflow-hidden rounded-lg transition-all duration-300',
                  rightView === 'analysis' ? 'w-1/2' : 'w-[30%]',
                )}
              >
                {/* Floating Action Buttons (Overlay) - Removed as moved to Header */}

                {/* --- ANALYSIS CONTENT --- */}
                <div className='scrollbar-thin h-full space-y-3 overflow-y-auto pr-1 pb-10'>
                  {/* Invoice Summary */}
                  <AnimateSlideUp delay={0.4}>
                    <div className='flex flex-col gap-2'>
                      <div className='pl-1 text-[11px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                        Invoice Summary
                      </div>

                      <div
                        className='rounded-xl border border-[var(--gray-4)] bg-white p-4 shadow-sm'
                        id='section-summary'
                      >
                        {invoiceHeader && (
                          <div className='grid grid-cols-2 gap-x-4 gap-y-5'>
                            <div className='flex items-center gap-3'>
                              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--purple-1)] text-[var(--purple-9)]'>
                                <Icon
                                  className='size-5'
                                  name='tabler:building-skyscraper'
                                />
                              </div>
                              <div className='flex flex-col overflow-hidden'>
                                <span className='text-[11px] font-medium text-[var(--gray-9)]'>
                                  Supplier
                                </span>
                                <span className='line-clamp-1 text-13 font-bold text-[var(--gray-12)] transition-all hover:line-clamp-none'>
                                  {invoiceHeader['Supplier Name'] || '-'}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center gap-3'>
                              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-1)] text-[var(--blue-9)]'>
                                <Icon
                                  className='size-5'
                                  name='tabler:file-text'
                                />
                              </div>
                              <div className='flex flex-col overflow-hidden'>
                                <span className='text-[11px] font-medium text-[var(--gray-9)]'>
                                  PO Number
                                </span>
                                <span className='line-clamp-1 text-13 font-bold text-[var(--gray-12)] transition-all hover:line-clamp-none'>
                                  {invoiceHeader['PO Number'] || '-'}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center gap-3'>
                              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--orange-1)] text-[var(--orange-9)]'>
                                <Icon className='size-5' name='tabler:coins' />
                              </div>
                              <div className='flex flex-col overflow-hidden'>
                                <span className='text-[11px] font-medium text-[var(--gray-9)]'>
                                  Currency
                                </span>
                                <span className='line-clamp-1 text-13 font-bold text-[var(--gray-12)] transition-all hover:line-clamp-none'>
                                  {invoiceHeader['Currency'] || 'USD'}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center gap-3'>
                              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--green-1)] text-[var(--green-9)]'>
                                <Icon
                                  className='size-5'
                                  name='tabler:currency-dollar'
                                />
                              </div>
                              <div className='flex flex-col overflow-hidden'>
                                <span className='text-[11px] font-medium text-[var(--gray-9)]'>
                                  Total Due
                                </span>
                                <span className='line-clamp-1 text-13 font-bold text-[var(--green-10)] transition-all hover:line-clamp-none'>
                                  {invoiceHeader['Total Due'] ?? '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </AnimateSlideUp>

                  {/* Field Matching */}
                  <AnimateSlideUp delay={0.3}>
                    <div className='mt-6 flex flex-col gap-2'>
                      <div className='pl-1 text-[11px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                        Field Matching
                      </div>

                      <div
                        className={cn(
                          'grid gap-3 transition-all',
                          rightView === 'analysis'
                            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2'
                            : 'grid-cols-1',
                        )}
                      >
                        {fieldMatching.length > 0 ? (
                          fieldMatching.map((field, index) => {
                            const displayInvoice = field['Invoice Value'] || '-'
                            const displayPO = field['PO Value'] || '-'
                            const isPerfect = field.Score === 100

                            return (
                              <div
                                className='flex flex-col gap-3 rounded-xl border border-[var(--gray-3)] bg-white p-3 shadow-sm'
                                key={index}
                              >
                                <div className='flex items-center justify-between'>
                                  <span
                                    className='line-clamp-1 text-13 font-bold text-[var(--gray-12)] transition-all hover:line-clamp-none'
                                    title={field.Field}
                                  >
                                    {field.Field}
                                  </span>

                                  <div
                                    className={cn(
                                      'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                                      isPerfect
                                        ? 'border-[var(--green-4)] bg-[var(--green-1)] text-[var(--green-9)]'
                                        : 'border-[var(--orange-4)] bg-[var(--orange-1)] text-[var(--orange-9)]',
                                    )}
                                  >
                                    {isPerfect && (
                                      <Icon
                                        className='size-3'
                                        name='tabler:check'
                                      />
                                    )}
                                    {field.Score}%
                                  </div>
                                </div>

                                <div className='grid h-full grid-cols-2 gap-2'>
                                  <div className='flex flex-col justify-center rounded-lg border border-transparent bg-[var(--gray-1)] px-2.5 py-2'>
                                    <div className='mb-0.5 text-[9px] font-medium tracking-wide text-[var(--gray-8)] uppercase'>
                                      Extracted
                                    </div>
                                    <div
                                      className='line-clamp-2 text-12 leading-tight font-semibold break-all text-[var(--gray-12)] transition-all hover:line-clamp-none'
                                      title={String(displayInvoice)}
                                    >
                                      {displayInvoice}
                                    </div>
                                  </div>

                                  <div className='flex flex-col justify-center rounded-lg border border-transparent bg-[var(--gray-1)] px-2.5 py-2'>
                                    <div className='mb-0.5 text-[9px] font-medium tracking-wide text-[var(--gray-8)] uppercase'>
                                      PO Value
                                    </div>
                                    <div
                                      className='line-clamp-2 text-12 leading-tight font-semibold break-all text-[var(--gray-12)] transition-all hover:line-clamp-none'
                                      title={String(displayPO)}
                                    >
                                      {displayPO}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className='col-span-full rounded-xl border border-[var(--gray-3)] bg-white p-4 text-center text-12 text-[var(--gray-8)] italic'>
                            No fields matched.
                          </div>
                        )}
                      </div>
                    </div>
                  </AnimateSlideUp>

                  {/* Line Items */}
                  <AnimateSlideUp delay={0.35}>
                    <div className='mt-6 flex flex-col gap-2'>
                      <div className='pl-1 text-[11px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                        Line Items
                      </div>

                      <div
                        className='overflow-hidden rounded-xl border border-[var(--gray-4)] bg-white shadow-sm'
                        id='section-line-items'
                      >
                        <div className='overflow-x-auto'>
                          {lineItemMatching.length > 0 ? (
                            <div className='min-w-[600px]'>
                              <div className='grid grid-cols-[2fr_0.8fr_0.8fr_1fr_1fr] border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-2 text-[10px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                                <div>Description</div>
                                <div>Qty</div>
                                <div>Price</div>
                                <div>Total</div>
                                <div className='text-right'>Match Status</div>
                              </div>

                              <div className='divide-y divide-[var(--gray-2)]'>
                                {lineItemMatching.map((item, index) => {
                                  const isMatch = item['Line Score'] >= 90

                                  const renderCell = (
                                    actual: any,
                                    expected: any,
                                  ) => {
                                    const displayActual = actual || '-'
                                    const showExpected = !isMatch && expected

                                    return (
                                      <div className='flex flex-col leading-tight'>
                                        <span
                                          className={cn(
                                            'line-clamp-1 text-11 font-medium transition-all hover:line-clamp-none',
                                            !actual &&
                                              'text-[var(--gray-8)] italic',
                                          )}
                                        >
                                          {displayActual}
                                        </span>
                                        {showExpected && (
                                          <span className='mt-0.5 w-fit truncate rounded bg-[var(--orange-1)] px-1 py-px text-[9px] font-bold text-[var(--orange-9)]'>
                                            Exp: {expected}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  }

                                  return (
                                    <div
                                      className='group grid grid-cols-[2fr_0.8fr_0.8fr_1fr_1fr] items-center px-4 py-2.5 transition-colors hover:bg-[var(--gray-1)]'
                                      key={index}
                                    >
                                      <div className='pr-4 text-[var(--gray-12)]'>
                                        {renderCell(
                                          item.Description['Invoice Value'],
                                          item.Description['PO Value'],
                                        )}
                                      </div>

                                      <div className='text-[var(--gray-11)]'>
                                        {renderCell(
                                          item.Quantity['Invoice Value'],
                                          item.Quantity['PO Value'],
                                        )}
                                      </div>

                                      <div className='text-[var(--gray-11)]'>
                                        {renderCell(
                                          item.Price['Invoice Value'],
                                          item.Price['PO Value'],
                                        )}
                                      </div>

                                      <div className='font-bold text-[var(--teal-9)]'>
                                        {renderCell(
                                          item.Amount['Invoice Value'],
                                          item.Amount['PO Value'],
                                        )}
                                      </div>

                                      <div className='text-right'>
                                        <span
                                          className={cn(
                                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold',
                                            isMatch
                                              ? 'border-[var(--green-2)] bg-[var(--green-1)] text-[var(--green-9)]'
                                              : 'border-[var(--red-2)] bg-[var(--red-1)] text-[var(--red-9)]',
                                          )}
                                        >
                                          {isMatch ? 'MATCH' : 'DIFF'}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className='flex flex-col items-center justify-center p-6 text-[var(--gray-8)]'>
                              <span className='text-11 font-medium opacity-70'>
                                No line items found.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </AnimateSlideUp>

                  {/* NEW: Invoice Errors + Backorder (Must be above History & Comments) */}
                  <div className='grid grid-cols-1 gap-2'>
                    {hasInvoiceErrors && (
                      <AnimateSlideUp delay={0.36}>
                        <div className='mt-3 ml-1 flex flex-col gap-3'>
                          {/* Header with severity badge */}
                          <div className='flex items-center justify-between pl-1'>
                            <div className='flex items-center gap-2'>
                              {/* <Icon
                                name="tabler:alert-triangle-filled"
                                className="size-4 text-[var(--red-9)]"
                              /> */}
                              <div className='text-[11px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                                Invoice Errors
                              </div>
                            </div>

                            {/* {(() => {
                              const meta = getSeverityMeta(invoiceErrors?.severity);
                              return (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold shadow-sm',
                                    meta.chip
                                  )}
                                >
                                  <Icon name={meta.icon} className="size-3.5" />
                                  {meta.label}
                                </span>
                              );
                            })()} */}
                          </div>

                          {/* Main error card with gradient */}
                          <div className='relative overflow-hidden rounded-xl to-white p-5 shadow-sm'>
                            {/* Decorative background pattern */}
                            <div className='absolute inset-0 opacity-5'>
                              <div className='absolute top-0 right-0 h-32 w-32 rounded-full bg-[var(--red-9)] blur-3xl' />
                              <div className='absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[var(--red-9)] blur-2xl' />
                            </div>

                            <div className='relative flex items-start gap-4'>
                              {/* Icon section */}

                              {/* Content section */}
                              <div className='min-w-0 flex-1'>
                                {/* Title and count */}
                                <div className='mb-3 flex items-center justify-between gap-3'>
                                  <div className='flex flex-row items-center gap-4'>
                                    {(() => {
                                      const meta = getSeverityMeta(
                                        invoiceErrors?.severity,
                                      )
                                      return (
                                        <div
                                          className={cn(
                                            'flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-sm',
                                            meta.iconWrap,
                                            'border-[var(--red-4)]',
                                          )}
                                        >
                                          <Icon
                                            className='size-5'
                                            name={meta.icon}
                                          />
                                        </div>
                                      )
                                    })()}
                                    <h4 className='mb-0.5 text-14 font-bold text-[var(--red-11)]'>
                                      Validation Issues Detected
                                      <p className='text-11 font-medium text-[var(--gray-10)]'>
                                        The following issues require attention
                                        before processing
                                      </p>
                                    </h4>
                                  </div>
                                  <div className='flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--red-3)] bg-white px-3 py-1.5 shadow-sm'>
                                    <Icon
                                      className='size-4 text-[var(--red-9)]'
                                      name='tabler:alert-circle'
                                    />
                                    <span className='text-12 font-bold text-[var(--red-11)]'>
                                      {invoiceErrors?.errors?.length}{' '}
                                      {invoiceErrors?.errors?.length === 1
                                        ? 'Issue'
                                        : 'Issues'}
                                    </span>
                                  </div>
                                </div>

                                {/* Error list */}
                                <div className='mt-3 grid grid-cols-1 gap-2.5'>
                                  {invoiceErrors!.errors
                                    .slice(0, 6)
                                    .map((err, idx) => {
                                      const formatted = formatInvoiceError(err)
                                      return (
                                        <div
                                          className='group flex items-start gap-3 rounded-lg border border-[var(--red-3)] bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--red-5)] hover:shadow-md'
                                          key={idx}
                                        >
                                          {/* Error number badge */}
                                          <div className='flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--red-2)] text-[10px] font-bold text-[var(--red-10)] ring-2 ring-white'>
                                            {idx + 1}
                                          </div>

                                          {/* Error content */}
                                          <div className='min-w-0 flex-1'>
                                            <p className='text-12 leading-relaxed font-semibold break-words text-[var(--gray-13)]'>
                                              {formatted.title}
                                            </p>
                                            {formatted.subtitle && (
                                              <p className='mt-1 line-clamp-2 text-[11px] font-medium break-words text-[var(--gray-9)] transition-all group-hover:line-clamp-none'>
                                                {formatted.subtitle}
                                              </p>
                                            )}
                                          </div>

                                          {/* Status indicator */}
                                          <div className='flex shrink-0 items-center'>
                                            <div className='size-2 animate-pulse rounded-full bg-[var(--red-9)]' />
                                          </div>
                                        </div>
                                      )
                                    })}

                                  {/* Show more indicator */}
                                  {invoiceErrors!.errors.length > 6 && (
                                    <div className='flex items-center gap-2 rounded-lg border border-[var(--red-3)] bg-[var(--red-1)] px-4 py-2'>
                                      <Icon
                                        className='size-4 text-[var(--red-9)]'
                                        name='tabler:dots'
                                      />
                                      <span className='text-11 font-semibold text-[var(--red-10)]'>
                                        +{invoiceErrors!.errors.length - 6} more
                                        issue
                                        {invoiceErrors!.errors.length - 6 !== 1
                                          ? 's'
                                          : ''}{' '}
                                        detected
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Action footer */}
                                {/* <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[var(--red-3)]">
                                  <Icon name="tabler:shield-exclamation" className="size-4 text-[var(--orange-9)]" />
                                  <span className="text-11 font-semibold text-[var(--gray-11)]">
                                    Policy validation recommended before approval
                                  </span>
                                </div> */}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AnimateSlideUp>
                    )}

                    {hasBackorder && (
                      <AnimateSlideUp delay={0.38}>
                        <div className='mt-3 flex flex-col gap-2'>
                          <div className='flex items-center justify-between pl-1'>
                            <div className='text-[11px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                              Backorder
                            </div>

                            {(() => {
                              const meta = getRecommendationMeta(
                                backorder?.recommendation,
                              )
                              return (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                                    meta.chip,
                                  )}
                                >
                                  <Icon className='size-3' name={meta.icon} />
                                  {meta.label}
                                </span>
                              )
                            })()}
                          </div>

                          <div className='overflow-hidden rounded-xl border border-[var(--gray-4)] bg-white shadow-sm'>
                            <div className='flex items-center justify-between gap-4 border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-3'>
                              <div className='flex items-center gap-3'>
                                <div className='flex size-9 items-center justify-center rounded-lg bg-[var(--orange-1)] text-[var(--orange-9)]'>
                                  <Icon
                                    className='size-5'
                                    name='tabler:truck-delivery'
                                  />
                                </div>
                                <div className='flex flex-col'>
                                  <span className='text-[10px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                                    Detected missing quantities
                                  </span>
                                  <span className='text-13 font-bold text-[var(--gray-12)]'>
                                    {backorder!.missing_qty_by_item!.length}{' '}
                                    impacted line(s)
                                  </span>
                                </div>
                              </div>

                              <span className='inline-flex items-center gap-1 rounded-md border border-[var(--orange-3)] bg-[var(--orange-1)] px-2 py-1 text-[10px] font-bold text-[var(--orange-10)]'>
                                <Icon
                                  className='size-3'
                                  name='tabler:alert-triangle'
                                />
                                Short ship risk
                              </span>
                            </div>

                            <div className='overflow-x-auto'>
                              <div className='min-w-[720px]'>
                                <div className='grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_1fr_1fr] border-b border-[var(--gray-3)] bg-white px-4 py-2 text-[10px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                                  <div>Description</div>
                                  <div>PO Qty</div>
                                  <div>Inv Qty</div>
                                  <div>Remaining</div>
                                  <div>Value</div>
                                  <div className='text-right'>Reason</div>
                                </div>

                                <div className='divide-y divide-[var(--gray-2)]'>
                                  {backorder!.missing_qty_by_item!.map(
                                    (row, idx) => {
                                      const desc =
                                        row.description?.trim() ||
                                        'Unmapped item'
                                      const invQty = row.invoice_qty ?? '-'
                                      const value =
                                        typeof row.amount === 'number'
                                          ? row.amount
                                          : typeof row.price === 'number' &&
                                              typeof row.remaining === 'number'
                                            ? row.price * row.remaining
                                            : '-'
                                      const reason = row.reason || 'BACKORDER'

                                      return (
                                        <div
                                          className='grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_1fr_1fr] items-center px-4 py-2.5 transition-colors hover:bg-[var(--gray-1)]'
                                          key={idx}
                                        >
                                          <div className='pr-4 text-[var(--gray-12)]'>
                                            <div
                                              className='line-clamp-1 text-12 font-semibold transition-all hover:line-clamp-none'
                                              title={desc}
                                            >
                                              {desc}
                                            </div>
                                            {row.po_line_id && (
                                              <div className='line-clamp-1 text-[10px] font-medium text-[var(--gray-9)] transition-all hover:line-clamp-none'>
                                                PO Line: {row.po_line_id}
                                              </div>
                                            )}
                                          </div>

                                          <div className='text-12 font-medium text-[var(--gray-11)]'>
                                            {row.po_qty}
                                          </div>
                                          <div className='text-12 font-medium text-[var(--gray-11)]'>
                                            {invQty as any}
                                          </div>
                                          <div className='text-12 font-bold text-[var(--orange-10)]'>
                                            {row.remaining}
                                          </div>
                                          <div className='text-12 font-bold text-[var(--teal-9)]'>
                                            {value as any}
                                          </div>

                                          <div className='text-right'>
                                            <span className='inline-flex items-center gap-1 rounded-md border border-[var(--orange-3)] bg-[var(--orange-1)] px-2 py-0.5 text-[9px] font-bold text-[var(--orange-10)]'>
                                              {reason}
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    },
                                  )}
                                </div>

                                {backorder?.recommendation && (
                                  <div className='flex items-center justify-between border-t border-[var(--gray-3)] bg-white px-4 py-3'>
                                    <div className='flex items-center gap-2 text-[11px] font-bold text-[var(--gray-10)]'>
                                      <Icon
                                        className='size-4'
                                        name='tabler:route'
                                      />
                                      Orchestration recommendation
                                    </div>
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold',
                                        getRecommendationMeta(
                                          backorder.recommendation,
                                        ).chip,
                                      )}
                                    >
                                      <Icon
                                        className='size-3'
                                        name={
                                          getRecommendationMeta(
                                            backorder.recommendation,
                                          ).icon
                                        }
                                      />
                                      {
                                        getRecommendationMeta(
                                          backorder.recommendation,
                                        ).label
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AnimateSlideUp>
                    )}

                    {/* History */}
                    <div className='mt-3 flex flex-col gap-2'>
                      <div className='flex items-center gap-2 pl-1'>
                        <div className='text-[11px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                          History
                        </div>
                      </div>
                      <div className='rounded-xl border border-[var(--gray-4)] bg-white p-4 shadow-sm'>
                        <History
                          enabled={true}
                          processId={processId}
                          workflowId={workflowId}
                        />
                      </div>
                    </div>

                    {/* Comments (Moved to Overlay View) */}
                    {/* <div className="flex flex-col gap-2 mt-4"> ... </div> */}
                  </div>
                </div>
              </div>

              {/* Right Column: Third Layout (Comments or Attachments) */}
              {rightView !== 'analysis' && (
                <div className='animate-in slide-in-from-right-10 h-full w-[30%] overflow-hidden rounded-lg duration-300'>
                  {rightView === 'comments' ? (
                    /* --- COMMENTS VIEW --- */
                    <div className='flex h-full flex-col overflow-hidden rounded-lg border border-[var(--gray-3)] bg-white'>
                      {/* Header */}
                      <div className='flex shrink-0 items-center justify-between gap-3 border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <Icon
                            className='size-5 text-[var(--blue-9)]'
                            name='tabler:message-circle'
                          />
                          <span className='font-bold text-[var(--gray-12)]'>
                            Comments
                          </span>
                        </div>
                        <button
                          className='flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-[var(--gray-9)] transition-all hover:border-[var(--gray-3)] hover:bg-white hover:shadow-sm'
                          onClick={() => setRightView('analysis')}
                        >
                          <Icon className='size-5' name='tabler:x' />
                        </button>
                      </div>
                      {/* Content */}
                      <div className='flex-1 overflow-hidden p-0'>
                        <Comments
                          attachments={selectedItem?.attachments || []}
                          enabled={true}
                          processId={processId}
                          repositoryId={repositoryId}
                          transactionId={transactionId}
                          workflowId={workflowId}
                        />
                      </div>
                    </div>
                  ) : (
                    /* --- ATTACHMENTS VIEW --- */
                    <div className='flex h-full flex-col overflow-hidden rounded-lg border border-[var(--gray-3)] bg-white'>
                      {/* Header */}
                      <div className='flex shrink-0 items-center justify-between gap-3 border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <Icon
                            className='size-5 text-[var(--blue-9)]'
                            name='tabler:paperclip'
                          />
                          <span className='font-bold text-[var(--gray-12)]'>
                            Attachments
                          </span>
                        </div>
                        <button
                          className='flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-[var(--gray-9)] transition-all hover:border-[var(--gray-3)] hover:bg-white hover:shadow-sm'
                          onClick={() => setRightView('analysis')}
                        >
                          <Icon className='size-5' name='tabler:x' />
                        </button>
                      </div>
                      {/* Content */}
                      <div className='flex-1 overflow-hidden'>
                        <Attachments
                          enabled={true}
                          processId={processId}
                          workflowId={workflowId}
                          onClose={() => setRightView('analysis')}
                          onSelect={(file) => {
                            if (selectedFile?.id === file.id) {
                              setIsFileLoading(true)
                              setTimeout(() => setIsFileLoading(false), 500)
                            } else {
                              setSelectedFile(file)
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

Overview.displayName = 'Overview'
export default Overview
