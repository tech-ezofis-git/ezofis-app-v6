import { useEffect, useRef, useState } from 'react'
import folderApi from '@/api/folders/folders'
import requestApi from '@/api/requests/requests'
import workflowApi from '@/api/workflow/workflow'
// import { MOCK_INVOICE_DATA } from './mockData'
import showToast from '@/components/base/toast/showToast'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'
import Icon from '../../../../../../components/base/icon/Icon'
import {
  AnimateFadeIn,
  AnimateSlideUp,
  AnimateStagger,
} from '../../../../../../components/common/animations'
// import SummaryScreen from './SummaryScreen' // Replaced by Request
import Request from '../../Request'
import ProcessingScreen from './ProcessingScreen'
import { isPdf, MAX_SIZE, PDF_ACCEPT } from './utils'

const FileUpload = ({
  onClose,
  onRequestCreated,
}: {
  onClose?: () => void
  onRequestCreated?: () => void
}) => {
  const rawWorkflow = requestStore((state) => state.rawWorkflowData)
  const workflowRefresh = requestStore((state) => state.workflowRefresh)

  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  // const [isInvoiceUploading, setIsInvoiceUploading] = useState(false) // Removed unused state
  // const [uploadedInvoiceName, setUploadedInvoiceName] = useState<string | null>(null)

  // Flow State
  const [step, setStep] = useState<'upload' | 'processing' | 'summary'>(
    'upload',
  )
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')

  // API State
  const [repoData, setRepoData] = useState<any>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [fileData, setFileData] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Polling State
  const [pollingActive, setPollingActive] = useState(false)
  const [pollingProcessId, setPollingProcessId] = useState<number | null>(null)
  const [currentStage, setCurrentStage] = useState<string>('Start')
  const [fetchedRequestData, setFetchedRequestData] = useState<any>(null)

  // Trigger creation when entering processing step and upload is complete
  useEffect(() => {
    if (
      step === 'processing' &&
      uploadStatus === 'success' &&
      !pollingActive &&
      !pollingProcessId &&
      !isSubmitting
    ) {
      handleCreateRequest()
    }
  }, [step, uploadStatus])

  useEffect(() => {
    handleFolderFetch()
  }, [])

  // ... (Polling Effect remains the same) ...
  // Polling Effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (pollingActive && pollingProcessId && rawWorkflow?.id) {
      const pollData = async () => {
        try {
          console.log('Polling Process ID:', pollingProcessId)
          const payload = {
            currentPage: 1,
            filterBy: [],
            itemsPerPage: 5,
            sortBy: { criteria: '', order: 'DESC' },
          }

          console.log('Polling Payload:', payload)

          const findItemInResponse = (data: any) => {
            if (Array.isArray(data)) {
              for (const group of data) {
                if (group.items && Array.isArray(group.items)) {
                  const found = group.items.find(
                    (i: any) =>
                      String(i.processId) === String(pollingProcessId),
                  )
                  if (found) return found
                }
                if (group.value && Array.isArray(group.value)) {
                  const found = group.value.find(
                    (i: any) =>
                      String(i.processId) === String(pollingProcessId),
                  )
                  if (found) return found
                }
              }
            } else if (data?.data && Array.isArray(data.data)) {
              return data.data[0]
            }
            return null
          }

          // Check Sent List
          let response = await requestApi.getSentListById(
            rawWorkflow.id,
            payload,
          )
          console.log('Polling Response (SentList):', response)
          let item = response?.data ? findItemInResponse(response.data) : null

          // Fallback to Inbox List if not found
          if (!item) {
            console.log('Item not found in SentList, checking InboxList...')
            response = await requestApi.getInboxListById(
              rawWorkflow.id,
              payload,
            )
            console.log('Polling Response (InboxList):', response)
            item = response?.data ? findItemInResponse(response.data) : null
          }

          if (item) {
            console.log('Polling Item Found:', item)
            const stage = item.stage || item.activityName || 'Start'
            console.log('Current Stage:', stage)
            setCurrentStage(stage)

            if (
              stage === 'Verifier' ||
              stage === 'Approved' ||
              stage === 'Completed'
            ) {
              console.log(
                'Target Stage Reached. ProcessingScreen will handle transition.',
              )
              setPollingActive(false)
              setFetchedRequestData(item)
              // Do NOT setStep('summary') here; wait for ProcessingScreen animation completion
            }
          } else {
            console.log('Item NOT found in SentList or InboxList.')
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
      }

      // Poll every 10 seconds as requested (kept at 10s per recent request)
      intervalId = setInterval(pollData, 10000)

      // Initial call
      pollData()
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [pollingActive, pollingProcessId, rawWorkflow?.id])

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

  const handleInvoiceFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    const validFiles = files.filter((f) => isPdf(f) && f.size <= MAX_SIZE)

    if (validFiles.length) {
      if (!rawWorkflow?.repositoryId) {
        showToast({
          message: 'Repository ID is missing. Cannot upload.',
          variant: 'error',
        })
        return
      }

      setUploadedFile(validFiles[0])
      // setUploadedInvoiceName(validFiles[0].name);
      setUploadStatus('uploading')
      setStep('processing') // Immediate Transition

      try {
        // setIsInvoiceUploading(true); // No longer needed
        const fieldData: any = []

        // Logic from snippet
        if (repoData?.data?.fields) {
          const highestLevelObject = repoData?.data?.fields.reduce(
            (acc: any, curr: any) => {
              return curr.level > acc.level ? curr : acc
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
        formData.append('repositoryId', repoData?.data?.id)
        formData.append('fields', JSON.stringify(fieldData))
        formData.append('fileName', validFiles[0].name)

        const { data, error } = await folderApi.uploadFileWithIndex(formData)
        if (data) {
          setFileId(data?.fileId)
          setFileData(validFiles[0])
          setUploadStatus('success')
          // showToast({ message: "File uploaded successfully", variant: "success" });
          // No timeout needed here, logic above handles next step
        }
        if (error) {
          setUploadStatus('error')
          showToast({ message: 'Error uploading file', variant: 'error' })
        }
      } catch (error) {
        console.error(error)
        setUploadStatus('error')
        showToast({ message: 'Exception uploading file', variant: 'error' })
      }
    }
    resetInput(invoiceInputRef)
  }

  // ... (handleCreateRequest remains the same) ...
  const handleCreateRequest = async () => {
    if (!fileId || !fileData || isSubmitting) return

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
        showToast({
          message: 'New Request created successfully',
          toastTitle: response?.data?.requestNo,
          variant: 'success',
        })

        // Start Polling instead of finishing immediately
        if (response?.data?.processId) {
          setPollingProcessId(response.data.processId)
          setPollingActive(true)
          setCurrentStage('Start')
        } else {
          // Fallback if no processId
          workflowRefresh()
          setStep('summary')
          if (onRequestCreated) onRequestCreated()
        }
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

  // Step 2: Processing Screen
  if (step === 'processing') {
    return (
      <AnimateFadeIn className='h-full w-full'>
        <ProcessingScreen
          file={uploadedFile}
          fileId={fileId ? Number(fileId) : null}
          stage={currentStage}
          uploadStatus={uploadStatus}
          repositoryId={
            rawWorkflow?.repositoryId ? Number(rawWorkflow.repositoryId) : null
          }
          onComplete={() => setStep('summary')}
          onRedirect={() => {
            requestStore.getState().setRequestListTab('Sent')
            if (onClose) onClose()
          }}
        />
      </AnimateFadeIn>
    )
  }

  // Step 3: Summary Screen (Replaced with Request Overview)
  if (step === 'summary') {
    return (
      <AnimateFadeIn className='fixed inset-0 z-[100] bg-white'>
        {/* Pass the live fetched data to Request */}
        <Request
          hideActions={true}
          item={fetchedRequestData}
          workflowId={rawWorkflow?.id}
          onBack={() => onClose?.()}
          onNext={undefined}
          onPrev={undefined}
        />
      </AnimateFadeIn>
    )
  }

  // Step 1: Upload (Existing UI)
  return (
    <AnimateFadeIn className='flex min-h-[calc(100vh-150px)] flex-col items-center justify-center overflow-y-auto bg-surface-muted px-4 py-4 sm:px-6 lg:px-10 lg:py-6'>
      <div className='grid w-full max-w-6xl grid-cols-1 items-center gap-6 xl:grid-cols-2 xl:gap-8 2xl:gap-12'>
        {/* Left Column: Upload Hub */}
        <AnimateSlideUp className='relative w-full'>
          <div className='group relative overflow-hidden rounded-[2.5rem] border border-[var(--gray-3)] bg-white p-2 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl'>
            <div
              className={[
                'rounded-[2.2rem] border-2 border-dashed border-[var(--primary-4)] p-6 lg:p-8 xl:p-10 2xl:p-14',
                'flex cursor-pointer flex-col items-center text-center transition-all duration-300 ease-out',
                isDragOver
                  ? 'scale-[0.99] border-[var(--primary-6)] bg-[var(--primary-1)]/80'
                  : 'hover:border-[var(--primary-5)] hover:bg-[var(--primary-1)]/60',
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
              <AnimateStagger className='z-10 flex w-full flex-col items-center'>
                {/* Icon Container */}
                <div className='mb-6 flex size-16 items-center justify-center rounded-2xl bg-[var(--primary-1)] transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--primary-2)] 2xl:mb-8 2xl:size-20'>
                  <Icon
                    className='size-8 text-[var(--primary-9)] transition-colors duration-300 2xl:size-9'
                    name='tabler:cloud-upload'
                  />
                </div>

                {/* Headline */}
                <h2 className='mb-3 text-2xl font-bold tracking-tight text-[var(--gray-13)] transition-colors duration-300 group-hover:text-[var(--primary-10)] 2xl:text-3xl'>
                  Drop your file here, or{' '}
                  <span className='text-[var(--primary-9)] underline decoration-transparent transition-all duration-300 group-hover:decoration-[var(--primary-9)]'>
                    browse
                  </span>
                </h2>

                {/* Subtext */}
                <p className='mb-6 text-sm font-medium text-[var(--gray-9)] 2xl:mb-10 2xl:text-base'>
                  Supports PDF Files · Max 4 MB
                </p>

                {/* File Format Pills */}
                <div className='flex flex-wrap items-center justify-center gap-3'>
                  <div className='flex items-center gap-2 rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-2'>
                    <Icon
                      className='size-5 text-[var(--red-9)]'
                      name='tabler:file-type-pdf'
                    />
                    <span className='text-xs font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                      PDF
                    </span>
                  </div>
                </div>
              </AnimateStagger>

              <input
                accept={PDF_ACCEPT}
                className='hidden'
                ref={invoiceInputRef}
                type='file'
                multiple
                onChange={(e) => handleInvoiceFiles(e.target.files)}
              />

              {/* Upload State Overlay */}
              {/* {isInvoiceUploading && (
                                <AnimateFadeIn className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-[2.2rem]">
                                    <div className="size-16 rounded-full border-[4px] border-[var(--gray-2)] border-t-[var(--primary-9)] animate-spin mb-4" />
                                    <h3 className="text-xl font-bold text-[var(--gray-12)]">Uploading Invoice...</h3>
                                    <p className="text-[var(--gray-9)] mt-2">Processing your document</p>
                                </AnimateFadeIn>
                            )} */}
            </div>
          </div>
        </AnimateSlideUp>

        {/* Right Column: Info & Features */}
        <div className='relative flex flex-col gap-6 lg:pl-4 2xl:gap-8'>
          <AnimateSlideUp delay={0.1}>
            <h1 className='mb-4 text-2xl font-bold text-[var(--gray-13)] 2xl:mb-6 2xl:text-3xl'>
              Intelligent{' '}
              <span className='text-[var(--primary-9)]'>AP Agent</span>
            </h1>
            <div className='rounded-3xl border border-[var(--gray-4)] bg-[var(--gray-3)] p-5 2xl:p-6'>
              <p className='text-sm leading-relaxed font-medium text-[var(--gray-11)]'>
                Streamline your Accounts Payable. Automatically process
                invoices, match Purchase Orders, and gain complete visibility
                into all your payables from a single dashboard.
              </p>
            </div>
          </AnimateSlideUp>

          <div className='space-y-3 2xl:space-y-4'>
            <div className='text-gray-400 mb-1 pl-1 text-[10px] font-bold tracking-widest uppercase 2xl:mb-2'>
              POST-UPLOAD CAPABILITIES
            </div>

            {[
              {
                color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
                icon: 'tabler:bolt',
                sub: 'Extract and validate invoice data instantly.',
                title: 'Instant Invoice Processing',
              },
              {
                color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
                icon: 'tabler:arrows-join',
                sub: 'Link invoices to POs with high precision.',
                title: 'Smart PO Matching',
              },
              {
                color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
                icon: 'tabler:chart-pie',
                sub: 'Comprehensive insights into your financial liabilities.',
                title: 'Payables Overview',
              },
            ].map((item, idx) => (
              <AnimateSlideUp
                className='group'
                delay={0.2 + idx * 0.1}
                key={idx}
              >
                <div className='flex items-start gap-4 rounded-2xl border border-[var(--gray-3)] bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md 2xl:p-4'>
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg 2xl:size-10 ${item.color} mt-1`}
                  >
                    <Icon className='size-5' name={item.icon} />
                  </div>
                  <div>
                    <h4 className='text-sm font-bold text-[var(--gray-13)]'>
                      {item.title}
                    </h4>
                    <p className='mt-1 text-xs leading-snug text-[var(--gray-10)]'>
                      {item.sub}
                    </p>
                  </div>
                </div>
              </AnimateSlideUp>
            ))}
          </div>
        </div>
      </div>
    </AnimateFadeIn>
  )
}

export default FileUpload
