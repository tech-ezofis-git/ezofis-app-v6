import { useLingui } from '@lingui/react/macro'
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import workflowsApiV6 from '@/api/v6/workflows'
import sample1 from '@/assets/Sample Invoices/inv-1.pdf'
import sample1Img from '@/assets/Sample Invoices/inv-1.png'
import sample10 from '@/assets/Sample Invoices/inv-10.pdf'
import sample10Img from '@/assets/Sample Invoices/inv-10.png'
import sample2 from '@/assets/Sample Invoices/inv-2.pdf'
import sample2Img from '@/assets/Sample Invoices/inv-2.png'
import sample3 from '@/assets/Sample Invoices/inv-3.pdf'
import sample3Img from '@/assets/Sample Invoices/inv-3.png'
import sample4 from '@/assets/Sample Invoices/inv-4.pdf'
import sample4Img from '@/assets/Sample Invoices/inv-4.png'
import sample5 from '@/assets/Sample Invoices/inv-5.pdf'
import sample5Img from '@/assets/Sample Invoices/inv-5.png'
import sample6 from '@/assets/Sample Invoices/inv-6.pdf'
import sample6Img from '@/assets/Sample Invoices/inv-6.png'
import sample7 from '@/assets/Sample Invoices/inv-7.pdf'
import sample7Img from '@/assets/Sample Invoices/inv-7.png'
import sample8 from '@/assets/Sample Invoices/inv-8.pdf'
import sample8Img from '@/assets/Sample Invoices/inv-8.png'
import sample9 from '@/assets/Sample Invoices/inv-9.pdf'
import sample9Img from '@/assets/Sample Invoices/inv-9.png'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useTheme from '@/hooks/useTheme'
import requestStore from '@/pages/requests/stores/useRequestStore'
import Icon from '../../../../../../components/base/icon/Icon'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateSlideUp,
  AnimateStagger,
} from '../../../../../../components/common/animations'
import {
  DOCUMENT_ACCEPT,
  IMAGE_ACCEPT,
  isImage,
  isPdf,
  isSupportedDocument,
  MAX_SIZE,
  PDF_ACCEPT,
} from './utils'

type SampleDocument = {
  description: string
  fileName: string
  icon: string
  label: string
  meaning: string
  tag: string
  tagColor: SampleTagColor
  thumbnail?: string
  url: string
}

type SampleTagColor = 'green' | 'orange' | 'red' | 'blue'

const TAG_COLOR_STYLES: Record<
  SampleTagColor,
  { badge: string; bar: string; tableLine: string; thumbBg: string }
> = {
  blue: {
    badge: 'bg-blue-2 text-blue-11 ring-1 ring-blue-4 border border-blue-3',
    bar: 'bg-blue-9',
    tableLine: 'bg-blue-4',
    thumbBg: 'bg-blue-2/30',
  },
  green: {
    badge: 'bg-green-2 text-green-11 ring-1 ring-green-4 border border-green-3',
    bar: 'bg-green-9',
    tableLine: 'bg-green-4',
    thumbBg: 'bg-green-2/30',
  },
  orange: {
    badge:
      'bg-orange-2 text-orange-11 ring-1 ring-orange-4 border border-orange-3',
    bar: 'bg-orange-9',
    tableLine: 'bg-orange-4',
    thumbBg: 'bg-orange-2/30',
  },
  red: {
    badge: 'bg-red-2 text-red-11 ring-1 ring-red-4 border border-red-3',
    bar: 'bg-red-9',
    tableLine: 'bg-red-4',
    thumbBg: 'bg-red-2/30',
  },
}

const SampleThumbnailPreview = ({
  doc,
  variant,
}: {
  doc: SampleDocument
  variant: 'compact' | 'expanded'
}) => {
  const { t } = useLingui()
  const colors = TAG_COLOR_STYLES[doc.tagColor]
  const isExpanded = variant === 'expanded'

  if (doc.thumbnail) {
    return (
      <img
        alt={isExpanded ? t`${doc.fileName} preview` : doc.fileName}
        className='size-full bg-surface object-contain object-center'
        src={doc.thumbnail}
        style={{ imageRendering: 'auto' }}
      />
    )
  }

  const displayLabel = doc.label.replace('invoice', 'inv-') + '.pdf'

  return (
    <div
      className={`flex size-full flex-col bg-surface transition-colors duration-300 select-none ${isExpanded ? 'p-3' : 'p-1.5'}`}
    >
      {/* Invoice Top Header */}
      <div
        className={`flex items-start justify-between border-b border-[var(--gray-3)] pb-1 ${isExpanded ? 'mb-2 pb-1.5' : 'mb-1'}`}
      >
        <div className='flex flex-col gap-0.5'>
          <div
            className={`font-poppins leading-none font-black text-[var(--gray-12)] ${isExpanded ? 'text-[11px]' : 'text-[7px]'}`}
          >
            {t`INVOICE`}
          </div>
          <div
            className={`font-mono leading-none text-[var(--gray-9)] ${isExpanded ? 'text-[7px]' : 'text-[5px]'}`}
          >
            #{displayLabel.toUpperCase().replace('.PDF', '')}
          </div>
        </div>
        {/* Vendor/Status Colored Accent Shape */}
        <div
          className={`flex items-center justify-center rounded ${colors.bar} ${isExpanded ? 'h-3.5 px-1.5' : 'h-2 w-3.5'}`}
        >
          {isExpanded && (
            <span className='text-[5px] font-bold tracking-wider text-white uppercase'>
              {doc.tag}
            </span>
          )}
        </div>
      </div>

      {/* Billing Address Mock Section */}
      <div
        className={`flex items-start justify-between gap-2 ${isExpanded ? 'mb-2' : 'mb-1'}`}
      >
        <div className='flex-1 space-y-0.5'>
          <div className='h-[3px] w-2/3 rounded bg-[var(--gray-5)]' />
          <div className='h-[2px] w-5/6 rounded bg-[var(--gray-3)]' />
          <div className='h-[2px] w-1/2 rounded bg-[var(--gray-3)]' />
        </div>
        <div className='flex flex-1 flex-col items-end space-y-0.5 text-right'>
          <div className='h-[3px] w-1/2 rounded bg-[var(--gray-4)]' />
          <div className='h-[2px] w-3/4 rounded bg-[var(--gray-3)]' />
        </div>
      </div>

      {/* Table Section */}
      <div className='flex flex-1 flex-col overflow-hidden rounded border border-[var(--gray-3)]'>
        {/* Table Header */}
        <div
          className={`flex items-center gap-1 border-b border-[var(--gray-3)] ${colors.thumbBg} px-1 py-0.5`}
        >
          <div className='h-[2px] flex-1 rounded-sm bg-[var(--gray-8)]' />
          <div className='h-[2px] w-2 rounded-sm bg-[var(--gray-8)]' />
          <div className='h-[2px] w-4 rounded-sm bg-[var(--gray-8)]' />
        </div>

        {/* Table Body Rows */}
        <div
          className={`flex-1 p-1 ${isExpanded ? 'space-y-1.5' : 'space-y-0.5'}`}
        >
          {/* Row 1 */}
          <div className='flex items-center gap-1'>
            <div className={`flex-1 rounded-sm ${colors.tableLine} h-[2px]`} />
            <div className='h-[2px] w-2 rounded-sm bg-[var(--gray-4)]' />
            <div className={`w-3 rounded-sm ${colors.tableLine} h-[2px]`} />
          </div>
          {/* Row 2 */}
          <div className='flex items-center gap-1'>
            <div
              className={`flex-1 rounded-sm ${colors.tableLine} h-[2px] opacity-80`}
            />
            <div className='h-[2px] w-2 rounded-sm bg-[var(--gray-3)]' />
            <div
              className={`w-3 rounded-sm ${colors.tableLine} h-[2px] opacity-80`}
            />
          </div>
          {/* Row 3 */}
          <div className='flex items-center gap-1'>
            <div className='h-[2px] flex-1 rounded-sm bg-[var(--gray-3)]' />
            <div className='h-[2px] w-2 rounded-sm bg-[var(--gray-3)]' />
            <div className='h-[2px] w-3 rounded-sm bg-[var(--gray-3)]' />
          </div>
          {/* Row 4 (Expanded only) */}
          {isExpanded && (
            <div className='flex items-center gap-1'>
              <div
                className={`flex-1 rounded-sm ${colors.tableLine} h-[2px] opacity-50`}
              />
              <div className='h-[2px] w-2 rounded-sm bg-[var(--gray-3)]' />
              <div
                className={`w-3 rounded-sm ${colors.tableLine} h-[2px] opacity-50`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary / Total Block */}
      <div className='mt-1 flex items-center justify-between border-t border-[var(--gray-3)] pt-1'>
        {/* Stamp / Status indicator */}
        <div className='flex items-center gap-0.5'>
          <span
            className={`inline-block rounded-full ${isExpanded ? 'h-2 w-2' : 'h-1.5 w-1.5'} ${colors.bar}`}
          />
          {isExpanded && (
            <span
              className={`text-[5px] font-bold ${colors.badge.split(' ')[1]}`}
            >
              {doc.tag.toUpperCase()}
            </span>
          )}
        </div>

        {/* Grand Total */}
        <div className='flex items-center gap-1'>
          <div className='h-[2px] w-3 rounded-sm bg-[var(--gray-6)]' />
          <div
            className={`rounded-sm ${colors.bar} ${isExpanded ? 'h-2 w-6' : 'h-[3px] w-4'}`}
          />
        </div>
      </div>
    </div>
  )
}

const SampleThumbnail = ({
  colors,
  doc,
  isSelected,
}: {
  colors: (typeof TAG_COLOR_STYLES)[SampleTagColor]
  doc: SampleDocument
  isSelected?: boolean
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [showPortal, setShowPortal] = useState(false)
  const [portalPos, setPortalPos] = useState({ left: 0, top: 0 })

  const previewW = 320
  const previewH = 480

  const handleMouseEnter = () => {
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer showing to the right of the thumbnail so it doesn't block the cursor;
    // fall back to the left, then below/above centered if space is constrained.
    const rightLeft = rect.right + 12
    const leftLeft = rect.left - previewW - 12
    const centeredLeft = rect.left + rect.width / 2 - previewW / 2

    const topCentered = rect.top + rect.height / 2 - previewH / 2
    const top = Math.min(Math.max(8, topCentered), vh - previewH - 8)

    let left = rightLeft
    if (rightLeft + previewW > vw - 8) {
      if (leftLeft >= 8) left = leftLeft
      else left = Math.min(Math.max(8, centeredLeft), vw - previewW - 8)
    }

    setPortalPos({ left, top })
    setShowPortal(true)
  }

  const handleMouseLeave = () => setShowPortal(false)

  return (
    <div
      aria-hidden='true'
      className='group/thumb relative z-10 w-full hover:z-30'
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail image in card */}
      <div
        className={`relative flex h-[92px] w-full items-center justify-center rounded-t-lg border-b border-dashed border-[var(--gray-4)] px-2 py-2 ${colors.thumbBg} transition-colors duration-300`}
      >
        <div className='relative h-full w-[94%] overflow-hidden rounded border border-[var(--gray-3)] bg-surface shadow-sm transition-transform duration-300 group-hover/thumb:scale-[1.02]'>
          <SampleThumbnailPreview doc={doc} variant='compact' />
        </div>

        {/* Selected Tick Mark Overlay */}
        {isSelected && (
          <div className='absolute inset-0 z-20 flex items-center justify-center rounded-t-lg bg-green-9/10 backdrop-blur-[0.5px] transition-all duration-300'>
            <div className='animate-in fade-in zoom-in-75 flex size-6 items-center justify-center rounded-full bg-green-9 text-white shadow-lg duration-300'>
              <Icon className='size-4' name='tabler:check' />
            </div>
          </div>
        )}
      </div>

      {/* Mouseover: expanded clear view */}
      {/* Hover preview rendered in portal to escape parent stacking/overflow contexts */}
      {showPortal &&
        createPortal(
          <div
            className='pointer-events-none scale-100 shadow-2xl'
            style={{
              height: previewH,
              left: portalPos.left,
              position: 'fixed',
              top: portalPos.top,
              width: previewW,
              zIndex: 99999,
            }}
          >
            <div className='flex h-full flex-col overflow-hidden rounded-xl border border-[var(--gray-4)] bg-surface/95 p-2 shadow-2xl backdrop-blur-md'>
              <div className='min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--gray-3)] bg-surface shadow-inner'>
                <SampleThumbnailPreview doc={doc} variant='expanded' />
              </div>
              <div className='px-1 pt-2.5 pb-1'>
                <p className='text-[12px] leading-relaxed font-medium text-[var(--gray-12)]'>
                  {doc.meaning}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

const SampleTagBadge = ({
  colors,
  doc,
}: {
  colors: (typeof TAG_COLOR_STYLES)[SampleTagColor]
  doc: SampleDocument
}) => {
  const badgeRef = useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({
    left: 0,
    placeAbove: true,
    top: 0,
  })

  const show = () => {
    const el = badgeRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const width = 280
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 8,
    )
    const placeAbove = rect.top > 168
    setPos({
      left,
      placeAbove,
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
    })
    setOpen(true)
  }

  return (
    <>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] leading-tight font-semibold ring-1 ring-inset transition-transform duration-200 hover:scale-105 ${colors.badge}`}
        ref={badgeRef}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
      >
        {doc.tag}
      </span>
      {open &&
        createPortal(
          <div
            className='pointer-events-none w-[280px] animate-in fade-in zoom-in-95 duration-200'
            style={{
              left: pos.left,
              position: 'fixed',
              top: pos.top,
              transform: pos.placeAbove ? 'translateY(-100%)' : undefined,
              zIndex: 100000,
            }}
          >
            <div className='rounded-xl border border-[var(--gray-3)] bg-surface p-3 shadow-2xl'>
              <p className='text-[12px] leading-relaxed font-medium text-[var(--gray-12)]'>
                {doc.meaning}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

const FileUpload = ({ onClose }: { onClose?: () => void }) => {
  const { t } = useLingui()
  const rawWorkflow = requestStore((state) => state.rawWorkflowData)
  const workflowRefresh = requestStore((state) => state.workflowRefresh)

  const sampleDocuments = useMemo<SampleDocument[]>(
    () => [
      {
        description: t`Perfect PO validation.`,
        fileName: 'INV-2026-6001',
        meaning: t`The invoice matches its purchase order. Supplier, amounts, and line items all agree, so this sample is a clean pass.`,
        icon: 'tabler:file-invoice',
        label: 'invoice1',
        tag: t`PO Verified`,
        tagColor: 'green',
        thumbnail: sample1Img,
        url: sample1,
      },
      {
        description: t`Complete document match.`,
        fileName: 'INV-2026-3101',
        meaning: t`Every invoice line matches the purchase order and the goods receipt. Nothing is missing, extra, or priced differently.`,
        icon: 'tabler:file-invoice',
        label: 'invoice2',
        tag: t`Fully Matched`,
        tagColor: 'green',
        thumbnail: sample2Img,
        url: sample2,
      },
      {
        description: t`Supplier details differ.`,
        fileName: 'INV-2026-3005',
        meaning: t`The supplier on the invoice is not the supplier on the purchase order. Check the vendor name, tax ID, or address before you approve.`,
        icon: 'tabler:file-invoice',
        label: 'invoice3',
        tag: t`Supplier Conflict`,
        tagColor: 'orange',
        thumbnail: sample3Img,
        url: sample3,
      },
      {
        description: t`Scanned handwritten bill.`,
        fileName: t`Handwritten Invoice`,
        meaning: t`This bill was written by hand and then scanned. The sample shows how the agent still reads the amounts and lines from the image.`,
        icon: 'tabler:file-invoice',
        label: 'invoice4',
        tag: t`Handwritten`,
        tagColor: 'blue',
        thumbnail: sample4Img,
        url: sample4,
      },
      {
        description: t`Pending delivery items.`,
        fileName: 'INV-2026-1001',
        meaning: t`Some billed items have not been delivered yet. The invoice quantity is waiting on a later shipment.`,
        icon: 'tabler:file-invoice',
        label: 'invoice5',
        tag: t`Backorder`,
        tagColor: 'orange',
        thumbnail: sample5Img,
        url: sample5,
      },
      {
        description: t`Vendor identity mismatch.`,
        fileName: 'INV-2026-3001',
        meaning: t`The vendor on the invoice cannot be confirmed against the known supplier record. The name or identity does not match.`,
        icon: 'tabler:file-invoice',
        label: 'invoice6',
        tag: t`Vendor Check`,
        tagColor: 'orange',
        thumbnail: sample6Img,
        url: sample6,
      },
      {
        description: t`Invoice value reduced.`,
        fileName: 'INV-2026-5001',
        meaning: t`The invoice total is lower than the purchase order. A price or quantity was billed for less than was agreed.`,
        icon: 'tabler:file-invoice',
        label: 'invoice7',
        tag: t`Undercharged`,
        tagColor: 'red',
        thumbnail: sample7Img,
        url: sample7,
      },
      {
        description: t`Multiple pricing differences.`,
        fileName: 'INV-2026-5004',
        meaning: t`More than one line price differs from the purchase order. Compare each line before you approve.`,
        icon: 'tabler:file-invoice',
        label: 'invoice8',
        tag: t`Price Variance`,
        tagColor: 'red',
        thumbnail: sample8Img,
        url: sample8,
      },
      {
        description: t`Quantity line discrepancy.`,
        fileName: 'INV-2026-1004',
        meaning: t`A quantity on the invoice does not match the purchase order or the receipt. One or more lines are short or over.`,
        icon: 'tabler:file-invoice',
        label: 'invoice9',
        tag: t`Line Variance`,
        tagColor: 'orange',
        thumbnail: sample9Img,
        url: sample9,
      },
      {
        description: t`Invoice exceeds PO value.`,
        fileName: 'INV-2026-5003',
        meaning: t`The invoice total is higher than the purchase order. The billed amount is above the agreed value.`,
        icon: 'tabler:file-invoice',
        label: 'invoice10',
        tag: t`Overcharged`,
        tagColor: 'red',
        thumbnail: sample10Img,
        url: sample10,
      },
    ],
    [t],
  )

  const capabilityCards = useMemo(
    () => [
      {
        color: 'text-[var(--orange-9)] bg-[var(--orange-2)]',
        icon: 'tabler:bolt',
        label: t`AI EXTRACTION`,
        sub: t`AI-powered extraction in seconds`,
        title: t`Instant Processing`,
      },
      {
        color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
        icon: 'tabler:sparkles',
        label: t`INTELLIGENCE`,
        sub: t`Link invoices to POs with precision.`,
        title: t`Smart PO Matching`,
      },
      {
        color: 'text-[var(--green-11)] bg-[var(--green-2)]',
        icon: 'tabler:clock',
        label: t`ANALYTICS`,
        sub: t`Insights into your liabilities.`,
        title: t`Payables Overview`,
      },
    ],
    [t],
  )

  const getUploadErrorMessage = (files: File[]): string => {
    const tooLarge = files.some((f) => f.size > MAX_SIZE)
    if (tooLarge) return t`File is too large. Max size is 50MB.`
    const invalidType = files.some((f) => !isSupportedDocument(f))
    if (invalidType)
      return t`Invalid file type. Please upload a supported document.`
    return t`No valid files selected.`
  }

  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Flow State
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')
  const [selectedSampleName, setSelectedSampleName] = useState<string | null>(
    null,
  )
  const [uploadProgressText, setUploadProgressText] = useState<{
    current: number
    fileName: string
    total: number
  } | null>(null)

  const resetInput = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) ref.current.value = ''
  }

  const startWorkflowInstance = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('context', '')
    formData.append('envType', 'trial')

    console.log(
      'Starting workflow with new upload API for workflow ID:',
      rawWorkflow?.id,
    )
    const { data, error } = await workflowsApiV6.startWorkflow(
      rawWorkflow?.id,
      formData,
    )

    if (error) {
      throw new Error(String(error))
    }

    if (!data) {
      throw new Error(t`Workflow started but did not return any data.`)
    }

    const parsedData = typeof data === 'string' ? JSON.parse(data) : data
    const processId = parsedData?.instanceId
    const transactionId = parsedData?.startPayload?.transactionId
    const apAgentJobId = parsedData?.apAgentJobId

    if (!processId && !apAgentJobId) {
      throw new Error(
        t`Workflow started but did not return a valid instanceId or apAgentJobId.`,
      )
    }

    return { apAgentJobId, processId, transactionId }
  }

  const fetchWorkflowStageDetails = async (
    processId: string,
    transactionId: string,
  ) => {
    try {
      const inboxRes = await workflowsApiV6.getInboxList(
        String(rawWorkflow?.id),
        1,
        10,
        processId,
        transactionId,
      )
      const items = (inboxRes.data?.items || []) as Array<{
        formEntryId?: string | number
        id?: string | number
        processId?: string | number
        referenceNumber?: string
        requestNo?: string
        stage?: string
        workflowInstanceId?: string | number
      }>
      const foundItem =
        items.find((i) => {
          const id = i.workflowInstanceId || i.processId || i.id
          return String(id) === String(processId)
        }) || items[0]

      if (foundItem) {
        const referenceNumber =
          foundItem.referenceNumber == null
            ? ''
            : String(foundItem.referenceNumber).trim()
        const formEntryId = foundItem.formEntryId
        return {
          requestNo:
            referenceNumber ||
            (formEntryId !== undefined &&
            formEntryId !== null &&
            formEntryId !== ''
              ? `REQ-${formEntryId}`
              : '') ||
            `REQ-${processId.substring(0, 8).toUpperCase()}` ||
            foundItem.requestNo ||
            t`New Request`,
          stage: foundItem.stage || t`Start`,
        }
      }
    } catch (err) {
      console.error('Error fetching specific request from V6 inbox:', err)
    }
    return {
      requestNo: `REQ-${processId.substring(0, 8).toUpperCase()}`,
      stage: t`Start`,
    }
  }

  const handleInvoiceFiles = async (
    fileList: FileList | File[] | null,
    isSample = false,
  ) => {
    const files = Array.from(fileList ?? [])
    const validFiles = files.filter(
      (f) => isSupportedDocument(f) && f.size <= MAX_SIZE,
    )

    console.log('Files selected:', files)
    console.log('Valid files:', validFiles)
    console.log('Raw Workflow:', rawWorkflow)

    if (!validFiles.length && files.length > 0) {
      showToast({
        message: getUploadErrorMessage(files),
        variant: 'error',
      })
      resetInput(invoiceInputRef)
      return
    }

    if (!validFiles.length) {
      resetInput(invoiceInputRef)
      return
    }

    if (!rawWorkflow?.id) {
      console.error('Missing workflow ID in rawWorkflow:', rawWorkflow)
      showToast({
        message: t`Workflow ID is missing. Cannot start workflow.`,
        variant: 'error',
      })
      return
    }

    if (!isSample) {
      setSelectedSampleName(null)
    }

    let filesToProcess = validFiles
    if (validFiles.length > 5) {
      showToast({
        message: t`A maximum of 5 files can be processed at once. Only the first 5 will be processed.`,
        variant: 'warning',
      })
      filesToProcess = validFiles.slice(0, 5)
    }

    setUploadStatus('uploading')

    let lastStubItem: {
      _localFileUrl: string
      apAgentJobId: string | number | null
      createdAt: string
      documentNumber: string
      id: string
      isProcessing: boolean
      processId: string
      reqNo: string
      requestNo: string
      stage: string
      stageType: string
      transactionId: string | null
      vendor: string
    } | null = null
    let selectedWorkflowStub: {
      flowJson: string
      formJson: string
      id: number | string | undefined
      name: string
      wFormId: number | string
    } | null = null

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i]
        setUploadProgressText({
          current: i + 1,
          fileName: file.name,
          total: filesToProcess.length,
        })

        const { apAgentJobId, processId, transactionId } =
          await startWorkflowInstance(file)

        const isJobBased = !!apAgentJobId
        const resolvedProcessId = processId || `job-${apAgentJobId}`
        const resolvedTransactionId = transactionId || null

        let requestNo = t`New Request`
        let stage = isJobBased ? t`Initiating...` : t`Start`

        if (transactionId && processId) {
          const details = await fetchWorkflowStageDetails(
            processId,
            transactionId,
          )
          requestNo = details.requestNo
          stage = details.stage
        }

        const localUrl = URL.createObjectURL(file)
        const startTime = new Date().toISOString()

        // Add to background processing
        requestStore.getState().addProcessingProcess({
          apAgentJobId: apAgentJobId || null,
          id: resolvedProcessId,
          name: file.name,
          processId: resolvedProcessId,
          repositoryId: rawWorkflow?.repositoryId,
          requestNo,
          stage,
          startTime,
          transactionId: resolvedTransactionId,
          workflowId: rawWorkflow?.id,
        })

        const wFormId =
          rawWorkflow?.formId ??
          rawWorkflow?.wFormId ??
          rawWorkflow?.settings?.general?.initiateUsing?.formId ??
          ''
        selectedWorkflowStub = {
          flowJson:
            typeof rawWorkflow?.flowJson === 'string'
              ? rawWorkflow.flowJson
              : JSON.stringify(rawWorkflow?.flowJson || {}),
          formJson:
            typeof rawWorkflow?.formJson === 'string'
              ? rawWorkflow.formJson
              : JSON.stringify(rawWorkflow?.formJson || ''),
          id: rawWorkflow?.id,
          name:
            rawWorkflow?.name ??
            rawWorkflow?.settings?.general?.name ??
            t`Workflow`,
          wFormId: wFormId || '',
        }

        lastStubItem = {
          _localFileUrl: localUrl,
          apAgentJobId: apAgentJobId || null,
          createdAt: startTime,
          documentNumber: t`Analyzing Invoice...`,
          id: resolvedProcessId,
          isProcessing: true,
          processId: resolvedProcessId,
          reqNo: requestNo,
          requestNo: requestNo,
          stage: stage,
          stageType: 'AP_AGENT',
          transactionId: resolvedTransactionId,
          vendor: t`Analyzing Supplier...`,
        }
      }

      setUploadStatus('success')
      setUploadProgressText(null)

      // Transition straight to detail overview for the last created request
      if (lastStubItem && selectedWorkflowStub) {
        requestStore
          .getState()
          .openRequest(lastStubItem, selectedWorkflowStub, 'Overview')
      }

      // Trigger list refresh
      workflowRefresh()

      // Close the upload sheet immediately
      if (onClose) onClose()
    } catch (error) {
      const err = error as Error
      console.error('Workflow start error:', err)
      setUploadStatus('error')
      setUploadProgressText(null)
      setSelectedSampleName(null)
      showToast({
        message: err.message || t`Error starting workflow`,
        variant: 'error',
      })
    }
    resetInput(invoiceInputRef)
  }

  const handleSampleSelect = async (doc: SampleDocument) => {
    try {
      setSelectedSampleName(doc.fileName)
      setUploadStatus('uploading')
      const response = await fetch(doc.url)
      const blob = await response.blob()
      const file = new File([blob], doc.fileName, { type: 'application/pdf' })

      setUploadStatus('idle')
      handleInvoiceFiles([file], true)
    } catch (error) {
      console.error('Failed to load sample document', error)
      setSelectedSampleName(null)
      setUploadStatus('idle')
      showToast({
        message: t`Failed to load sample document.`,
        variant: 'error',
      })
    }
  }

  // Step 1: Upload (Premium Centered UI)
  return (
    <AnimateFadeIn className='flex h-full flex-col items-center overflow-y-auto bg-surface-muted px-4 py-4 sm:px-6 lg:px-8'>
      <div className='my-auto flex w-full max-w-5xl flex-col items-center gap-5'>
        {/* Header Section */}
        <AnimateSlideUp className='space-y-1 text-center'>
          <h1 className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
            {t`Intelligent`}{' '}
            <span className='text-[var(--primary-9)]'>{t`AP Agent`}</span>
          </h1>
          <p className='mx-auto max-w-xl text-sm font-medium text-[var(--gray-10)]'>
            {t`Streamline your Accounts Payable. Automatically process invoices, match Purchase Orders, and gain complete visibility.`}
          </p>
        </AnimateSlideUp>

        {/* Upload Zone */}
        <AnimateSlideUp className='relative z-10 w-full max-w-3xl' delay={0.1}>
          <div className='group relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-2 shadow-sm transition-all duration-500 hover:shadow-md'>
            <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
              <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-[var(--primary-2)]/20 to-transparent' />
            </div>

            <button
              aria-label={t`Upload invoice`}
              type='button'
              className={[
                'relative z-10 flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--primary-4)] px-8 py-6 text-center transition-all duration-500 ease-out sm:min-h-[128px]',
                isDragOver
                  ? 'scale-[0.99] border-[var(--primary-6)] bg-[var(--primary-1)]'
                  : 'bg-surface hover:border-[var(--primary-5)] hover:bg-[var(--primary-1)]/30',
                uploadStatus === 'uploading'
                  ? 'pointer-events-none opacity-60'
                  : '',
              ].join(' ')}
              onClick={() => invoiceInputRef.current?.click()}
              onDragLeave={() => setIsDragOver(false)}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                handleInvoiceFiles(e.dataTransfer.files)
              }}
            >
              {uploadStatus === 'uploading' ? (
                <div className='flex flex-col items-center gap-3 py-2'>
                  <div className='flex size-14 items-center justify-center rounded-full bg-[var(--primary-1)]'>
                    <Icon
                      className='size-7 animate-spin text-[var(--primary-9)]'
                      name='tabler:loader-2'
                    />
                  </div>
                  <div className='text-center'>
                    <h2 className='text-base font-bold text-[var(--gray-13)]'>
                      {uploadProgressText
                        ? t`Uploading & Processing (${uploadProgressText.current}/${uploadProgressText.total})...`
                        : t`Uploading & Processing...`}
                    </h2>
                    <p
                      className='mt-1 max-w-[280px] truncate text-xs font-semibold text-[var(--gray-10)]'
                      title={uploadProgressText?.fileName}
                    >
                      {uploadProgressText
                        ? t`Processing "${uploadProgressText.fileName}"`
                        : t`Please wait while we process your document`}
                    </p>
                  </div>
                </div>
              ) : (
                <AnimateStagger className='flex flex-col items-center gap-3'>
                  <div className='flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-1)] shadow-sm transition-all duration-500 group-hover:scale-105'>
                    <Icon
                      className='size-7 text-[var(--primary-9)]'
                      name='tabler:cloud-upload'
                    />
                  </div>
                  <div className='text-center'>
                    <h2 className='text-base font-medium tracking-tight text-[var(--gray-13)]'>
                      {t`Drop your file here, or`}{' '}
                      <span className='text-[var(--primary-9)]'>{t`browse`}</span>
                    </h2>
                    <p className='text-xs font-medium text-[var(--gray-9)]'>
                      {t`Supports PDF, Word, Excel, PowerPoint, Images & Documents · Max 50 MB`}
                    </p>
                  </div>
                </AnimateStagger>
              )}

              <input
                accept={DOCUMENT_ACCEPT}
                className='hidden'
                ref={invoiceInputRef}
                type='file'
                multiple
                onChange={(e) => handleInvoiceFiles(e.target.files)}
              />
            </button>
          </div>
        </AnimateSlideUp>

        {/* Quick Try — narrow sample cards */}
        <AnimateSlideUp className='relative z-20 w-full max-w-4xl' delay={0.15}>
          <div className='space-y-3'>
            <div className='flex items-center gap-3 px-2'>
              <div className='flex-1 border-t border-dashed border-[var(--gray-5)]' />
              <p className='shrink-0 text-center text-[10px] tracking-wide text-[var(--gray-9)]'>
                <span className='font-bold uppercase'>{t`Quick Try`}</span>
                <span className='mx-1.5 text-[var(--gray-6)]'>·</span>
                <span className='font-medium text-[var(--gray-10)]'>
                  {t`Click any preview to process`}
                </span>
              </p>
              <div className='flex-1 border-t border-dashed border-[var(--gray-5)]' />
            </div>

            <div className='custom-scrollbar flex flex-wrap justify-center gap-2.5 overflow-visible pt-4 pb-1'>
              {sampleDocuments.map((doc) => {
                const colors = TAG_COLOR_STYLES[doc.tagColor]
                const displayLabel =
                  doc.label.replace('invoice', 'inv-') + '.pdf'
                const isSelected = selectedSampleName === doc.fileName
                return (
                  <button
                    disabled={uploadStatus === 'uploading'}
                    key={doc.fileName}
                    type='button'
                    className={`group/card relative z-10 flex w-[156px] shrink-0 flex-col overflow-visible rounded-lg border bg-surface text-left shadow-sm transition-all duration-300 hover:z-50 ${
                      isSelected
                        ? 'scale-[1.02] border-green-8 ring-2 ring-green-3 ring-offset-0'
                        : 'border-[var(--gray-3)] hover:-translate-y-1.5 hover:scale-[1.02] hover:border-[var(--primary-6)] hover:shadow-md active:translate-y-0 active:scale-98'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={() => handleSampleSelect(doc)}
                  >
                    <SampleThumbnail
                      colors={colors}
                      doc={doc}
                      isSelected={isSelected}
                    />

                    <div className='flex flex-col gap-0.5 border-t border-[var(--gray-3)] px-2 py-1.5'>
                      <div className='flex items-center justify-between gap-1'>
                        <span
                          className='truncate text-[10px] font-bold tracking-tight text-[var(--gray-13)]'
                          title={doc.fileName}
                        >
                          {displayLabel}
                        </span>
                        <SampleTagBadge colors={colors} doc={doc} />
                      </div>
                      <p className='mt-0.5 line-clamp-1 text-[9px] leading-snug font-medium text-[var(--gray-10)]'>
                        {doc.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </AnimateSlideUp>

        {/* Bottom Capabilities - Kept from original but repositioned */}
        <div className='mx-auto grid w-full max-w-[900px] grid-cols-1 gap-4 md:grid-cols-3'>
          {capabilityCards.map((item, idx) => (
            <AnimateEntrancePop delay={0.4 + idx * 0.1} key={item.title}>
              <div className='group flex h-full flex-col gap-2 rounded-xl border border-[var(--gray-3)] bg-surface p-5 shadow-sm transition-all duration-300 hover:shadow-md'>
                <span className='truncate text-[9px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                  {item.label}
                </span>
                <div className='mt-1 flex items-center gap-3.5'>
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg shadow-sm ${item.color} transition-transform duration-300 group-hover:scale-105`}
                  >
                    {item.icon === 'tabler:sparkles' ? (
                      <AiBrandIcon
                        className='size-5 transition-transform duration-300 group-hover:rotate-6'
                        variant='outline-purple'
                      />
                    ) : (
                      <Icon
                        className='size-5 transition-transform duration-300 group-hover:rotate-6'
                        name={item.icon}
                      />
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h4 className='truncate text-13/4.5 font-semibold text-[var(--gray-13)] transition-colors group-hover:text-purple-7'>
                      {item.title}
                    </h4>
                    <p className='mt-0.5 truncate text-11/4 text-[var(--gray-10)]'>
                      {item.sub}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateEntrancePop>
          ))}
        </div>
      </div>

      {/* Custom Scan Animation Style */}
      <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(200%); }
                }
            `}</style>
    </AnimateFadeIn>
  )
}

export default FileUpload
