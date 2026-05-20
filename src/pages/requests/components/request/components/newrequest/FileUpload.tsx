import { useEffect, useRef, useState } from 'react'
import folderApi from '@/api/folders/folders'
import workflowApi from '@/api/workflow/workflow'
import sample1 from '@/assets/Sample Invoices/Sample Invoices-1.pdf'
import sample10 from '@/assets/Sample Invoices/Sample Invoices-10.pdf'
import sample2 from '@/assets/Sample Invoices/Sample Invoices-2.pdf'
import sample3 from '@/assets/Sample Invoices/Sample Invoices-3.pdf'
import sample4 from '@/assets/Sample Invoices/Sample Invoices-4.pdf'
import sample5 from '@/assets/Sample Invoices/Sample Invoices-5.pdf'
import sample6 from '@/assets/Sample Invoices/Sample Invoices-6.pdf'
import sample7 from '@/assets/Sample Invoices/Sample Invoices-7.pdf'
import sample8 from '@/assets/Sample Invoices/Sample Invoices-8.pdf'
import sample9 from '@/assets/Sample Invoices/Sample Invoices-9.pdf'
import showToast from '@/components/base/toast/showToast'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'
import Icon from '../../../../../../components/base/icon/Icon'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateSlideUp,
  AnimateStagger,
} from '../../../../../../components/common/animations'
import { IMAGE_ACCEPT, isImage, isPdf, MAX_SIZE, PDF_ACCEPT } from './utils'

const SAMPLE_DOCUMENTS = [
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-1.pdf',
    size: '321 KB',
    url: sample1,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-2.pdf',
    size: '321 KB',
    url: sample2,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-3.pdf',
    size: '321 KB',
    url: sample3,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-4.pdf',
    size: '321 KB',
    url: sample4,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-5.pdf',
    size: '321 KB',
    url: sample5,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-6.pdf',
    size: '321 KB',
    url: sample6,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-7.pdf',
    size: '321 KB',
    url: sample7,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-8.pdf',
    size: '321 KB',
    url: sample8,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-9.pdf',
    size: '321 KB',
    url: sample9,
  },
  {
    icon: 'tabler:file-invoice',
    name: 'Sample Invoices-10.pdf',
    size: '321 KB',
    url: sample10,
  },
]

const FileUpload = ({ onClose }: { onClose?: () => void }) => {
  const rawWorkflow = requestStore((state) => state.rawWorkflowData)
  const workflowRefresh = requestStore((state) => state.workflowRefresh)

  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  // const [isInvoiceUploading, setIsInvoiceUploading] = useState(false) // Removed unused state
  // const [uploadedInvoiceName, setUploadedInvoiceName] = useState<string | null>(null)

  // Flow State
  const [fileData, setFileData] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')

  // API State
  const [repoData, setRepoData] = useState<any>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    handleFolderFetch()
  }, [])

  // Trigger creation automatically when upload is complete
  useEffect(() => {
    if (uploadStatus === 'success' && fileId && fileData && !isSubmitting) {
      handleCreateRequest()
    }
  }, [uploadStatus, fileId, fileData])

  const handleFolderFetch = async () => {
    if (!rawWorkflow?.repositoryId) return
    try {
      const response = await folderApi.fetchFoldersById(
        rawWorkflow?.repositoryId,
      )
      if (response) setRepoData(response)
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }

  const resetInput = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) ref.current.value = ''
  }

  const handleInvoiceFiles = async (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? [])
    const validFiles = files.filter(
      (f) => (isPdf(f) || isImage(f)) && f.size <= MAX_SIZE,
    )

    console.log('Files selected:', files)
    console.log('Valid files:', validFiles)
    console.log('Raw Workflow:', rawWorkflow)
    console.log('Repo Data:', repoData)

    if (!validFiles.length && files.length > 0) {
      const tooLarge = files.some((f) => f.size > MAX_SIZE)
      const invalidType = files.some((f) => !isPdf(f) && !isImage(f))

      if (tooLarge)
        showToast({
          message: 'File is too large. Max size is 4MB.',
          variant: 'error',
        })
      else if (invalidType)
        showToast({
          message: 'Invalid file type. Please upload a PDF or Image.',
          variant: 'error',
        })
      else showToast({ message: 'No valid files selected.', variant: 'error' })

      resetInput(invoiceInputRef)
      return
    }

    if (validFiles.length) {
      if (!rawWorkflow?.repositoryId) {
        console.error('Missing repositoryId in rawWorkflow:', rawWorkflow)
        showToast({
          message: 'Repository ID is missing. Cannot upload.',
          variant: 'error',
        })
        return
      }
      if (!repoData?.data?.id) {
        console.error('Missing repoData.data.id:', repoData)
        // Attempt to fetch again if missing
        handleFolderFetch()
        showToast({
          message:
            'Repository folder data is missing. Please try again in a moment.',
          variant: 'error',
        })
        return
      }

      setFileData(validFiles[0])
      setUploadStatus('uploading')

      try {
        const fieldData: any = []

        if (repoData?.data?.fields) {
          const highestLevelObject = repoData?.data?.fields.reduce(
            (acc: any, curr: any) => {
              return (curr.level || 0) > (acc.level || 0) ? curr : acc
            },
          )

          repoData?.data?.fields.forEach((item: any) => {
            fieldData.push({
              id: item.id,
              name: item.name,
              type: item.dataType,
              value:
                highestLevelObject?.id == item?.id ? validFiles[0].name : '',
            })
          })
        }

        const formData = new FormData()
        formData.append('file', validFiles[0])
        formData.append('repositoryId', String(repoData?.data?.id))
        formData.append('fields', JSON.stringify(fieldData))
        formData.append('fileName', validFiles[0].name)

        console.log('Uploading file with formData:', {
          fieldCount: fieldData.length,
          fileName: validFiles[0].name,
          repositoryId: repoData?.data?.id,
        })

        const { data, error } = await folderApi.uploadFileWithIndex(formData)
        if (data) {
          console.log('Upload success:', data)
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data
          setFileId(parsedData?.fileId || data?.fileId)
          setUploadStatus('success')
        }
        if (error) {
          console.error('Upload error:', error)
          setUploadStatus('error')
          showToast({
            message: `Error uploading file: ${error}`,
            variant: 'error',
          })
        }
      } catch (error: any) {
        console.error('Upload exception:', error)
        setUploadStatus('error')
        showToast({
          message: `Exception uploading file: ${error.message || error}`,
          variant: 'error',
        })
      }
    }
    resetInput(invoiceInputRef)
  }

  const handleSampleSelect = async (doc: (typeof SAMPLE_DOCUMENTS)[0]) => {
    try {
      setUploadStatus('uploading')
      const response = await fetch(doc.url)
      const blob = await response.blob()
      const file = new File([blob], doc.name, { type: 'application/pdf' })

      setUploadStatus('idle')
      handleInvoiceFiles([file])
    } catch (error) {
      console.error('Failed to load sample document', error)
      setUploadStatus('idle')
      showToast({
        message: 'Failed to load sample document.',
        variant: 'error',
      })
    }
  }

  // ... (handleCreateRequest remains the same) ...
  const handleCreateRequest = async () => {
    if (!fileId || !fileData) {
      console.error('Cannot create request: missing fileId or fileData', {
        fileData,
        fileId,
      })
      if (uploadStatus === 'success') {
        showToast({
          message:
            'Request creation failed: missing file reference. Please try again.',
          variant: 'error',
        })
      }
      return
    }
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      const payload = {
        comments: [],
        fileIds: [],
        formData: {
          fields: {
            '9l_i90JwGJV3WGDGv3dj6': [
              {
                createdAt: new Date().toISOString(),
                createdBy: authUserStore.getState()?.session?.email,
                fileId: fileId,
                name: fileData?.name,
                size: fileData?.size,
                uploadedPercentage: 100,
              },
            ],
          },
          formId: rawWorkflow?.wFormId,
          formUpload: [
            {
              fileIds: [fileId],
              isStage: true,
              jsonId: '9l_i90JwGJV3WGDGv3dj6',
              rowid: 0,
            },
          ],
        },
        hasFormPDF: 0,
        mlPrediction: '',
        prefix: '',
        review: 'Submit',
        task: [],
        workflowId: rawWorkflow?.id,
      }

      const response = await workflowApi?.createProcessTransaction(payload)

      // Log response as requested
      console.log('Process Transaction Created Response:', response)

      if (!response?.error) {
        const processId = response?.data?.processId
        const requestNo = response?.data?.requestNo

        // Add to background processing
        if (processId) {
          requestStore.getState().addProcessingProcess({
            fileId,
            id: processId,
            name: fileData?.name,
            processId,
            repositoryId: rawWorkflow?.repositoryId,
            requestNo,
            stage: 'Start',
            workflowId: rawWorkflow?.id,
          })
        }

        // Trigger list refresh
        workflowRefresh()

        // Close the upload sheet immediately
        if (onClose) onClose()
      }
    } catch (e) {
      console.error(e)
      setIsSubmitting(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // const handleCancel = () => {
  //     setUploadedInvoiceName(null)
  //     setUploadedFile(null)
  //     setStep('upload')
  // }

  // Step 1: Upload (Premium Centered UI)
  return (
    <AnimateFadeIn className='flex h-full flex-col items-center justify-center overflow-y-auto bg-surface-muted px-4 py-4 sm:px-6 lg:px-8'>
      <div className='flex w-full max-w-4xl flex-col items-center gap-6'>
        {/* Header Section */}
        <AnimateSlideUp className='space-y-1 text-center'>
          <h1 className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
            Intelligent{' '}
            <span className='text-[var(--primary-9)]'>AP Agent</span>
          </h1>
          <p className='mx-auto max-w-xl text-sm font-medium text-[var(--gray-10)]'>
            Streamline your Accounts Payable. Automatically process invoices,
            match Purchase Orders, and gain complete visibility.
          </p>
        </AnimateSlideUp>

        {/* Main Upload Hub */}
        <AnimateSlideUp className='w-full max-w-4xl' delay={0.1}>
          <div className='group relative flex h-auto flex-col gap-2 rounded-2xl border border-[var(--gray-3)] bg-white p-2 shadow-sm transition-all duration-700 hover:-translate-y-1 hover:shadow-xl md:h-[280px] md:flex-row'>
            {/* Interactive "Loading/Scanning" Hover Effect */}
            <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
              <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-[var(--primary-2)]/20 to-transparent' />
            </div>

            {/* Left: Drag & Drop Zone */}
            <div
              className={[
                'h-full flex-1 rounded-xl border-[2px] border-dashed border-[var(--primary-4)] p-4 lg:p-6',
                'relative z-10 flex cursor-pointer flex-col items-center justify-center text-center transition-all duration-500 ease-out',
                isDragOver
                  ? 'scale-[0.99] border-[var(--primary-6)] bg-[var(--primary-1)]'
                  : 'bg-white hover:border-[var(--primary-5)] hover:bg-[var(--primary-1)]/30',
                uploadStatus === 'uploading' || isSubmitting
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
              {uploadStatus === 'uploading' || isSubmitting ? (
                <div className='flex flex-col items-center py-8'>
                  <div className='mb-6 flex size-16 animate-pulse items-center justify-center rounded-full bg-[var(--primary-1)]'>
                    <Icon
                      className='size-8 animate-spin text-[var(--primary-9)]'
                      name='tabler:loader-2'
                    />
                  </div>
                  <h2 className='mb-2 animate-pulse text-xl font-bold text-[var(--gray-13)]'>
                    {uploadStatus === 'uploading'
                      ? 'Uploading Invoice...'
                      : 'Creating Request...'}
                  </h2>
                  <p className='text-sm font-medium text-[var(--gray-10)]'>
                    Please wait while we process your document
                  </p>
                </div>
              ) : (
                <AnimateStagger className='flex w-full flex-col items-center'>
                  <div className='mb-3 flex size-12 items-center justify-center rounded-2xl bg-[var(--primary-1)] shadow-sm transition-all duration-500 group-hover:scale-110'>
                    <Icon
                      className='size-6 text-[var(--primary-9)]'
                      name='tabler:cloud-upload'
                    />
                  </div>
                  <h2 className='mb-1.5 text-lg font-medium tracking-tight text-[var(--gray-13)]'>
                    Drop your file here, or{' '}
                    <span className='text-[var(--primary-9)]'>browse</span>
                  </h2>
                  <p className='mb-0 text-[11px] font-medium text-[var(--gray-9)]'>
                    Supports PDF and Images · Max 4 MB
                  </p>
                </AnimateStagger>
              )}

              <input
                accept={`${PDF_ACCEPT},${IMAGE_ACCEPT}`}
                className='hidden'
                ref={invoiceInputRef}
                type='file'
                multiple
                onChange={(e) => handleInvoiceFiles(e.target.files)}
              />
            </div>

            {/* Right: Sample Documents Panel */}
            <div className='relative z-10 flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] md:w-72'>
              <div className='shrink-0 border-b border-[var(--gray-3)] bg-white/50 p-3 backdrop-blur-sm'>
                <p className='text-xs font-bold tracking-widest text-[var(--gray-11)] uppercase'>
                  Quick Try
                </p>
                <p className='mt-0.5 text-[10px] font-medium text-[var(--gray-9)]'>
                  Select a sample to process
                </p>
              </div>
              <div className='custom-scrollbar flex-1 space-y-1.5 overflow-y-auto p-2'>
                {SAMPLE_DOCUMENTS.map((doc, idx) => (
                  <button
                    className='group/btn flex w-full items-center gap-3 rounded-lg border border-[var(--gray-3)] bg-white p-2 text-left transition-all duration-300 hover:border-[var(--primary-5)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={uploadStatus === 'uploading' || isSubmitting}
                    key={idx}
                    onClick={() => handleSampleSelect(doc)}
                  >
                    <div className='flex size-8 shrink-0 items-center justify-center rounded bg-[var(--gray-2)] transition-colors duration-300 group-hover/btn:bg-[var(--primary-1)]'>
                      <Icon
                        className='size-4 text-[var(--gray-11)] transition-colors duration-300 group-hover/btn:text-[var(--primary-9)]'
                        name={doc.icon}
                      />
                    </div>
                    <div className='flex min-w-0 flex-col'>
                      <span className='truncate text-[11px] font-semibold text-[var(--gray-13)] transition-colors duration-300 group-hover/btn:text-[var(--primary-9)]'>
                        {doc.name.replace('.pdf', '')}
                      </span>
                      <span className='text-[9px] font-medium text-[var(--gray-9)]'>
                        {doc.size}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AnimateSlideUp>

        {/* Bottom Capabilities - Kept from original but repositioned */}
        <div className='grid w-full grid-cols-1 gap-6 md:grid-cols-3'>
          {[
            {
              color: 'text-[var(--orange-9)] bg-[var(--orange-2)]',
              icon: 'tabler:bolt',
              sub: 'AI-powered extraction in seconds',
              title: 'Instant Processing',
            },
            {
              color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
              icon: 'tabler:sparkles',
              sub: 'Link invoices to POs with precision.',
              title: 'Smart PO Matching',
            },
            {
              color: 'text-emerald-600 bg-[#ecfdf5]',
              icon: 'tabler:clock',
              sub: 'Insights into your liabilities.',
              title: 'Payables Overview',
            },
          ].map((item, idx) => (
            <AnimateEntrancePop delay={0.4 + idx * 0.1} key={idx}>
              <div className='group flex h-full flex-col items-start rounded-xl border border-[var(--gray-3)] bg-white p-6 text-left shadow-sm transition-all duration-300 hover:shadow-md'>
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg 2xl:size-10 ${item.color} mt-1 mb-4 transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon
                    className='size-5 transition-transform duration-300 group-hover:rotate-6'
                    name={item.icon}
                  />
                </div>
                <h4 className='text-sm font-medium tracking-tight text-[var(--gray-13)]'>
                  {item.title}
                </h4>
                <p className='mt-2 text-xs leading-relaxed font-medium text-[var(--gray-10)]'>
                  {item.sub}
                </p>
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
