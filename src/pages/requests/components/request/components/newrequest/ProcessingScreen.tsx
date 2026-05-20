import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false)

  // File Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [scale, setScale] = useState(1)
  const viewerRef = useRef<any>(null)

  const [elapsedTimes, setElapsedTimes] = useState<Record<number, number>>({})
  const [currentTimer, setCurrentTimer] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimer((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  useEffect(() => {
    if (step > 0) {
      setElapsedTimes((prev) => ({ ...prev, [step - 1]: currentTimer }))
    }
    setCurrentTimer(0)
  }, [step])

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

  // Fetch File Data from API
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setFileType(file.type)
      return () => URL.revokeObjectURL(url)
    }
    const fetchFile = async () => {
      const rId = Number(repositoryId)
      if (fileId && !isNaN(rId) && rId > 0) {
        // Hardcoded parameters
        const tId = 2 // Keep hardcoded if that's what was here, or use dynamic if available
        const uId = '2'
        const type = 2 // Original file

        try {
          const response = await fileApi.viewBinary(tId, uId, rId, fileId, type)

          if (response?.data) {
            const base64 = response.data.file || response.data
            if (typeof base64 !== 'string') return

            let mimeType = 'application/pdf' // Default fallback

            // Simple signature detection
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
        }
      }
    }

    fetchFile()
  }, [fileId, repositoryId, file, refreshCounter])

  const [totalTime, setTotalTime] = useState(0)
  const [keywordIndex, setKeywordIndex] = useState(0)

  const loadingPhrases = [
    'Analyzing spatial layout',
    'Extracting textual metadata',
    'Recognizing table structures',
    'Mapping semantic entities',
    'Validating data consistency',
  ]

  // Keyword loop timer - slower pace (10s)
  useEffect(() => {
    const timer = setInterval(() => {
      setKeywordIndex((prev) => (prev + 1) % 5)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}.${secs < 10 ? '0' : ''}${secs}m`
  }

  // Total time tracker
  useEffect(() => {
    if (uploadStatus === 'error' || step > 4) return

    const timer = setInterval(() => {
      setTotalTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [uploadStatus, step])

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
      return 4
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
      if (step === 3) delay = 3000

      const timer = setTimeout(() => {
        setStep((prev) => prev + 1)
      }, delay)
      return () => clearTimeout(timer)
    } else if (step === 4 && targetStep === 4) {
      const timer = setTimeout(() => {
        onComplete()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [step, targetStep, onComplete, uploadStatus])

  return (
    <div className='box-border h-[calc(100vh-110px)] w-full overflow-hidden p-4 lg:p-6'>
      <div className='mx-auto grid h-full max-w-[1600px] grid-cols-12 gap-4 2xl:gap-6'>
        {/* Left Column: File Preview */}
        <section className='group relative col-span-8 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--gray-3)] bg-white shadow-sm'>
          {/* Document Header */}
          <div className='flex shrink-0 items-center justify-between border-b border-[var(--gray-2)] bg-white px-5 py-3'>
            <div className='flex min-w-0 items-center gap-3'>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--indigo-2)] text-[var(--indigo-9)]'>
                <Icon className='h-5 w-5' name='lucide:file-text' />
              </div>
              <div className='flex min-w-0 flex-col'>
                <h3 className='mb-1 text-[13px] leading-none font-bold text-[var(--gray-13)]'>
                  Document Preview
                </h3>
                <p className='truncate text-[11px] font-medium text-[var(--gray-10)]'>
                  {file?.name || 'Loading document...'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-3 rounded-md border border-[var(--gray-3)] bg-[var(--gray-2)] px-2.5 py-1'>
                <button
                  className='text-[var(--gray-11)] transition-colors hover:text-[var(--primary-9)] active:scale-90'
                  onClick={() => viewerRef.current?.zoom(scale - 0.1)}
                >
                  <Icon className='h-3.5 w-3.5' name='lucide:zoom-out' />
                </button>
                <span className='min-w-[30px] text-center text-[10px] font-bold text-[var(--gray-13)]'>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  className='text-[var(--gray-11)] transition-colors hover:text-[var(--primary-9)] active:scale-90'
                  onClick={() => viewerRef.current?.zoom(scale + 0.1)}
                >
                  <Icon className='h-3.5 w-3.5' name='lucide:zoom-in' />
                </button>
              </div>

              <div className='h-5 w-px bg-[var(--gray-3)]' />

              <button
                className='flex h-8 w-8 items-center justify-center rounded-lg text-[var(--gray-11)] transition-all duration-500 hover:bg-[var(--primary-2)] hover:text-[var(--primary-9)] active:rotate-180'
                title='Refresh Preview'
                onClick={() => {
                  setPreviewUrl(null)
                  setRefreshCounter((prev) => prev + 1)
                  setKeywordIndex(0)
                }}
              >
                <Icon className='h-4 w-4' name='lucide:refresh-cw' />
              </button>
            </div>
          </div>

          {/* Viewer Area */}
          <div className='relative flex h-full flex-grow items-center justify-center overflow-hidden bg-white'>
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

            {/* Scanner effect wrapper - Visible during processing (steps 0, 1, 2, 3) */}
            {previewUrl && step < 4 && (
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

              <div className='flex items-center gap-2 rounded-lg border border-[var(--gray-3)] bg-[var(--gray-2)] px-2.5 py-1 shadow-sm'>
                <Icon
                  className={`h-3.5 w-3.5 ${step <= 4 ? 'animate-spin text-[var(--orange-9)]' : 'text-[var(--gray-11)]'}`}
                  name='material-symbols:auto-awesome-rounded'
                />
                <span
                  className={`text-[11px] font-black 2xl:text-xs ${step <= 4 ? 'text-[var(--orange-9)]' : 'text-[var(--gray-12)]'}`}
                >
                  {formatTime(totalTime)}
                </span>
              </div>
            </div>

            {/* Tighter spacing using gap-8 instead of justify-between */}
            <div className='custom-scrollbar relative flex min-h-0 flex-1 flex-col justify-between overflow-y-auto py-2 pl-1 2xl:py-4'>
              {/* Vertical Line */}
              <div className='absolute top-3 bottom-3 left-[1.15rem] -z-0 w-0.5 bg-[var(--gray-3)] 2xl:top-4 2xl:bottom-4 2xl:left-6'>
                <div
                  className='absolute top-0 left-0 w-full bg-[var(--primary-9)] transition-all duration-1000 ease-linear'
                  style={{ height: `${(step / 4) * 100}%` }}
                ></div>
              </div>

              {/* Step 0: Upload */}
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
                  <div className='flex items-center gap-2'>
                    <p
                      className={`text-sm font-medium transition-colors duration-300 2xl:text-base ${
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
                    {step === 0 && (
                      <div className='flex animate-pulse items-center gap-1 text-[var(--orange-9)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(currentTimer)}
                        </span>
                      </div>
                    )}
                    {step > 0 && elapsedTimes[0] !== undefined && (
                      <div className='flex items-center gap-1 text-[var(--green-11)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(elapsedTimes[0])}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className='mt-0.5 text-xs text-[var(--gray-10)] 2xl:text-sm'>
                    {uploadStatus === 'success'
                      ? file?.name
                      : 'Initializing upload...'}
                  </p>
                </div>
              </div>

              {/* Step 1: Extraction */}
              <div
                className={`relative z-10 flex items-start space-x-4 opacity-100 transition-opacity duration-300 2xl:space-x-6`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${step >= 1 ? (step > 1 ? 'bg-[var(--green-9)]' : 'bg-[var(--primary-9)]') : 'border-2 border-[var(--gray-4)] bg-white'}`}
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
                  <div className='flex items-center gap-2'>
                    <p
                      className={`flex items-center text-sm font-medium transition-colors duration-300 2xl:text-base ${step === 1 ? 'text-[var(--primary-9)]' : step > 1 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]'}`}
                    >
                      Extracting data
                    </p>
                    {step === 1 && (
                      <div className='flex animate-pulse items-center gap-1 text-[var(--orange-9)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(currentTimer)}
                        </span>
                      </div>
                    )}
                    {step > 1 && elapsedTimes[1] !== undefined && (
                      <div className='flex items-center gap-1 text-[var(--green-11)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(elapsedTimes[1])}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className='mt-0.5 text-xs text-[var(--gray-9)] 2xl:text-sm'>
                    {step > 1 ? 'Data extraction complete' : ''}
                  </p>
                  {step === 1 && (
                    <div className='animate-fade-in-up mt-2'>
                      <div className='flex items-center gap-2 2xl:gap-3'>
                        <BarLoader />
                        <p
                          className='animate-fade-in text-[11px] font-medium text-[var(--gray-11)] 2xl:text-xs'
                          key={keywordIndex}
                        >
                          {loadingPhrases[keywordIndex]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Matching */}
              <div
                className={`relative z-10 flex items-start space-x-4 opacity-100 transition-opacity duration-300 2xl:space-x-6`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${step >= 2 ? (step > 2 ? 'bg-[var(--green-9)]' : 'bg-[var(--primary-9)]') : 'border-2 border-[var(--gray-4)] bg-white'}`}
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
                  <div className='flex items-center gap-2'>
                    <p
                      className={`text-sm font-medium transition-colors duration-300 2xl:text-base ${step === 2 ? 'text-[var(--primary-9)]' : step > 2 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]'}`}
                    >
                      Matching PO details
                    </p>
                    {step === 2 && (
                      <div className='flex animate-pulse items-center gap-1 text-[var(--orange-9)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(currentTimer)}
                        </span>
                      </div>
                    )}
                    {step > 2 && elapsedTimes[2] !== undefined && (
                      <div className='flex items-center gap-1 text-[var(--green-11)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(elapsedTimes[2])}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className='mt-0.5 text-xs text-[var(--gray-9)] 2xl:text-sm'>
                    {step > 2
                      ? 'Records matched successfully'
                      : 'Cross-referencing records'}
                  </p>
                </div>
              </div>

              {/* Step 3: Policy */}
              <div
                className={`relative z-10 flex items-start space-x-4 opacity-100 transition-opacity duration-300 2xl:space-x-6`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${step >= 3 ? (step > 3 ? 'bg-[var(--green-9)]' : 'bg-[var(--primary-9)]') : 'border-2 border-[var(--gray-4)] bg-white'}`}
                >
                  {step > 3 ? (
                    <Icon
                      className='text-base text-white 2xl:text-lg'
                      name='material-symbols:check'
                    />
                  ) : step === 3 ? (
                    <Icon
                      className='animate-spin text-base text-white 2xl:text-lg'
                      name='tabler:rotate-clockwise-2'
                    />
                  ) : (
                    <div className='h-2 w-2 rounded-full bg-[var(--gray-4)] 2xl:h-2.5 2xl:w-2.5' />
                  )}
                </div>
                <div className='pt-0.5 2xl:pt-1'>
                  <div className='flex items-center gap-2'>
                    <p
                      className={`text-sm font-medium transition-colors duration-300 2xl:text-base ${step === 3 ? 'text-[var(--primary-9)]' : step > 3 ? 'text-[var(--gray-12)]' : 'text-[var(--gray-10)]'}`}
                    >
                      Policy Compliance
                    </p>
                    {step === 3 && (
                      <div className='flex animate-pulse items-center gap-1 text-[var(--orange-9)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(currentTimer)}
                        </span>
                      </div>
                    )}
                    {step > 3 && elapsedTimes[3] !== undefined && (
                      <div className='flex items-center gap-1 text-[var(--green-11)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(elapsedTimes[3])}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className='mt-0.5 text-xs text-[var(--gray-9)] 2xl:text-sm'>
                    {step > 3
                      ? 'Guidelines validated'
                      : 'Validating guidelines'}
                  </p>
                </div>
              </div>

              {/* Step 4: AP Agent Decision */}
              <div
                className={`relative z-10 flex items-start space-x-4 opacity-100 transition-opacity duration-300 2xl:space-x-6`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white transition-all duration-300 2xl:h-8 2xl:w-8 ${step >= 4 ? 'bg-[var(--green-9)]' : 'border-2 border-[var(--gray-4)] bg-white'}`}
                >
                  {step >= 4 ? (
                    <Icon
                      className='text-base text-white 2xl:text-lg'
                      name='material-symbols:check'
                    />
                  ) : step === 4 ? (
                    <Icon
                      className='animate-spin text-base text-white 2xl:text-lg'
                      name='tabler:rotate-clockwise-2'
                    />
                  ) : (
                    <div className='h-2 w-2 rounded-full bg-[var(--gray-4)] 2xl:h-2.5 2xl:w-2.5' />
                  )}
                </div>
                <div className='pt-0.5 2xl:pt-1'>
                  <div className='flex items-center gap-2'>
                    <p
                      className={`text-sm font-medium transition-colors duration-300 2xl:text-base ${step === 4 ? 'text-[var(--primary-9)]' : step > 4 ? 'text-[var(--green-11)]' : 'text-[var(--gray-10)]'}`}
                    >
                      AP Agent Decision
                    </p>
                    {step === 4 && (
                      <div className='flex animate-pulse items-center gap-1 text-[var(--orange-9)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(currentTimer)}
                        </span>
                      </div>
                    )}
                    {step > 4 && elapsedTimes[4] !== undefined && (
                      <div className='flex items-center gap-1 text-[var(--green-11)]'>
                        <Icon className='h-3 w-3' name='lucide:timer' />
                        <span className='text-[10px] font-bold 2xl:text-xs'>
                          {formatTime(elapsedTimes[4])}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className='mt-0.5 text-xs text-[var(--gray-9)] 2xl:text-sm'>
                    {step > 4
                      ? 'Final decision determined'
                      : 'Analyzing context & keywords'}
                  </p>
                </div>
              </div>

              {/* Long Wait Alert Link - Subtler message inside timeline */}
              {showLongWaitMessage && (
                <div className='animate-fade-in relative mt-4 shrink-0 overflow-hidden rounded-xl border border-[var(--blue-4)] bg-[var(--blue-2)] p-3 text-[var(--blue-11)] shadow-sm'>
                  <div className='flex items-start gap-2.5'>
                    <Icon
                      className='mt-0.5 shrink-0 text-lg'
                      name='material-symbols:lightbulb-outline'
                    />
                    <div>
                      <p className='mb-1 text-[10px] font-bold tracking-wider uppercase opacity-70'>
                        Quick Hint
                      </p>
                      <p className='text-[10px] leading-relaxed font-medium 2xl:text-[11px]'>
                        This is taking a bit longer. You can safely navigate
                        away; we'll notify you in the inbox once ready.
                      </p>
                      {onRedirect && (
                        <button
                          className='mt-2 flex cursor-pointer items-center gap-1 text-[10px] font-bold text-[var(--blue-11)] hover:underline'
                          onClick={onRedirect}
                        >
                          Go to Inbox
                          <Icon className='h-3 w-3' name='tabler:arrow-right' />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProcessingScreen
