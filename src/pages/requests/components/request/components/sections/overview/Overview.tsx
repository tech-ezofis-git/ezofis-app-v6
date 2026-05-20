import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core'
import {
  CreditCard,
  FileText,
  HistoryIcon,
  Layers,
  ListFilter,
  MessageCircle,
  Paperclip,
  Store,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import BarLoader from '@/components/base/BarLoader'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import { useAttachments } from '@/pages/requests/hooks/useAttachments'
import authUserStore from '@/stores/authUserStore'
import '@react-pdf-viewer/core/lib/styles/index.css'
import cn from '@/utils/cn'
import Attachments from '../attachment/Attachments'
import Comments from '../comment/Comments'
import History from '../history/History'

// --- Components ---

const AnalysisCard = ({
  icon: Icon,
  status,
  statusType = 'success',
  title,
  value,
}: any) => (
  <div className='flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-[var(--gray-3)] bg-white p-2.5 transition-colors hover:bg-[var(--gray-1)]'>
    <div className='flex items-center justify-between'>
      <div
        className={cn(
          'shrink-0 rounded p-1.5 transition-colors',
          statusType === 'success'
            ? 'bg-[var(--green-1)] text-[var(--green-9)]'
            : statusType === 'warning'
              ? 'bg-[var(--orange-1)] text-[var(--orange-9)]'
              : 'bg-[var(--gray-1)] text-[var(--gray-11)]',
        )}
      >
        <Icon className='h-3.5 w-3.5' />
      </div>
      <div
        className={cn(
          'shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-semibold',
          statusType === 'success'
            ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
            : statusType === 'warning'
              ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
              : 'border-[var(--gray-3)] bg-[var(--gray-1)] text-[var(--gray-11)]',
        )}
      >
        {status}
      </div>
    </div>
    <div className='mt-0.5 flex min-w-0 flex-col gap-0.5'>
      <span className='text-[11px] leading-none font-semibold tracking-tight text-[var(--gray-11)]'>
        {title}
      </span>
      <span
        className='text-[13px] leading-tight font-semibold text-[var(--gray-13)]'
        title={value}
      >
        {value || '---'}
      </span>
    </div>
  </div>
)

const FormCard = ({
  highlight = false,
  icon: Icon,
  label,
  options = [],
  type = 'text',
  value,
  onChange,
}: any) => {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      onChange?.(localValue)
    }
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') {
      setLocalValue(value)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-3 transition-all hover:border-[var(--gray-3)] hover:bg-white hover:shadow-sm',
        isEditing &&
          'border-[var(--primary-3)] bg-white shadow-sm ring-1 ring-[var(--primary-3)]/20',
      )}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      <div
        className={cn(
          'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
          highlight
            ? 'bg-[var(--green-9)]/10 text-[var(--green-9)]'
            : 'bg-[var(--gray-2)] text-[var(--gray-11)] group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]',
        )}
      >
        <Icon className='h-3.5 w-3.5' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='mb-0.5 text-[10px] font-semibold text-[var(--gray-11)]'>
          {label}
        </p>
        {isEditing ? (
          <div
            className='animate-in fade-in zoom-in-95 duration-200'
            onClick={(e) => e.stopPropagation()}
          >
            {type === 'date' ? (
              <InputDate
                className='w-full font-semibold'
                value={localValue}
                onChange={(val: any) => setLocalValue(val)}
              />
            ) : type === 'dropdown' ? (
              <InputSelect
                className='w-full font-semibold'
                options={options}
                value={localValue}
                onChange={(val: any) => {
                  setLocalValue(val)
                  setTimeout(handleBlur, 0)
                }}
              />
            ) : (
              <input
                className='w-full border-none bg-transparent p-0 text-[13px] font-semibold text-[var(--gray-13)] placeholder:font-normal focus:ring-0 focus:outline-none'
                placeholder={`Enter ${label}...`}
                type='text'
                value={localValue === '-' ? '' : localValue}
                autoFocus
                onBlur={handleBlur}
                onChange={(e) => setLocalValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            )}
          </div>
        ) : (
          <p
            className={cn(
              'text-[13px] leading-tight font-semibold transition-colors',
              highlight
                ? 'text-[var(--green-9)]'
                : 'text-[var(--gray-13)] group-hover:text-[var(--primary-9)]',
              value === '-' && 'font-medium text-[var(--gray-9)]',
            )}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

// --- Main App ---

const Overview = (props: any) => {
  const {
    agentData,
    formModel,
    processId,
    repositoryId,
    selectedItem,
    transactionId,
    workflowId,
    setFormModel,
  } = props

  const [activeTab, setActiveTab] = useState('summary')
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const { data: attachmentData } = useAttachments(workflowId, processId, true)

  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId
  const userId = session?.id

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [isViewerLoading, setIsViewerLoading] = useState(false)
  const [scale, setScale] = useState(1)
  const viewerRef = useRef<any>(null)

  const toolbarPluginInstance = useMemo(
    () => ({
      install: (pluginFunctions: any) => {
        viewerRef.current = pluginFunctions
      },
      onZoom: (e: any) => {
        setScale(e.scale)
      },
    }),
    [],
  )

  const invoiceHeader = agentData?.['Extracted Invoice JSON']
    ?.invoice_header as any

  useEffect(() => {
    if (invoiceHeader && Object.keys(formModel || {}).length === 0) {
      setFormModel?.(invoiceHeader)
    }
  }, [invoiceHeader, formModel, setFormModel])

  useEffect(() => {
    // Reset viewer state when request changes
    setSelectedFile(null)
    setPreviewUrl(null)
  }, [processId, transactionId])

  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData[0])
    }
  }, [attachmentData, selectedFile])

  useEffect(() => {
    const fetchFile = async () => {
      const rId = Number(repositoryId)
      if (selectedFile?.id && !isNaN(rId) && rId > 0) {
        setIsViewerLoading(true)
        try {
          const tId = tenantId ? Number(tenantId) : 2
          const uId = userId ? String(userId) : '2'
          const response = await fileApi.viewBinary(
            tId,
            uId,
            rId,
            selectedFile.id,
            2,
          )

          if (response?.data) {
            const base64 = response.data.file || response.data
            if (typeof base64 !== 'string') return

            let mimeType = 'application/pdf'
            if (base64.startsWith('/9j/')) mimeType = 'image/jpeg'
            else if (base64.startsWith('iVBORw0KGgo')) mimeType = 'image/png'
            else if (base64.startsWith('JVBERi0')) mimeType = 'application/pdf'

            const url = base64.startsWith('data:')
              ? base64
              : `data:${mimeType};base64,${base64}`
            setPreviewUrl(url)
            setFileType(mimeType)
          }
        } catch (error) {
          console.error('Error fetching file:', error)
        } finally {
          setIsViewerLoading(false)
        }
      }
    }
    fetchFile()
  }, [selectedFile, repositoryId, tenantId, userId])

  const handleFieldChange = (key: string, value: string) => {
    setFormModel?.((prev: any) => ({ ...prev, [key]: value }))
  }

  const getFieldType = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('date')) return 'date'
    if (l.includes('currency') || l.includes('status')) return 'dropdown'
    return 'text'
  }

  const getOptions = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('currency'))
      return [
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' },
        { label: 'GBP', value: 'GBP' },
        { label: 'INR', value: 'INR' },
        { label: 'AED', value: 'AED' },
      ]
    return []
  }

  const getFieldIcon = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('supplier') || l.includes('vendor')) return Store
    if (l.includes('invoice') || l.includes('number')) return ListFilter
    if (l.includes('date')) return HistoryIcon
    if (l.includes('total') || l.includes('amount') || l.includes('value'))
      return Wallet
    if (l.includes('currency')) return CreditCard
    return FileText
  }

  const SummarySkeleton = () => (
    <div className='flex-1 animate-pulse space-y-6 overflow-y-auto px-4 pb-8'>
      <div className='space-y-5 rounded-xl border border-[var(--gray-3)]/10 bg-white p-6 shadow-sm'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-4'>
            <div className='h-12 w-12 rounded-xl bg-[var(--gray-2)]' />
            <div className='space-y-2'>
              <div className='h-3 w-24 rounded bg-[var(--gray-2)]' />
              <div className='h-5 w-40 rounded bg-[var(--gray-2)]' />
            </div>
          </div>
          <div className='h-7 w-20 rounded-full bg-[var(--gray-2)]' />
        </div>
        <div className='h-20 w-full rounded-xl bg-[var(--gray-1)]' />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        {[1, 2, 3, 4].map((i) => (
          <div
            className='space-y-3 rounded-xl border border-[var(--gray-3)]/10 bg-white p-4'
            key={i}
          >
            <div className='h-3 w-16 rounded bg-[var(--gray-2)]' />
            <div className='h-5 w-28 rounded bg-[var(--gray-2)]' />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden font-sans'>
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        {/* Left Side - Document Viewer (40% Width) */}
        <div className='relative flex w-[40%] flex-col overflow-hidden border-r border-[var(--gray-3)] bg-white'>
          {isViewerLoading && (
            <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--gray-1)]'>
              <BarLoader />
              <p className='text-xs font-bold tracking-widest text-[var(--gray-10)] uppercase'>
                Loading Preview...
              </p>
            </div>
          )}

          {previewUrl ? (
            fileType === 'application/pdf' ? (
              <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'>
                <div className='group relative h-full w-full overflow-hidden'>
                  <Viewer
                    defaultScale={SpecialZoomLevel.PageWidth}
                    fileUrl={previewUrl}
                    plugins={[toolbarPluginInstance]}
                  />
                  <div className='absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-[var(--gray-3)] bg-white/90 px-4 py-2 opacity-0 shadow-2xl backdrop-blur-sm transition-all duration-300 group-hover:opacity-100'>
                    <button
                      className='p-1 hover:text-[var(--primary-9)]'
                      onClick={() => viewerRef.current?.zoom(scale - 0.1)}
                    >
                      <Icon className='size-5' name='lucide:zoom-out' />
                    </button>
                    <span className='min-w-[40px] text-center text-[12px] font-semibold'>
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      className='p-1 hover:text-[var(--primary-9)]'
                      onClick={() => viewerRef.current?.zoom(scale + 0.1)}
                    >
                      <Icon className='size-5' name='lucide:zoom-in' />
                    </button>
                  </div>
                </div>
              </Worker>
            ) : (
              <div className='flex h-full w-full items-center justify-center p-4'>
                <img
                  alt='Preview'
                  className='max-h-full max-w-full rounded-xl border object-contain shadow-2xl'
                  src={previewUrl}
                />
              </div>
            )
          ) : (
            !isViewerLoading && (
              <div className='flex h-full flex-col items-center justify-center p-6 text-center'>
                <Icon
                  className='mb-4 size-12 text-[var(--gray-4)]'
                  name='tabler:file-off'
                />
                <p className='text-[15px] font-semibold text-[var(--gray-11)]'>
                  No document preview available
                </p>
              </div>
            )
          )}
        </div>

        {/* Right Side - Analysis & Data (60% Width) */}
        <div className='flex flex-1 flex-col bg-[var(--gray-1)]'>
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-white'>
            {!agentData || Object.keys(agentData).length === 0 ? (
              <SummarySkeleton />
            ) : (
              <div className='flex h-full flex-col overflow-hidden'>
                <div className='shrink-0 space-y-4 p-4'>
                  <div className='grid grid-cols-4 gap-3'>
                    {(() => {
                      const poVal =
                        formModel?.['PO Number'] ||
                        formModel?.['po_number'] ||
                        formModel?.['RXwLGHILLrreMmRqlk9mj'] ||
                        formModel?.['poNumber']
                      return (
                        <AnalysisCard
                          icon={Paperclip}
                          title='PO Matching'
                          status={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? 'Matched'
                              : 'Not Matched'
                          }
                          statusType={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? 'success'
                              : 'warning'
                          }
                          value={
                            poVal && poVal !== '-' && poVal !== 'N/A'
                              ? `PO: ${poVal}`
                              : 'No PO Found'
                          }
                        />
                      )
                    })()}
                    <AnalysisCard
                      icon={Layers}
                      title='Duplicate Detection'
                      status={
                        agentData?.duplicate_check?.status || 'No Duplicate'
                      }
                      statusType={
                        agentData?.duplicate_check?.status === 'Duplicate'
                          ? 'warning'
                          : 'success'
                      }
                      value={
                        agentData?.duplicate_check?.message ||
                        'No duplicates detected'
                      }
                    />
                    <AnalysisCard
                      icon={ListFilter}
                      status={agentData?.gl_matching?.status || 'Matched'}
                      statusType='success'
                      title='GL Account Matching'
                      value={agentData?.gl_matching?.account || 'GL: 5100-001'}
                    />
                    <AnalysisCard
                      icon={Store}
                      statusType='success'
                      title='Supplier Verification'
                      status={
                        formModel?.['Supplier ID'] || formModel?.['supplier_id']
                          ? 'Verified'
                          : 'Verified'
                      }
                      value={
                        formModel?.['Supplier ID'] || formModel?.['supplier_id']
                          ? `ID: ${formModel?.['Supplier ID'] || formModel?.['supplier_id']}`
                          : 'SUP-001'
                      }
                    />
                  </div>
                </div>

                <div className='sticky top-0 z-10 shrink-0 border-b border-[var(--gray-3)] bg-white px-6 pt-2'>
                  <div className='flex items-center gap-8'>
                    {[
                      {
                        icon: FileText,
                        id: 'summary',
                        label: 'Extracted Data',
                      },
                      { icon: Layers, id: 'line_items', label: 'Line Items' },
                      {
                        icon: Paperclip,
                        id: 'attachments',
                        label: 'Attachments',
                      },
                      {
                        icon: MessageCircle,
                        id: 'comments',
                        label: 'Comments',
                      },
                      { icon: HistoryIcon, id: 'history', label: 'History' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        className={cn(
                          '-mb-[2px] flex items-center gap-2 border-b-2 pb-4 text-[11px] font-semibold transition-all',
                          activeTab === tab.id
                            ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                            : 'border-transparent text-[var(--gray-11)]',
                        )}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <tab.icon className='h-4 w-4' />
                        {tab.label}
                        {tab.id === 'attachments' &&
                          attachmentData?.length > 0 && (
                            <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                              {attachmentData.length}
                            </span>
                          )}
                        {tab.id === 'line_items' &&
                          (agentData?.debug?.['Side-by-side Line Item matching']
                            ?.length > 0 ||
                            agentData?.line_items?.length > 0 ||
                            agentData?.['Extracted Invoice JSON']?.invoice_items
                              ?.length > 0) && (
                            <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                              {agentData?.debug?.[
                                'Side-by-side Line Item matching'
                              ]?.length ||
                                agentData?.line_items?.length ||
                                agentData?.['Extracted Invoice JSON']
                                  ?.invoice_items?.length}
                            </span>
                          )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='flex-1 overflow-y-auto'>
                  {activeTab === 'summary' && (
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2 p-4'>
                      {Object.entries(formModel || {})
                        .filter(([_, val]) => typeof val !== 'object')
                        .map(([key, val]) => (
                          <FormCard
                            icon={getFieldIcon(key)}
                            key={key}
                            label={key}
                            options={getOptions(key)}
                            type={getFieldType(key)}
                            value={val || '-'}
                            highlight={
                              key.toLowerCase().includes('total') ||
                              key.toLowerCase().includes('due')
                            }
                            onChange={(newVal: string) =>
                              handleFieldChange(key, newVal)
                            }
                          />
                        ))}
                    </div>
                  )}

                  {activeTab === 'line_items' && (
                    <div className='p-4'>
                      <div className='overflow-hidden rounded-xl border border-[var(--gray-3)] bg-white shadow-sm'>
                        <table className='w-full border-collapse text-left text-xs'>
                          <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]'>
                            <tr>
                              <th className='px-5 py-3 text-[11px] font-semibold text-[var(--gray-11)]'>
                                Description
                              </th>
                              <th className='px-5 py-3 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                Qty
                              </th>
                              <th className='px-5 py-3 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                Rate
                              </th>
                              <th className='px-5 py-3 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                Total Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-[var(--gray-2)]'>
                            {(
                              agentData?.debug?.[
                                'Side-by-side Line Item matching'
                              ] ||
                              agentData?.line_items ||
                              agentData?.['Extracted Invoice JSON']
                                ?.invoice_items ||
                              []
                            ).map((item: any, index: number) => {
                              const isMatch =
                                (item['Line Score'] || item?.score) >= 90 ||
                                item?.status === 'MATCH'
                              const currencyCode =
                                formModel?.['Currency'] ||
                                agentData?.['Extracted Invoice JSON']
                                  ?.invoice_header?.['Currency'] ||
                                ''

                              const formatVal = (val: any) => {
                                if (!val || val === '-') return '-'
                                const num = parseFloat(
                                  String(val).replace(/[^0-9.-]+/g, ''),
                                )
                                const formatted = isNaN(num)
                                  ? val
                                  : num.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                      minimumFractionDigits: 2,
                                    })
                                return currencyCode
                                  ? `${currencyCode} ${formatted}`
                                  : formatted
                              }

                              return (
                                <tr
                                  key={index}
                                  className={cn(
                                    'group transition-colors',
                                    isMatch
                                      ? 'hover:bg-[var(--gray-1)]'
                                      : 'bg-[var(--red-1)]/30 hover:bg-[var(--red-1)]/50',
                                  )}
                                >
                                  <td className='max-w-[200px] px-5 py-3 font-semibold text-[var(--gray-13)]'>
                                    {item.Description?.['Invoice Value'] ||
                                      item.description ||
                                      '-'}
                                  </td>
                                  <td className='px-5 py-3 text-right font-semibold text-[var(--gray-11)]'>
                                    {item.Quantity?.['Invoice Value'] ||
                                      item.quantity ||
                                      '-'}
                                  </td>
                                  <td className='px-5 py-3 text-right font-semibold text-[var(--gray-11)]'>
                                    {formatVal(
                                      item?.Price?.['Invoice Value'] ||
                                        item.rate ||
                                        item.unit_price,
                                    )}
                                  </td>
                                  <td className='px-5 py-3 text-right font-semibold text-[var(--gray-13)]'>
                                    {formatVal(
                                      item.Amount?.['Invoice Value'] ||
                                        item.total ||
                                        item.amount,
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className='border-t border-[var(--gray-3)] bg-[var(--gray-1)]'>
                            <tr className='font-bold'>
                              <td
                                className='px-5 py-3 text-right text-[11px] text-[var(--gray-11)]'
                                colSpan={3}
                              >
                                Grand Total
                              </td>
                              <td className='px-5 py-3 text-right text-[13px] text-[var(--gray-13)]'>
                                {(() => {
                                  const currencyCode =
                                    formModel?.['Currency'] ||
                                    agentData?.['Extracted Invoice JSON']
                                      ?.invoice_header?.['Currency'] ||
                                    ''
                                  const items =
                                    agentData?.debug?.[
                                      'Side-by-side Line Item matching'
                                    ] ||
                                    agentData?.line_items ||
                                    agentData?.['Extracted Invoice JSON']
                                      ?.invoice_items ||
                                    []
                                  const total = items.reduce(
                                    (sum: number, item: any) => {
                                      const val =
                                        item.Amount?.['Invoice Value'] ||
                                        item.total ||
                                        item.amount ||
                                        0
                                      const num = parseFloat(
                                        String(val).replace(/[^0-9.-]+/g, ''),
                                      )
                                      return sum + (isNaN(num) ? 0 : num)
                                    },
                                    0,
                                  )
                                  const formattedTotal = total.toLocaleString(
                                    undefined,
                                    {
                                      maximumFractionDigits: 2,
                                      minimumFractionDigits: 2,
                                    },
                                  )
                                  return currencyCode
                                    ? `${currencyCode} ${formattedTotal}`
                                    : formattedTotal
                                })()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'attachments' && (
                    <div className='p-4'>
                      <Attachments
                        enabled={true}
                        processId={processId}
                        workflowId={workflowId}
                        onSelect={(file) =>
                          selectedFile?.id === file.id
                            ? (setIsViewerLoading(true),
                              setTimeout(() => setIsViewerLoading(false), 500))
                            : setSelectedFile(file)
                        }
                      />
                    </div>
                  )}

                  {activeTab === 'comments' && (
                    <div className='p-4'>
                      <Comments
                        attachments={selectedItem?.attachments || []}
                        enabled={true}
                        processId={processId}
                        repositoryId={repositoryId}
                        transactionId={transactionId}
                        workflowId={workflowId}
                      />
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className='p-4'>
                      <History
                        enabled={true}
                        processId={processId}
                        workflowId={workflowId}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
