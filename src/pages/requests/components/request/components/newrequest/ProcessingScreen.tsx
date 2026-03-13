import {
  type Plugin,
  SpecialZoomLevel,
  Viewer,
  Worker,
} from '@react-pdf-viewer/core'
import { useEffect, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import BarLoader from '@/components/base/BarLoader'
import '@react-pdf-viewer/core/lib/styles/index.css'
import Icon from '@/components/base/icon/Icon'

interface ProcessingScreenProps {
  file: File | null
  fileId: number | null
  repositoryId: number | null
  stage: string
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
  onComplete: () => void
  onRedirect?: () => void
}

const ProcessingScreen = ({
  file,
  fileId,
  repositoryId,
  stage,
  uploadStatus,
  onComplete,
  onRedirect,
}: ProcessingScreenProps) => {
  const [step, setStep] = useState(0)
  const [loadingTextIndex, setLoadingTextIndex] = useState(0)
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false)

  // File Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)

  // Viewer State
  // // const [scale, setScale] = useState(1);
  // const [currentPage, setCurrentPage] = useState(0);
  // const [totalPages, setTotalPages] = useState(0);
  const viewerRef = useRef<any>(null)

  const loadingPhrases = [
    'Extracting text layers',
    'Parsing document structure',
    'Identifying key-value pairs',
    'Normalizing character sets',
    'Analyzing spatial layout',
  ]

  // Custom Plugin to expose viewer methods
  const toolbarPlugin = (): Plugin => {
    return {
      install: (pluginFunctions) => {
        viewerRef.current = pluginFunctions
      },
      // onDocumentLoad: (e) => {
      //     setTotalPages(e.doc.numPages);
      //     setCurrentPage(0);
      // },
      // onPageChange: (e) => {
      //     setCurrentPage(e.currentPage);
      // },
      // onZoom: (e: any) => {
      //     setScale(e.scale);
      // }
    }
  }

  // Memoize the plugin instance to prevent re-creation on render
  // However, since we need to capture the ref and it doesn't depend on props, we can just use a constant reference or create it once.
  // In React 18 strict mode, this might be called twice, but install will update the ref.
  const toolbarPluginInstance = useRef(toolbarPlugin()).current

  // const handleZoomIn = () => {
  //     if (viewerRef.current) {
  //         viewerRef.current.zoom(scale + 0.1);
  //     }
  // };

  // const handleZoomOut = () => {
  //     if (viewerRef.current) {
  //         viewerRef.current.zoom(Math.max(0.1, scale - 0.1));
  //     }
  // };

  // const handlePrevPage = () => {
  //     if (viewerRef.current && currentPage > 0) {
  //         viewerRef.current.jumpToPage(currentPage - 1);
  //     }
  // };

  // const handleNextPage = () => {
  //     if (viewerRef.current && currentPage < totalPages - 1) {
  //         viewerRef.current.jumpToPage(currentPage + 1);
  //     }
  // };

  // Fetch File Data from API
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setFileType(file.type)
      return () => URL.revokeObjectURL(url)
    }
    const fetchFile = async () => {
      if (fileId && repositoryId) {
        // Hardcoded parameters
        const tId = 2
        const uId = '2'
        const type = 1 // 2 for file

        try {
          const response = await fileApi.viewBinary(
            tId,
            uId,
            repositoryId,
            fileId,
            type,
          )

          if (response?.file) {
            const base64 = response.file
            let mimeType = 'application/pdf' // Default fallback

            // Simple signature detection
            if (base64.startsWith('/9j/')) mimeType = 'image/jpeg'
            else if (base64.startsWith('iVBORw0KGgo')) mimeType = 'image/png'
            else if (base64.startsWith('JVBERi0')) mimeType = 'application/pdf'

            const url = `data:${base64}`
            setPreviewUrl(url)
            setFileType(mimeType)
          }
        } catch (error) {
          console.error('Error fetching file:', error)
        }
      }
    }

    fetchFile()
  }, [fileId, repositoryId, file])

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => {
        if (prev >= loadingPhrases.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    // Check if step is 1 (Extraction)
    if (step === 1) {
      timer = setTimeout(() => {
        setShowLongWaitMessage(true)
      }, 40000) // 40s wait
    } else {
      setShowLongWaitMessage(false)
    }
    return () => clearTimeout(timer)
  }, [step])

  const getTargetStep = (s: string) => {
    const lower = s.toLowerCase()
    if (lower === 'verifier' || lower === 'approved' || lower === 'completed')
      return 3
    if (lower === 'ap agent' || lower.includes('matching')) return 2
    if (lower === 'start' || lower.includes('extract')) return 1
    return 0
  }

  const targetStep = getTargetStep(stage)

  useEffect(() => {
    if (uploadStatus === 'uploading' || uploadStatus === 'error') return

    if (step < targetStep) {
      let delay = 1500
      if (step === 2) delay = 10000

      const timer = setTimeout(() => {
        setStep((prev) => prev + 1)
      }, delay)
      return () => clearTimeout(timer)
    } else if (step === 3 && targetStep === 3) {
      const timer = setTimeout(() => {
        onComplete()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [step, targetStep, onComplete, uploadStatus])

  useEffect(() => {
    if (showLongWaitMessage && onRedirect) {
      const timer = setTimeout(() => {
        onRedirect()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showLongWaitMessage, onRedirect])

  return (
    <div className='box-border h-[calc(100vh-110px)] w-full overflow-hidden p-4 lg:p-6'>
      <div className='mx-auto grid h-full max-w-[1600px] grid-cols-12 gap-4 2xl:gap-6'>
        {/* Left Column: File Preview */}
        <section className='group relative col-span-8 flex h-full min-h-0 flex-col'>
          <div className='relative flex h-full flex-grow items-center justify-center overflow-hidden rounded-xl border border-[var(--gray-6)] bg-[var(--gray-3)] shadow-inner'>
            <div className='absolute inset-0 z-0 h-full w-full overflow-hidden'>
              {previewUrl ? (
                fileType === 'application/pdf' ? (
                  <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'>
                    <div className='relative h-full w-full overflow-hidden'>
                      <Viewer
                        defaultScale={SpecialZoomLevel.PageFit}
                        fileUrl={previewUrl}
                        plugins={[toolbarPluginInstance]}
                      />
                    </div>
                  </Worker>
                ) : (
                  <img
                    alt='Document Preview'
                    className='h-full w-full object-contain'
                    src={previewUrl}
                  />
                )
              ) : (
                <div className='flex h-full flex-col items-center justify-center text-[var(--gray-8)]'>
                  <BarLoader />
                  <p className='mt-4 text-sm font-medium'>
                    Loading document...
                  </p>
                </div>
              )}
            </div>

            {/* Floating Toolbar */}
            {/* {previewUrl && fileType === 'application/pdf' && (
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-[var(--gray-4)] shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={handleZoomOut}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] transition-colors"
                                    title="Zoom Out"
                                >
                                    <Icon name="material-symbols:remove" className="text-lg" />
                                </button>
                                <span className="text-sm font-medium text-[var(--gray-12)] min-w-[3rem] text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] transition-colors"
                                    title="Zoom In"
                                >
                                    <Icon name="material-symbols:add" className="text-lg" />
                                </button>
                                <div className="w-px h-4 bg-[var(--gray-5)] mx-1" />
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 0}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] disabled:opacity-50 transition-colors"
                                    title="Previous Page"
                                >
                                    <Icon name="material-symbols:chevron-left" className="text-lg" />
                                </button>
                                <span className="text-sm font-medium text-[var(--gray-12)]">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages - 1}
                                    className="p-1.5 hover:bg-[var(--gray-3)] rounded-full text-[var(--gray-11)] disabled:opacity-50 transition-colors"
                                    title="Next Page"
                                >
                                    <Icon name="material-symbols:chevron-right" className="text-lg" />
                                </button>
                            </div>
                        )} */}

            {/* Scanner effect wrapper - Visible during processing (steps 0, 1, 2) */}
            {previewUrl && step < 3 && (
              <div className='pointer-events-none absolute inset-0 z-10'>
                <div className='absolute inset-0 bg-[var(--primary-9)]/5'></div>
                <div className='scanning-bar animate-scan absolute inset-x-0 z-20 h-1 bg-[var(--primary-9)] shadow-[0_0_15px_rgba(var(--primary-9),0.8)]'></div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Timeline */}
        <section className='col-span-4 flex h-full min-h-0 flex-col'>
          <div className='relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--gray-3)] bg-white p-4 shadow-sm 2xl:p-6'>
            <div className='mb-2 flex shrink-0 items-center justify-between 2xl:mb-4'>
              <h2 className='text-base font-bold text-[var(--gray-12)] 2xl:text-lg'>
                Processing Timeline
              </h2>
            </div>

            {/* Use flex-1 and justify-between to distribute space evenly so it fits without scroll */}
            <div className='relative flex min-h-0 flex-1 flex-col justify-between py-1 pl-1 2xl:py-2'>
              {/* Vertical Line - Absolute across the flex container */}
              <div className='absolute top-3 bottom-3 left-[1.15rem] -z-0 w-0.5 bg-[var(--gray-3)] 2xl:top-4 2xl:bottom-4 2xl:left-6'>
                <div
                  className='absolute top-0 left-0 w-full bg-[var(--primary-9)] transition-all duration-1000 ease-linear'
                  style={{ height: `${(step / 3) * 100}%` }}
                ></div>
              </div>

              {/* Step 1: Upload */}
              <div className='relative z-10 flex items-start space-x-4 2xl:space-x-6'>
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${
                    uploadStatus === 'success'
                      ? 'bg-[var(--green-9)]'
                      : uploadStatus === 'error'
                        ? 'bg-[var(--red-9)]'
                        : 'bg-[var(--primary-9)]'
                  }`}
                >
                  {uploadStatus === 'success' ? (
                    <Icon
                      className='text-base text-white 2xl:text-lg'
                      name='material-symbols:check'
                    />
                  ) : uploadStatus === 'error' ? (
                    <Icon
                      className='text-base text-white 2xl:text-lg'
                      name='material-symbols:error-outline'
                    />
                  ) : (
                    <Icon
                      className='animate-spin text-base text-white 2xl:text-lg'
                      name='tabler:rotate-clockwise-2'
                    />
                  )}
                </div>
                <div className='pt-0.5 2xl:pt-1'>
                  <p
                    className={`text-sm font-bold transition-colors duration-300 2xl:text-base ${
                      uploadStatus === 'success'
                        ? 'text-[var(--green-11)]'
                        : uploadStatus === 'error'
                          ? 'text-[var(--red-11)]'
                          : 'text-[var(--primary-11)]'
                    }`}
                  >
                    {uploadStatus === 'success'
                      ? 'File uploaded successfully'
                      : uploadStatus === 'error'
                        ? 'Upload failed'
                        : 'Uploading file...'}
                  </p>
                  <p className='mt-0.5 text-xs text-[var(--gray-10)] 2xl:mt-1 2xl:text-sm'>
                    {file?.name} {uploadStatus === 'success' && '(Verified)'}
                  </p>
                  {uploadStatus === 'error' && (
                    <p className='mt-0.5 text-[10px] text-[var(--red-9)] 2xl:mt-1 2xl:text-xs'>
                      Please try again.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Extraction */}
              <div
                className={`relative z-10 flex items-start space-x-4 opacity-100 transition-opacity duration-300 2xl:space-x-6`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${step >= 1 ? (step > 1 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-[var(--primary-9)] shadow-[var(--primary-9)]/30') : 'border-2 border-[var(--gray-4)] bg-white'}`}
                >
                  {step > 1 ? (
                    <Icon
                      className='text-base text-white 2xl:text-lg'
                      name='material-symbols:check'
                    />
                  ) : step === 1 ? (
                    <Icon
                      className='animate-spin text-base text-white 2xl:text-lg'
                      name='tabler:rotate-clockwise-2'
                    />
                  ) : (
                    <div className='h-2 w-2 rounded-full bg-[var(--gray-4)] 2xl:h-2.5 2xl:w-2.5' />
                  )}
                </div>
                <div className='w-full pt-0.5 2xl:pt-1'>
                  <p
                    className={`flex items-center text-sm font-bold transition-colors duration-300 2xl:text-base ${step === 1 ? 'text-[var(--primary-9)]' : step > 1 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]'}`}
                  >
                    Extracting data
                    {step === 1 && (
                      <span className='mt-1.5 ml-1 flex space-x-1'>
                        <span className='h-1 w-1 animate-bounce rounded-full bg-[var(--primary-9)]'></span>
                        <span className='h-1 w-1 animate-bounce rounded-full bg-[var(--primary-9)] [animation-delay:0.2s]'></span>
                        <span className='h-1 w-1 animate-bounce rounded-full bg-[var(--primary-9)] [animation-delay:0.4s]'></span>
                      </span>
                    )}
                  </p>
                  {step === 1 && (
                    <div className='animate-fade-in-up mt-1 2xl:mt-2'>
                      <div className='flex items-center gap-2 2xl:gap-3'>
                        <div className='flex h-6 w-6 items-center justify-center rounded-full 2xl:h-8 2xl:w-8'>
                          <BarLoader />
                        </div>
                        <div className='flex-1'>
                          <p
                            className='animate-fade-in text-xs font-medium text-[var(--gray-11)] 2xl:text-sm'
                            key={loadingTextIndex}
                          >
                            {loadingPhrases[loadingTextIndex]}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {step != 0 && step != 1 && (
                    <p className='animate-fade-in text-xs font-medium text-[var(--gray-11)] 2xl:text-sm'>
                      Extracted Successfully
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: Matching */}
              <div
                className={`relative z-10 flex items-start space-x-4 opacity-100 transition-opacity duration-300 2xl:space-x-6`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${step >= 2 ? (step > 2 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'bg-[var(--primary-9)] shadow-[var(--primary-9)]/30') : 'border-2 border-[var(--gray-4)] bg-white'}`}
                >
                  {step > 2 ? (
                    <Icon
                      className='text-base text-white 2xl:text-lg'
                      name='material-symbols:check'
                    />
                  ) : step === 2 ? (
                    <Icon
                      className='animate-spin text-base text-white 2xl:text-lg'
                      name='tabler:rotate-clockwise-2'
                    />
                  ) : (
                    <div className='h-2 w-2 rounded-full bg-[var(--gray-4)] 2xl:h-2.5 2xl:w-2.5' />
                  )}
                </div>
                <div className='pt-0.5 2xl:pt-1'>
                  <p
                    className={`text-sm font-bold transition-colors duration-300 2xl:text-base ${step === 2 ? 'text-[var(--primary-9)]' : step > 2 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]'}`}
                  >
                    Matching PO details...
                  </p>
                  <p className='mt-0.5 text-xs text-[var(--gray-9)] 2xl:mt-1 2xl:text-sm'>
                    Cross-referencing with ERP records.
                  </p>
                </div>
              </div>

              {/* Step 4: Policy */}
              <div
                className={`relative z-10 flex items-start space-x-4 opacity-100 transition-opacity duration-300 2xl:space-x-6`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${step >= 3 ? 'bg-[var(--green-9)] shadow-[var(--green-9)]/20' : 'border-2 border-[var(--gray-4)] bg-white'}`}
                >
                  {step >= 3 ? (
                    <Icon
                      className='text-base text-white 2xl:text-lg'
                      name='material-symbols:check'
                    />
                  ) : (
                    <div className='h-2 w-2 rounded-full bg-[var(--gray-4)] 2xl:h-2.5 2xl:w-2.5' />
                  )}
                </div>
                <div className='pt-0.5 2xl:pt-1'>
                  <p
                    className={`text-sm font-bold transition-colors duration-300 2xl:text-base ${step === 3 ? 'text-[var(--green-11)]' : 'text-[var(--gray-10)]'}`}
                  >
                    Policy Compliance Check
                  </p>
                  <p className='mt-0.5 text-xs text-[var(--gray-9)] 2xl:mt-1 2xl:text-sm'>
                    Validating against guidelines.
                  </p>
                </div>
              </div>
            </div>

            {/* Long Wait Alert Link - Replacing Insight Card */}
            {showLongWaitMessage && (
              <div className='group animate-fade-in relative mt-3 shrink-0 overflow-hidden rounded-xl bg-[var(--amber-9)] p-3 text-white shadow-xl transition-all duration-500 ease-in-out 2xl:mt-6 2xl:p-4'>
                <div className='absolute -top-4 -right-4 rotate-12 opacity-10'>
                  <Icon
                    className='text-6xl 2xl:text-8xl'
                    name='material-symbols:timer-rounded'
                  />
                </div>
                <div className='flex items-start gap-3'>
                  <Icon
                    className='mt-0.5 shrink-0 text-xl 2xl:text-2xl'
                    name='material-symbols:warning-rounded'
                  />
                  <div>
                    <h3 className='mb-1 text-sm font-bold 2xl:text-base'>
                      Taking longer than usual
                    </h3>
                    <p className='text-xs leading-relaxed text-white/90 2xl:text-sm'>
                      Redirecting you to the inbox. The process will continue in
                      the background.
                    </p>
                  </div>
                </div>
                <div className='mt-3 h-1 w-full overflow-hidden rounded-full bg-white/30'>
                  <div
                    className='h-full bg-white transition-all duration-[5000ms] ease-linear'
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProcessingScreen
